import { SignJWT, jwtVerify } from "jose";

import { isUserRole, type UserRole } from "@/lib/auth/types";

export type SessionClaims = {
  sub: string;
  email: string;
  role: UserRole;
  customerId: string;
  firstName: string;
  lastName: string;
};

function secretKey() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT({
    email: claims.email,
    role: claims.role,
    customerId: claims.customerId,
    firstName: claims.firstName,
    lastName: claims.lastName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || !isUserRole(payload.role)) return null;
    if (typeof payload.email !== "string") return null;

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      customerId: typeof payload.customerId === "string" ? payload.customerId : "",
      firstName: typeof payload.firstName === "string" ? payload.firstName : "",
      lastName: typeof payload.lastName === "string" ? payload.lastName : "",
    };
  } catch {
    return null;
  }
}
