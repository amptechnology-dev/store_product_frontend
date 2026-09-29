"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import {
  getStoreSettings,
  updateStoreSettings,
} from "@/service/storeSetting.service";

function StoreSettingsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  // [STOCK] shudhu stock management
  const [stockEnabled, setStockEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (storeId) fetchSettings(storeId);
  }, [storeId]);

  const fetchStores = async () => {
    try {
      const res = await axiosInstance.get("/api/register/user-based-stores");
      const list = res.data?.stores || [];
      setStores(list);
      if (list.length > 0) setStoreId(list[0]._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch stores");
    }
  };

  const fetchSettings = async (id: string) => {
    try {
      setLoading(true);
      const res = await getStoreSettings(id);
      setStockEnabled(!!res.data?.settings?.hasStockManagement);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch settings");
      setStockEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (value: boolean) => {
    if (!storeId) return;
    const prev = stockEnabled;
    setStockEnabled(value); // optimistic update
    try {
      setSaving(true);
      await updateStoreSettings(storeId, { hasStockManagement: value });
      toast.success("Settings updated successfully");
      // [STOCK] sidebar er "Stock Management" menu refresh korar jonno
      window.dispatchEvent(new Event("storeSettingsChanged"));
    } catch (err: any) {
      setStockEnabled(prev); // revert on failure
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to update settings");
      } else {
        toast.error("Failed to update settings");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {/* Header */}
        <div
          className="flex items-center gap-3 p-2 sm:p-3 rounded-lg"
          style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <i className="pi pi-cog text-xl text-white"></i>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-white">
              Store Settings
            </h2>
            <p className="text-xs text-blue-100">
              Control stock behavior for your products
            </p>
          </div>
        </div>

        <div className="p-2 sm:p-3 mt-2 space-y-4">
          {stores.length > 1 && (
            <div className="space-y-1.5 max-w-sm">
              <label className="text-sm font-semibold text-gray-700">
                Select Store
              </label>
              <Dropdown
                value={storeId}
                options={stores.map((s) => ({
                  label: s.storeName,
                  value: s._id,
                }))}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setStoreId(e.value)}
                className="w-full"
              />
            </div>
          )}

          {loading ? (
            <div className="flex flex-col justify-center items-center py-10 gap-3">
              <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
              <p className="text-sm text-gray-400">Loading settings...</p>
            </div>
          ) : (
            <>
              {/* Toggle card */}
              <div className="rounded-xl border border-blue-100 overflow-hidden">
                <div className="flex items-center justify-between gap-4 p-3 sm:p-4 bg-blue-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <i className="pi pi-box text-blue-600 text-lg"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">
                          Stock Management
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            stockEnabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {stockEnabled ? "ON" : "OFF"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Track stock for products and variants
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {saving && (
                      <i className="pi pi-spin pi-spinner text-blue-500 text-sm"></i>
                    )}
                    <InputSwitch
                      checked={stockEnabled}
                      onChange={(e) => handleToggle(!!e.value)}
                      disabled={saving || !storeId}
                    />
                  </div>
                </div>

                {/* ON / OFF explanation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 bg-white">
                  <div
                    className={`rounded-lg border p-3 transition-all ${
                      stockEnabled
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 mb-1.5">
                      <i className="pi pi-check-circle"></i> When ON
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 leading-relaxed">
                      <li>
                        Opening Stock and Low Stock Alert fields are shown on
                        products and variants
                      </li>
                      <li>Stock is validated at cart and order</li>
                      <li>Stock is reduced after each order</li>
                    </ul>
                  </div>

                  <div
                    className={`rounded-lg border p-3 transition-all ${
                      !stockEnabled
                        ? "border-gray-400 bg-gray-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
                      <i className="pi pi-times-circle"></i> When OFF
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 leading-relaxed">
                      <li>Stock fields are hidden</li>
                      <li>No stock validation at cart or order</li>
                      <li>No stock deduction is applied</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Info note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex gap-3">
                <i className="pi pi-info-circle mt-0.5 flex-shrink-0"></i>
                <span className="leading-relaxed">
                  This setting is saved on each product when it is created.
                  Changing it later will not affect products that were already
                  created.
                </span>
              </div>
            </>
          )}
        </div>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default StoreSettingsPage;