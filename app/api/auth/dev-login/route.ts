import { json, jsonWithSession, readJson } from "@/lib/auth/http";
import { homeFor } from "@/lib/auth/access";
import { toPublicUser, tokenForUser } from "@/lib/auth/session";
import { isUserRole, type UserRole } from "@/lib/auth/types";
import { findAuthUserByEmail } from "@/lib/auth/users";

const PERSONAS: Record<UserRole, string> = {
  ADMIN: "admin@brightloop.com",
  STAFF: "staff1@brightloop.com",
  CUSTOMER: "meera.iyer@northwind.example",
};

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return json({ error: "Not found" }, 404);
  }

  const body = await readJson(request);
  const role = body && typeof body === "object" && "role" in body ? body.role : null;
  if (!isUserRole(role)) {
    return json({ error: "Choose Admin, Staff, or Customer." }, 400);
  }

  const user = await findAuthUserByEmail(PERSONAS[role]);
  if (!user || !user.isActive || !isUserRole(user.role) || user.role !== role) {
    return json({ error: "Seeded persona was not found. Run the database seed." }, 404);
  }
  if (role === "CUSTOMER" && !user.customer) {
    return json({ error: "Customer persona is not linked to a customer record." }, 409);
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
      redirectTo: homeFor(user.role),
    },
    token,
  );
}
