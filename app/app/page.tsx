import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Workspace · Brightloop" };

export default async function WorkspaceHome() {
  const [activeSubscriptions, overdueInvoices, openQuotes] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.subscription.count({ where: { status: "QUOTATION" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Workspace</h1>
        <p className="text-sm text-muted-foreground">Subscriptions, invoices, and collections for Brightloop.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/app/subscriptions?status=ACTIVE" className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Active subscriptions</p>
          <p className="mt-1 text-2xl font-semibold">{activeSubscriptions}</p>
        </Link>
        <Link href="/app/subscriptions?status=QUOTATION" className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Open quotations</p>
          <p className="mt-1 text-2xl font-semibold">{openQuotes}</p>
        </Link>
        <Link href="/app/invoices?status=OVERDUE" className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Overdue invoices</p>
          <p className="mt-1 text-2xl font-semibold">{overdueInvoices}</p>
        </Link>
      </div>
    </div>
  );
}
