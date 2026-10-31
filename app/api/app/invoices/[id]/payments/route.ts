import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

import { json, readJson } from "@/lib/auth/http";
import { zodMessage } from "@/lib/auth/schemas";
import { getSession } from "@/lib/auth/session";
import { DomainError } from "@/services/errors";
import { recordPayment } from "@/services/payment-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  amount: z.number(),
  method: z.nativeEnum(PaymentMethod),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  referenceNote: z.string().max(2000).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return json({ error: "Forbidden" }, 403);
  }

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);

  const { id } = await context.params;
  const paymentDate = parsed.data.paymentDate
    ? new Date(`${parsed.data.paymentDate}T00:00:00.000Z`)
    : undefined;

  try {
    const payment = await recordPayment({
      invoiceId: id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      paymentDate,
      referenceNote: parsed.data.referenceNote,
      recordedById: session.id,
    });
    return json({ payment }, 201);
  } catch (error) {
    if (error instanceof DomainError) return json({ error: error.message }, error.status);
    throw error;
  }
}
