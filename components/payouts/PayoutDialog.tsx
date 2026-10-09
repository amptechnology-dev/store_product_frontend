import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import {
  PAYOUT_METHODS,
  PayoutMethod,
  PayoutPayload,
} from "@/types/payout";
import { money } from "@/types/paymentReport";

const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

type Props = {
  visible: boolean;
  storeName: string;
  balance: number; // ekhono pawna
  loading: boolean;
  onHide: () => void;
  onSubmit: (payload: PayoutPayload) => Promise<boolean>;
};

export default function PayoutDialog({
  visible,
  storeName,
  balance,
  loading,
  onHide,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PayoutMethod>("BANK_TRANSFER");
  const [paidAt, setPaidAt] = useState(todayStr());
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // dialog khulle form reset
  useEffect(() => {
    if (visible) {
      setAmount(null);
      setMethod("BANK_TRANSFER");
      setPaidAt(todayStr());
      setReferenceNo("");
      setNote("");
      setError("");
    }
  }, [visible]);

  const validate = () => {
    if (amount === null || amount <= 0) return "Enter an amount greater than 0";
    if (amount > balance + 0.005)
      return `Amount cannot exceed pending balance (${money(balance)})`;
    if (!paidAt) return "Select payout date";
    return "";
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    await onSubmit({
      amount: Number(amount),
      method,
      paidAt,
      ...(referenceNo.trim() ? { referenceNo: referenceNo.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  const afterBalance = Math.max(0, balance - (amount || 0));

  return (
    <Dialog
      header={`Pay ${storeName}`}
      visible={visible}
      style={{ width: "28rem" }}
      breakpoints={{ "641px": "95vw" }}
      onHide={onHide}
    >
      <div className="space-y-3 text-sm">
        <div className="bg-red-50 border border-red-200 rounded-md p-2.5 flex justify-between">
          <span className="text-red-700">Pending balance</span>
          <b className="text-red-800">{money(balance)}</b>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-gray-700">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => {
                setAmount(Math.round(balance * 100) / 100);
                setError("");
              }}
            >
              Pay full balance
            </button>
          </div>
          <InputNumber
            value={amount}
            onValueChange={(e) => {
              setAmount(e.value ?? null);
              if (error) setError("");
            }}
            mode="decimal"
            minFractionDigits={2}
            maxFractionDigits={2}
            min={0}
            useGrouping={false}
            className="w-full"
            inputClassName={`w-full ${error ? "p-invalid" : ""}`}
            placeholder="e.g. 20000"
          />
          {amount !== null && amount > 0 && amount <= balance + 0.005 && (
            <p className="text-xs text-gray-500 mt-1">
              Remaining after this payout: <b>{money(afterBalance)}</b>
            </p>
          )}
          {error && (
            <small className="text-red-500 flex items-center gap-1 mt-1">
              <i className="pi pi-exclamation-circle"></i>
              {error}
            </small>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-semibold text-gray-700 block mb-1">
              Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PayoutMethod)}
              className="w-full border rounded-md px-2 py-2 bg-white"
            >
              {PAYOUT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-gray-700 block mb-1">
              Date
            </label>
            <input
              type="date"
              value={paidAt}
              max={todayStr()}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full border rounded-md px-2 py-2 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-gray-700 block mb-1">
            Reference no. (UTR / Txn ID / Cheque no.)
          </label>
          <InputText
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            maxLength={100}
            className="w-full"
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700 block mb-1">Note</label>
          <InputTextarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            className="w-full"
            placeholder="Optional"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button label="Close" text onClick={onHide} />
          <Button
            label="Confirm Payout"
            icon="pi pi-send"
            loading={loading}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </Dialog>
  );
}