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
      toast.success("Settings updated");
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
      desc: "On thakle product-e multiple size, weight ba height wise price add korte parbe.",
      icon: "pi pi-sliders-h",
    },
    {
      key: "hasColor",
      title: "Color Variants",
      desc: "On thakle color-wise variant o sei color er image add korte parbe.",
      icon: "pi pi-palette",
    },
    {
      key: "hasStockManagement",
      title: "Stock Management",
      desc: "On thakle product/variant e stock quantity manage korte parbe.",
      icon: "pi pi-box",
    },
  ];

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-4 sm:p-6 max-w-2xl">
        <div
          className="flex items-center gap-3 mb-5 p-3 rounded-lg"
          style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}
        >
          <i className="pi pi-cog text-xl text-gray-800"></i>
          <div>
            <h2 className="text-base font-semibold text-gray-800">Store Settings</h2>
            <p className="text-xs text-gray-700">Product variant, color o stock behavior control koro</p>
          </div>
        </div>

        {stores.length > 1 && (
          <div className="mb-4 space-y-1">
            <label className="text-sm font-semibold text-gray-700">Store</label>
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
          <div className="flex justify-center items-center p-8">
            <i className="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
          </div>
        ) : (
          <div className="space-y-3">
            {settingRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-start gap-3">
                  <i className={`${row.icon} text-indigo-600 text-lg mt-0.5`}></i>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{row.title}</p>
                    <p className="text-xs text-gray-500">{row.desc}</p>
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

        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
          <i className="pi pi-info-circle mt-0.5"></i>
          <span>
            Notun product create korar shomoy ei setting-er snapshot save hobe, tai age create kora
            product-er behavior change korle affect hobe na.
          </span>
        </div>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default StoreSettingsPage;