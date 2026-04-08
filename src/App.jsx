import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import NavigationTracker from "@/lib/NavigationTracker";
import { pagesConfig } from "./pages.config";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import { queryClientInstance } from "@/lib/query-client";

import { AnimatePresence, motion } from "framer-motion";
import ThemeProvider from "@/components/ThemeProvider";
import AdminPanel from "./pages/AdminPanel";
import Pending from "./pages/Pending";
import Founding from "./pages/Founding";
import FoundingThankYou from "./pages/FoundingThankYou";
import HowPaymentsWork from "./pages/HowPaymentsWork";
import VerifyEmail from "./pages/VerifyEmail";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import CreatePassword from "./pages/CreatePassword";
import ResetPassword from "./pages/ResetPassword";
import FoundingHost from "./pages/FoundingHost";
import FoundingCleaner from "./pages/FoundingCleaner";

// Pages accessible without authentication
const PUBLIC_ROUTES = new Set([
  "/", "/Home", "/Search", "/PropertyDetails",
  "/AboutUs", "/LegalCentre", "/TermsAndConditions", "/PrivacyPolicy",
  "/CookiePolicy", "/GuestTerms", "/HostTerms", "/CleanerTerms",
  "/DisputePolicy", "/PaymentPolicy", "/RefundPolicy", "/Accessibility",
  "/BecomeHost", "/BecomeCleaner", "/Index", "/LockScreen",
  "/founding", "/foundinghost", "/foundingcleaner", "/waitlist", "/pending", "/Subscription",
  "/login", "/SignIn", "/ForgotPassword", "/CreatePassword", "/ResetPassword", "/verify-email", "/founding-thankyou",
]);

// After login, redirect based on role records from UserRole
function getRoleRedirect(roles) {
  if (!roles || roles.length === 0) return "/Home";

  const nonGuestRoles = roles.filter(
    (r) => !["guest"].includes((r.role || "").toLowerCase())
  );

  if (nonGuestRoles.length > 0) {
    const hasApproved = nonGuestRoles.some(
      (r) => (r.approval_status || "").toLowerCase() === "approved"
    );
    if (!hasApproved) return "/pending";
  }

  const approved = roles
    .filter((r) => (r.approval_status || "").toLowerCase() === "approved")
    .map((r) => (r.role || "").toLowerCase());

  if (approved.includes("admin")) return "/admin";
  if (approved.includes("host")) return "/HostDashboard";
  if (approved.includes("cleaner")) return "/CleanerDashboard";
  return "/Home";
}

// Helper: returns true if user's non-guest roles are ALL pending (no approved roles)
function isUserPending(roles) {
  if (!roles || roles.length === 0) return false;
  const nonGuestRoles = roles.filter(
    (r) => !["guest"].includes((r.role || "").toLowerCase())
  );
  if (nonGuestRoles.length === 0) return false;
  return !nonGuestRoles.some(
    (r) => (r.approval_status || "").toLowerCase() === "approved"
  );
}

// Fires on the root path — shows Home for guests, redirects authenticated users to their dashboard
function PostLoginRedirect() {
  const { isAuthenticated, isLoadingAuth, user, roles } = useAuth();
  const [redirect, setRedirect] = useState(null);
  const { Pages } = pagesConfig;
  const HomePage = Pages["Home"];

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) return;

    // Optionally call checkFoundingStatus via custom function if needed
    const run = async () => {
      try {
        if (user?.email && user?.id) {
          try {
            await fetch("/functions/checkFoundingStatus", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: user.email,
                user_id: user.id,
              }),
            });
          } catch (_) {
            // swallow founding check errors
          }
        }

        setRedirect(getRoleRedirect(roles || []));
      } catch {
        setRedirect("/Home");
      }
    };

    run();
  }, [isAuthenticated, isLoadingAuth, user, roles]);

  if (!isAuthenticated) return HomePage ? <HomePage /> : null;

  if (!redirect) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return <Navigate to={redirect} replace />;
}

