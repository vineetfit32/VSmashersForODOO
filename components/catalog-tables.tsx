"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { formatDate, formatInr } from "@/lib/format";

type ProductRow = {
  id: string;
  name: string;
  type: string;
  salesPrice: string;
  active: string;
  variants: string;
};

type DiscountRow = {
  id: string;
  code: string;
  name: string;
  value: string;
  usage: string;
  endDate: string;
  active: string;
};

export function ProductTable({
  rows,
  page,
  pageCount,
  total,
}: {
  rows: ProductRow[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const columns: ColumnDef<ProductRow>[] = [
    { accessorKey: "name", header: "Product" },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "variants", header: "Variants" },
    { accessorKey: "salesPrice", header: "Sales price", cell: ({ row }) => formatInr(row.original.salesPrice) },
    { accessorKey: "active", header: "Status" },
  ];
  return <DataTable columns={columns} data={rows} page={page} pageCount={pageCount} total={total} />;
}

export function DiscountTable({
  rows,
  page,
  pageCount,
  total,
}: {
  rows: DiscountRow[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const columns: ColumnDef<DiscountRow>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "value", header: "Value" },
    { accessorKey: "usage", header: "Usage" },
    { accessorKey: "endDate", header: "Ends", cell: ({ row }) => formatDate(row.original.endDate) },
    { accessorKey: "active", header: "Status" },
  ];
  return <DataTable columns={columns} data={rows} page={page} pageCount={pageCount} total={total} />;
}
