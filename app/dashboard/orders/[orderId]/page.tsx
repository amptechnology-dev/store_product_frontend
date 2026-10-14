"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { formatDate } from "@/helper/DateTime";
import {
  OrderRow,
  OrderStatus,
  PaymentStatus,
  STATUS_STYLES,
  STATUS_ICONS,
  PAYMENT_STATUS_STYLES,
  PAYMENT_STATUS_ICONS,
  ATTEMPT_STYLES,
  TERMINAL_STATUSES,
  getNextStatuses,
  isQuotePending,
  isPaymentPending,
  updateOrderStatusApi,
} from "@/types/order";
import DeliveryDateDialog, {
  formatDeliveryDate,
} from "@/components/orders/DeliveryDateDialog";
// [DELIVERY] order place er somoy er estimate dekhano
import { formatEstimateRange, getEtaLabel } from "@/helper/delivery";
import ShipmentCard from "@/components/orders/ShipmentCard";

const WORKER_ENDPOINT = "/api/worker/all-workers";

// Adjust to your karigars' actual country code (e.g. "880" for BD numbers).
const DEFAULT_COUNTRY_CODE = "91";

// Cancel reason validation
const CANCEL_REASON_MIN = 3;
const CANCEL_REASON_MAX = 300;
const getCancelReasonError = (value: string) => {
  const v = value.trim();
  if (!v) return "Cancellation reason is required";
  if (v.length < CANCEL_REASON_MIN)
    return `Reason must be at least ${CANCEL_REASON_MIN} characters`;
  return "";
};

// ---------- Small helpers ----------
const money = (n?: number | null) => `₹${Number(n ?? 0).toFixed(2)}`;

// undefined / null date hole "-" dekhabe, formatDate crash korbe na
const safeDate = (d?: string | null) => (d ? formatDate(d) : "-");

type KarigarRow = {
  _id: string;
  name: string;
  whatsappNo: string;
  isActive?: boolean;
};

// ---------- Media helpers (image / gif / video) ----------
const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_REGEX.test(url);

/**
 * Halka media preview.
 *  - image/gif  -> lazy-loaded <img>
 *  - video      -> muted <video>, preload="metadata" (sudhu first frame load hoy)
 *      autoPlay=true  : screen e dekha gele play, baire gele pause (IntersectionObserver)
 *      autoPlay=false : hover korle play, mouse soriye nile pause + first frame e ferot
 */
function MediaPreview({
  src,
  alt = "",
  wrapperClassName = "",
  autoPlay = true,
  showBadge = true,
}: {
  src: string;
  alt?: string;
  wrapperClassName?: string;
  autoPlay?: boolean;
  showBadge?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = isVideoUrl(src);

  useEffect(() => {
    if (!isVideo || !autoPlay) return;
    const el = videoRef.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      el.pause();
    };
  }, [isVideo, autoPlay, src]);

  if (!isVideo) {
    return (
      <div className={`relative overflow-hidden ${wrapperClassName}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      <video
        ref={videoRef}
        src={`${src}#t=0.1`}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        onMouseEnter={
          autoPlay ? undefined : (e) => e.currentTarget.play().catch(() => {})
        }
        onMouseLeave={
          autoPlay
            ? undefined
            : (e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0.1;
              }
        }
        className="absolute inset-0 h-full w-full object-cover"
      />
      {showBadge && (
        <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 pointer-events-none">
          <i className="pi pi-video text-[9px]"></i>
          Video
        </span>
      )}
    </div>
  );
}

const toWhatsAppNumber = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length > 10) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }
  return `${DEFAULT_COUNTRY_CODE}${digits}`;
};

// Ekta item er message block: Image/Video, Color, Size, Weight, Quantity (jegulo ache shudhu segulo)
const buildItemLines = (item: any): string[] =>
  [
    item.image
      ? `${isVideoUrl(item.image) ? "Video" : "Image"}: ${item.image}`
      : null,
    item.color ? `Color: ${item.color}` : null,
    item.size ? `Size: ${item.size}` : null,
    item.weight ? `Weight: ${item.weight}` : null,
    `Quantity: ${item.quantity}`,
  ].filter(Boolean) as string[];

// Single item -> label chhara. Multiple item -> "Item N" label + blank line separator
const buildShareMessage = (items: any[]) => {
  if (items.length === 1) return buildItemLines(items[0]).join("\n");

  return items
    .map((item, idx) => [`Item ${idx + 1}`, ...buildItemLines(item)].join("\n"))
    .join("\n\n");
};

// ===============================================================
// Payment status badge (header e use hoy)
// ===============================================================
function PaymentBadge({ status }: { status?: PaymentStatus }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${PAYMENT_STATUS_STYLES[status]}`}
    >
      <i className={`${PAYMENT_STATUS_ICONS[status]} text-[10px]`}></i>
      {status}
    </span>
  );
}

// ===============================================================
// Shared UI blocks
// ===============================================================
function SectionCard({
  icon,
  title,
  right,
  children,
  className = "",
}: {
  icon: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${className}`}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900">
          <span className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <i className={`pi ${icon} text-xs`} />
          </span>
          {title}
        </h3>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoTile({
  label,
  children,
  highlight = false,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-100"
      } ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="text-sm font-medium text-gray-800 mt-0.5 break-words">
        {children}
      </div>
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-800 text-right break-words">{children}</span>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white shadow-sm px-3.5 py-3">
      <span className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
        <i className={`pi ${icon}`} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Copy failed");
  }
};

