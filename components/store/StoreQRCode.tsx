"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

interface StoreQRCodeProps {
  storeId: string;
  url: string;
  qrImageUrl?: string;
  storeName?: string;
  size?: number;
  onGenerated?: (qrCodeUrl: string) => void;
}

const StoreQRCode = ({
  storeId,
  url,
  qrImageUrl,
  storeName,
  size = 160,
  onGenerated,
}: StoreQRCodeProps) => {
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  const triedRef = useRef(false);

  const fileName = `${(storeName || "store").replace(/\s+/g, "-")}-qr.jpg`;
  const shareText = `Scan this QR or open the link to visit ${
    storeName || "our store"
  }: ${url}`;

  const generateQr = useCallback(async () => {
    try {
      setGenerating(true);
      setFailed(false);
      const res = await axiosInstance.post(
        `/api/register/generate-store-qr/${storeId}`,
      );
      if (res.data?.qrCodeUrl) onGenerated?.(res.data.qrCodeUrl);
    } catch {
      setFailed(true);
      toast.error("Failed to generate QR code");
    } finally {
      setGenerating(false);
    }
  }, [storeId, onGenerated]);

  // QR na thakle (purono store) automatic generate
  useEffect(() => {
    if (qrImageUrl || !storeId || triedRef.current) return;
    triedRef.current = true;
    generateQr();
  }, [qrImageUrl, storeId, generateQr]);

  // CDN theke image ta blob + dataUrl hishebe nibe (R2 CORS e GET allow thakte hobe)
  const fetchQrImage = async (): Promise<{
    blob: Blob;
    dataUrl: string;
  } | null> => {
    if (!qrImageUrl) return null;
    try {
      const res = await fetch(qrImageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { blob, dataUrl };
    } catch {
      return null;
    }
  };

  const downloadBlob = (blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const copyImageModern = async (blob: Blob) => {
    try {
      if (
        typeof ClipboardItem === "undefined" ||
        !navigator.clipboard?.write ||
        !window.isSecureContext
      ) {
        return false;
      }
      // ClipboardItem shudhu image/png support kore, JPG hole eta fail hoye legacy te jabe
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      return true;
    } catch {
      return false;
    }
  };

  const copyImageLegacy = (dataUrl: string) =>
    new Promise<boolean>((resolve) => {
      const img = new Image();

      img.onload = () => {
        const wrapper = document.createElement("div");
        wrapper.contentEditable = "true";
        wrapper.style.position = "fixed";
        wrapper.style.left = "-9999px";
        wrapper.style.top = "0";
        wrapper.style.opacity = "0";
        wrapper.appendChild(img);
        document.body.appendChild(wrapper);

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNode(img);
        selection?.removeAllRanges();
        selection?.addRange(range);

        let ok = false;
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }

        selection?.removeAllRanges();
        document.body.removeChild(wrapper);
        resolve(ok);
      };

      img.onerror = () => resolve(false);
      img.src = dataUrl;
    });

  const handleDownload = async () => {
    const result = await fetchQrImage();
    if (!result) {
      // CORS issue hole at least image ta new tab e khulbe
      if (qrImageUrl) window.open(qrImageUrl, "_blank", "noopener,noreferrer");
      return;
    }
    downloadBlob(result.blob);
  };

  const handleShareOnWhatsApp = async () => {
    const result = await fetchQrImage();
    if (!result) {
      toast.error("Failed to load QR image");
      return;
    }
    const { blob, dataUrl } = result;

    const file = new File([blob], fileName, { type: "image/jpeg" });

    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: storeName || "Store",
          text: shareText,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    let copied = await copyImageModern(blob);
    if (!copied) copied = await copyImageLegacy(dataUrl);

    downloadBlob(blob);

    toast.info(
      copied
        ? "QR image copied! WhatsApp chat e Ctrl+V diye paste koro, tarpor Send."
        : "QR image downloaded. WhatsApp chat e 📎 diye attach koro.",
      { autoClose: 8000 },
    );

    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="bg-white p-2 rounded-xl border flex items-center justify-center"
        style={{ borderColor: "var(--border)", width: size + 16, minHeight: size + 16 }}
      >
        {qrImageUrl ? (
          <img
            src={qrImageUrl}
            alt={`${storeName || "Store"} QR code`}
            style={{ width: size, height: "auto" }}
          />
        ) : generating ? (
          <i
            className="pi pi-spin pi-spinner text-2xl"
            style={{ color: "var(--brand-blue)" }}
          ></i>
        ) : (
          <Button
            icon="pi pi-refresh"
            label={failed ? "Retry" : "Generate"}
            onClick={generateQr}
            className="text-xs"
            text
          />
        )}
      </div>

      <div className="flex gap-2">
        <Button
          icon="pi pi-download"
          label="Download"
          onClick={handleDownload}
          disabled={!qrImageUrl}
          className="text-xs"
          style={{
            background: "var(--brand-primary)",
            color: "#fff",
            border: "1px solid var(--brand-primary-dark)",
            padding: "6px 12px",
          }}
        />
        <Button
          icon="pi pi-whatsapp"
          label="Share"
          onClick={handleShareOnWhatsApp}
          disabled={!qrImageUrl}
          className="text-xs"
          style={{
            background: "#25D366",
            color: "#fff",
            border: "1px solid #1ebe57",
            padding: "6px 12px",
          }}
        />
      </div>
    </div>
  );
};

export default StoreQRCode;