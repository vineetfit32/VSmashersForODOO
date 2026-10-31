"use client";

import dynamic from "next/dynamic";

const FinanceCharts = dynamic(
  () => import("@/components/finance-charts").then((mod) => mod.FinanceCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-5" aria-hidden="true">
        <div className="h-80 animate-pulse rounded-xl border bg-white lg:col-span-3" />
        <div className="h-80 animate-pulse rounded-xl border bg-white lg:col-span-2" />
      </div>
    ),
  },
);

export function FinanceChartsLoader({
  cashByMonth,
  mrrByInterval,
}: {
  cashByMonth: Array<{ month: string; total: number }>;
  mrrByInterval: Array<{ interval: string; total: number }>;
}) {
  return <FinanceCharts cashByMonth={cashByMonth} mrrByInterval={mrrByInterval} />;
}
