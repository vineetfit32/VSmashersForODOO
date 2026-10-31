"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#714B67", "#2f6f6a", "#c47b2b", "#3d5a80"];

export function FinanceCharts({
  cashByMonth,
  mrrByInterval,
}: {
  cashByMonth: Array<{ month: string; total: number }>;
  mrrByInterval: Array<{ interval: string; total: number }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section className="rounded-lg border bg-white p-4 lg:col-span-3">
        <h2 className="text-sm font-semibold">Cash collected</h2>
        <p className="mb-3 text-xs text-muted-foreground">Payments over the last six months</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`INR ${Number(value ?? 0).toFixed(2)}`, "Collected"]} />
              <Bar dataKey="total" fill="#714B67" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="rounded-lg border bg-white p-4 lg:col-span-2">
        <h2 className="text-sm font-semibold">MRR by billing interval</h2>
        <p className="mb-3 text-xs text-muted-foreground">Active subscriptions, normalized monthly</p>
        <div className="h-64">
          {mrrByInterval.length === 0 ? (
            <p className="pt-16 text-center text-sm text-muted-foreground">No active subscriptions.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mrrByInterval} dataKey="total" nameKey="interval" innerRadius={48} outerRadius={80}>
                  {mrrByInterval.map((entry, index) => (
                    <Cell key={entry.interval} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `INR ${Number(value ?? 0).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
