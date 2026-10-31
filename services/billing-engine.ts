import { createHash } from "node:crypto";

import { Prisma, type BillingInterval, type DiscountRule, type DiscountRuleProduct } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  addUtcDays,
  addUtcMonths,
  businessToday,
  isoDate,
  isAfterDate,
  utcDateOnly,
} from "@/services/dates";
import { validateAndApplyDiscount, type DiscountRuleInput } from "@/services/discount-engine";
import { isUniqueConflict, nextInvoiceNumber } from "@/services/document-number";
import { DomainError } from "@/services/errors";
import { cents, fromCents, moneyString } from "@/services/money";
import { assertTransition } from "@/services/subscription-fsm";

export type BillingRunResult = {
  scanned: number;
  created: Array<{
    invoiceId: string;
    invoiceNumber: string;
    subscriptionId: string;
    subscriptionNumber: string;
    grandTotal: string;
  }>;
  skipped: Array<{ subscriptionId: string; reason: string }>;
  closedSubscriptionIds: string[];
};

type GenerateInput = {
  asOf?: Date;
  limit?: number;
  actorId?: string | null;
  subscriptionIds?: string[];
  organizationId: string;
  /** Invoice the next period even when next_billing_date is still in the future. */
  force?: boolean;
};

type LoadedSubscription = Prisma.SubscriptionGetPayload<{
  include: {
    customer: true;
    plan: true;
    lines: {
      include: {
        product: true;
        variant: true;
        taxRule: true;
        discountRule: { include: { products: true } };
      };
    };
  };
}>;

export function billingIdempotencyKey(subscriptionId: string, periodStart: string, periodEnd: string) {
  return createHash("sha256").update(`${subscriptionId}:${periodStart}:${periodEnd}`).digest("hex");
}

export function computeNextInterval(start: Date, interval: BillingInterval, intervalCount: number) {
  const count = Math.max(1, intervalCount);
  const date = utcDateOnly(start);
  if (interval === "DAILY") return addUtcDays(date, count);
  if (interval === "WEEKLY") return addUtcDays(date, count * 7);
  if (interval === "YEARLY") return addUtcMonths(date, count * 12);
  return addUtcMonths(date, count);
}

export async function generateRecurringInvoices(input: GenerateInput): Promise<BillingRunResult> {
  const asOf = utcDateOnly(input.asOf ?? businessToday());
  const limit = input.limit ?? 100;
  const ids = await findDueSubscriptionIds(asOf, limit, input.subscriptionIds, Boolean(input.force), input.organizationId);
  const result: BillingRunResult = {
    scanned: ids.length,
    created: [],
    skipped: [],
    closedSubscriptionIds: [],
  };

  for (const subscriptionId of ids) {
    const outcome = await billOne(subscriptionId, asOf, input.actorId ?? null, Boolean(input.force));
    if (outcome.created) result.created.push(outcome.created);
    if (outcome.skipped) result.skipped.push(outcome.skipped);
    if (outcome.closedSubscriptionId) result.closedSubscriptionIds.push(outcome.closedSubscriptionId);
  }

  return result;
}

