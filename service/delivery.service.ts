import axiosInstance from "@/service/axios.service";
import type { DeliveryInfo } from "@/helper/delivery";

export type DeliveryType = "LOCAL" | "NATIONAL" | "BOTH";

export type DeliverySettings = {
  _id: string;
  storeId: string;
  deliveryType: DeliveryType;
  pincode: string;
  radiusKm: number | null;
  localDeliveryDays: number;
  nationalMinDays: number;
  nationalMaxDays: number;
  handlingDays: number;
  isActive: boolean;
};

export type SaveDeliveryPayload = {
  storeId: string;
  deliveryType: DeliveryType;
  pincode: string;
  radiusKm?: number;
  localDeliveryDays?: number;
  nationalMinDays?: number;
  nationalMaxDays?: number;
  handlingDays?: number;
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
};

export const getDeliverySettings = (storeId: string) =>
  axiosInstance.get(`/api/delivery/settings/${storeId}`);

export const saveDeliverySettings = (payload: SaveDeliveryPayload) =>
  axiosInstance.put("/api/delivery/settings", payload);

export const getServicePincodes = (storeId: string) =>
  axiosInstance.get(`/api/delivery/settings/${storeId}/service-pincodes`);

export const lookupPincode = (pincode: string) =>
  axiosInstance.get(`/api/delivery/pincode/${pincode}`);

export const checkDelivery = (storeUniqueId: string, pincode: string) =>
  axiosInstance.get("/api/delivery/check", {
    params: { storeUniqueId, pincode },
  });