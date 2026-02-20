import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from './i18n-request';

const protectedRoutes = ['/dashboard', '/products', '/sales', '/settings', '/customers', '/reports', '/inventory', '/users', '/notifications'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessToken = request.cookies.get('accessToken')?.value;

  // Handle locale detection
  let locale = request.cookies.get('NEXT_LOCALE')?.value;

  // If no locale cookie, try to get from Accept-Language header
  if (!locale || !locales.includes(locale as any)) {
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
      const preferredLocale = acceptLanguage.split(',')[0].split('-')[0];
      if (locales.includes(preferredLocale as any)) {
        locale = preferredLocale;
      }
    }
  }

  // Default to Spanish if no valid locale found
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  const response = NextResponse.next();

  // Set locale cookie if not set
  if (request.cookies.get('NEXT_LOCALE')?.value !== locale) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 31536000, // 1 year
    });
  }

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

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};