// Guard: only allows admin-role users; redirects others to their dashboard
function RequireAdmin({ children }) {
  const { isAuthenticated, isLoadingAuth, roles } = useAuth();
  const [redirect, setRedirect] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated) {
      setRedirect("/Home");
      setChecked(true);
      return;
    }

    const approved = (roles || [])
      .filter(
        (r) => (r.approval_status || "").toLowerCase() === "approved"
      )
      .map((r) => (r.role || "").toLowerCase());

    if (approved.includes("admin")) {
      setChecked(true);
    } else {
      const dest = approved.includes("host")
        ? "/HostDashboard"
        : approved.includes("cleaner")
        ? "/CleanerDashboard"
        : "/Home";
      setRedirect(dest);
      setChecked(true);
    }
  }, [isAuthenticated, isLoadingAuth, roles]);

  if (!checked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (redirect) return <Navigate to={redirect} replace />;

  return children;
}

// Guard: hard-blocks pending users from all routes except /pending
function RequirePendingCheck({ children }) {
  const { isAuthenticated, isLoadingAuth, roles } = useAuth();
  const location = useLocation();
  const [pendingStatus, setPendingStatus] = useState(null); // null=loading, true=pending, false=ok

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) {
      setPendingStatus(false);
      return;
    }

    setPendingStatus(isUserPending(roles || []));
  }, [isAuthenticated, isLoadingAuth, roles, location.pathname]);

  if (pendingStatus === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (pendingStatus && location.pathname !== "/pending") {
    return <Navigate to="/pending" replace />;
  }

  return children;
}

// Guard: redirects unauthenticated users to Home for protected routes
function RequireAuth({ children }) {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();

  const basePath =
    "/" + location.pathname.replace(/^\/+/, "").split("/")[0];
  const isPublic =
    PUBLIC_ROUTES.has(basePath) || PUBLIC_ROUTES.has(location.pathname);

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

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
  } = useAuth();
  const location = useLocation();

  if (location.pathname === "/login" || location.pathname === "/Login") {
    return <Navigate to="/SignIn" replace />;
  }

  const basePath =
    "/" + location.pathname.replace(/^\/+/, "").split("/")[0];
  const isPublicRoute =
    PUBLIC_ROUTES.has(basePath) || PUBLIC_ROUTES.has(location.pathname);

  if (!isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isLoginRoute = ["/login", "/Login", "/SignIn"].includes(
    location.pathname
  );

  if (!isPublicRoute && !isLoginRoute && authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      return <Navigate to="/Home" replace />;
    }
  }

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in:      { opacity: 1, x: 0 },
    out:     { opacity: 0, x: -20 },
  };
  const pageTransition = { duration: 0.18, ease: "easeOut" };

  const Slide = ({ children }) => (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      transition={pageTransition}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );

  return (
    <RequirePendingCheck>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<Navigate to="/SignIn" replace />} />
          <Route path="/Login" element={<Navigate to="/SignIn" replace />} />
          <Route path="/SignIn" element={<Slide><SignIn /></Slide>} />
          <Route path="/ForgotPassword" element={<Slide><ForgotPassword /></Slide>} />
          <Route path="/CreatePassword" element={<Slide><CreatePassword /></Slide>} />
          <Route path="/ResetPassword" element={<Slide><ResetPassword /></Slide>} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <LayoutWrapper currentPageName="Home">
                  <Slide><PostLoginRedirect /></Slide>
                </LayoutWrapper>
              </RequireAuth>
            }
          />

          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <RequireAuth>
                  <LayoutWrapper currentPageName={path}>
                    <Slide><Page /></Slide>
                  </LayoutWrapper>
                </RequireAuth>
              }
            />
          ))}

          <Route path="/pending" element={<Slide><Pending /></Slide>} />
          <Route path="/founding-thankyou" element={<Slide><FoundingThankYou /></Slide>} />
          <Route path="/founding" element={<Slide><Founding /></Slide>} />
          <Route path="/foundinghost" element={<Slide><FoundingHost /></Slide>} />
          <Route path="/foundingcleaner" element={<Slide><FoundingCleaner /></Slide>} />
          <Route path="/verify-email" element={<Slide><VerifyEmail /></Slide>} />
          <Route
            path="/HowPaymentsWork"
            element={
              <LayoutWrapper currentPageName="HowPaymentsWork">
                <Slide><HowPaymentsWork /></Slide>
              </LayoutWrapper>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <LayoutWrapper currentPageName="AdminPanel">
                  <Slide><AdminPanel /></Slide>
                </LayoutWrapper>
              </RequireAdmin>
            }
          />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </AnimatePresence>
    </RequirePendingCheck>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;