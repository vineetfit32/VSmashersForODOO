import { getSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildInvoicePdf } from "@/services/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await context.params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, customer: { organizationId: session.organizationId } },
    include: { customer: true, lines: true },
  });
  if (!invoice) return new Response("Not found", { status: 404 });

  const pdf = buildInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    customer: invoice.customer.companyName,
    email: invoice.customer.email,
    issueDate: formatDate(invoice.issueDate),
    dueDate: formatDate(invoice.dueDate),
    lines: invoice.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      total: Number(line.lineTotal).toFixed(2),
    })),
    subtotal: Number(invoice.subtotal).toFixed(2),
    discount: Number(invoice.discountTotal).toFixed(2),
    tax: Number(invoice.taxTotal).toFixed(2),
    grandTotal: Number(invoice.grandTotal).toFixed(2),
    amountPaid: Number(invoice.amountPaid).toFixed(2),
    balanceDue: Number(invoice.balanceDue).toFixed(2),
  });

  return new Response(new Blob([pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
