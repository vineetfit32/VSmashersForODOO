import { createHash, randomBytes } from "node:crypto";

const RESET_TTL_MS = 60 * 60 * 1000;

export function issueResetToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: hashResetToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  };
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
