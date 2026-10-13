"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputSwitch } from "primereact/inputswitch";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Dialog } from "primereact/dialog";
// NOTE: path ta tomar schema.ts er asol path diye bodle nao
import { deliverySettingsSchema } from "@/helper/schema/Schema";
import { getStoreSettings } from "@/service/storeSetting.service";
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
import {
  DurationUnit,
  formatDurationLabel,
  formatEstimateAt,
  formatEstimateRange,
  getEtaLabel,
  toMinutes,
} from "@/helper/delivery";

type StoreOption = {
  _id: string;
  storeName: string;
  storeUniqueId?: string;
};

type SlabForm = {
  id: string;
  upToKm: number | null;
  charge: number | null;
  etaValue: number | null;
  etaUnit: DurationUnit;
};

type RuleForm = {
  id: string;
  minOrderValue: number | null;
  charge: number | null;
};

type FormState = {
  local: boolean; // radius er moddhe delivery
  outside: boolean; // radius er baire (courier)
  allowInternational: boolean;
  pincode: string;
  radiusKm: number | null;
  slabs: SlabForm[];
  rules: RuleForm[];
  nationalMinDays: number | null;
  nationalMaxDays: number | null;
  nationalFallbackCharge: number | null;
  internationalMinDays: number | null;
  internationalMaxDays: number | null;
  internationalFallbackCharge: number | null;
  handlingValue: number | null;
  handlingUnit: DurationUnit;
};

const UNIT_OPTIONS: { value: DurationUnit; label: string }[] = [
  { value: "MINUTES", label: "Minutes" },
  { value: "HOURS", label: "Hours" },
  { value: "DAYS", label: "Days" },
];

const RADIUS_PRESETS = [5, 10, 20, 50, 100];
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const uid = () => Math.random().toString(36).slice(2, 10);

const newSlab = (upToKm: number | null = null): SlabForm => ({
  id: uid(),
  upToKm,
  charge: 0,
  etaValue: 1,
  etaUnit: "DAYS",
});

const newRule = (): RuleForm => ({
  id: uid(),
  minOrderValue: null,
  charge: 0,
});

const makeDefaultForm = (): FormState => ({
  local: true,
  outside: false,
  allowInternational: false,
  pincode: "",
  radiusKm: 20,
  slabs: [newSlab(20)],
  rules: [],
  nationalMinDays: 4,
  nationalMaxDays: 7,
  nationalFallbackCharge: 0,
  internationalMinDays: 7,
  internationalMaxDays: 14,
  internationalFallbackCharge: 0,
  handlingValue: 1,
  handlingUnit: "DAYS",
});

const errMsg = (err: any, fallback: string) =>
  err?.response?.data?.errors?.[0]?.message ||
  err?.response?.data?.message ||
  fallback;

const isIndiaCountry = (c: string) => {
  const v = c.trim().toLowerCase();
  return !v || ["india", "in", "ind", "bharat"].includes(v);
};

const inr = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "-"
    : n === 0
      ? "Free"
      : `₹${Number(n).toFixed(2).replace(/\.00$/, "")}`;

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

// ---------- ekta switch row ----------
function ToggleRow({
  icon,
  title,
  desc,
  checked,
  disabled,
  onChange,
  error,
}: {
  icon: string;
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
          checked ? "border-blue-300 bg-blue-50/60" : "border-gray-200"
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <i
            className={`pi ${icon} mt-0.5 ${
              checked ? "text-blue-600" : "text-gray-400"
            }`}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {desc}
            </p>
          </div>
        </div>
        <InputSwitch
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(!!e.value)}
        />
      </div>
      <FieldError msg={error} />
    </div>
  );
}

