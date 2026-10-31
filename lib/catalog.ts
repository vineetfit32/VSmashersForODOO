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

export async function listSubscriptions(query: ListQuery, customerId?: string) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const where: Prisma.SubscriptionWhereInput = {};
  if (customerId) where.customerId = customerId;
  if (query.status && query.status !== "ALL") where.status = query.status as Prisma.EnumSubscriptionStatusFilter["equals"];
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

export async function listInvoices(query: ListQuery, customerId?: string) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const today = businessToday();
  const filters: Prisma.InvoiceWhereInput[] = [];
  if (customerId) filters.push({ customerId });

  if (query.status === "OVERDUE") {
    filters.push({
      balanceDue: { gt: 0 },
      dueDate: { lt: today },
      status: { in: ["CONFIRMED", "OVERDUE"] },
    });
  } else if (query.status && query.status !== "ALL") {
    filters.push({ status: query.status as Prisma.EnumInvoiceStatusFilter["equals"] });
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

export async function listPayments(query: ListQuery) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const where: Prisma.PaymentWhereInput = term
    ? {
        OR: [
          { paymentNumber: { contains: term, mode: "insensitive" } },
          { invoice: { invoiceNumber: { contains: term, mode: "insensitive" } } },
          { invoice: { customer: { companyName: { contains: term, mode: "insensitive" } } } },
        ],
      }
    : {};

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

export async function listProducts(query: ListQuery) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const where: Prisma.ProductWhereInput = term
    ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { variants: { some: { sku: { contains: term, mode: "insensitive" } } } }] }
    : {};
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

export async function listDiscounts(query: ListQuery) {
  const page = parsePage(query.page);
  const term = search(query.q);
  const where: Prisma.DiscountRuleWhereInput = term
    ? { OR: [{ code: { contains: term, mode: "insensitive" } }, { name: { contains: term, mode: "insensitive" } }] }
    : {};
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
