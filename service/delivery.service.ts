import axiosInstance from "@/service/axios.service";
import type { DeliveryInfo, DurationUnit } from "@/helper/delivery";

export type DeliveryType = "LOCAL" | "NATIONAL" | "BOTH";

export type LocalSlab = {
  upToKm: number;
  charge: number;
  etaValue: number;
  etaUnit: DurationUnit;
  etaMinutes?: number;
};

export type ChargeRule = { minOrderValue: number; charge: number };

export type DeliverySettings = {
  _id: string;
  storeId: string;
  deliveryType: DeliveryType;
  pincode: string;
  radiusKm: number | null;
  localSlabs?: LocalSlab[];
  localDeliveryDays?: number;
  localDeliveryCharge?: number;
  chargeRules?: ChargeRule[];
  nationalMinDays: number;
  nationalMaxDays: number;
  nationalFallbackCharge?: number;
  allowInternational?: boolean;
  internationalMinDays?: number;
  internationalMaxDays?: number;
  internationalFallbackCharge?: number;
  handlingValue?: number;
  handlingUnit?: DurationUnit;
  handlingDays?: number;
  isActive: boolean;
};

export type SaveDeliveryPayload = {
  storeId: string;
  deliveryType: DeliveryType;
  pincode: string;
  radiusKm?: number;
  localSlabs?: LocalSlab[];
  chargeRules?: ChargeRule[];
  nationalMinDays?: number;
  nationalMaxDays?: number;
  nationalFallbackCharge?: number;
  allowInternational?: boolean;
  internationalMinDays?: number;
  internationalMaxDays?: number;
  internationalFallbackCharge?: number;
  handlingValue?: number;
  handlingUnit?: DurationUnit;
};

export type PincodeInfo = {
  pincode: string;
  area?: string;
  district?: string;
  state?: string;
};

export type DeliveryCheckResult = {
  success: boolean;
  deliverable: boolean;
  configured: boolean;
  message: string | null;
  delivery: DeliveryInfo | null;
  payment?: {
    paymentMode: "BOTH" | "ONLINE_ONLY" | "OFF";
    codAvailable: boolean;
    onlineAvailable: boolean;
  };
};

export const getDeliverySettings = (storeId: string) =>
  axiosInstance.get(`/api/delivery/settings/${storeId}`);

export const saveDeliverySettings = (payload: SaveDeliveryPayload) =>
  axiosInstance.put("/api/delivery/settings", payload);

export const getServicePincodes = (storeId: string) =>
  axiosInstance.get(`/api/delivery/settings/${storeId}/service-pincodes`);

export const lookupPincode = (pincode: string) =>
  axiosInstance.get(`/api/delivery/pincode/${pincode}`);

export const checkDelivery = (
  storeUniqueId: string,
  pincode: string,
  opts?: {
    country?: string;
    itemsTotal?: number;
    productId?: string;
    variantId?: string | null;
    quantity?: number;
    cod?: boolean;
  },
) =>
  axiosInstance.get("/api/delivery/check", {
    params: {
      storeUniqueId,
      pincode,
      ...(opts?.country ? { country: opts.country } : {}),
      ...(opts?.itemsTotal !== undefined
        ? { itemsTotal: opts.itemsTotal }
        : {}),
      ...(opts?.productId ? { productId: opts.productId } : {}),
      ...(opts?.variantId ? { variantId: opts.variantId } : {}),
      ...(opts?.quantity ? { quantity: opts.quantity } : {}),
      ...(opts?.cod ? { cod: 1 } : {}),
    },
  });
