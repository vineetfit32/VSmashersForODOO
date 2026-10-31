import { prisma } from "@/lib/prisma";
import { businessToday, isoDate } from "@/services/dates";

export type FinanceSummary = {
  activeSubscriptions: number;
  monthlyCash: number;
  accountsReceivable: number;
  overdueAmount: number;
  overdueCount: number;
  mrr: number;
  arr: number;
  cashByMonth: Array<{ month: string; total: number }>;
  mrrByInterval: Array<{ interval: string; total: number }>;
};

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const today = isoDate(businessToday());
  const monthStart = `${today.slice(0, 7)}-01`;

  const [row] = await prisma.$queryRaw<
    Array<{
      active_subscriptions: number;
      monthly_cash: number;
      accounts_receivable: number;
      overdue_amount: number;
      overdue_count: number;
      mrr: number;
    }>
  >`
    SELECT
      (SELECT COUNT(*)::int FROM subscriptions WHERE status = 'ACTIVE') AS active_subscriptions,
      (
        SELECT COALESCE(SUM(amount), 0)::float
        FROM payments
        WHERE payment_date >= CAST(${monthStart} AS date)
          AND payment_date <= CAST(${today} AS date)
      ) AS monthly_cash,
      (
        SELECT COALESCE(SUM(balance_due), 0)::float
        FROM invoices
        WHERE balance_due > 0
          AND status = 'CONFIRMED'
          AND due_date >= CAST(${today} AS date)
      ) AS accounts_receivable,
      (
        SELECT COALESCE(SUM(balance_due), 0)::float
        FROM invoices
        WHERE balance_due > 0
          AND status IN ('CONFIRMED', 'OVERDUE')
          AND due_date < CAST(${today} AS date)
      ) AS overdue_amount,
      (
        SELECT COUNT(*)::int
        FROM invoices
        WHERE balance_due > 0
          AND status IN ('CONFIRMED', 'OVERDUE')
          AND due_date < CAST(${today} AS date)
      ) AS overdue_count,
      (
        SELECT COALESCE(SUM(
          CASE p.interval
            WHEN 'DAILY' THEN s.grand_total * 30.0 / GREATEST(p.interval_count, 1)
            WHEN 'WEEKLY' THEN s.grand_total * 4.33 / GREATEST(p.interval_count, 1)
            WHEN 'MONTHLY' THEN s.grand_total / GREATEST(p.interval_count, 1)
            WHEN 'YEARLY' THEN s.grand_total / 12.0 / GREATEST(p.interval_count, 1)
            ELSE 0
          END
        ), 0)::float
        FROM subscriptions s
        JOIN subscription_plans p ON p.id = s.plan_id
        WHERE s.status = 'ACTIVE'
      ) AS mrr
  `;

  const cashRows = await prisma.$queryRaw<Array<{ month: string; total: number }>>`
    SELECT to_char(date_trunc('month', payment_date), 'Mon YYYY') AS month,
           COALESCE(SUM(amount), 0)::float AS total
    FROM payments
    WHERE payment_date >= (CAST(${today} AS date) - INTERVAL '5 months')
    GROUP BY date_trunc('month', payment_date)
    ORDER BY date_trunc('month', payment_date)
  `;

  const intervalRows = await prisma.$queryRaw<Array<{ interval: string; total: number }>>`
    SELECT p.interval::text AS interval,
           COALESCE(SUM(
             CASE p.interval
               WHEN 'DAILY' THEN s.grand_total * 30.0 / GREATEST(p.interval_count, 1)
               WHEN 'WEEKLY' THEN s.grand_total * 4.33 / GREATEST(p.interval_count, 1)
               WHEN 'MONTHLY' THEN s.grand_total / GREATEST(p.interval_count, 1)
               WHEN 'YEARLY' THEN s.grand_total / 12.0 / GREATEST(p.interval_count, 1)
               ELSE 0
             END
           ), 0)::float AS total
    FROM subscriptions s
    JOIN subscription_plans p ON p.id = s.plan_id
    WHERE s.status = 'ACTIVE'
    GROUP BY p.interval
    ORDER BY p.interval
  `;

  const mrr = Number(row?.mrr ?? 0);
  return {
    activeSubscriptions: Number(row?.active_subscriptions ?? 0),
    monthlyCash: Number(row?.monthly_cash ?? 0),
    accountsReceivable: Number(row?.accounts_receivable ?? 0),
    overdueAmount: Number(row?.overdue_amount ?? 0),
    overdueCount: Number(row?.overdue_count ?? 0),
    mrr,
    arr: mrr * 12,
    cashByMonth: cashRows.map((entry) => ({ month: entry.month, total: Number(entry.total) })),
    mrrByInterval: intervalRows.map((entry) => ({
      interval: entry.interval.charAt(0) + entry.interval.slice(1).toLowerCase(),
      total: Number(entry.total),
    })),
  };
}
