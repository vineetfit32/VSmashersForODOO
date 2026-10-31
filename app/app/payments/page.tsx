import { Suspense } from "react";

import { ListControls } from "@/components/list-controls";
import { PaymentTable } from "@/components/record-tables";
import { listPayments } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payments · Brightloop" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const query = await searchParams;
  const result = await listPayments(query);
  const rows = result.rows.map((row) => ({
    id: row.id,
    paymentNumber: row.paymentNumber,
    invoiceId: row.invoice.id,
    invoiceNumber: row.invoice.invoiceNumber,
    customer: row.invoice.customer.companyName,
    paymentDate: row.paymentDate.toISOString(),
    method: row.method,
    amount: row.amount.toString(),
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Payments</h1>
      <Suspense>
        <ListControls search={query.q ?? ""} filters={[{ id: "ALL", label: "All payments" }]} active="ALL" />
        <PaymentTable rows={rows} page={result.page} pageCount={result.pageCount} total={result.total} />
      </Suspense>
    </div>
  );
}
