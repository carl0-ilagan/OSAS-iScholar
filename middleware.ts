import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Admin email constant
const ADMIN_EMAIL = 'contact.ischolar@gmail.com'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get user from cookies (Firebase Auth stores token in cookies)
  // Note: This is a basic check. For production, you should verify the token properly
  const authToken = request.cookies.get('__session') || request.cookies.get('firebase-auth-token')
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/about', '/contact', '/privacy', '/terms']
  
  // Admin routes
  const adminRoutes = pathname.startsWith('/admin')
  
  // Student routes
  const studentRoutes = pathname.startsWith('/student')

  // Allow public routes
  if (publicRoutes.includes(pathname) || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For admin routes - check if user is admin
  // Note: In a real implementation, you'd verify the JWT token and check the email
  // This is a basic check. The actual role verification happens in the layout components
  if (adminRoutes && !pathname.startsWith('/admin/login')) {
    // The layout component will handle the actual role check and redirect
    // This middleware just ensures the route structure is correct
    return NextResponse.next()
  }

  // For student routes - ensure they're not trying to access admin routes
  if (studentRoutes) {
    // The layout component will handle the actual role check and redirect
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}

