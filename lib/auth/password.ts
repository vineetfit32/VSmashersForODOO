import bcrypt from "bcryptjs";

const ROUNDS = 10;

let dummyHash: Promise<string> | null = null;

function dummyPasswordHash() {
  dummyHash ??= bcrypt.hash("brightloop-dummy-password", ROUNDS);
  return dummyHash;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    await bcrypt.compare(password, await dummyPasswordHash());
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}
