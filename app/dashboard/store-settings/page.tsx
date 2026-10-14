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
  resolveBusinessType,
  StoreBusinessType,
} from "@/service/storeSetting.service";

type PaymentMode = "BOTH" | "ONLINE_ONLY" | "OFF";
type Settings = {
  storeBusinessType: StoreBusinessType;
  hasDelivery: boolean;
  paymentMode: PaymentMode;
};

const DEFAULT_SETTINGS: Settings = {
  storeBusinessType: "MADE_FOR_PRODUCT",
  hasDelivery: true,
  paymentMode: "BOTH",
};

const PAYMENT_OPTIONS: {
  value: PaymentMode;
  title: string;
  icon: string;
  desc: string;
  points: string[];
}[] = [
  {
    value: "BOTH",
    title: "Online + Cash on Delivery",
    icon: "pi-wallet",
    desc: "Customers choose how to pay",
    points: [
      "Customers can pay online or pay on delivery",
      "Online orders are confirmed after the payment is received",
      "Payments and Settlements are available in your menu",
    ],
  },
  {
    value: "ONLINE_ONLY",
    title: "Online payment only",
    icon: "pi-credit-card",
    desc: "Customers pay first, then you process the order",
    points: [
      "Cash on Delivery is hidden",
      "You can confirm an order only after the payment is received",
      "Unpaid orders are cancelled automatically after the time limit",
    ],
  },
  {
    value: "OFF",
    title: "Payment off",
    icon: "pi-ban",
    desc: "No payment inside the app. You handle money yourself",
    points: [
      "Customers are not asked to pay in the app",
      "Payments and Settlements are removed from your menu",
      "Orders are not counted in payment reports",
    ],
  },
];

const STORE_TYPE_OPTIONS: {
  value: StoreBusinessType;
  title: string;
  icon: string;
  desc: string;
  points: string[];
}[] = [
  {
    value: "RETAIL",
    title: "Retail store",
    icon: "pi-shopping-bag",
    desc: "You sell ready products from your shelf",
    points: [
      "Opening Stock is required for every product",
      "Quantity is checked at cart and order",
      "Quantity is reduced after each order",
    ],
  },
  {
    value: "MADE_FOR_PRODUCT",
    title: "Made for product store",
    icon: "pi-palette",
    desc: "You make each product after the customer orders it",
    points: [
      "No quantity tracking for any product",
      "Products are always available to order",
      "Quantity fields are hidden everywhere",
    ],
  },
  {
    value: "BOTH",
    title: "Retail + Made for product",
    icon: "pi-clone",
    desc: "You sell ready products and also make products to order",
    points: [
      "You choose for each product if it is made for product or not",
      "Ready products need Opening Stock",
      "Made for product products have no quantity tracking",
    ],
  },
];

