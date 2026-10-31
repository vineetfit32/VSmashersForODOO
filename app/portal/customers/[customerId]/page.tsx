import { redirect } from "next/navigation";

import { WorkspaceFrame } from "@/components/workspace-frame";
import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OwnCustomerPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/portal");
  if (session.role !== "CUSTOMER") redirect(homeFor(session.role));
  if (!session.customerId) redirect("/login");

  const { customerId } = await params;
  if (decodeURIComponent(customerId).toLowerCase() !== session.customerId.toLowerCase()) {
    redirect("/portal");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: session.customerId, userId: session.id },
  });
  if (!customer) redirect("/login");

  return (
    <WorkspaceFrame
      eyebrow="Your customer record"
      title={customer.companyName}
      description="Opened from your own customer id. A different id is rejected before this page loads."
    />
  );
}
