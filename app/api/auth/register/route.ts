import { prisma } from "@/lib/prisma";
import { destinationFor } from "@/lib/auth/access";
import { json, jsonWithSession, readJson } from "@/lib/auth/http";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema, zodMessage } from "@/lib/auth/schemas";
import { toPublicUser, tokenForUser } from "@/lib/auth/session";
import { isUniqueConflict } from "@/lib/auth/users";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return json({ error: zodMessage(parsed.error) }, 400);
  }

  const { email, password, firstName, lastName, companyName, phone, next } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: "CUSTOMER",
        },
      });
      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          companyName,
          contactName: `${firstName} ${lastName}`,
          email,
          phone: phone ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          entityName: "user",
          entityId: user.id,
          actorId: user.id,
          action: "REGISTER",
          message: `Customer account created for ${email}.`,
        },
      });
      return { user, customer };
    });

    const record = {
      id: created.user.id,
      email: created.user.email,
      role: "CUSTOMER" as const,
      firstName: created.user.firstName,
      lastName: created.user.lastName,
      customer: { id: created.customer.id },
    };
    const token = await tokenForUser(record);

    return jsonWithSession(
      {
        user: toPublicUser(record),
        redirectTo: destinationFor("CUSTOMER", next),
      },
      token,
      201,
    );
  } catch (error) {
    if (isUniqueConflict(error)) {
      return json({ error: "An account with this email already exists." }, 409);
    }
    throw error;
  }
}