// ---------- ON / OFF toggle card ----------
function SettingCard({
  icon,
  title,
  subtitle,
  checked,
  saving,
  disabled,
  onChange,
  onItems,
  offItems,
  note,
}: {
  icon: string;
  title: string;
  subtitle: string;
  checked: boolean;
  saving: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  onItems: string[];
  offItems: string[];
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-blue-100 overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-3 sm:p-4 bg-blue-50/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <i className={`pi ${icon} text-blue-600 text-lg`}></i>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  checked
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {checked ? "ON" : "OFF"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && (
            <i className="pi pi-spin pi-spinner text-blue-500 text-sm"></i>
          )}
          <InputSwitch
            checked={checked}
            onChange={(e) => onChange(!!e.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 bg-white">
        <div
          className={`rounded-lg border p-3 transition-all ${
            checked
              ? "border-green-300 bg-green-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 mb-1.5">
            <i className="pi pi-check-circle"></i> When ON
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 leading-relaxed">
            {onItems.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <div
          className={`rounded-lg border p-3 transition-all ${
            !checked ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-white"
          }`}
        >
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
            <i className="pi pi-times-circle"></i> When OFF
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 leading-relaxed">
            {offItems.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {note && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-white">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex gap-3">
            <i className="pi pi-info-circle mt-0.5 flex-shrink-0"></i>
            <span className="leading-relaxed">{note}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StoreSettingsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // role read korar por-i store type section dekhabe (flash / flicker avoid korar jonno)
  const [role, setRole] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    // localStorage er "login-user" key te JSON object thake: { ..., "role": "STORE" }
    try {
      const raw = localStorage.getItem("login-user");
      const user = raw ? JSON.parse(raw) : null;
      setRole(user?.role ? String(user.role).toUpperCase() : null);
    } catch {
      setRole(null);
    } finally {
      setRoleReady(true);
    }
  }, []);

  // STORE role hole: shudhu nijer store type dekhabe, change korte parbe na
  const isStoreRole = role === "STORE";

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
      const s = res.data?.settings || {};
      setSettings({
        storeBusinessType: resolveBusinessType(s),
        hasDelivery: s.hasDelivery !== false,
        paymentMode: (["BOTH", "ONLINE_ONLY", "OFF"].includes(s.paymentMode)
          ? s.paymentMode
          : "BOTH") as PaymentMode,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch settings");
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  // ek ta setting save (optimistic, fail hole ager obosthay)
  const save = async (key: keyof Settings, value: any) => {
    if (!storeId) return;

    // extra guard: STORE role hole store type kono bhabei change hobe na
    if (key === "storeBusinessType" && isStoreRole) return;

    const prev = settings[key];
    setSettings((s) => ({ ...s, [key]: value }));
    try {
      setSavingKey(key);
      await updateStoreSettings(storeId, { [key]: value } as any);
      toast.success("Settings updated successfully");
      // sidebar er menu (Stock / Delivery / Payments / Settlements) refresh korar jonno
      window.dispatchEvent(new Event("storeSettingsChanged"));
    } catch (err: any) {
      setSettings((s) => ({ ...s, [key]: prev }));
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to update settings");
      } else {
        toast.error("Failed to update settings");
      }
    } finally {
      setSavingKey(null);
    }
  };

  const busy = savingKey !== null || !storeId;

  // STORE role hole shudhu active store type, na hole shob gulo
  const visibleStoreTypeOptions = isStoreRole
    ? STORE_TYPE_OPTIONS.filter((o) => o.value === settings.storeBusinessType)
    : STORE_TYPE_OPTIONS;

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
              Control payment, delivery and stock behavior for your store
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
              {/* Payment options */}
              <div className="rounded-xl border border-blue-100 overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-blue-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <i className="pi pi-credit-card text-blue-600 text-lg"></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Payment options
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Choose how customers pay for orders from your store
                      </p>
                    </div>
                  </div>
                  {savingKey === "paymentMode" && (
                    <i className="pi pi-spin pi-spinner text-blue-500 text-sm"></i>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 sm:p-4 bg-white">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const active = settings.paymentMode === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        disabled={busy}
                        onClick={() => {
                          if (!active) save("paymentMode", opt.value);
                        }}
                        className={`text-left rounded-lg border p-3 transition-all disabled:opacity-60 ${
                          active
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <i
                            className={`pi ${opt.icon} ${
                              active ? "text-blue-600" : "text-gray-400"
                            }`}
                          />
                          <span
                            className={`text-sm font-semibold ${
                              active ? "text-blue-800" : "text-gray-700"
                            }`}
                          >
                            {opt.title}
                          </span>
                          {active && (
                            <i className="pi pi-check-circle text-blue-600 ml-auto" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 leading-relaxed mt-2">
                          {opt.points.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delivery */}
              <SettingCard
                icon="pi-truck"
                title="Delivery"
                subtitle="Deliver to customers with delivery time and shipping charge"
                checked={settings.hasDelivery}
                saving={savingKey === "hasDelivery"}
                disabled={busy}
                onChange={(v) => save("hasDelivery", v)}
                onItems={[
                  "Customers see the delivery time for their address",
                  "Shipping charge is added to the order total at payment",
                  "Set your delivery area, time and charges from the Delivery menu",
                ]}
                offItems={[
                  "No delivery time and no shipping charge for customers",
                  "No pincode check at checkout",
                  "No expected delivery date needed before marking an order as shipped",
                  "Courier shipment options are hidden",
                ]}
                note="This applies to new orders. Orders already placed keep the delivery details they were created with."
              />

              {/* Store type */}
              {roleReady && (
                <div className="rounded-xl border border-blue-100 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-blue-50/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i className="pi pi-building text-blue-600 text-lg"></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          Store type
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {isStoreRole
                            ? "How your store sells its products"
                            : "Choose how your store sells its products"}
                        </p>
                      </div>
                    </div>
                    {savingKey === "storeBusinessType" && (
                      <i className="pi pi-spin pi-spinner text-blue-500 text-sm"></i>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 sm:p-4 bg-white">
                    {visibleStoreTypeOptions.map((opt) => {
                      const active = settings.storeBusinessType === opt.value;

                      const content = (
                        <>
                          <div className="flex items-center gap-2">
                            <i
                              className={`pi ${opt.icon} ${
                                active ? "text-blue-600" : "text-gray-400"
                              }`}
                            />
                            <span
                              className={`text-sm font-semibold ${
                                active ? "text-blue-800" : "text-gray-700"
                              }`}
                            >
                              {opt.title}
                            </span>
                            {active && (
                              <i className="pi pi-check-circle text-blue-600 ml-auto" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {opt.desc}
                          </p>
                          <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 leading-relaxed mt-2">
                            {opt.points.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </>
                      );

                      // STORE role: click hobe na, shudhu dekhabe (div, button na)
                      if (isStoreRole) {
                        return (
                          <div
                            key={opt.value}
                            className="text-left rounded-lg border border-blue-500 bg-blue-50 p-3 cursor-default select-none"
                          >
                            {content}
                          </div>
                        );
                      }

                      // Baki role: age er moto click kore change korte parbe
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          disabled={busy}
                          onClick={() => {
                            if (!active) save("storeBusinessType", opt.value);
                          }}
                          className={`text-left rounded-lg border p-3 transition-all disabled:opacity-60 ${
                            active
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>

                  {/* Change korar note shudhu jara change korte pare tader jonno */}
                  {!isStoreRole && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-white">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex gap-3">
                        <i className="pi pi-info-circle mt-0.5 flex-shrink-0"></i>
                        <span className="leading-relaxed">
                          This applies to products created after the change.
                          Products already created keep their current behavior.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default StoreSettingsPage;