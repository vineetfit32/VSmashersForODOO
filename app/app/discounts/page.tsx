import { Suspense } from "react";

import { DiscountTable } from "@/components/catalog-tables";
import { ListControls } from "@/components/list-controls";
import { listDiscounts } from "@/lib/catalog";
import { formatInr } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Discounts · Brightloop" };

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const query = await searchParams;
  const result = await listDiscounts(query);
  const rows = result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    value: row.type === "PERCENTAGE" ? `${Number(row.value)}%` : formatInr(row.value),
    usage: `${row.currentUsageCount}${row.maxUsageCount == null ? "" : ` / ${row.maxUsageCount}`}`,
    endDate: row.endDate.toISOString(),
    active: row.isActive ? "Active" : "Inactive",
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Discounts</h1>
      <Suspense>
        <ListControls search={query.q ?? ""} filters={[{ id: "ALL", label: "All discounts" }]} active="ALL" />
        <DiscountTable rows={rows} page={result.page} pageCount={result.pageCount} total={result.total} />
      </Suspense>
    </div>
  );
}
