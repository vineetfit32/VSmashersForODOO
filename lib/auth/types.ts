export const USER_ROLES = ["ADMIN", "STAFF", "CUSTOMER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type PublicUser = {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  customerId: string | null;
  firstName: string;
  lastName: string;
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}
