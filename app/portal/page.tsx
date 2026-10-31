import { redirect } from "next/navigation";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your account · Billpilot" };

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
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader title={customer.companyName} description="Invoices and subscriptions for this account only." />
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Subscriptions" value={String(customer._count.subscriptions)} href="/portal/subscriptions" />
        <MetricCard label="Invoices" value={String(customer._count.invoices)} href="/portal/invoices" />
        <Info label="Contact" value={customer.contactName} />
        <Info label="Email" value={customer.email} />
        <Info label="Billing address" value={customer.billingAddress ?? "Not provided"} />
      </div>
    </div>
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
