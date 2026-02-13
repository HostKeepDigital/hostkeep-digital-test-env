import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { 
  Home, Search, Heart, User, Menu, X, Calendar, PoundSterling, 
  MessageSquare, Settings, Building2, LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
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

// Pages without layout (guest facing / public)
const PUBLIC_PAGES = ["Pay"];

// Host dashboard pages
const HOST_PAGES = ["HostDashboard", "HostBookings", "HostProperties", "HostMessages", "HostSettings", "CreateProperty", "EditProperty", "Subscription"];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

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
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-100 pt-5 pb-4 overflow-y-auto">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3 px-6 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">StayDirect</span>
            </Link>
            
            <nav className="flex-1 px-3 space-y-1">
              {hostNavItems.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
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

            <div className="px-3 mt-auto">
              <Link
                to={createPageUrl('Subscription')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <PoundSterling className="w-5 h-5 text-gray-400" />
                Subscription
              </Link>
            </div>
          </div>
        </aside>

        {/* Mobile Header for Host */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">StayDirect</span>
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
                      onClick={() => setMobileMenuOpen(false)}
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
          {children}
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
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">StayDirect</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to={createPageUrl('Search')} className="text-gray-600 hover:text-gray-900 font-medium">
                Explore
              </Link>
              {isAuthenticated && (
                <Link to={createPageUrl('HostDashboard')} className="text-gray-600 hover:text-gray-900 font-medium">
                  Host Dashboard
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
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
                      <Link to={createPageUrl('HostDashboard')} className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Host Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('HostSettings')} className="flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => base44.auth.logout()} className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to={createPageUrl('HostDashboard')}>
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
        {children}
      </main>
    </div>
  );
}