import { json } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return json({ error: "Forbidden" }, 403);
  }
  return json({ user: session });
}
