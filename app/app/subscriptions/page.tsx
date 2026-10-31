import { Suspense } from "react";

import { ListControls } from "@/components/list-controls";
import { PageHeader } from "@/components/page-header";
import { CreateSubscriptionForm } from "@/components/setup-forms";
import { prisma } from "@/lib/prisma";
import { SubscriptionTable } from "@/components/record-tables";
import { listSubscriptions } from "@/lib/catalog";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Subscriptions · Billpilot" };

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "QUOTATION", label: "Quotation" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "ACTIVE", label: "Active subscriptions" },
  { id: "PAUSED", label: "Paused" },
  { id: "CLOSED", label: "Closed" },
];

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const query = await searchParams;
  const [result, customers, plans, products] = await Promise.all([
    listSubscriptions(query, { organizationId: session.organizationId }),
    prisma.customer.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true },
    }),
    prisma.subscriptionPlan.findMany({
      where: { organizationId: session.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { organizationId: session.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const rows = result.rows.map((row) => ({
    id: row.id,
    subscriptionNumber: row.subscriptionNumber,
    status: row.status,
    customer: row.customer.companyName,
    plan: `${row.plan.name} · ${row.plan.interval.toLowerCase()}`,
    nextBillingDate: row.nextBillingDate?.toISOString() ?? null,
    grandTotal: row.grandTotal.toString(),
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader title="Subscriptions" description="Drafts stay in your workspace until you send a quotation." />
      <CreateSubscriptionForm customers={customers} plans={plans} products={products} />
      <Suspense>
        <ListControls search={query.q ?? ""} filters={FILTERS} active={query.status ?? "ALL"} />
        <SubscriptionTable rows={rows} page={result.page} pageCount={result.pageCount} total={result.total} />
      </Suspense>
    </div>
  );
}
