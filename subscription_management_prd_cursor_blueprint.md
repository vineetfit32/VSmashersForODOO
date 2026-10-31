# SUBSCRIPTION MANAGEMENT SYSTEM (BILLPILOT)
## Production-Grade PRD, System Architecture & Cursor / Grok 4.7 Execution Blueprint
**Target Platform:** Fullstack Recurring Billing & Subscription SaaS (Odoo Style)  
**Hackathon:** Odoo x FLUX Lucknow Hackathon '26 (Virtual Round)  
**Evaluation Standard:** Enterprise-Grade / Claude Opus 5.5 Spec Standard  

---

## 1. Executive Summary & Problem Context

### 1.1 The Business Challenge (Billpilot Software)
Billpilot Software sells recurring business software, modular add-ons, and multi-variant products billed across various billing frequencies (monthly, yearly, weekly, daily). Today, the business is handicapped by manual spreadsheets, missed renewals, manual invoice drafting, manual bank statement reconciliation, and untracked recurring revenue (MRR/ARR).

### 1.2 Target System Goal
Build a unified, robust, high-performance web platform that automates the complete subscription lifecycle:
1. **Self-Service & RBAC**: Customer registration with strict password policies and role-based access for Admin, Internal Staff, and Customers.
2. **Catalog & Plan Engine**: Multi-variant products (e.g. Odoo brand addon pricing) and flexible subscription plans (daily, weekly, monthly, yearly) with configurable lifecycles (auto-close, early close, pause, renew).
3. **Quotation to Subscription Lifecycle**: Quotation templates with validity windows moving through a strict state machine: `Draft` → `Quotation` → `Confirmed` → `Active` → `Closed`.
4. **Idempotent Billing & Tax Engine**: Automated batch invoicing that prevents double-billing or skipped cycles, with dynamic tax rules.
5. **Smart Discount Engine**: Automated fixed or percentage discounts with quantity thresholds, validity windows, and usage caps that apply to products or whole subscriptions and automatically retire once consumed.
6. **Payment Reconciliation**: Multi-method payment capture (Bank Transfer, Credit Card, UPI, Cheque, Cash) with real-time balance tracking and overdue detection.
7. **Executive Finance Analytics**: Real-time calculation of Active Subscriptions, Cash Collected, Accounts Receivable (Owed), Overdue Invoices, MRR, and ARR.
8. **Performance & Scale SLA**: All pages and dashboards must respond in **under 2.0 seconds** under a load of tens of thousands of subscription and invoice records.

---

## 2. System Architecture & Tech Stack

