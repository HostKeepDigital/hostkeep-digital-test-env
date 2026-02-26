import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { 
  Home, Search, Heart, User, Menu, X, Calendar, PoundSterling, 
  MessageSquare, Settings, Building2, LogOut, Users, Shield
} from "lucide-react";
import { useState, useEffect, createContext } from "react";

export const NavigationContext = createContext(null);
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { getUserRoles, hasRole } from "@/components/utils/roleHelpers";
import RoleSwitcher from "@/components/RoleSwitcher";

// Pages without layout (guest facing / public)
const PUBLIC_PAGES = ["Pay"];

// Host dashboard pages
const HOST_PAGES = ["HostDashboard", "HostBookings", "HostProperties", "HostMessages", "HostSettings", "CreateProperty", "EditProperty"];

const GUEST_PAGES = ["Home", "Search", "PropertyDetails", "MyTrips", "GuestMessages", "GuestProfile", "BecomeHost", "BecomeCleaner"];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [navBlocker, setNavBlocker] = useState(null);
  const navigate = useNavigate();

  const handleNavClick = (e, path) => {
    if (navBlocker) {
      e.preventDefault();
      navBlocker(path);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    base44.auth.isAuthenticated().then((auth) => {
      if (mounted) setIsAuthenticated(auth);
    });
    
    base44.auth.me().then(async (userData) => {
      if (!mounted) return;
      setUser(userData);
      if (userData?.id) {
        const roles = await getUserRoles(userData.id);
        if (mounted) setUserRoles(roles);
      }
    }).catch(() => {
      if (mounted) {
        setUser(null);
        setUserRoles([]);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPageName]);

  // No layout for payment page
  if (PUBLIC_PAGES.includes(currentPageName)) {
    return <>{children}</>;
  }

  const isHostPage = HOST_PAGES.includes(currentPageName);

  // Host Dashboard Layout
  if (isHostPage) {
    const hostNavItems = [
      { name: "Dashboard", icon: Home, page: "HostDashboard" },
      { name: "Properties", icon: Building2, page: "HostProperties" },
      { name: "Bookings", icon: Calendar, page: "HostBookings" },
      { name: "Messages", icon: MessageSquare, page: "HostMessages" },
      { name: "Settings", icon: Settings, page: "HostSettings" },
      { name: "Cancellation Policies", icon: Shield, page: "HostCancellationPolicies" },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-100 pt-5 pb-4 overflow-y-auto">
            <Link to={createPageUrl('Home')} onClick={(e) => handleNavClick(e, createPageUrl('Home'))} className="flex items-center gap-3 px-6 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">HostKeep</span>
            </Link>
            
            <nav className="flex-1 px-3 space-y-1">
              {hostNavItems.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={(e) => handleNavClick(e, createPageUrl(item.page))}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>


          </div>
        </aside>

        {/* Mobile Header for Host */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to={createPageUrl('Home')} onClick={(e) => handleNavClick(e, createPageUrl('Home'))} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">HostKeep</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
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
                        isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </div>

        <main className="lg:pl-64 pt-16 lg:pt-0">
          <NavigationContext.Provider value={setNavBlocker}>
            {children}
          </NavigationContext.Provider>
        </main>
      </div>
    );
  }

  // Guest/Public Layout
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} onClick={(e) => handleNavClick(e, createPageUrl('Home'))} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">HostKeep</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to={createPageUrl('Search')} className="text-gray-600 hover:text-gray-900 font-medium">
                Explore
              </Link>
              {isAuthenticated && (
                <>
                  <Link to={createPageUrl('MyTrips')} className="text-gray-600 hover:text-gray-900 font-medium">
                    My Trips
                  </Link>
                  {hasRole(userRoles, 'host') && (
                    <Link to={createPageUrl('HostDashboard')} className="text-gray-600 hover:text-gray-900 font-medium">
                      Host Dashboard
                    </Link>
                  )}
                </>
              )}
              {(hasRole(userRoles, 'cleaner') || hasRole(userRoles, 'host') || hasRole(userRoles, 'admin')) && (
                <Link to={createPageUrl('CleanKeep')} className="text-gray-600 hover:text-gray-900 font-medium">
                  CleanKeep
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <RoleSwitcher userRoles={userRoles} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user?.profile_photo} />
                          <AvatarFallback className="bg-teal-100 text-teal-600">
                            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline">{user?.full_name?.split(' ')[0] || 'Account'}</span>
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('MyTrips')} className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> My Trips
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('GuestMessages')} className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Messages
                      </Link>
                    </DropdownMenuItem>
                    {hasRole(userRoles, 'host') && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('HostDashboard')} className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" /> Host Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {(hasRole(userRoles, 'cleaner') || hasRole(userRoles, 'host') || hasRole(userRoles, 'admin')) && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('CleanKeep')} className="flex items-center gap-2">
                          <Users className="w-4 h-4" /> CleanKeep
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {hasRole(userRoles, 'admin') && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AdminVerifications')} className="flex items-center gap-2 text-rose-600">
                          <Shield className="w-4 h-4" /> Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('HostSettings')} className="flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {!hasRole(userRoles, 'host') && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('BecomeHost')} className="flex items-center gap-2 text-teal-600">
                          <Building2 className="w-4 h-4" /> Become a Host
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {!hasRole(userRoles, 'cleaner') && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('BecomeCleaner')} className="flex items-center gap-2 text-blue-600">
                          <Users className="w-4 h-4" /> Become a Cleaner
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {(!hasRole(userRoles, 'host') || !hasRole(userRoles, 'cleaner')) && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem onClick={() => base44.auth.logout()} className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>
              ) : (
                <>
                  <Link to={createPageUrl('GuestProfile')}>
                    <Button variant="outline">Sign Up</Button>
                  </Link>
                  <Link to={createPageUrl('BecomeHost')}>
                    <Button variant="ghost">Become a Host</Button>
                  </Link>
                  <Button 
                    onClick={() => base44.auth.redirectToLogin()}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <NavigationContext.Provider value={setNavBlocker}>
          {children}
        </NavigationContext.Provider>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}