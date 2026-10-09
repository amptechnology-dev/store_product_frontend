export type PayoutMethod =
  | "BANK_TRANSFER"
  | "UPI"
  | "CASH"
  | "CHEQUE"
  | "OTHER";

export const PAYOUT_METHODS: { value: PayoutMethod; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

export const methodLabel = (m: PayoutMethod) =>
  PAYOUT_METHODS.find((x) => x.value === m)?.label || m;

export type PayoutSummary = {
  totalReceived: number; // admin er kache ashe (ONLINE paid)
  onHoldAmount: number; // paid kintu order cancelled (refund lagbe)
  totalPaidOut: number; // admin store ke diyeche
  balance: number; // ekhono pawna
  onlineOrders: number;
  payoutCount: number;
  lastReceivedAt: string | null;
  lastPayoutAt: string | null;
  settlementRate: number;
  pendingStores?: number;
};

export const EMPTY_PAYOUT_SUMMARY: PayoutSummary = {
  totalReceived: 0,
  onHoldAmount: 0,
  totalPaidOut: 0,
  balance: 0,
  onlineOrders: 0,
  payoutCount: 0,
  lastReceivedAt: null,
  lastPayoutAt: null,
  settlementRate: 0,
  pendingStores: 0,
};

export type StorePayoutRow = PayoutSummary & {
  storeId: string;
  storeName: string;
  storeUniqueId: string;
  isActive?: boolean;
  isVerify?: boolean;
};

export type PayoutRow = {
  payoutId: string;
  payoutNumber: string;
  storeId: string;
  storeName: string | null;
  storeUniqueId: string | null;
  amount: number;
  method: PayoutMethod;
  referenceNo: string | null;
  note: string | null;
  paidAt: string;
  balanceBefore: number;
  balanceAfter: number;
  isVoided: boolean;
  voidReason: string | null;
  voidedAt: string | null;
  paidByName?: string | null;
  createdAt: string;
};

export type PayoutPayload = {
  amount: number;
  method: PayoutMethod;
  paidAt: string;
  referenceNo?: string;
  note?: string;
};