// ---------- value + unit (Minutes / Hours / Days) ----------
function DurationInput({
  value,
  unit,
  onValue,
  onUnit,
  error,
}: {
  value: number | null;
  unit: DurationUnit;
  onValue: (v: number | null) => void;
  onUnit: (u: DurationUnit) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex gap-1.5">
        <InputNumber
          value={value}
          onValueChange={(e) => onValue(e.value ?? null)}
          mode="decimal"
          min={0}
          max={100000}
          maxFractionDigits={2}
          useGrouping={false}
          className="flex-1 min-w-0"
          inputClassName={`w-full p-inputtext-sm ${error ? "p-invalid" : ""}`}
        />
        <select
          value={unit}
          onChange={(e) => onUnit(e.target.value as DurationUnit)}
          className="border rounded-md px-2 py-1.5 bg-white text-sm"
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  error,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  error?: string;
}) {
  return (
    <div>
      <InputNumber
        value={value}
        onValueChange={(e) => onChange(e.value ?? null)}
        mode="currency"
        currency="INR"
        locale="en-IN"
        min={0}
        className="w-full"
        inputClassName={`w-full p-inputtext-sm ${error ? "p-invalid" : ""}`}
      />
      <FieldError msg={error} />
    </div>
  );
}

function DaysInput({
  label,
  value,
  onChange,
  error,
  max = 60,
}: {
  label: string;
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
      <FieldError msg={error} />
    </div>
  );
}

function DeliveryPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storeId, setStoreId] = useState("");

  const [form, setForm] = useState<FormState>(makeDefaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<DeliverySettings | null>(null);
  const [coverCount, setCoverCount] = useState<number | null>(null);
  const [deliveryOff, setDeliveryOff] = useState(false);

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

  // customer address diye test
  const [testPin, setTestPin] = useState("");
  const [testCountry, setTestCountry] = useState("India");
  const [testValue, setTestValue] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DeliveryCheckResult | null>(null);

  const selectedStore = useMemo(
    () => stores.find((s) => s._id === storeId) || null,
    [stores, storeId],
  );

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
      const [res, general] = await Promise.all([
        getDeliverySettings(id),
        getStoreSettings(id).catch(() => null),
      ]);
      setDeliveryOff(general?.data?.settings?.hasDelivery === false);

      const s: DeliverySettings | null = res.data?.settings || null;

      setSaved(s);
      setCoverCount(null);
      setErrors({});
      setTestResult(null);
      setTestPin("");

      if (!s) {
        setForm(makeDefaultForm());
        return;
      }

      const slabs: SlabForm[] =
        s.localSlabs && s.localSlabs.length > 0
          ? s.localSlabs.map((x) => ({
              id: uid(),
              upToKm: x.upToKm,
              charge: x.charge,
              etaValue: x.etaValue,
              etaUnit: x.etaUnit,
            }))
          : // purono setting (slab nei): flat charge / din theke ekta slab
            [
              {
                id: uid(),
                upToKm: s.radiusKm ?? 20,
                charge: s.localDeliveryCharge ?? 0,
                etaValue: s.localDeliveryDays ?? 1,
                etaUnit: "DAYS" as DurationUnit,
              },
            ];

      setForm({
        local: s.deliveryType !== "NATIONAL",
        outside: s.deliveryType !== "LOCAL",
        allowInternational: s.allowInternational === true,
        pincode: s.pincode,
        radiusKm: s.radiusKm ?? 20,
        slabs,
        rules: (s.chargeRules || []).map((r) => ({
          id: uid(),
          minOrderValue: r.minOrderValue,
          charge: r.charge,
        })),
        nationalMinDays: s.nationalMinDays ?? 4,
        nationalMaxDays: s.nationalMaxDays ?? 7,
        nationalFallbackCharge: s.nationalFallbackCharge ?? 0,
        internationalMinDays: s.internationalMinDays ?? 7,
        internationalMaxDays: s.internationalMaxDays ?? 14,
        internationalFallbackCharge: s.internationalFallbackCharge ?? 0,
        handlingValue: s.handlingValue ?? s.handlingDays ?? 1,
        handlingUnit: s.handlingUnit ?? "DAYS",
      });
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
  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key as string);
  };

  const toggleLocal = (v: boolean) => {
    setForm((p) => ({ ...p, local: v }));
  };

  const toggleOutside = (v: boolean) => {
    setForm((p) => ({
      ...p,
      outside: v,
      allowInternational: v ? p.allowInternational : false,
    }));
  };

  const updateSlab = (id: string, patch: Partial<SlabForm>) => {
    setForm((p) => ({
      ...p,
      slabs: p.slabs.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    setErrors({});
  };

  const addSlab = () => {
    setForm((p) => {
      const last = p.slabs[p.slabs.length - 1];
      const lastKm = last?.upToKm ?? null;
      const candidate =
        lastKm !== null ? Math.min(lastKm + 5, p.radiusKm ?? 500) : null;
      // last slab e radius er soman hole same distance hoye jabe, tai blank rakhi
      const next = candidate !== null && candidate > (lastKm ?? 0) ? candidate : null;
      return { ...p, slabs: [...p.slabs, newSlab(next)] };
    });
  };

  const removeSlab = (id: string) => {
    setForm((p) => ({ ...p, slabs: p.slabs.filter((s) => s.id !== id) }));
    setErrors({});
  };

  const updateRule = (id: string, patch: Partial<RuleForm>) => {
    setForm((p) => ({
      ...p,
      rules: p.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    setErrors({});
  };

  const addRule = () => setForm((p) => ({ ...p, rules: [...p.rules, newRule()] }));

  const removeRule = (id: string) => {
    setForm((p) => ({ ...p, rules: p.rules.filter((r) => r.id !== id) }));
    setErrors({});
  };

  // ---------- save ----------
  const handleSave = async () => {
    if (!storeId) return;

    const deliveryType: DeliveryType | null =
      form.local && form.outside
        ? "BOTH"
        : form.local
          ? "LOCAL"
          : form.outside
            ? "NATIONAL"
            : null;

    if (!deliveryType) {
      toast.error("Turn on at least one delivery option");
      return;
    }

    const parsed = deliverySettingsSchema.safeParse({
      storeId,
      deliveryType,
      pincode: form.pincode,
      // local OFF hole hidden radius / slab validate korbo na
      radiusKm: form.local ? form.radiusKm : undefined,
      localSlabs: form.local ? form.slabs.map(({ id, ...rest }) => rest) : [],
      chargeRules: form.rules.map(({ id, ...rest }) => rest),
      nationalMinDays: form.nationalMinDays,
      nationalMaxDays: form.nationalMaxDays,
      nationalFallbackCharge: form.nationalFallbackCharge,
      allowInternational: form.allowInternational,
      internationalMinDays: form.internationalMinDays,
      internationalMaxDays: form.internationalMaxDays,
      internationalFallbackCharge: form.internationalFallbackCharge,
      handlingValue: form.handlingValue,
      handlingUnit: form.handlingUnit,
    });

    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach(
        (issue: { path: PropertyKey[]; message: string }) => {
          const key = issue.path.map(String).join(".") || "form";
          if (!map[key]) map[key] = issue.message;
        },
      );
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
      handlingValue: d.handlingValue,
      handlingUnit: d.handlingUnit,
      chargeRules: d.chargeRules,
      ...(local
        ? { radiusKm: d.radiusKm, localSlabs: d.localSlabs }
        : {}),
      ...(national
        ? {
            nationalMinDays: d.nationalMinDays,
            nationalMaxDays: d.nationalMaxDays,
            nationalFallbackCharge: d.nationalFallbackCharge ?? 0,
            allowInternational: d.allowInternational,
            ...(d.allowInternational
              ? {
                  internationalMinDays: d.internationalMinDays,
                  internationalMaxDays: d.internationalMaxDays,
                  internationalFallbackCharge: d.internationalFallbackCharge ?? 0,
                }
              : {}),
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

  // ---------- test customer address ----------
  const testIsIndia = isIndiaCountry(testCountry);

  const runTest = async () => {
    const pin = testPin.trim();
    if (testIsIndia ? !PINCODE_REGEX.test(pin) : pin.length < 3) {
      toast.error(
        testIsIndia ? "Enter a valid 6 digit pincode" : "Enter a valid postal code",
      );
      return;
    }
    if (!selectedStore?.storeUniqueId) {
      toast.error("Store unique id not found");
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const res = await checkDelivery(selectedStore.storeUniqueId, pin, {
        country: testCountry.trim() || "India",
        ...(testValue !== null ? { itemsTotal: testValue } : {}),
      });
      setTestResult(res.data);
    } catch (error: any) {
      toast.error(errMsg(error, "Could not check this address"));
    } finally {
      setTesting(false);
    }
  };

  // ---------- live preview (customer ki dekhbe) ----------
  const handlingMin = toMinutes(form.handlingValue ?? 0, form.handlingUnit);

  const slabPreview = [...form.slabs]
    .filter((s) => s.upToKm !== null)
    .sort((a, b) => (a.upToKm ?? 0) - (b.upToKm ?? 0))
    .map((s) => {
      const total = handlingMin + toMinutes(s.etaValue ?? 0, s.etaUnit);
      return {
        id: s.id,
        upToKm: s.upToKm as number,
        charge: s.charge ?? 0,
        label: formatDurationLabel(total, total),
      };
    });

  const rulePreview = [...form.rules]
    .filter((r) => r.minOrderValue !== null)
    .sort((a, b) => (a.minOrderValue ?? 0) - (b.minOrderValue ?? 0));

  const nationalLabel = formatDurationLabel(
    handlingMin + (form.nationalMinDays ?? 0) * 1440,
    handlingMin + (form.nationalMaxDays ?? 0) * 1440,
  );
  const intlLabel = formatDurationLabel(
    handlingMin + (form.internationalMinDays ?? 0) * 1440,
    handlingMin + (form.internationalMaxDays ?? 0) * 1440,
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
          Set where you deliver, how long it takes and what it costs
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

        {deliveryOff && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-2.5">
            <i className="pi pi-info-circle mr-1.5"></i>
            Delivery is turned off for this store, so customers will not see
            delivery time or shipping charge and these settings are ignored.
            Turn it on from Store Settings.
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* ---------------- LEFT: form ---------------- */}
            <div className="lg:col-span-2 space-y-3">
              {/* Where */}
              <div className="border border-blue-100 rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  Where do you deliver?
                </p>

                <ToggleRow
                  icon="pi-map-marker"
                  title="Within my radius"
                  desc="You deliver to customers inside the radius you set below"
                  checked={form.local}
                  disabled={form.local && !form.outside}
                  onChange={toggleLocal}
                />

                <ToggleRow
                  icon="pi-truck"
                  title="Outside my radius (courier)"
                  desc="Also deliver outside your radius by courier. If this is OFF, customers outside your radius cannot place an order from your store"
                  checked={form.outside}
                  disabled={form.outside && !form.local}
                  onChange={toggleOutside}
                />

                {form.outside && (
                  <ToggleRow
                    icon="pi-globe"
                    title="Other countries (international)"
                    desc="Also accept addresses and postal codes from outside India. Needs international shipping to be active on your courier account"
                    checked={form.allowInternational}
                    onChange={(v) => setField("allowInternational", v)}
                    error={errors.allowInternational}
                  />
                )}
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
                  This is the centre of your delivery radius and the courier
                  pickup point.
                </p>
              </div>

              {/* Local: radius + slabs */}
              {form.local && (
                <div className="border border-blue-100 rounded-lg p-3 space-y-3">
                  <p className="text-sm font-semibold text-gray-700">
                    <i className="pi pi-map-marker text-blue-600 mr-1.5"></i>
                    Delivery inside my radius
                  </p>

                  <div className="sm:w-1/2">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">
                      Delivery radius <span className="text-red-500">*</span>
                    </label>
                    <InputNumber
                      value={form.radiusKm}
                      onValueChange={(e) => setField("radiusKm", e.value ?? null)}
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

                  <div>
                    <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-semibold text-gray-500 mb-1 px-1">
                      <span className="col-span-3">Up to distance</span>
                      <span className="col-span-3">Delivery charge</span>
                      <span className="col-span-5">Delivery time</span>
                      <span className="col-span-1"></span>
                    </div>

                    <div className="space-y-2">
                      {form.slabs.map((s, i) => (
                        <div
                          key={s.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start border border-gray-100 rounded-md p-2 sm:p-1 sm:border-0"
                        >
                          <div className="sm:col-span-3">
                            <InputNumber
                              value={s.upToKm}
                              onValueChange={(e) =>
                                updateSlab(s.id, { upToKm: e.value ?? null })
                              }
                              min={0}
                              max={500}
                              suffix=" km"
                              mode="decimal"
                              maxFractionDigits={1}
                              useGrouping={false}
                              className="w-full"
                              inputClassName={`w-full p-inputtext-sm ${
                                errors[`localSlabs.${i}.upToKm`] ? "p-invalid" : ""
                              }`}
                            />
                            <FieldError msg={errors[`localSlabs.${i}.upToKm`]} />
                          </div>

                          <div className="sm:col-span-3">
                            <MoneyInput
                              value={s.charge}
                              onChange={(v) => updateSlab(s.id, { charge: v })}
                              error={errors[`localSlabs.${i}.charge`]}
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <DurationInput
                              value={s.etaValue}
                              unit={s.etaUnit}
                              onValue={(v) => updateSlab(s.id, { etaValue: v })}
                              onUnit={(u) => updateSlab(s.id, { etaUnit: u })}
                              error={errors[`localSlabs.${i}.etaValue`]}
                            />
                          </div>

                          <div className="sm:col-span-1 flex sm:justify-center">
                            <Button
                              icon="pi pi-trash"
                              text
                              severity="danger"
                              size="small"
                              disabled={form.slabs.length === 1}
                              onClick={() => removeSlab(s.id)}
                              aria-label="Remove slab"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <FieldError msg={errors.localSlabs} />

                    <Button
                      label="Add distance slab"
                      icon="pi pi-plus"
                      outlined
                      size="small"
                      className="mt-2"
                      onClick={addSlab}
                    />

                    <p className="text-[11px] text-gray-400 mt-2">
                      Example: up to 5 km = ₹30 in 45 minutes, up to 15 km = ₹60
                      in 3 hours. A customer farther than the last slab (but
                      inside your radius) gets the last slab&apos;s charge and time.
                    </p>
                  </div>
                </div>
              )}

              {/* Order value rules */}
              <div className="border border-blue-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  <i className="pi pi-tag text-blue-600 mr-1.5"></i>
                  Charge by order value
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Change the delivery charge when the order is big enough. Use ₹0
                  for free delivery. The highest matching rule is used and the
                  customer sees it before paying.
                </p>

                <div className="space-y-2">
                  {form.rules.map((r, i) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start"
                    >
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-semibold text-gray-500 block mb-0.5">
                          If order is at least
                        </label>
                        <MoneyInput
                          value={r.minOrderValue}
                          onChange={(v) => updateRule(r.id, { minOrderValue: v })}
                          error={errors[`chargeRules.${i}.minOrderValue`]}
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-semibold text-gray-500 block mb-0.5">
                          Delivery charge becomes
                        </label>
                        <MoneyInput
                          value={r.charge}
                          onChange={(v) => updateRule(r.id, { charge: v })}
                          error={errors[`chargeRules.${i}.charge`]}
                        />
                      </div>
                      <div className="sm:col-span-2 flex sm:pt-5">
                        <Button
                          icon="pi pi-trash"
                          text
                          severity="danger"
                          size="small"
                          onClick={() => removeRule(r.id)}
                          aria-label="Remove rule"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <FieldError msg={errors.chargeRules} />

                <Button
                  label="Add rule"
                  icon="pi pi-plus"
                  outlined
                  size="small"
                  className="mt-2"
                  onClick={addRule}
                />
                <p className="text-[11px] text-gray-400 mt-2">
                  Applies to your own delivery and courier delivery. If you give
                  free or cheaper courier delivery, the extra courier cost is
                  taken from your payout. International orders always pay the
                  courier rate.
                </p>
              </div>

              {/* National */}
              {/* {form.outside && (
                <div className="border border-blue-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    <i className="pi pi-truck text-blue-600 mr-1.5"></i>
                    Courier delivery (outside my radius, India)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DaysInput
                      label="Backup minimum days"
                      value={form.nationalMinDays}
                      onChange={(v) => setField("nationalMinDays", v)}
                      error={errors.nationalMinDays}
                    />
                    <DaysInput
                      label="Backup maximum days"
                      value={form.nationalMaxDays}
                      onChange={(v) => setField("nationalMaxDays", v)}
                      error={errors.nationalMaxDays}
                    />
                  </div>
                  <div className="mt-3 sm:w-1/2">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">
                      Backup courier charge
                    </label>
                    <MoneyInput
                      value={form.nationalFallbackCharge}
                      onChange={(v) => setField("nationalFallbackCharge", v)}
                      error={errors.nationalFallbackCharge}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    The courier&apos;s real delivery time and rate for the
                    customer&apos;s pincode are used automatically. These backup
                    values are used only when courier rates are not available.
                  </p>
                </div>
              )} */}

              {/* International */}
              {/* {form.outside && form.allowInternational && (
                <div className="border border-blue-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    <i className="pi pi-globe text-blue-600 mr-1.5"></i>
                    International delivery
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DaysInput
                      label="Backup minimum days"
                      value={form.internationalMinDays}
                      onChange={(v) => setField("internationalMinDays", v)}
                      error={errors.internationalMinDays}
                      max={90}
                    />
                    <DaysInput
                      label="Backup maximum days"
                      value={form.internationalMaxDays}
                      onChange={(v) => setField("internationalMaxDays", v)}
                      error={errors.internationalMaxDays}
                      max={90}
                    />
                  </div>
                  <div className="mt-3 sm:w-1/2">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">
                      Backup international charge
                    </label>
                    <MoneyInput
                      value={form.internationalFallbackCharge}
                      onChange={(v) => setField("internationalFallbackCharge", v)}
                      error={errors.internationalFallbackCharge}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    The courier rate is used when available, otherwise these
                    values. Cash on Delivery is not available for international
                    orders. International shipments are created from the
                    Shiprocket panel because customs documents are needed.
                  </p>
                </div>
              )} */}

              {/* Dispatch time */}
              {/* <div className="border border-blue-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  <i className="pi pi-box text-blue-600 mr-1.5"></i>
                  Order preparation
                </p>
                <div className="sm:w-1/2">
                  <label className="text-sm font-semibold text-gray-700 block mb-1">
                    Dispatch time
                  </label>
                  <DurationInput
                    value={form.handlingValue}
                    unit={form.handlingUnit}
                    onValue={(v) => setField("handlingValue", v)}
                    onUnit={(u) => setField("handlingUnit", u)}
                    error={errors.handlingValue}
                  />
                  <small className="text-gray-400 block mt-1">
                    Time you need to pack and hand over an order. Added to every
                    delivery time. Use minutes or hours for quick local delivery.
                  </small>
                </div>
              </div> */}

              {/* Save bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border border-blue-100 rounded-lg p-3 bg-blue-50/50">
                <div className="text-sm text-gray-600">
                  {saved ? (
                    <span>
                      <i className="pi pi-check-circle text-green-600 mr-1.5"></i>
                      Delivery is set up
                      {coverCount !== null && form.local && (
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
                      Not set up yet. Customers will not see delivery details
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
              <div className="border border-blue-100 rounded-lg overflow-hidden text-sm">
                <div className="bg-blue-50 px-3 py-2">
                  <p className="font-semibold text-blue-800">
                    <i className="pi pi-eye mr-1.5"></i>
                    What customers see
                  </p>
                </div>
                <div className="p-3 space-y-2.5">
                  {form.local &&
                    slabPreview.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="text-gray-700 font-medium">
                            Up to {s.upToKm} km
                          </p>
                          <p className="text-xs text-gray-400">{s.label}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                            s.charge === 0
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {inr(s.charge)}
                        </span>
                      </div>
                    ))}

                  {form.outside && (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-gray-700 font-medium">
                          {form.local ? "Outside my radius" : "All over India"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Courier • {nationalLabel}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                        Courier rate
                      </span>
                    </div>
                  )}

                  {form.outside && form.allowInternational && (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-gray-700 font-medium">Other countries</p>
                        <p className="text-xs text-gray-400">
                          Courier • {intlLabel}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                        Courier rate
                      </span>
                    </div>
                  )}

                  {!form.outside && (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-700 font-medium">
                        Outside my radius
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
                        Cannot order
                      </span>
                    </div>
                  )}

                  {rulePreview.length > 0 && (
                    <div className="border-t border-gray-100 pt-2 space-y-1">
                      {rulePreview.map((r) => (
                        <p key={r.id} className="text-xs text-gray-600">
                          <i className="pi pi-tag mr-1 text-blue-500"></i>
                          Orders of ₹{r.minOrderValue}+ : delivery{" "}
                          <b>{inr(r.charge ?? 0)}</b>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-blue-100 rounded-lg overflow-hidden text-sm">
                <div className="bg-blue-50 px-3 py-2">
                  <p className="font-semibold text-blue-800">
                    <i className="pi pi-search mr-1.5"></i>
                    Test a customer address
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {!saved ? (
                    <p className="text-xs text-gray-500">
                      Save your delivery settings first to test an address.
                    </p>
                  ) : (
                    <>
                      <InputText
                        value={testCountry}
                        onChange={(e) => setTestCountry(e.target.value)}
                        placeholder="Country (default India)"
                        className="p-inputtext-sm w-full"
                      />
                      <div className="flex gap-2">
                        <InputText
                          value={testPin}
                          onChange={(e) =>
                            setTestPin(
                              testIsIndia
                                ? e.target.value.replace(/\D/g, "").slice(0, 6)
                                : e.target.value.slice(0, 12),
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") runTest();
                          }}
                          placeholder={testIsIndia ? "Pincode" : "Postal code"}
                          className="p-inputtext-sm w-full"
                        />
                        <Button
                          icon="pi pi-check"
                          loading={testing}
                          onClick={runTest}
                          disabled={testPin.trim().length < 3}
                        />
                      </div>
                      <InputNumber
                        value={testValue}
                        onValueChange={(e) => setTestValue(e.value ?? null)}
                        mode="currency"
                        currency="INR"
                        locale="en-IN"
                        min={0}
                        placeholder="Order value (optional)"
                        className="w-full"
                        inputClassName="w-full p-inputtext-sm"
                      />

                      {testResult && testResult.deliverable && (
                        <div className="text-xs bg-green-50 border border-green-200 text-green-800 rounded-md p-2 space-y-0.5">
                          {testResult.delivery ? (
                            <>
                              <p className="font-semibold">
                                {getEtaLabel(testResult.delivery)}
                              </p>
                              <p>
                                Shipping:{" "}
                                <b>{inr(testResult.delivery.shippingCharge ?? 0)}</b>
                                {testResult.delivery.baseShippingCharge !==
                                  undefined &&
                                  testResult.delivery.baseShippingCharge !== null &&
                                  testResult.delivery.baseShippingCharge !==
                                    testResult.delivery.shippingCharge && (
                                    <span className="line-through text-green-600 ml-1.5">
                                      {inr(testResult.delivery.baseShippingCharge)}
                                    </span>
                                  )}
                              </p>
                              {testResult.delivery.shippingNote && (
                                <p>{testResult.delivery.shippingNote}</p>
                              )}
                              <p>
                                Expected by{" "}
                                {(testResult.delivery.maxMinutes ?? 99999) < 1440
                                  ? formatEstimateAt(
                                      testResult.delivery.estimatedMaxAt,
                                    ) || formatEstimateRange(testResult.delivery)
                                  : formatEstimateRange(testResult.delivery)}
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
                <p>• The delivery charge is shown to the customer and added to the order total at payment.</p>
                <p>• Inside your radius the matching distance slab is used. Outside it, the courier rate is used (if enabled).</p>
                <p>• Order value rules can lower or remove the charge for bigger orders.</p>
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