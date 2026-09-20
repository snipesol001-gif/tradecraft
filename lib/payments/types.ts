// The payment provider contract. Paystack implements this today; another
// provider would be one more adapter file plus a registry line.

export type PremiumPlan = "weekly" | "monthly" | "premium_plus";

export type InitializedPayment = {
  authorizationUrl: string;
  reference: string;
};

export type VerifiedPayment = {
  status: "success" | "failed" | "pending" | "abandoned";
  amountKobo: number;
  plan: PremiumPlan;
  uid: string;
  paidAtMs: number | null;
};