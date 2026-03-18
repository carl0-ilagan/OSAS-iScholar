/**
 * Role-based access control utilities
 */

export const ADMIN_EMAIL = "contact.ischolar@gmail.com"
export const ROLE_ADMIN = "admin"
export const ROLE_CAMPUS_ADMIN = "campus_admin"
export const ROLE_STUDENT = "student"

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase()
}

/**
 * Check if user is admin
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user is admin
 */
export function isAdmin(user) {
  if (!user || !user.email) {
    return false
  }
  const role = normalizeRole(user.appRole || user.role)
  return role === ROLE_ADMIN || role === ROLE_CAMPUS_ADMIN || user.email === ADMIN_EMAIL
}

/**
 * Check if user is campus admin
 * @param {Object} user - Firebase user object
 * @returns {boolean}
 */
export function isCampusAdmin(user) {
  if (!user) {
    return false
  }
  const role = normalizeRole(user.appRole || user.role)
  return role === ROLE_CAMPUS_ADMIN
}

/**
 * Check if user is primary admin (not campus admin)
 * @param {Object} user
 * @returns {boolean}
 */
export function isPrimaryAdmin(user) {
  if (!user || !user.email) {
    return false
  }
  const role = normalizeRole(user.appRole || user.role)
  return role === ROLE_ADMIN || user.email === ADMIN_EMAIL
}

/**
 * Check if user is student
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user is student (authenticated but not admin)
 */
export function isStudent(user) {
  if (!user || !user.email) {
    return false
  }
  const role = normalizeRole(user.appRole || user.role)
  if (role) {
    return role === ROLE_STUDENT
  }
  return user.email !== ADMIN_EMAIL
}

/**
 * Get user role
 * @param {Object} user - Firebase user object
 * @returns {string|null} - 'admin', 'student', or null if not authenticated
 */
export function getUserRole(user) {
  if (!user) {
    return null
  }
  const explicitRole = normalizeRole(user.appRole || user.role)
  if (explicitRole) {
    return explicitRole
  }
  if (isAdmin(user)) {
    return ROLE_ADMIN
  }
  if (isStudent(user)) {
    return ROLE_STUDENT
  }
  return null
}

/**
 * Check if user can access a route
 * @param {Object} user - Firebase user object
 * @param {string} route - Route path (e.g., '/admin', '/student')
 * @returns {boolean} - True if user can access the route
 */
export function canAccessRoute(user, route) {
  if (!user) {
    return false
  }

  if (route.startsWith('/admin')) {
    return isPrimaryAdmin(user)
  }

  if (route.startsWith('/campus-admin')) {
    return isCampusAdmin(user)
  }

  if (route.startsWith('/student')) {
    return isStudent(user)
  }

  // Public routes
  return true
}

