import { randomBytes } from "node:crypto";

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

  const { email, password, firstName, lastName, companyName, next } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return json({ error: "An account with this email already exists." }, 409);
  }

  const passwordHash = await hashPassword(password);
  const slugBase = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "workspace";
  const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: companyName, slug },
      });
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email,
          passwordHash,
          firstName,
          lastName,
          role: "ADMIN",
        },
      });
      await tx.taxRule.create({
        data: {
          organizationId: organization.id,
          name: "GST 18%",
          ratePercent: "18.00",
        },
      });
      await tx.auditLog.create({
        data: {
          entityName: "user",
          entityId: user.id,
          actorId: user.id,
          action: "REGISTER",
          message: `Workspace ${companyName} opened by ${email}.`,
        },
      });
      return { user, organization };
    });

    const record = {
      id: created.user.id,
      email: created.user.email,
      role: "ADMIN" as const,
      organizationId: created.organization.id,
      firstName: created.user.firstName,
      lastName: created.user.lastName,
      customer: null,
    };
    const token = await tokenForUser(record);

    return jsonWithSession(
      {
        user: toPublicUser(record),
        redirectTo: destinationFor("ADMIN", next),
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
