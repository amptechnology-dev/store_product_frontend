"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import PayoutSummaryCards from "@/components/payouts/PayoutSummaryCards";
import PayoutDialog from "@/components/payouts/PayoutDialog";
import { money, cleanParams } from "@/types/paymentReport";
import {
  EMPTY_PAYOUT_SUMMARY,
  PayoutPayload,
  PayoutRow,
  PayoutSummary,
  StorePayoutRow,
  methodLabel,
} from "@/types/payout";

const PAYOUT_BASE = "/api/payment/payout";
const META_URL = "/api/payment/report/meta";

type Role = "ADMIN" | "STORE";

const safeDate = (d?: string | null) => (d ? formatDate(d) : "-");

const selectCls =
  "p-inputtext-sm border rounded-md px-2 py-1.5 bg-white text-sm";

const showError = (error: any) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    toast.error(
      data?.errors?.[0]?.message || data?.message || "Something went wrong",
    );
  } else {
    toast.error("Unexpected error occurred");
  }
};

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div
    className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
    style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
  >
    <div className="min-w-0">
      <h2 className="text-sm sm:text-base font-semibold text-white">{title}</h2>
      <p className="text-xs text-blue-100">{subtitle}</p>
    </div>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-12">
    <div className="text-6xl mb-4">💸</div>
    <h2 className="text-xl font-semibold text-gray-700">No Records</h2>
    <p className="text-gray-500 mt-2 max-w-md">{text}</p>
  </div>
);

const BalanceText = ({ amount }: { amount: number }) => {
  if (amount < -0.005)
    return (
      <span className="font-semibold text-amber-600">
        {money(Math.abs(amount))} over-paid
      </span>
    );
  return (
    <span
      className={`font-semibold ${amount > 0.005 ? "text-red-600" : "text-gray-400"}`}
    >
      {money(amount)}
    </span>
  );
};

const SettledBar = ({ rate }: { rate: number }) => (
  <div className="min-w-[90px]">
    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-green-500"
        style={{ width: `${Math.min(100, rate)}%` }}
      />
    </div>
    <p className="text-[11px] text-gray-500 mt-0.5">{rate}%</p>
  </div>
);

