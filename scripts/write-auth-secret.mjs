import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../.env", import.meta.url);
const current = readFileSync(path, "utf8");
if (current.includes("AUTH_SECRET=")) {
  console.log("AUTH_SECRET already present");
} else {
  const secret = randomBytes(32).toString("hex");
  const suffix = current.endsWith("\n") ? "" : "\n";
  writeFileSync(path, `${current}${suffix}AUTH_SECRET="${secret}"\n`);
  console.log(`wrote AUTH_SECRET length ${secret.length}`);
}
