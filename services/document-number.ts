import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

function nextFrom(latest: string | undefined, prefix: string) {
  const current = latest?.startsWith(prefix) ? Number(latest.slice(prefix.length)) : 0;
  const sequence = Number.isFinite(current) ? current + 1 : 1;
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

export async function nextInvoiceNumber(tx: Tx, year: number) {
  const prefix = `INV-${year}-`;
  const rows = await tx.$queryRaw<Array<{ invoice_number: string }>>`
    SELECT invoice_number
    FROM invoices
    WHERE invoice_number LIKE ${`${prefix}%`}
    ORDER BY invoice_number DESC
    LIMIT 1
    FOR UPDATE
  `;
  return nextFrom(rows[0]?.invoice_number, prefix);
}

export async function nextPaymentNumber(tx: Tx, year: number) {
  const prefix = `PAY-${year}-`;
  const rows = await tx.$queryRaw<Array<{ payment_number: string }>>`
    SELECT payment_number
    FROM payments
    WHERE payment_number LIKE ${`${prefix}%`}
    ORDER BY payment_number DESC
    LIMIT 1
    FOR UPDATE
  `;
  return nextFrom(rows[0]?.payment_number, prefix);
}

export function isUniqueConflict(error: unknown, field: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  const label = Array.isArray(target) ? target.join(",") : String(target ?? "");
  return label.includes(field);
}
