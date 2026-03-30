import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Compass, CalendarDays, MessageSquare, User, Home, Building2, BookOpen } from "lucide-react";
import { hasRole } from "@/components/utils/roleHelpers";

const GUEST_NAV = [
  { label: "Explore",   icon: Compass,       path: createPageUrl("Search")         },
  { label: "My Trips",  icon: CalendarDays,  path: createPageUrl("MyTrips")        },
  { label: "Messages",  icon: MessageSquare, path: createPageUrl("GuestMessages")  },
  { label: "Account",   icon: User,          path: createPageUrl("Settings")       },
];

const HOST_NAV = [
  { label: "Dashboard",   icon: Home,          path: createPageUrl("HostDashboard")  },
  { label: "Properties",  icon: Building2,     path: createPageUrl("HostProperties") },
  { label: "Bookings",    icon: BookOpen,      path: createPageUrl("HostBookings")   },
  { label: "Messages",    icon: MessageSquare, path: createPageUrl("HostMessages")   },
];

// Save/restore scroll position per tab path
function useTabScroll() {
  const scrollCache = {};
  const saveScroll = (path) => {
    scrollCache[path] = window.scrollY;
    sessionStorage.setItem("tabScroll:" + path, window.scrollY);
  };
  const restoreScroll = (path) => {
    const saved = sessionStorage.getItem("tabScroll:" + path);
    if (saved !== null) {
      requestAnimationFrame(() => window.scrollTo(0, parseInt(saved)));
    }
  };
  return { saveScroll, restoreScroll };
}

export default function MobileBottomNav({ userRoles = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHost = hasRole(userRoles, "host");
  const navItems = isHost ? HOST_NAV : GUEST_NAV;
  const { saveScroll, restoreScroll } = useTabScroll();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {navItems.map(({ label, icon: Icon, path }) => {
        const active = location.pathname === path || location.pathname.startsWith(path + "/");
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              saveScroll(location.pathname);
              navigate(path);
              restoreScroll(path);
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