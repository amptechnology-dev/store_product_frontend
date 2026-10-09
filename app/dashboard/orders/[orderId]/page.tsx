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
// Price summary (Total MRP / Discount / Total)
// ===============================================================
function PriceSummary({ order }: { order: OrderRow }) {
  const hasPending = (order.items || []).some(
    (i) => i.priceOnRequest && i.lineTotal == null,
  );

  return (
    <div className="border border-blue-100 rounded-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">Price Summary</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-gray-600">
          <span>Total MRP</span>
          <span>{money(order.totalMrp)}</span>
        </div>
        <div className="flex justify-between text-green-700">
          <span>Discount</span>
          <span>- {money(order.discount)}</span>
        </div>
        <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 mt-2 font-semibold text-blue-800 text-base">
          <span>Total Amount</span>
          <span>{money(order.totalAmount)}</span>
        </div>
      </div>
      {hasPending && (
        <p className="text-[11px] text-amber-600 mt-2">
          Some items are waiting for price estimate, total excludes them.
        </p>
      )}
    </div>
  );
}

// ===============================================================
// Payment card
// ===============================================================
function PaymentCard({ order }: { order: OrderRow }) {
  const method = order.paymentMethod || "COD";
  const status: PaymentStatus = order.paymentStatus || "PENDING";
  const attempts = [...(order.paymentAttempts || [])].reverse(); // latest first
  const successAttempt = (order.paymentAttempts || []).find(
    (a) => a.status === "SUCCESS",
  );
  const isOnline = method === "ONLINE";
  const waitingForPayment =
    isOnline && status !== "PAID" && order.status === "PENDING";

  return (
    <div className="border border-blue-100 rounded-lg overflow-hidden text-sm">
      <div className="bg-blue-50 px-3 py-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-blue-800">
          <i className="pi pi-wallet mr-1.5"></i>
          Payment
        </p>
        <PaymentBadge status={status} />
      </div>

      <div className="p-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Method</span>
          <span className="font-medium text-gray-800">
            {isOnline ? "Online (PayU)" : "Cash on Delivery"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Amount</span>
          <span className="font-semibold text-gray-800">
            {money(order.totalAmount)}
          </span>
        </div>

        {/* COD */}
        {!isOnline && status !== "PAID" && (
          <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-2">
            Collect {money(order.totalAmount)} from the customer at delivery.
            Payment will be marked as PAID when you mark the order Delivered.
          </p>
        )}

        {/* PAID details */}
        {status === "PAID" && (
          <div className="space-y-1.5 border-t border-gray-100 pt-2">
            {order.paidAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Paid on</span>
                <span className="text-gray-800">{safeDate(order.paidAt)}</span>
              </div>
            )}
            {isOnline && successAttempt?.mode && (
              <div className="flex justify-between">
                <span className="text-gray-500">Mode</span>
                <span className="text-gray-800">{successAttempt.mode}</span>
              </div>
            )}
            {isOnline && successAttempt?.mihpayid && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 shrink-0">PayU ID</span>
                <span className="text-gray-800 break-all text-right">
                  {successAttempt.mihpayid}
                </span>
              </div>
            )}
            {isOnline && successAttempt?.bankRefNum && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 shrink-0">Bank Ref</span>
                <span className="text-gray-800 break-all text-right">
                  {successAttempt.bankRefNum}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Online, still unpaid */}
        {waitingForPayment && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-2">
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
          <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-md p-2">
            This payment has been refunded.
          </p>
        )}

        {/* Attempt history */}
        {isOnline && attempts.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <p className="text-xs font-semibold text-gray-600 mb-1.5">
              Payment attempts ({attempts.length})
            </p>
            <div className="space-y-1.5">
              {attempts.map((a) => (
                <div
                  key={a.txnid}
                  className="border border-gray-100 rounded-md p-2 text-xs"
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
                  <p className="text-gray-500 mt-1 break-all">
                    Txn: {a.txnid}
                  </p>
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
      </div>
    </div>
  );
}

// ===============================================================
// Price estimate panel (price on request item gulor jonno)
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
            {lastRejection.note ? ` — "${lastRejection.note}"` : ""}. Send a
            new price.
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
          <p className="text-sm text-gray-700">
            Estimated total:{" "}
            <b className="text-amber-800">₹{estimatedTotal.toFixed(2)}</b>
          </p>
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
      setCancelNote("");
      setCancelError("");
      setCancelDialogVisible(true);
      return;
    }

    // SHIPPED korar age delivery date nite hobe
    if (newStatus === "SHIPPED") {
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

  // price estimate user accept na kora porjonto CONFIRMED kora jabe na
  const quotePending = isQuotePending(order);

  // ONLINE order e payment PAID na hole CONFIRMED kora jabe na (backend o block kore)
  const paymentPending = isPaymentPending(order);

  const nextStatuses = getNextStatuses(order.status).filter(
    (s) => !(s === "CONFIRMED" && (quotePending || paymentPending)),
  );

  const canEditDeliveryDate = ["PENDING", "CONFIRMED", "SHIPPED"].includes(
    order.status,
  );

  const isPaid = order.paymentStatus === "PAID";

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-3 sm:p-4 space-y-3">
        {/* Header: back + order# + customer (compact, same block) + status */}
        <div
          className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg"
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
              <p className="text-xs text-white/90 leading-tight mt-0.5">
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
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/20 text-white">
              {order.paymentMethod === "ONLINE" ? "ONLINE" : "COD"}
            </span>
            <PaymentBadge status={order.paymentStatus} />
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status]}`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Status action buttons */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left: Items */}
          <div className="lg:col-span-2 space-y-3">
            {/* Price estimate panel */}
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
              <div className="border border-green-200 bg-green-50 rounded-lg p-2.5 text-sm text-green-800">
                <i className="pi pi-check-circle mr-1.5"></i>
                Customer accepted the estimated price. Order total: ₹
                {Number(order.totalAmount).toFixed(2)}
              </div>
            )}

            <div className="border border-blue-100 rounded-lg overflow-hidden">
              {/* Items header: Select all + Send selected */}
              <div className="bg-blue-50 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    inputId="select-all-items"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={allItems.length === 0}
                  />
                  <label
                    htmlFor="select-all-items"
                    className="font-semibold text-blue-800 cursor-pointer select-none"
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
                  <span className="text-[11px] font-normal text-blue-500">
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
                      className={`flex items-start gap-3 p-2.5 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50" : "hover:bg-blue-50/60"
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
                          wrapperClassName="h-14 w-14 rounded-lg border border-gray-200 bg-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                          N/A
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Code: {item.productCode || "-"} • {item.unit}
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
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <div className="text-sm font-semibold text-blue-700">
                          {item.lineTotal != null ? (
                            `₹${Number(item.lineTotal).toFixed(2)}`
                          ) : (
                            <span className="text-xs text-amber-600">
                              Price pending
                            </span>
                          )}
                        </div>
                        {/* Single item share */}
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
            </div>

            {/* Delivery Address */}
            <div className="border border-blue-100 rounded-lg p-3 text-sm">
              <p className="font-semibold text-gray-700 mb-1.5">
                Delivery Address
              </p>
              <p className="text-gray-800">{order.deliveryAddress.fullName}</p>
              <p className="text-gray-600">{order.deliveryAddress.phone}</p>
              <p className="text-gray-600">
                {order.deliveryAddress.addressLine}
                {order.deliveryAddress.area
                  ? `, ${order.deliveryAddress.area}`
                  : ""}
              </p>
              <p className="text-gray-600">
                {order.deliveryAddress.city}, {order.deliveryAddress.state} -{" "}
                {order.deliveryAddress.pincode}
              </p>
              <p className="text-gray-600">{order.deliveryAddress.country}</p>
              {order.note && (
                <p className="text-gray-600 mt-1.5">
                  <span className="font-medium">Note:</span> {order.note}
                </p>
              )}
            </div>

            {order.status === "CANCELLED" && order.cancelReason && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm">
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
              <div className="border border-blue-100 rounded-lg p-3 text-sm">
                <p className="font-semibold text-gray-700 mb-1.5">
                  Status History
                </p>
                <div className="space-y-1">
                  {order.statusHistory.map((h, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs text-gray-600"
                    >
                      <span
                        className={`px-2 py-0.5 rounded-full ${STATUS_STYLES[h.status]}`}
                      >
                        {h.status}
                      </span>
                      <span>{safeDate(h.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price history */}
            {order.priceHistory && order.priceHistory.length > 0 && (
              <div className="border border-amber-100 rounded-lg p-3 text-sm">
                <p className="font-semibold text-gray-700 mb-1.5">
                  Price Estimate History
                </p>
                <div className="space-y-1">
                  {order.priceHistory.map((h, i) => (
                    <div
                      key={i}
                      className="flex justify-between gap-2 text-xs text-gray-600"
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
                      <span className="shrink-0">{safeDate(h.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: summary + payment + delivery */}
          <div className="space-y-3 self-start">
            <PriceSummary order={order} />

            <PaymentCard order={order} />

            <div className="border border-blue-100 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-semibold text-gray-700">Expected Delivery</p>
                {canEditDeliveryDate && (
                  <Button
                    label={order.expectedDeliveryDate ? "Edit" : "Set date"}
                    icon="pi pi-calendar"
                    size="small"
                    text
                    onClick={() =>
                      setDateDialog({ visible: true, mode: "edit" })
                    }
                  />
                )}
              </div>
              <p
                className={
                  order.expectedDeliveryDate
                    ? "text-gray-800 font-medium"
                    : "text-gray-400"
                }
              >
                <i className="pi pi-truck mr-1.5"></i>
                {formatDeliveryDate(order.expectedDeliveryDate)}
              </p>
              {!order.expectedDeliveryDate && canEditDeliveryDate && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Required before marking as Shipped
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cancel reason dialog (remarks mandatory) */}
        <Dialog
          header="Cancel Order"
          visible={cancelDialogVisible}
          style={{ width: "28rem" }}
          breakpoints={{ "641px": "95vw" }}
          onHide={closeCancelDialog}
        >
          {isPaid && (
            <div className="mb-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md p-2.5">
              <i className="pi pi-exclamation-triangle mr-1"></i>
              The customer has already paid {money(order.totalAmount)}
              {order.paymentMethod === "ONLINE" ? " online" : ""}. Cancelling
              will not refund automatically, you must refund the customer
              manually.
            </div>
          )}

          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Cancellation reason <span className="text-red-500">*</span>
          </label>
          <InputTextarea
            value={cancelNote}
            onChange={(e) => {
              setCancelNote(e.target.value);
              if (cancelError) setCancelError("");
            }}
            onBlur={() => setCancelError(getCancelReasonError(cancelNote))}
            rows={3}
            maxLength={CANCEL_REASON_MAX}
            className={`w-full ${cancelError ? "p-invalid" : ""}`}
            placeholder="e.g. Out of stock"
            autoFocus
          />
          <div className="flex justify-between items-start mt-1">
            {cancelError ? (
              <small className="text-red-500 flex items-center gap-1">
                <i className="pi pi-exclamation-circle"></i>
                {cancelError}
              </small>
            ) : (
              <span />
            )}
            <small className="text-gray-400">
              {cancelNote.length}/{CANCEL_REASON_MAX}
            </small>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button label="Close" text onClick={closeCancelDialog} />
            <Button
              label="Confirm Cancel"
              severity="danger"
              onClick={confirmCancelOrder}
              loading={updating}
              disabled={cancelNote.trim().length < CANCEL_REASON_MIN}
            />
          </div>
        </Dialog>

        {/* Karigar share modal */}
        <Dialog
          header={
            shareModal.items.length === 1
              ? `Share "${shareModal.items[0].name}" with Karigar`
              : `Share ${shareModal.items.length} products with Karigar`
          }
          visible={shareModal.visible}
          style={{ width: "28rem" }}
          breakpoints={{ "641px": "95vw" }}
          onHide={closeShareModal}
        >
          {shareModal.items.length > 0 && (
            <div className="border border-blue-100 rounded-lg mb-3 bg-blue-50 max-h-44 overflow-y-auto divide-y divide-blue-100">
              {shareModal.items.map((it: any) => (
                <div key={it._id} className="flex items-center gap-3 p-2">
                  {it.image ? (
                    <MediaPreview
                      src={it.image}
                      alt={it.name}
                      autoPlay={false}
                      showBadge={false}
                      wrapperClassName="h-12 w-12 rounded-md border border-gray-200 bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-md border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                      N/A
                    </div>
                  )}
                  <div className="text-xs text-gray-700 min-w-0">
                    <p className="font-medium line-clamp-1">{it.name}</p>
                    <p className="text-gray-500">
                      {it.color && `${it.color} • `}
                      {it.size && `${it.size} • `}
                      {it.weight && `${it.weight} • `}
                      Qty {it.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <IconField iconPosition="left" className="w-full mb-2">
            <InputIcon className="pi pi-search" />
            <InputText
              value={karigarSearch}
              onChange={(e) => setKarigarSearch(e.target.value)}
              placeholder="Search karigar by name / number"
              className="p-inputtext-sm w-full"
            />
          </IconField>

          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {karigarLoading && (
              <p className="text-xs text-gray-400 text-center py-4">
                Loading karigars...
              </p>
            )}

            {!karigarLoading && filteredKarigars.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                No karigar found
              </p>
            )}

            {!karigarLoading &&
              filteredKarigars.map((k) => (
                <button
                  key={k._id}
                  onClick={() => handleSelectKarigar(k)}
                  className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-3 py-2 hover:bg-green-50 hover:border-green-300 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {k.name}
                    </p>
                    <p className="text-xs text-gray-500">{k.whatsappNo}</p>
                  </div>
                  <i className="pi pi-whatsapp text-green-600 text-lg" />
                </button>
              ))}
          </div>
        </Dialog>

        <DeliveryDateDialog
          visible={dateDialog.visible}
          title={
            dateDialog.mode === "ship" ? "Ship Order" : "Expected Delivery Date"
          }
          description={
            dateDialog.mode === "ship"
              ? "Set when this order will reach the customer, then it will be marked as Shipped."
              : "Set or change when this order will reach the customer."
          }
          confirmLabel={dateDialog.mode === "ship" ? "Ship Order" : "Save Date"}
          loading={updating}
          initialDate={order.expectedDeliveryDate}
          onHide={() => setDateDialog((d) => ({ ...d, visible: false }))}
          onConfirm={confirmDeliveryDate}
        />

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default OrderDetailsPage;