import Link from "next/link";
import { notFound } from "next/navigation";

import { Chatter } from "@/components/chatter";
import { PageHeader } from "@/components/page-header";
import { InvoiceActions } from "@/components/invoice-actions";
import { StatusPipeline, invoiceStages } from "@/components/status-pipeline";
import { loadChatter } from "@/lib/chatter";
import { formatDate, formatInr, titleStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InvoiceFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      subscription: true,
      lines: true,
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!invoice) notFound();
  const chatter = await loadChatter("invoice", invoice.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader title={invoice.invoiceNumber} description={invoice.customer.companyName} />
      <div className="rounded-xl border border-[#e6e1ea] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center">
          <StatusPipeline stages={invoiceStages(invoice.status)} current={invoice.status} />
          <InvoiceActions id={invoice.id} status={invoice.status} balanceDue={invoice.balanceDue.toString()} />
        </div>
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Number" value={invoice.invoiceNumber} />
          <Field label="Customer" value={invoice.customer.companyName} />
          <Field
            label="Subscription"
            value={
              invoice.subscription ? (
                <Link className="text-[#714B67]" href={`/app/subscriptions/${invoice.subscription.id}`}>
                  {invoice.subscription.subscriptionNumber}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Field label="Issued" value={formatDate(invoice.issueDate)} />
          <Field label="Due" value={formatDate(invoice.dueDate)} />
          <Field label="Period" value={`${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`} />
          <Field label="Balance" value={formatInr(invoice.balanceDue)} />
          <Field label="Total" value={formatInr(invoice.grandTotal)} />
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border bg-white">
        <header className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Lines</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-[#f8f9fa] text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">Discount</th>
                <th className="px-3 py-2 font-medium">Tax</th>
                <th className="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2">{line.quantity}</td>
                  <td className="px-3 py-2">{formatInr(line.unitPrice)}</td>
                  <td className="px-3 py-2">{formatInr(line.discountAmount)}</td>
                  <td className="px-3 py-2">{formatInr(line.taxAmount)}</td>
                  <td className="px-3 py-2">{formatInr(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <header className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Payments</h2>
        </header>
        <ul className="divide-y text-sm">
          {invoice.payments.length === 0 ? (
            <li className="px-4 py-4 text-muted-foreground">No payments recorded.</li>
          ) : (
            invoice.payments.map((payment) => (
              <li key={payment.id} className="flex justify-between px-4 py-2">
                <span>
                  {payment.paymentNumber} · {titleStatus(payment.method)} · {formatDate(payment.paymentDate)}
                </span>
                <span className="font-medium">{formatInr(payment.amount)}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <Chatter entries={chatter} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  );
}