async function findDueSubscriptionIds(
  asOf: Date,
  limit: number,
  only: string[] | undefined,
  force: boolean,
  organizationId: string,
) {
  const asOfIso = isoDate(asOf);
  if (only && only.length === 0) return [];

  const idFilter =
    only && only.length > 0
      ? Prisma.sql`AND id IN (${Prisma.join(only.map((id) => Prisma.sql`CAST(${id} AS uuid)`))})`
      : Prisma.empty;
  const dueFilter = force
    ? Prisma.sql`AND next_billing_date IS NOT NULL`
    : Prisma.sql`AND next_billing_date <= CAST(${asOfIso} AS date)`;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM subscriptions
    WHERE status = 'ACTIVE'
      AND customer_id IN (SELECT id FROM customers WHERE organization_id = CAST(${organizationId} AS uuid))
      ${dueFilter}
      AND (expiry_date IS NULL OR expiry_date >= CAST(${asOfIso} AS date))
      ${idFilter}
    ORDER BY next_billing_date ASC
    LIMIT ${limit}
  `;
  return rows.map((row) => row.id);
}

type BillOutcome = {
  created?: BillingRunResult["created"][number];
  skipped?: BillingRunResult["skipped"][number];
  closedSubscriptionId?: string;
};

async function billOne(
  subscriptionId: string,
  asOf: Date,
  actorId: string | null,
  force: boolean,
): Promise<BillOutcome> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction((tx) => billLocked(tx, subscriptionId, asOf, actorId, force), {
        maxWait: 5_000,
        timeout: 20_000,
      });
    } catch (error) {
      if (isUniqueConflict(error, "idempotency")) {
        return { skipped: { subscriptionId, reason: "Already invoiced for this period" } };
      }
      if (isUniqueConflict(error, "invoice_number") && attempt < 2) continue;
      throw error;
    }
  }
  throw new DomainError("Could not allocate an invoice number.");
}

async function billLocked(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
  asOf: Date,
  actorId: string | null,
  force: boolean,
): Promise<BillOutcome> {
  const asOfIso = isoDate(asOf);
  const dueFilter = force
    ? Prisma.sql`AND next_billing_date IS NOT NULL`
    : Prisma.sql`AND next_billing_date <= CAST(${asOfIso} AS date)`;
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM subscriptions
    WHERE id = CAST(${subscriptionId} AS uuid)
      AND status = 'ACTIVE'
      ${dueFilter}
      AND (expiry_date IS NULL OR expiry_date >= CAST(${asOfIso} AS date))
    FOR UPDATE SKIP LOCKED
  `;
  if (locked.length === 0) {
    return { skipped: { subscriptionId, reason: "Not due or locked by another billing run" } };
  }

  const subscription = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      customer: true,
      plan: true,
      lines: {
        include: {
          product: true,
          variant: true,
          taxRule: true,
          discountRule: { include: { products: true } },
        },
      },
    },
  });
  if (!subscription?.nextBillingDate) {
    return { skipped: { subscriptionId, reason: "Subscription is missing a billing date" } };
  }
  if (subscription.lines.length === 0) {
    return { skipped: { subscriptionId, reason: "Subscription has no lines" } };
  }

  const periodStart = utcDateOnly(subscription.nextBillingDate);
  const nextBillingDate = computeNextInterval(
    periodStart,
    subscription.plan.interval,
    subscription.plan.intervalCount,
  );
  const periodEnd = addUtcDays(nextBillingDate, -1);
  const key = billingIdempotencyKey(subscription.id, isoDate(periodStart), isoDate(periodEnd));
  const existing = await tx.invoice.findUnique({ where: { idempotencyKey: key }, select: { id: true } });
  if (existing) {
    return { skipped: { subscriptionId, reason: "Already invoiced for this period" } };
  }

  const priced = await priceLines(tx, subscription, periodStart);
  const invoiceNumber = await nextInvoiceNumber(tx, asOf.getUTCFullYear());
  const dueDate = addUtcDays(asOf, subscription.customer.paymentTermsDays);
  const invoice = await tx.invoice.create({
    data: {
      invoiceNumber,
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      status: "CONFIRMED",
      issueDate: asOf,
      dueDate,
      periodStart,
      periodEnd,
      subtotal: moneyString(priced.subtotal),
      taxTotal: moneyString(priced.taxTotal),
      discountTotal: moneyString(priced.discountTotal),
      grandTotal: moneyString(priced.grandTotal),
      amountPaid: "0.00",
      balanceDue: moneyString(priced.grandTotal),
      idempotencyKey: key,
      lines: {
        create: priced.lines.map((line) => ({
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: moneyString(line.unitPrice),
          taxAmount: moneyString(line.taxAmount),
          discountAmount: moneyString(line.discountAmount),
          lineTotal: moneyString(line.lineTotal),
        })),
      },
    },
  });

  const shouldClose =
    subscription.plan.autoClose &&
    subscription.expiryDate != null &&
    isAfterDate(nextBillingDate, subscription.expiryDate);
  if (shouldClose) assertTransition(subscription.status, "CLOSED");

  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      nextBillingDate,
      status: shouldClose ? "CLOSED" : subscription.status,
    },
  });

  await tx.auditLog.create({
    data: {
      entityName: "invoice",
      entityId: invoice.id,
      actorId,
      action: "INVOICE_CREATED",
      message: `${invoice.invoiceNumber} created for ${subscription.subscriptionNumber} (${isoDate(periodStart)} to ${isoDate(periodEnd)}).`,
      metadata: { idempotencyKey: key, subscriptionId: subscription.id },
    },
  });

  if (shouldClose) {
    await tx.auditLog.create({
      data: {
        entityName: "subscription",
        entityId: subscription.id,
        actorId,
        action: "STATUS_CHANGE",
        message: `${subscription.subscriptionNumber} auto-closed because the next billing date is after expiry.`,
        metadata: { from: "ACTIVE", to: "CLOSED" },
      },
    });
  }

  return {
    created: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subscriptionId: subscription.id,
      subscriptionNumber: subscription.subscriptionNumber,
      grandTotal: moneyString(priced.grandTotal),
    },
    closedSubscriptionId: shouldClose ? subscription.id : undefined,
  };
}

