"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#5c3d56", "#2f6f6a", "#c47b2b", "#3d5a80"];

function inr(value: unknown) {
  return `INR ${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function FinanceCharts({
  cashByMonth,
  mrrByInterval,
}: {
  cashByMonth: Array<{ month: string; total: number }>;
  mrrByInterval: Array<{ interval: string; total: number }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section className="rounded-xl border border-[#e6e1ea] bg-white p-4 shadow-sm lg:col-span-3">
        <h2 className="text-sm font-semibold text-[#1f1a24]">Cash collected</h2>
        <p className="mb-3 text-xs text-muted-foreground">Recorded payments, grouped by month</p>
        <div className="h-64">
          {cashByMonth.length === 0 ? (
            <p className="pt-16 text-center text-sm text-muted-foreground">No payments in this window.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashByMonth}>
                <CartesianGrid stroke="#eee7ef" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b6270" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b6270" }} />
                <Tooltip formatter={(value) => [inr(value), "Collected"]} />
                <Bar dataKey="total" fill="#5c3d56" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
      <section className="rounded-xl border border-[#e6e1ea] bg-white p-4 shadow-sm lg:col-span-2">
        <h2 className="text-sm font-semibold text-[#1f1a24]">MRR by interval</h2>
        <p className="mb-3 text-xs text-muted-foreground">Active subscriptions, normalized to a month</p>
        <div className="h-64">
          {mrrByInterval.length === 0 ? (
            <p className="pt-16 text-center text-sm text-muted-foreground">No active subscriptions.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mrrByInterval} dataKey="total" nameKey="interval" innerRadius={52} outerRadius={78} paddingAngle={2}>
                  {mrrByInterval.map((entry, index) => (
                    <Cell key={entry.interval} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => inr(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {mrrByInterval.map((entry, index) => (
            <li key={entry.interval} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              {entry.interval}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
