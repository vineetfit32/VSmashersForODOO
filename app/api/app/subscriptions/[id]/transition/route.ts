import { SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

import { json, readJson } from "@/lib/auth/http";
import { zodMessage } from "@/lib/auth/schemas";
import { getSession } from "@/lib/auth/session";
import { DomainError } from "@/services/errors";
import { renewQuotation, transitionSubscription } from "@/services/subscription-fsm";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["transition", "renew"]).default("transition"),
  to: z.nativeEnum(SubscriptionStatus).optional(),
  templateId: z.string().uuid().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return json({ error: "Forbidden" }, 403);
  }

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);

  const { id } = await context.params;

  try {
    if (parsed.data.action === "renew") {
      const subscription = await renewQuotation({
        subscriptionId: id,
        actorId: session.id,
        templateId: parsed.data.templateId,
      });
      return json({ subscription });
    }

    if (!parsed.data.to) return json({ error: "Choose a status to move to." }, 400);
    const subscription = await transitionSubscription({
      subscriptionId: id,
      to: parsed.data.to,
      actorId: session.id,
      templateId: parsed.data.templateId,
    });
    return json({ subscription });
  } catch (error) {
    if (error instanceof DomainError) return json({ error: error.message }, error.status);
    throw error;
  }
}
