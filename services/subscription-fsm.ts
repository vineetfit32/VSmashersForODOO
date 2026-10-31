import { Prisma, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { addUtcDays, businessToday, isAfterDate, isoDate, utcDateOnly } from "@/services/dates";
import { DomainError } from "@/services/errors";

const ALLOWED: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  DRAFT: [SubscriptionStatus.QUOTATION],
  QUOTATION: [SubscriptionStatus.CONFIRMED],
  CONFIRMED: [SubscriptionStatus.ACTIVE],
  ACTIVE: [SubscriptionStatus.PAUSED, SubscriptionStatus.CLOSED],
  PAUSED: [SubscriptionStatus.ACTIVE],
  CLOSED: [],
};

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus) {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: SubscriptionStatus, to: SubscriptionStatus) {
  if (!canTransition(from, to)) {
    throw new DomainError(`Cannot move a subscription from ${from} to ${to}.`);
  }
}

export function allowedTargets(from: SubscriptionStatus) {
  return [...ALLOWED[from]];
}

type TransitionInput = {
  subscriptionId: string;
  to: SubscriptionStatus;
  actorId?: string | null;
  asOf?: Date;
  templateId?: string;
};

const subscriptionInclude = {
  customer: true,
  plan: true,
  lines: true,
} satisfies Prisma.SubscriptionInclude;

export async function transitionSubscription(input: TransitionInput) {
  const asOf = utcDateOnly(input.asOf ?? businessToday());

  return prisma.$transaction(async (tx) => {
    await lockSubscription(tx, input.subscriptionId);
    const subscription = await tx.subscription.findUnique({
      where: { id: input.subscriptionId },
      include: subscriptionInclude,
    });
    if (!subscription) throw new DomainError("Subscription not found.", 404);

    assertTransition(subscription.status, input.to);
    const data: Prisma.SubscriptionUpdateInput = { status: input.to };

    if (input.to === SubscriptionStatus.QUOTATION) {
      if (!subscription.customer.companyName || !subscription.customer.contactName || !subscription.customer.email) {
        throw new DomainError("Customer is missing a company name, contact name, or email.");
      }
      if (subscription.lines.length === 0) {
        throw new DomainError("Add at least one product line before sending the quotation.");
      }
      const quantity = subscription.lines.reduce((sum, line) => sum + line.quantity, 0);
      if (quantity < subscription.plan.minQuantity) {
        throw new DomainError(`Quantity is below the plan minimum of ${subscription.plan.minQuantity}.`);
      }
      data.quotationValidUntil = addUtcDays(asOf, await validityDays(tx, subscription.planId, input.templateId));
    }

    if (input.to === SubscriptionStatus.CONFIRMED) {
      if (!subscription.quotationValidUntil) {
        throw new DomainError("This quotation has no validity date.");
      }
      if (isAfterDate(asOf, subscription.quotationValidUntil)) {
        throw new DomainError(
          `This quotation expired on ${isoDate(subscription.quotationValidUntil)}. Renew it before confirming.`,
        );
      }
    }

    if (input.to === SubscriptionStatus.ACTIVE && subscription.status === SubscriptionStatus.CONFIRMED) {
      if (isAfterDate(subscription.startDate, asOf)) {
        throw new DomainError(`This subscription can start on ${isoDate(subscription.startDate)}.`);
      }
      data.nextBillingDate = utcDateOnly(subscription.startDate);
    }

    if (input.to === SubscriptionStatus.ACTIVE && subscription.status === SubscriptionStatus.PAUSED) {
      const next = subscription.nextBillingDate;
      data.nextBillingDate = !next || isAfterDate(asOf, next) ? asOf : utcDateOnly(next);
    }

    if (input.to === SubscriptionStatus.PAUSED && !subscription.plan.allowPause) {
      throw new DomainError("This plan does not allow pausing.");
    }

    if (input.to === SubscriptionStatus.CLOSED) {
      const ended = subscription.expiryDate != null && !isAfterDate(subscription.expiryDate, asOf);
      if (!ended && !subscription.plan.allowEarlyClose) {
        throw new DomainError("This plan does not allow early close.");
      }
    }

    const updated = await tx.subscription.update({
      where: { id: subscription.id },
      data,
    });

    await tx.auditLog.create({
      data: {
        entityName: "subscription",
        entityId: subscription.id,
        actorId: input.actorId ?? null,
        action: "STATUS_CHANGE",
        message: `${subscription.subscriptionNumber} moved from ${subscription.status} to ${input.to}.`,
        metadata: { from: subscription.status, to: input.to },
      },
    });

    return {
      id: updated.id,
      subscriptionNumber: updated.subscriptionNumber,
      status: updated.status,
      quotationValidUntil: updated.quotationValidUntil,
      nextBillingDate: updated.nextBillingDate,
      expiryDate: updated.expiryDate,
    };
  });
}

export async function renewQuotation(input: {
  subscriptionId: string;
  actorId?: string | null;
  asOf?: Date;
  templateId?: string;
}) {
  const asOf = utcDateOnly(input.asOf ?? businessToday());

  return prisma.$transaction(async (tx) => {
    await lockSubscription(tx, input.subscriptionId);
    const subscription = await tx.subscription.findUnique({
      where: { id: input.subscriptionId },
      include: { plan: true },
    });
    if (!subscription) throw new DomainError("Subscription not found.", 404);
    if (subscription.status !== SubscriptionStatus.QUOTATION) {
      throw new DomainError("Only a quotation can be renewed.");
    }
    if (!subscription.plan.allowRenew) {
      throw new DomainError("This plan does not allow renewal.");
    }

    const quotationValidUntil = addUtcDays(asOf, await validityDays(tx, subscription.planId, input.templateId));
    const updated = await tx.subscription.update({
      where: { id: subscription.id },
      data: { quotationValidUntil },
    });

    await tx.auditLog.create({
      data: {
        entityName: "subscription",
        entityId: subscription.id,
        actorId: input.actorId ?? null,
        action: "QUOTATION_RENEWED",
        message: `${subscription.subscriptionNumber} validity extended to ${isoDate(quotationValidUntil)}.`,
      },
    });

    return {
      id: updated.id,
      subscriptionNumber: updated.subscriptionNumber,
      status: updated.status,
      quotationValidUntil: updated.quotationValidUntil,
    };
  });
}

async function validityDays(tx: Prisma.TransactionClient, planId: string, templateId?: string) {
  if (templateId) {
    const template = await tx.quotationTemplate.findFirst({
      where: { id: templateId, isActive: true },
    });
    if (!template) throw new DomainError("Quotation template not found.", 404);
    return template.validityDays;
  }

  const template = await tx.quotationTemplate.findFirst({
    where: { planId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return template?.validityDays ?? 15;
}

async function lockSubscription(tx: Prisma.TransactionClient, subscriptionId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM subscriptions WHERE id = CAST(${subscriptionId} AS uuid) FOR UPDATE
  `;
  if (rows.length === 0) throw new DomainError("Subscription not found.", 404);
}

export const SubscriptionFSM = {
  canTransition,
  assertTransition,
  allowedTargets,
  transition: transitionSubscription,
  renewQuotation,
};
