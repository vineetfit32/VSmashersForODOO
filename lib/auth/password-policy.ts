/** Section 3.1 — at least 9 characters, one uppercase, one lowercase, one special. */
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{9,}$/;

export const PASSWORD_MESSAGE =
  "Use at least 9 characters with an uppercase letter, a lowercase letter, and a special character.";

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
