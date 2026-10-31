import { redirect } from "next/navigation";

import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your account · Brightloop" };

export default async function PortalPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/portal");
  if (session.role !== "CUSTOMER") redirect(homeFor(session.role));
  if (!session.customerId) redirect("/login");

  const customer = await prisma.customer.findFirst({
    where: { id: session.customerId, userId: session.id },
    include: { _count: { select: { subscriptions: true, invoices: true } } },
  });

  if (!customer) redirect("/login");

  return (
    <WorkspaceFrame
      eyebrow="Customer portal"
      title={customer.companyName}
      description="This view is limited to your customer record. Other customers' subscriptions and invoices stay hidden."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Info label="Contact" value={customer.contactName} />
        <Info label="Email" value={customer.email} />
        <Info label="Billing address" value={customer.billingAddress ?? "Not provided"} />
        <Info label="Customer id" value={customer.id} />
        <Info label="Subscriptions" value={String(customer._count.subscriptions)} />
        <Info label="Invoices" value={String(customer._count.invoices)} />
      </div>
    </WorkspaceFrame>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-medium">{value}</dd>
    </div>
  );
}
