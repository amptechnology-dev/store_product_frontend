import axiosInstance from "@/service/axios.service";

export type StoreBusinessType = "RETAIL" | "MADE_FOR_PRODUCT" | "BOTH";

export type StoreSettings = {
  hasVariants: boolean;
  hasColor: boolean;
  hasStockManagement?: boolean;
  hasDelivery?: boolean;
  paymentFirst?: boolean;
  storeBusinessType?: StoreBusinessType;
};

// backend er resolveBusinessType er mirror (purono store e storeBusinessType na-o thakte pare)
export const resolveBusinessType = (s?: any): StoreBusinessType =>
  ["RETAIL", "MADE_FOR_PRODUCT", "BOTH"].includes(s?.storeBusinessType)
    ? s.storeBusinessType
    : s?.hasStockManagement
      ? "RETAIL"
      : "MADE_FOR_PRODUCT";

export const getStoreSettings = (storeId: string) =>
  axiosInstance.get("/api/store-settings", { params: { storeId } });

export const updateStoreSettings = (
  storeId: string,
  data: Partial<StoreSettings>,
) => axiosInstance.patch("/api/store-settings", { storeId, ...data });