async function priceLines(tx: Prisma.TransactionClient, subscription: LoadedSubscription, periodStart: Date) {
  const grosses = subscription.lines.map((line) => ({
    line,
    gross: fromCents(cents(Number(line.unitPrice)) * line.quantity),
  }));
  const subtotal = fromCents(grosses.reduce((sum, entry) => sum + cents(entry.gross), 0));
  const totalQuantity = subscription.lines.reduce((sum, line) => sum + line.quantity, 0);
  const claimed = new Set<string>();

  let wholeCents = 0;
  for (const rule of uniqueWholeRules(subscription)) {
    const decision = validateAndApplyDiscount(toDiscountInput(rule), subtotal, totalQuantity, periodStart);
    if (!decision.eligible) continue;
    if (!(await claimDiscount(tx, rule.id, claimed))) continue;
    wholeCents += cents(decision.discountAmount);
  }
  wholeCents = Math.min(wholeCents, cents(subtotal));

  const allocations = new Map<string, number>();
  let remainingWhole = wholeCents;
  for (const entry of grosses) {
    const take = Math.min(cents(entry.gross), remainingWhole);
    allocations.set(entry.line.id, take);
    remainingWhole -= take;
  }

  const pricedLines = [];
  for (const entry of grosses) {
    const rule = entry.line.discountRule;
    let specificCents = 0;
    if (rule && rule.appliesTo === "SPECIFIC_PRODUCTS") {
      const decision = validateAndApplyDiscount(
        toDiscountInput(rule),
        entry.gross,
        entry.line.quantity,
        periodStart,
        entry.line.productId,
      );
      if (decision.eligible && (await claimDiscount(tx, rule.id, claimed))) {
        specificCents = cents(decision.discountAmount);
      }
    }

    const grossCents = cents(entry.gross);
    const discountCents = Math.min(grossCents, (allocations.get(entry.line.id) ?? 0) + specificCents);
    const taxableCents = grossCents - discountCents;
    const rate = entry.line.taxRule?.isActive ? Number(entry.line.taxRule.ratePercent) : 0;
    const taxCents = Math.round((taxableCents * rate) / 100);
    const variant = entry.line.variant?.attributeValue;
    const description = variant ? `${entry.line.product.name} — ${variant}` : entry.line.product.name;

    pricedLines.push({
      productId: entry.line.productId,
      description: description.slice(0, 255),
      quantity: entry.line.quantity,
      unitPrice: Number(entry.line.unitPrice),
      discountAmount: fromCents(discountCents),
      taxAmount: fromCents(taxCents),
      lineTotal: fromCents(taxableCents + taxCents),
    });
  }

  const discountTotal = fromCents(pricedLines.reduce((sum, line) => sum + cents(line.discountAmount), 0));
  const taxTotal = fromCents(pricedLines.reduce((sum, line) => sum + cents(line.taxAmount), 0));
  const grandTotal = fromCents(pricedLines.reduce((sum, line) => sum + cents(line.lineTotal), 0));

  return { lines: pricedLines, subtotal, discountTotal, taxTotal, grandTotal };
}

function uniqueWholeRules(subscription: LoadedSubscription) {
  const rules = new Map<string, NonNullable<LoadedSubscription["lines"][number]["discountRule"]>>();
  for (const line of subscription.lines) {
    if (line.discountRule?.appliesTo === "WHOLE_SUBSCRIPTION") {
      rules.set(line.discountRule.id, line.discountRule);
    }
  }
  return [...rules.values()];
}

function toDiscountInput(
  rule: DiscountRule & { products: DiscountRuleProduct[] },
): DiscountRuleInput {
  return {
    id: rule.id,
    code: rule.code,
    type: rule.type,
    value: Number(rule.value),
    minPurchaseAmount: rule.minPurchaseAmount == null ? null : Number(rule.minPurchaseAmount),
    minQuantity: rule.minQuantity,
    startDate: rule.startDate,
    endDate: rule.endDate,
    maxUsageCount: rule.maxUsageCount,
    currentUsageCount: rule.currentUsageCount,
    appliesTo: rule.appliesTo,
    targetProductIds: rule.products.map((product) => product.productId),
    isActive: rule.isActive,
  };
}

async function claimDiscount(tx: Prisma.TransactionClient, ruleId: string, claimed: Set<string>) {
  if (claimed.has(ruleId)) return true;
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE discount_rules
    SET current_usage_count = current_usage_count + 1
    WHERE id = CAST(${ruleId} AS uuid)
      AND is_active = true
      AND (max_usage_count IS NULL OR current_usage_count < max_usage_count)
    RETURNING id
  `;
  if (rows.length === 0) return false;
  claimed.add(ruleId);
  return true;
}

export const BillingEngine = {
  generateRecurringInvoices,
  billingIdempotencyKey,
  computeNextInterval,
};
