import { json } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const user = await getSession();
  return json({ user });
}
