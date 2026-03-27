import { NextResponse, type NextRequest } from 'next/server';

import {
  USER_ID_COOKIE_NAME,
  buildUserIdCookieValue,
  getUserIdCookieOptions,
} from '@/lib/server/user-session';

export function middleware(request: NextRequest) {
  if (request.cookies.get(USER_ID_COOKIE_NAME)?.value) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(USER_ID_COOKIE_NAME, buildUserIdCookieValue(), getUserIdCookieOptions());
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
