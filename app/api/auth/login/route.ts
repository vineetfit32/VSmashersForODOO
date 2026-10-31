import { prisma } from "@/lib/prisma";
import { destinationFor } from "@/lib/auth/access";
import { json, jsonWithSession, readJson } from "@/lib/auth/http";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema, zodMessage } from "@/lib/auth/schemas";
import { toPublicUser, tokenForUser } from "@/lib/auth/session";
import { isUserRole } from "@/lib/auth/types";
import { findAuthUserByEmail } from "@/lib/auth/users";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return json({ error: zodMessage(parsed.error) }, 400);
  }

  const { email, password, next } = parsed.data;
  const user = await findAuthUserByEmail(email);
  const matches = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !user.isActive || !matches || !isUserRole(user.role)) {
    return json({ error: "Invalid email or password." }, 401);
  }

  if (user.resetToken) {
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: null, resetTokenExpiry: null },
    });
  }

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
      redirectTo: destinationFor(user.role, next),
    },
    token,
  );
}
