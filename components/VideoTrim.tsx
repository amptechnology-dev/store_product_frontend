"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Slider } from "primereact/slider";
import { Button } from "primereact/button";
import { toast } from "react-toastify";

// backend er GIF_MAX_SECONDS er sathe mil rakho
export const MAX_CLIP_SECONDS = 15;
const MIN_CLIP_SECONDS = 1;

export type Trim = { start: number; end: number };

// File -> trim range. File object er sathe bind thake, alada state lagena
const trimMap = new WeakMap<File, Trim>();

export const getTrim = (file?: File | null): Trim | null =>
  (file && trimMap.get(file)) || null;

const round1 = (n: number) => Math.round(n * 10) / 10;

export const formatTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
};

// FormData e file append kore. Video hole trim info file er naam e mishiye pathai
// ("clip.__trim_12.50_27.50.mp4"), backend seta parse kore clip kete GIF banay.
export const appendMediaFile = (
  formData: FormData,
  field: string,
  file: File,
) => {
  const trim = file.type.startsWith("video/") ? trimMap.get(file) : undefined;
  if (!trim) {
    formData.append(field, file);
    return;
  }

  const dot = file.name.lastIndexOf(".");
  const base =
    (dot > 0 ? file.name.slice(0, dot) : file.name)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50) || "video";
  const ext = dot > 0 ? file.name.slice(dot).toLowerCase() : ".mp4";

  formData.append(
    field,
    file,
    `${base}.__trim_${trim.start.toFixed(2)}_${trim.end.toFixed(2)}${ext}`,
  );
};

const getVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const d = video.duration;
      cleanup();
      if (Number.isFinite(d) && d > 0) resolve(d);
      else reject(new Error("Invalid video duration"));
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Cannot read video"));
    };
    video.src = url;
  });

// ===============================================================
// Trim dialog
// ===============================================================
function TrimDialog({
  file,
  duration,
  onConfirm,
  onCancel,
}: {
  file: File;
  duration: number;
  onConfirm: (trim: Trim) => void;
  onCancel: () => void;
}) {
  const maxT = Math.floor(duration * 10) / 10;

  const [range, setRange] = useState<[number, number]>([
    0,
    Math.min(MAX_CLIP_SECONDS, maxT),
  ]);
  const [url, setUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const rangeRef = useRef(range);

  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

  // StrictMode safe: effect er bhitore create + cleanup
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const applyRange = (nextStart: number, nextEnd: number) => {
    let s = round1(nextStart);
    let e = round1(nextEnd);
    const startMoved = s !== range[0];

    // max 15 second: jei handle tana hoyeche, arek ta shei onujayi soro
    if (e - s > MAX_CLIP_SECONDS) {
      if (startMoved) e = round1(s + MAX_CLIP_SECONDS);
      else s = round1(e - MAX_CLIP_SECONDS);
    }
    // min 1 second
    if (e - s < MIN_CLIP_SECONDS) {
      if (startMoved) s = round1(e - MIN_CLIP_SECONDS);
      else e = round1(s + MIN_CLIP_SECONDS);
    }
    s = Math.max(0, s);
    e = Math.min(maxT, e);
    if (e - s < MIN_CLIP_SECONDS)
      e = Math.min(maxT, round1(s + MIN_CLIP_SECONDS));

    setRange([s, e]);

    const v = videoRef.current;
    if (v) v.currentTime = startMoved ? s : Math.max(s, e - 0.5);
  };

  // selected part e-i loop kore preview
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const [s, e] = rangeRef.current;
    if (v.currentTime >= e || v.currentTime < s - 0.3) v.currentTime = s;
  };

  const playSelection = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = range[0];
    v.play().catch(() => {});
  };

  const markStart = () => {
    const v = videoRef.current;
    if (v) applyRange(v.currentTime, range[1]);
  };

  const markEnd = () => {
    const v = videoRef.current;
    if (v) applyRange(range[0], v.currentTime);
  };

  const length = round1(range[1] - range[0]);

  return (
    <Dialog
      header={`Trim video (max ${MAX_CLIP_SECONDS} seconds)`}
      visible
      onHide={onCancel}
      style={{ width: "min(96vw, 640px)" }}
      modal
      draggable={false}
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-600 break-words">
          <i className="pi pi-video mr-1 text-blue-500"></i>
          <span className="font-semibold">{file.name}</span> · total{" "}
          {formatTime(duration)}
        </p>

        <div className="bg-black rounded-lg overflow-hidden">
          {url && (
            <video
              ref={videoRef}
              src={url}
              controls
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={() => {
                if (videoRef.current) videoRef.current.currentTime = range[0];
              }}
              onTimeUpdate={handleTimeUpdate}
              className="w-full"
              style={{ maxHeight: "50vh", objectFit: "contain" }}
            />
          )}
        </div>

        <div className="px-2 pt-2">
          <Slider
            value={range}
            onChange={(e) => {
              const val = e.value as number | [number, number];
              if (Array.isArray(val)) applyRange(val[0], val[1]);
            }}
            range
            min={0}
            max={maxT}
            step={0.1}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Start: {formatTime(range[0])}</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
            Clip: {length}s / {MAX_CLIP_SECONDS}s
          </span>
          <span className="text-gray-600">End: {formatTime(range[1])}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            icon="pi pi-play"
            label="Play selection"
            size="small"
            outlined
            onClick={playSelection}
          />
          <Button
            type="button"
            icon="pi pi-step-backward"
            label="Set start here"
            size="small"
            outlined
            onClick={markStart}
          />
          <Button
            type="button"
            icon="pi pi-step-forward"
            label="Set end here"
            size="small"
            outlined
            onClick={markEnd}
          />
        </div>

        <p className="text-[11px] text-gray-500">
          Video GIF hoye save hobe (audio thakbe na). GIF 30MB er moddhe rakhte
          resolution auto set hoy (max 1080p): clip jotoi chhoto, resolution
          totoi beshi.
        </p>

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            label="Skip this video"
            icon="pi pi-times"
            outlined
            className="flex-1"
            onClick={onCancel}
          />
          <Button
            type="button"
            label="Use this clip"
            icon="pi pi-check"
            className="flex-1"
            onClick={() => onConfirm({ start: range[0], end: range[1] })}
          />
        </div>
      </div>
    </Dialog>
  );
}

