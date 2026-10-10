// order e save hoye thaka delivery estimate (backend er order.deliveryInfo)
export type DeliveryInfo = {
  mode: "LOCAL" | "NATIONAL";
  distanceKm: number | null;
  minDays: number;
  maxDays: number;
  estimatedMinDate: string;
  estimatedMaxDate: string;
  // [SHIPROCKET]
  source?: "MANUAL" | "SHIPROCKET";
  courierId?: number | null;
  courierName?: string | null;
  shippingCharge?: number | null;
};

// courier shipment (backend er order.shipment)
export type OrderShipment = {
  provider?: string;
  shiprocketOrderId?: number | null;
  shipmentId?: number | null;
  awb?: string | null;
  courierId?: number | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  status?: string | null;
  pickupRequestedAt?: string | null;
  lastEventAt?: string | null;
  createdAt?: string | null;
};

// date gulo UTC midnight e save hoy (IST date), tai UTC te format
export const formatEstimateDay = (d?: string | null) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

// "12 Oct" ba "12 Oct – 15 Oct"
export const formatEstimateRange = (
  info?: { estimatedMinDate?: string | null; estimatedMaxDate?: string | null } | null,
) => {
  if (!info?.estimatedMinDate) return "";
  const a = formatEstimateDay(info.estimatedMinDate);
  const b = formatEstimateDay(info.estimatedMaxDate);
  return !b || a === b ? a : `${a} – ${b}`;
};

// backend er label er moto: "Delivery in 2 days" / "Delivery in 4-7 days"
export const formatDaysLabel = (minDays: number, maxDays: number) => {
  if (minDays === maxDays) {
    if (minDays <= 0) return "Same day delivery";
    if (minDays === 1) return "Delivery in 1 day";
    return `Delivery in ${minDays} days`;
  }
  return `Delivery in ${minDays}-${maxDays} days`;
};