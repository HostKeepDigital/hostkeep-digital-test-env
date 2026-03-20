import { base44 } from "@/api/base44Client";

// Get all roles for a user (returns full objects with approval_status)
export async function getUserRoles(userId) {
  try {
    const userRoles = await base44.entities.UserRole.filter({ user_id: userId });
    return userRoles;
  } catch (error) {
    return [];
  }
}

// Check if any of the user's roles are pending (not yet approved)
export function hasPendingRole(userRoles) {
  return userRoles.some(r => (r.approval_status || 'pending') === 'pending' && ['host', 'cleaner'].includes(r.role));
}

// Check if user has NO approved non-guest roles (fully pending state)
export function isFullyPending(userRoles) {
  const nonGuestRoles = userRoles.filter(r => !['guest'].includes(r.role));
  if (nonGuestRoles.length === 0) return false;
  return nonGuestRoles.every(r => (r.approval_status || 'pending') !== 'approved');
}

// Check if user has at least one of the required roles
export function hasAnyRole(userRoles, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.some(role => userRoles.includes(role));
}

// Check if user has a specific role
export function hasRole(userRoles, role) {
  return userRoles.includes(role);
}

// Add role to user
export async function addUserRole(userId, role) {
  // Check if role already exists
  const existing = await base44.entities.UserRole.filter({ 
    user_id: userId, 
    role: role 
  });
  
  if (existing.length === 0) {
    await base44.entities.UserRole.create({
      user_id: userId,
      role: role
    });
  }
}

// Remove role from user
export async function removeUserRole(userId, role) {
  const userRoles = await base44.entities.UserRole.filter({ user_id: userId });
  
  // Ensure user has at least one role
  if (userRoles.length <= 1) {
    throw new Error("User must have at least one role");
  }
  
  const roleToRemove = userRoles.find(ur => ur.role === role);
  if (roleToRemove) {
    await base44.entities.UserRole.delete(roleToRemove.id);
  }
}

// Initialize default guest role on signup
export async function initializeGuestRole(userId) {
  await addUserRole(userId, 'guest');
}