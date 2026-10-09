"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { formatDate } from "@/helper/DateTime";
import PayoutSummaryCards from "@/components/payouts/PayoutSummaryCards";
import PayoutDialog from "@/components/payouts/PayoutDialog";
import { money, cleanParams } from "@/types/paymentReport";
import {
  EMPTY_PAYOUT_SUMMARY,
  PayoutPayload,
  PayoutRow,
  PayoutSummary,
  methodLabel,
} from "@/types/payout";

const BASE = "/api/payment/payout";

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

type StoreInfo = {
  storeId: string;
  storeName: string;
  storeUniqueId: string;
} | null;

function StorePayoutDetailPage() {
  const router = useRouter();
  const { storeId } = useParams<{ storeId: string }>();

  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<StoreInfo>(null);
  const [summary, setSummary] = useState<PayoutSummary>(EMPTY_PAYOUT_SUMMARY);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, rows: 10, total: 0 });
  const [filters, setFilters] = useState({ from: "", to: "" });
  const requestIdRef = useRef(0);

  const [payVisible, setPayVisible] = useState(false);
  const [paying, setPaying] = useState(false);

  const [voidDialog, setVoidDialog] = useState<{
    visible: boolean;
    payout: PayoutRow | null;
  }>({ visible: false, payout: null });
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [voiding, setVoiding] = useState(false);

  const fetchData = useCallback(async () => {
    if (!storeId) return;
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${BASE}/stores/${storeId}`, {
        params: cleanParams({
          page: pagination.page,
          limit: pagination.rows,
          ...filters,
        }),
      });
      if (requestId !== requestIdRef.current) return;
      setStore(res.data.store);
      setSummary(res.data.summary || EMPTY_PAYOUT_SUMMARY);
      setPayouts(res.data.payouts || []);
      setPagination((p) => ({ ...p, total: res.data.totalPayouts ?? 0 }));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      showError(error);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [storeId, pagination.page, pagination.rows, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const submitPayout = async (payload: PayoutPayload) => {
    try {
      setPaying(true);
      const res = await axiosInstance.post(
        `${BASE}/stores/${storeId}`,
        payload,
      );
      toast.success(res.data.message || "Payout saved");
      setPayVisible(false);
      await fetchData();
      return true;
    } catch (error) {
      showError(error);
      return false;
    } finally {
      setPaying(false);
    }
  };

  const closeVoid = () => {
    setVoidDialog({ visible: false, payout: null });
    setVoidReason("");
    setVoidError("");
  };

  const confirmVoid = async () => {
    if (!voidDialog.payout) return;
    if (voidReason.trim().length < 3) {
      setVoidError("Reason must be at least 3 characters");
      return;
    }
    try {
      setVoiding(true);
      const res = await axiosInstance.patch(
        `${BASE}/${voidDialog.payout.payoutId}/void`,
        { reason: voidReason.trim() },
      );
      toast.success(res.data.message || "Payout voided");
      closeVoid();
      await fetchData();
    } catch (error) {
      showError(error);
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4 space-y-3">
        {/* Header */}
        <div
          className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg"
          style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              icon="pi pi-arrow-left"
              onClick={() => router.push("/dashboard/payouts")}
              text
              style={{ color: "#fff" }}
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">
                {store?.storeName || "Store"}
              </h2>
              <p className="text-xs text-blue-100 leading-tight">
                {store?.storeUniqueId || "Payout history"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 self-start sm:self-auto">
            <Button
              label="View orders"
              icon="pi pi-list"
              size="small"
              onClick={() => router.push(`/dashboard/payments/stores/${storeId}`)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "1px solid #93c5fd",
                color: "#fff",
              }}
            />
            <Button
              label="Pay store"
              icon="pi pi-send"
              size="small"
              disabled={summary.balance <= 0.005}
              onClick={() => setPayVisible(true)}
              style={{
                background: "#fff",
                color: "#1d4ed8",
                border: "1px solid #fff",
              }}
            />
          </div>
        </div>

        <PayoutSummaryCards summary={summary} mode="ADMIN" />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border border-blue-100 rounded-lg p-2.5">
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

        {/* History */}
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
          emptyMessage="No payouts made to this store yet."
        >
          <Column field="payoutNumber" header="Payout #" />
          <Column header="Date" body={(r: PayoutRow) => safeDate(r.paidAt)} />
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
            header="Pending before → after"
            body={(r: PayoutRow) => (
              <span className="text-xs text-gray-600">
                {money(r.balanceBefore)} → {money(r.balanceAfter)}
              </span>
            )}
          />
          <Column header="Note" body={(r: PayoutRow) => r.note || "-"} />
          <Column header="Paid by" body={(r: PayoutRow) => r.paidByName || "-"} />
          <Column
            header="Status"
            body={(r: PayoutRow) =>
              r.isVoided ? (
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-700">
                    Voided
                  </span>
                  {r.voidReason && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {r.voidReason}
                    </p>
                  )}
                </div>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800">
                  Paid
                </span>
              )
            }
          />
          <Column
            header="Actions"
            headerStyle={{ width: "100px" }}
            body={(r: PayoutRow) =>
              r.isVoided ? null : (
                <Button
                  label="Void"
                  icon="pi pi-ban"
                  size="small"
                  severity="danger"
                  text
                  onClick={() => setVoidDialog({ visible: true, payout: r })}
                  className="text-xs"
                />
              )
            }
          />
        </DataTable>

        <PayoutDialog
          visible={payVisible}
          storeName={store?.storeName || ""}
          balance={summary.balance}
          loading={paying}
          onHide={() => setPayVisible(false)}
          onSubmit={submitPayout}
        />

        {/* Void dialog */}
        <Dialog
          header={`Void ${voidDialog.payout?.payoutNumber || "payout"}`}
          visible={voidDialog.visible}
          style={{ width: "28rem" }}
          breakpoints={{ "641px": "95vw" }}
          onHide={closeVoid}
        >
          <div className="mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-2.5">
            <i className="pi pi-exclamation-triangle mr-1"></i>
            {money(voidDialog.payout?.amount)} will be added back to this
            store&apos;s pending balance. The record stays in history as voided.
          </div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <InputTextarea
            value={voidReason}
            onChange={(e) => {
              setVoidReason(e.target.value);
              if (voidError) setVoidError("");
            }}
            rows={3}
            maxLength={300}
            className={`w-full ${voidError ? "p-invalid" : ""}`}
            placeholder="e.g. Entered wrong amount"
            autoFocus
          />
          {voidError && (
            <small className="text-red-500 flex items-center gap-1 mt-1">
              <i className="pi pi-exclamation-circle"></i>
              {voidError}
            </small>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button label="Close" text onClick={closeVoid} />
            <Button
              label="Void payout"
              severity="danger"
              loading={voiding}
              onClick={confirmVoid}
            />
          </div>
        </Dialog>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default StorePayoutDetailPage;