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
import SummaryCards from "@/components/payments/SummaryCards";
import {
  CustomerReportRow,
  StoreReportRow,
  PaymentSummary,
  EMPTY_SUMMARY,
  money,
  cleanParams,
} from "@/types/paymentReport";

const BASE = "/api/payment/report";

type Role = "ADMIN" | "STORE";

const safeDate = (d?: string | null) => (d ? formatDate(d) : "-");

const selectCls =
  "p-inputtext-sm border rounded-md px-2 py-1.5 bg-white text-sm";

const showError = (error: any) => {
  if (axios.isAxiosError(error)) {
    toast.error(error.response?.data?.message || "Something went wrong");
  } else {
    toast.error("Unexpected error occurred");
  }
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-12">
    <div className="text-6xl mb-4">💳</div>
    <h2 className="text-xl font-semibold text-gray-700">No Payment Records</h2>
    <p className="text-gray-500 mt-2 max-w-md">{text}</p>
  </div>
);

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

const CollectionBar = ({ rate }: { rate: number }) => (
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

const PaidText = ({ amount }: { amount: number }) => (
  <span className="font-semibold text-green-700">{money(amount)}</span>
);

const DueText = ({ amount }: { amount: number }) => (
  <span
    className={`font-semibold ${amount > 0 ? "text-red-600" : "text-gray-400"}`}
  >
    {money(amount)}
  </span>
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
// STORE VIEW: customer wise (nijer store er customer der payment)
// ===============================================================
type CustomerFilters = {
  from: string;
  to: string;
  paymentMethod: "" | "COD" | "ONLINE";
  onlyDue: boolean;
  sortBy: string;
};

const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = {
  from: "",
  to: "",
  paymentMethod: "",
  onlyDue: false,
  sortBy: "due_desc",
};

function StoreCustomerView() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerReportRow[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState({ page: 1, rows: 10, total: 0 });
  const [filters, setFilters] = useState<CustomerFilters>(
    DEFAULT_CUSTOMER_FILTERS,
  );
  const requestIdRef = useRef(0);

  const search = useDebouncedSearch(() =>
    setPagination((p) => ({ ...p, page: 1 })),
  );

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${BASE}/customers`, {
        params: cleanParams({
          page: pagination.page,
          limit: pagination.rows,
          search: search.debounced,
          from: filters.from,
          to: filters.to,
          paymentMethod: filters.paymentMethod,
          onlyDue: filters.onlyDue ? "true" : "",
          sortBy: filters.sortBy,
        }),
      });
      if (requestId !== requestIdRef.current) return;
      setCustomers(res.data.customers || []);
      setSummary(res.data.summary || EMPTY_SUMMARY);
      setPagination((p) => ({ ...p, total: res.data.totalCustomers ?? 0 }));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      showError(error);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [pagination.page, pagination.rows, search.debounced, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilter = <K extends keyof CustomerFilters>(
    key: K,
    value: CustomerFilters[K],
  ) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_CUSTOMER_FILTERS);
    search.setInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const hasActiveFilter =
    !!search.input ||
    !!filters.from ||
    !!filters.to ||
    !!filters.paymentMethod ||
    filters.onlyDue;

  const goTo = (id: string) =>
    router.push(`/dashboard/payments/customers/${id}`);

  return (
    <div className="space-y-3">
      <Header
        title="Payments"
        subtitle="Customer wise payments received and due"
      />

      <SummaryCards summary={summary} />

      <div className="flex flex-wrap items-end gap-2 border border-blue-100 rounded-lg p-2.5">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText
            value={search.input}
            onChange={(e) => search.setInput(e.target.value)}
            placeholder="Search name / phone / email"
            className="p-inputtext-sm w-full"
          />
        </IconField>

        <select
          value={filters.paymentMethod}
          onChange={(e) =>
            updateFilter(
              "paymentMethod",
              e.target.value as CustomerFilters["paymentMethod"],
            )
          }
          className={selectCls}
        >
          <option value="">COD + Online</option>
          <option value="COD">COD</option>
          <option value="ONLINE">Online</option>
        </select>

        <div className="flex items-center gap-1">
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
        </div>

        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter("sortBy", e.target.value)}
          className={selectCls}
        >
          <option value="due_desc">Highest due</option>
          <option value="paid_desc">Highest paid</option>
          <option value="latest">Latest order</option>
          <option value="name_asc">Name A-Z</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.onlyDue}
            onChange={(e) => updateFilter("onlyDue", e.target.checked)}
          />
          Only due
        </label>

        {hasActiveFilter && (
          <Button
            label="Reset"
            icon="pi pi-filter-slash"
            text
            size="small"
            onClick={resetFilters}
          />
        )}
      </div>

      <DataTable
        value={customers}
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
        onRowClick={(e) => goTo((e.data as CustomerReportRow).customerId)}
        rowClassName={() => "cursor-pointer"}
        emptyMessage={
          <EmptyState text="No customer payments found for these filters." />
        }
      >
        <Column
          header="Customer"
          body={(r: CustomerReportRow) => (
            <div>
              <p className="font-medium text-gray-800">{r.name || "Unknown"}</p>
              <p className="text-xs text-gray-500">{r.phone || r.email || "-"}</p>
            </div>
          )}
        />
        <Column field="totalOrders" header="Orders" />
        <Column
          header="Billed"
          body={(r: CustomerReportRow) => money(r.totalBilled)}
        />
        <Column
          header="Paid"
          body={(r: CustomerReportRow) => <PaidText amount={r.paidAmount} />}
        />
        <Column
          header="Due"
          body={(r: CustomerReportRow) => <DueText amount={r.dueAmount} />}
        />
        <Column
          header="COD / Online Due"
          body={(r: CustomerReportRow) => (
            <span className="text-xs text-gray-600">
              {money(r.codDue)} / {money(r.onlineDue)}
            </span>
          )}
        />
        <Column
          header="Collected"
          body={(r: CustomerReportRow) => <CollectionBar rate={r.collectionRate} />}
        />
        <Column
          header="Last Payment"
          body={(r: CustomerReportRow) => safeDate(r.lastPaymentAt)}
        />
        <Column
          header="Actions"
          headerStyle={{ width: "110px" }}
          body={(r: CustomerReportRow) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                label="View"
                icon="pi pi-eye"
                size="small"
                onClick={() => goTo(r.customerId)}
                className="text-xs"
              />
            </div>
          )}
        />
      </DataTable>
    </div>
  );
}

// ===============================================================
// ADMIN VIEW: store wise (kon store theke koto payment eseche)
// ===============================================================
type StoreFilters = {
  from: string;
  to: string;
  paymentMethod: "" | "COD" | "ONLINE";
  sortBy: string;
};

const DEFAULT_STORE_FILTERS: StoreFilters = {
  from: "",
  to: "",
  paymentMethod: "",
  sortBy: "paid_desc",
};

function AdminStoreView() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StoreReportRow[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState({ page: 1, rows: 10, total: 0 });
  const [filters, setFilters] = useState<StoreFilters>(DEFAULT_STORE_FILTERS);
  const requestIdRef = useRef(0);

  const search = useDebouncedSearch(() =>
    setPagination((p) => ({ ...p, page: 1 })),
  );

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${BASE}/stores`, {
        params: cleanParams({
          page: pagination.page,
          limit: pagination.rows,
          search: search.debounced,
          from: filters.from,
          to: filters.to,
          paymentMethod: filters.paymentMethod,
          sortBy: filters.sortBy,
        }),
      });
      if (requestId !== requestIdRef.current) return;
      setStores(res.data.stores || []);
      setSummary(res.data.summary || EMPTY_SUMMARY);
      setPagination((p) => ({ ...p, total: res.data.totalStores ?? 0 }));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      showError(error);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [pagination.page, pagination.rows, search.debounced, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilter = <K extends keyof StoreFilters>(
    key: K,
    value: StoreFilters[K],
  ) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_STORE_FILTERS);
    search.setInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const hasActiveFilter =
    !!search.input || !!filters.from || !!filters.to || !!filters.paymentMethod;

  const goTo = (id: string) => router.push(`/dashboard/payments/stores/${id}`);

  return (
    <div className="space-y-3">
      <Header
        title="Store Payments"
        subtitle="Payments received from each store"
      />

      <SummaryCards summary={summary} />

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
          value={filters.paymentMethod}
          onChange={(e) =>
            updateFilter(
              "paymentMethod",
              e.target.value as StoreFilters["paymentMethod"],
            )
          }
          className={selectCls}
        >
          <option value="">COD + Online</option>
          <option value="COD">COD</option>
          <option value="ONLINE">Online</option>
        </select>

        <div className="flex items-center gap-1">
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
        </div>

        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter("sortBy", e.target.value)}
          className={selectCls}
        >
          <option value="paid_desc">Highest received</option>
          <option value="due_desc">Highest due</option>
          <option value="orders_desc">Most orders</option>
          <option value="name_asc">Name A-Z</option>
        </select>

        {hasActiveFilter && (
          <Button
            label="Reset"
            icon="pi pi-filter-slash"
            text
            size="small"
            onClick={resetFilters}
          />
        )}
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
        onRowClick={(e) => goTo((e.data as StoreReportRow).storeId)}
        rowClassName={() => "cursor-pointer"}
        emptyMessage={
          <EmptyState text="No store payments found for these filters." />
        }
      >
        <Column
          header="Store"
          body={(r: StoreReportRow) => (
            <div>
              <p className="font-medium text-gray-800">{r.storeName || "-"}</p>
              <p className="text-xs text-gray-500">{r.storeUniqueId}</p>
            </div>
          )}
        />
        <Column field="totalCustomers" header="Customers" />
        <Column field="totalOrders" header="Orders" />
        <Column
          header="Billed"
          body={(r: StoreReportRow) => money(r.totalBilled)}
        />
        <Column
          header="Received"
          body={(r: StoreReportRow) => <PaidText amount={r.paidAmount} />}
        />
        <Column
          header="Due"
          body={(r: StoreReportRow) => <DueText amount={r.dueAmount} />}
        />
        <Column
          header="COD / Online Received"
          body={(r: StoreReportRow) => (
            <span className="text-xs text-gray-600">
              {money(r.codPaid)} / {money(r.onlinePaid)}
            </span>
          )}
        />
        <Column
          header="Collected"
          body={(r: StoreReportRow) => <CollectionBar rate={r.collectionRate} />}
        />
        <Column
          header="Last Payment"
          body={(r: StoreReportRow) => safeDate(r.lastPaymentAt)}
        />
        <Column
          header="Actions"
          headerStyle={{ width: "110px" }}
          body={(r: StoreReportRow) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                label="View"
                icon="pi pi-eye"
                size="small"
                onClick={() => goTo(r.storeId)}
                className="text-xs"
              />
            </div>
          )}
        />
      </DataTable>
    </div>
  );
}

// ===============================================================
// PAGE: role dekhe view decide kore
// ===============================================================
function PaymentsPage() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get(`${BASE}/meta`);
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
        {role === "ADMIN" && <AdminStoreView />}
        {role === "STORE" && <StoreCustomerView />}
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default PaymentsPage;