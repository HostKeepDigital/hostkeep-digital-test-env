import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';
import AdminPanel from './pages/AdminPanel';

// Pages accessible without authentication
const PUBLIC_ROUTES = new Set([
  '/', '/Home', '/Search', '/PropertyDetails', '/Pay',
  '/AboutUs', '/LegalCentre', '/TermsAndConditions', '/PrivacyPolicy',
  '/CookiePolicy', '/GuestTerms', '/HostTerms', '/CleanerTerms',
  '/DisputePolicy', '/PaymentPolicy', '/RefundPolicy', '/Accessibility',
  '/BecomeHost', '/BecomeCleaner', '/Index', '/LockScreen',
]);

// After login, redirect based on role
function getRoleRedirect(userRoles) {
  if (!userRoles || userRoles.length === 0) return '/Home';
  const roles = userRoles.map(r => r.role);
  if (roles.includes('admin')) return '/AdminVerifications';
  if (roles.includes('host')) return '/HostDashboard';
  if (roles.includes('cleaner')) return '/CleanerDashboard';
  return '/Home';
}

// Guard: redirects unauthenticated users to login for protected routes
function RequireAuth({ children }) {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();
  const [userRoles, setUserRoles] = useState(null);

  // Normalise path for matching (strip trailing slash, ignore query/hash)
  const basePath = '/' + location.pathname.replace(/^\/+/, '').split('/')[0];
  const isPublic = PUBLIC_ROUTES.has(basePath) || PUBLIC_ROUTES.has(location.pathname);

  useEffect(() => {
    if (isAuthenticated && userRoles === null) {
      base44.auth.me().then(async (u) => {
        if (u?.id) {
          const roles = await base44.entities.UserRole.filter({ user_id: u.id });
          setUserRoles(roles || []);
        } else {
          setUserRoles([]);
        }
      }).catch(() => setUserRoles([]));
    }
  }, [isAuthenticated]);

  if (isLoadingPublicSettings || isLoadingAuth) return null;
  if (isPublic) return children;
  if (!isAuthenticated) {
    base44.auth.redirectToLogin(window.location.href);
    return null;
  }
  return children;
}

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <RequireAuth>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </RequireAuth>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <RequireAuth>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </RequireAuth>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App