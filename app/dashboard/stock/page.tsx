"use client";

import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputSwitch } from "primereact/inputswitch";
import { Paginator } from "primereact/paginator";

type VariantMeta = {
  color?: string;
  size?: string;
  weight?: string;
  height?: string;
};

type StockRow = {
  productId: string;
  productName: string;
  productCode?: string;
  unit?: string;
  image?: string | null;
  variantId?: string | null;
  sizeVariantId?: string | null;
  variantLabel: string;
  variantMeta?: VariantMeta;
  currentStock: number;
  lowStockThreshold: number;
  isLow: boolean;
};

type AdjustType = "ADD" | "REDUCE";

// color name -> swatch hex (same list apnar product page-eo ache)
const COLOR_HEX: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  black: "#111827",
  white: "#f9fafb",
  pink: "#ec4899",
  purple: "#a855f7",
  orange: "#f97316",
  grey: "#9ca3af",
  gray: "#9ca3af",
  brown: "#92400e",
  navy: "#1e3a8a",
  maroon: "#7f1d1d",
  beige: "#e7d7c1",
  gold: "#d4af37",
  silver: "#c0c0c0",
};
const colorToHex = (name?: string) => {
  if (!name) return "#d1d5db";
  return COLOR_HEX[name.trim().toLowerCase()] || "#d1d5db";
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);

  const [activeRow, setActiveRow] = useState<StockRow | null>(null);
  const [adjustType, setAdjustType] = useState<AdjustType>("ADD");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, lowOnly]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/stock/overview", {
        params: {
          page,
          limit: rowsPerPage,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(lowOnly ? { lowStockOnly: "true" } : {}),
        },
      });
      setRows(res.data.rows || []);
      setTotal(res.data.totalRows || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load stock");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, lowOnly]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openAdjust = (row: StockRow, type: AdjustType) => {
    setActiveRow(row);
    setAdjustType(type);
    setQuantity(null);
    setNote("");
  };

  const submitAdjust = async () => {
    if (!activeRow || !quantity || quantity <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    try {
      setSubmitting(true);
      const res = await axiosInstance.patch("/api/stock/update", {
        productId: activeRow.productId,
        variantId: activeRow.variantId,
        sizeVariantId: activeRow.sizeVariantId,
        type: adjustType,
        quantity,
        note,
      });
      toast.success(res.data.message || "Stock updated");
      setActiveRow(null);
      fetchRows();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update stock");
    } finally {
      setSubmitting(false);
    }
  };

  const renderVariantChips = (row: StockRow) => {
    const meta = row.variantMeta || {};
    const hasMeta = meta.color || meta.size || meta.weight || meta.height;

    if (!hasMeta) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium">
          {row.variantLabel}
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {meta.color && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-medium text-gray-700">
            <span
              className="w-2.5 h-2.5 rounded-full border border-gray-300"
              style={{ backgroundColor: colorToHex(meta.color) }}
            />
            {meta.color}
          </span>
        )}
        {meta.size && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-[11px] font-medium text-purple-700">
            Size: {meta.size}
          </span>
        )}
        {meta.weight && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] font-medium text-amber-700">
            Weight: {meta.weight}
          </span>
        )}
        {meta.height && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100 text-[11px] font-medium text-teal-700">
            Height: {meta.height}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full p-2 sm:p-4">
      <div
        className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg mb-3"
        style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
      >
        <div>
          <h2 className="text-base font-semibold text-white">Stock Management</h2>
          <p className="text-xs text-blue-100">
            View and adjust stock for every product / variant
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <InputText
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product / code"
            className="p-inputtext-sm"
          />
          <div className="flex items-center gap-1.5 bg-white/20 rounded px-2 py-1">
            <span className="text-xs text-white">Low stock only</span>
            <InputSwitch checked={lowOnly} onChange={(e) => setLowOnly(!!e.value)} />
          </div>
        </div>
      </div>

      {loading && rows.length === 0 && (
        <div className="flex justify-center items-center py-16">
          <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-gray-600 font-medium">No stock records found</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {rows.map((row, idx) => (
          <div
            key={`${row.productId}-${row.variantId || "d"}-${row.sizeVariantId || "d"}-${idx}`}
            className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border shadow-sm bg-white ${
              row.isLow ? "border-red-200 bg-red-50/40" : "border-gray-100"
            }`}
          >
            {/* Image */}
            <div className="shrink-0">
              {row.image ? (
                <img
                  src={row.image}
                  alt={row.productName}
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
                  {getInitials(row.productName)}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-800 truncate">
                  {row.productName}
                </h3>
                {row.productCode && (
                  <span className="text-[11px] text-gray-400">#{row.productCode}</span>
                )}
                {row.isLow && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                    Low Stock
                  </span>
                )}
              </div>

              {renderVariantChips(row)}

              <div className="flex items-center gap-3 text-xs text-gray-600 pt-0.5">
                <span>
                  Current Stock:{" "}
                  <b className={row.isLow ? "text-red-600" : "text-gray-800"}>
                    {row.currentStock}
                  </b>
                  {row.unit ? ` ${row.unit}` : ""}
                </span>
                <span>
                  Alert Below:{" "}
                  <b>
                    {row.lowStockThreshold > 0 ? row.lowStockThreshold : "Off"}
                  </b>
                </span>
              </div>
            </div>

            {/* Actions — sudhu Add / Reduce */}
            <div className="flex gap-2 shrink-0">
              <Button
                label="Add"
                icon="pi pi-plus"
                size="small"
                onClick={() => openAdjust(row, "ADD")}
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  border: "1px solid #a7f3d0",
                }}
              />
              <Button
                label="Reduce"
                icon="pi pi-minus"
                size="small"
                onClick={() => openAdjust(row, "REDUCE")}
                style={{
                  background: "#fef2f2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {total > rowsPerPage && (
        <div className="mt-4 flex justify-center">
          <Paginator
            first={(page - 1) * rowsPerPage}
            rows={rowsPerPage}
            totalRecords={total}
            onPageChange={(e) => setPage(e.page + 1)}
          />
        </div>
      )}

      {/* Adjust Dialog — sudhu Add / Reduce, "Set" nei */}
      <Dialog
        header={
          activeRow
            ? `${adjustType === "ADD" ? "Add" : "Reduce"} Stock — ${activeRow.productName}`
            : ""
        }
        visible={!!activeRow}
        style={{ width: "min(90vw, 420px)" }}
        onHide={() => setActiveRow(null)}
      >
        {activeRow && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {activeRow.image ? (
                <img
                  src={activeRow.image}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold">
                  {getInitials(activeRow.productName)}
                </div>
              )}
              <div>
                {renderVariantChips(activeRow)}
                <p className="text-xs text-gray-500 mt-1">
                  Current stock: <b>{activeRow.currentStock}</b>
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Quantity to {adjustType === "ADD" ? "add" : "reduce"}
              </label>
              <InputNumber
                value={quantity}
                onValueChange={(e) => setQuantity(e.value ?? null)}
                min={1}
                className="w-full"
                inputClassName="w-full"
                useGrouping={false}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Note (optional)</label>
              <InputTextarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                label="Cancel"
                outlined
                className="flex-1"
                onClick={() => setActiveRow(null)}
                disabled={submitting}
              />
              <Button
                label={submitting ? "Saving..." : "Confirm"}
                className="flex-1"
                onClick={submitAdjust}
                disabled={submitting}
                style={
                  adjustType === "ADD"
                    ? { background: "#059669", border: "none" }
                    : { background: "#dc2626", border: "none" }
                }
              />
            </div>
          </div>
        )}
      </Dialog>

      <ToastContainer position="top-right" />
    </div>
  );
}

export default StockPage;