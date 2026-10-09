import { OrderStatus, PaymentStatus } from "@/types/order";

export type PaymentMethod = "COD" | "ONLINE";

export type PaymentSummary = {
  totalOrders: number;
  paidOrders: number;
  dueOrders: number;
  awaitingQuoteOrders: number;
  paidAmount: number;
  dueAmount: number;
  codPaid: number;
  onlinePaid: number;
  codDue: number;
  onlineDue: number;
  refundedAmount: number;
  cancelledAmount: number;
  totalBilled: number;
  collectionRate: number;
  lastPaymentAt: string | null;
};

export const EMPTY_SUMMARY: PaymentSummary = {
  totalOrders: 0,
  paidOrders: 0,
  dueOrders: 0,
  awaitingQuoteOrders: 0,
  paidAmount: 0,
  dueAmount: 0,
  codPaid: 0,
  onlinePaid: 0,
  codDue: 0,
  onlineDue: 0,
  refundedAmount: 0,
  cancelledAmount: 0,
  totalBilled: 0,
  collectionRate: 0,
  lastPaymentAt: null,
};

export type CustomerReportRow = PaymentSummary & {
  customerId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  lastOrderAt: string;
};

export type StoreReportRow = PaymentSummary & {
  storeId: string;
  storeName: string;
  storeUniqueId: string;
  isActive: boolean;
  isVerify: boolean;
  totalCustomers: number;
};

export type PaymentAttemptRow = {
  txnid: string;
  amount: number;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  mihpayid?: string | null;
  mode?: string | null;
  bankRefNum?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

export type PaymentOrderRow = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  storeId: string;
  storeName: string;
  storeUniqueId: string;
  customer: {
    _id: string;
    name: string | null;
    phone?: string | null;
    email?: string | null;
  };
  status: OrderStatus;
  priceStatus: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  dueAmount: number;
  paidAt: string | null;
  paymentExpiresAt: string | null;
  paymentAttempts: PaymentAttemptRow[];
};

export const money = (n?: number | null) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// empty / false value gulo query theke bad dey
export const cleanParams = (obj: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== "" && v !== false,
    ),
  );