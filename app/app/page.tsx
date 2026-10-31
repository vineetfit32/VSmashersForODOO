import { BillingRunButton } from "@/components/billing-run-button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { formatInr } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { getFinanceSummary } from "@/services/finance";

export const dynamic = "force-dynamic";

export const metadata = { title: "Workspace · Billpilot" };

export default async function WorkspaceHome() {
  const session = await getSession();
  if (!session) return null;
  const summary = await getFinanceSummary(session.organizationId);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <PageHeader
        title="Dashboard"
        description="These totals are only for your company. Open a card to see the records behind it."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Active subscriptions" value={String(summary.activeSubscriptions)} href="/app/subscriptions?status=ACTIVE" />
        <MetricCard label="Monthly cash in" value={formatInr(summary.monthlyCash)} href="/app/payments" />
        <MetricCard
          label="Still owed"
          value={formatInr(summary.accountsReceivable + summary.overdueAmount)}
          hint="Open invoices, including overdue"
          href="/app/invoices?status=OPEN"
        />
        <MetricCard
          label="Overdue"
          value={formatInr(summary.overdueAmount)}
          hint={`${summary.overdueCount} invoice${summary.overdueCount === 1 ? "" : "s"}`}
          href="/app/invoices?status=OVERDUE"
          tone={summary.overdueAmount > 0 ? "warning" : "default"}
        />
        <MetricCard label="MRR" value={formatInr(summary.mrr)} href="/app/finance" />
        <MetricCard label="ARR" value={formatInr(summary.arr)} href="/app/finance" />
      </div>
      {session?.role === "ADMIN" ? <BillingRunButton /> : null}
    </div>
  );
}
