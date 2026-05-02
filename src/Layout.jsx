import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Home,
  Menu,
  X,
  Calendar,
  MessageSquare,
  Settings,
  Building2,
  LogOut,
  Users,
  Shield,
  ArrowLeft,
  ShieldCheck,
  PoundSterling,
} from "lucide-react";
import { useState, useEffect, createContext } from "react";

export const NavigationContext = createContext(null);

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import NotificationBell from "@/components/NotificationBell";
import { hasRole } from "@/components/utils/roleHelpers";
import RoleSwitcher from "@/components/RoleSwitcher";

import { useAuth } from "@/lib/AuthContext";

// Pages without layout (guest facing / public)
const PUBLIC_PAGES = ["Pay"];

// Root tab paths — no back button shown on these pages (path-based, mirrors MobileBottomNav)
const ROOT_PATHS = new Set([
  "/", "/Home", "/Search", "/MyTrips", "/GuestMessages", "/Settings",
  "/HostDashboard", "/HostProperties", "/HostBookings", "/HostMessages", "/HostCancellationPolicies",
]);

// Host dashboard pages
const HOST_PAGES = [
  "HostDashboard",
  "HostBookings",
  "HostProperties",
  "HostMessages",
  "HostCancellationPolicies",
  "HostCompliance",
  "HostPayoutHistory",
  "CreateProperty",
  "EditProperty",
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Pull everything from your custom AuthContext
  const {
    isAuthenticated,
    user,
    roles: userRoles = [],
    logout,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navBlocker, setNavBlocker] = useState(null);
  const isRootPath = ROOT_PATHS.has(location.pathname);

  const handleNavClick = (e, path) => {
    if (navBlocker) {
      e.preventDefault();
      navBlocker(path);
    }
  };

  // Scroll to top on route change, but not for tab-root pages (scroll is restored by MobileBottomNav)
  const ALL_TAB_PAGES = new Set(["HostDashboard","HostProperties","HostBookings","HostMessages","HostCancellationPolicies","Home","Search","MyTrips","GuestMessages","Settings"]);
  useEffect(() => {
    if (!ALL_TAB_PAGES.has(currentPageName)) {
      window.scrollTo(0, 0);
    }
  }, [currentPageName]);

  // No layout for payment page
  if (PUBLIC_PAGES.includes(currentPageName)) {
    return <>{children}</>;
  }

  const isHostPage = HOST_PAGES.includes(currentPageName);

  // -----------------------------
  // HOST DASHBOARD LAYOUT
  // -----------------------------
  if (isHostPage) {
    const hostNavItems = [

      { name: "Dashboard", icon: Home, page: "HostDashboard" },
      { name: "Properties", icon: Building2, page: "HostProperties" },
      { name: "Bookings", icon: Calendar, page: "HostBookings" },
      { name: "Messages", icon: MessageSquare, page: "HostMessages" },
      { name: "Compliance", icon: ShieldCheck, page: "HostCompliance" },
      { name: "Payouts", icon: PoundSterling, page: "HostPayoutHistory" },
    ];

    return (
        <div className="min-h-screen bg-gray-50">

          {/* Desktop Top Header */}
          <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 h-16 items-center px-4">
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
              <Link to={createPageUrl("Home")} onClick={(e) => handleNavClick(e, createPageUrl("Home"))} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <Home className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">HostKeep</span>
              </Link>
              <nav className="flex items-center gap-6">
                <Link to={createPageUrl("HostDashboard")} className={`text-sm font-medium ${currentPageName === "HostDashboard" ? "text-teal-600" : "text-gray-600 hover:text-gray-900"}`}>Dashboard</Link>
                <Link to={createPageUrl("HostProperties")} className={`text-sm font-medium ${currentPageName === "HostProperties" ? "text-teal-600" : "text-gray-600 hover:text-gray-900"}`}>Properties</Link>
                <Link to={createPageUrl("HostBookings")} className={`text-sm font-medium ${currentPageName === "HostBookings" ? "text-teal-600" : "text-gray-600 hover:text-gray-900"}`}>Bookings</Link>
                <Link to={createPageUrl("HostMessages")} className={`text-sm font-medium ${currentPageName === "HostMessages" ? "text-teal-600" : "text-gray-600 hover:text-gray-900"}`}>Messages</Link>
              </nav>
              <div className="flex items-center gap-3">
                {isAuthenticated && <NotificationBell />}
                <RoleSwitcher userRoles={userRoles} currentPageName={currentPageName} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.profile_photo} />
                        <AvatarFallback className="bg-teal-100 text-teal-600">
                          {[user?.forename?.[0], user?.surname?.[0]].filter(Boolean).join("").toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">{user?.forename || "Account"}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("Home")} className="flex items-center gap-2"><Home className="w-4 h-4" /> Home</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("Settings")} className="flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:fixed lg:flex lg:flex-col bg-white border-r border-gray-100 overflow-y-auto" style={{ top: 64, bottom: 0, width: 256 }}>
            <nav className="flex-1 px-3 pt-4 space-y-1">
              {hostNavItems.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={(e) => handleNavClick(e, createPageUrl(item.page))}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-teal-600" : "text-gray-400"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Mobile Header */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between px-4 py-3">
              <Link
                to={createPageUrl("Home")}
                onClick={(e) => handleNavClick(e, createPageUrl("Home"))}
                className="flex items-center gap-3"
              >
                <img src="https://drive.google.com/uc?export=view&id=1yazuu-6sWc7hEOpyTncZpt-P9Cd-UOt1" alt="HostKeep" className="h-7 w-auto" />
              </Link>
              <div className="flex items-center gap-2">
                <RoleSwitcher userRoles={userRoles} currentPageName={currentPageName} />
                <Button
                  variant="outline"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="flex items-center gap-1.5 px-3 h-9 border-gray-200 text-gray-700"
                >
                  {mobileMenuOpen ? (
                    <><X className="w-4 h-4" /><span className="text-sm font-medium">Close</span></>
                  ) : (
                    <><Menu className="w-4 h-4" /><span className="text-sm font-medium">Menu</span></>
                  )}
                </Button>
              </div>
            </div>

            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-lg"
              >
                <nav className="p-3 space-y-1">
                  {hostNavItems.map((item) => {
                    const isActive = currentPageName === item.page;
                    return (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={(e) => {
                          setMobileMenuOpen(false);
                          handleNavClick(e, createPageUrl(item.page));
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? "bg-teal-50 text-teal-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-teal-600" : "text-gray-400"}`} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </motion.div>
            )}
          </div>

          <main className="lg:pl-64 pt-16 mobile-bottom-pad">
            <NavigationContext.Provider value={setNavBlocker}>
              {children}
            </NavigationContext.Provider>
          </main>
          <MobileBottomNav userRoles={userRoles} />
        </div>
    );
  }

  // -----------------------------
  // PUBLIC / GUEST LAYOUT
  // -----------------------------
  return (
      <div className="flex flex-col min-h-screen bg-white">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Mobile: back button on child pages, logo on root pages */}
              {!isRootPath ? (
                <button onClick={() => navigate(-1)} className="flex md:hidden items-center gap-2 text-gray-600 mr-3">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : null}
              <Link
                to={createPageUrl("Home")}
                onClick={(e) => handleNavClick(e, createPageUrl("Home"))}
                className="flex items-center gap-3"
              >
                <img src="https://drive.google.com/uc?export=view&id=1yazuu-6sWc7hEOpyTncZpt-P9Cd-UOt1" alt="HostKeep" className="h-7 w-auto" />
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                <Link
                  to={createPageUrl("Search")}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Explore
                </Link>

                {isAuthenticated && (
                  <>
                    <Link
                      to={createPageUrl("MyTrips")}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      My Trips
                    </Link>

                    {hasRole(userRoles, "host") && (
                      <Link
                        to={createPageUrl("HostDashboard")}
                        className="text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Host Dashboard
                      </Link>
                    )}
                  </>
                )}

                {(hasRole(userRoles, "cleaner") ||
                  hasRole(userRoles, "host") ||
                  hasRole(userRoles, "admin")) && (
                  <Link
                    to={createPageUrl("CleanKeep")}
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    CleanKeep
                  </Link>
                )}
              </nav>

              <div className="flex items-center gap-3">
                {isAuthenticated && <NotificationBell />}
                {isAuthenticated ? (
                  <>
                    <RoleSwitcher userRoles={userRoles} currentPageName={currentPageName} />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user?.profile_photo} />
                            <AvatarFallback className="bg-teal-100 text-teal-600">
                              {[user?.forename?.[0], user?.surname?.[0]].filter(Boolean).join("").toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden sm:inline">
                            {user?.forename || "Account"}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link
                            to={createPageUrl("MyTrips")}
                            className="flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4" /> My Trips
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            to={createPageUrl("GuestMessages")}
                            className="flex items-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" /> Messages
                          </Link>
                        </DropdownMenuItem>

                        {hasRole(userRoles, "host") && (
                          <DropdownMenuItem asChild>
                            <Link
                              to={createPageUrl("HostDashboard")}
                              className="flex items-center gap-2"
                            >
                              <Building2 className="w-4 h-4" /> Host Dashboard
                            </Link>
                          </DropdownMenuItem>
                        )}

                        {(hasRole(userRoles, "cleaner") ||
                          hasRole(userRoles, "host") ||
                          hasRole(userRoles, "admin")) && (
                          <DropdownMenuItem asChild>
                            <Link
                              to={createPageUrl("CleanKeep")}
                              className="flex items-center gap-2"
                            >
                              <Users className="w-4 h-4" /> CleanKeep
                            </Link>
                          </DropdownMenuItem>
                        )}

                        {hasRole(userRoles, "admin") && (
                          <DropdownMenuItem asChild>
                            <Link
                              to={createPageUrl("Admin")}
                              className="flex items-center gap-2 text-rose-600"
                            >
                              <Shield className="w-4 h-4" /> Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem asChild>
                          <Link
                            to={createPageUrl("Settings")}
                            className="flex items-center gap-2"
                          >
                            <Settings className="w-4 h-4" /> Settings
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {!hasRole(userRoles, "host") &&
                          !hasRole(userRoles, "cleaner") && (
                            <DropdownMenuItem asChild>
                              <Link
                                to={createPageUrl("BecomeHost")}
                                className="flex items-center gap-2 text-teal-600"
                              >
                                <Building2 className="w-4 h-4" /> Become a Host
                              </Link>
                            </DropdownMenuItem>
                          )}

                        {!hasRole(userRoles, "cleaner") &&
                          !hasRole(userRoles, "host") && (
                            <DropdownMenuItem asChild>
                              <Link
                                to={createPageUrl("BecomeCleaner")}
                                className="flex items-center gap-2 text-blue-600"
                              >
                                <Users className="w-4 h-4" /> Become a Cleaner
                              </Link>
                            </DropdownMenuItem>
                          )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={logout}
                          className="flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" /> Log Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <>
                    <Link to="/founding" className="hidden sm:inline-flex">
                      <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Become a Founding Member</Button>
                    </Link>
                    <Link to="/GuestSignUp">
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white">Sign Up</Button>
                    </Link>
                    <Link to="/SignIn">
                      <Button className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pt-16 mobile-bottom-pad">
          <NavigationContext.Provider value={setNavBlocker}>
            {children}
          </NavigationContext.Provider>
        </main>

        {/* Bottom Nav (mobile) */}
        <MobileBottomNav userRoles={userRoles} />

        {/* Footer */}
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
  );
}