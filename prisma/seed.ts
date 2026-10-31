import { createHash } from "node:crypto";

import {
  BillingInterval,
  DiscountTarget,
  DiscountType,
  InvoiceStatus,
  PaymentMethod,
  PrismaClient,
  ProductType,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{9,}$/;

const ADMIN_EMAIL = "admin@brightloop.com";
const ADMIN_PASSWORD = "Admin#Pass123";
const STAFF_PASSWORD = "Staff#Pass123";
const CUSTOMER_PASSWORD = "Customer#Pass123";

type ProductKey = "erp" | "crm" | "helpdesk" | "inventory";
type DiscountCode = "SEAT15" | "FLAT500";
type TaxCode = "gst" | "vat";

type LineSpec = {
  product: ProductKey;
  variant: string;
  qty: number;
  tax: TaxCode;
  discount?: DiscountCode;
};

type PlanCode = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

type SubscriptionSpec = {
  status: SubscriptionStatus;
  customer: number;
  plan: PlanCode;
  start: number;
  expiry: number | null;
  nextBill: number | null;
  quoteValid: number | null;
  lines: LineSpec[];
  notes: string;
};

const CATALOG: Record<
  ProductKey,
  {
    name: string;
    type: ProductType;
    salesPrice: number;
    costPrice: number;
    notes: string;
    variants: Record<
      string,
      {
        attributeName: string;
        attributeValue: string;
        priceExtra: number;
        sku: string;
      }
    >;
  }
> = {
  erp: {
    name: "Brightloop ERP",
    type: ProductType.SOFTWARE,
    salesPrice: 2400,
    costPrice: 900,
    notes: "Core finance, sales, and operations suite.",
    variants: {
      standard: {
        attributeName: "Tier",
        attributeValue: "Standard",
        priceExtra: 0,
        sku: "ERP-STD",
      },
      enterprise: {
        attributeName: "Tier",
        attributeValue: "Enterprise",
        priceExtra: 1200,
        sku: "ERP-ENT",
      },
    },
  },
  crm: {
    name: "Brightloop CRM",
    type: ProductType.SOFTWARE,
    salesPrice: 1800,
    costPrice: 640,
    notes: "Pipeline and customer management. Odoo Brand adds +560.",
    variants: {
      generic: {
        attributeName: "Brand",
        attributeValue: "Generic",
        priceExtra: 0,
        sku: "CRM-GEN",
      },
      odoo: {
        attributeName: "Brand",
        attributeValue: "Odoo Brand",
        priceExtra: 560,
        sku: "CRM-ODOO",
      },
    },
  },
  helpdesk: {
    name: "Brightloop Helpdesk",
    type: ProductType.ADDON,
    salesPrice: 750,
    costPrice: 220,
    notes: "Support desk add-on, billed per agent seat.",
    variants: {
      basic: {
        attributeName: "Tier",
        attributeValue: "Basic",
        priceExtra: 0,
        sku: "HD-BASIC",
      },
    },
  },
  inventory: {
    name: "Brightloop Inventory",
    type: ProductType.SOFTWARE,
    salesPrice: 1200,
    costPrice: 380,
    notes: "Warehouse and stock module.",
    variants: {
      standard: {
        attributeName: "Tier",
        attributeValue: "Standard",
        priceExtra: 0,
        sku: "INV-STD",
      },
    },
  },
};

const CUSTOMERS = [
  {
    companyName: "Northwind Analytics Pvt Ltd",
    contactName: "Meera Iyer",
    email: "meera.iyer@northwind.example",
    phone: "+91 98100 11001",
    billingAddress: "14th Floor, One BKC, Bandra Kurla Complex, Mumbai 400051",
    paymentTermsDays: 30,
    firstName: "Meera",
    lastName: "Iyer",
  },
  {
    companyName: "Lakshmi Textiles Ltd",
    contactName: "Rahul Nair",
    email: "rahul.nair@lakshmitextiles.example",
    phone: "+91 98450 22002",
    billingAddress: "42 Peelamedu Industrial Estate, Coimbatore 641004",
    paymentTermsDays: 15,
    firstName: "Rahul",
    lastName: "Nair",
  },
  {
    companyName: "Ganges Logistics",
    contactName: "Ananya Bose",
    email: "ananya.bose@gangeslogistics.example",
    phone: "+91 98300 33003",
    billingAddress: "Salt Lake Sector V, Kolkata 700091",
    paymentTermsDays: 30,
    firstName: "Ananya",
    lastName: "Bose",
  },
  {
    companyName: "Deccan Healthcare",
    contactName: "Vikram Reddy",
    email: "vikram.reddy@deccanhealth.example",
    phone: "+91 99000 44004",
    billingAddress: "Hitech City, Madhapur, Hyderabad 500081",
    paymentTermsDays: 45,
    firstName: "Vikram",
    lastName: "Reddy",
  },
  {
    companyName: "Himalaya EduTech",
    contactName: "Sana Qureshi",
    email: "sana.qureshi@himalayaedu.example",
    phone: "+91 98180 55005",
    billingAddress: "Sector 62, Noida 201309",
    paymentTermsDays: 21,
    firstName: "Sana",
    lastName: "Qureshi",
  },
] as const;

const SUBSCRIPTIONS: SubscriptionSpec[] = [
  {
    status: SubscriptionStatus.DRAFT,
    customer: 0,
    plan: "MONTHLY",
    start: 14,
    expiry: null,
    nextBill: null,
    quoteValid: null,
    lines: [
      { product: "erp", variant: "standard", qty: 2, tax: "gst" },
      { product: "crm", variant: "generic", qty: 1, tax: "gst" },
    ],
    notes: "Draft quote for the Northwind analytics rollout.",
  },
  {
    status: SubscriptionStatus.DRAFT,
    customer: 1,
    plan: "YEARLY",
    start: 30,
    expiry: 395,
    nextBill: null,
    quoteValid: null,
    lines: [{ product: "erp", variant: "enterprise", qty: 2, tax: "gst" }],
    notes: "Annual enterprise draft, not yet sent.",
  },
  {
    status: SubscriptionStatus.DRAFT,
    customer: 2,
    plan: "WEEKLY",
    start: 7,
    expiry: null,
    nextBill: null,
    quoteValid: null,
    lines: [{ product: "helpdesk", variant: "basic", qty: 3, tax: "vat" }],
    notes: "Weekly support desk draft for the Kolkata hub.",
  },
  {
    status: SubscriptionStatus.DRAFT,
    customer: 3,
    plan: "MONTHLY",
    start: 21,
    expiry: null,
    nextBill: null,
    quoteValid: null,
    lines: [{ product: "inventory", variant: "standard", qty: 1, tax: "gst" }],
    notes: "Inventory module draft for Deccan clinics.",
  },
  {
    status: SubscriptionStatus.QUOTATION,
    customer: 4,
    plan: "MONTHLY",
    start: 10,
    expiry: null,
    nextBill: null,
    quoteValid: 15,
    lines: [
      { product: "erp", variant: "standard", qty: 5, tax: "gst", discount: "SEAT15" },
      { product: "crm", variant: "odoo", qty: 5, tax: "gst", discount: "SEAT15" },
    ],
    notes: "Open quotation, 15-day validity, 15% seat discount on five seats.",
  },
  {
    status: SubscriptionStatus.QUOTATION,
    customer: 0,
    plan: "YEARLY",
    start: 20,
    expiry: 385,
    nextBill: null,
    quoteValid: 15,
    lines: [
      { product: "erp", variant: "enterprise", qty: 1, tax: "gst", discount: "FLAT500" },
      { product: "crm", variant: "odoo", qty: 1, tax: "gst" },
    ],
    notes: "Yearly quote with a flat ₹500 discount.",
  },
  {
    status: SubscriptionStatus.QUOTATION,
    customer: 1,
    plan: "MONTHLY",
    start: 5,
    expiry: null,
    nextBill: null,
    quoteValid: 10,
    lines: [
      { product: "crm", variant: "odoo", qty: 6, tax: "vat", discount: "SEAT15" },
    ],
    notes: "CRM on the Odoo Brand variant, quote valid for 10 days.",
  },
  {
    status: SubscriptionStatus.QUOTATION,
    customer: 2,
    plan: "DAILY",
    start: 1,
    expiry: null,
    nextBill: null,
    quoteValid: -3,
    lines: [{ product: "helpdesk", variant: "basic", qty: 2, tax: "gst" }],
    notes: "Quotation expired three days ago. Acceptance must be rejected.",
  },
  {
    status: SubscriptionStatus.CONFIRMED,
    customer: 3,
    plan: "MONTHLY",
    start: 5,
    expiry: null,
    nextBill: null,
    quoteValid: null,
    lines: [{ product: "erp", variant: "standard", qty: 4, tax: "gst" }],
    notes: "Customer accepted. Start date is still in the future.",
  },
  {
    status: SubscriptionStatus.CONFIRMED,
    customer: 4,
    plan: "WEEKLY",
    start: 3,
    expiry: null,
    nextBill: null,
    quoteValid: null,
    lines: [
      { product: "inventory", variant: "standard", qty: 2, tax: "gst" },
      { product: "helpdesk", variant: "basic", qty: 1, tax: "gst" },
    ],
    notes: "Confirmed weekly bundle, waiting to activate.",
  },
  {
    status: SubscriptionStatus.CONFIRMED,
    customer: 0,
    plan: "YEARLY",
    start: 12,
    expiry: 377,
    nextBill: null,
    quoteValid: null,
    lines: [
      { product: "erp", variant: "enterprise", qty: 3, tax: "gst", discount: "FLAT500" },
      { product: "crm", variant: "odoo", qty: 3, tax: "gst" },
    ],
    notes: "Confirmed on the auto-close yearly plan.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 1,
    plan: "MONTHLY",
    start: -60,
    expiry: null,
    nextBill: -2,
    quoteValid: null,
    lines: [
      { product: "erp", variant: "standard", qty: 5, tax: "gst", discount: "SEAT15" },
    ],
    notes: "Active monthly ERP. Next bill is two days overdue.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 2,
    plan: "MONTHLY",
    start: -90,
    expiry: null,
    nextBill: 12,
    quoteValid: null,
    lines: [
      { product: "crm", variant: "odoo", qty: 6, tax: "gst", discount: "SEAT15" },
    ],
    notes: "Active CRM seats on the Odoo Brand variant.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 3,
    plan: "YEARLY",
    start: -200,
    expiry: 165,
    nextBill: 40,
    quoteValid: null,
    lines: [
      { product: "erp", variant: "enterprise", qty: 3, tax: "vat", discount: "FLAT500" },
    ],
    notes: "Active yearly contract with auto-close at expiry.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 4,
    plan: "WEEKLY",
    start: -28,
    expiry: null,
    nextBill: -1,
    quoteValid: null,
    lines: [{ product: "helpdesk", variant: "basic", qty: 4, tax: "gst" }],
    notes: "Weekly helpdesk. Billing date was yesterday.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 0,
    plan: "DAILY",
    start: -10,
    expiry: null,
    nextBill: 0,
    quoteValid: null,
    lines: [{ product: "inventory", variant: "standard", qty: 2, tax: "gst" }],
    notes: "Daily inventory subscription due to bill today.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 1,
    plan: "MONTHLY",
    start: -120,
    expiry: null,
    nextBill: 5,
    quoteValid: null,
    lines: [
      { product: "erp", variant: "standard", qty: 8, tax: "gst", discount: "SEAT15" },
      { product: "crm", variant: "odoo", qty: 2, tax: "gst" },
    ],
    notes: "Seat discount applies to ERP only. CRM quantity is under the threshold.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 2,
    plan: "YEARLY",
    start: -100,
    expiry: 265,
    nextBill: 30,
    quoteValid: null,
    lines: [
      { product: "erp", variant: "standard", qty: 1, tax: "vat", discount: "FLAT500" },
      { product: "inventory", variant: "standard", qty: 1, tax: "vat" },
    ],
    notes: "Yearly ERP and inventory bundle with ₹500 off.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 3,
    plan: "MONTHLY",
    start: -45,
    expiry: null,
    nextBill: 8,
    quoteValid: null,
    lines: [{ product: "crm", variant: "generic", qty: 3, tax: "gst" }],
    notes: "Generic CRM. Quantity is below the seat-discount minimum.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 4,
    plan: "WEEKLY",
    start: -14,
    expiry: null,
    nextBill: 3,
    quoteValid: null,
    lines: [{ product: "erp", variant: "standard", qty: 2, tax: "gst" }],
    notes: "Weekly ERP on a plan that allows pause.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 0,
    plan: "MONTHLY",
    start: -180,
    expiry: null,
    nextBill: -5,
    quoteValid: null,
    lines: [
      { product: "erp", variant: "standard", qty: 12, tax: "gst", discount: "SEAT15" },
      { product: "crm", variant: "odoo", qty: 12, tax: "gst", discount: "SEAT15" },
    ],
    notes: "Large seat count. Billing date is five days behind.",
  },
  {
    status: SubscriptionStatus.ACTIVE,
    customer: 1,
    plan: "DAILY",
    start: -5,
    expiry: null,
    nextBill: 1,
    quoteValid: null,
    lines: [{ product: "helpdesk", variant: "basic", qty: 1, tax: "gst" }],
    notes: "Single daily helpdesk seat.",
  },
  {
    status: SubscriptionStatus.CLOSED,
    customer: 2,
    plan: "MONTHLY",
    start: -400,
    expiry: -30,
    nextBill: null,
    quoteValid: null,
    lines: [{ product: "erp", variant: "standard", qty: 2, tax: "gst" }],
    notes: "Closed after the contract end date.",
  },
  {
    status: SubscriptionStatus.CLOSED,
    customer: 3,
    plan: "YEARLY",
    start: -500,
    expiry: -10,
    nextBill: null,
    quoteValid: null,
    lines: [
      { product: "crm", variant: "odoo", qty: 5, tax: "vat", discount: "SEAT15" },
    ],
    notes: "Yearly Odoo Brand subscription auto-closed at expiry.",
  },
  {
    status: SubscriptionStatus.CLOSED,
    customer: 4,
    plan: "WEEKLY",
    start: -90,
    expiry: -7,
    nextBill: null,
    quoteValid: null,
    lines: [{ product: "inventory", variant: "standard", qty: 1, tax: "gst" }],
    notes: "Weekly inventory subscription closed early.",
  },
];

const INVOICE_STATUSES: InvoiceStatus[] = [
  ...Array.from({ length: 6 }, () => InvoiceStatus.DRAFT),
  ...Array.from({ length: 8 }, () => InvoiceStatus.CONFIRMED),
  ...Array.from({ length: 12 }, () => InvoiceStatus.PAID),
  ...Array.from({ length: 7 }, () => InvoiceStatus.OVERDUE),
  ...Array.from({ length: 2 }, () => InvoiceStatus.CANCELLED),
];

const PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.UPI,
  PaymentMethod.CHEQUE,
  PaymentMethod.CASH,
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dec(value: number): string {
  return round2(value).toFixed(2);
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function idempotencyKey(subscriptionId: string, periodStart: string, periodEnd: string): string {
  return createHash("sha256")
    .update(`${subscriptionId}:${periodStart}:${periodEnd}`)
    .digest("hex");
}

function requirePassword(label: string, password: string) {
  assert(PASSWORD_REGEX.test(password), `${label} does not meet the password policy`);
}

type PricedLine = {
  spec: LineSpec;
  unitPrice: number;
  gross: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  discountCode: DiscountCode | null;
};

function catalogVariant(productKey: ProductKey, variantKey: string) {
  const variants = CATALOG[productKey].variants as Record<
    string,
    { attributeName: string; attributeValue: string; priceExtra: number; sku: string }
  >;
  const variant = variants[variantKey];
  assert(variant, `Unknown variant ${productKey}/${variantKey}`);
  return variant;
}

function priceLine(spec: LineSpec, subtotal: number): PricedLine {
  const product = CATALOG[spec.product];
  const variant = catalogVariant(spec.product, spec.variant);

  const unitPrice = round2(product.salesPrice + variant.priceExtra);
  const gross = round2(unitPrice * spec.qty);
  let discountAmount = 0;

  if (spec.discount === "SEAT15") {
    const seatProduct = spec.product === "erp" || spec.product === "crm";
    assert(seatProduct && spec.qty >= 5, `SEAT15 is not eligible for ${spec.product} x${spec.qty}`);
    discountAmount = round2(gross * 0.15);
  } else if (spec.discount === "FLAT500") {
    assert(subtotal >= 2000, "FLAT500 minimum purchase was not met");
    discountAmount = round2(Math.min(500, gross));
  }

  const rate = spec.tax === "gst" ? 18 : 20;
  const taxable = round2(gross - discountAmount);
  const taxAmount = round2((taxable * rate) / 100);

  return {
    spec,
    unitPrice,
    gross,
    discountAmount,
    taxAmount,
    lineTotal: round2(taxable + taxAmount),
    discountCode: spec.discount ?? null,
  };
}

function priceSubscription(lines: LineSpec[]): PricedLine[] {
  const subtotal = round2(
    lines.reduce((sum, line) => {
      const product = CATALOG[line.product];
      const variant = catalogVariant(line.product, line.variant);
      return sum + (product.salesPrice + variant.priceExtra) * line.qty;
    }, 0),
  );

  return lines.map((line) => priceLine(line, subtotal));
}

async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.discountRuleProduct.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  assert(CUSTOMERS.length === 5, "Expected 5 customers");
  assert(SUBSCRIPTIONS.length === 25, `Expected 25 subscriptions, got ${SUBSCRIPTIONS.length}`);
  assert(INVOICE_STATUSES.length === 35, `Expected 35 invoices, got ${INVOICE_STATUSES.length}`);

  requirePassword("admin", ADMIN_PASSWORD);
  requirePassword("staff", STAFF_PASSWORD);
  requirePassword("customer", CUSTOMER_PASSWORD);

  const today = utcToday();
  const year = today.getUTCFullYear();
  const [adminHash, staffHash, customerHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 10),
    bcrypt.hash(STAFF_PASSWORD, 10),
    bcrypt.hash(CUSTOMER_PASSWORD, 10),
  ]);

  await clearDatabase();

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      firstName: "Asha",
      lastName: "Menon",
      role: UserRole.ADMIN,
    },
  });

  const staff = await Promise.all(
    [
      { email: "staff1@brightloop.com", firstName: "Priya", lastName: "Sharma" },
      { email: "staff2@brightloop.com", firstName: "Arjun", lastName: "Mehta" },
    ].map((person) =>
      prisma.user.create({
        data: {
          email: person.email,
          passwordHash: staffHash,
          firstName: person.firstName,
          lastName: person.lastName,
          role: UserRole.STAFF,
        },
      }),
    ),
  );

  const customerUsers = await Promise.all(
    CUSTOMERS.map((customer) =>
      prisma.user.create({
        data: {
          email: customer.email,
          passwordHash: customerHash,
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: UserRole.CUSTOMER,
        },
      }),
    ),
  );

  const customers = await Promise.all(
    CUSTOMERS.map((customer, index) =>
      prisma.customer.create({
        data: {
          userId: customerUsers[index].id,
          companyName: customer.companyName,
          contactName: customer.contactName,
          email: customer.email,
          phone: customer.phone,
          billingAddress: customer.billingAddress,
          paymentTermsDays: customer.paymentTermsDays,
        },
      }),
    ),
  );

  const products = {} as Record<
    ProductKey,
    { id: string; variants: Record<string, { id: string; attributeValue: string }> }
  >;

  for (const [key, product] of Object.entries(CATALOG) as Array<
    [ProductKey, (typeof CATALOG)[ProductKey]]
  >) {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        type: product.type,
        salesPrice: dec(product.salesPrice),
        costPrice: dec(product.costPrice),
        notes: product.notes,
        variants: {
          create: Object.entries(product.variants).map(([, variant]) => ({
            attributeName: variant.attributeName,
            attributeValue: variant.attributeValue,
            priceExtra: dec(variant.priceExtra),
            sku: variant.sku,
          })),
        },
      },
      include: { variants: true },
    });

    products[key] = {
      id: created.id,
      variants: Object.fromEntries(
        created.variants.map((variant) => [
          Object.entries(product.variants).find(
            ([, spec]) => spec.sku === variant.sku,
          )?.[0],
          { id: variant.id, attributeValue: variant.attributeValue },
        ]),
      ) as Record<string, { id: string; attributeValue: string }>,
    };
  }

  const planInput: Array<{
    name: string;
    code: PlanCode;
    interval: BillingInterval;
    basePrice: number;
    autoClose: boolean;
    allowPause: boolean;
    allowEarlyClose: boolean;
    allowRenew: boolean;
  }> = [
    {
      name: "Daily Metered",
      code: "DAILY",
      interval: BillingInterval.DAILY,
      basePrice: 149,
      autoClose: false,
      allowPause: true,
      allowEarlyClose: true,
      allowRenew: true,
    },
    {
      name: "Weekly Growth",
      code: "WEEKLY",
      interval: BillingInterval.WEEKLY,
      basePrice: 799,
      autoClose: false,
      allowPause: true,
      allowEarlyClose: true,
      allowRenew: true,
    },
    {
      name: "Monthly Business",
      code: "MONTHLY",
      interval: BillingInterval.MONTHLY,
      basePrice: 2499,
      autoClose: false,
      allowPause: true,
      allowEarlyClose: true,
      allowRenew: true,
    },
    {
      name: "Yearly Enterprise",
      code: "YEARLY",
      interval: BillingInterval.YEARLY,
      basePrice: 24990,
      autoClose: true,
      allowPause: false,
      allowEarlyClose: true,
      allowRenew: true,
    },
  ];

  const plans = new Map<PlanCode, { id: string }>();
  for (const plan of planInput) {
    const created = await prisma.subscriptionPlan.create({
      data: {
        name: plan.name,
        code: plan.code,
        interval: plan.interval,
        intervalCount: 1,
        basePrice: dec(plan.basePrice),
        minQuantity: 1,
        startDate: utcDate(year, 1, 1),
        autoClose: plan.autoClose,
        allowEarlyClose: plan.allowEarlyClose,
        allowPause: plan.allowPause,
        allowRenew: plan.allowRenew,
      },
    });
    plans.set(plan.code, created);
  }

  const gst = await prisma.taxRule.create({
    data: { name: "GST 18%", ratePercent: "18.00", isCompound: false },
  });
  const vat = await prisma.taxRule.create({
    data: { name: "VAT 20%", ratePercent: "20.00", isCompound: false },
  });
  const taxByCode = { gst, vat };

  const seatDiscount = await prisma.discountRule.create({
    data: {
      code: "SEAT15",
      name: "15% Seat Discount",
      type: DiscountType.PERCENTAGE,
      value: "15.00",
      minPurchaseAmount: "0.00",
      minQuantity: 5,
      startDate: utcDate(year, 1, 1),
      endDate: utcDate(year + 1, 12, 31),
      maxUsageCount: 500,
      appliesTo: DiscountTarget.SPECIFIC_PRODUCTS,
      products: {
        create: [{ productId: products.erp.id }, { productId: products.crm.id }],
      },
    },
  });

  const flatDiscount = await prisma.discountRule.create({
    data: {
      code: "FLAT500",
      name: "₹500 Off",
      type: DiscountType.FIXED_AMOUNT,
      value: "500.00",
      minPurchaseAmount: "2000.00",
      minQuantity: 1,
      startDate: utcDate(year, 1, 1),
      endDate: utcDate(year + 1, 12, 31),
      appliesTo: DiscountTarget.WHOLE_SUBSCRIPTION,
    },
  });

  const discountByCode = { SEAT15: seatDiscount, FLAT500: flatDiscount };

  const monthlyPlan = plans.get("MONTHLY");
  assert(monthlyPlan, "Monthly plan missing");

  await prisma.quotationTemplate.create({
    data: {
      name: "Standard Software Quote",
      planId: monthlyPlan.id,
      validityDays: 15,
      notes: "Default quotation for the monthly business plan. Valid for 15 days.",
      lines: {
        create: [
          {
            productId: products.erp.id,
            variantId: products.erp.variants.standard.id,
            defaultQuantity: 1,
          },
          {
            productId: products.crm.id,
            variantId: products.crm.variants.odoo.id,
            defaultQuantity: 1,
          },
        ],
      },
    },
  });

  const createdSubscriptions: Array<{
    id: string;
    customerId: string;
    status: SubscriptionStatus;
    paymentTermsDays: number;
    lines: PricedLine[];
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    grandTotal: number;
  }> = [];

  for (const [index, spec] of SUBSCRIPTIONS.entries()) {
    const priced = priceSubscription(spec.lines);
    const subtotal = round2(priced.reduce((sum, line) => sum + line.gross, 0));
    const discountTotal = round2(priced.reduce((sum, line) => sum + line.discountAmount, 0));
    const taxTotal = round2(priced.reduce((sum, line) => sum + line.taxAmount, 0));
    const grandTotal = round2(priced.reduce((sum, line) => sum + line.lineTotal, 0));
    const customer = customers[spec.customer];
    const plan = plans.get(spec.plan);
    assert(plan, `Missing plan ${spec.plan}`);

    const created = await prisma.subscription.create({
      data: {
        subscriptionNumber: `SUB-${year}-${String(index + 1).padStart(4, "0")}`,
        customerId: customer.id,
        planId: plan.id,
        status: spec.status,
        startDate: addUtcDays(today, spec.start),
        expiryDate: spec.expiry === null ? null : addUtcDays(today, spec.expiry),
        nextBillingDate: spec.nextBill === null ? null : addUtcDays(today, spec.nextBill),
        quotationValidUntil:
          spec.quoteValid === null ? null : addUtcDays(today, spec.quoteValid),
        paymentTermsDays: customer.paymentTermsDays,
        subtotal: dec(subtotal),
        taxTotal: dec(taxTotal),
        discountTotal: dec(discountTotal),
        grandTotal: dec(grandTotal),
        currency: "INR",
        notes: spec.notes,
        lines: {
          create: priced.map((line) => ({
            productId: products[line.spec.product].id,
            variantId: products[line.spec.product].variants[line.spec.variant].id,
            taxRuleId: taxByCode[line.spec.tax].id,
            discountRuleId: line.discountCode ? discountByCode[line.discountCode].id : null,
            quantity: line.spec.qty,
            unitPrice: dec(line.unitPrice),
            taxAmount: dec(line.taxAmount),
            discountAmount: dec(line.discountAmount),
            lineTotal: dec(line.lineTotal),
          })),
        },
      },
    });

    createdSubscriptions.push({
      id: created.id,
      customerId: customer.id,
      status: spec.status,
      paymentTermsDays: customer.paymentTermsDays,
      lines: priced,
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
    });

    await prisma.auditLog.create({
      data: {
        entityName: "subscription",
        entityId: created.id,
        actorId: admin.id,
        action: "STATUS_CHANGE",
        message: `${created.subscriptionNumber} seeded as ${spec.status}.`,
        metadata: { status: spec.status, plan: spec.plan },
      },
    });
  }

  const billable = createdSubscriptions.filter(
    (subscription) =>
      subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.CLOSED,
  );
  assert(billable.length > 0, "No billable subscriptions");

  const recorders = [admin.id, staff[0].id, staff[1].id];
  const occurrence = new Map<string, number>();
  let paymentSequence = 0;

  for (const [index, status] of INVOICE_STATUSES.entries()) {
    const subscription = billable[index % billable.length];
    const nth = (occurrence.get(subscription.id) ?? 0) + 1;
    occurrence.set(subscription.id, nth);

    const periodStart = addUtcDays(today, -30 * nth);
    const periodEnd = addUtcDays(periodStart, 29);
    const issueDate =
      status === InvoiceStatus.DRAFT ? today : periodStart;
    const dueDate =
      status === InvoiceStatus.OVERDUE
        ? addUtcDays(today, -12)
        : status === InvoiceStatus.CONFIRMED
          ? addUtcDays(today, Math.max(subscription.paymentTermsDays, 7))
          : status === InvoiceStatus.DRAFT
            ? addUtcDays(today, subscription.paymentTermsDays)
            : addUtcDays(issueDate, subscription.paymentTermsDays);

    const payments = paymentPlan(status, subscription.grandTotal, index);
    const amountPaid = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
    const balanceDue = round2(subscription.grandTotal - amountPaid);
    const key =
      status === InvoiceStatus.DRAFT
        ? null
        : idempotencyKey(subscription.id, isoDate(periodStart), isoDate(periodEnd));

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${year}-${String(index + 1).padStart(4, "0")}`,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        status,
        issueDate,
        dueDate,
        periodStart,
        periodEnd,
        subtotal: dec(subscription.subtotal),
        taxTotal: dec(subscription.taxTotal),
        discountTotal: dec(subscription.discountTotal),
        grandTotal: dec(subscription.grandTotal),
        amountPaid: dec(amountPaid),
        balanceDue: dec(balanceDue),
        idempotencyKey: key,
        lines: {
          create: subscription.lines.map((line) => {
            const product = CATALOG[line.spec.product];
            const variant = product.variants[line.spec.variant];
            return {
              productId: products[line.spec.product].id,
              description: `${product.name} — ${variant.attributeValue}`,
              quantity: line.spec.qty,
              unitPrice: dec(line.unitPrice),
              taxAmount: dec(line.taxAmount),
              discountAmount: dec(line.discountAmount),
              lineTotal: dec(line.lineTotal),
            };
          }),
        },
      },
    });

    for (const payment of payments) {
      paymentSequence += 1;
      const createdPayment = await prisma.payment.create({
        data: {
          paymentNumber: `PAY-${year}-${String(paymentSequence).padStart(4, "0")}`,
          invoiceId: invoice.id,
          paymentDate: addUtcDays(today, payment.dateOffset),
          amount: dec(payment.amount),
          method: payment.method,
          referenceNote: payment.note,
          recordedById: recorders[paymentSequence % recorders.length],
        },
      });

      await prisma.auditLog.create({
        data: {
          entityName: "invoice",
          entityId: invoice.id,
          actorId: createdPayment.recordedById,
          action: "PAYMENT_RECORDED",
          message: `${createdPayment.paymentNumber} of ${dec(payment.amount)} recorded via ${payment.method}.`,
          metadata: { method: payment.method, amount: dec(payment.amount) },
        },
      });
    }
  }

  for (const rule of [seatDiscount, flatDiscount]) {
    const usage = await prisma.subscriptionLine.count({
      where: { discountRuleId: rule.id },
    });
    await prisma.discountRule.update({
      where: { id: rule.id },
      data: { currentUsageCount: usage },
    });
  }

  await verifySeed(today, adminHash);
}

function paymentPlan(
  status: InvoiceStatus,
  grandTotal: number,
  index: number,
): Array<{ amount: number; method: PaymentMethod; note: string; dateOffset: number }> {
  if (status === InvoiceStatus.DRAFT || status === InvoiceStatus.CANCELLED || grandTotal <= 0) {
    return [];
  }

  if (status === InvoiceStatus.PAID) {
    if (index % 3 === 0) {
      const first = round2(grandTotal * 0.6);
      return [
        {
          amount: first,
          method: PaymentMethod.BANK_TRANSFER,
          note: "NEFT first installment from the customer account",
          dateOffset: -20,
        },
        {
          amount: round2(grandTotal - first),
          method: PaymentMethod.UPI,
          note: "UPI remainder, invoice settled",
          dateOffset: -6,
        },
      ];
    }

    return [
      {
        amount: grandTotal,
        method: PAYMENT_METHODS[index % PAYMENT_METHODS.length],
        note: "Payment received in full",
        dateOffset: -4,
      },
    ];
  }

  if (status === InvoiceStatus.CONFIRMED && index % 2 === 1) {
    return [
      {
        amount: round2(grandTotal * 0.4),
        method: PaymentMethod.CREDIT_CARD,
        note: "Card payment, balance still open",
        dateOffset: -2,
      },
    ];
  }

  if (status === InvoiceStatus.OVERDUE && index % 2 === 1) {
    return [
      {
        amount: round2(grandTotal * 0.25),
        method: PaymentMethod.CHEQUE,
        note: "Cheque cleared for part of the overdue balance",
        dateOffset: -40,
      },
    ];
  }

  return [];
}

async function verifySeed(today: Date, adminHash: string) {
  const [
    users,
    admins,
    staff,
    customers,
    products,
    variants,
    plans,
    taxes,
    discounts,
    templates,
    subscriptions,
    invoices,
    payments,
    odoo,
    statusGroups,
    invoiceGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.ADMIN, email: ADMIN_EMAIL } }),
    prisma.user.count({ where: { role: UserRole.STAFF } }),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.subscriptionPlan.count(),
    prisma.taxRule.count(),
    prisma.discountRule.count(),
    prisma.quotationTemplate.count({ where: { validityDays: 15 } }),
    prisma.subscription.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.productVariant.findFirst({ where: { attributeValue: "Odoo Brand", sku: "CRM-ODOO" } }),
    prisma.subscription.groupBy({ by: ["status"], _count: true }),
    prisma.invoice.groupBy({ by: ["status"], _count: true }),
  ]);

  assert(users === 8, `Expected 8 users, got ${users}`);
  assert(admins === 1, "Admin user missing");
  assert(staff === 2, `Expected 2 staff, got ${staff}`);
  assert(customers === 5, `Expected 5 customers, got ${customers}`);
  assert(products === 4, `Expected 4 products, got ${products}`);
  assert(variants === 6, `Expected 6 variants, got ${variants}`);
  assert(plans === 4, `Expected 4 plans, got ${plans}`);
  assert(taxes === 2, `Expected 2 tax rules, got ${taxes}`);
  assert(discounts === 2, `Expected 2 discount rules, got ${discounts}`);
  assert(templates === 1, "15-day quotation template missing");
  assert(subscriptions === 25, `Expected 25 subscriptions, got ${subscriptions}`);
  assert(invoices === 35, `Expected 35 invoices, got ${invoices}`);
  assert(payments > 0, "Expected matching payments");
  assert(odoo, "Odoo Brand variant missing");
  assert(Number(odoo.priceExtra) === 560, `Odoo Brand extra price is ${odoo.priceExtra}, expected 560`);

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  assert(await bcrypt.compare(ADMIN_PASSWORD, admin.passwordHash), "Admin password hash does not match");
  assert(admin.passwordHash === adminHash, "Admin hash drifted");

  const billedCustomers = await prisma.customer.count({
    where: { billingAddress: { not: null }, phone: { not: null } },
  });
  assert(billedCustomers === 5, "Every customer needs billing details");

  const pauseable = await prisma.subscriptionPlan.count({ where: { allowPause: true } });
  const autoClose = await prisma.subscriptionPlan.count({ where: { autoClose: true, code: "YEARLY" } });
  assert(pauseable >= 1 && autoClose === 1, "Plan pause and auto-close flags were not seeded");

  const requiredStatuses: SubscriptionStatus[] = [
    SubscriptionStatus.DRAFT,
    SubscriptionStatus.QUOTATION,
    SubscriptionStatus.CONFIRMED,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CLOSED,
  ];
  for (const status of requiredStatuses) {
    assert(
      statusGroups.some((group) => group.status === status && group._count > 0),
      `No subscriptions in ${status}`,
    );
  }

  const invoiceRows = await prisma.invoice.findMany({ include: { payments: true } });
  let overdue = 0;
  for (const invoice of invoiceRows) {
    const paid = round2(invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0));
    assert(paid === round2(Number(invoice.amountPaid)), `${invoice.invoiceNumber} payments do not match amount_paid`);
    assert(
      round2(Number(invoice.amountPaid) + Number(invoice.balanceDue)) === round2(Number(invoice.grandTotal)),
      `${invoice.invoiceNumber} balance does not reconcile`,
    );

    if (invoice.status === InvoiceStatus.PAID) {
      assert(Number(invoice.balanceDue) === 0, `${invoice.invoiceNumber} is paid with a balance`);
    }
    if (invoice.status === InvoiceStatus.OVERDUE) {
      assert(Number(invoice.balanceDue) > 0, `${invoice.invoiceNumber} overdue balance is zero`);
      assert(invoice.dueDate < today, `${invoice.invoiceNumber} overdue due date is not in the past`);
      overdue += 1;
    }
    if (invoice.status === InvoiceStatus.CONFIRMED) {
      assert(invoice.dueDate >= today, `${invoice.invoiceNumber} confirmed invoice is already due`);
    }
  }
  assert(overdue === 7, `Expected 7 overdue invoices, got ${overdue}`);

  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'idx_sub_status_next_billing',
        'idx_sub_customer_status',
        'idx_sub_plan',
        'idx_inv_status_due_date',
        'idx_inv_customer',
        'idx_inv_subscription',
        'idx_inv_idempotency',
        'idx_payment_invoice',
        'idx_audit_entity'
      )
  `;
  assert(indexes.length === 9, `Expected 9 composite indexes, found ${indexes.length}`);

  const summary = {
    users,
    customers,
    products,
    variants,
    plans,
    taxes,
    discounts,
    subscriptions,
    invoices,
    payments,
    subscriptionStatus: Object.fromEntries(statusGroups.map((group) => [group.status, group._count])),
    invoiceStatus: Object.fromEntries(invoiceGroups.map((group) => [group.status, group._count])),
    odooBrandPriceExtra: Number(odoo.priceExtra),
  };

  console.log("Seed verified");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
