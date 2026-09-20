// Premium pricing and plan config, read from config/premium. Editable
// by the owner without deploys. Amounts here are NAIRA; Paystack wants
// KOBO. Plans: Premium (weekly) and Premium+ (monthly, everything in
// Premium plus unlimited credits, background discovery, full theme
// library).

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";
import type { PremiumPlan } from "./payments/types";

export type PremiumPlansConfig = {
  paymentsEnabled: boolean;
  weeklyPriceNaira: number;
  monthlyPriceNaira: number;
  weeklyDays: number;
  monthlyDays: number;
  premiumPlusMonthlyNaira: number;
  premiumPlusDays: number;
  premiumPlusEnabled: boolean;
};

export async function getPremiumPlansConfig(): Promise<PremiumPlansConfig> {
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("config").doc("premium").get();
  const d = snap.data() ?? {};
  return {
    paymentsEnabled: d.paymentsEnabled === true,
    weeklyPriceNaira: typeof d.weeklyPriceNaira === "number" ? d.weeklyPriceNaira : 500,
    monthlyPriceNaira: typeof d.monthlyPriceNaira === "number" ? d.monthlyPriceNaira : 2000,
    weeklyDays: typeof d.weeklyDays === "number" ? d.weeklyDays : 7,
    monthlyDays: typeof d.monthlyDays === "number" ? d.monthlyDays : 30,
    premiumPlusMonthlyNaira:
      typeof d.premiumPlusMonthlyNaira === "number" ? d.premiumPlusMonthlyNaira : 2000,
    premiumPlusDays: typeof d.premiumPlusDays === "number" ? d.premiumPlusDays : 30,
    premiumPlusEnabled: d.premiumPlusEnabled === true,
  };
}

// Legacy plan helpers, kept for the existing weekly/monthly checkout.
export function planDays(plan: PremiumPlan, config: PremiumPlansConfig): number {
  return plan === "monthly" ? config.monthlyDays : config.weeklyDays;
}

export function planPriceNaira(plan: PremiumPlan, config: PremiumPlansConfig): number {
  return plan === "monthly" ? config.monthlyPriceNaira : config.weeklyPriceNaira;
}