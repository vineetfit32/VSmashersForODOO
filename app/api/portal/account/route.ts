import { prisma } from "@/lib/prisma";
import { json } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER" || !session.customerId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const requested = new URL(request.url).searchParams.get("customerId");
  if (requested && requested.toLowerCase() !== session.customerId.toLowerCase()) {
    return json({ error: "You can only access your own customer record." }, 403);
  }

  const customer = await prisma.customer.findFirst({
    where: { id: session.customerId, userId: session.id },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      email: true,
      phone: true,
      billingAddress: true,
    },
  });

  if (!customer) {
    return json({ error: "Forbidden" }, 403);
  }

  return json({ customer });
}
