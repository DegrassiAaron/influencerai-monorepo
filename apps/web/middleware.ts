import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname === '/favicon.ico';
  const isLogin = pathname === '/login';

  if (isApi || isStatic) return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;

  if (!token && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (token && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/(?!_next/.*|favicon.ico).*'],
};
