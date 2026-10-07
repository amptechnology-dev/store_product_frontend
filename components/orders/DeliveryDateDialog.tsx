"use client";

import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";

const pad = (n: number) => String(n).padStart(2, "0");

// local Date -> "YYYY-MM-DD" (toISOString use kora jabe na, timezone e din shift hoy)
export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// backend er stored date ("2026-10-12T00:00:00.000Z") -> local Date (same calendar din)
export const fromStoredDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const formatDeliveryDate = (v?: string | null) => {
  const d = fromStoredDate(v);
  return d
    ? d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not set";
};

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  loading?: boolean;
  initialDate?: string | null;
  onHide: () => void;
  onConfirm: (dateStr: string) => void | Promise<void>;
};

function DeliveryDateDialog({
  visible,
  title,
  description,
  confirmLabel,
  loading = false,
  initialDate,
  onHide,
  onConfirm,
}: Props) {
  const [date, setDate] = useState<Date | null>(null);
  const [error, setError] = useState("");

  // dialog khulle existing date prefill
  useEffect(() => {
    if (visible) {
      setDate(fromStoredDate(initialDate));
      setError("");
    }
  }, [visible, initialDate]);

  const handleConfirm = async () => {
    if (!date) {
      setError("Delivery date is required");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      setError("Delivery date cannot be in the past");
      return;
    }
    await onConfirm(toDateStr(date));
  };

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <Dialog
      header={title}
      visible={visible}
      style={{ width: "26rem" }}
      breakpoints={{ "641px": "95vw" }}
      onHide={onHide}
    >
      {description && (
        <p className="text-xs text-gray-500 mb-3">{description}</p>
      )}

      <label className="text-sm font-semibold text-gray-700 block mb-2">
        Expected delivery date <span className="text-red-500">*</span>
      </label>
      <Calendar
        value={date}
        onChange={(e) => {
          setDate((e.value as Date) || null);
          if (error) setError("");
        }}
        minDate={minDate}
        dateFormat="dd/mm/yy"
        placeholder="DD/MM/YYYY"
        showIcon
        readOnlyInput
        className="w-full"
        inputClassName="w-full"
        appendTo={typeof document !== "undefined" ? document.body : undefined}
      />
      {error && (
        <small className="text-red-500 flex items-center gap-1 mt-1">
          <i className="pi pi-exclamation-circle"></i>
          {error}
        </small>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button label="Close" text onClick={onHide} disabled={loading} />
        <Button
          label={confirmLabel}
          icon="pi pi-check"
          onClick={handleConfirm}
          loading={loading}
        />
      </div>
    </Dialog>
  );
}

export default DeliveryDateDialog;