"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { getStoreSettings, updateStoreSettings, StoreSettings } from "@/service/storeSetting.service";

const DEFAULT_SETTINGS: StoreSettings = {
  hasVariants: false,
  hasColor: false,
  hasStockManagement: false,
};

function StoreSettingsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
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
      setSettings(res.data?.settings || DEFAULT_SETTINGS);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch settings");
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof StoreSettings, value: boolean) => {
    if (!storeId) return;
    const prev = settings;
    const next = { ...settings, [key]: value };
    setSettings(next); // optimistic update
    try {
      setSaving(true);
      await updateStoreSettings(storeId, { [key]: value });
      toast.success("Settings updated successfully");
    } catch (err: any) {
      setSettings(prev); // revert on failure
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to update settings");
      } else {
        toast.error("Failed to update settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const settingRows: { key: keyof StoreSettings; title: string; desc: string; icon: string }[] = [
    {
      key: "hasVariants",
      title: "Size / Weight / Height Variants",
      desc: "Enable this to add multiple size, weight, or height based pricing for a product.",
      icon: "pi pi-sliders-h",
    },
    {
      key: "hasColor",
      title: "Color Variants",
      desc: "Enable this to add color-wise variants along with color-specific images.",
      icon: "pi pi-palette",
    },
    {
      key: "hasStockManagement",
      title: "Stock Management",
      desc: "Enable this to manage stock quantity for each product or variant.",
      icon: "pi pi-box",
    },
  ];

  return (
    <div className="w-full h-screen bg-gray-50 flex justify-center px-4 py-4 overflow-hidden">
      <div className="w-full max-w-5xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center gap-4 px-6 py-4 sm:px-8 sm:py-5"
            style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center flex-shrink-0">
              <i className="pi pi-cog text-xl text-gray-900"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Store Settings</h2>
              <p className="text-xs text-gray-800/80 mt-0.5">
                Control product variant, color, and stock behavior
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {stores.length > 1 && (
              <div className="mb-4 space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Select Store</label>
                <Dropdown
                  value={storeId}
                  options={stores.map((s) => ({ label: s.storeName, value: s._id }))}
                  optionLabel="label"
                  optionValue="value"
                  onChange={(e) => setStoreId(e.value)}
                  className="w-full"
                />
              </div>
            )}

            {loading ? (
              <div className="flex flex-col justify-center items-center py-10 gap-3">
                <i className="pi pi-spin pi-spinner text-3xl text-amber-500"></i>
                <p className="text-sm text-gray-400">Loading settings...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {settingRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-4 border border-gray-200 rounded-xl p-3 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <i className={`${row.icon} text-indigo-600 text-base`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{row.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed max-w-xl">
                          {row.desc}
                        </p>
                      </div>
                    </div>
                    <InputSwitch
                      checked={!!settings[row.key]}
                      onChange={(e) => handleToggle(row.key, e.value)}
                      disabled={saving || !storeId}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-3">
              <i className="pi pi-info-circle mt-0.5 flex-shrink-0"></i>
              <span className="leading-relaxed">
                A snapshot of these settings is saved when a new product is created — changing
                them later will not affect products that were already created.
              </span>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" />
    </div>
  );
}

export default StoreSettingsPage;