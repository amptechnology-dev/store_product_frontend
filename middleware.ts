import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// role -> login er por kothay jabe
const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard",
  STORE: "/dashboard/store",
};

// shudhu ADMIN dekhte parbe
const ADMIN_ONLY = ["/dashboard/users"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("login-token")?.value;

  if (pathname === "/" || pathname === "/store") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let role: string | null = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.TOKEN_SECRET);
      const { payload } = await jwtVerify(token, secret);
      role = (payload.role as string) || null;
    } catch {
      role = null;
    }
  }

  if (pathname === "/login") {
    if (role && ROLE_HOME[role]) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
    return NextResponse.next();
  }

  // /dashboard/*
  if (!role || !ROLE_HOME[role]) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    if (token) res.cookies.set("login-token", "", { maxAge: 0, path: "/" });
    return res;
  }

  const isAdminOnly = ADMIN_ONLY.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isAdminOnly && role !== "ADMIN") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/store", "/login", "/dashboard/:path*"],
};