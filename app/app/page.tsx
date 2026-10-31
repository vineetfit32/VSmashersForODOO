import { BillingRunButton } from "@/components/billing-run-button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Workspace · Billpilot" };

export default async function WorkspaceHome() {
  const session = await getSession();
  const [activeSubscriptions, overdueInvoices, openQuotes] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE", customer: { organizationId: session.organizationId } } }),
    prisma.invoice.count({ where: { status: "OVERDUE", customer: { organizationId: session.organizationId } } }),
    prisma.subscription.count({ where: { status: "QUOTATION", customer: { organizationId: session.organizationId } } }),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <PageHeader title="Dashboard" description="Live counts from subscriptions and invoices. Open a card to filter the list." />
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Active subscriptions" value={String(activeSubscriptions)} href="/app/subscriptions?status=ACTIVE" />
        <MetricCard label="Open quotations" value={String(openQuotes)} href="/app/subscriptions?status=QUOTATION" />
        <MetricCard
          label="Overdue invoices"
          value={String(overdueInvoices)}
          href="/app/invoices?status=OVERDUE"
          tone={overdueInvoices > 0 ? "warning" : "default"}
        />
      </div>
      {session?.role === "ADMIN" ? <BillingRunButton /> : null}
    </div>
  );
}
