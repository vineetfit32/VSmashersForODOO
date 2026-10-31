import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { signSession, verifySession } from "@/lib/auth/token";
import { isUserRole, type PublicUser, type UserRole } from "@/lib/auth/types";

type AuthRecord = {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  firstName: string;
  lastName: string;
  customer: { id: string } | null;
};

export async function tokenForUser(user: AuthRecord) {
  return signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    customerId: user.customer?.id ?? "",
    firstName: user.firstName,
    lastName: user.lastName,
  });
}

export function toPublicUser(user: AuthRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    customerId: user.customer?.id ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function getSession(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySession(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      organizationId: true,
      isActive: true,
      customer: { select: { id: true } },
    },
  });

  if (!user || !user.isActive || !isUserRole(user.role)) return null;

  return toPublicUser({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    firstName: user.firstName,
    lastName: user.lastName,
    customer: user.customer,
  });
}
