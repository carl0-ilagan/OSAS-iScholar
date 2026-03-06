/**
 * Role-based access control utilities
 */

export const ADMIN_EMAIL = "contact.ischolar@gmail.com"

/**
 * Check if user is admin
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user is admin
 */
export function isAdmin(user) {
  if (!user || !user.email) {
    return false
  }
  return user.email === ADMIN_EMAIL
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
  if (isAdmin(user)) {
    return 'admin'
  }
  if (isStudent(user)) {
    return 'student'
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
    return isAdmin(user)
  }

  if (route.startsWith('/student')) {
    return isStudent(user)
  }

  // Public routes
  return true
}

