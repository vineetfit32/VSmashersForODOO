import { redirect } from "next/navigation";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { homeFor } from "@/lib/auth/access";
import { formatInr } from "@/lib/format";
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
    where: { id: session.customerId, userId: session.id, organizationId: session.organizationId },
    include: { _count: { select: { subscriptions: true, invoices: true } } },
  });

  if (!customer) redirect("/login");

  const [openInvoices, overdue, balance] = await Promise.all([
    prisma.invoice.count({
      where: { customerId: customer.id, status: { in: ["CONFIRMED", "OVERDUE"] } },
    }),
    prisma.invoice.count({
      where: { customerId: customer.id, status: "OVERDUE" },
    }),
    prisma.invoice.aggregate({
      where: { customerId: customer.id, status: { in: ["CONFIRMED", "OVERDUE"] } },
      _sum: { balanceDue: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader
        title={customer.companyName}
        description="These figures are only this account. Open a card to see the invoices behind it."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Subscriptions" value={String(customer._count.subscriptions)} href="/portal/subscriptions" />
        <MetricCard label="Open invoices" value={String(openInvoices)} href="/portal/invoices?status=OPEN" />
        <MetricCard
          label="Balance due"
          value={formatInr(balance._sum.balanceDue)}
          tone={Number(balance._sum.balanceDue ?? 0) > 0 ? "warning" : "default"}
          href="/portal/invoices"
        />
        <MetricCard
          label="Overdue invoices"
          value={String(overdue)}
          href="/portal/invoices?status=OVERDUE"
          tone={overdue > 0 ? "warning" : "default"}
        />
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
