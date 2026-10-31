import { InvoiceStatus, PaymentMethod } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { businessToday, isAfterDate, utcDateOnly } from "@/services/dates";
import { nextPaymentNumber } from "@/services/document-number";
import { DomainError } from "@/services/errors";
import { cents, fromCents, moneyString } from "@/services/money";

const PAYABLE = new Set<InvoiceStatus>([InvoiceStatus.CONFIRMED, InvoiceStatus.OVERDUE]);

export type RecordPaymentInput = {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate?: Date;
  referenceNote?: string | null;
  recordedById?: string | null;
};

export async function recordPayment(input: RecordPaymentInput) {
  const amountCents = parseAmount(input.amount);
  const paymentDate = utcDateOnly(input.paymentDate ?? businessToday());
  const note = input.referenceNote?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM invoices WHERE id = CAST(${input.invoiceId} AS uuid) FOR UPDATE
    `;
    if (locked.length === 0) throw new DomainError("Invoice not found.", 404);

    const invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId } });
    if (!invoice) throw new DomainError("Invoice not found.", 404);
    if (!PAYABLE.has(invoice.status)) {
      throw new DomainError(`Payments cannot be recorded on a ${invoice.status.toLowerCase()} invoice.`);
    }

    const grand = cents(Number(invoice.grandTotal));
    const paid = cents(Number(invoice.amountPaid));
    const due = grand - paid;
    if (amountCents > due) {
      throw new DomainError("Amount is greater than the balance due.");
    }

    const nextPaid = paid + amountCents;
    const nextDue = grand - nextPaid;
    const status =
      nextDue === 0
        ? InvoiceStatus.PAID
        : isAfterDate(businessToday(), invoice.dueDate)
          ? InvoiceStatus.OVERDUE
          : InvoiceStatus.CONFIRMED;

    const paymentNumber = await nextPaymentNumber(tx, paymentDate.getUTCFullYear());
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        paymentDate,
        amount: moneyString(fromCents(amountCents)),
        method: input.method,
        referenceNote: note,
        recordedById: input.recordedById ?? null,
      },
    });

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: moneyString(fromCents(nextPaid)),
        balanceDue: moneyString(fromCents(nextDue)),
        status,
      },
    });

    await tx.auditLog.create({
      data: {
        entityName: "invoice",
        entityId: invoice.id,
        actorId: input.recordedById ?? null,
        action: "PAYMENT_RECORDED",
        message: `${payment.paymentNumber} of ${moneyString(fromCents(amountCents))} recorded via ${input.method}.`,
        metadata: {
          paymentId: payment.id,
          status,
          balanceDue: moneyString(fromCents(nextDue)),
        },
      },
    });

    return {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      status: updated.status,
      amountPaid: moneyString(fromCents(nextPaid)),
      balanceDue: moneyString(fromCents(nextDue)),
    };
  });
}

function parseAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError("Amount must be greater than zero.");
  }
  const amountCents = cents(amount);
  if (Math.abs(amountCents / 100 - amount) > 0.001) {
    throw new DomainError("Amount can have at most two decimal places.");
  }
  return amountCents;
}

export const PaymentService = {
  recordPayment,
};
