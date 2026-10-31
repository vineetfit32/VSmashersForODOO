import { FinanceCharts } from "@/components/finance-charts";
import { formatInr } from "@/lib/format";
import { getFinanceSummary } from "@/services/finance";

export const dynamic = "force-dynamic";

export const metadata = { title: "Finance · Brightloop" };

export default async function FinancePage() {
  const summary = await getFinanceSummary();
  const cards = [
    ["Active subscriptions", String(summary.activeSubscriptions)],
    ["Monthly cash in", formatInr(summary.monthlyCash)],
    ["AR owed", formatInr(summary.accountsReceivable)],
    ["Overdue amount", formatInr(summary.overdueAmount)],
    ["MRR", formatInr(summary.mrr)],
    ["ARR", formatInr(summary.arr)],
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="text-sm text-muted-foreground">
          {summary.overdueCount} overdue invoice{summary.overdueCount === 1 ? "" : "s"}. Figures are read from indexed
          subscription, invoice, and payment totals.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
      <FinanceCharts cashByMonth={summary.cashByMonth} mrrByInterval={summary.mrrByInterval} />
    </div>
  );
}
