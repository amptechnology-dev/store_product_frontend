import axiosInstance from "@/service/axios.service";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type OrderItem = {
  _id: string;
  productId: string;
  name: string;
  productCode?: string;
  image?: string | null;
  unit?: string;
  size?: string | null;
  weight?: string | null;
  mrp: number;
  offerPrice: number;
  quantity: number;
  lineTotal: number;
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

export type OrderRow = {
  _id: string;
  orderNumber: string;
  cartId?: string;
  checkoutId?: string;
  userId: { _id: string; name: string; email: string; phone: string };
  storeId: string;
  storeName?: string;
  storeUniqueId?: string;
  items: OrderItem[];
  totalItems: number;
  totalMrp: number;
  discount: number;
  totalAmount: number;
  deliveryAddress: DeliveryAddress;
  note?: string | null;
  paymentMethod: "COD";
  paymentStatus: "PENDING" | "PAID";
  status: OrderStatus;
  statusHistory?: StatusHistoryEntry[];   
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

export const TERMINAL_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED"];

/**
 * Backend er ALLOWED_FROM mirror — key: target status, value: allowed *current* statuses.
 * ⚠️ Backend controller er actual ALLOWED_FROM constant er sathe match kore niyo.
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