"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import axiosInstance from "@/service/axios.service";
import { formatDate } from "@/helper/DateTime";
import type { OrderRow } from "@/types/order";

const CAN_CREATE_STATUS = ["CONFIRMED", "SHIPPED"];

export default function ShipmentCard({
  order,
  onUpdated,
}: {
  order: OrderRow;
  onUpdated: (order: any) => void;
}) {
  const [loading, setLoading] = useState(false);

  const shipment = order.shipment;
  const isNational = order.deliveryInfo?.mode === "NATIONAL";

  // local order ba courier chara kichu dekhanor nei
  if (!isNational && !shipment) return null;
  // courier shipment hoyni ar order ar shipment korar moto obosthay nei
  if (
    !shipment &&
    (order.status === "DELIVERED" || order.status === "CANCELLED")
  )
    return null;

  const complete = !!(shipment?.awb && shipment?.pickupRequestedAt);
  const canCreate =
    isNational && CAN_CREATE_STATUS.includes(order.status) && !complete;

  const createShipment = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post(
        `/api/delivery/orders/${order._id}/shipment`,
      );
      if (res.data.pickupError) {
        toast.warn(res.data.message || "Pickup request failed, try again");
      } else {
        toast.success(res.data.message || "Courier shipment created");
      }
      onUpdated(res.data.order);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.errors?.[0]?.message ||
          err?.response?.data?.message ||
          "Failed to create courier shipment",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyAwb = async () => {
    if (!shipment?.awb) return;
    try {
      await navigator.clipboard.writeText(shipment.awb);
      toast.success("AWB copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const estCharge = order.deliveryInfo?.shippingCharge;

  return (
    <div className="border border-blue-100 rounded-lg overflow-hidden text-sm">
      <div className="bg-blue-50 px-3 py-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-blue-800">
          <i className="pi pi-send mr-1.5"></i>
          Courier shipment
        </p>
        {shipment?.status && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-blue-700 border border-blue-200">
            {shipment.status.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {shipment?.awb && (
          <div className="space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Courier</span>
              <span className="text-gray-800 font-medium text-right">
                {shipment.courierName || "-"}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-gray-500">AWB</span>
              <span className="flex items-center gap-1.5">
                <span className="text-gray-800 break-all text-right">
                  {shipment.awb}
                </span>
                <button
                  type="button"
                  title="Copy AWB"
                  onClick={copyAwb}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <i className="pi pi-copy text-gray-500 text-xs" />
                </button>
              </span>
            </div>
            {shipment.lastEventAt && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Last update</span>
                <span className="text-gray-800">
                  {formatDate(shipment.lastEventAt)}
                </span>
              </div>
            )}
            {shipment.trackingUrl && (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
              >
                <i className="pi pi-external-link text-[10px]"></i>
                Track shipment
              </a>
            )}
          </div>
        )}

        {shipment && !complete && (
          <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-2">
            <i className="pi pi-info-circle mr-1"></i>
            Shipment is only partly created
            {!shipment.awb ? " (no AWB yet)" : " (pickup not requested yet)"}.
            Press the button to finish it.
          </p>
        )}

        {!shipment && canCreate && (
          <p className="text-xs text-gray-600">
            Book a courier pickup for this order
            {order.deliveryInfo?.courierName
              ? ` with ${order.deliveryInfo.courierName}`
              : ""}
            {estCharge != null
              ? ` (estimated charge ₹${Number(estCharge).toFixed(2)})`
              : ""}
            .
          </p>
        )}

        {!shipment && !canCreate && order.status === "PENDING" && (
          <p className="text-xs text-gray-500">
            Confirm the order first, then you can create a courier shipment.
          </p>
        )}

        {canCreate && (
          <Button
            label={shipment ? "Retry / finish shipment" : "Create courier shipment"}
            icon="pi pi-send"
            size="small"
            loading={loading}
            onClick={createShipment}
          />
        )}
      </div>
    </div>
  );
}