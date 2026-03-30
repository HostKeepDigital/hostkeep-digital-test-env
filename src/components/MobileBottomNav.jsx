import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Compass, CalendarDays, MessageSquare, User, Home, Building2, BookOpen } from "lucide-react";
import { hasRole } from "@/components/utils/roleHelpers";

// Root path for each guest tab — used to determine "active" state
const GUEST_ROOT = {
  Explore:  createPageUrl("Search"),
  "My Trips": createPageUrl("MyTrips"),
  Messages: createPageUrl("GuestMessages"),
  Account:  createPageUrl("Settings"),
};
const HOST_ROOT = {
  Dashboard:  createPageUrl("HostDashboard"),
  Properties: createPageUrl("HostProperties"),
  Bookings:   createPageUrl("HostBookings"),
  Messages:   createPageUrl("HostMessages"),
};

const GUEST_NAV = [
  { label: "Explore",   icon: Compass,       root: GUEST_ROOT["Explore"]    },
  { label: "My Trips",  icon: CalendarDays,  root: GUEST_ROOT["My Trips"]   },
  { label: "Messages",  icon: MessageSquare, root: GUEST_ROOT["Messages"]   },
  { label: "Account",   icon: User,          root: GUEST_ROOT["Account"]    },
];

const HOST_NAV = [
  { label: "Dashboard",   icon: Home,          root: HOST_ROOT["Dashboard"]   },
  { label: "Properties",  icon: Building2,     root: HOST_ROOT["Properties"]  },
  { label: "Bookings",    icon: BookOpen,      root: HOST_ROOT["Bookings"]    },
  { label: "Messages",    icon: MessageSquare, root: HOST_ROOT["Messages"]    },
];

const TAB_STACK_KEY = "tabStack";

function getTabStacks() {
  try { return JSON.parse(sessionStorage.getItem(TAB_STACK_KEY) || "{}"); }
  catch { return {}; }
}
function saveTabStack(root, path) {
  const stacks = getTabStacks();
  stacks[root] = path;
  sessionStorage.setItem(TAB_STACK_KEY, JSON.stringify(stacks));
}
function getLastPath(root) {
  return getTabStacks()[root] || root;
}
function saveScroll(path) {
  sessionStorage.setItem("tabScroll:" + path, String(window.scrollY));
}
function restoreScroll(path) {
  const saved = sessionStorage.getItem("tabScroll:" + path);
  if (saved !== null) {
    requestAnimationFrame(() => window.scrollTo(0, parseInt(saved)));
  }
}

export default function MobileBottomNav({ userRoles = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHost = hasRole(userRoles, "host");
  const navItems = isHost ? HOST_NAV : GUEST_NAV;

  // Track current path into the tab stack so we can restore it
  const allRoots = [...Object.values(GUEST_ROOT), ...Object.values(HOST_ROOT)];
  const currentRoot = allRoots.find(
    (r) => location.pathname === r || location.pathname.startsWith(r + "/")
  );
  if (currentRoot) saveTabStack(currentRoot, location.pathname);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {navItems.map(({ label, icon: Icon, root }) => {
        const active = location.pathname === root || location.pathname.startsWith(root + "/");
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              saveScroll(location.pathname);
              const dest = getLastPath(root);
              navigate(dest);
              restoreScroll(dest);
            }}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors select-none
              ${active ? "text-teal-600" : "text-gray-400 hover:text-gray-600"}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}