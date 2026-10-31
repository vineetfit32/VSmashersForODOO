import type { UserRole } from "@/lib/auth/types";

export type ProtectedArea = "admin" | "staff" | "portal";

export function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function areaFor(pathname: string): ProtectedArea | null {
  const path = normalizePath(pathname);
  if (path === "/admin" || path.startsWith("/admin/") || path === "/api/admin" || path.startsWith("/api/admin/")) {
    return "admin";
  }
  if (path === "/app" || path.startsWith("/app/") || path === "/api/app" || path.startsWith("/api/app/")) {
    return "staff";
  }
  if (
    path === "/portal" ||
    path.startsWith("/portal/") ||
    path === "/api/portal" ||
    path.startsWith("/api/portal/")
  ) {
    return "portal";
  }
  return null;
}

export function roleAllowed(area: ProtectedArea, role: UserRole) {
  if (area === "admin") return role === "ADMIN";
  if (area === "staff") return role === "ADMIN" || role === "STAFF";
  return role === "CUSTOMER";
}

export function homeFor(role: UserRole) {
  if (role === "ADMIN") return "/admin";
  if (role === "STAFF") return "/app";
  return "/portal";
}

export function destinationFor(role: UserRole, next: string | null | undefined) {
  const fallback = homeFor(role);
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  const path = next.split("?")[0] ?? next;
  const area = areaFor(path);
  if (!area || !roleAllowed(area, role)) return fallback;
  return next;
}

const customerPath = /^\/(?:api\/)?portal\/customers\/([^/]+)/i;

export function isForeignCustomerRequest(url: URL, customerId: string) {
  const own = customerId.toLowerCase();
  const queryId = url.searchParams.get("customerId");
  if (queryId && queryId.toLowerCase() !== own) return true;

  const match = url.pathname.match(customerPath);
  if (match?.[1] && decodeURIComponent(match[1]).toLowerCase() !== own) return true;

  return false;
}
