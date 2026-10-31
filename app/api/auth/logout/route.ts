import { jsonWithoutSession } from "@/lib/auth/http";

export async function POST() {
  return jsonWithoutSession({ ok: true });
}
