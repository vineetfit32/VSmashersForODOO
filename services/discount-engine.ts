import { cents, fromCents } from "@/services/money";
import { isAfterDate, isBeforeDate } from "@/services/dates";

export interface DiscountRuleInput {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minPurchaseAmount?: number | null;
  minQuantity?: number | null;
  startDate: Date;
  endDate: Date;
  maxUsageCount?: number | null;
  currentUsageCount: number;
  appliesTo: "WHOLE_SUBSCRIPTION" | "SPECIFIC_PRODUCTS";
  targetProductIds?: string[];
  isActive: boolean;
}

export type DiscountDecision = {
  eligible: boolean;
  discountAmount: number;
  reason?: string;
};

function decline(reason: string): DiscountDecision {
  return { eligible: false, discountAmount: 0, reason };
}

export function validateAndApplyDiscount(
  rule: DiscountRuleInput,
  currentSubtotal: number,
  totalQuantity: number,
  currentDate: Date = new Date(),
  productId?: string,
): DiscountDecision {
  if (!rule.isActive) return decline("Inactive rule");

  if (rule.appliesTo === "SPECIFIC_PRODUCTS") {
    const targets = rule.targetProductIds ?? [];
    if (!productId || !targets.includes(productId)) {
      return decline("Discount does not apply to this product");
    }
  }

  if (isBeforeDate(currentDate, rule.startDate) || isAfterDate(currentDate, rule.endDate)) {
    return decline("Discount date expired or not yet active");
  }

  if (rule.maxUsageCount != null && rule.currentUsageCount >= rule.maxUsageCount) {
    return decline("Discount usage limit reached");
  }

  if (rule.minPurchaseAmount && currentSubtotal < rule.minPurchaseAmount) {
    return decline("Minimum purchase amount not met");
  }

  if (rule.minQuantity && totalQuantity < rule.minQuantity) {
    return decline("Minimum quantity threshold not met");
  }

  const subtotalCents = Math.max(0, cents(currentSubtotal));
  let discountCents = 0;
  if (rule.type === "PERCENTAGE") {
    discountCents = Math.round((subtotalCents * rule.value) / 100);
  } else {
    discountCents = Math.min(cents(rule.value), subtotalCents);
  }

  return { eligible: true, discountAmount: fromCents(discountCents) };
}

export const DiscountEngine = {
  validateAndApplyDiscount,
};
