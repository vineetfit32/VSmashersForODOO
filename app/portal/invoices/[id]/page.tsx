import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StatusPipeline, invoiceStages } from "@/components/status-pipeline";
import { homeFor } from "@/lib/auth/access";
import { formatDate, formatInr } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.customerId) redirect(homeFor(session?.role ?? "CUSTOMER"));
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, customerId: session.customerId },
    include: { lines: true, payments: { orderBy: { paymentDate: "desc" } } },
  });
  if (!invoice) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="rounded-lg border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center">
          <StatusPipeline stages={invoiceStages(invoice.status)} current={invoice.status} />
          <Button asChild size="sm">
            <a href={`/api/portal/invoices/${invoice.id}/pdf`}>Download PDF</a>
          </Button>
        </div>
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Invoice</p>
            <p className="font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due</p>
            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">{formatInr(invoice.grandTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-medium">{formatInr(invoice.balanceDue)}</p>
          </div>
        </div>
      </div>
      <section className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[#f8f9fa] text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="px-3 py-2">{line.description}</td>
                <td className="px-3 py-2">{line.quantity}</td>
                <td className="px-3 py-2">{formatInr(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-sm">
        <Link className="text-[#714B67]" href="/portal/invoices">
          Back to invoices
        </Link>
      </p>
    </div>
  );
}
