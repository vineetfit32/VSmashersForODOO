import type { ReactNode } from "react";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { homeFor } from "@/lib/auth/access";
import { formatInr } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getFinanceSummary } from "@/services/finance";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) return <SignedOutHome />;

  const workspace = homeFor(session.role);

  if (session.role === "CUSTOMER" && session.customerId) {
    const [subscriptions, openInvoices, balance] = await Promise.all([
      prisma.subscription.count({ where: { customerId: session.customerId } }),
      prisma.invoice.count({
        where: { customerId: session.customerId, status: { in: ["CONFIRMED", "OVERDUE"] } },
      }),
      prisma.invoice.aggregate({
        where: { customerId: session.customerId, status: { in: ["CONFIRMED", "OVERDUE"] } },
        _sum: { balanceDue: true },
      }),
    ]);

    return (
      <HomeFrame
        title={`Hello, ${session.firstName}`}
        description="These figures are only your company’s subscriptions and unpaid invoices."
        actionHref={workspace}
        actionLabel="Open your portal"
      >
        <MetricCard label="Subscriptions" value={String(subscriptions)} href="/portal/subscriptions" />
        <MetricCard label="Open invoices" value={String(openInvoices)} href="/portal/invoices?status=OPEN" />
        <MetricCard
          label="Balance due"
          value={formatInr(balance._sum.balanceDue)}
          tone={Number(balance._sum.balanceDue ?? 0) > 0 ? "warning" : "default"}
        />
      </HomeFrame>
    );
  }

  const summary = await getFinanceSummary(session.organizationId);

  return (
    <HomeFrame
      title={`${session.firstName}, your workspace`}
      description="Live totals for your company only. Other businesses that sign up get a separate workspace."
      actionHref={workspace}
      actionLabel="Open dashboard"
    >
      <MetricCard label="Active subscriptions" value={String(summary.activeSubscriptions)} href="/app/subscriptions?status=ACTIVE" />
      <MetricCard label="Monthly cash in" value={formatInr(summary.monthlyCash)} href="/app/finance" />
      <MetricCard label="Still owed" value={formatInr(summary.accountsReceivable + summary.overdueAmount)} href="/app/invoices?status=OPEN" />
      <MetricCard
        label="Overdue"
        value={formatInr(summary.overdueAmount)}
        href="/app/invoices?status=OVERDUE"
        tone={summary.overdueAmount > 0 ? "warning" : "default"}
      />
      <MetricCard label="MRR" value={formatInr(summary.mrr)} href="/app/finance" />
      <MetricCard label="ARR" value={formatInr(summary.arr)} href="/app/finance" />
    </HomeFrame>
  );
}

function SignedOutHome() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6">
      <p className="text-sm font-medium text-muted-foreground">Billpilot</p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Subscription billing for your company</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Open a workspace for your business. You add your own customers, products, and plans. A customer login sees only that company’s invoices.
      </p>
      <div className="mt-2 flex gap-3">
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Create workspace</Link>
        </Button>
      </div>
    </main>
  );
}

function HomeFrame({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Billpilot</p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </main>
  );
}
