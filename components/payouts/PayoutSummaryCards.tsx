import React from "react";
import { PayoutSummary } from "@/types/payout";
import { money } from "@/types/paymentReport";

const TONES = {
  blue: "bg-blue-50 border-blue-200 text-blue-800",
  green: "bg-green-50 border-green-200 text-green-800",
  red: "bg-red-50 border-red-200 text-red-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
} as const;

function Card({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className={`border rounded-lg p-3 ${TONES[tone]}`}>
      <p className="text-[11px] font-medium opacity-80">{label}</p>
      <p className="text-lg font-bold leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-[11px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PayoutSummaryCards({
  summary,
  mode,
}: {
  summary: PayoutSummary;
  mode: "ADMIN" | "STORE";
}) {
  const isAdmin = mode === "ADMIN";
  const overpaid = summary.balance < 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <Card
        label={isAdmin ? "Collected from customers" : "Online payments collected"}
        value={money(summary.totalReceived)}
        sub={`${summary.onlineOrders} online paid order${summary.onlineOrders === 1 ? "" : "s"}`}
        tone="blue"
      />
      <Card
        label={isAdmin ? "Paid to stores" : "Received from admin"}
        value={money(summary.totalPaidOut)}
        sub={`${summary.payoutCount} payout${summary.payoutCount === 1 ? "" : "s"} • ${summary.settlementRate}% settled`}
        tone="green"
      />
      <Card
        label={
          overpaid
            ? "Over-paid"
            : isAdmin
              ? "Pending to pay"
              : "Pending from admin"
        }
        value={money(Math.abs(summary.balance))}
        sub={
          isAdmin && summary.pendingStores
            ? `${summary.pendingStores} store${summary.pendingStores === 1 ? "" : "s"} waiting`
            : undefined
        }
        tone={overpaid ? "amber" : summary.balance > 0 ? "red" : "green"}
      />
      <Card
        label="On hold (cancelled, paid)"
        value={money(summary.onHoldAmount)}
        sub="Customer refund needed, not counted"
        tone="amber"
      />
    </div>
  );
}