// ===============================================================
// Price summary
// ===============================================================
function PriceSummary({ order }: { order: OrderRow }) {
  const items = (order.items || []) as any[];
  const hasPending = items.some((i) => i.priceOnRequest && i.lineTotal == null);
  const anyInclusive = items.some((i) => i.gstInclusive);

  const gstRows = [
    { label: "CGST", value: order.totalCgst },
    { label: "SGST", value: order.totalSgst },
    { label: "IGST", value: order.totalIgst },
  ].filter((r) => Number(r.value) > 0);
  const hasGst = gstRows.length > 0;

  return (
    <SectionCard icon="pi-receipt" title="Price Summary">
      <div className="space-y-2">
        <KV label="Total MRP">{money(order.totalMrp)}</KV>
        <KV label="Discount">
          <span className="text-green-700">- {money(order.discount)}</span>
        </KV>

        {hasGst && (
          <div className="border-t border-dashed border-gray-200 pt-2 space-y-2">
            <KV label="Subtotal">{money(order.subtotal)}</KV>
            {gstRows.map((r) => (
              <KV key={r.label} label={r.label}>
                {anyInclusive ? "" : "+ "}
                {money(r.value)}
              </KV>
            ))}
            {anyInclusive && (
              <p className="text-[11px] text-gray-400">
                GST amounts are already included in item prices.
              </p>
            )}
          </div>
        )}

        {Number(order.shippingCharge || 0) > 0 && (
          <KV label="Shipping">{money(order.shippingCharge)}</KV>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3.5 py-2.5 text-white">
        <span className="text-sm font-medium">Total Amount</span>
        <span className="text-lg font-bold">{money(order.totalAmount)}</span>
      </div>

      {hasPending && (
        <p className="text-[11px] text-amber-600 mt-2">
          Some items are waiting for price estimate, total excludes them.
        </p>
      )}
    </SectionCard>
  );
}

// ===============================================================
// Payment card
// ===============================================================
function PaymentCard({ order }: { order: OrderRow }) {
  const method = order.paymentMethod || "COD";
  const status: PaymentStatus = order.paymentStatus || "PENDING";
  const attempts = [...(order.paymentAttempts || [])].reverse();
  const successAttempt = (order.paymentAttempts || []).find(
    (a) => a.status === "SUCCESS",
  );
  const isOnline = method === "ONLINE";
  const waitingForPayment =
    isOnline && status !== "PAID" && order.status === "PENDING";

  return (
    <SectionCard
      icon="pi-wallet"
      title="Payment"
      right={<PaymentBadge status={status} />}
    >
      <div className="grid grid-cols-2 gap-2">
        <InfoTile label="Method">
          {isOnline ? "Online (PayU)" : "Cash on Delivery"}
        </InfoTile>
        <InfoTile label="Amount" highlight>
          {money(order.totalAmount)}
        </InfoTile>
      </div>

      {!isOnline && status !== "PAID" && (
        <p className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
          Collect {money(order.totalAmount)} from the customer at delivery.
          Payment will be marked PAID when the order is Delivered.
        </p>
      )}

      {status === "PAID" && (
        <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
          {order.paidAt && <KV label="Paid on">{safeDate(order.paidAt)}</KV>}
          {isOnline && successAttempt?.mode && (
            <KV label="Mode">{successAttempt.mode}</KV>
          )}
          {isOnline && successAttempt?.mihpayid && (
            <KV label="PayU ID">{successAttempt.mihpayid}</KV>
          )}
          {isOnline && successAttempt?.bankRefNum && (
            <KV label="Bank Ref">{successAttempt.bankRefNum}</KV>
          )}
        </div>
      )}

      {waitingForPayment && (
        <div className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5">
          <i className="pi pi-info-circle mr-1"></i>
          {status === "FAILED"
            ? "Last payment attempt failed. Customer can retry"
            : "Waiting for the customer to complete payment"}
          {order.paymentExpiresAt
            ? ` until ${safeDate(order.paymentExpiresAt)}.`
            : "."}{" "}
          You can confirm this order only after payment is received.
        </div>
      )}

      {status === "REFUNDED" && (
        <p className="mt-3 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg p-2.5">
          This payment has been refunded.
        </p>
      )}

      {isOnline && attempts.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Payment attempts ({attempts.length})
          </p>
          <div className="space-y-2">
            {attempts.map((a) => (
              <div
                key={a.txnid}
                className="border border-gray-100 rounded-lg p-2.5 text-xs bg-gray-50/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${ATTEMPT_STYLES[a.status]}`}
                  >
                    {a.status}
                  </span>
                  <span className="text-gray-500">
                    {safeDate(a.completedAt || a.createdAt)}
                  </span>
                </div>
                <p className="text-gray-500 mt-1 break-all">Txn: {a.txnid}</p>
                <p className="text-gray-700">
                  {money(a.amount)}
                  {a.mode ? ` • ${a.mode}` : ""}
                </p>
                {a.errorMessage && (
                  <p className="text-red-600 mt-0.5">{a.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ===============================================================
// Courier (Shiprocket) details
// ===============================================================
const COURIER_STEPS = [
  "Confirmed",
  "Shipment",
  "AWB",
  "Pickup",
  "In transit",
  "Delivered",
];

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  CREATED: "Shipment created",
  AWB_ASSIGNED: "AWB assigned",
  PICKUP_SCHEDULED: "Pickup scheduled",
};

const shipmentTone = (st?: string | null) => {
  const v = (st || "").toUpperCase();
  if (v.includes("RTO") || v.includes("CANCEL") || v.includes("UNDELIVERED"))
    return "bg-red-100 text-red-700";
  if (v.includes("DELIVERED")) return "bg-green-100 text-green-800";
  if (v.includes("TRANSIT") || v.includes("PICKED") || v.includes("OUT FOR"))
    return "bg-indigo-100 text-indigo-800";
  return "bg-blue-100 text-blue-800";
};

// koyta step shesh hoyeche
const getCourierProgress = (order: OrderRow): number => {
  const s = order.shipment;
  const flags = [
    ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status),
    !!s?.shipmentId,
    !!s?.awb,
    !!s?.pickupRequestedAt,
    ["SHIPPED", "DELIVERED"].includes(order.status),
    order.status === "DELIVERED",
  ];
  let done = 0;
  for (const f of flags) {
    if (f) done++;
    else break;
  }
  return done;
};

function CourierStepper({ done }: { done: number }) {
  return (
    <div className="flex items-start">
      {COURIER_STEPS.map((label, i) => {
        const completed = i < done;
        const current = i === done;
        return (
          <div
            key={label}
            className="flex-1 flex flex-col items-center relative"
          >
            {i > 0 && (
              <span
                className={`absolute top-3 right-1/2 w-full h-0.5 ${
                  i <= done ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
            <span
              className={`relative z-10 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                completed
                  ? "bg-green-500 border-green-500 text-white"
                  : current
                    ? "bg-white border-blue-500 text-blue-600"
                    : "bg-white border-gray-200 text-gray-400"
              }`}
            >
              {completed ? <i className="pi pi-check text-[9px]" /> : i + 1}
            </span>
            <span
              className={`mt-1.5 text-[10px] text-center leading-tight ${
                completed || current
                  ? "text-gray-700 font-medium"
                  : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CourierDetailsCard({ order }: { order: OrderRow }) {
  const s = order.shipment;
  const d = order.deliveryInfo;
  const isCourierMode = d?.mode === "NATIONAL" || d?.mode === "INTERNATIONAL";
  if (!s && !isCourierMode) return null;

  const events = [...(s?.events || [])].reverse().slice(0, 8); // latest first
  const done = getCourierProgress(order);

  return (
    <SectionCard
      icon="pi-truck"
      title="Courier & Shipment"
      right={
        s?.status ? (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${shipmentTone(s.status)}`}
          >
            {SHIPMENT_STATUS_LABEL[s.status] ?? s.status}
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
            Not shipped
          </span>
        )
      }
    >
      {/* progress */}
      {d?.mode !== "INTERNATIONAL" && (
        <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50/70 px-3 pt-3 pb-2">
          <CourierStepper done={done} />
        </div>
      )}

      {/* shipment nei */}
      {!s && d && (
        <>
          <div
            className={`mb-3 text-xs rounded-lg border p-2.5 ${
              d.mode === "INTERNATIONAL"
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            <i className="pi pi-info-circle mr-1.5"></i>
            {d.mode === "INTERNATIONAL"
              ? "International shipments are created from the Shiprocket panel (customs documents are required)."
              : "Shipment is not created yet. Confirm the order, then create the courier shipment."}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InfoTile label="Quoted courier">{d.courierName || "-"}</InfoTile>
            <InfoTile label="Courier rate">
              {d.courierRate != null ? money(d.courierRate) : "-"}
            </InfoTile>
            <InfoTile label="Rate based on">
              {d.chargeableWeightKg != null
                ? `${d.chargeableWeightKg} kg`
                : "-"}
            </InfoTile>
            <InfoTile label="Estimate source">
              {d.source === "SHIPROCKET" ? "Live courier rate" : "Store backup"}
            </InfoTile>
          </div>
        </>
      )}

      {/* shipment ache */}
      {s && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoTile label="Courier partner">{s.courierName || "-"}</InfoTile>

            <InfoTile label="AWB number">
              {s.awb ? (
                <span className="flex items-center gap-1.5">
                  <span className="break-all">{s.awb}</span>
                  <button
                    type="button"
                    title="Copy AWB"
                    onClick={() => copyText(s.awb as string)}
                    className="h-6 w-6 shrink-0 rounded-md hover:bg-gray-200 text-gray-500 flex items-center justify-center"
                  >
                    <i className="pi pi-copy text-xs" />
                  </button>
                </span>
              ) : (
                "-"
              )}
            </InfoTile>

            <InfoTile label="Pickup by courier">
              {s.pickupScheduledDate
                ? safeDate(s.pickupScheduledDate)
                : s.pickupRequestedAt
                  ? "Requested, date awaited"
                  : "Not requested"}
              {s.pickupTokenNumber && (
                <span className="block text-[11px] font-normal text-gray-500">
                  Token: {s.pickupTokenNumber}
                </span>
              )}
            </InfoTile>

            <InfoTile label="Expected delivery" highlight>
              {s.etd ? safeDate(s.etd) : "-"}
              {s.etd && (
                <span className="block text-[11px] font-normal text-gray-500">
                  {s.etdSource === "COURIER"
                    ? "Confirmed by courier"
                    : "Initial estimate"}
                </span>
              )}
            </InfoTile>

            <InfoTile label="Courier charged weight">
              {s.appliedWeight != null ? `${s.appliedWeight} kg` : "-"}
            </InfoTile>

            <InfoTile label="Quoted courier rate">
              {d?.courierRate != null ? money(d.courierRate) : "-"}
            </InfoTile>
          </div>

          {s.courierSwitched && (
            <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <i className="pi pi-exclamation-triangle mr-1.5"></i>
              The quoted courier was not available, so Shiprocket assigned
              another one. The final rate may differ.
            </p>
          )}

          {s.trackingUrl && (
            <a
              href={s.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 transition-colors"
            >
              <i className="pi pi-external-link text-xs" />
              Track shipment
            </a>
          )}

          {events.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-3">
                Tracking history
              </p>
              <ol className="relative border-l-2 border-blue-100 ml-1.5 space-y-3">
                {events.map((e, i) => (
                  <li key={i} className="pl-4 relative">
                    <span
                      className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                        i === 0 ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800">
                        {e.status || e.activity}
                      </p>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {safeDate(e.at)}
                      </span>
                    </div>
                    {e.activity && e.status && e.activity !== e.status && (
                      <p className="text-xs text-gray-500">{e.activity}</p>
                    )}
                    {e.location && (
                      <p className="text-[11px] text-gray-400">
                        <i className="pi pi-map-marker text-[10px] mr-1" />
                        {e.location}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ===============================================================
// Packaging
// ===============================================================
function PackagingCard({ order }: { order: OrderRow }) {
  const p = order.parcel;
  if (!p || !p.items?.length) return null;

  const hasDefaults = p.items.some(
    (i) => i.usedDefaultWeight || i.usedDefaultDims,
  );

  return (
    <SectionCard icon="pi-box" title="Packaging">
      <div className="grid grid-cols-3 gap-2">
        <InfoTile label="Actual">{p.weight} kg</InfoTile>
        <InfoTile label="Volumetric">{p.volumetricWeight} kg</InfoTile>
        <InfoTile label="Chargeable" highlight>
          {p.chargeableWeight} kg
        </InfoTile>
      </div>

      <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between text-sm">
        <span className="text-gray-500">Parcel size</span>
        <span className="font-medium text-gray-800">
          {p.length} × {p.breadth} × {p.height} cm
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {p.items.map((it, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-100 p-2.5 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-gray-800 line-clamp-1">
                {it.name || "Item"}
                <span className="text-gray-400"> × {it.quantity}</span>
              </p>
              <span className="shrink-0 font-semibold text-blue-700">
                {it.lineWeightKg} kg
              </span>
            </div>
            <p className="text-gray-500 mt-0.5">
              {it.unitWeightKg} kg each • {it.length}×{it.breadth}×{it.height}{" "}
              cm
            </p>
            {(it.usedDefaultWeight || it.usedDefaultDims) && (
              <p className="text-amber-600 text-[11px] mt-0.5">
                <i className="pi pi-exclamation-triangle text-[10px] mr-1" />
                Packaging not set, default values used
              </p>
            )}
          </div>
        ))}
      </div>

      {hasDefaults && (
        <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          Add weight and size in the product's packaging details so courier
          rates are accurate.
        </p>
      )}
    </SectionCard>
  );
}

// ===============================================================
// Quote panel (design change kori ni)
// ===============================================================
function QuotePanel({
  order,
  submitting,
  onSubmit,
}: {
  order: OrderRow;
  submitting: boolean;
  onSubmit: (
    items: { itemId: string; unitPrice: number }[],
    note?: string,
  ) => void;
}) {
  const allItems = ((order.items as any[]) || []) as any[];
  const items = allItems.filter((i) => i.priceOnRequest);
  const pricedTotal = allItems
    .filter((i) => !i.priceOnRequest)
    .reduce((s, i) => s + (i.lineTotal || 0), 0);

  const [prices, setPrices] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    items.forEach((i) => {
      const q = order.quote?.items?.find((x) => x.itemId === i._id);
      init[i._id] = q ? q.unitPrice : null;
    });
    return init;
  });
  const [note, setNote] = useState(order.quote?.note || "");

  const estimatedTotal =
    pricedTotal +
    items.reduce((s, i) => s + (prices[i._id] || 0) * i.quantity, 0);

  const lastRejection = [...(order.priceHistory || [])]
    .reverse()
    .find((h) => h.action === "REJECTED");

  const isQuoted = order.priceStatus === "QUOTED";

  const handleSubmit = () => {
    const missing = items.find((i) => !prices[i._id] || prices[i._id]! <= 0);
    if (missing) {
      toast.error(`Enter a price for "${missing.name}"`);
      return;
    }
    onSubmit(
      items.map((i) => ({ itemId: i._id, unitPrice: Number(prices[i._id]) })),
      note.trim() || undefined,
    );
  };

  return (
    <div className="border border-amber-200 bg-amber-50/60 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-amber-100 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-900">
          <i className="pi pi-tag mr-1.5"></i>
          Price estimate
        </p>
        <span className="text-[11px] font-semibold text-amber-800">
          {isQuoted
            ? "Sent — waiting for customer (you can revise)"
            : "Customer is waiting for your price"}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {lastRejection && !isQuoted && (
          <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-md p-2">
            Customer declined the last estimate
            {lastRejection.total ? ` (₹${lastRejection.total})` : ""}
            {lastRejection.note ? ` — "${lastRejection.note}"` : ""}. Send a new
            price.
          </div>
        )}

        {items.map((item) => (
          <div
            key={item._id}
            className="flex flex-wrap items-center gap-2 bg-white border border-amber-100 rounded-md p-2"
          >
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm font-medium text-gray-800 line-clamp-1">
                {item.name}
              </p>
              <p className="text-xs text-gray-500">
                {[item.color, item.size, item.weight, item.height]
                  .filter(Boolean)
                  .join(" • ") || "—"}{" "}
                • Qty {item.quantity}
              </p>
            </div>
            <div className="w-36">
              <label className="text-[10px] font-medium text-gray-500">
                Price / unit (₹)
              </label>
              <InputNumber
                value={prices[item._id] ?? null}
                onValueChange={(e) =>
                  setPrices((p) => ({ ...p, [item._id]: e.value ?? null }))
                }
                mode="decimal"
                minFractionDigits={2}
                maxFractionDigits={2}
                min={0}
                useGrouping={false}
                className="w-full"
                inputClassName="w-full p-inputtext-sm"
              />
            </div>
            <div className="w-24 text-right text-sm font-semibold text-amber-800">
              ₹{((prices[item._id] || 0) * item.quantity).toFixed(2)}
            </div>
          </div>
        ))}

        <InputTextarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={300}
          className="w-full"
          placeholder="Note for customer (optional)"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div>
            <p className="text-sm text-gray-700">
              Estimated total (before GST):{" "}
              <b className="text-amber-800">₹{estimatedTotal.toFixed(2)}</b>
            </p>
            {/* [GST] customer ke jei total dekhano hobe seta GST soho, backend calculate kore */}
            <p className="text-[11px] text-gray-500">
              Customer will see the final total with applicable GST.
            </p>
          </div>
          <Button
            label={isQuoted ? "Update estimate" : "Send estimate to customer"}
            icon="pi pi-send"
            loading={submitting}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

function OrderDetailsPage() {
  const router = useRouter();
  const { orderId } = useParams<{ orderId: string }>();

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<OrderRow | null>(null);

  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [dateDialog, setDateDialog] = useState<{
    visible: boolean;
    mode: "ship" | "edit";
  }>({ visible: false, mode: "edit" });

  // ---- Multi-select state ----
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ---- Karigar share modal state (multiple items support kore) ----
  const [shareModal, setShareModal] = useState<{
    visible: boolean;
    items: any[];
  }>({ visible: false, items: [] });
  const [karigars, setKarigars] = useState<KarigarRow[]>([]);
  const [karigarLoading, setKarigarLoading] = useState(false);
  const [karigarSearch, setKarigarSearch] = useState("");

  useEffect(() => {
    if (orderId) getOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const getOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/order/store-orders/${orderId}`);
      setOrder(res.data.order);
      setSelectedIds([]);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Order not found");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const applyStatusChange = async (status: OrderStatus, note?: string) => {
    if (!order) return false;
    try {
      setUpdating(true);
      const res = await updateOrderStatusApi(order._id, status, note);
      toast.success(res.data.message || `Order marked as ${status}`);
      setOrder((prev) => (prev ? { ...prev, ...res.data.order } : prev));
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusClick = (newStatus: OrderStatus) => {
    if (!order) return;

    if (newStatus === "CANCELLED") {
      if (order.paymentStatus === "PAID") {
        toast.error("Payment completed, order can no longer be cancelled");
        return;
      }
      setCancelNote("");
      setCancelError("");
      setCancelDialogVisible(true);
      return;
    }

    // [DELIVERY] delivery off hole date lagbe na
    if (newStatus === "SHIPPED" && order.deliveryEnabled !== false) {
      setDateDialog({ visible: true, mode: "ship" });
      return;
    }

    confirmDialog({
      message: `Change order status from "${order.status}" to "${newStatus}"?`,
      header: "Confirm Status Change",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-warning",
      accept: () => applyStatusChange(newStatus),
    });
  };

  const confirmDeliveryDate = async (dateStr: string) => {
    if (!order) return;
    const isShip = dateDialog.mode === "ship";
    try {
      setUpdating(true);
      const res = isShip
        ? await axiosInstance.patch(
            `/api/order/store-orders/${order._id}/status`,
            { status: "SHIPPED", expectedDeliveryDate: dateStr },
          )
        : await axiosInstance.patch(
            `/api/order/store-orders/${order._id}/delivery-date`,
            { expectedDeliveryDate: dateStr },
          );
      toast.success(
        res.data.message ||
          (isShip ? "Order marked as SHIPPED" : "Delivery date updated"),
      );
      setOrder((prev) => (prev ? { ...prev, ...res.data.order } : prev));
      setDateDialog((d) => ({ ...d, visible: false }));
    } catch (err: any) {
      toast.error(
        err?.response?.data?.errors?.[0]?.message ||
          err?.response?.data?.message ||
          "Failed to update delivery date",
      );
    } finally {
      setUpdating(false);
    }
  };

  // price estimate pathano / update kora
  const submitQuote = async (
    items: { itemId: string; unitPrice: number }[],
    note?: string,
  ) => {
    if (!order) return;
    try {
      setUpdating(true);
      const res = await axiosInstance.patch(
        `/api/order/store-orders/${order._id}/quote`,
        { items, ...(note ? { note } : {}) },
      );
      toast.success(res.data.message || "Price estimate sent");
      setOrder((prev) => (prev ? { ...prev, ...res.data.order } : prev));
    } catch (err: any) {
      toast.error(
        err?.response?.data?.errors?.[0]?.message ||
          err?.response?.data?.message ||
          "Failed to send estimate",
      );
    } finally {
      setUpdating(false);
    }
  };

  const closeCancelDialog = () => {
    setCancelDialogVisible(false);
    setCancelNote("");
    setCancelError("");
  };

  const confirmCancelOrder = async () => {
    // Remarks mandatory
    const err = getCancelReasonError(cancelNote);
    if (err) {
      setCancelError(err);
      return;
    }

    const ok = await applyStatusChange("CANCELLED", cancelNote.trim());
    if (ok) closeCancelDialog();
  };

  // ---- Selection helpers ----
  const allItems: any[] = useMemo(() => (order?.items as any[]) || [], [order]);

  const allSelected =
    allItems.length > 0 && selectedIds.length === allItems.length;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : allItems.map((i) => i._id));
  };

  // ---- Karigar share handlers ----
  const getKarigars = async () => {
    try {
      setKarigarLoading(true);
      const res = await axiosInstance.get(WORKER_ENDPOINT, {
        params: { limit: 100 },
      });
      setKarigars(
        (res.data.workers || []).filter(
          (w: KarigarRow) => w.isActive !== false,
        ),
      );
    } catch {
      toast.error("Failed to load karigars");
    } finally {
      setKarigarLoading(false);
    }
  };

  const openShareModal = (items: any[]) => {
    if (items.length === 0) return;
    setShareModal({ visible: true, items });
    if (karigars.length === 0) getKarigars();
  };

  const closeShareModal = () => {
    setShareModal({ visible: false, items: [] });
    setKarigarSearch("");
  };

  const handleShareSelected = () => {
    openShareModal(allItems.filter((i) => selectedIds.includes(i._id)));
  };

  const handleSelectKarigar = (karigar: KarigarRow) => {
    if (shareModal.items.length === 0) return;

    const number = toWhatsAppNumber(karigar.whatsappNo);
    const message = buildShareMessage(shareModal.items);
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(
      `Opening WhatsApp for ${karigar.name} (${shareModal.items.length} item${
        shareModal.items.length > 1 ? "s" : ""
      })`,
    );
    closeShareModal();
    setSelectedIds([]);
  };

  const filteredKarigars = useMemo(() => {
    if (!karigarSearch.trim()) return karigars;
    const q = karigarSearch.trim().toLowerCase();
    return karigars.filter(
      (k) => k.name?.toLowerCase().includes(q) || k.whatsappNo?.includes(q),
    );
  }, [karigars, karigarSearch]);

  if (loading || !order) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <i className="pi pi-spin pi-spinner text-3xl text-gray-400" />
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(order.status);

  const isPaid = order.paymentStatus === "PAID";

  const quotePending = isQuotePending(order);

  const paymentPending = isPaymentPending(order);

  const nextStatuses = getNextStatuses(order.status).filter((s) => {
    if (s === "CONFIRMED" && (quotePending || paymentPending)) return false;
    if (s === "CANCELLED" && isPaid) return false;
    return true;
  });

  const canEditDeliveryDate =
    order.deliveryEnabled !== false &&
    ["PENDING", "CONFIRMED", "SHIPPED"].includes(order.status);

  const deliveryInfo = order.deliveryInfo;

  // Quick stats-er "Expected delivery" tile-er jonno
  const expectedText = order.expectedDeliveryDate
    ? formatDeliveryDate(order.expectedDeliveryDate)
    : order.shipment?.etd
      ? safeDate(order.shipment.etd)
      : deliveryInfo?.etaLabel || "-";

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-gray-50/60 rounded-xl shadow p-3 sm:p-4 space-y-4">
        {/* ============ Header ============ */}
        <div
          className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center p-3.5 rounded-xl shadow-sm"
          style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              icon="pi pi-arrow-left"
              onClick={() => router.push("/dashboard/orders")}
              text
              style={{ color: "#fff" }}
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">
                Order #{order.orderNumber}
              </h2>
              <p className="text-[11px] text-blue-100 leading-tight">
                Placed on {formatDate(order.createdAt)}
              </p>
              <p className="text-xs text-white/90 leading-tight mt-1">
                <i className="pi pi-user mr-1"></i>
                {order.userId?.name}
                <span className="text-blue-100"> • {order.userId?.phone}</span>
                {order.userId?.email && (
                  <span className="text-blue-100">
                    {" "}
                    • {order.userId?.email}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {!order.paymentOff && (
              <>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/20 text-white">
                  {order.paymentMethod === "ONLINE" ? "ONLINE" : "COD"}
                </span>
                <PaymentBadge status={order.paymentStatus} />
              </>
            )}
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status]}`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* ============ Quick stats ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatTile
            icon="pi-wallet"
            label="Order total"
            value={money(order.totalAmount)}
            sub={
              Number(order.shippingCharge || 0) > 0
                ? `incl. ${money(order.shippingCharge)} shipping`
                : undefined
            }
          />
          <StatTile
            icon="pi-box"
            label="Items"
            value={`${order.totalItems} item${order.totalItems > 1 ? "s" : ""}`}
            sub={
              order.parcel
                ? `${order.parcel.chargeableWeight} kg chargeable`
                : undefined
            }
          />
          <StatTile
            icon="pi-credit-card"
            label="Payment"
            value={
              order.paymentOff
                ? "Paid to store"
                : order.paymentMethod === "ONLINE"
                  ? "Online"
                  : "Cash on Delivery"
            }
            sub={order.paymentOff ? undefined : order.paymentStatus}
          />
          {order.deliveryEnabled !== false ? (
            <StatTile
              icon="pi-calendar"
              label="Expected delivery"
              value={expectedText}
              sub={
                order.shipment?.courierName ||
                deliveryInfo?.courierName ||
                undefined
              }
            />
          ) : (
            <StatTile
              icon="pi-calendar"
              label="Placed on"
              value={safeDate(order.createdAt)}
            />
          )}
        </div>

        {/* ============ Status actions ============ */}
        <div className="flex flex-wrap items-center gap-2">
          {isTerminal ? (
            <p className="text-xs text-gray-500 italic">
              This order is {order.status.toLowerCase()} — status can no longer
              be changed.
            </p>
          ) : (
            nextStatuses.map((s) => (
              <Button
                key={s}
                label={`Mark as ${s}`}
                icon={STATUS_ICONS[s]}
                loading={updating}
                onClick={() => handleStatusClick(s)}
                severity={s === "CANCELLED" ? "danger" : undefined}
                style={
                  s === "CANCELLED"
                    ? undefined
                    : {
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                      }
                }
              />
            ))
          )}
        </div>

        {isPaid && !isTerminal && (
          <p className="text-xs text-green-700">
            <i className="pi pi-lock mr-1"></i>
            Payment has been received, so this order can no longer be cancelled.
          </p>
        )}
        {quotePending && order.status === "PENDING" && (
          <p className="text-xs text-amber-700">
            Order can be confirmed only after the customer accepts your price
            estimate.
          </p>
        )}
        {!quotePending && paymentPending && order.status === "PENDING" && (
          <p className="text-xs text-amber-700">
            <i className="pi pi-lock mr-1"></i>
            This is an online payment order. It can be confirmed only after the
            customer completes the payment.
          </p>
        )}

        {/* ============ Main grid ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ---------- LEFT ---------- */}
          <div className="lg:col-span-7 space-y-4 min-w-0">
            {order.status === "PENDING" && quotePending && (
              <QuotePanel
                key={
                  order.quote?.quotedAt ??
                  `new-${order.priceHistory?.length ?? 0}`
                }
                order={order}
                submitting={updating}
                onSubmit={submitQuote}
              />
            )}

            {order.priceStatus === "CONFIRMED" && (
              <div className="border border-green-200 bg-green-50 rounded-xl p-3 text-sm text-green-800">
                <i className="pi pi-check-circle mr-1.5"></i>
                Customer accepted the estimated price. Order total: ₹
                {Number(order.totalAmount).toFixed(2)}
              </div>
            )}

            {/* Items */}
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white text-sm flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    inputId="select-all-items"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={allItems.length === 0}
                  />
                  <label
                    htmlFor="select-all-items"
                    className="font-semibold text-blue-900 cursor-pointer select-none"
                  >
                    Items ({order.totalItems})
                  </label>
                  <span className="text-[11px] text-blue-500">
                    {selectedIds.length > 0
                      ? `${selectedIds.length} selected`
                      : "Select all"}
                  </span>
                </div>

                {selectedIds.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      label="Clear"
                      text
                      size="small"
                      onClick={() => setSelectedIds([])}
                    />
                    <Button
                      label={`Send (${selectedIds.length}) to Karigar`}
                      icon="pi pi-whatsapp"
                      size="small"
                      onClick={handleShareSelected}
                      style={{
                        background: "#16a34a",
                        border: "1px solid #15803d",
                        color: "#fff",
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-[11px] text-blue-500">
                    select products or tap WhatsApp icon to share one
                  </span>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {allItems.map((item: any) => {
                  const isSelected = selectedIds.includes(item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleItem(item._id)}
                      className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className="pt-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleItem(item._id)}
                        />
                      </div>

                      {item.image ? (
                        <MediaPreview
                          src={item.image}
                          alt={item.name}
                          autoPlay={false}
                          showBadge={false}
                          wrapperClassName="h-16 w-16 rounded-xl border border-gray-200 bg-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-xl border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                          N/A
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Code: {item.productCode || "-"} • {item.unit}
                          {item.color ? ` • ${item.color}` : ""}
                          {item.size ? ` • ${item.size}` : ""}
                          {item.weight ? ` • ${item.weight}` : ""}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Qty: {item.quantity}
                          {item.offerPrice != null && (
                            <>
                              {" "}
                              × ₹{Number(item.offerPrice).toFixed(2)}
                              {item.mrp != null &&
                                item.mrp !== item.offerPrice && (
                                  <span className="line-through text-gray-400 ml-2">
                                    ₹{Number(item.mrp).toFixed(2)}
                                  </span>
                                )}
                            </>
                          )}
                        </p>
                        {Number(item.gstAmount) > 0 && (
                          <p className="text-[11px] text-green-700 mt-0.5">
                            GST ₹{Number(item.gstAmount).toFixed(2)}
                            {item.gstInclusive ? " (incl.)" : ""}
                          </p>
                        )}
                        {item.hsnCode && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            HSN: {item.hsnCode}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <div className="text-sm font-semibold text-blue-700">
                          {(item.lineTotalWithGst ?? item.lineTotal) != null ? (
                            `₹${Number(item.lineTotalWithGst ?? item.lineTotal).toFixed(2)}`
                          ) : (
                            <span className="text-xs text-amber-600">
                              Price pending
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          title="Share this product with karigar"
                          onClick={(e) => {
                            e.stopPropagation();
                            openShareModal([item]);
                          }}
                          className="p-1 rounded-full hover:bg-green-100 transition-colors"
                        >
                          <i className="pi pi-whatsapp text-green-600 text-lg" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Courier & shipment */}
            {order.deliveryEnabled !== false && (
              <div className="space-y-4">
                <ShipmentCard
                  order={order}
                  onUpdated={(o) =>
                    setOrder((prev) => (prev ? { ...prev, ...o } : prev))
                  }
                />
                <CourierDetailsCard order={order} />
              </div>
            )}

            {/* Packaging + Address side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <PackagingCard order={order} />

              <SectionCard icon="pi-map-marker" title="Delivery Address">
                <p className="text-sm font-semibold text-gray-800">
                  {order.deliveryAddress.fullName}
                </p>
                <p className="text-sm text-gray-600">
                  <i className="pi pi-phone text-[11px] mr-1.5 text-gray-400"></i>
                  {order.deliveryAddress.phone}
                </p>
                <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                  <p>
                    {order.deliveryAddress.addressLine}
                    {order.deliveryAddress.area
                      ? `, ${order.deliveryAddress.area}`
                      : ""}
                  </p>
                  <p>
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}{" "}
                    - {order.deliveryAddress.pincode}
                  </p>
                  <p>{order.deliveryAddress.country}</p>
                </div>
                {order.note && (
                  <p className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                    <span className="font-semibold">Note:</span> {order.note}
                  </p>
                )}
              </SectionCard>
            </div>

            {order.status === "CANCELLED" && order.cancelReason && (
              <div className="border border-red-200 bg-red-50 rounded-xl p-3.5 text-sm">
                <p className="font-semibold text-red-700">
                  Cancellation Reason
                </p>
                <p className="text-red-600 mt-1">{order.cancelReason}</p>
                <p className="text-xs text-red-400 mt-1">
                  Cancelled by: {order.cancelledBy}
                </p>
                {order.paymentMethod === "ONLINE" && isPaid && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">
                    Customer had already paid {money(order.totalAmount)}. Refund
                    must be processed manually.
                  </p>
                )}
              </div>
            )}

            {/* Status history */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <SectionCard icon="pi-history" title="Status History">
                <ol className="relative border-l-2 border-blue-100 ml-1.5 space-y-3">
                  {[...order.statusHistory].reverse().map((h, i) => (
                    <li key={i} className="pl-4 relative">
                      <span
                        className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                          i === 0 ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[h.status]}`}
                        >
                          {h.status}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {safeDate(h.at)}
                        </span>
                      </div>
                      {h.note && (
                        <p className="text-xs text-gray-500 mt-1">{h.note}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </SectionCard>
            )}

            {/* Price history */}
            {order.priceHistory && order.priceHistory.length > 0 && (
              <SectionCard icon="pi-tag" title="Price Estimate History">
                <div className="space-y-2">
                  {order.priceHistory.map((h, i) => (
                    <div
                      key={i}
                      className="flex justify-between gap-2 text-xs text-gray-600 border border-gray-100 rounded-lg p-2.5"
                    >
                      <span>
                        <b>
                          {h.action === "QUOTED"
                            ? "You sent"
                            : h.action === "ACCEPTED"
                              ? "Customer accepted"
                              : "Customer declined"}
                        </b>
                        {h.total != null
                          ? ` ₹${Number(h.total).toFixed(2)}`
                          : ""}
                        {h.note ? ` — "${h.note}"` : ""}
                      </span>
                      <span className="shrink-0 text-gray-400">
                        {safeDate(h.at)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* ---------- RIGHT ---------- */}
          <div className="lg:col-span-5 space-y-4 min-w-0 self-start">
            <PriceSummary order={order} />

            {!order.paymentOff && <PaymentCard order={order} />}

            {order.deliveryEnabled !== false && (
              <SectionCard
                icon="pi-calendar"
                title="Expected Delivery"
                right={
                  canEditDeliveryDate ? (
                    <Button
                      label={order.expectedDeliveryDate ? "Edit" : "Set date"}
                      icon="pi pi-calendar"
                      size="small"
                      text
                      onClick={() =>
                        setDateDialog({ visible: true, mode: "edit" })
                      }
                    />
                  ) : undefined
                }
              >
                <div
                  className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${
                    order.expectedDeliveryDate
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <i
                    className={`pi pi-truck text-lg ${
                      order.expectedDeliveryDate
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        order.expectedDeliveryDate
                          ? "text-gray-800"
                          : "text-gray-400"
                      }`}
                    >
                      {formatDeliveryDate(order.expectedDeliveryDate)}
                    </p>
                    {!order.expectedDeliveryDate && canEditDeliveryDate && (
                      <p className="text-[11px] text-gray-400">
                        Required before marking as Shipped
                      </p>
                    )}
                  </div>
                </div>

                {(deliveryInfo?.etaLabel || deliveryInfo?.estimatedMinDate) && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-600">
                      Estimate shown to customer
                    </p>

                    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-sm font-semibold text-blue-700">
                        {getEtaLabel(deliveryInfo)}
                      </p>
                      {deliveryInfo.estimatedMinDate && (
                        <p className="text-xs text-gray-500">
                          {formatEstimateRange(deliveryInfo)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <InfoTile label="Delivery type">
                        {deliveryInfo.mode === "LOCAL"
                          ? "Own delivery"
                          : deliveryInfo.mode === "INTERNATIONAL"
                            ? "International"
                            : "Courier"}
                      </InfoTile>
                      <InfoTile label="Shipping charged">
                        {Number(deliveryInfo.shippingCharge ?? 0) === 0
                          ? "Free"
                          : money(deliveryInfo.shippingCharge)}
                      </InfoTile>
                      {deliveryInfo.courierName && (
                        <InfoTile label="Courier">
                          {deliveryInfo.courierName}
                        </InfoTile>
                      )}
                      {deliveryInfo.courierRate != null && (
                        <InfoTile label="Courier rate">
                          {money(deliveryInfo.courierRate)}
                        </InfoTile>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400">
                      {deliveryInfo.source === "SHIPROCKET"
                        ? "Based on live courier rate"
                        : deliveryInfo.mode !== "LOCAL"
                          ? "Based on store's backup estimate"
                          : ""}
                      {deliveryInfo.mode === "LOCAL" &&
                      deliveryInfo.distanceKm != null
                        ? `About ${deliveryInfo.distanceKm} km from your store`
                        : ""}
                      {deliveryInfo.shippingNote
                        ? ` • ${deliveryInfo.shippingNote}`
                        : ""}
                    </p>
                  </div>
                )}
              </SectionCard>
            )}
          </div>
        </div>

        {/* ============ Dialogs ============ */}

        {/* Cancel order */}
        <Dialog
          header="Cancel Order"
          visible={cancelDialogVisible}
          style={{ width: "28rem", maxWidth: "95vw" }}
          onHide={closeCancelDialog}
          draggable={false}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                label="Back"
                text
                onClick={closeCancelDialog}
                disabled={updating}
              />
              <Button
                label="Cancel Order"
                icon="pi pi-times"
                severity="danger"
                loading={updating}
                onClick={confirmCancelOrder}
              />
            </div>
          }
        >
          <p className="text-sm text-gray-600 mb-3">
            Please tell us why this order is being cancelled. The customer will
            see this reason.
          </p>
          <InputTextarea
            value={cancelNote}
            onChange={(e) => {
              setCancelNote(e.target.value);
              if (cancelError) setCancelError("");
            }}
            rows={4}
            maxLength={CANCEL_REASON_MAX}
            autoResize
            className={`w-full ${cancelError ? "p-invalid" : ""}`}
            placeholder="Cancellation reason (required)"
          />
          <div className="flex items-start justify-between mt-1">
            <small className="text-red-500">{cancelError}</small>
            <small className="text-gray-400">
              {cancelNote.length}/{CANCEL_REASON_MAX}
            </small>
          </div>
        </Dialog>

        {/* Karigar share modal */}
        <Dialog
          header={`Send to Karigar (${shareModal.items.length} item${
            shareModal.items.length > 1 ? "s" : ""
          })`}
          visible={shareModal.visible}
          style={{ width: "28rem", maxWidth: "95vw" }}
          onHide={closeShareModal}
          draggable={false}
        >
          <IconField iconPosition="left" className="w-full mb-3">
            <InputIcon className="pi pi-search" />
            <InputText
              value={karigarSearch}
              onChange={(e) => setKarigarSearch(e.target.value)}
              placeholder="Search by name or number"
              className="w-full"
            />
          </IconField>

          {karigarLoading ? (
            <div className="flex justify-center py-8">
              <i className="pi pi-spin pi-spinner text-2xl text-gray-400" />
            </div>
          ) : filteredKarigars.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No karigar found
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {filteredKarigars.map((k) => (
                <button
                  key={k._id}
                  type="button"
                  onClick={() => handleSelectKarigar(k)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-green-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {k.name}
                    </p>
                    <p className="text-xs text-gray-500">{k.whatsappNo}</p>
                  </div>
                  <i className="pi pi-whatsapp text-green-600 text-lg shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Dialog>

        <DeliveryDateDialog
          visible={dateDialog.visible}
          loading={updating}
          initialDate={order.expectedDeliveryDate}
          title={
            dateDialog.mode === "ship"
              ? "Mark as Shipped"
              : "Edit Delivery Date"
          }
          description={
            dateDialog.mode === "ship"
              ? "Set the expected delivery date. The order will be marked as Shipped."
              : undefined
          }
          confirmLabel={
            dateDialog.mode === "ship" ? "Mark as Shipped" : "Update Date"
          }
          onHide={() => setDateDialog((d) => ({ ...d, visible: false }))}
          onConfirm={confirmDeliveryDate}
        />

        <ConfirmDialog />
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}

export default OrderDetailsPage;
