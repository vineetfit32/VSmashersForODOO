import { json } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";
import { generateRecurringInvoices } from "@/services/billing-engine";
import { DomainError } from "@/services/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    const result = await generateRecurringInvoices({ actorId: session.id });
    return json(result);
  } catch (error) {
    if (error instanceof DomainError) return json({ error: error.message }, error.status);
    throw error;
  }
}
