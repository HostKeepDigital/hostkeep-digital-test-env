/**
 * Role-Based Access Control (RBAC) System
 *
 * ROLES:
 *   public_guest  — unauthenticated
 *   guest         — signed in
 *   host          — signed in + host approved
 *   cleaner       — signed in + cleaner approved
 *   admin         — manually assigned only
 *
 * Users can hold multiple roles simultaneously:
 *   e.g. ["guest", "host"] or ["guest", "cleaner", "host"]
 */

// ─── Route Access Matrix ─────────────────────────────────────────────────────
// Each entry lists the minimum roles that may access that route.
// "*" means any role (including public_guest).
// An empty array means no one (disabled/internal route).

export const ROUTE_ACCESS = {
  // ── Public / Auth ──────────────────────────────────────────────────────────
  "/":                         ["*"],
  "/Home":                     ["*"],
  "/SignIn":                   ["*"],
  "/ForgotPassword":           ["*"],
  "/CreatePassword":           ["*"],
  "/ResetPassword":            ["*"],
  "/founding":                 ["*"],
  "/founding-thankyou":        ["*"],
  "/verify-email":             ["*"],
  "/pending":                  ["guest", "host", "cleaner", "admin"],

  // ── Browse / Search (public) ───────────────────────────────────────────────
  "/Search":                   ["*"],
  "/PropertyDetails":          ["*"],
  "/Index":                    ["*"],

  // ── Legal / Info (public) ─────────────────────────────────────────────────
  "/AboutUs":                  ["*"],
  "/LegalCentre":              ["*"],
  "/TermsAndConditions":       ["*"],
  "/PrivacyPolicy":            ["*"],
  "/CookiePolicy":             ["*"],
  "/GuestTerms":               ["*"],
  "/HostTerms":                ["*"],
  "/CleanerTerms":             ["*"],
  "/DisputePolicy":            ["*"],
  "/PaymentPolicy":            ["*"],
  "/RefundPolicy":             ["*"],
  "/Accessibility":            ["*"],
  "/HowPaymentsWork":          ["*"],

  // ── Guest (requires sign-in) ───────────────────────────────────────────────
  "/Pay":                      ["guest", "host", "cleaner", "admin"],
  "/MyTrips":                  ["guest", "host", "cleaner", "admin"],
  "/MyBookings":               ["guest", "host", "cleaner", "admin"],
  "/GuestMessages":            ["guest", "host", "cleaner", "admin"],
  "/GuestProfile":             ["guest", "host", "cleaner", "admin"],
  "/Settings":                 ["guest", "host", "cleaner", "admin"],
  "/Subscription":             ["guest", "host", "cleaner", "admin"],
  "/BecomeHost":               ["guest", "host", "cleaner", "admin"],
  "/BecomeCleaner":            ["guest", "host", "cleaner", "admin"],

  // ── Host ──────────────────────────────────────────────────────────────────
  "/HostDashboard":            ["host", "admin"],
  "/HostProperties":           ["host", "admin"],
  "/HostBookings":             ["host", "admin"],
  "/HostMessages":             ["host", "admin"],
  "/HostCancellationPolicies": ["host", "admin"],
  "/CreateProperty":           ["host", "admin"],
  "/EditProperty":             ["host", "admin"],
  "/HostVerification":         ["host", "admin"],

  // ── Cleaner ───────────────────────────────────────────────────────────────
  "/CleanKeep":                ["cleaner", "host", "admin"],
  "/CleanerDashboard":         ["cleaner", "admin"],
  "/CleanerMessages":          ["cleaner", "admin"],
  "/CleanerPricing":           ["cleaner", "admin"],
  "/CleanerProfile":           ["cleaner", "admin"],
  "/CleanerMarketplace":       ["cleaner", "admin"],
  "/CleanerSignup":            ["guest", "host", "cleaner", "admin"],
  "/CleanerSubscriptionPay":   ["cleaner", "admin"],
  "/CleanerVerification":      ["cleaner", "admin"],

  // ── Admin ─────────────────────────────────────────────────────────────────
  "/admin":                    ["admin"],
  "/AdminVerifications":       ["admin"],
  "/PostcodeTestConsole":      ["admin"],
  "/LockScreen":               ["admin"],
};

