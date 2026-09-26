"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useForm,
  Controller,
  useFieldArray,
  useWatch,
  Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import {
  createProductSchema,
  updateProductSchema,
} from "@/helper/schema/Schema";

type ProductFormData = z.infer<typeof createProductSchema>;

type ProductFormProps = {
  productId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

const UNIT_OPTIONS = [
  { label: "Pieces (PCS)", value: "PCS" },
  { label: "Kilogram (KG)", value: "KG" },
  { label: "Gram (GM)", value: "GM" },
  { label: "Litre (LTR)", value: "LTR" },
  { label: "Millilitre (ML)", value: "ML" },
  { label: "Box", value: "BOX" },
  { label: "Dozen", value: "DOZEN" },
  { label: "Pack", value: "PACK" },
];

const isValidObjectId = (id?: string | null) =>
  !!id && /^[a-fA-F0-9]{24}$/.test(id);

const genUiKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

type PackagingDetails = {
  expectedDeliveryDays?: number;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
};

const buildEmptySizeVariant = () => ({
  size: "",
  weight: "",
  height: "",
  mrp: undefined as number | undefined,
  offerPrice: undefined as number | undefined,
  openingStock: 0,
  sku: "",
  packagingDetails: {} as PackagingDetails,
});

const buildEmptyColorVariant = () => ({
  _uiKey: genUiKey(),
  color: "",
  mrp: undefined as number | undefined,
  offerPrice: undefined as number | undefined,
  openingStock: 0,
  sku: "",
  packagingDetails: {} as PackagingDetails,
  sizeVariants: [] as ReturnType<typeof buildEmptySizeVariant>[],
});

type FacingMode = "user" | "environment";

type ImageState = {
  existing: string[];
  files: File[];
  previews: string[];
};

// ===============================================================
// Reusable: collapsible Packaging Details block
// ===============================================================
function PackagingFieldsBlock({
  control,
  basePath,
}: {
  control: Control<any>;
  basePath: string;
}) {
  const packagingValue = useWatch({ control, name: basePath as any });

  const hasExistingValue = (val: any) =>
    !!val &&
    Object.values(val).some((v) => v !== undefined && v !== null && v !== "");

  const [open, setOpen] = useState(() => hasExistingValue(packagingValue));

  useEffect(() => {
    if (hasExistingValue(packagingValue)) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packagingValue]);

  const fieldsMeta: { name: string; label: string }[] = [
    { name: "expectedDeliveryDays", label: "Delivery Days" },
    { name: "length", label: "Length (cm)" },
    { name: "breadth", label: "Breadth (cm)" },
    { name: "height", label: "Height (cm)" },
    { name: "weight", label: "Weight (kg)" },
  ];

  return (
    <div className="mt-1.5 border border-dashed border-blue-200 rounded-lg bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-blue-700"
      >
        <span className="flex items-center gap-1.5">
          <i className="pi pi-inbox text-blue-500"></i>
          Packaging Details
        </span>
        <i
          className={`pi ${open ? "pi-chevron-up" : "pi-chevron-down"} text-[10px]`}
        ></i>
      </button>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2 pt-0">
          {fieldsMeta.map((f) => (
            <div key={f.name} className="space-y-1 min-w-0">
              <label className="text-[10px] font-medium text-gray-500">
                {f.label}
              </label>
              <Controller
                name={`${basePath}.${f.name}` as any}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value ?? null}
                    onValueChange={(e) => field.onChange(e.value)}
                    className="w-full"
                    inputClassName="w-full text-xs p-1.5"
                    min={0}
                    useGrouping={false}
                  />
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===============================================================
// Reusable: single Size/Weight/Height row
// ===============================================================
function SizeVariantRow({
  control,
  register,
  basePath,
  onRemove,
  canRemove,
  showRemove,
}: {
  control: Control<any>;
  register: any;
  basePath: string;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  showRemove: boolean;
}) {
  return (
    <div className="border border-blue-100 rounded-lg p-2 bg-blue-50/40 relative">
      {showRemove && canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 text-red-500 hover:text-red-700 text-[11px] flex items-center gap-1"
        >
          <i className="pi pi-times-circle"></i>
        </button>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="space-y-1 min-w-0">
          <label className="text-[10px] font-semibold text-gray-600">
            Size
          </label>
          <InputText
            className="w-full p-inputtext-sm"
            {...register(`${basePath}.size`)}
            placeholder="e.g. Large"
          />
        </div>
        <div className="space-y-1 min-w-0">
          <label className="text-[10px] font-semibold text-gray-600">
            Weight
          </label>
          <InputText
            className="w-full p-inputtext-sm"
            {...register(`${basePath}.weight`)}
            placeholder="e.g. 40kg"
          />
        </div>
        <div className="space-y-1 min-w-0">
          <label className="text-[10px] font-semibold text-gray-600">
            Height
          </label>
          <InputText
            className="w-full p-inputtext-sm"
            {...register(`${basePath}.height`)}
            placeholder="e.g. 6ft"
          />
        </div>
        <div className="space-y-1 min-w-0">
          <label className="text-[10px] font-semibold text-gray-600">
            MRP <span className="text-red-500">*</span>
          </label>
          <Controller
            name={`${basePath}.mrp` as any}
            control={control}
            render={({ field }) => (
              <InputNumber
                value={field.value ?? null}
                onValueChange={(e) => field.onChange(e.value)}
                className="w-full"
                inputClassName="w-full p-inputtext-sm"
                min={0}
                mode="decimal"
                minFractionDigits={2}
                maxFractionDigits={2}
                useGrouping={false}
              />
            )}
          />
        </div>
        <div className="space-y-1 min-w-0">
          <label className="text-[10px] font-semibold text-gray-600">
            Offer Price <span className="text-red-500">*</span>
          </label>
          <Controller
            name={`${basePath}.offerPrice` as any}
            control={control}
            render={({ field }) => (
              <InputNumber
                value={field.value ?? null}
                onValueChange={(e) => field.onChange(e.value)}
                className="w-full"
                inputClassName="w-full p-inputtext-sm"
                min={0}
                mode="decimal"
                minFractionDigits={2}
                maxFractionDigits={2}
                useGrouping={false}
              />
            )}
          />
        </div>
        <div className="space-y-1 min-w-0">
          <label className="text-[10px] font-semibold text-gray-600">
            Opening Stock
          </label>
          <Controller
            name={`${basePath}.openingStock` as any}
            control={control}
            render={({ field }) => (
              <InputNumber
                value={field.value ?? 0}
                onValueChange={(e) => field.onChange(e.value)}
                className="w-full"
                inputClassName="w-full p-inputtext-sm"
                min={0}
                useGrouping={false}
              />
            )}
          />
        </div>
        <div className="space-y-1 min-w-0 col-span-2 sm:col-span-1">
          <label className="text-[10px] font-semibold text-gray-600">SKU</label>
          <InputText
            className="w-full p-inputtext-sm"
            {...register(`${basePath}.sku`)}
            placeholder="Optional"
          />
        </div>
      </div>
      <PackagingFieldsBlock
        control={control}
        basePath={`${basePath}.packagingDetails`}
      />
    </div>
  );
}

// ===============================================================
// Reusable: one Color block, with its own nested sizeVariants field-array
// ===============================================================
function ColorVariantBlock({
  control,
  register,
  colorIndex,
  onRemoveColor,
  canRemoveColor,
  imgState,
  onAddImages,
  onRemoveImage,
  onOpenCamera,
}: {
  control: Control<any>;
  register: any;
  colorIndex: number;
  onRemoveColor: () => void;
  canRemoveColor: boolean;
  imgState: ImageState;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (index: number, isExisting: boolean) => void;
  onOpenCamera: () => void;
}) {
  const {
    fields: sizeFields,
    append: appendSize,
    remove: removeSize,
  } = useFieldArray({ control, name: `variants.${colorIndex}.sizeVariants` });

  const sizeMode = sizeFields.length > 0;

  const enableSizeMode = () => appendSize(buildEmptySizeVariant());
  const disableSizeMode = () => {
    for (let i = sizeFields.length - 1; i >= 0; i--) removeSize(i);
  };

  return (
    <div className="border border-blue-100 rounded-xl p-2.5 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <i className="pi pi-palette text-blue-500"></i>
          <InputText
            className="w-full max-w-[220px] p-inputtext-sm font-semibold"
            {...register(`variants.${colorIndex}.color`)}
            placeholder="Color name e.g. Red"
          />
        </div>
        {canRemoveColor && (
          <button
            type="button"
            onClick={onRemoveColor}
            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 shrink-0"
          >
            <i className="pi pi-trash"></i> Remove
          </button>
        )}
      </div>

      {/* Color images */}
      <div className="space-y-1.5 mb-2.5">
        <label className="text-[11px] font-semibold text-gray-600">
          Color Images
        </label>
        <div className="flex gap-2 flex-wrap">
          {imgState.existing.map((url, i) => (
            <div
              key={`ex-${i}`}
              className="relative w-14 h-14 rounded-lg overflow-hidden border"
            >
              <img src={url} className="w-full h-full object-cover" alt="" />
              <button
                type="button"
                onClick={() => onRemoveImage(i, true)}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          {imgState.previews.map((src, i) => (
            <div
              key={`new-${i}`}
              className="relative w-14 h-14 rounded-lg overflow-hidden border"
            >
              <img src={src} className="w-full h-full object-cover" alt="" />
              <button
                type="button"
                onClick={() => onRemoveImage(i, false)}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (!e.target.files) return;
              onAddImages(Array.from(e.target.files));
              e.target.value = "";
            }}
            className="text-xs flex-1 min-w-0"
          />
          <Button
            type="button"
            icon="pi pi-camera"
            outlined
            size="small"
            onClick={onOpenCamera}
          />
        </div>
      </div>

      {/* Size mode toggle */}
      <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-2.5 py-1.5 mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-700">
            Has Size / Weight / Height options?
          </p>
          <p className="text-[10px] text-gray-500">
            e.g. this color comes in Small, Large, XL separately
          </p>
        </div>
        <InputSwitch
          checked={sizeMode}
          onChange={(e) => (e.value ? enableSizeMode() : disableSizeMode())}
        />
      </div>

      {!sizeMode ? (
        <div className="border border-blue-100 rounded-lg p-2 bg-blue-50/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1 min-w-0">
              <label className="text-[10px] font-semibold text-gray-600">
                MRP <span className="text-red-500">*</span>
              </label>
              <Controller
                name={`variants.${colorIndex}.mrp` as any}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value ?? null}
                    onValueChange={(e) => field.onChange(e.value)}
                    className="w-full"
                    inputClassName="w-full p-inputtext-sm"
                    min={0}
                    mode="decimal"
                    minFractionDigits={2}
                    maxFractionDigits={2}
                    useGrouping={false}
                  />
                )}
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[10px] font-semibold text-gray-600">
                Offer Price <span className="text-red-500">*</span>
              </label>
              <Controller
                name={`variants.${colorIndex}.offerPrice` as any}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value ?? null}
                    onValueChange={(e) => field.onChange(e.value)}
                    className="w-full"
                    inputClassName="w-full p-inputtext-sm"
                    min={0}
                    mode="decimal"
                    minFractionDigits={2}
                    maxFractionDigits={2}
                    useGrouping={false}
                  />
                )}
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[10px] font-semibold text-gray-600">
                Opening Stock
              </label>
              <Controller
                name={`variants.${colorIndex}.openingStock` as any}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value ?? 0}
                    onValueChange={(e) => field.onChange(e.value)}
                    className="w-full"
                    inputClassName="w-full p-inputtext-sm"
                    min={0}
                    useGrouping={false}
                  />
                )}
              />
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[10px] font-semibold text-gray-600">
                SKU
              </label>
              <InputText
                className="w-full p-inputtext-sm"
                {...register(`variants.${colorIndex}.sku`)}
                placeholder="Optional"
              />
            </div>
          </div>
          <PackagingFieldsBlock
            control={control}
            basePath={`variants.${colorIndex}.packagingDetails`}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {sizeFields.map((sf, si) => (
            <SizeVariantRow
              key={sf.id}
              control={control}
              register={register}
              basePath={`variants.${colorIndex}.sizeVariants.${si}`}
              index={si}
              onRemove={() => removeSize(si)}
              canRemove={sizeFields.length > 1}
              showRemove
            />
          ))}
          <Button
            type="button"
            label="Add Size Option"
            icon="pi pi-plus"
            size="small"
            outlined
            onClick={() => appendSize(buildEmptySizeVariant())}
          />
        </div>
      )}
    </div>
  );
}

// ===============================================================
// MAIN FORM
// ===============================================================
function ProductFrom({ productId, onClose, onSuccess }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productCode, setProductCode] = useState<string>("");
  const [currentStockInfo, setCurrentStockInfo] = useState<number | null>(null);
  const isEditMode = !!productId;

  const [hasVariants, setHasVariants] = useState(false);
  const [hasColor, setHasColor] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(
      (isEditMode ? updateProductSchema : createProductSchema) as any,
    ),
    defaultValues: {
      name: "",
      description: "",
      unit: "",
      storeId: undefined,
      categoryId: undefined,
      mrp: undefined,
      offerPrice: undefined,
      openingStock: 0,
      packagingDetails: {},
      variants: [],
    },
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    replace: replaceVariants,
  } = useFieldArray({ control, name: "variants" });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [colorImages, setColorImages] = useState<Record<string, ImageState>>(
    {},
  );

  // Store is kept internally (needed to fetch categories + submit) but never rendered.
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraOpenRef = useRef(false);
  const previewsRef = useRef<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const cameraTargetRef = useRef<string | null>(null);

  const selectedStoreId = watch("storeId");

  const getUiKey = (field: any): string => field?._uiKey || field?.id;

  const addImageFiles = (files: File[]) => {
    if (!files.length) return;
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addImageFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeImage = (index: number, isExisting = false) => {
    if (isExisting) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      const url = imagePreviews[index];
      if (url) URL.revokeObjectURL(url);
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const clearNewImages = () => {
    imagePreviews.forEach((u) => URL.revokeObjectURL(u));
    setImageFiles([]);
    setImagePreviews([]);
  };

  const getColorImageState = (uiKey: string): ImageState =>
    colorImages[uiKey] || { existing: [], files: [], previews: [] };

  const addColorImageFiles = (uiKey: string, files: File[]) => {
    if (!files.length) return;
    setColorImages((prev) => {
      const cur = prev[uiKey] || { existing: [], files: [], previews: [] };
      return {
        ...prev,
        [uiKey]: {
          ...cur,
          files: [...cur.files, ...files],
          previews: [
            ...cur.previews,
            ...files.map((f) => URL.createObjectURL(f)),
          ],
        },
      };
    });
  };

  const removeColorImage = (
    uiKey: string,
    index: number,
    isExisting: boolean,
  ) => {
    setColorImages((prev) => {
      const cur = prev[uiKey] || { existing: [], files: [], previews: [] };
      if (isExisting) {
        return {
          ...prev,
          [uiKey]: {
            ...cur,
            existing: cur.existing.filter((_, i) => i !== index),
          },
        };
      }
      const url = cur.previews[index];
      if (url) URL.revokeObjectURL(url);
      return {
        ...prev,
        [uiKey]: {
          ...cur,
          files: cur.files.filter((_, i) => i !== index),
          previews: cur.previews.filter((_, i) => i !== index),
        },
      };
    });
  };

  const handleAddVariant = () => {
    appendVariant(
      (hasColor ? buildEmptyColorVariant() : buildEmptySizeVariant()) as any,
    );
  };

  const handleRemoveVariant = (index: number, uiKey: string) => {
    removeVariant(index);
    setColorImages((prev) => {
      const cur = prev[uiKey];
      if (cur) cur.previews.forEach((u) => URL.revokeObjectURL(u));
      const next = { ...prev };
      delete next[uiKey];
      return next;
    });
  };

  const toggleHasVariants = (value: boolean) => {
    setHasVariants(value);
    if (value) {
      if (variantFields.length === 0) {
        appendVariant(
          (hasColor
            ? buildEmptyColorVariant()
            : buildEmptySizeVariant()) as any,
        );
      }
    } else {
      replaceVariants([]);
      setColorImages({});
      setHasColor(false);
    }
  };

  const toggleHasColor = (value: boolean) => {
    setHasColor(value);
    replaceVariants([
      (value ? buildEmptyColorVariant() : buildEmptySizeVariant()) as any,
    ]);
    setColorImages({});
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(
    async (mode: FacingMode) => {
      stopCamera();
      setCameraError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera is not supported in this browser, or the page is not served over HTTPS.",
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!cameraOpenRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setHasMultipleCameras(
            devices.filter((d) => d.kind === "videoinput").length > 1,
          );
        } catch {
          setHasMultipleCameras(false);
        }
      } catch (err: any) {
        switch (err?.name) {
          case "NotAllowedError":
          case "SecurityError":
            setCameraError(
              "Camera permission denied. Allow camera access in your browser settings and try again.",
            );
            break;
          case "NotFoundError":
          case "OverconstrainedError":
            setCameraError("No camera found on this device.");
            break;
          case "NotReadableError":
            setCameraError(
              "Camera is being used by another app. Close it and try again.",
            );
            break;
          default:
            setCameraError("Unable to access the camera.");
        }
      }
    },
    [stopCamera],
  );

  const openCamera = (targetUiKey: string | null = null) => {
    cameraOpenRef.current = true;
    cameraTargetRef.current = targetUiKey;
    setCapturedCount(0);
    setCameraError("");
    setCameraOpen(true);
  };

  const closeCamera = () => {
    cameraOpenRef.current = false;
    stopCamera();
    setCameraOpen(false);
  };

  const switchCamera = () => {
    const next: FacingMode =
      facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture photo");
          return;
        }
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        if (cameraTargetRef.current) {
          addColorImageFiles(cameraTargetRef.current, [file]);
        } else {
          addImageFiles([file]);
        }
        setCapturedCount((c) => c + 1);
      },
      "image/jpeg",
      0.9,
    );
  };

  useEffect(() => {
    previewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      cameraOpenRef.current = false;
      stopCamera();
      previewsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [stopCamera]);

  useEffect(() => {
    fetchStores();
    if (productId) fetchProductData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (isValidObjectId(selectedStoreId)) {
      fetchCategories(selectedStoreId as string);
    } else {
      setCategories([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/product/single-product/${productId}`,
      );
      const product = res.data.product;

      setValue("name", product.name);
      setValue("description", product.description || "");
      setValue("unit", product.unit || "");
      setValue("packagingDetails", product.packagingDetails || {});

      const rawVariants: any[] = Array.isArray(product.variants)
        ? product.variants
        : [];
      const productHasColor = rawVariants.some((v) => v && v.color);
      const productHasVariants = rawVariants.length > 0;

      setHasVariants(productHasVariants);
      setHasColor(productHasColor);

      if (!productHasVariants) {
        setValue("mrp", product.mrp ?? 0);
        setValue("offerPrice", product.offerPrice ?? 0);
        setValue("openingStock", product.openingStock ?? 0);
        setCurrentStockInfo(product.currentStock ?? null);
        replaceVariants([]);
      } else if (productHasColor) {
        const uiKeys = rawVariants.map(() => genUiKey());

        replaceVariants(
          rawVariants.map((v: any, idx: number) => ({
            _uiKey: uiKeys[idx],
            color: v.color || "",
            mrp: v.mrp,
            offerPrice: v.offerPrice,
            openingStock: v.openingStock ?? 0,
            sku: v.sku || "",
            packagingDetails: v.packagingDetails || {},
            sizeVariants: Array.isArray(v.sizeVariants)
              ? v.sizeVariants.map((sv: any) => ({
                  size: sv.size || "",
                  weight: sv.weight || "",
                  height: sv.height || "",
                  mrp: sv.mrp,
                  offerPrice: sv.offerPrice,
                  openingStock: sv.openingStock ?? 0,
                  sku: sv.sku || "",
                  packagingDetails: sv.packagingDetails || {},
                }))
              : [],
          })) as any,
        );

        setColorImages(() => {
          const next: Record<string, ImageState> = {};
          rawVariants.forEach((v: any, idx: number) => {
            next[uiKeys[idx]] = {
              existing: Array.isArray(v.images) ? v.images : [],
              files: [],
              previews: [],
            };
          });
          return next;
        });
      } else {
        replaceVariants(
          rawVariants.map((v: any) => ({
            size: v.size || "",
            weight: v.weight || "",
            height: v.height || "",
            mrp: v.mrp,
            offerPrice: v.offerPrice,
            openingStock: v.openingStock ?? 0,
            sku: v.sku || "",
            packagingDetails: v.packagingDetails || {},
          })),
        );
      }

      setProductCode(product.productCode || "");
      if (Array.isArray(product.images)) setExistingImages(product.images);

      const storeId =
        typeof product.storeId === "object"
          ? product.storeId?._id
          : product.storeId;
      if (storeId) setValue("storeId", storeId);

      const categoryId =
        typeof product.categoryId === "object"
          ? product.categoryId?._id
          : product.categoryId;
      if (categoryId) setValue("categoryId", categoryId);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to fetch product data",
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axiosInstance.get("/api/register/user-based-stores");
      const list = res.data?.stores || [];
      setStores(list);
      // ---------- FIX: store dropdown ekhon UI-te dekhano hoy na, tai create mode-e
      // prothom store-take always auto-select kore deoya hocche ----------
      if (list.length > 0 && !isEditMode) setValue("storeId", list[0]._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch stores");
    }
  };

  const fetchCategories = async (storeId: string) => {
    try {
      setCategoriesLoading(true);
      const res = await axiosInstance.get("/api/category", {
        params: { storeId },
      });
      setCategories(res.data?.categories || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch categories");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validateForm = (data: ProductFormData): string | null => {
    if (!hasVariants) {
      if (data.mrp === undefined || data.mrp === null) return "MRP is required";
      if (data.offerPrice === undefined || data.offerPrice === null)
        return "Offer price is required";
      if (Number(data.offerPrice) > Number(data.mrp))
        return "Offer price cannot be greater than MRP";
      return null;
    }

    const variants = (data.variants || []) as any[];
    if (!variants.length) return "At least one variant is required";

    if (hasColor) {
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (!v.color) return `Color ${i + 1}: color name is required`;
        if (Array.isArray(v.sizeVariants) && v.sizeVariants.length > 0) {
          for (let j = 0; j < v.sizeVariants.length; j++) {
            const sv = v.sizeVariants[j];
            if (sv.mrp === undefined || sv.offerPrice === undefined)
              return `Color ${i + 1} - Size ${j + 1}: MRP and Offer price are required`;
            if (Number(sv.offerPrice) > Number(sv.mrp))
              return `Color ${i + 1} - Size ${j + 1}: Offer price cannot be greater than MRP`;
          }
        } else {
          if (v.mrp === undefined || v.offerPrice === undefined)
            return `Color ${i + 1}: MRP and Offer price are required`;
          if (Number(v.offerPrice) > Number(v.mrp))
            return `Color ${i + 1}: Offer price cannot be greater than MRP`;
        }
      }
    } else {
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (v.mrp === undefined || v.offerPrice === undefined)
          return `Variant ${i + 1}: MRP and Offer price are required`;
        if (Number(v.offerPrice) > Number(v.mrp))
          return `Variant ${i + 1}: Offer price cannot be greater than MRP`;
      }
    }
    return null;
  };

  const isEmptySizeVariant = (v: any) => {
    const hasText = v.size || v.weight || v.height || v.sku;
    const hasPricing =
      v.mrp !== undefined &&
      v.mrp !== null &&
      v.offerPrice !== undefined &&
      v.offerPrice !== null;
    return !hasText && !hasPricing;
  };

  const onSubmit = async (data: ProductFormData) => {
    const validationError = validateForm(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `/api/product/update-product/${productId}`
        : `/api/product/create-product`;

      const formData = new FormData();
      formData.append("name", data.name || "");
      formData.append("description", data.description || "");
      formData.append("unit", data.unit || "");

      if (!isEditMode && data.storeId)
        formData.append("storeId", String(data.storeId));
      if (data.categoryId)
        formData.append("categoryId", String(data.categoryId));

      existingImages.forEach((url) => formData.append("images", url));
      imageFiles.forEach((file, idx) => formData.append(`image${idx}`, file));

      if (!hasVariants) {
        formData.append("mrp", String(data.mrp ?? 0));
        formData.append("offerPrice", String(data.offerPrice ?? 0));
        formData.append("openingStock", String(data.openingStock ?? 0));
        formData.append(
          "packagingDetails",
          JSON.stringify(data.packagingDetails || {}),
        );
        formData.append("variants", JSON.stringify([]));
      } else {
        const variants = (data.variants || []) as any[];

        const variantsPayload = variants.map((v, idx) => {
          const uiKey = getUiKey(variantFields[idx]);
          const imgState = uiKey
            ? getColorImageState(uiKey)
            : { existing: [] as string[] };

          if (hasColor) {
            const cleanSizeVariants = Array.isArray(v.sizeVariants)
              ? v.sizeVariants.filter((sv: any) => !isEmptySizeVariant(sv))
              : [];

            return {
              color: v.color || undefined,
              images: imgState.existing,
              packagingDetails: v.packagingDetails || {},
              ...(cleanSizeVariants.length > 0
                ? {
                    sizeVariants: cleanSizeVariants.map((sv: any) => ({
                      size: sv.size || undefined,
                      weight: sv.weight || undefined,
                      height: sv.height || undefined,
                      mrp: sv.mrp,
                      offerPrice: sv.offerPrice,
                      openingStock: sv.openingStock ?? 0,
                      sku: sv.sku || undefined,
                      packagingDetails: sv.packagingDetails || {},
                    })),
                  }
                : {
                    mrp: v.mrp,
                    offerPrice: v.offerPrice,
                    openingStock: v.openingStock ?? 0,
                    sku: v.sku || undefined,
                  }),
            };
          }

          return {
            size: v.size || undefined,
            weight: v.weight || undefined,
            height: v.height || undefined,
            mrp: v.mrp,
            offerPrice: v.offerPrice,
            openingStock: v.openingStock ?? 0,
            sku: v.sku || undefined,
            packagingDetails: v.packagingDetails || {},
          };
        });

        formData.append("variants", JSON.stringify(variantsPayload));

        if (hasColor) {
          variants.forEach((_, idx) => {
            const uiKey = getUiKey(variantFields[idx]);
            const imgState = uiKey
              ? getColorImageState(uiKey)
              : { files: [] as File[] };
            imgState.files.forEach((file) =>
              formData.append(`variantImage_${idx}`, file),
            );
          });
        }
      }

      const res = await axiosInstance.request({
        url,
        method: isEditMode ? "put" : "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        res.data.message ||
          `Product ${isEditMode ? "updated" : "created"} successfully!`,
      );
      reset();
      clearNewImages();
      setExistingImages([]);
      setColorImages({});
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} product`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-3 min-h-[80vh]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {isEditMode && productCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-2 flex-wrap">
            <i className="pi pi-hashtag text-blue-500"></i>
            <span className="text-sm text-gray-600">Product Code:</span>
            <span className="text-sm font-semibold text-gray-800">
              {productCode}
            </span>
            {currentStockInfo !== null && !hasVariants && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                Current Stock: {currentStockInfo}
              </span>
            )}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-box text-blue-600"></i>
            Basic Information
          </h3>

          {/* Category first, then Product Name, then Unit — Store is intentionally hidden */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={categories.map((c) => ({
                      label: c.name,
                      value: c._id,
                    }))}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={
                      !isValidObjectId(selectedStoreId)
                        ? "Loading..."
                        : categoriesLoading
                          ? "Loading categories..."
                          : categories.length === 0
                            ? "No categories found"
                            : "Select category"
                    }
                    className="w-full border-blue-200"
                    disabled={
                      !isValidObjectId(selectedStoreId) || categoriesLoading
                    }
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
              {errors.categoryId && (
                <small className="text-red-500">
                  {errors.categoryId.message as string}
                </small>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <InputText
                className="w-full"
                {...register("name")}
                placeholder="Enter product name"
              />
              {errors.name && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.name.message}
                </small>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Unit <span className="text-red-500">*</span>
              </label>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={UNIT_OPTIONS}
                    placeholder="Select unit"
                    className="w-full"
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
              {errors.unit && (
                <small className="text-red-500">{errors.unit.message}</small>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <InputTextarea
              className="w-full"
              rows={2}
              {...register("description")}
              placeholder="Product description"
            />
            {errors.description && (
              <small className="text-red-500">
                {errors.description.message}
              </small>
            )}
          </div>
        </div>

        {/* Main Product Images */}
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image text-blue-600"></i>
            Product Images
          </h4>

          {(existingImages.length > 0 || imagePreviews.length > 0) && (
            <div className="flex gap-2 flex-wrap">
              {existingImages.map((url, idx) => (
                <div
                  key={`ex-${idx}`}
                  className="relative w-32 h-24 rounded overflow-hidden border"
                >
                  <img
                    src={url}
                    alt={`img-${idx}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx, true)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              {imagePreviews.map((src, idx) => (
                <div
                  key={`new-${idx}`}
                  className="relative w-32 h-24 rounded overflow-hidden border"
                >
                  <img
                    src={src}
                    alt={`preview-${idx}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx, false)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="file"
              multiple
              onChange={handleImageChange}
              className="flex-1 min-w-0 p-1.5 border border-blue-200 rounded-lg"
              accept="image/*"
            />
            <Button
              type="button"
              label="Take Photo"
              icon="pi pi-camera"
              onClick={() => openCamera(null)}
              outlined
              className="shrink-0"
            />
          </div>
        </div>

        {/* VARIANT MODE TOGGLES */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                This product has variants
              </p>
              <p className="text-xs text-gray-500">
                Turn on if this product needs Size / Weight / Height / Color
                options
              </p>
            </div>
            <InputSwitch
              checked={hasVariants}
              onChange={(e) => toggleHasVariants(e.value)}
            />
          </div>

          {hasVariants && (
            <div className="flex items-center justify-between border-t border-blue-200 pt-2.5">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Use Color as base variant
                </p>
                <p className="text-xs text-gray-500">
                  Off = plain Size/Weight/Height variants. On = group by color,
                  each color can have its own sizes.
                </p>
              </div>
              <InputSwitch
                checked={hasColor}
                onChange={(e) => toggleHasColor(e.value)}
              />
            </div>
          )}
        </div>

        {/* SIMPLE MODE PRICING */}
        {!hasVariants && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-blue-600 text-base">₹</span>
              Pricing &amp; Stock
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  MRP <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="mrp"
                  control={control}
                  render={({ field: f }) => (
                    <InputNumber
                      value={f.value ?? null}
                      onValueChange={(e) => f.onChange(e.value)}
                      placeholder="MRP"
                      min={0}
                      className="w-full"
                      inputClassName="w-full"
                      useGrouping={false}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Offer Price <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="offerPrice"
                  control={control}
                  render={({ field: f }) => (
                    <InputNumber
                      value={f.value ?? null}
                      onValueChange={(e) => f.onChange(e.value)}
                      placeholder="Offer price"
                      min={0}
                      className="w-full"
                      inputClassName="w-full"
                      useGrouping={false}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Opening Stock
                </label>
                <Controller
                  name="openingStock"
                  control={control}
                  render={({ field: f }) => (
                    <InputNumber
                      value={f.value ?? 0}
                      onValueChange={(e) => f.onChange(e.value)}
                      placeholder="Opening stock"
                      min={0}
                      className="w-full"
                      inputClassName="w-full"
                      useGrouping={false}
                    />
                  )}
                />
              </div>
            </div>
            <PackagingFieldsBlock
              control={control}
              basePath="packagingDetails"
            />
          </div>
        )}

        {/* VARIANT MODE */}
        {hasVariants && (
          <div className="space-y-2.5 w-full min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600 text-base">₹</span>
                {hasColor ? "Color Variants" : "Variants"}
                <span className="text-red-500">*</span>
              </h3>
              <Button
                type="button"
                label={hasColor ? "Add Color" : "Add Variant"}
                icon="pi pi-plus"
                onClick={handleAddVariant}
                className="p-button-sm"
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                }}
              />
            </div>

            <div className="space-y-2.5 w-full min-w-0">
              {variantFields.map((field, index) => {
                const uiKey = getUiKey(field);
                return hasColor ? (
                  <div key={field.id} className="relative">
                    <ColorVariantBlock
                      control={control}
                      register={register}
                      colorIndex={index}
                      onRemoveColor={() => handleRemoveVariant(index, uiKey)}
                      canRemoveColor={variantFields.length > 1}
                      imgState={getColorImageState(uiKey)}
                      onAddImages={(files) => addColorImageFiles(uiKey, files)}
                      onRemoveImage={(i, isExisting) =>
                        removeColorImage(uiKey, i, isExisting)
                      }
                      onOpenCamera={() => openCamera(uiKey)}
                    />
                  </div>
                ) : (
                  <div key={field.id} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-600">
                        Variant {index + 1}
                      </span>
                      {variantFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(index, uiKey)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                        >
                          <i className="pi pi-trash"></i> Remove
                        </button>
                      )}
                    </div>
                    <SizeVariantRow
                      control={control}
                      register={register}
                      basePath={`variants.${index}`}
                      index={index}
                      onRemove={() => handleRemoveVariant(index, uiKey)}
                      canRemove={variantFields.length > 1}
                      showRemove={false}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBMIT BUTTONS */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 border-0 hover:bg-gray-200"
            outlined
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            label={
              isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Update Product"
                  : "Create Product"
            }
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>
      </form>

      {/* CAMERA DIALOG */}
      <Dialog
        header="Take Product Photo"
        visible={cameraOpen}
        onShow={() => startCamera(facingMode)}
        onHide={closeCamera}
        style={{ width: "min(92vw, 640px)" }}
        modal
        draggable={false}
      >
        <div className="space-y-3">
          {cameraError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 flex flex-col gap-2">
              <span className="flex items-start gap-2">
                <i className="pi pi-exclamation-circle mt-0.5"></i>
                {cameraError}
              </span>
              <Button
                type="button"
                label="Try again"
                icon="pi pi-refresh"
                size="small"
                outlined
                className="self-start"
                onClick={() => startCamera(facingMode)}
              />
            </div>
          )}

          <div
            className={`relative bg-black rounded-lg overflow-hidden ${cameraError ? "hidden" : ""}`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setCameraReady(true)}
              className="w-full"
              style={{ maxHeight: "60vh", objectFit: "contain" }}
            />
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <i className="pi pi-spin pi-spinner text-2xl"></i>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-gray-600">
              {capturedCount > 0
                ? `${capturedCount} photo${capturedCount > 1 ? "s" : ""} added`
                : "Capture as many photos as you need"}
            </span>
            <div className="flex gap-2">
              {hasMultipleCameras && (
                <Button
                  type="button"
                  icon="pi pi-sync"
                  label="Switch"
                  outlined
                  onClick={switchCamera}
                  disabled={!cameraReady}
                />
              )}
              <Button
                type="button"
                icon="pi pi-camera"
                label="Capture"
                onClick={capturePhoto}
                disabled={!cameraReady}
              />
              <Button
                type="button"
                icon="pi pi-check"
                label="Done"
                severity="success"
                onClick={closeCamera}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ProductFrom;