// ===============================================================
// Hook: file pick korar por prepareFiles(files) call koro.
// Video 15s er beshi hole trim dialog khule, user cancel korle oi file bad jay.
// ===============================================================
type Job = {
  id: number;
  file: File;
  duration: number;
  resolve: (trim: Trim | null) => void;
};

export function useVideoTrimmer() {
  const [job, setJob] = useState<Job | null>(null);
  const idRef = useRef(0);

  const prepareFiles = useCallback(async (files: File[]): Promise<File[]> => {
    const ready: File[] = [];

    for (const file of files) {
      if (!file.type.startsWith("video/")) {
        ready.push(file);
        continue;
      }

      let duration: number;
      try {
        duration = await getVideoDuration(file);
      } catch {
        // browser decode korte pare na (jemon HEVC .mov): trim chhara-i pathai,
        // backend prothom 15 second nibe
        toast.warning(
          `"${file.name}" browser e preview kora gelo na, tai prothom ${MAX_CLIP_SECONDS} second use hobe. Trim korte chaile MP4 e convert kore nao.`,
        );
        ready.push(file);
        continue;
      }

      // 15s ba tar kom: trim lagbe na
      if (duration <= MAX_CLIP_SECONDS + 0.05) {
        trimMap.set(file, {
          start: 0,
          end: Number(Math.min(duration, MAX_CLIP_SECONDS).toFixed(2)),
        });
        ready.push(file);
        continue;
      }

      const trim = await new Promise<Trim | null>((resolve) => {
        idRef.current += 1;
        setJob({ id: idRef.current, file, duration, resolve });
      });
      setJob(null);

      if (trim) {
        trimMap.set(file, trim);
        ready.push(file);
      }
    }

    return ready;
  }, []);

  const trimDialog = job ? (
    <TrimDialog
      key={job.id}
      file={job.file}
      duration={job.duration}
      onConfirm={(trim) => job.resolve(trim)}
      onCancel={() => job.resolve(null)}
    />
  ) : null;

  return { prepareFiles, trimDialog };
}