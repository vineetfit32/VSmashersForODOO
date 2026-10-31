import { Suspense } from "react";

import { ListControls } from "@/components/list-controls";
import { PageHeader } from "@/components/page-header";
import { ProductTable } from "@/components/catalog-tables";
import { listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = { title: "Products · Billpilot" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const query = await searchParams;
  const result = await listProducts(query);
  const rows = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    salesPrice: row.salesPrice.toString(),
    active: row.isActive ? "Active" : "Archived",
    variants: row.variants.map((variant) => `${variant.attributeValue} (${variant.sku ?? "no sku"})`).join(", ") || "—",
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader title="Products" description="Catalog prices and variants, including the Odoo Brand extra." />
      <Suspense>
        <ListControls search={query.q ?? ""} filters={[{ id: "ALL", label: "All products" }]} active="ALL" />
        <ProductTable rows={rows} page={result.page} pageCount={result.pageCount} total={result.total} />
      </Suspense>
    </div>
  );
}
