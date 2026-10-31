import { Suspense } from "react";

import { ListControls } from "@/components/list-controls";
import { PageHeader } from "@/components/page-header";
import { SubscriptionTable } from "@/components/record-tables";
import { listSubscriptions } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = { title: "Subscriptions · Brightloop" };

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
  const query = await searchParams;
  const result = await listSubscriptions(query);
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
      <PageHeader title="Subscriptions" description="Search by number, customer, or plan. Filters use the saved status." />
      <Suspense>
        <ListControls search={query.q ?? ""} filters={FILTERS} active={query.status ?? "ALL"} />
        <SubscriptionTable rows={rows} page={result.page} pageCount={result.pageCount} total={result.total} />
      </Suspense>
    </div>
  );
}
