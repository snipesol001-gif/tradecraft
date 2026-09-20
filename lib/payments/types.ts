// The payment provider contract. Paystack implements this today; another
// provider (Flutterwave) would be one more adapter file plus a registry
// line, not a rewrite.

export type PremiumPlan = "weekly" | "monthly";

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