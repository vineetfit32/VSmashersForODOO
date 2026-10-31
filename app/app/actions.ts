"use server";

import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { generateRecurringInvoices } from "@/services/billing-engine";
import { DomainError } from "@/services/errors";
import { confirmInvoice as confirmInvoiceRecord, recordPayment } from "@/services/payment-service";
import { transitionSubscription } from "@/services/subscription-fsm";
import type { SubscriptionStatus } from "@prisma/client";

async function guard() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    throw new Error("Forbidden");
  }
  return session;
}

function failure(error: unknown) {
  if (error instanceof DomainError) return { error: error.message };
  throw error;
}

async function moveSubscription(id: string, to: SubscriptionStatus) {
  const session = await guard();
  try {
    await transitionSubscription({ subscriptionId: id, to, actorId: session.id });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/app/subscriptions/${id}`);
  revalidatePath("/app/subscriptions");
  return { ok: true };
}

export async function sendQuotation(id: string) {
  return moveSubscription(id, "QUOTATION");
}

export async function confirmSubscription(id: string) {
  return moveSubscription(id, "CONFIRMED");
}

export async function activateSubscription(id: string) {
  return moveSubscription(id, "ACTIVE");
}

export async function pauseSubscription(id: string) {
  return moveSubscription(id, "PAUSED");
}

export async function resumeSubscription(id: string) {
  return moveSubscription(id, "ACTIVE");
}

export async function closeSubscription(id: string) {
  return moveSubscription(id, "CLOSED");
}

export async function createSubscriptionInvoice(id: string) {
  const session = await guard();
  try {
    const result = await generateRecurringInvoices({
      subscriptionIds: [id],
      actorId: session.id,
      force: true,
    });
    const created = result.created[0];
    if (!created) return { error: result.skipped[0]?.reason ?? "No invoice was created." };
    revalidatePath(`/app/subscriptions/${id}`);
    revalidatePath("/app/invoices");
    redirect(`/app/invoices/${created.invoiceId}`);
  } catch (error) {
    return failure(error);
  }
}

export async function confirmInvoice(id: string) {
  const session = await guard();
  try {
    await confirmInvoiceRecord(id, session.id);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/app/invoices/${id}`);
  revalidatePath("/app/invoices");
  return { ok: true };
}

export async function registerInvoicePayment(id: string, formData: FormData) {
  const session = await guard();
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "");
  const note = String(formData.get("referenceNote") ?? "");
  const paymentDate = String(formData.get("paymentDate") ?? "");
  if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
    return { error: "Choose a payment method." };
  }

  try {
    await recordPayment({
      invoiceId: id,
      amount,
      method: method as PaymentMethod,
      referenceNote: note,
      recordedById: session.id,
      paymentDate: paymentDate ? new Date(`${paymentDate}T00:00:00.000Z`) : undefined,
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/app/invoices/${id}`);
  revalidatePath("/app/invoices");
  revalidatePath("/app/payments");
  revalidatePath("/app/finance");
  return { ok: true };
}
