import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";

// Optimistic gate for /admin: bounce signed-out visitors to the login page
// before any admin UI renders. Every admin data read and Server Action also
// re-checks the session (lib/session.ts), so this is a convenience, not the lock.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  let signedIn = false;
  try {
    signedIn = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, Date.now());
  } catch {
    signedIn = false;
  }

  if (!signedIn && !isLogin) {
    const url = new URL("/admin/login", request.url);
    if (pathname !== "/admin") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (signedIn && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
