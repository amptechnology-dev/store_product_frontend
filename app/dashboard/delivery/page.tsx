"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Dialog } from "primereact/dialog";
// NOTE: path ta tomar schema.ts er asol path diye bodle nao
import { deliverySettingsSchema } from "../../../helper/schema/Schema";
import {
  DeliverySettings,
  DeliveryType,
  DeliveryCheckResult,
  PincodeInfo,
  SaveDeliveryPayload,
  getDeliverySettings,
  saveDeliverySettings,
  getServicePincodes,
  lookupPincode,
  checkDelivery,
} from "@/service/delivery.service";
import { formatDaysLabel, formatEstimateRange } from "@/helper/delivery";

type StoreOption = {
  _id: string;
  storeName: string;
  storeUniqueId?: string;
};

type FormState = {
  deliveryType: DeliveryType;
  pincode: string;
  radiusKm: number | null;
  localDeliveryDays: number | null;
  nationalMinDays: number | null;
  nationalMaxDays: number | null;
  handlingDays: number | null;
};

const DEFAULT_FORM: FormState = {
  deliveryType: "BOTH",
  pincode: "",
  radiusKm: 20,
  localDeliveryDays: 1,
  nationalMinDays: 4,
  nationalMaxDays: 7,
  handlingDays: 1,
};

const TYPE_OPTIONS: {
  value: DeliveryType;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    value: "LOCAL",
    label: "Local",
    icon: "pi-map-marker",
    desc: "Deliver only inside a radius around your store",
  },
  {
    value: "NATIONAL",
    label: "National",
    icon: "pi-globe",
    desc: "Shipped anywhere in India through courier partners",
  },
  {
    value: "BOTH",
    label: "Both",
    icon: "pi-sitemap",
    desc: "Local radius first, courier for everywhere else",
  },
];

const RADIUS_PRESETS = [5, 10, 20, 50, 100];

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const errMsg = (err: any, fallback: string) =>
  err?.response?.data?.errors?.[0]?.message ||
  err?.response?.data?.message ||
  fallback;

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? (
    <small className="text-red-500 flex items-center gap-1 mt-1">
      <i className="pi pi-exclamation-circle"></i>
      {msg}
    </small>
  ) : null;

const Spinner = () => (
  <div className="flex justify-center items-center py-16">
    <i className="pi pi-spin pi-spinner text-3xl text-gray-400" />
  </div>
);

function DaysField({
  label,
  hint,
  value,
  onChange,
  error,
  max = 30,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  error?: string;
  max?: number;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-1">
        {label}
      </label>
      <InputNumber
        value={value}
        onValueChange={(e) => onChange(e.value ?? null)}
        min={0}
        max={max}
        suffix=" days"
        useGrouping={false}
        className="w-full"
        inputClassName={`w-full p-inputtext-sm ${error ? "p-invalid" : ""}`}
      />
      {hint && !error && (
        <small className="text-gray-400 block mt-1">{hint}</small>
      )}
      <FieldError msg={error} />
    </div>
  );
}

function DeliveryPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storeId, setStoreId] = useState("");

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<DeliverySettings | null>(null);
  const [coverCount, setCoverCount] = useState<number | null>(null);

  // store pincode lookup (area / district / state dekhano)
  const [pincodeInfo, setPincodeInfo] = useState<PincodeInfo | null>(null);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeNotFound, setPincodeNotFound] = useState(false);
  const lookupRef = useRef(0);

  // radius er moddhe kon kon pincode porche
  const [cover, setCover] = useState<{
    visible: boolean;
    loading: boolean;
    radiusKm: number;
    total: number;
    truncated: boolean;
    pincodes: PincodeInfo[];
    search: string;
  }>({
    visible: false,
    loading: false,
    radiusKm: 0,
    total: 0,
    truncated: false,
    pincodes: [],
    search: "",
  });

  // customer pincode diye test
  const [testPin, setTestPin] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DeliveryCheckResult | null>(
    null,
  );

  const selectedStore = useMemo(
    () => stores.find((s) => s._id === storeId) || null,
    [stores, storeId],
  );

  const needsLocal = form.deliveryType !== "NATIONAL";
  const needsNational = form.deliveryType !== "LOCAL";

  // ---------- stores load ----------
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await axiosInstance.get("/api/register/user-based-stores");
        const list: StoreOption[] = res.data?.stores || [];
        setStores(list);
        if (list.length > 0) setStoreId(list[0]._id);
      } catch (error: any) {
        toast.error(errMsg(error, "Failed to load stores"));
      } finally {
        setStoresLoading(false);
      }
    };
    loadStores();
  }, []);

  // ---------- settings load ----------
  const loadSettings = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await getDeliverySettings(id);
      const s: DeliverySettings | null = res.data?.settings || null;

      setSaved(s);
      setCoverCount(null);
      setErrors({});
      setTestResult(null);
      setTestPin("");

      if (s) {
        setForm({
          deliveryType: s.deliveryType,
          pincode: s.pincode,
          radiusKm: s.radiusKm ?? DEFAULT_FORM.radiusKm,
          localDeliveryDays: s.localDeliveryDays ?? DEFAULT_FORM.localDeliveryDays,
          nationalMinDays: s.nationalMinDays ?? DEFAULT_FORM.nationalMinDays,
          nationalMaxDays: s.nationalMaxDays ?? DEFAULT_FORM.nationalMaxDays,
          handlingDays: s.handlingDays ?? DEFAULT_FORM.handlingDays,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
    } catch (error: any) {
      toast.error(errMsg(error, "Failed to load delivery settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (storeId) loadSettings(storeId);
  }, [storeId, loadSettings]);

  // ---------- store pincode lookup (debounce + stale guard) ----------
  useEffect(() => {
    const pin = form.pincode.trim();

    if (!PINCODE_REGEX.test(pin)) {
      lookupRef.current += 1;
      setPincodeInfo(null);
      setPincodeNotFound(false);
      setPincodeChecking(false);
      return;
    }

    const id = ++lookupRef.current;
    setPincodeChecking(true);

    const timer = setTimeout(async () => {
      try {
        const res = await lookupPincode(pin);
        if (id !== lookupRef.current) return;
        setPincodeInfo(res.data?.pincode || null);
        setPincodeNotFound(false);
      } catch (error: any) {
        if (id !== lookupRef.current) return;
        setPincodeInfo(null);
        setPincodeNotFound(error?.response?.status === 404);
      } finally {
        if (id === lookupRef.current) setPincodeChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [form.pincode]);

  // ---------- form helpers ----------
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  // ---------- save ----------
  const handleSave = async () => {
    if (!storeId) return;

    const parsed = deliverySettingsSchema.safeParse({ storeId, ...form });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0] ?? "form");
        if (!map[key]) map[key] = issue.message;
      });
      setErrors(map);
      toast.error("Please fix the highlighted fields");
      return;
    }

    if (pincodeChecking) {
      toast.info("Checking pincode, please wait a moment");
      return;
    }
    if (pincodeNotFound) {
      setErrors({ pincode: "Pincode not found" });
      return;
    }

    const d = parsed.data;
    const local = d.deliveryType !== "NATIONAL";
    const national = d.deliveryType !== "LOCAL";

    const payload: SaveDeliveryPayload = {
      storeId: d.storeId,
      deliveryType: d.deliveryType,
      pincode: d.pincode,
      handlingDays: d.handlingDays ?? 1,
      ...(local
        ? { radiusKm: d.radiusKm, localDeliveryDays: d.localDeliveryDays }
        : {}),
      ...(national
        ? {
            nationalMinDays: d.nationalMinDays,
            nationalMaxDays: d.nationalMaxDays,
          }
        : {}),
    };

    try {
      setSaving(true);
      const res = await saveDeliverySettings(payload);
      toast.success(res.data?.message || "Delivery settings saved");
      setSaved(res.data?.settings || null);
      setCoverCount(
        typeof res.data?.servicePincodeCount === "number"
          ? res.data.servicePincodeCount
          : null,
      );
      setErrors({});
      setTestResult(null);
    } catch (error: any) {
      // backend field error thakle sei field e dekhao
      const backendErrors = error?.response?.data?.errors;
      if (Array.isArray(backendErrors)) {
        const map: Record<string, string> = {};
        backendErrors.forEach((e: any) => {
          if (e?.field && !map[e.field]) map[e.field] = e.message;
        });
        setErrors(map);
      }
      toast.error(errMsg(error, "Failed to save delivery settings"));
    } finally {
      setSaving(false);
    }
  };

  // ---------- covered pincodes ----------
  const openCover = async () => {
    if (!storeId) return;
    setCover((c) => ({ ...c, visible: true, loading: true, search: "" }));
    try {
      const res = await getServicePincodes(storeId);
      setCover((c) => ({
        ...c,
        loading: false,
        radiusKm: res.data?.radiusKm ?? 0,
        total: res.data?.total ?? 0,
        truncated: !!res.data?.truncated,
        pincodes: res.data?.pincodes || [],
      }));
    } catch (error: any) {
      setCover((c) => ({ ...c, loading: false, pincodes: [] }));
      toast.error(errMsg(error, "Failed to load pincodes"));
    }
  };

  const filteredCover = useMemo(() => {
    const q = cover.search.trim().toLowerCase();
    if (!q) return cover.pincodes;
    return cover.pincodes.filter(
      (p) =>
        p.pincode.includes(q) ||
        p.area?.toLowerCase().includes(q) ||
        p.district?.toLowerCase().includes(q),
    );
  }, [cover.pincodes, cover.search]);

  // ---------- test customer pincode ----------
  const runTest = async () => {
    const pin = testPin.trim();
    if (!PINCODE_REGEX.test(pin)) {
      toast.error("Enter a valid 6 digit pincode");
      return;
    }
    if (!selectedStore?.storeUniqueId) {
      toast.error("Store unique id not found");
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const res = await checkDelivery(selectedStore.storeUniqueId, pin);
      setTestResult(res.data);
    } catch (error: any) {
      toast.error(errMsg(error, "Could not check this pincode"));
    } finally {
      setTesting(false);
    }
  };

  // ---------- live preview (customer ki dekhbe) ----------
  const handling = form.handlingDays ?? 0;
  const localLabel = formatDaysLabel(
    handling + (form.localDeliveryDays ?? 0),
    handling + (form.localDeliveryDays ?? 0),
  );
  const nationalLabel = formatDaysLabel(
    handling + (form.nationalMinDays ?? 0),
    handling + (form.nationalMaxDays ?? 0),
  );

  // ---------- header ----------
  const header = (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
      style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-white">
          Delivery
        </h2>
        <p className="text-xs text-blue-100">
          Set where you deliver and how long it takes
        </p>
      </div>

      {stores.length > 1 ? (
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="p-inputtext-sm border rounded-md px-2 py-1.5 bg-white"
        >
          {stores.map((s) => (
            <option key={s._id} value={s._id}>
              {s.storeName}
            </option>
          ))}
        </select>
      ) : (
        selectedStore && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
            <i className="pi pi-shop mr-1.5"></i>
            {selectedStore.storeName}
          </span>
        )
      )}
    </div>
  );

  if (storesLoading) {
    return (
      <div className="w-full flex justify-start items-start pt-2">
        <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
          <Spinner />
        </div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="w-full flex justify-start items-start pt-2">
        <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
          {header}
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="text-6xl mb-4">🚚</div>
            <h2 className="text-xl font-semibold text-gray-700">
              No Store Found
            </h2>
            <p className="text-gray-500 mt-2 max-w-md">
              Create a store first, then you can set up its delivery area.
            </p>
          </div>
        </div>
        <ToastContainer position="top-right" />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4 space-y-3">
        {header}

        {loading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* ---------------- LEFT: form ---------------- */}
            <div className="lg:col-span-2 space-y-3">
              {/* Delivery type */}
              <div className="border border-blue-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Delivery type
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const active = form.deliveryType === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setField("deliveryType", opt.value)}
                        className={`text-left rounded-lg border p-3 transition-colors ${
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
                            {opt.label}
                          </span>
                          {active && (
                            <i className="pi pi-check-circle text-blue-600 ml-auto" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Store pincode */}
              <div className="border border-blue-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Your store location
                </p>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  Store pincode <span className="text-red-500">*</span>
                </label>
                <IconField iconPosition="left" className="w-full sm:w-64">
                  <InputIcon
                    className={
                      pincodeChecking
                        ? "pi pi-spin pi-spinner"
                        : "pi pi-map-marker"
                    }
                  />
                  <InputText
                    value={form.pincode}
                    onChange={(e) =>
                      setField(
                        "pincode",
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 700001"
                    className={`p-inputtext-sm w-full ${
                      errors.pincode || pincodeNotFound ? "p-invalid" : ""
                    }`}
                  />
                </IconField>

                {pincodeInfo && !errors.pincode && (
                  <p className="text-xs text-green-700 mt-1.5">
                    <i className="pi pi-check-circle mr-1"></i>
                    {[pincodeInfo.area, pincodeInfo.district, pincodeInfo.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {pincodeNotFound && !errors.pincode && (
                  <FieldError msg="Pincode not found" />
                )}
                <FieldError msg={errors.pincode} />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  This is the centre point of your delivery radius.
                </p>
              </div>

              {/* Local delivery */}
              {needsLocal && (
                <div className="border border-blue-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    <i className="pi pi-map-marker text-blue-600 mr-1.5"></i>
                    Local delivery
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">
                        Delivery radius <span className="text-red-500">*</span>
                      </label>
                      <InputNumber
                        value={form.radiusKm}
                        onValueChange={(e) =>
                          setField("radiusKm", e.value ?? null)
                        }
                        min={1}
                        max={500}
                        suffix=" km"
                        useGrouping={false}
                        className="w-full"
                        inputClassName={`w-full p-inputtext-sm ${
                          errors.radiusKm ? "p-invalid" : ""
                        }`}
                      />
                      <FieldError msg={errors.radiusKm} />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {RADIUS_PRESETS.map((r) => (
                          <button
                            type="button"
                            key={r}
                            onClick={() => setField("radiusKm", r)}
                            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                              form.radiusKm === r
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {r} km
                          </button>
                        ))}
                      </div>
                    </div>

                    <DaysField
                      label="Local delivery time"
                      hint="Transit time after your dispatch time"
                      value={form.localDeliveryDays}
                      onChange={(v) => setField("localDeliveryDays", v)}
                      error={errors.localDeliveryDays}
                    />
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2">
                    Radius is calculated from pincode locations, so it is an
                    approximate distance.
                  </p>
                </div>
              )}

              {/* National delivery */}
              {needsNational && (
                <div className="border border-blue-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    <i className="pi pi-globe text-blue-600 mr-1.5"></i>
                    National delivery (courier)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DaysField
                      label="Minimum days"
                      value={form.nationalMinDays}
                      onChange={(v) => setField("nationalMinDays", v)}
                      error={errors.nationalMinDays}
                      max={60}
                    />
                    <DaysField
                      label="Maximum days"
                      value={form.nationalMaxDays}
                      onChange={(v) => setField("nationalMaxDays", v)}
                      error={errors.nationalMaxDays}
                      max={60}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Courier handling and delivery charges are not part of this
                    setting yet.
                  </p>
                </div>
              )}

              {/* Handling */}
              <div className="border border-blue-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  <i className="pi pi-box text-blue-600 mr-1.5"></i>
                  Order preparation
                </p>
                <div className="sm:w-1/2">
                  <DaysField
                    label="Dispatch time"
                    hint="Days you need to pack and hand over an order. Added to every estimate"
                    value={form.handlingDays}
                    onChange={(v) => setField("handlingDays", v)}
                    error={errors.handlingDays}
                  />
                </div>
              </div>

              {/* Save bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border border-blue-100 rounded-lg p-3 bg-blue-50/50">
                <div className="text-sm text-gray-600">
                  {saved ? (
                    <span>
                      <i className="pi pi-check-circle text-green-600 mr-1.5"></i>
                      Delivery is set up
                      {coverCount !== null && needsLocal && (
                        <b className="text-blue-700">
                          {" "}
                          • covers {coverCount} pincode
                          {coverCount === 1 ? "" : "s"}
                        </b>
                      )}
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      <i className="pi pi-info-circle mr-1.5"></i>
                      Not set up yet. Customers will not see delivery estimates
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {saved && saved.deliveryType !== "NATIONAL" && (
                    <Button
                      label="View covered pincodes"
                      icon="pi pi-list"
                      text
                      size="small"
                      onClick={openCover}
                    />
                  )}
                  <Button
                    label={saved ? "Update" : "Save"}
                    icon="pi pi-save"
                    loading={saving}
                    onClick={handleSave}
                  />
                </div>
              </div>
            </div>

            {/* ---------------- RIGHT: preview + test ---------------- */}
            <div className="space-y-3 self-start">
              {/* Customer preview */}
              <div className="border border-blue-100 rounded-lg overflow-hidden text-sm">
                <div className="bg-blue-50 px-3 py-2">
                  <p className="font-semibold text-blue-800">
                    <i className="pi pi-eye mr-1.5"></i>
                    What customers see
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {needsLocal && (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-gray-700 font-medium">
                          Within {form.radiusKm ?? "—"} km
                        </p>
                        <p className="text-xs text-gray-400">Local delivery</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 whitespace-nowrap">
                        {localLabel}
                      </span>
                    </div>
                  )}
                  {needsNational && (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-gray-700 font-medium">
                          {needsLocal ? "Everywhere else" : "All over India"}
                        </p>
                        <p className="text-xs text-gray-400">Courier</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                        {nationalLabel}
                      </span>
                    </div>
                  )}
                  {!needsNational && (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-700 font-medium">
                        Outside your radius
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
                        Not deliverable
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Test a pincode */}
              <div className="border border-blue-100 rounded-lg overflow-hidden text-sm">
                <div className="bg-blue-50 px-3 py-2">
                  <p className="font-semibold text-blue-800">
                    <i className="pi pi-search mr-1.5"></i>
                    Test a customer pincode
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {!saved ? (
                    <p className="text-xs text-gray-500">
                      Save your delivery settings first to test a pincode.
                    </p>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <InputText
                          value={testPin}
                          onChange={(e) =>
                            setTestPin(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") runTest();
                          }}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Customer pincode"
                          className="p-inputtext-sm w-full"
                        />
                        <Button
                          icon="pi pi-check"
                          loading={testing}
                          onClick={runTest}
                          disabled={testPin.length !== 6}
                        />
                      </div>

                      {testResult && testResult.deliverable && (
                        <div className="text-xs bg-green-50 border border-green-200 text-green-800 rounded-md p-2 space-y-0.5">
                          {testResult.delivery ? (
                            <>
                              <p className="font-semibold">
                                {formatDaysLabel(
                                  testResult.delivery.minDays,
                                  testResult.delivery.maxDays,
                                )}
                              </p>
                              <p>
                                {testResult.delivery.mode === "LOCAL"
                                  ? "Local delivery"
                                  : "Courier delivery"}
                                {testResult.delivery.distanceKm !== null &&
                                testResult.delivery.distanceKm !== undefined
                                  ? ` • about ${testResult.delivery.distanceKm} km away`
                                  : ""}
                              </p>
                              <p>
                                Expected by{" "}
                                {formatEstimateRange(testResult.delivery)}
                              </p>
                            </>
                          ) : (
                            <p>Deliverable</p>
                          )}
                        </div>
                      )}

                      {testResult && !testResult.deliverable && (
                        <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-md p-2">
                          <i className="pi pi-times-circle mr-1"></i>
                          {testResult.message || "Not deliverable"}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700">How it works</p>
                <p>
                  • The customer&apos;s pincode comes from their delivery address.
                </p>
                <p>
                  • Inside your radius, the local delivery time is used.
                  Otherwise, the national time applies (if enabled).
                </p>
                <p>
                  • Orders to pincodes you do not deliver to are blocked at
                  checkout.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Covered pincodes dialog */}
        <Dialog
          header={`Pincodes within ${cover.radiusKm || form.radiusKm || ""} km`}
          visible={cover.visible}
          style={{ width: "36rem" }}
          breakpoints={{ "641px": "95vw" }}
          onHide={() => setCover((c) => ({ ...c, visible: false }))}
        >
          {cover.loading ? (
            <Spinner />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm text-gray-600">
                  <b className="text-blue-700">{cover.total}</b> pincode
                  {cover.total === 1 ? "" : "s"} covered
                </p>
                {cover.truncated && (
                  <span className="text-[11px] text-amber-700">
                    Showing the first {cover.pincodes.length}
                  </span>
                )}
              </div>

              <IconField iconPosition="left" className="w-full mb-2">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={cover.search}
                  onChange={(e) =>
                    setCover((c) => ({ ...c, search: e.target.value }))
                  }
                  placeholder="Search pincode / area / district"
                  className="p-inputtext-sm w-full"
                />
              </IconField>

              <div className="max-h-80 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredCover.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4 sm:col-span-2">
                    No pincode found
                  </p>
                )}
                {filteredCover.map((p) => (
                  <div
                    key={p.pincode}
                    className="border border-gray-200 rounded-md px-2.5 py-1.5"
                  >
                    <p className="text-sm font-semibold text-gray-800">
                      {p.pincode}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {[p.area, p.district].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Dialog>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default DeliveryPage;