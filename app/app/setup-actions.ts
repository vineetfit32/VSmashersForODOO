"use server";

import { BillingInterval, ProductType } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { isValidPassword } from "@/lib/auth/password-policy";
import { prisma } from "@/lib/prisma";
import { businessToday } from "@/services/dates";
import { cents, fromCents, moneyString } from "@/services/money";

async function workspace() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "STAFF")) {
    throw new Error("Forbidden");
  }
  return session;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createCustomer(formData: FormData) {
  const session = await workspace();
  const companyName = text(formData, "companyName");
  const contactName = text(formData, "contactName");
  const email = text(formData, "email").toLowerCase();
  const phone = text(formData, "phone");
  const billingAddress = text(formData, "billingAddress");
  const password = text(formData, "password");
  if (!companyName || !contactName || !email) return { error: "Company, contact, and email are required." };

  let userId: string | undefined;
  if (password) {
    if (!isValidPassword(password)) {
      return { error: "Portal password needs 9 characters, upper and lower case, and a symbol." };
    }
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return { error: "That email already has a login." };
    const user = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        email,
        passwordHash: await hashPassword(password),
        firstName: contactName.split(" ")[0] || contactName,
        lastName: contactName.split(" ").slice(1).join(" ") || contactName,
        role: "CUSTOMER",
      },
    });
    userId = user.id;
  }

  await prisma.customer.create({
    data: {
      organizationId: session.organizationId,
      userId,
      companyName,
      contactName,
      email,
      phone: phone || null,
      billingAddress: billingAddress || null,
    },
  });
  revalidatePath("/app/customers");
  return { ok: true };
}

export async function createStaff(formData: FormData) {
  const session = await workspace();
  if (session.role !== "ADMIN") return { error: "Only an admin can add staff." };
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  if (!firstName || !lastName || !email || !password) return { error: "Name, email, and password are required." };
  if (!isValidPassword(password)) {
    return { error: "Password needs 9 characters, upper and lower case, and a symbol." };
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "That email already has a login." };
  await prisma.user.create({
    data: {
      organizationId: session.organizationId,
      email,
      passwordHash: await hashPassword(password),
      firstName,
      lastName,
      role: "STAFF",
    },
  });
  revalidatePath("/app/customers");
  return { ok: true };
}

export async function createProduct(formData: FormData) {
  const session = await workspace();
  const name = text(formData, "name");
  const salesPrice = Number(text(formData, "salesPrice"));
  if (!name || !Number.isFinite(salesPrice) || salesPrice < 0) return { error: "Name and price are required." };
  await prisma.product.create({
    data: {
      organizationId: session.organizationId,
      name,
      type: ProductType.SOFTWARE,
      salesPrice: moneyString(salesPrice),
    },
  });
  revalidatePath("/app/products");
  return { ok: true };
}

export async function createPlan(formData: FormData) {
  const session = await workspace();
  const name = text(formData, "name");
  const code = text(formData, "code").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const interval = text(formData, "interval") as BillingInterval;
  const basePrice = Number(text(formData, "basePrice"));
  if (!name || !code || !Object.values(BillingInterval).includes(interval)) {
    return { error: "Name, code, and billing interval are required." };
  }
  if (!Number.isFinite(basePrice) || basePrice < 0) return { error: "Enter a plan price." };
  await prisma.subscriptionPlan.create({
    data: {
      organizationId: session.organizationId,
      name,
      code,
      interval,
      basePrice: moneyString(basePrice),
      startDate: businessToday(),
      allowPause: formData.get("allowPause") === "on",
      autoClose: formData.get("autoClose") === "on",
    },
  });
  revalidatePath("/app/plans");
  return { ok: true };
}

export async function createSubscription(formData: FormData) {
  const session = await workspace();
  const customerId = text(formData, "customerId");
  const planId = text(formData, "planId");
  const productId = text(formData, "productId");
  const quantity = Number(text(formData, "quantity") || "1");
  const startDate = text(formData, "startDate");
  if (!customerId || !planId || !productId || !startDate) return { error: "Customer, plan, product, and start date are required." };
  if (!Number.isInteger(quantity) || quantity < 1) return { error: "Quantity must be at least 1." };

  const [customer, plan, product, tax] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, organizationId: session.organizationId } }),
    prisma.subscriptionPlan.findFirst({ where: { id: planId, organizationId: session.organizationId } }),
    prisma.product.findFirst({ where: { id: productId, organizationId: session.organizationId } }),
    prisma.taxRule.findFirst({ where: { organizationId: session.organizationId, isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!customer || !plan || !product) return { error: "Choose records from your own workspace." };

  const unit = cents(Number(product.salesPrice));
  const gross = unit * quantity;
  const rate = tax ? Number(tax.ratePercent) : 0;
  const taxCents = Math.round((gross * rate) / 100);
  const total = fromCents(gross + taxCents);
  const year = businessToday().getUTCFullYear();
  const subscriptionNumber = `SUB-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;

  await prisma.subscription.create({
    data: {
      subscriptionNumber,
      customerId: customer.id,
      planId: plan.id,
      status: "DRAFT",
      startDate: new Date(`${startDate}T00:00:00.000Z`),
      paymentTermsDays: customer.paymentTermsDays,
      subtotal: moneyString(fromCents(gross)),
      taxTotal: moneyString(fromCents(taxCents)),
      grandTotal: moneyString(total),
      lines: {
        create: {
          productId: product.id,
          taxRuleId: tax?.id,
          quantity,
          unitPrice: moneyString(fromCents(unit)),
          taxAmount: moneyString(fromCents(taxCents)),
          lineTotal: moneyString(total),
        },
      },
    },
  });
  revalidatePath("/app/subscriptions");
  return { ok: true };
}
