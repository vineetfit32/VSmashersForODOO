import { prisma } from "@/lib/prisma";
import { destinationFor } from "@/lib/auth/access";
import { json, jsonWithSession, readJson } from "@/lib/auth/http";
import { hashPassword } from "@/lib/auth/password";
import { hashResetToken } from "@/lib/auth/reset-token";
import { resetPasswordSchema, zodMessage } from "@/lib/auth/schemas";
import { toPublicUser, tokenForUser } from "@/lib/auth/session";
import { isUserRole } from "@/lib/auth/types";
import { authUserSelect } from "@/lib/auth/users";

export async function POST(request: Request) {
  const parsed = resetPasswordSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return json({ error: zodMessage(parsed.error) }, 400);
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashResetToken(parsed.data.token),
      resetTokenExpiry: { gt: new Date() },
      isActive: true,
    },
    select: authUserSelect,
  });

  if (!user || !isUserRole(user.role)) {
    return json({ error: "This reset link is invalid or has expired." }, 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    }),
    prisma.auditLog.create({
      data: {
        entityName: "user",
        entityId: user.id,
        actorId: user.id,
        action: "PASSWORD_RESET",
        message: `Password reset for ${user.email}.`,
      },
    }),
  ]);

  const record = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    customer: user.customer,
  };
  const token = await tokenForUser(record);

  return jsonWithSession(
    {
      user: toPublicUser(record),
      redirectTo: destinationFor(user.role, null),
    },
    token,
  );
}
