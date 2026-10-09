import React from "react";
import { PaymentSummary, money } from "@/types/paymentReport";

const TONES = {
  green: "bg-green-50 border-green-200 text-green-800",
  red: "bg-red-50 border-red-200 text-red-800",
  blue: "bg-blue-50 border-blue-200 text-blue-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  gray: "bg-gray-50 border-gray-200 text-gray-800",
} as const;

function StatCard({
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

export default function SummaryCards({ summary }: { summary: PaymentSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <StatCard
        label="Total Received"
        value={money(summary.paidAmount)}
        sub={`${summary.paidOrders} paid order${summary.paidOrders === 1 ? "" : "s"}`}
        tone="green"
      />
      <StatCard
        label="Total Due"
        value={money(summary.dueAmount)}
        sub={`${summary.dueOrders} unpaid order${summary.dueOrders === 1 ? "" : "s"}`}
        tone="red"
      />
      <StatCard
        label="Total Billed"
        value={money(summary.totalBilled)}
        sub={`Collection ${summary.collectionRate}%`}
        tone="blue"
      />
      <StatCard
        label="Awaiting Quote"
        value={String(summary.awaitingQuoteOrders)}
        sub="Price not finalised yet"
        tone="amber"
      />
      <StatCard
        label="COD Received"
        value={money(summary.codPaid)}
        sub={`COD due ${money(summary.codDue)}`}
        tone="gray"
      />
      <StatCard
        label="Online Received"
        value={money(summary.onlinePaid)}
        sub={`Online due ${money(summary.onlineDue)}`}
        tone="gray"
      />
      <StatCard
        label="Refunded"
        value={money(summary.refundedAmount)}
        tone="gray"
      />
      <StatCard
        label="Cancelled (unpaid)"
        value={money(summary.cancelledAmount)}
        tone="gray"
      />
    </div>
  );
}