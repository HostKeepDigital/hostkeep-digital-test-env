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
import Pending from './pages/Pending';
import Founding from './pages/Founding';
import FoundingThankYou from './pages/FoundingThankYou';
import HowPaymentsWork from './pages/HowPaymentsWork';
import SignIn from './pages/SignIn';

// Pages accessible without authentication
const PUBLIC_ROUTES = new Set([
  '/', '/Home', '/Search', '/PropertyDetails', '/Pay',
  '/AboutUs', '/LegalCentre', '/TermsAndConditions', '/PrivacyPolicy',
  '/CookiePolicy', '/GuestTerms', '/HostTerms', '/CleanerTerms',
  '/DisputePolicy', '/PaymentPolicy', '/RefundPolicy', '/Accessibility',
  '/BecomeHost', '/BecomeCleaner', '/Index', '/LockScreen',
  '/founding', '/waitlist', '/pending', '/Subscription', '/login',
]);

// After login, redirect based on role
function getRoleRedirect(roles) {
  if (!roles || roles.length === 0) return '/Home';
  // If any host/cleaner role is pending and none are approved, send to /pending
  const nonGuestRoles = roles.filter(r => !['guest'].includes((r.role || '').toLowerCase()));
  if (nonGuestRoles.length > 0) {
    const hasApproved = nonGuestRoles.some(r => (r.approval_status || '').toLowerCase() === 'approved');
    if (!hasApproved) return '/pending';
  }
  // Only consider approved roles, case-insensitive
  const approved = roles
    .filter(r => (r.approval_status || '').toLowerCase() === 'approved')
    .map(r => (r.role || '').toLowerCase());
  if (approved.includes('admin')) return '/admin';
  if (approved.includes('host')) return '/HostDashboard';
  if (approved.includes('cleaner')) return '/CleanerDashboard';
  return '/Home';
}

// Fires on the root path — shows Home for guests, redirects authenticated users to their dashboard
function PostLoginRedirect() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [redirect, setRedirect] = useState(null);
  const { Pages } = pagesConfig;
  const HomePage = Pages['Home'];

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) return;
    base44.auth.me().then(async (u) => {
      if (u?.id) {
        const roles = await base44.entities.UserRole.filter({ user_id: u.id });
        setRedirect(getRoleRedirect(roles));
      } else {
        setRedirect('/Home');
      }
    }).catch(() => setRedirect('/Home'));
  }, [isAuthenticated, isLoadingAuth]);

  // Unauthenticated visitors see the Home page
  if (!isAuthenticated) return HomePage ? <HomePage /> : null;
  // Authenticated but still loading roles
  if (!redirect) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
  return <Navigate to={redirect} replace />;
}

// Guard: only allows admin-role users; redirects others to their dashboard
function RequireAdmin({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [redirect, setRedirect] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      window.location.href = '/Home';
      return;
    }
    base44.auth.me().then(async (u) => {
      if (!u?.id) { setRedirect('/Home'); setChecked(true); return; }
      const roles = await base44.entities.UserRole.filter({ user_id: u.id });
      const approved = roles.filter(r => (r.approval_status || '').toLowerCase() === 'approved').map(r => (r.role || '').toLowerCase());
      if (approved.includes('admin')) {
        setChecked(true); // authorised
      } else {
        setRedirect(approved.includes('host') ? '/HostDashboard' : approved.includes('cleaner') ? '/CleanerDashboard' : '/Home');
        setChecked(true);
      }
    }).catch(() => { setRedirect('/Home'); setChecked(true); });
  }, [isAuthenticated, isLoadingAuth]);

  if (!checked) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
  if (redirect) return <Navigate to={redirect} replace />;
  return children;
}

// Helper: returns true if user's non-guest roles are ALL pending (no approved roles)
function isUserPending(roles) {
  if (!roles || roles.length === 0) return false;
  const nonGuestRoles = roles.filter(r => !['guest'].includes((r.role || '').toLowerCase()));
  if (nonGuestRoles.length === 0) return false;
  return !nonGuestRoles.some(r => (r.approval_status || '').toLowerCase() === 'approved');
}

// Guard: hard-blocks pending users from all routes except /pending
function RequirePendingCheck({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  const [pendingStatus, setPendingStatus] = useState(null); // null=loading, true=pending, false=ok

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) { setPendingStatus(false); return; }
    base44.auth.me().then(async (u) => {
      if (!u?.id) { setPendingStatus(false); return; }
      const roles = await base44.entities.UserRole.filter({ user_id: u.id });
      setPendingStatus(isUserPending(roles));
    }).catch(() => setPendingStatus(false));
  }, [isAuthenticated, isLoadingAuth, location.pathname]);

  if (pendingStatus === null) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
  if (pendingStatus && location.pathname !== '/pending') {
    return <Navigate to="/pending" replace />;
  }
  return children;
}

// Guard: redirects unauthenticated users to login for protected routes
function RequireAuth({ children }) {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();

  // Normalise path for matching (strip trailing slash, ignore query/hash)
  const basePath = '/' + location.pathname.replace(/^\/+/, '').split('/')[0];
  const isPublic = PUBLIC_ROUTES.has(basePath) || PUBLIC_ROUTES.has(location.pathname);

  if (isLoadingPublicSettings || isLoadingAuth) return null;
  if (isPublic) return children;
  if (!isAuthenticated) {
    return <Navigate to="/Home" replace />;
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
  const location = useLocation();

  // Check if the current route is public BEFORE any auth loading gate
  const basePath = '/' + location.pathname.replace(/^\/+/, '').split('/')[0];
  const isPublicRoute = PUBLIC_ROUTES.has(basePath) || PUBLIC_ROUTES.has(location.pathname);

  // For public routes, skip the auth loading spinner entirely
  if (!isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors (only for non-public routes, never on /login itself)
  const isLoginRoute = location.pathname === '/login';
  if (!isPublicRoute && !isLoginRoute && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <Navigate to="/Home" replace />;
    }
  }

  // Render the main app
  return (
    <RequirePendingCheck>
      <Routes>
        <Route path="/login" element={<Navigate to="/SignIn" replace />} />
        <Route path="/Login" element={<Navigate to="/SignIn" replace />} />
        <Route path="/" element={
          <RequireAuth>
            <LayoutWrapper currentPageName="Home">
              <PostLoginRedirect />
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
        <Route path="/pending" element={<Pending />} />
        <Route path="/founding-thankyou" element={<FoundingThankYou />} />
        <Route path="/founding" element={<Founding />} />
        <Route path="/HowPaymentsWork" element={
          <LayoutWrapper currentPageName="HowPaymentsWork">
            <HowPaymentsWork />
          </LayoutWrapper>
        } />
        <Route path="/admin" element={
          <RequireAdmin>
            <LayoutWrapper currentPageName="AdminPanel">
              <AdminPanel />
            </LayoutWrapper>
          </RequireAdmin>
        } />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </RequirePendingCheck>
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