import { FinanceChartsLoader } from "@/components/finance-charts-loader";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { formatInr } from "@/lib/format";
import { getFinanceSummary } from "@/services/finance";

export const dynamic = "force-dynamic";

export const metadata = { title: "Finance · Brightloop" };

export default async function FinancePage() {
  const summary = await getFinanceSummary();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <PageHeader
        title="Finance"
        description={`${summary.overdueCount} overdue invoice${summary.overdueCount === 1 ? "" : "s"}. Totals come from active subscriptions, open invoices, and recorded payments.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Active subscriptions" value={String(summary.activeSubscriptions)} href="/app/subscriptions?status=ACTIVE" />
        <MetricCard label="Monthly cash in" value={formatInr(summary.monthlyCash)} hint="Payments dated this month" />
        <MetricCard label="AR owed" value={formatInr(summary.accountsReceivable)} hint="Confirmed invoices not yet due" />
        <MetricCard
          label="Overdue amount"
          value={formatInr(summary.overdueAmount)}
          hint={`${summary.overdueCount} invoice${summary.overdueCount === 1 ? "" : "s"}`}
          href="/app/invoices?status=OVERDUE"
          tone={summary.overdueAmount > 0 ? "warning" : "default"}
        />
        <MetricCard label="MRR" value={formatInr(summary.mrr)} hint="Daily × 30, weekly × 4.33, yearly ÷ 12" />
        <MetricCard label="ARR" value={formatInr(summary.arr)} hint="MRR × 12" />
      </div>
      <FinanceChartsLoader cashByMonth={summary.cashByMonth} mrrByInterval={summary.mrrByInterval} />
    </div>
  );
}
