import { z } from "zod";

import { PASSWORD_MESSAGE, PASSWORD_REGEX } from "@/lib/auth/password-policy";

const emailSchema = z
  .string({ required_error: "Email is required." })
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, "Email is required.")
      .max(255, "Email is too long.")
      .email("Enter a valid email address."),
  );

export const passwordSchema = z
  .string({ required_error: "Password is required." })
  .max(128, "Password is too long.")
  .regex(PASSWORD_REGEX, PASSWORD_MESSAGE);

const personSchema = {
  email: emailSchema,
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  companyName: z.string().trim().min(1, "Company name is required.").max(255),
  phone: z
    .string()
    .trim()
    .max(50, "Phone is too long.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  next: z.string().max(500).optional(),
};

export const registerSchema = z.object({
  ...personSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(128),
  next: z.string().max(500).optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, "This reset link is invalid or has expired.").max(200),
  password: passwordSchema,
});

export function zodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid request.";
}