To ensure blistering speed (<2s page load SLA), zero runtime drift, and effortless scaffolding in Cursor with Grok 4.7, the architecture is built on a modern, typed, local-first web stack:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15 / React 19)                │
│  - Shadcn UI + Tailwind CSS (Odoo Design System: Kanban, List, Form)   │
│  - TanStack Table v8 (Virtual scrolling, instant multi-filter, sort)    │
│  - React Hook Form + Zod (Strict schema validation)                    │
│  - Lucide Icons + Recharts (Finance MRR/ARR Visuals)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON / REST / Server Actions
┌───────────────────────────────────▼────────────────────────────────────┐
│                  APPLICATION BACKEND & DOMAIN SERVICES                 │
│  - Next.js 15 App Router API Routes / Node.js TypeScript Service       │
│  - Auth: Jose / JWT + HTTP-Only Secure Cookies + RBAC Middleware       │
│  - State Machine Engine: Finite State Machine transitions for Sub/Inv   │
│  - Billing Engine: Cron/Worker idempotent invoice generation pipeline   │
│  - PDF Rendering: @react-pdf/renderer or Puppeteer for Invoices        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Connection Pool (PgBouncer / Pool)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    DATABASE (PostgreSQL 16 + Prisma/Drizzle)           │
│  - Fully indexed relational schema (Compound B-Tree & Hash indexes)    │
│  - ACID Transactions for invoicing and payment reconciliation          │
│  - Database Views & Aggregates for Finance Lead Dashboard              │
└────────────────────────────────────────────────────────────────────────┘
```

### Stack Components:
- **Framework:** Next.js 15 (App Router, Server Components + API routes) or Vite React + Node/Express (TypeScript).
- **Database:** PostgreSQL (with Docker Compose for instantaneous local bootup).
- **ORM / Query Builder:** Prisma ORM or Drizzle ORM (type-safe queries, automatic migrations, seed scripts).
- **UI Library:** Shadcn UI + Tailwind CSS (Radix UI primitives for accessible modals, dropdowns, popovers, tabs).
- **Tables & Filtering:** TanStack Table v8 (enables sub-second search and filtering on 10,000+ client/server records).
- **State Machine:** Deterministic transition validators preventing illegal state jumps.
- **Reporting & Charts:** Recharts (responsive MRR, ARR, churn, and cash flow visualizations).

---

## 3. Strict Role-Based Access Control (RBAC) & Authentication

### 3.1 Security & Password Rules
- **Unique Account Identifier:** Each email address belongs to exactly one account.
- **Password Complexity Regex:** `^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]).{9,}$`
  - Minimum length: strictly **> 8 characters** (at least 9 characters).
  - At least 1 uppercase letter (`[A-Z]`).
  - At least 1 lowercase letter (`[a-z]`).
  - At least 1 special character (`[!@#$%^&*...]`).
- **Password Reset:** Token-based reset endpoint generating a secure, time-limited cryptographic hash token sent to the registered email.

### 3.2 Access Control Matrix

| Feature / Resource | Admin | Internal Staff | Customer (Portal) |
|---|:---:|:---:|:---:|
| User Management (Create Staff/Assign Roles) | Read/Write/Delete | No Access | No Access |
| Product & Variant Catalog | Read/Write/Delete | Read Only | Read Only (Public) |
| Subscription Plan Configuration | Read/Write/Delete | Read Only | Read Only (Public) |
| Tax Rules Setup | Read/Write/Delete | Read Only | No Access |
| Discount Rules Setup | Read/Write/Delete | Read Only | No Access |
| Quotation Templates | Read/Write/Delete | Read/Write | No Access |
| Quotations & Subscriptions | Full Control | Full Control | Read Own / Accept Quote |
| Invoicing & Batch Generation | Full Control | Full Control | Read & Print Own |
| Payment Recording | Full Control | Full Control | View Own Payments |
| Finance Analytics Dashboard | Full View (All Metrics) | Operational View | No Access |
| Customer Portal View | Admin Switcher | Staff Switcher | Strict Self-View Only |

---

## 4. Complete Database Schema (PostgreSQL DDL)

Here is the exact schema with all constraints, foreign keys, compound indexes, and default values:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');
CREATE TYPE product_type AS ENUM ('SOFTWARE', 'SERVICE', 'ADDON', 'PHYSICAL');
CREATE TYPE billing_interval AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE subscription_status AS ENUM ('DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED', 'OVERDUE');
CREATE TYPE payment_method AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'UPI', 'CHEQUE', 'CASH');
CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE discount_target AS ENUM ('WHOLE_SUBSCRIPTION', 'SPECIFIC_PRODUCTS');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    billing_address TEXT,
    payment_terms_days INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type product_type NOT NULL DEFAULT 'SOFTWARE',
    sales_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Product Variants Table
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL, -- e.g. "Brand", "Tier"
    attribute_value VARCHAR(100) NOT NULL, -- e.g. "Odoo", "Enterprise"
    price_extra NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- e.g. +560.00
    sku VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Subscription Plans Table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    interval billing_interval NOT NULL DEFAULT 'MONTHLY',
    interval_count INT NOT NULL DEFAULT 1,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_quantity INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL means ongoing
    auto_close BOOLEAN NOT NULL DEFAULT FALSE,
    allow_early_close BOOLEAN NOT NULL DEFAULT TRUE,
    allow_pause BOOLEAN NOT NULL DEFAULT TRUE,
    allow_renew BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tax Rules Table
CREATE TABLE tax_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- e.g. "GST 18%", "Standard VAT 20%"
    rate_percent NUMERIC(5, 2) NOT NULL,
    is_compound BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Discount Rules Table
CREATE TABLE discount_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type discount_type NOT NULL DEFAULT 'PERCENTAGE',
    value NUMERIC(12, 2) NOT NULL, -- Percentage (e.g. 15.00) or Fixed (e.g. 500.00)
    min_purchase_amount NUMERIC(12, 2) DEFAULT 0.00,
    min_quantity INT DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_usage_count INT DEFAULT NULL, -- NULL = unlimited
    current_usage_count INT NOT NULL DEFAULT 0,
    applies_to discount_target NOT NULL DEFAULT 'WHOLE_SUBSCRIPTION',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7b. Discount Products Mapping Table (for SPECIFIC_PRODUCTS)
