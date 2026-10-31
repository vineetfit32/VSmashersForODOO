import Link from "next/link";
import { notFound } from "next/navigation";

import { Chatter } from "@/components/chatter";
import { StatusPipeline, subscriptionStages } from "@/components/status-pipeline";
import { SubscriptionActions } from "@/components/subscription-actions";
import { loadChatter } from "@/lib/chatter";
import { formatDate, formatInr } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SubscriptionFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      customer: true,
      plan: true,
      lines: { include: { product: true, variant: true } },
      invoices: { orderBy: { invoiceNumber: "desc" }, take: 8 },
    },
  });
  if (!subscription) notFound();
  const chatter = await loadChatter("subscription", subscription.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="rounded-lg border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center">
          <StatusPipeline stages={subscriptionStages(subscription.status)} current={subscription.status} />
          <SubscriptionActions id={subscription.id} status={subscription.status} />
        </div>
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Number" value={subscription.subscriptionNumber} />
          <Field label="Customer" value={subscription.customer.companyName} />
          <Field label="Plan" value={`${subscription.plan.name} · ${subscription.plan.interval.toLowerCase()}`} />
          <Field label="Start" value={formatDate(subscription.startDate)} />
          <Field label="Next bill" value={formatDate(subscription.nextBillingDate)} />
          <Field label="Expiry" value={formatDate(subscription.expiryDate)} />
          <Field label="Quote valid until" value={formatDate(subscription.quotationValidUntil)} />
          <Field label="Total" value={formatInr(subscription.grandTotal)} />
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border bg-white">
        <header className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Lines</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#f8f9fa] text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">Discount</th>
                <th className="px-3 py-2 font-medium">Tax</th>
                <th className="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {subscription.lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="px-3 py-2">
                    {line.product.name}
                    {line.variant ? ` · ${line.variant.attributeValue}` : ""}
                  </td>
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
        <dl className="grid gap-2 border-t px-4 py-3 text-sm sm:grid-cols-4">
          <Total label="Subtotal" value={formatInr(subscription.subtotal)} />
          <Total label="Discount" value={formatInr(subscription.discountTotal)} />
          <Total label="Tax" value={formatInr(subscription.taxTotal)} />
          <Total label="Grand total" value={formatInr(subscription.grandTotal)} />
        </dl>
      </section>

      <section className="rounded-lg border bg-white">
        <header className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Invoices</h2>
        </header>
        <ul className="divide-y text-sm">
          {subscription.invoices.length === 0 ? (
            <li className="px-4 py-4 text-muted-foreground">No invoices yet.</li>
          ) : (
            subscription.invoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center justify-between px-4 py-2">
                <Link className="font-medium text-[#714B67]" href={`/app/invoices/${invoice.id}`}>
                  {invoice.invoiceNumber}
                </Link>
                <span>
                  {invoice.status} · {formatInr(invoice.balanceDue)} due
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <Chatter entries={chatter} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
