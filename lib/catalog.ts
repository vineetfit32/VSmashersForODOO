import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { businessToday } from "@/services/dates";
import { PAGE_SIZE, parsePage } from "@/lib/format";

export type ListQuery = {
  q?: string;
  status?: string;
  page?: string;
};

function search(q: string | undefined) {
  const term = q?.trim();
  return term ? term : undefined;
}

export async function listSubscriptions(query: ListQuery, scope: { organizationId: string; customerId?: string }) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const where: Prisma.SubscriptionWhereInput = {
    customer: { organizationId: scope.organizationId },
  };
  if (scope.customerId) where.customerId = scope.customerId;
  const subscriptionStatuses = ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "PAUSED", "CLOSED"] as const;
  if (query.status && query.status !== "ALL" && subscriptionStatuses.includes(query.status as (typeof subscriptionStatuses)[number])) {
    where.status = query.status as (typeof subscriptionStatuses)[number];
  }
  if (term) {
    where.OR = [
      { subscriptionNumber: { contains: term, mode: "insensitive" } },
      { customer: { companyName: { contains: term, mode: "insensitive" } } },
      { plan: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { subscriptionNumber: "desc" },
      select: {
        id: true,
        subscriptionNumber: true,
        status: true,
        nextBillingDate: true,
        grandTotal: true,
        customer: { select: { companyName: true } },
        plan: { select: { name: true, interval: true } },
      },
    }),
  ]);

  return { page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, rows };
}

export async function listInvoices(query: ListQuery, scope: { organizationId: string; customerId?: string }) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const today = businessToday();
  const filters: Prisma.InvoiceWhereInput[] = [{ customer: { organizationId: scope.organizationId } }];
  if (scope.customerId) filters.push({ customerId: scope.customerId });

  const invoiceStatuses = ["DRAFT", "CONFIRMED", "PAID", "CANCELLED", "OVERDUE"] as const;
  if (query.status === "OVERDUE") {
    filters.push({
      balanceDue: { gt: 0 },
      dueDate: { lt: today },
      status: { in: ["CONFIRMED", "OVERDUE"] },
    });
  } else if (
    query.status &&
    query.status !== "ALL" &&
    invoiceStatuses.includes(query.status as (typeof invoiceStatuses)[number])
  ) {
    filters.push({ status: query.status as (typeof invoiceStatuses)[number] });
  }

  if (term) {
    filters.push({
      OR: [
        { invoiceNumber: { contains: term, mode: "insensitive" } },
        { customer: { companyName: { contains: term, mode: "insensitive" } } },
        { subscription: { subscriptionNumber: { contains: term, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.InvoiceWhereInput = filters.length ? { AND: filters } : {};
  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { invoiceNumber: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issueDate: true,
        dueDate: true,
        grandTotal: true,
        balanceDue: true,
        customer: { select: { companyName: true } },
        subscription: { select: { subscriptionNumber: true } },
      },
    }),
  ]);

  return { page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, rows };
}

export async function listPayments(query: ListQuery, organizationId: string) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const where: Prisma.PaymentWhereInput = {
    AND: [
      { invoice: { customer: { organizationId } } },
      ...(term
        ? [
            {
              OR: [
                { paymentNumber: { contains: term, mode: "insensitive" } },
                { invoice: { invoiceNumber: { contains: term, mode: "insensitive" } } },
                { invoice: { customer: { companyName: { contains: term, mode: "insensitive" } } } },
              ],
            },
          ]
        : []),
    ],
  };

  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { paymentNumber: "desc" },
      select: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
        amount: true,
        method: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customer: { select: { companyName: true } },
          },
        },
      },
    }),
  ]);

  return { page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, rows };
}

export async function listProducts(query: ListQuery, organizationId: string) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const where: Prisma.ProductWhereInput = {
    organizationId,
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        salesPrice: true,
        isActive: true,
        variants: { select: { attributeValue: true, priceExtra: true, sku: true } },
      },
    }),
  ]);
  return { page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, rows };
}

export async function listDiscounts(query: ListQuery, organizationId: string) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const where: Prisma.DiscountRuleWhereInput = {
    organizationId,
    ...(term
      ? { OR: [{ code: { contains: term, mode: "insensitive" } }, { name: { contains: term, mode: "insensitive" } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.discountRule.count({ where }),
    prisma.discountRule.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        value: true,
        minQuantity: true,
        currentUsageCount: true,
        maxUsageCount: true,
        endDate: true,
        isActive: true,
      },
    }),
  ]);
  return { page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, rows };
}
