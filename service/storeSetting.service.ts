import axiosInstance from "@/service/axios.service";

export type StoreSettings = {
  hasVariants: boolean;
  hasColor: boolean;
  hasStockManagement: boolean;
};

export const getStoreSettings = (storeId: string) =>
  axiosInstance.get("/api/store-settings", { params: { storeId } });

export const updateStoreSettings = (
  storeId: string,
  data: Partial<StoreSettings>,
) => axiosInstance.patch("/api/store-settings", { storeId, ...data });
