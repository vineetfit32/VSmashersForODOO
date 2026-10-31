"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatInr, titleStatus } from "@/lib/format";

type SubscriptionRow = {
  id: string;
  subscriptionNumber: string;
  status: string;
  customer: string;
  plan: string;
  nextBillingDate: string | null;
  grandTotal: string;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  customer: string;
  subscriptionNumber: string | null;
  issueDate: string;
  dueDate: string;
  grandTotal: string;
  balanceDue: string;
  href: string;
};

type PaymentRow = {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customer: string;
  paymentDate: string;
  method: string;
  amount: string;
};

export function SubscriptionTable({
  rows,
  page,
  pageCount,
  total,
}: {
  rows: SubscriptionRow[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const columns: ColumnDef<SubscriptionRow>[] = [
    {
      accessorKey: "subscriptionNumber",
      header: "Number",
      cell: ({ row }) => (
        <Link className="font-medium text-[#714B67]" href={`/app/subscriptions/${row.original.id}`}>
          {row.original.subscriptionNumber}
        </Link>
      ),
    },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "plan", header: "Plan" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "nextBillingDate", header: "Next bill", cell: ({ row }) => formatDate(row.original.nextBillingDate) },
    { accessorKey: "grandTotal", header: "Total", cell: ({ row }) => formatInr(row.original.grandTotal) },
  ];
  return <DataTable columns={columns} data={rows} page={page} pageCount={pageCount} total={total} />;
}

export function InvoiceTable({
  rows,
  page,
  pageCount,
  total,
}: {
  rows: InvoiceRow[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const columns: ColumnDef<InvoiceRow>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Number",
      cell: ({ row }) => (
        <Link className="font-medium text-[#714B67]" href={row.original.href}>
          {row.original.invoiceNumber}
        </Link>
      ),
    },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "subscriptionNumber", header: "Subscription", cell: ({ row }) => row.original.subscriptionNumber ?? "—" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "dueDate", header: "Due", cell: ({ row }) => formatDate(row.original.dueDate) },
    { accessorKey: "grandTotal", header: "Total", cell: ({ row }) => formatInr(row.original.grandTotal) },
    { accessorKey: "balanceDue", header: "Balance", cell: ({ row }) => formatInr(row.original.balanceDue) },
  ];
  return <DataTable columns={columns} data={rows} page={page} pageCount={pageCount} total={total} />;
}

export function PaymentTable({
  rows,
  page,
  pageCount,
  total,
}: {
  rows: PaymentRow[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const columns: ColumnDef<PaymentRow>[] = [
    { accessorKey: "paymentNumber", header: "Number" },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }) => (
        <Link className="font-medium text-[#714B67]" href={`/app/invoices/${row.original.invoiceId}`}>
          {row.original.invoiceNumber}
        </Link>
      ),
    },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "paymentDate", header: "Date", cell: ({ row }) => formatDate(row.original.paymentDate) },
    { accessorKey: "method", header: "Method", cell: ({ row }) => titleStatus(row.original.method) },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatInr(row.original.amount) },
  ];
  return <DataTable columns={columns} data={rows} page={page} pageCount={pageCount} total={total} />;
}
