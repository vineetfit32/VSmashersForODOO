import { NextResponse, type NextRequest } from "next/server";

import { areaFor, homeFor, isForeignCustomerRequest, normalizePath, roleAllowed } from "@/lib/auth/access";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/token";

function unauthenticated(request: NextRequest, path: string) {
  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  const next = `${path}${request.nextUrl.search}`;
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

function denyRole(request: NextRequest, path: string, role: "ADMIN" | "STAFF" | "CUSTOMER") {
  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const destination = request.nextUrl.clone();
  const home = homeFor(role);
  destination.pathname = home;
  destination.search = "";
  return NextResponse.redirect(destination);
}

function forbidden(path: string) {
  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "You can only access your own customer record." }, { status: 403 });
  }

  return new NextResponse("You can only access your own customer record.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function middleware(request: NextRequest) {
  const path = normalizePath(request.nextUrl.pathname);
  const area = areaFor(path);
  if (!area) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const response = unauthenticated(request, path);
    if (token) clearSessionCookie(response);
    return response;
  }

  if (!roleAllowed(area, session.role)) {
    return denyRole(request, path, session.role);
  }

  if (area === "portal") {
    if (!session.customerId) {
      return denyRole(request, path, session.role);
    }
    if (isForeignCustomerRequest(request.nextUrl, session.customerId)) {
      return forbidden(path);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
