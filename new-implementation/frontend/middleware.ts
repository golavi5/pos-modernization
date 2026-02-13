import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/products', '/sales', '/settings', '/customers', '/reports'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessToken = request.cookies.get('accessToken')?.value;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If accessing protected route without token, redirect to login
  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If accessing auth route with token, redirect to dashboard
  if (isAuthRoute && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};