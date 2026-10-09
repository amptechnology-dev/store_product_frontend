"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import {
  PAYMENT_STATUS_STYLES,
  PAYMENT_STATUS_ICONS,
  ATTEMPT_STYLES,
  STATUS_STYLES,
} from "@/types/order";
import SummaryCards from "@/components/payments/SummaryCards";
import {
  PaymentOrderRow,
  PaymentSummary,
  EMPTY_SUMMARY,
  money,
  cleanParams,
} from "@/types/paymentReport";

const safeDate = (d?: string | null) => (d ? formatDate(d) : "-");

type StoreInfo = {
  storeId: string;
  storeName: string;
  storeUniqueId: string;
} | null;

type Monthly = { month: string; amount: number; orders: number };

function StorePaymentDetailPage() {
  const router = useRouter();
  const { storeId } = useParams<{ storeId: string }>();

  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<StoreInfo>(null);
  const [summary, setSummary] = useState<PaymentSummary>(EMPTY_SUMMARY);
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [transactions, setTransactions] = useState<PaymentOrderRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<any>({});
  const [pagination, setPagination] = useState({ page: 1, rows: 10, total: 0 });

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    paymentMethod: "",
    paymentStatus: "",
  });

  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!storeId) return;
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/payment/report/stores/${storeId}`,
        {
          params: cleanParams({
            page: pagination.page,
            limit: pagination.rows,
            search: debouncedSearch,
            ...filters,
          }),
        },
      );
      if (requestId !== requestIdRef.current) return;
      setStore(res.data.store);
      setSummary(res.data.summary || EMPTY_SUMMARY);
      setMonthly(res.data.monthlyCollection || []);
      setTransactions(res.data.transactions || []);
      setPagination((p) => ({ ...p, total: res.data.totalOrders ?? 0 }));
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return;
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [storeId, pagination.page, pagination.rows, debouncedSearch, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // debounce + page reset
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedSearch((prev) => {
        if (prev !== next) setPagination((p) => ({ ...p, page: 1 }));
        return next;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.amount));

  const attemptsTemplate = (r: PaymentOrderRow) => {
    if (!r.paymentAttempts?.length) {
      return (
        <p className="text-xs text-gray-500 p-2">
          No online payment attempts for this order.
        </p>
      );
    }
    return (
      <div className="p-2 space-y-1.5">
        <p className="text-xs font-semibold text-gray-600">
          Payment attempts ({r.paymentAttempts.length})
        </p>
        {[...r.paymentAttempts].reverse().map((a) => (
          <div
            key={a.txnid}
            className="border border-gray-100 rounded-md p-2 text-xs flex flex-wrap items-center justify-between gap-2"
          >
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${ATTEMPT_STYLES[a.status]}`}
            >
              {a.status}
            </span>
            <span className="text-gray-500 break-all">Txn: {a.txnid}</span>
            <span className="text-gray-700">
              {money(a.amount)}
              {a.mode ? ` • ${a.mode}` : ""}
            </span>
            <span className="text-gray-500">
              {safeDate(a.completedAt || a.createdAt)}
            </span>
            {a.errorMessage && (
              <span className="text-red-600 w-full">{a.errorMessage}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const selectCls =
    "p-inputtext-sm border rounded-md px-2 py-1.5 bg-white text-sm";

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4 space-y-3">
        {/* Header */}
        <div
          className="flex items-center gap-2.5 p-3 rounded-lg"
          style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
        >
          <Button
            icon="pi pi-arrow-left"
            onClick={() => router.push("/dashboard/payments")}
            text
            style={{ color: "#fff" }}
          />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">
              {store?.storeName || "Store"}
            </h2>
            <p className="text-xs text-blue-100 leading-tight">
              {store?.storeUniqueId || "Payment details"}
            </p>
          </div>
        </div>

        <SummaryCards summary={summary} />

        {/* Monthly collection */}
        {monthly.length > 0 && (
          <div className="border border-blue-100 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Monthly Collection (last 12 months)
            </p>
            <div className="space-y-1.5">
              {monthly.map((m) => (
                <div key={m.month} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-gray-600 shrink-0">{m.month}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(m.amount / maxMonthly) * 100}%` }}
                    />
                  </div>
                  <span className="w-28 text-right font-semibold text-gray-800 shrink-0">
                    {money(m.amount)}
                  </span>
                  <span className="w-14 text-right text-gray-400 shrink-0">
                    {m.orders} ord
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border border-blue-100 rounded-lg p-2.5">
          <IconField iconPosition="left" className="w-full sm:w-64">
            <InputIcon className="pi pi-search" />
            <InputText
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search order # / customer"
              className="p-inputtext-sm w-full"
            />
          </IconField>

          <select
            value={filters.paymentStatus}
            onChange={(e) => updateFilter("paymentStatus", e.target.value)}
            className={selectCls}
          >
            <option value="">All Payment Status</option>
            <option value="PENDING">Pending</option>
            <option value="INITIATED">Initiated</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <select
            value={filters.paymentMethod}
            onChange={(e) => updateFilter("paymentMethod", e.target.value)}
            className={selectCls}
          >
            <option value="">COD + Online</option>
            <option value="COD">COD</option>
            <option value="ONLINE">Online</option>
          </select>

          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => updateFilter("from", e.target.value)}
            className={selectCls}
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => updateFilter("to", e.target.value)}
            className={selectCls}
          />
        </div>

        {/* Transactions */}
        <DataTable
          value={transactions}
          dataKey="orderId"
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
          expandedRows={expandedRows}
          onRowToggle={(e) => setExpandedRows(e.data)}
          rowExpansionTemplate={attemptsTemplate}
          responsiveLayout="scroll"
          emptyMessage="No transactions found for this store."
        >
          <Column expander style={{ width: "3rem" }} />
          <Column
            header="Order #"
            body={(r: PaymentOrderRow) => (
              <button
                className="text-blue-600 hover:underline font-medium"
                onClick={() => router.push(`/dashboard/orders/${r.orderId}`)}
              >
                {r.orderNumber}
              </button>
            )}
          />
          <Column
            header="Customer"
            body={(r: PaymentOrderRow) => (
              <div>
                <p className="font-medium text-gray-800">
                  {r.customer?.name || "Unknown"}
                </p>
                <p className="text-xs text-gray-500">{r.customer?.phone || "-"}</p>
              </div>
            )}
          />
          <Column header="Placed On" body={(r: PaymentOrderRow) => safeDate(r.createdAt)} />
          <Column
            header="Order Status"
            body={(r: PaymentOrderRow) => (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[r.status]}`}
              >
                {r.status}
              </span>
            )}
          />
          <Column header="Amount" body={(r: PaymentOrderRow) => money(r.totalAmount)} />
          <Column header="Method" field="paymentMethod" />
          <Column
            header="Payment"
            body={(r: PaymentOrderRow) => (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${PAYMENT_STATUS_STYLES[r.paymentStatus]}`}
              >
                <i
                  className={`${PAYMENT_STATUS_ICONS[r.paymentStatus]} text-[10px]`}
                ></i>
                {r.paymentStatus}
              </span>
            )}
          />
          <Column
            header="Paid"
            body={(r: PaymentOrderRow) => (
              <span className="font-semibold text-green-700">
                {money(r.paidAmount)}
              </span>
            )}
          />
          <Column
            header="Due"
            body={(r: PaymentOrderRow) => (
              <span
                className={`font-semibold ${r.dueAmount > 0 ? "text-red-600" : "text-gray-400"}`}
              >
                {money(r.dueAmount)}
              </span>
            )}
          />
          <Column header="Paid On" body={(r: PaymentOrderRow) => safeDate(r.paidAt)} />
        </DataTable>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default StorePaymentDetailPage;