// ─── Core Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true if the user is authenticated (i.e. not public_guest).
 * @param {string[]} userRoles
 */
export function isAuthenticated(userRoles) {
  if (!userRoles || userRoles.length === 0) return false;
  return !userRoles.every(r => r === "public_guest");
}

/**
 * Returns true only if the user has the admin role.
 * @param {string[]} userRoles
 */
export function isAdmin(userRoles) {
  return Array.isArray(userRoles) && userRoles.includes("admin");
}

/**
 * Checks whether a set of roles is allowed to access a route.
 * @param {string[]} userRoles  - e.g. ["guest", "host"]
 * @param {string}   route      - e.g. "/HostDashboard"
 * @returns {boolean}
 */
export function canAccess(userRoles, route) {
  // Normalise: strip query strings / trailing slashes
  const normRoute = route.split("?")[0].replace(/\/$/, "") || "/";

  const allowed = ROUTE_ACCESS[normRoute];

  // Unknown route — deny by default
  if (!allowed) return false;

  // Wildcard — anyone including public_guest
  if (allowed.includes("*")) return true;

  const roles = Array.isArray(userRoles) ? userRoles : ["public_guest"];

  return roles.some(r => allowed.includes(r));
}

/**
 * Returns the default redirect path for a given set of roles.
 * Priority: admin > host > cleaner > guest > public_guest
 * @param {string[]} userRoles
 * @returns {string}
 */
export function getDefaultRedirect(userRoles) {
  const roles = Array.isArray(userRoles) ? userRoles : [];

  if (roles.includes("admin"))   return "/admin";
  if (roles.includes("host"))    return "/HostDashboard";
  if (roles.includes("cleaner")) return "/CleanerDashboard";
  if (roles.includes("guest"))   return "/Home";

  return "/Home"; // public_guest
}

/**
 * Middleware-style route protection.
 * Returns an object describing what to do for a given route + roles.
 *
 * @param {string}   route     - The route the user is trying to access
 * @param {string[]} userRoles - The user's current roles
 * @returns {{ allowed: boolean, redirect?: string }}
 *
 * Usage:
 *   const { allowed, redirect } = protectRoute("/HostDashboard", ["guest"]);
 *   if (!allowed) navigate(redirect);
 */
export function protectRoute(route, userRoles) {
  if (canAccess(userRoles, route)) {
    return { allowed: true };
  }

  // If not authenticated at all, send to SignIn with return URL
  if (!isAuthenticated(userRoles)) {
    const encodedRoute = encodeURIComponent(route);
    return {
      allowed: false,
      redirect: `/SignIn?redirect=${encodedRoute}`,
    };
  }

  // Authenticated but wrong role — send to their default page
  return {
    allowed: false,
    redirect: getDefaultRedirect(userRoles),
  };
}

/**
 * Safely adds a role (host or cleaner) to a user.
 * Admin role can NEVER be added through this function.
 *
 * @param {string} userId
 * @param {"host"|"cleaner"} role
 * @param {object} entitiesClient - base44.entities (or base44.asServiceRole.entities)
 * @returns {Promise<object>} The created UserRole record
 * @throws {Error} if role is "admin" or invalid
 */
export async function addRole(userId, role, entitiesClient) {
  const ALLOWED_ROLES = ["host", "cleaner"];

  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(
      `addRole: "${role}" cannot be assigned via this function. ` +
      `Only ${ALLOWED_ROLES.join(", ")} are permitted. Admin must be assigned manually.`
    );
  }

  // Check if the role already exists
  const existing = await entitiesClient.UserRole.filter({
    user_id: userId,
    role,
  });

  if (existing?.length > 0) {
    return existing[0]; // Already has this role
  }

  return entitiesClient.UserRole.create({
    user_id: userId,
    role,
    approval_status: "pending", // Requires admin approval
  });
}