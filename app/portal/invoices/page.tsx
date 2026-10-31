import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { InvoiceTable } from "@/components/record-tables";
import { ListControls } from "@/components/list-controls";
import { homeFor } from "@/lib/auth/access";
import { listInvoices } from "@/lib/catalog";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your invoices · Billpilot" };

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "CONFIRMED", label: "Open" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "PAID", label: "Paid" },
];

export default async function PortalInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session?.customerId) redirect(homeFor(session?.role ?? "CUSTOMER"));
  const query = await searchParams;
  const result = await listInvoices(query, {
    organizationId: session.organizationId,
    customerId: session.customerId,
  });
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
    href: `/portal/invoices/${row.id}`,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader title="Your invoices" description="Only invoices billed to your company are listed here." />
      <Suspense>
        <ListControls search={query.q ?? ""} filters={FILTERS} active={query.status ?? "ALL"} />
        <InvoiceTable rows={rows} page={result.page} pageCount={result.pageCount} total={result.total} />
      </Suspense>
    </div>
  );
}
