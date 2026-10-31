# Subscription Management System

A platform to manage products, plans, subscriptions, invoices, payments, and revenue for subscription-based businesses.

Built for the **Odoo Hackathon**. Brightloop Software sells software on subscription. This system replaces the spreadsheets, hand-typed invoices, and quarterly revenue reports with one billing workspace.

## Stack

- Next.js 15 (App Router) and React 19
- TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL 16 and Prisma ORM

## Getting started

1. Start PostgreSQL:

```bash
docker compose up -d
```

2. Copy the environment file if you do not already have one:

```bash
copy .env.example .env
```

3. Install dependencies, apply the migration, and seed:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

The seed loads an admin, two staff users, five customers, the product catalog (including the Odoo Brand variant at +560), daily through yearly plans, GST and VAT, both discount rules, 25 subscriptions, and 35 invoices with payments.

| Role | Email | Password |
|---|---|---|
| Admin | admin@brightloop.com | Admin#Pass123 |
| Staff | staff1@brightloop.com | Staff#Pass123 |
| Staff | staff2@brightloop.com | Staff#Pass123 |
| Customer | the five seeded company emails | Customer#Pass123 |

4. Start the app:

```bash
npm run dev
```

## Status

Database schema and seed data are in place. Authentication, billing services, and the workspace UI come next.
