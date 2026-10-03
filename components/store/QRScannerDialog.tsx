"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { toast } from "react-toastify";

const SCANNER_ID = "store-qr-reader";

// Security: shudhu nijeder domain er /store/... link allow korbo
// (onno kono random/malicious QR scan korle redirect hobe na)
const isAllowedStoreUrl = (text: string) => {
  try {
    const scanned = new URL(text);
    const base = new URL(process.env.NEXT_PUBLIC_API_URL || "");
    return (
      scanned.origin === base.origin && scanned.pathname.startsWith("/store/")
    );
  } catch {
    return false;
  }
};

const ScannerView = ({ onValidScan }: { onValidScan: (url: string) => void }) => {
  const [error, setError] = useState("");
  const handledRef = useRef(false);
  const lastInvalidRef = useRef(0);

  useEffect(() => {
    let scanner: any = null;
    let cancelled = false;
    let started = false;

    const stopScanner = async () => {
      if (!scanner || !started) return;
      started = false;
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        /* already stopped */
      }
    };

    (async () => {
      try {
        // dynamic import: SSR e break korbe na
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        scanner = new Html5Qrcode(SCANNER_ID);

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (handledRef.current) return;

            if (isAllowedStoreUrl(decodedText)) {
              handledRef.current = true;
              onValidScan(decodedText);
            } else if (Date.now() - lastInvalidRef.current > 2500) {
              lastInvalidRef.current = Date.now();
              toast.error("Invalid QR code. Please scan a valid store QR.");
            }
          },
          () => {
            /* per-frame scan failure, ignore */
          },
        );

        started = true;
        if (cancelled) await stopScanner(); // React strict mode / fast close
      } catch (err: any) {
        const msg = String(err?.message || err || "");
        if (/permission|denied|NotAllowed/i.test(msg)) {
          setError("Camera permission denied. Please allow camera access.");
        } else if (/NotFound|no camera/i.test(msg)) {
          setError("No camera found on this device.");
        } else {
          setError("Unable to start the camera.");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onValidScan]);

  return (
    <div>
      <div
        id={SCANNER_ID}
        className="w-full overflow-hidden rounded-xl bg-black"
        style={{ minHeight: 280 }}
      />
      {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
      {!error && (
        <p
          className="text-xs mt-3 text-center"
          style={{ color: "var(--muted)" }}
        >
          Point your camera at a store QR code
        </p>
      )}
    </div>
  );
};

interface QRScannerDialogProps {
  visible: boolean;
  onHide: () => void;
}

const QRScannerDialog = ({ visible, onHide }: QRScannerDialogProps) => {
  const handleValidScan = React.useCallback(
    (url: string) => {
      toast.success("QR scanned successfully");
      onHide();
      // ei redirect e server theke app link / fallback page handle korbe
      window.location.href = url;
    },
    [onHide],
  );

  return (
    <Dialog
      header="Scan Store QR"
      visible={visible}
      style={{ width: "min(92vw, 420px)" }}
      onHide={onHide}
      draggable={false}
    >
      {/* visible hole tobei mount hobe -> camera tokhon-i start, close hole stop */}
      {visible && <ScannerView onValidScan={handleValidScan} />}
    </Dialog>
  );
};

export default QRScannerDialog;