CREATE TABLE discount_rule_products (
    discount_rule_id UUID NOT NULL REFERENCES discount_rules(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_rule_id, product_id)
);

-- 8. Quotation Templates Table
CREATE TABLE quotation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    validity_days INT NOT NULL DEFAULT 15,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quotation_template_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    default_quantity INT NOT NULL DEFAULT 1
);

-- 9. Subscriptions Table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. "SUB-2026-0001"
    customer_id UUID NOT NULL REFERENCES customers(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status subscription_status NOT NULL DEFAULT 'DRAFT',
    start_date DATE NOT NULL,
    expiry_date DATE,
    next_billing_date DATE,
    quotation_valid_until DATE,
    payment_terms_days INT NOT NULL DEFAULT 30,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Subscription Lines Table
CREATE TABLE subscription_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    tax_rule_id UUID REFERENCES tax_rules(id),
    discount_rule_id UUID REFERENCES discount_rules(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 11. Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. "INV-2026-0001"
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    status invoice_status NOT NULL DEFAULT 'DRAFT',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    period_start DATE,
    period_end DATE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    idempotency_key VARCHAR(128) UNIQUE, -- hash(sub_id, period_start, period_end)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Invoice Lines Table
CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 13. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. "PAY-2026-0001"
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL,
    method payment_method NOT NULL DEFAULT 'BANK_TRANSFER',
    reference_note TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Chatter / Audit Log Table (Odoo Feature)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_name VARCHAR(50) NOT NULL, -- 'subscription', 'invoice', 'plan'
    entity_id UUID NOT NULL,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- e.g. "STATUS_CHANGE", "PAYMENT_RECORDED"
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- HIGH-PERFORMANCE INDEXES (Mandatory for <2s SLA on 10,000+ records)
-- ============================================================================
CREATE INDEX idx_sub_status_next_billing ON subscriptions (status, next_billing_date);
CREATE INDEX idx_sub_customer_status ON subscriptions (customer_id, status);
CREATE INDEX idx_sub_plan ON subscriptions (plan_id);
CREATE INDEX idx_inv_status_due_date ON invoices (status, due_date);
CREATE INDEX idx_inv_customer ON invoices (customer_id);
CREATE INDEX idx_inv_subscription ON invoices (subscription_id);
CREATE INDEX idx_inv_idempotency ON invoices (idempotency_key);
CREATE INDEX idx_payment_invoice ON payments (invoice_id);
CREATE INDEX idx_audit_entity ON audit_logs (entity_name, entity_id);
```

---

## 5. Domain Logic & State Machine Invariants

### 5.1 Subscription Finite State Machine (FSM)
The subscription entity must strictly transition across the following valid paths:

```
┌─────────┐   Send Quote    ┌─────────────┐   Accept Quote    ┌─────────────┐
│  DRAFT  │ ──────────────> │  QUOTATION  │ ────────────────> │  CONFIRMED  │
└─────────┘                 └─────────────┘                   └──────┬──────┘
                                                                     │ Start Date reached / Activate
                                                                     ▼
┌─────────┐      End Date / Close Early                       ┌─────────────┐
│ CLOSED  │ <──────────────────────────────────────────────── │   ACTIVE    │ ◄───┐
└─────────┘                                                   └──────┬──────┘     │ Resume
                                                                     │ Pause      │
                                                                     ▼            │
                                                              ┌─────────────┐     │
                                                              │   PAUSED    │ ────┘
                                                              └─────────────┘
```

#### State Transition Rules:
1. `DRAFT` → `QUOTATION`: Validates customer details, lines, and minimum plan quantities. Sets `quotation_valid_until = today + template.validity_days`.
2. `QUOTATION` → `CONFIRMED`: Customer signs/accepts quote online via the customer portal or staff confirms manual receipt. If quote expired (`today > quotation_valid_until`), transition is rejected unless renewed.
3. `CONFIRMED` → `ACTIVE`: Triggered when `start_date <= today`. Sets `next_billing_date = start_date`.
4. `ACTIVE` → `PAUSED`: Only permissible if `subscription_plans.allow_pause == TRUE`. Freezes recurring billing date increments.
5. `PAUSED` → `ACTIVE`: Resumes billing schedule; recalculates `next_billing_date`.
6. `ACTIVE` → `CLOSED`:
   - Auto-close: If `subscription_plans.auto_close == TRUE` and `expiry_date` is reached.
   - Early close: If `subscription_plans.allow_early_close == TRUE`, staff or customer can initiate early termination.

### 5.2 Invoicing Finite State Machine (FSM)
```
┌─────────┐   Confirm / Post   ┌─────────────┐   Full Balance Paid   ┌──────────┐
│  DRAFT  │ ─────────────────> │  CONFIRMED  │ ────────────────────> │   PAID   │
└────┬────┘                    └──────┬──────┘                       └──────────┘
     │ Cancel                         │ Cancel / Void
     ▼                                ▼
┌──────────┐                   ┌─────────────┐
│ CANCELLED│                   │  CANCELLED  │
└──────────┘                   └─────────────┘
                               (If due_date < today AND balance_due > 0 => Status Flag OVERDUE)
```

- When an invoice is `CONFIRMED`, `balance_due = grand_total - amount_paid`.
- Each payment recorded against an invoice decreases `balance_due` and increases `amount_paid`.
- When `balance_due == 0`, invoice status immediately switches to `PAID`.
- Invoices past their `due_date` with `balance_due > 0` are dynamically marked/filtered as `OVERDUE`.

---

## 6. The Idempotent Billing Engine (Scene 4 Automation)

To process hundreds or thousands of recurring subscriptions on "Billing Day" without duplicate billing or skipped cycles:

### 6.1 Idempotency Key Specification
Every recurring invoice generation job creates a deterministic unique key:
$$	ext{idempotency\_key} = 	ext{SHA256}(	ext{subscription\_id} + 	ext{":"} + 	ext{period\_start} + 	ext{":"} + 	ext{period\_end})$$
If a race condition occurs or the job runs twice on the same day, the database unique constraint on `idempotency_key` rejects duplicate inserts instantly with zero side effects.

### 6.2 Billing Execution Algorithm (Step-by-Step)
1. **Query Due Subscriptions:**
   ```sql
   SELECT * FROM subscriptions 
   WHERE status = 'ACTIVE' 
     AND next_billing_date <= CURRENT_DATE 
     AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
   ORDER BY next_billing_date ASC 
   LIMIT 100 FOR UPDATE SKIP LOCKED;
   ```
2. **Calculate Period Bounds:**
   - `period_start = subscription.next_billing_date`
   - `period_end = compute_next_interval(period_start, plan.interval, plan.interval_count) - 1 day`
3. **Evaluate Discounts:**
   - For each active discount attached to the subscription or lines:
     - Check `start_date <= period_start` and `end_date >= period_start`.
     - Check `max_usage_count IS NULL OR current_usage_count < max_usage_count`.
     - Check `min_purchase_amount` or `min_quantity` thresholds.
     - If valid: apply discount and atomically increment `current_usage_count = current_usage_count + 1`.
     - If expired or exhausted: detach or skip discount rule without failing invoice creation.
4. **Calculate Taxes:**
   - Apply active tax rule percentage to line subtotals.
   - Aggregate line taxes into `tax_total`.
5. **Insert Invoice & Lines inside DB Transaction:**
   - Create invoice record with status `DRAFT` or `CONFIRMED`.
   - Set `due_date = issue_date + customer.payment_terms_days`.
6. **Advance Next Billing Date:**
   - `subscription.next_billing_date = compute_next_interval(subscription.next_billing_date, plan.interval, plan.interval_count)`.
   - If `plan.auto_close == TRUE` and `next_billing_date > expiry_date`, set `subscription.status = 'CLOSED'`.

---

## 7. Discount Engine Specification (Scene 5)

Discounts must be fully autonomous. The rules are defined by the Admin, evaluated during quote generation, and dynamically re-evaluated on each billing cycle.

### 7.1 Discount Validation Rules
```typescript
interface DiscountRule {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number; // e.g. 15 for 15% or 500 for ₹500
  minPurchaseAmount?: number;
  minQuantity?: number;
  startDate: Date;
  endDate: Date;
  maxUsageCount?: number | null;
  currentUsageCount: number;
  appliesTo: 'WHOLE_SUBSCRIPTION' | 'SPECIFIC_PRODUCTS';
  targetProductIds?: string[];
  isActive: boolean;
}

export function validateAndApplyDiscount(
  rule: DiscountRule,
  currentSubtotal: number,
  totalQuantity: number,
  currentDate: Date = new Date()
): { eligible: boolean; discountAmount: number; reason?: string } {
  if (!rule.isActive) return { eligible: false, discountAmount: 0, reason: "Inactive rule" };
  if (currentDate < rule.startDate || currentDate > rule.endDate) {
    return { eligible: false, discountAmount: 0, reason: "Discount date expired or not yet active" };
  }
  if (rule.maxUsageCount !== null && rule.currentUsageCount >= rule.maxUsageCount) {
    return { eligible: false, discountAmount: 0, reason: "Discount usage limit reached" };
  }
  if (rule.minPurchaseAmount && currentSubtotal < rule.minPurchaseAmount) {
    return { eligible: false, discountAmount: 0, reason: "Minimum purchase amount not met" };
  }
  if (rule.minQuantity && totalQuantity < rule.minQuantity) {
    return { eligible: false, discountAmount: 0, reason: "Minimum quantity threshold not met" };
  }

  let discountAmount = 0;
  if (rule.type === 'PERCENTAGE') {
    discountAmount = (currentSubtotal * rule.value) / 100;
  } else {
    discountAmount = Math.min(rule.value, currentSubtotal);
  }

  return { eligible: true, discountAmount };
}
```

---

## 8. Finance Lead Reporting & Analytics (Scene 7)

The Finance Lead requires an instant executive dashboard that answers 5 critical questions in **under 2 seconds**:

### 8.1 Key Metrics Formulas
1. **Active Subscriptions Count:**
   $$	ext{Active Subscriptions} = 	ext{COUNT}(	ext{subscriptions WHERE status = 'ACTIVE'}) \quad [	ext{Index: } 	exttt{idx\_sub\_status\_next\_billing}]$$
2. **Monthly Recurring Revenue (MRR):**
   $$	ext{MRR} = \sum_{s \in 	ext{Active Subscriptions}} 	ext{NormalizeToMonthly}(s.	ext{grand\_total}, s.	ext{interval})$$
   - Daily: $	ext{Total} 	imes 30$
   - Weekly: $	ext{Total} 	imes 4.33$
   - Monthly: $	ext{Total} 	imes 1.0$
   - Yearly: $	ext{Total} / 12.0$
3. **Annual Recurring Revenue (ARR):**
   $$	ext{ARR} = 	ext{MRR} 	imes 12$$
4. **Total Revenue Collected (Cash Flow):**
   $$	ext{Revenue In} = \sum 	ext{payments.amount WHERE payment\_date BETWEEN start AND end}$$
5. **Outstanding Accounts Receivable (Still Owed):**
   $$	ext{Total Owed} = \sum 	ext{invoices.balance\_due WHERE status IN ('CONFIRMED', 'OVERDUE')}$$
6. **Overdue Invoices Count & Amount:**
   $$	ext{Overdue Amount} = \sum 	ext{invoices.balance\_due WHERE due\_date < CURRENT\_DATE AND balance\_due > 0}$$

### 8.2 Optimized PostgreSQL Reporting View (Sub-Second Response)
```sql
CREATE OR REPLACE VIEW finance_summary_analytics AS
SELECT
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE') AS active_subscriptions_count,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date >= date_trunc('month', CURRENT_DATE)) AS monthly_collected_cash,
    (SELECT COALESCE(SUM(balance_due), 0) FROM invoices WHERE status IN ('CONFIRMED') AND due_date >= CURRENT_DATE) AS current_outstanding_ar,
    (SELECT COALESCE(SUM(balance_due), 0) FROM invoices WHERE (status = 'OVERDUE' OR (status = 'CONFIRMED' AND due_date < CURRENT_DATE)) AND balance_due > 0) AS total_overdue_ar,
    (SELECT COUNT(*) FROM invoices WHERE (status = 'OVERDUE' OR (status = 'CONFIRMED' AND due_date < CURRENT_DATE)) AND balance_due > 0) AS overdue_invoices_count;
```

---

## 9. Performance & Scalability Tweaks (< 2s SLA)

To ensure this app easily sails through high-concurrency evaluation during the hackathon:

1. **Composite Database Indexing:** 
   - `subscriptions (status, next_billing_date)` enables instantaneous index-only scans for the billing engine.
   - `invoices (status, due_date)` eliminates table scans for overdue invoice lookups.
2. **Server-Side Pagination:** 
   - Never load unpaginated arrays. Use `LIMIT 25 OFFSET (page-1)*25` or cursor-based pagination with indexed sort keys.
3. **Database Connection Pooling:** 
   - Configure PgBouncer or connection pool size to max 20 connections to avoid thread starvation.
4. **Lightweight Edge UI Caching:** 
   - Statically revalidate product catalog and tax rules using React Server Components `stale-while-revalidate` (SWR) cache tags.
5. **Idempotent Batch Billing:** 
   - Process billing in transactions with `SKIP LOCKED` so multiple background workers can scale horizontally without deadlock.

---

## 10. Odoo-Style UI / UX Guidelines

The evaluation team values the clean, structured workflow of Odoo ERP. Implement the following UI conventions:

1. **Top Status Pipeline (Odoo Chevron / Stage Bar):**
   - On Subscriptions: `Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed`
   - On Invoices: `Draft` ➔ `Confirmed` ➔ `Paid`
   - Clearly highlight current active stage with primary color, past stages with soft success color, and future stages with light neutral.
2. **Action Bar ("Odoo Smart Buttons"):**
   - In Subscription Form View: Top stat buttons for `Invoices (count)`, `Customer Preview`, `Pause / Resume`, `Renew`.
   - In Invoice Form View: Buttons for `Register Payment`, `Print PDF`, `Send by Email`, `Cancel`.
3. **Dual View Architecture (List View + Form View + Kanban View):**
   - **List View:** Dense, sortable table with multi-select checkboxes, search bar with filter chips (`Active Subscriptions`, `Overdue Invoices`), and export capability.
   - **Kanban View:** Visual card columns grouped by status.
   - **Form View:** Two-column sheet header (Customer, Date, Plan) + Tabbed lines (Products, Invoicing & Payments, Chatter/Audit Notes).
4. **The Chatter / Activity History:**
   - Below every main form (Subscription & Invoice), provide a clean activity feed showing who changed what, state transitions, and payment logs with timestamps.

---

## 11. Step-by-Step Cursor & Grok 4.7 Execution Prompts

To feed this into Cursor using Grok 4.7, follow this phased execution blueprint:

### Phase 1: Project Scaffolding & Database Setup
```text
@cursor You are a Principal Fullstack Engineer building the Billpilot Subscription Management System for the Odoo Hackathon.
Strictly adhere to the PRD in SUBSCRIPTION_MANAGEMENT_PRD_CURSOR_BLUEPRINT.md.
Step 1:
1. Initialize a Next.js 15 project with TypeScript, Tailwind CSS, and Shadcn UI.
2. Setup Prisma ORM connected to PostgreSQL. Create the schema matching Section 4 of the PRD with all tables, enums, relations, and indexes.
3. Generate a seed script (prisma/seed.ts) that populates:
   - 1 Admin user (admin@billpilot.com / Admin#Pass123)
   - 2 Staff users (staff1@billpilot.com, staff2@billpilot.com)
   - 5 Customers with full billing details
   - Products with variants (including 'Odoo Brand' variant adding +560.00)
   - Plans (Daily, Weekly, Monthly, Yearly) with auto_close and pause flags
   - 2 Tax rules (GST 18%, VAT 20%)
   - 2 Discount rules (15% off with min qty 5; Fixed ₹500 off)
   - 1 Quotation Template with 15-day validity
   - 20 realistic subscriptions across Draft, Quotation, Confirmed, Active, and Closed states
   - 30 invoices (Draft, Confirmed, Paid, Overdue) and matching payments.
Run migrations and verify seed completes without error.
```

### Phase 2: Authentication & RBAC Middleware
```text
@cursor Build the Authentication & Role-Based Access Control layer:
1. Implement JWT-based auth with HTTP-only secure cookies.
2. Build /api/auth/register with strict password validation: > 8 chars, at least 1 uppercase, 1 lowercase, 1 special character.
3. Build /api/auth/login, /api/auth/logout, and /api/auth/forgot-password (token-based reset).
4. Create middleware that guards routes by role:
   - /admin/** -> ADMIN only
   - /app/** -> ADMIN, STAFF
   - /portal/** -> CUSTOMER (isolated to customer's own data)
5. Build a role switcher in the development header so the evaluator can test as Admin, Staff, or Customer in 1 click.
```

### Phase 3: Core Domain Services (Subscriptions, Invoices, Payments)
```text
@cursor Implement the Core Domain Services & API Routes:
1. Product & Plan Service: CRUD with variant price calculation.
2. Subscription State Machine Service: Enforce transitions (Draft -> Quotation -> Confirmed -> Active -> Closed/Paused). Prevent illegal jumps.
3. Discount Engine: Implement validateAndApplyDiscount() supporting both percentage and fixed discounts, expiration, and usage limits.
4. Billing Engine Service: Implement generateRecurringInvoices() with idempotency_key hashing, batch processing, and next_billing_date advancement. Add a manual 'Run Billing Cycle' button in Admin for demo purposes.
5. Payment Recording Service: Atomic transaction recording payments, reducing balance_due, and setting status to 'PAID' when balance reaches zero.
```

### Phase 4: Odoo-Style Frontend UI
```text
@cursor Build the Frontend User Interface using Shadcn UI:
1. Implement Odoo-style Navigation: Header with breadcrumbs and app switcher, left sidebar with Subscriptions, Invoices, Payments, Products, Discounts, and Finance Dashboard.
2. Subscription Views:
   - List View: TanStack table with search, status filters, and sorting.
   - Form View: Top chevron status pipeline, Smart Stat buttons, line items editor, and Chatter audit log.
3. Invoice Views: Status pipeline (Draft -> Confirmed -> Paid), Register Payment modal, and PDF export preview.
4. Finance Lead Dashboard: Real-time metric cards (Active Subscriptions, Monthly Cash In, AR Owed, Overdue Amount, MRR, ARR) and interactive revenue charts.
5. Customer Portal: Clean, responsive self-service view where logged-in customers view and print their own subscriptions and invoices.
```

---

## 12. Hackathon & Evaluator Submission Compliance

### 12.1 Mandatory Git Commit Protocol
- **Commit Cadence:** As mandated by Odoo, push to the `main` branch **at least once every 1 hour**.
- **Conventional Commit Format:**
  - `feat(auth): implement password regex and jwt session management`
  - `feat(catalog): add products with odoo brand variant pricing`
  - `feat(subscriptions): implement fsm state machine and quote templates`
  - `feat(billing): create idempotent recurring invoice generation worker`
  - `feat(discounts): add dynamic discount rule validator with usage limits`
  - `feat(payments): atomic invoice payment reconciliation and overdue flags`
  - `feat(analytics): build finance lead dashboard with mrr/arr calculations`
  - `perf(db): add compound b-tree indexes for <2s page response time`

### 12.2 Evaluator Collaborator Setup
Add the designated Odoo evaluator email (found in your hackathon portal) as a collaborator on your GitHub repository before the 10:00 AM cutoff.

### 12.3 5-6 Minute Functional Demo Video Walkthrough Script
Follow the exact 7 scenes from the problem statement:
- **0:00 - 0:45 (Scene 1: Customer Signup & RBAC):** Show signup with password complexity error, successful creation, and switch between Admin, Staff, and Customer views.
- **0:45 - 1:30 (Scene 2: Products & Plans):** Create a product, add an "Odoo Brand" variant adding +560, and configure a monthly plan with auto-close or pause settings.
- **1:30 - 2:30 (Scene 3: Quote to Subscription):** Pick a quotation template, generate a quote with 15-day validity, transition it through Draft ➔ Quotation ➔ Confirmed ➔ Active.
- **2:30 - 3:30 (Scene 4: Billing Day & Taxes):** Click "Trigger Billing Cycle". Show automatic invoice creation with idempotency, tax calculation, and next billing date increment.
- **3:30 - 4:15 (Scene 5: Discounts):** Create a discount rule (e.g. 15% off for >5 seats), demonstrate automatic line application, and show how expired discounts stop applying.
- **4:15 - 5:00 (Scene 6: Payments & Overdue):** Record a payment with method, date, and note. Show the balance decrease and status switch to Paid. Highlight overdue invoices.
- **5:00 - 5:45 (Scene 7: Finance Lead Dashboard):** Open Finance Dashboard. Showcase instant (<2s) loading of Active Subscriptions, MRR, ARR, Cash In, and Outstanding Receivables.
