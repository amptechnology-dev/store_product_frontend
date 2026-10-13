export type DurationUnit = "MINUTES" | "HOURS" | "DAYS";
export type DeliveryMode = "LOCAL" | "NATIONAL" | "INTERNATIONAL";

// order e save hoye thaka delivery estimate (backend er order.deliveryInfo)
export type DeliveryInfo = {
  mode: DeliveryMode;
  distanceKm: number | null;
  minMinutes?: number;
  maxMinutes?: number;
  minDays: number;
  maxDays: number;
  etaLabel?: string | null;
  estimatedMinDate: string;
  estimatedMaxDate: string;
  estimatedMaxAt?: string | null;
  source?: "MANUAL" | "SHIPROCKET";
  courierId?: number | null;
  courierName?: string | null;
  courierRate?: number | null;
  shippingCharge?: number | null;
  baseShippingCharge?: number | null;
  shippingNote?: string | null;
  country?: string | null;
  pincode?: string | null;
  courierEtaDays?: number | null;
  chargeableWeightKg?: number | null;
};

export type ShipmentEvent = {
  status?: string | null;
  activity?: string | null;
  location?: string | null;
  at?: string | null;
};

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
  pickupScheduledDate?: string | null;
  pickupTokenNumber?: string | null;
  assignedAt?: string | null;
  etd?: string | null;
  etdSource?: "ESTIMATE" | "COURIER";
  appliedWeight?: number | null;
  courierSwitched?: boolean;
  events?: ShipmentEvent[];
  lastEventAt?: string | null;
  createdAt?: string;
};

const UNIT_MINUTES: Record<DurationUnit, number> = {
  MINUTES: 1,
  HOURS: 60,
  DAYS: 1440,
};

// value + unit -> minute
export const toMinutes = (
  value: number | null | undefined,
  unit: DurationUnit,
) => Math.round(Math.max(0, Number(value) || 0) * UNIT_MINUTES[unit]);

const pluralize = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

// "Delivery in 45 minutes" / "Delivery in 2 hours" / "Delivery in 4-7 days" (backend er label er moto)
export const formatDurationLabel = (minMinutes: number, maxMinutes: number) => {
  const lo = Math.max(0, Math.round(minMinutes));
  const hi = Math.max(lo, Math.round(maxMinutes));

  if (hi === 0) return "Same day delivery";

  if (hi < 60) {
    return lo === hi
      ? `Delivery in ${pluralize(hi, "minute")}`
      : `Delivery in ${lo}-${hi} minutes`;
  }

  if (hi < 1440) {
    const toH = (m: number) => Math.round((m / 60) * 10) / 10;
    const a = toH(lo);
    const b = toH(hi);
    return a === b
      ? `Delivery in ${pluralize(b, "hour")}`
      : `Delivery in ${a}-${b} hours`;
  }

  const a = Math.ceil(lo / 1440);
  const b = Math.ceil(hi / 1440);
  if (a === b) return b === 1 ? "Delivery in 1 day" : `Delivery in ${b} days`;
  return `Delivery in ${a}-${b} days`;
};

// purono code er jonno
export const formatDaysLabel = (minDays: number, maxDays: number) =>
  formatDurationLabel(minDays * 1440, maxDays * 1440);

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
  info?: {
    estimatedMinDate?: string | null;
    estimatedMaxDate?: string | null;
  } | null,
) => {
  if (!info?.estimatedMinDate) return "";
  const a = formatEstimateDay(info.estimatedMinDate);
  const b = formatEstimateDay(info.estimatedMaxDate);
  return !b || a === b ? a : `${a} – ${b}`;
};

// ghonta / minute er delivery te sothik somoy: "6:30 PM" (IST)
export const formatEstimateAt = (d?: string | null) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
};

// order er deliveryInfo theke label (notun order e etaLabel thake, purono order e days theke)
export const getEtaLabel = (info?: DeliveryInfo | null) => {
  if (!info) return "";
  if (info.etaLabel) return info.etaLabel;
  return formatDaysLabel(info.minDays, info.maxDays);
};
