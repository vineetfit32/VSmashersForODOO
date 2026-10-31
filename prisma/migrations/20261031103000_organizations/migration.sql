CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

INSERT INTO "organizations" ("id", "name", "slug")
VALUES ('11111111-1111-4111-8111-111111111111', 'Billpilot Demo', 'billpilot-demo');

ALTER TABLE "users" ADD COLUMN "organization_id" UUID;
ALTER TABLE "customers" ADD COLUMN "organization_id" UUID;
ALTER TABLE "products" ADD COLUMN "organization_id" UUID;
ALTER TABLE "subscription_plans" ADD COLUMN "organization_id" UUID;
ALTER TABLE "tax_rules" ADD COLUMN "organization_id" UUID;
ALTER TABLE "discount_rules" ADD COLUMN "organization_id" UUID;
ALTER TABLE "quotation_templates" ADD COLUMN "organization_id" UUID;

UPDATE "users" SET "organization_id" = '11111111-1111-4111-8111-111111111111';
UPDATE "customers" SET "organization_id" = '11111111-1111-4111-8111-111111111111';
UPDATE "products" SET "organization_id" = '11111111-1111-4111-8111-111111111111';
UPDATE "subscription_plans" SET "organization_id" = '11111111-1111-4111-8111-111111111111';
UPDATE "tax_rules" SET "organization_id" = '11111111-1111-4111-8111-111111111111';
UPDATE "discount_rules" SET "organization_id" = '11111111-1111-4111-8111-111111111111';
UPDATE "quotation_templates" SET "organization_id" = '11111111-1111-4111-8111-111111111111';

ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "subscription_plans" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "tax_rules" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "discount_rules" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "quotation_templates" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_templates" ADD CONSTRAINT "quotation_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE INDEX "customers_organization_id_idx" ON "customers"("organization_id");
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");
CREATE INDEX "subscription_plans_organization_id_idx" ON "subscription_plans"("organization_id");
CREATE INDEX "tax_rules_organization_id_idx" ON "tax_rules"("organization_id");
CREATE INDEX "discount_rules_organization_id_idx" ON "discount_rules"("organization_id");
CREATE INDEX "quotation_templates_organization_id_idx" ON "quotation_templates"("organization_id");

DROP INDEX "subscription_plans_code_key";
DROP INDEX "discount_rules_code_key";
DROP INDEX "product_variants_sku_key";

CREATE UNIQUE INDEX "subscription_plans_organization_id_code_key" ON "subscription_plans"("organization_id", "code");
CREATE UNIQUE INDEX "discount_rules_organization_id_code_key" ON "discount_rules"("organization_id", "code");
