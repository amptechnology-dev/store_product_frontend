import axiosInstance from "@/service/axios.service";
import type { DeliveryInfo } from "@/helper/delivery";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

// price on request flow
export type PriceStatus =
  | "NOT_REQUIRED"
  | "AWAITING_QUOTE"
  | "QUOTED"
  | "CONFIRMED";

// ---------- Payment ----------
export type PaymentMethod = "COD" | "ONLINE";

export type PaymentStatus =
  | "PENDING"
  | "INITIATED"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type PaymentAttemptStatus = "INITIATED" | "SUCCESS" | "FAILED";

export type PaymentAttempt = {
  txnid: string;
  amount: number;
  status: PaymentAttemptStatus;
  mihpayid?: string | null;
  mode?: string | null;
  bankRefNum?: string | null;
  errorMessage?: string | null;
  createdAt: string; // required
  completedAt?: string | null;
};

// ---------- GST ----------
export type GstRates = {
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
};

export type GstMode = "INTRA" | "INTER";

export type OrderItem = {
  _id: string;
  productId: string;
  variantId?: string | null;
  name: string;
  productCode?: string;
  image?: string | null;
  unit?: string;
  color?: string | null;
  size?: string | null;
  weight?: string | null;
  height?: string | null;
  // price on request item e quote accept howar age null
  mrp: number | null;
  offerPrice: number | null;
  quantity: number;
  lineTotal: number | null;
  priceOnRequest?: boolean;

  // [GST] purono order e field na-o thakte pare
  gstRates?: GstRates | null;
  gstInclusive?: boolean;
  taxableAmount?: number | null;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  gstAmount?: number;
  lineTotalWithGst?: number | null;
};

export type DeliveryAddress = {
  fullName: string;
  phone: string;
  addressLine: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type StatusHistoryEntry = {
  status: OrderStatus;
  changedBy?: string;
  note?: string | null;
  at: string;
};

export type OrderQuote = {
  items: { itemId: string; unitPrice: number }[];
  total: number;
  note?: string | null;
  quotedAt: string;
};

export type PriceHistoryEntry = {
  action: "QUOTED" | "ACCEPTED" | "REJECTED";
  byRole: "STORE" | "USER";
  total?: number;
  note?: string | null;
  at: string;
};

export type OrderRow = {
  _id: string;
  orderNumber: string;
  cartId?: string | null;
  checkoutId?: string | null;
  userId: { _id: string; name: string; email: string; phone: string };
  storeId: string;
  storeName?: string;
  storeUniqueId?: string;
  items: OrderItem[];
  totalItems: number;
  totalMrp: number;
  discount: number;
  // totalAmount = payable (GST soho)
  totalAmount: number;

  // [GST] purono order e field na-o thakte pare
  gstMode?: GstMode;
  subtotal?: number;
  totalTaxable?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalGst?: number;

  deliveryAddress: DeliveryAddress;
  note?: string | null;
  expectedDeliveryDate?: string | null;
  deliveryInfo?: DeliveryInfo | null;

  // ---------- payment ----------
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  // purono order e field na-o thakte pare
  paymentAttempts?: PaymentAttempt[];
  paidAt?: string | null;
  paymentExpiresAt?: string | null;

  status: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
  // purono order e field na-o thakte pare (undefined = NOT_REQUIRED)
  priceStatus?: PriceStatus;
  quote?: OrderQuote | null;
  priceHistory?: PriceHistoryEntry[];
  cancelReason?: string | null;
  cancelledBy?: "USER" | "STORE" | null;
  createdAt: string;
  updatedAt: string;
};

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const STATUS_ICONS: Record<OrderStatus, string> = {
  PENDING: "pi pi-clock",
  CONFIRMED: "pi pi-check-circle",
  SHIPPED: "pi pi-truck",
  DELIVERED: "pi pi-verified",
  CANCELLED: "pi pi-times-circle",
};

// ---------- Payment UI helpers ----------
export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  INITIATED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-purple-100 text-purple-800",
};

export const PAYMENT_STATUS_ICONS: Record<PaymentStatus, string> = {
  PENDING: "pi pi-clock",
  INITIATED: "pi pi-spinner",
  PAID: "pi pi-check-circle",
  FAILED: "pi pi-times-circle",
  REFUNDED: "pi pi-replay",
};

export const ATTEMPT_STYLES: Record<PaymentAttemptStatus, string> = {
  INITIATED: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export const TERMINAL_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED"];

/**
 * Backend er ALLOWED_TRANSITIONS mirror — key: target status, value: allowed *current* statuses.
 * ⚠️ Backend controller er ALLOWED_TRANSITIONS er sathe match kore niyo.
 */
export const ALLOWED_FROM: Partial<Record<OrderStatus, OrderStatus[]>> = {
  CONFIRMED: ["PENDING"],
  SHIPPED: ["CONFIRMED"],
  DELIVERED: ["SHIPPED"],
  CANCELLED: ["PENDING", "CONFIRMED"],
};

/** Given current status, kon kon status-e move kora jabe */
export const getNextStatuses = (current: OrderStatus): OrderStatus[] =>
  ORDER_STATUSES.filter((target) => ALLOWED_FROM[target]?.includes(current));

/** Store price estimate pathay / user accept-er opekkhay (CONFIRMED kora jabe na) */
export const isQuotePending = (o: { priceStatus?: PriceStatus }) =>
  o.priceStatus === "AWAITING_QUOTE" || o.priceStatus === "QUOTED";

/** ONLINE order e payment complete hoyni (CONFIRMED kora jabe na) */
export const isPaymentPending = (o: {
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
}) => o.paymentMethod === "ONLINE" && o.paymentStatus !== "PAID";

/** PATCH /store-orders/:orderId/status */
export const updateOrderStatusApi = (
  orderId: string,
  status: OrderStatus,
  note?: string,
) =>
  axiosInstance.patch(`/api/order/store-orders/${orderId}/status`, {
    status,
    ...(note ? { note } : {}),
  });

/** PATCH /store-orders/:orderId/quote */
export const submitQuoteApi = (
  orderId: string,
  items: { itemId: string; unitPrice: number }[],
  note?: string,
) =>
  axiosInstance.patch(`/api/order/store-orders/${orderId}/quote`, {
    items,
    ...(note ? { note } : {}),
  });