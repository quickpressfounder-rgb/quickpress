// Rider wallet & earnings data layer — backed by real FastAPI + MongoDB Atlas database.
import { apiGetJson, apiPostJson } from "../core/transport";

export interface RiderWalletDetail {
  id?: string;
  riderId?: string;
  rider_id?: string;
  balance: number;
  availableBalance?: number;
  pending?: number;
  pendingSettlement?: number;
  lifetimeEarnings: number;
  todayEarned?: number;
  thisWeekEarned?: number;
  totalWithdrawn?: number;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  ifsc?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RiderWalletTransaction {
  id: string;
  _id?: string;
  riderId?: string;
  title: string;
  date: string;
  amount: number;
  direction: "credit" | "debit";
  status: "success" | "pending" | "failed";
  kind: "trip" | "incentive" | "tip" | "withdrawal";
  utr?: string;
  orderId?: string;
  orderCode?: string;
  customerName?: string;
  method?: string;
  upiId?: string;
}

export interface RiderEarningsSummary {
  total: number;
  today: number;
  thisWeek: number;
  orders: number;
  todayDeliveries: number;
  breakdown: {
    tripFares: number;
    distancePay: number;
    surgePay: number;
    questBonus: number;
  };
  weeklyDays: Array<{
    day: string;
    date: string;
    amount: number;
    trips: number;
    isToday?: boolean;
  }>;
  activeQuests: Array<{
    id: string;
    title: string;
    reward: number;
    target: number;
    progress: number;
    expiresIn: string;
    completed: boolean;
  }>;
}

const TXN_KIND: Record<string, "trip" | "incentive" | "tip" | "withdrawal"> = {
  payout: "trip",
  trip: "trip",
  order: "trip",
  commission: "incentive",
  incentive: "incentive",
  bonus: "incentive",
  reward: "incentive",
  "referral-bonus": "incentive",
  "reward-credit": "incentive",
  refund: "tip",
  tip: "tip",
  "order-payment": "trip",
  "order-cashback": "tip",
  recharge: "withdrawal",
  withdrawal: "withdrawal",
};

/** GET /api/rider/wallet — Real-time wallet balance and linked bank/UPI account from MongoDB Atlas. */
export async function fetchRiderWallet(): Promise<RiderWalletDetail> {
  const wallet = await apiGetJson<RiderWalletDetail>("/api/rider/wallet");
  return {
    ...wallet,
    balance: Number(wallet.balance ?? 0),
    availableBalance: Number(wallet.balance ?? 0),
    pendingSettlement: Number(wallet.pending ?? 0),
    lifetimeEarnings: Number(wallet.lifetimeEarnings ?? 0),
    todayEarned: Number(wallet.todayEarned ?? wallet.balance ?? 0),
    thisWeekEarned: Number(wallet.thisWeekEarned ?? 0),
    totalWithdrawn: Number(wallet.totalWithdrawn ?? 0),
  };
}

/** GET /api/rider/wallet/transactions — Real chronological transaction passbook ledger. */
export async function fetchRiderTransactions(): Promise<RiderWalletTransaction[]> {
  const transactions = await apiGetJson<any[]>("/api/rider/wallet/transactions");
  if (!Array.isArray(transactions)) return [];
  return transactions
    .filter((txn) => txn && txn.status !== "failed")
    .map((txn) => ({
      id: txn.id || txn._id || `txn-${Math.random()}`,
      _id: txn._id,
      riderId: txn.riderId || txn.rider_id,
      title: txn.title || (txn.direction === "debit" ? "Instant Withdrawal" : "Trip Earnings"),
      date: txn.date || txn.createdAt || new Date().toISOString(),
      amount: Number(txn.amount || 0),
      direction: txn.direction === "debit" ? "debit" : "credit",
      status: txn.status === "pending" ? "pending" : "success",
      kind: TXN_KIND[txn.kind] ?? (txn.direction === "debit" ? "withdrawal" : "trip"),
      utr: txn.utr,
      orderId: txn.orderId,
      orderCode: txn.orderCode,
      customerName: txn.customerName,
      method: txn.method,
      upiId: txn.upiId,
    }));
}

/** POST /api/rider/wallet/withdraw — Instant 0% fee Bank Transfer cashout to captain account. */
export async function withdrawRiderEarnings(
  amount: number,
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    accountHolder?: string;
    upiId?: string;
  }
) {
  const res = await apiPostJson<{
    ok: boolean;
    amount: number;
    balance: number;
    totalWithdrawn?: number;
    utr?: string;
    bankName?: string;
    accountNumberMasked?: string;
    message?: string;
  }>("/api/rider/wallet/withdraw", {
    amount: Math.abs(amount),
    ...(bankDetails || {}),
  });
  return res;
}

/** POST /api/rider/wallet/razorpay-order — Create Razorpay order for float deposit. */
export async function createRiderDepositOrder(amount: number) {
  return await apiPostJson<{
    ok: boolean;
    keyId: string;
    order: {
      gatewayOrderId: string;
      amountInPaise: number;
      currency: string;
      notes: any;
      keyId: string;
    };
  }>("/api/rider/wallet/razorpay-order", { amount });
}

/** POST /api/rider/wallet/razorpay-verify — Verify Razorpay signature and clear float. */
export async function verifyRiderDeposit(payload: {
  amount: number;
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  return await apiPostJson<{
    ok: boolean;
    message: string;
    remainingFloatingCash: number;
    paymentId: string;
  }>("/api/rider/wallet/razorpay-verify", payload);
}

/** POST /api/rider/wallet/credit — Add incentive bonus / test credit. */
export async function creditRiderBonus(amount: number, title: string = "Quest Bonus Credit") {
  const res = await apiPostJson<{ ok: boolean; amount: number; balance: number }>(
    "/api/rider/wallet/credit",
    {
      amount: Math.abs(amount),
      title,
      kind: "incentive",
    }
  );
  return res;
}

/** GET /api/rider/earnings — Complete earnings analytics, breakdown and quests summary. */
export async function fetchRiderEarningsSummary(): Promise<RiderEarningsSummary> {
  const summary = await apiGetJson<RiderEarningsSummary>("/api/rider/earnings");
  return summary;
}