// debounce + page reset ekshathe
function useDebouncedSearch(onChange: () => void) {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = input.trim();
      setDebounced((prev) => {
        if (prev !== next) onChange();
        return next;
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return { input, setInput, debounced };
}

// ===============================================================
// ADMIN VIEW: shob store, koto received / koto dewa hoyeche / koto baki
// ===============================================================
function AdminPayoutView() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StorePayoutRow[]>([]);
  const [summary, setSummary] = useState<PayoutSummary>(EMPTY_PAYOUT_SUMMARY);
  const [pagination, setPagination] = useState({ page: 1, rows: 10, total: 0 });
  const [onlyPending, setOnlyPending] = useState(false);
  const [sortBy, setSortBy] = useState("balance_desc");
  const requestIdRef = useRef(0);

  const [payDialog, setPayDialog] = useState<{
    visible: boolean;
    store: StorePayoutRow | null;
  }>({ visible: false, store: null });
  const [paying, setPaying] = useState(false);

  const search = useDebouncedSearch(() =>
    setPagination((p) => ({ ...p, page: 1 })),
  );

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${PAYOUT_BASE}/stores`, {
        params: cleanParams({
          page: pagination.page,
          limit: pagination.rows,
          search: search.debounced,
          onlyPending: onlyPending ? "true" : "",
          sortBy,
        }),
      });
      if (requestId !== requestIdRef.current) return;
      setStores(res.data.stores || []);
      setSummary(res.data.summary || EMPTY_PAYOUT_SUMMARY);
      setPagination((p) => ({ ...p, total: res.data.totalStores ?? 0 }));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      showError(error);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [pagination.page, pagination.rows, search.debounced, onlyPending, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitPayout = async (payload: PayoutPayload) => {
    if (!payDialog.store) return false;
    try {
      setPaying(true);
      const res = await axiosInstance.post(
        `${PAYOUT_BASE}/stores/${payDialog.store.storeId}`,
        payload,
      );
      toast.success(res.data.message || "Payout saved");
      setPayDialog({ visible: false, store: null });
      await fetchData();
      return true;
    } catch (error) {
      showError(error);
      return false;
    } finally {
      setPaying(false);
    }
  };

  const goTo = (id: string) => router.push(`/dashboard/payouts/${id}`);

  return (
    <div className="space-y-3">
      <Header
        title="Store Payouts"
        subtitle="Online payments collected and amount settled to each store"
      />

      <PayoutSummaryCards summary={summary} mode="ADMIN" />

      <div className="flex flex-wrap items-end gap-2 border border-blue-100 rounded-lg p-2.5">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText
            value={search.input}
            onChange={(e) => search.setInput(e.target.value)}
            placeholder="Search store name / id"
            className="p-inputtext-sm w-full"
          />
        </IconField>

        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={selectCls}
        >
          <option value="balance_desc">Highest pending</option>
          <option value="received_desc">Highest collected</option>
          <option value="paid_desc">Highest paid</option>
          <option value="name_asc">Name A-Z</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => {
              setOnlyPending(e.target.checked);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
          Only pending
        </label>
      </div>

      <DataTable
        value={stores}
        lazy
        paginator
        first={(pagination.page - 1) * pagination.rows}
        rows={pagination.rows}
        totalRecords={pagination.total}
        loading={loading}
        rowsPerPageOptions={[10, 25, 50]}
        onPage={(e) =>
          setPagination((prev) => ({
            ...prev,
            page: (e.page ?? 0) + 1,
            rows: e.rows ?? prev.rows,
          }))
        }
        responsiveLayout="scroll"
        onRowClick={(e) => goTo((e.data as StorePayoutRow).storeId)}
        rowClassName={() => "cursor-pointer"}
        emptyMessage={<EmptyState text="No stores found." />}
      >
        <Column
          header="Store"
          body={(r: StorePayoutRow) => (
            <div>
              <p className="font-medium text-gray-800">{r.storeName || "-"}</p>
              <p className="text-xs text-gray-500">{r.storeUniqueId}</p>
            </div>
          )}
        />
        <Column field="onlineOrders" header="Online Orders" />
        <Column
          header="Collected"
          body={(r: StorePayoutRow) => money(r.totalReceived)}
        />
        <Column
          header="Paid to Store"
          body={(r: StorePayoutRow) => (
            <span className="font-semibold text-green-700">
              {money(r.totalPaidOut)}
            </span>
          )}
        />
        <Column
          header="Pending"
          body={(r: StorePayoutRow) => <BalanceText amount={r.balance} />}
        />
        <Column
          header="Settled"
          body={(r: StorePayoutRow) => <SettledBar rate={r.settlementRate} />}
        />
        <Column
          header="Last Payout"
          body={(r: StorePayoutRow) => safeDate(r.lastPayoutAt)}
        />
        <Column
          header="Actions"
          headerStyle={{ width: "190px" }}
          body={(r: StorePayoutRow) => (
            <div
              className="flex gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                label="Pay"
                icon="pi pi-send"
                size="small"
                disabled={r.balance <= 0.005}
                onClick={() => setPayDialog({ visible: true, store: r })}
                className="text-xs"
              />
              <Button
                label="History"
                icon="pi pi-history"
                size="small"
                outlined
                onClick={() => goTo(r.storeId)}
                className="text-xs"
              />
            </div>
          )}
        />
      </DataTable>

      <PayoutDialog
        visible={payDialog.visible}
        storeName={payDialog.store?.storeName || ""}
        balance={payDialog.store?.balance || 0}
        loading={paying}
        onHide={() => setPayDialog({ visible: false, store: null })}
        onSubmit={submitPayout}
      />
    </div>
  );
}

// ===============================================================
// STORE VIEW: admin theke koto peyechi + pending + history
// ===============================================================
function StorePayoutView() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PayoutSummary>(EMPTY_PAYOUT_SUMMARY);
  const [stores, setStores] = useState<
    (PayoutSummary & { storeId: string; storeName: string })[]
  >([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, rows: 10, total: 0 });
  const [filters, setFilters] = useState({ from: "", to: "", storeId: "" });
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${PAYOUT_BASE}/my`, {
        params: cleanParams({
          page: pagination.page,
          limit: pagination.rows,
          ...filters,
        }),
      });
      if (requestId !== requestIdRef.current) return;
      setSummary(res.data.summary || EMPTY_PAYOUT_SUMMARY);
      setStores(res.data.stores || []);
      setPayouts(res.data.payouts || []);
      setPagination((p) => ({ ...p, total: res.data.totalPayouts ?? 0 }));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      showError(error);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [pagination.page, pagination.rows, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const multiStore = stores.length > 1;

  return (
    <div className="space-y-3">
      <Header
        title="Settlements"
        subtitle="Online payments collected by admin and amount paid to you"
      />

      <PayoutSummaryCards summary={summary} mode="STORE" />

      <div className="flex flex-wrap items-center gap-2 border border-blue-100 rounded-lg p-2.5">
        {multiStore && (
          <select
            value={filters.storeId}
            onChange={(e) => updateFilter("storeId", e.target.value)}
            className={selectCls}
          >
            <option value="">All Stores</option>
            {stores.map((s) => (
              <option key={s.storeId} value={s.storeId}>
                {s.storeName}
              </option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => updateFilter("from", e.target.value)}
          className={selectCls}
          title="From"
        />
        <span className="text-gray-400 text-xs">to</span>
        <input
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => updateFilter("to", e.target.value)}
          className={selectCls}
          title="To"
        />
        {(filters.from || filters.to || filters.storeId) && (
          <Button
            label="Reset"
            icon="pi pi-filter-slash"
            text
            size="small"
            onClick={() => {
              setFilters({ from: "", to: "", storeId: "" });
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
        )}
      </div>

      {/* store wise (sudhu ekadhik store thakle) */}
      {multiStore && (
        <DataTable value={stores} responsiveLayout="scroll" dataKey="storeId">
          <Column field="storeName" header="Store" />
          <Column
            header="Collected"
            body={(r: PayoutSummary & { storeId: string }) =>
              money(r.totalReceived)
            }
          />
          <Column
            header="Received from Admin"
            body={(r: PayoutSummary & { storeId: string }) => (
              <span className="font-semibold text-green-700">
                {money(r.totalPaidOut)}
              </span>
            )}
          />
          <Column
            header="Pending"
            body={(r: PayoutSummary & { storeId: string }) => (
              <BalanceText amount={r.balance} />
            )}
          />
        </DataTable>
      )}

      {/* payout history */}
      <DataTable
        value={payouts}
        dataKey="payoutId"
        lazy
        paginator
        first={(pagination.page - 1) * pagination.rows}
        rows={pagination.rows}
        totalRecords={pagination.total}
        loading={loading}
        rowsPerPageOptions={[10, 25, 50]}
        onPage={(e) =>
          setPagination((prev) => ({
            ...prev,
            page: (e.page ?? 0) + 1,
            rows: e.rows ?? prev.rows,
          }))
        }
        responsiveLayout="scroll"
        rowClassName={(r: PayoutRow) => (r.isVoided ? "opacity-60" : "")}
        emptyMessage={
          <EmptyState text="Admin has not paid anything yet. Payouts will appear here." />
        }
      >
        <Column field="payoutNumber" header="Payout #" />
        <Column header="Date" body={(r: PayoutRow) => safeDate(r.paidAt)} />
        {multiStore && <Column field="storeName" header="Store" />}
        <Column
          header="Amount"
          body={(r: PayoutRow) => (
            <span
              className={`font-semibold ${r.isVoided ? "line-through text-gray-400" : "text-green-700"}`}
            >
              {money(r.amount)}
            </span>
          )}
        />
        <Column header="Method" body={(r: PayoutRow) => methodLabel(r.method)} />
        <Column header="Reference" body={(r: PayoutRow) => r.referenceNo || "-"} />
        <Column
          header="Pending after"
          body={(r: PayoutRow) => money(r.balanceAfter)}
        />
        <Column header="Note" body={(r: PayoutRow) => r.note || "-"} />
        <Column
          header="Status"
          body={(r: PayoutRow) =>
            r.isVoided ? (
              <span
                title={r.voidReason || ""}
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-700"
              >
                Voided
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800">
                Paid
              </span>
            )
          }
        />
      </DataTable>
    </div>
  );
}

// ===============================================================
// PAGE
// ===============================================================
function PayoutsPage() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get(META_URL);
        setRole(res.data.role);
      } catch (error) {
        showError(error);
      }
    })();
  }, []);

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {!role && (
          <div className="flex justify-center items-center py-16">
            <i className="pi pi-spin pi-spinner text-3xl text-gray-400" />
          </div>
        )}
        {role === "ADMIN" && <AdminPayoutView />}
        {role === "STORE" && <StorePayoutView />}
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default PayoutsPage;