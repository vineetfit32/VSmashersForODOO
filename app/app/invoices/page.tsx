import { Suspense } from "react";

import { InvoiceTable } from "@/components/record-tables";
import { ListControls } from "@/components/list-controls";
import { PageHeader } from "@/components/page-header";
import { listInvoices } from "@/lib/catalog";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Invoices · Billpilot" };

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "PAID", label: "Paid" },
  { id: "OVERDUE", label: "Overdue invoices" },
  { id: "CANCELLED", label: "Cancelled" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const query = await searchParams;
  const result = await listInvoices(query);
  const rows = result.rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    customer: row.customer.companyName,
    subscriptionNumber: row.subscription?.subscriptionNumber ?? null,
    issueDate: row.issueDate.toISOString(),
    dueDate: row.dueDate.toISOString(),
    grandTotal: row.grandTotal.toString(),
    balanceDue: row.balanceDue.toString(),
    href: `/app/invoices/${row.id}`,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader title="Invoices" description="Overdue includes confirmed invoices past their due date with a balance still open." />
      <Suspense>
        <ListControls search={query.q ?? ""} filters={FILTERS} active={query.status ?? "ALL"} />
        <InvoiceTable rows={rows} page={result.page} pageCount={result.pageCount} total={result.total} />
      </Suspense>
    </div>
  );
}
