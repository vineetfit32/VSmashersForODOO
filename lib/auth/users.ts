import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const authUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  resetToken: true,
  customer: { select: { id: true } },
} satisfies Prisma.UserSelect;

export function findAuthUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: authUserSelect,
  });
}

export function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
