import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  // Try default cookie name first, then secure prefix
  let token = await getToken({ req, secret });
  if (!token) {
    token = await getToken({
      req,
      secret,
      cookieName: "__Secure-authjs.session-token",
    });
  }
  if (!token) {
    token = await getToken({
      req,
      secret,
      cookieName: "authjs.session-token",
    });
  }

  const isLoggedIn = !!token;
  const isAuthPage = pathname.startsWith("/login");

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
