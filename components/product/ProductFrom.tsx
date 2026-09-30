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
// [STOCK] create mode e store setting dekhar jonno
import { getStoreSettings } from "@/service/storeSetting.service";
import {
  createProductSchema,
  updateProductSchema,
} from "@/helper/schema/Schema";
import {
  useVideoTrimmer,
  appendMediaFile,
  MAX_CLIP_SECONDS,
} from "@/components/VideoTrim";

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

// ---------- Media (image + gif + video) config: backend multer er sathe match kora ----------
const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
const MEDIA_ACCEPT = ALLOWED_MEDIA_TYPES.join(",");
const MAX_IMAGE_SIZE_MB = 50;
const MAX_VIDEO_SIZE_MB = 100; // original video (backend multer limit er sathe mil)
const MAX_FILES_PER_REQUEST = 30;

const MEDIA_HINT = `JPG, PNG, WEBP, GIF, AVIF, MP4, WEBM, MOV. Image max ${MAX_IMAGE_SIZE_MB}MB, video max ${MAX_VIDEO_SIZE_MB}MB. Video max ${MAX_CLIP_SECONDS} sec (trim korte parben), GIF hoye save hobe.`;

const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_REGEX.test(url);
const isVideoFile = (file?: File | null) =>
  !!file && file.type.startsWith("video/");

// invalid type / oversize / empty file bad diye valid gulo return kore, reason toast e dekhay
const filterMediaFiles = (files: File[]): File[] => {
  const valid: File[] = [];
  files.forEach((file) => {
    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      toast.error(
        `"${file.name}" is not supported. Use JPG, PNG, WEBP, GIF, AVIF, MP4, WEBM or MOV.`,
      );
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const maxMb = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(
        `"${file.name}" is too large. Max ${maxMb}MB for ${isVideo ? "video" : "image"}.`,
      );
      return;
    }
    if (file.size === 0) {
      toast.error(`"${file.name}" is empty.`);
      return;
    }
    valid.push(file);
  });
  return valid;
};

const isValidObjectId = (id?: string | null) =>
  !!id && /^[a-fA-F0-9]{24}$/.test(id);

const isNil = (v: any) => v === undefined || v === null || v === "";

const hasAttribute = (v: any) =>
  !!(
    String(v?.size ?? "").trim() ||
    String(v?.weight ?? "").trim() ||
    String(v?.height ?? "").trim()
  );

// stray default row (no text / no price) -> silently skipped
const isEmptySizeVariant = (v: any) =>
  !hasAttribute(v) && !v?.sku && isNil(v?.mrp) && isNil(v?.offerPrice);

const hasPackaging = (p: any) => !!p && Object.values(p).some((x) => !isNil(x));

// row packaging if filled, otherwise the global packaging
const packagingOf = (own: any, fallback: any) =>
  hasPackaging(own) ? own : fallback || {};

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

// global values that pre-fill every new / untouched row
type Defaults = {
  mrp?: number | null;
  offerPrice?: number | null;
  openingStock?: number | null;
  lowStockThreshold?: number | null;
  sku?: string | null;
};

const buildEmptySizeVariant = (d: Defaults = {}) => ({
  size: "",
  weight: "",
  height: "",
  mrp: (d.mrp ?? undefined) as number | undefined,
  offerPrice: (d.offerPrice ?? undefined) as number | undefined,
  openingStock: d.openingStock ?? 0,
  lowStockThreshold: d.lowStockThreshold ?? 0,
  sku: d.sku ?? "",
  packagingDetails: {} as PackagingDetails,
});

const buildEmptyColorVariant = (withSize = false, d: Defaults = {}) => ({
  _uiKey: genUiKey(),
  color: "",
  mrp: (d.mrp ?? undefined) as number | undefined,
  offerPrice: (d.offerPrice ?? undefined) as number | undefined,
  openingStock: d.openingStock ?? 0,
  lowStockThreshold: d.lowStockThreshold ?? 0,
  sku: d.sku ?? "",
  packagingDetails: {} as PackagingDetails,
  sizeVariants: (withSize ? [buildEmptySizeVariant(d)] : []) as ReturnType<
    typeof buildEmptySizeVariant
  >[],
});

type FacingMode = "user" | "environment";

type ImageState = {
  existing: string[];
  files: File[];
  previews: string[];
};

// first message from a zod / react-hook-form error tree
const firstErrorMessage = (errs: any): string | null => {
  if (!errs || typeof errs !== "object") return null;
  if (typeof errs.message === "string" && errs.message) return errs.message;
  for (const key of Object.keys(errs)) {
    if (key === "ref") continue;
    const m = firstErrorMessage(errs[key]);
    if (m) return m;
  }
  return null;
};

// ===============================================================
// Media thumbnail (image / gif / video) with remove button
// ===============================================================
function MediaThumb({
  src,
  isVideo,
  sizeClass,
  removeBtnClass,
  onRemove,
}: {
  src: string;
  isVideo: boolean;
  sizeClass: string;
  removeBtnClass: string;
  onRemove: () => void;
}) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden border bg-gray-100 ${sizeClass}`}
    >
      {isVideo ? (
        <>
          {/* #t=0.1 : iOS Safari e first frame poster hishebe dekhate help kore */}
          <video
            src={`${src}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white rounded px-1 text-[9px] flex items-center gap-0.5 pointer-events-none">
            <i className="pi pi-play text-[8px]"></i>
            Video
          </span>
        </>
      ) : (
        <img src={src} alt="" className="w-full h-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className={`absolute bg-red-500 text-white rounded-full flex items-center justify-center ${removeBtnClass}`}
      >
        ×
      </button>
    </div>
  );
}

// ===============================================================
// Collapsible Packaging Details block
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
// Single Size/Weight/Height row
// ===============================================================
function SizeVariantRow({
  control,
  register,
  basePath,
  onRemove,
  canRemove,
  showRemove,
  showStock,
}: {
  control: Control<any>;
  register: any;
  basePath: string;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  showRemove: boolean;
  // [STOCK] stock management off hole Opening Stock / Low Stock Alert lukiye jay
  showStock: boolean;
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
      <p className="text-[10px] text-gray-500 mb-1.5">
        Fill at least one of Size, Weight or Height{" "}
        <span className="text-red-500">*</span>
      </p>
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${
          showStock ? "lg:grid-cols-7" : "lg:grid-cols-6"
        }`}
      >
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
            Offer Price
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
                placeholder="Optional"
              />
            )}
          />
        </div>

        {/* [STOCK] Opening Stock + Low Stock Alert shudhu stock on thakle */}
        {showStock && (
          <>
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
            <div className="space-y-1 min-w-0">
              <label className="text-[10px] font-semibold text-gray-600">
                Low Stock Alert
              </label>
              <Controller
                name={`${basePath}.lowStockThreshold` as any}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value ?? 0}
                    onValueChange={(e) => field.onChange(e.value)}
                    className="w-full"
                    inputClassName="w-full p-inputtext-sm"
                    min={0}
                    useGrouping={false}
                    placeholder="0 = off"
                  />
                )}
              />
            </div>
          </>
        )}

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
// One Color block
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
  getDefaults,
  showStock,
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
  getDefaults: () => Defaults;
  // [STOCK] stock management off hole stock field lukiye jay
  showStock: boolean;
}) {
  const {
    fields: sizeFields,
    append: appendSize,
    remove: removeSize,
    replace: replaceSizes,
  } = useFieldArray({ control, name: `variants.${colorIndex}.sizeVariants` });

  const sizeMode = sizeFields.length > 0;

  const toggleSizeMode = (on: boolean) =>
    on ? appendSize(buildEmptySizeVariant(getDefaults())) : replaceSizes([]);

  return (
    <div className="border border-blue-100 rounded-xl p-2.5 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <i className="pi pi-palette text-blue-500"></i>
          <InputText
            className="w-full max-w-[220px] p-inputtext-sm font-semibold"
            {...register(`variants.${colorIndex}.color`)}
            placeholder="Color name e.g. Red *"
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

      {/* Color media (image / gif / video) - required */}
      <div className="space-y-1.5 mb-2.5">
        <label className="text-[11px] font-semibold text-gray-600">
          Color Images / Videos <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {imgState.existing.map((url, i) => (
            <MediaThumb
              key={`ex-${i}`}
              src={url}
              isVideo={isVideoUrl(url)}
              sizeClass="w-14 h-14"
              removeBtnClass="top-0.5 right-0.5 text-[9px] w-4 h-4"
              onRemove={() => onRemoveImage(i, true)}
            />
          ))}
          {imgState.previews.map((src, i) => (
            <MediaThumb
              key={`new-${i}`}
              src={src}
              isVideo={isVideoFile(imgState.files[i])}
              sizeClass="w-14 h-14"
              removeBtnClass="top-0.5 right-0.5 text-[9px] w-4 h-4"
              onRemove={() => onRemoveImage(i, false)}
            />
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="file"
            multiple
            accept={MEDIA_ACCEPT}
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
        <p className="text-[10px] text-gray-400">{MEDIA_HINT}</p>
      </div>

      {/* Per-color size toggle (independent of the global toggle) */}
      <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-2.5 py-1.5 mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-700">
            Size / Weight / Height options for this color
          </p>
          <p className="text-[10px] text-gray-500">
            Turn on to add separate size options for this color.
          </p>
        </div>
        <InputSwitch
          checked={sizeMode}
          onChange={(e) => toggleSizeMode(!!e.value)}
        />
      </div>

      {sizeMode ? (
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
              showStock={showStock}
            />
          ))}
          <Button
            type="button"
            label="Add Size Option"
            icon="pi pi-plus"
            size="small"
            outlined
            onClick={() => appendSize(buildEmptySizeVariant(getDefaults()))}
          />
        </div>
      ) : (
        <div className="border border-blue-100 rounded-lg p-2 bg-blue-50/30">
          <div
            className={`grid grid-cols-2 gap-2 ${
              showStock ? "sm:grid-cols-5" : "sm:grid-cols-3"
            }`}
          >
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
                Offer Price
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
                    placeholder="Optional"
                  />
                )}
              />
            </div>

            {/* [STOCK] Opening Stock + Low Stock Alert shudhu stock on thakle */}
            {showStock && (
              <>
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
                    Low Stock Alert
                  </label>
                  <Controller
                    name={`variants.${colorIndex}.lowStockThreshold` as any}
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        value={field.value ?? 0}
                        onValueChange={(e) => field.onChange(e.value)}
                        className="w-full"
                        inputClassName="w-full p-inputtext-sm"
                        min={0}
                        useGrouping={false}
                        placeholder="0 = off"
                      />
                    )}
                  />
                </div>
              </>
            )}

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

  // video 15s er beshi hole trim dialog khule (prepareFiles), trimDialog form er baire render hoy
  const { prepareFiles, trimDialog } = useVideoTrimmer();

  // [STOCK] create: store settings theke, edit: product er nijer hasStockManagement flag theke.
  // false hole main product, color variant, size variant, kothao stock field dekhabe na.
  const [stockEnabled, setStockEnabled] = useState(false);

  // Both toggles are real state and only change when the user clicks them.
  // hasColor = color variants on/off
  // hasSize  = global size/weight/height toggle (per-color toggles don't change it)
  const [hasColor, setHasColor] = useState(false);
  const [hasSize, setHasSize] = useState(false);
  const hasVariants = hasColor || hasSize;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
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
      lowStockThreshold: 0,
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

  // ---------- Global values -> pre-fill rows ----------
  const getDefaults = (): Defaults => ({
    mrp: getValues("mrp") as any,
    offerPrice: getValues("offerPrice") as any,
    openingStock: (getValues("openingStock") as any) ?? 0,
    lowStockThreshold: (getValues("lowStockThreshold" as any) as any) ?? 0,
    sku: (getValues("sku" as any) as any) ?? "",
  });

  const normalize = (field: string, v: any) =>
    field === "openingStock" || field === "lowStockThreshold"
      ? (v ?? 0)
      : isNil(v)
        ? null
        : v;

  // Update the global field, then copy the new value into every color / size row
  // whose value still equals the previous global value (manual edits are kept).
  const onGlobalChange = (
    field: "mrp" | "offerPrice" | "openingStock" | "lowStockThreshold" | "sku",
    next: any,
  ) => {
    const prev = getValues(field as any);
    setValue(field as any, next, { shouldDirty: true });

    const variants = (getValues("variants") || []) as any[];
    const same = (a: any) => normalize(field, a) === normalize(field, prev);

    variants.forEach((v, i) => {
      if (same(v?.[field])) {
        setValue(`variants.${i}.${field}` as any, next);
      }
      (v?.sizeVariants || []).forEach((sv: any, j: number) => {
        if (same(sv?.[field])) {
          setValue(`variants.${i}.sizeVariants.${j}.${field}` as any, next);
        }
      });
    });
  };

  // ---------- Main product media (image / gif / video) ----------
  // video 15s er beshi hole prepareFiles trim dialog dekhay, user skip korle oi file bad
  const addImageFiles = async (files: File[]) => {
    const valid = filterMediaFiles(files);
    if (!valid.length) return;
    const ready = await prepareFiles(valid);
    if (!ready.length) return;
    setImageFiles((prev) => [...prev, ...ready]);
    setImagePreviews((prev) => [
      ...prev,
      ...ready.map((f) => URL.createObjectURL(f)),
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

  // ---------- Color media ----------
  const getColorImageState = (uiKey: string): ImageState =>
    colorImages[uiKey] || { existing: [], files: [], previews: [] };

  const addColorImageFiles = async (uiKey: string, files: File[]) => {
    const valid = filterMediaFiles(files);
    if (!valid.length) return;
    const ready = await prepareFiles(valid);
    if (!ready.length) return;
    setColorImages((prev) => {
      const cur = prev[uiKey] || { existing: [], files: [], previews: [] };
      return {
        ...prev,
        [uiKey]: {
          ...cur,
          files: [...cur.files, ...ready],
          previews: [
            ...cur.previews,
            ...ready.map((f) => URL.createObjectURL(f)),
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

  // New rows start with the current global values
  const handleAddVariant = () => {
    const d = getDefaults();
    appendVariant(
      (hasColor
        ? buildEmptyColorVariant(hasSize, d)
        : buildEmptySizeVariant(d)) as any,
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

  // ---------- Color toggle (keeps the size toggle state) ----------
  const toggleColor = (value: boolean) => {
    setColorImages({});
    const d = getDefaults();
    if (value) {
      setHasColor(true);
      replaceVariants([buildEmptyColorVariant(hasSize, d)] as any);
    } else {
      setHasColor(false);
      replaceVariants(hasSize ? ([buildEmptySizeVariant(d)] as any) : []);
    }
  };

  // ---------- Global size toggle ----------
  // color ON : applies size on/off to every existing color (colors/images stay)
  // color OFF: plain size variants on/off
  const toggleSize = (value: boolean) => {
    setHasSize(value);
    const d = getDefaults();
    if (hasColor) {
      const current = (getValues("variants") || []) as any[];
      replaceVariants(
        current.map((v) => ({
          ...v,
          sizeVariants: value
            ? v.sizeVariants?.length
              ? v.sizeVariants
              : [buildEmptySizeVariant(d)]
            : [],
        })) as any,
      );
      return;
    }
    replaceVariants(value ? ([buildEmptySizeVariant(d)] as any) : []);
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

  // [STOCK] create mode: selected store er stock management setting load
  useEffect(() => {
    if (isEditMode || !isValidObjectId(selectedStoreId)) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await getStoreSettings(selectedStoreId as string);
        if (!cancelled)
          setStockEnabled(!!res.data?.settings?.hasStockManagement);
      } catch {
        if (!cancelled) setStockEnabled(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedStoreId, isEditMode]);

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

      // [STOCK] edit mode e product er nijer flag dekhe stock field show/hide
      setStockEnabled(product.hasStockManagement !== false);

      const rawVariants: any[] = Array.isArray(product.variants)
        ? product.variants
        : [];
      const productHasColor = rawVariants.some((v) => v && v.color);
      const isSized = (v: any) =>
        Array.isArray(v?.sizeVariants) && v.sizeVariants.length > 0;

      setHasColor(productHasColor);
      // initial global size state (after this only the user changes it)
      setHasSize(
        productHasColor
          ? rawVariants.length > 0 && rawVariants.every(isSized)
          : rawVariants.length > 0,
      );

      if (rawVariants.length === 0) {
        setValue("mrp", product.mrp ?? 0);
        setValue("offerPrice", product.offerPrice ?? undefined);
        setValue("openingStock", product.openingStock ?? 0);
        setValue("lowStockThreshold" as any, product.lowStockThreshold ?? 0);
        setCurrentStockInfo(product.currentStock ?? null);
        replaceVariants([]);
      } else {
        // global values start from the first row
        const first = rawVariants[0];
        const firstRow = isSized(first) ? first.sizeVariants[0] : first;
        setValue("mrp", firstRow?.mrp ?? undefined);
        setValue("offerPrice", firstRow?.offerPrice ?? undefined);
        setValue("openingStock", firstRow?.openingStock ?? 0);
        setValue(
          "lowStockThreshold" as any,
          firstRow?.lowStockThreshold ?? 0,
        );
        setValue("sku" as any, (firstRow?.sku || "") as any);

        if (productHasColor) {
          const uiKeys = rawVariants.map(() => genUiKey());

          replaceVariants(
            rawVariants.map((v: any, idx: number) => ({
              _uiKey: uiKeys[idx],
              color: v.color || "",
              mrp: v.mrp ?? undefined,
              offerPrice: v.offerPrice ?? undefined,
              openingStock: v.openingStock ?? 0,
              lowStockThreshold: v.lowStockThreshold ?? 0,
              sku: v.sku || "",
              packagingDetails: v.packagingDetails || {},
              sizeVariants: isSized(v)
                ? v.sizeVariants.map((sv: any) => ({
                    size: sv.size || "",
                    weight: sv.weight || "",
                    height: sv.height || "",
                    mrp: sv.mrp,
                    offerPrice: sv.offerPrice,
                    openingStock: sv.openingStock ?? 0,
                    lowStockThreshold: sv.lowStockThreshold ?? 0,
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
              lowStockThreshold: v.lowStockThreshold ?? 0,
              sku: v.sku || "",
              packagingDetails: v.packagingDetails || {},
            })),
          );
        }
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

  // ---------- Validation ----------
  const priceError = (label: string, mrp: any, offer: any): string | null => {
    if (isNil(mrp)) return `${label}MRP is required`;
    if (!isNil(offer) && Number(offer) > Number(mrp))
      return `${label}Offer price cannot be greater than MRP`;
    return null;
  };

  const validateSizeRow = (label: string, sv: any): string | null => {
    if (!hasAttribute(sv))
      return `${label}enter at least one of Size, Weight or Height`;
    return priceError(label, sv.mrp, sv.offerPrice);
  };

  const validateForm = (): string | null => {
    // validate the real form values (not zod-parsed data)
    const values = getValues();
    const variants = (values.variants || []) as any[];

    // ---- Media ----
    if (!hasColor && existingImages.length + imageFiles.length === 0) {
      return "Product image is required. Add at least one image or video in the 'Product Images / Videos' section.";
    }

    // ---- Total upload count (backend multer files limit) ----
    let totalNewFiles = imageFiles.length;
    if (hasColor) {
      variants.forEach((_, i) => {
        totalNewFiles += getColorImageState(getUiKey(variantFields[i])).files
          .length;
      });
    }
    if (totalNewFiles > MAX_FILES_PER_REQUEST) {
      return `Too many files. You can upload at most ${MAX_FILES_PER_REQUEST} new files at once (currently ${totalNewFiles}).`;
    }

    // ---- Simple product ----
    if (!hasVariants) {
      return priceError("", values.mrp, values.offerPrice);
    }

    if (!variants.length) return "At least one variant is required";

    // ---- Color mode ----
    if (hasColor) {
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const label = `Color ${i + 1}: `;
        if (!String(v.color ?? "").trim())
          return `${label}color name is required`;

        const imgs = getColorImageState(getUiKey(variantFields[i]));
        if (imgs.existing.length + imgs.files.length === 0)
          return `${label}at least one image or video is required`;

        const sizeRows = Array.isArray(v.sizeVariants) ? v.sizeVariants : [];

        if (sizeRows.length > 0) {
          const rows = sizeRows.filter((sv: any) => !isEmptySizeVariant(sv));
          if (!rows.length)
            return `${label}fill a size option or turn its size toggle off`;
          for (let j = 0; j < rows.length; j++) {
            const err = validateSizeRow(
              `Color ${i + 1} - Size ${j + 1}: `,
              rows[j],
            );
            if (err) return err;
          }
        } else {
          const err = priceError(label, v.mrp, v.offerPrice);
          if (err) return err;
        }
      }
      return null;
    }

    // ---- Plain size/weight/height variants ----
    for (let i = 0; i < variants.length; i++) {
      const err = validateSizeRow(`Variant ${i + 1}: `, variants[i]);
      if (err) return err;
    }
    return null;
  };

  // if the zod resolver blocks the submit, show the reason
  const onInvalid = (errs: any) => {
    console.log("Form validation errors:", errs);
    toast.error(firstErrorMessage(errs) || "Please check the form fields");
  };

  const onSubmit = async (data: ProductFormData) => {
    const validationError = validateForm();
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
      formData.append("hasColor", String(hasColor));

      if (!isEditMode && data.storeId)
        formData.append("storeId", String(data.storeId));
      if (data.categoryId)
        formData.append("categoryId", String(data.categoryId));

      existingImages.forEach((url) => formData.append("images", url));
      // video hole trim (start/end) file er naam e jay, backend oi part ta kete GIF banay
      imageFiles.forEach((file, idx) =>
        appendMediaFile(formData, `image${idx}`, file),
      );

      // real form values
      const values = getValues();
      const globalPackaging = values.packagingDetails || {};

      // [STOCK] stock off hole variant/size level e o opening stock + low stock alert shobshomoy 0 jabe
      const stockOf = (o: any) =>
        stockEnabled
          ? {
              openingStock: o?.openingStock ?? 0,
              lowStockThreshold: o?.lowStockThreshold ?? 0,
            }
          : { openingStock: 0, lowStockThreshold: 0 };

      if (!hasVariants) {
        formData.append("mrp", String(values.mrp ?? 0));
        if (!isNil(values.offerPrice))
          formData.append("offerPrice", String(values.offerPrice));
        // [STOCK] main product er stock
        formData.append(
          "lowStockThreshold",
          String(stockEnabled ? ((values as any).lowStockThreshold ?? 0) : 0),
        );
        formData.append(
          "openingStock",
          String(stockEnabled ? (values.openingStock ?? 0) : 0),
        );
        formData.append("packagingDetails", JSON.stringify(globalPackaging));
        formData.append("variants", JSON.stringify([]));
      } else {
        const variants = (values.variants || []) as any[];

        const variantsPayload = variants.map((v, idx) => {
          const uiKey = getUiKey(variantFields[idx]);
          const imgState = uiKey
            ? getColorImageState(uiKey)
            : { existing: [] as string[] };

          if (hasColor) {
            const sizeRows = Array.isArray(v.sizeVariants)
              ? v.sizeVariants.filter((sv: any) => !isEmptySizeVariant(sv))
              : [];
            const color = String(v.color || "").trim() || undefined;

            // color + size options
            if (sizeRows.length > 0) {
              return {
                color,
                images: imgState.existing,
                packagingDetails: packagingOf(
                  v.packagingDetails,
                  globalPackaging,
                ),
                sizeVariants: sizeRows.map((sv: any) => ({
                  size: sv.size || undefined,
                  weight: sv.weight || undefined,
                  height: sv.height || undefined,
                  mrp: sv.mrp,
                  offerPrice: isNil(sv.offerPrice) ? undefined : sv.offerPrice,
                  ...stockOf(sv), // [STOCK]
                  sku: sv.sku || undefined,
                  packagingDetails: packagingOf(
                    sv.packagingDetails,
                    globalPackaging,
                  ),
                })),
              };
            }

            // color without sizes
            return {
              color,
              images: imgState.existing,
              mrp: v.mrp,
              offerPrice: isNil(v.offerPrice) ? undefined : v.offerPrice,
              ...stockOf(v), // [STOCK]
              sku: v.sku || undefined,
              packagingDetails: packagingOf(
                v.packagingDetails,
                globalPackaging,
              ),
            };
          }

          // plain size/weight/height variant
          return {
            size: v.size || undefined,
            weight: v.weight || undefined,
            height: v.height || undefined,
            mrp: v.mrp,
            offerPrice: isNil(v.offerPrice) ? undefined : v.offerPrice,
            ...stockOf(v), // [STOCK]
            sku: v.sku || undefined,
            packagingDetails: packagingOf(v.packagingDetails, globalPackaging),
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
              appendMediaFile(formData, `variantImage_${idx}`, file),
            );
          });
        }
      }

      const res = await axiosInstance.request({
        url,
        method: isEditMode ? "put" : "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
        // boro video upload + GIF convert e time lage (ekadhik video hole aro beshi)
        timeout: 10 * 60 * 1000,
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
      const apiErrors = error.response?.data?.errors;
      console.log("Product save error:", error.response?.data);
      toast.error(
        (Array.isArray(apiErrors) && apiErrors[0]?.message) ||
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

  // notun video select kora thakle button e "Converting video..." dekhabe
  const hasNewVideo =
    imageFiles.some(isVideoFile) ||
    Object.values(colorImages).some((s) => s.files.some(isVideoFile));

  return (
    <div className="px-4 pt-2 pb-3 min-h-[80vh]">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-3">
        {isEditMode && productCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-2 flex-wrap">
            <i className="pi pi-hashtag text-blue-500"></i>
            <span className="text-sm text-gray-600">Product Code:</span>
            <span className="text-sm font-semibold text-gray-800">
              {productCode}
            </span>
            {/* [STOCK] current stock badge shudhu stock on thakle */}
            {currentStockInfo !== null && !hasVariants && stockEnabled && (
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

        {/* Main Product Media: required when color is off, optional when on */}
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image text-blue-600"></i>
            Product Images / Videos
            {!hasColor ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs font-normal text-gray-500">
                (optional — add images/videos inside each color)
              </span>
            )}
          </h4>

          {(existingImages.length > 0 || imagePreviews.length > 0) && (
            <div className="flex gap-2 flex-wrap">
              {existingImages.map((url, idx) => (
                <MediaThumb
                  key={`ex-${idx}`}
                  src={url}
                  isVideo={isVideoUrl(url)}
                  sizeClass="w-32 h-24"
                  removeBtnClass="top-1 right-1 p-1 text-xs"
                  onRemove={() => removeImage(idx, true)}
                />
              ))}
              {imagePreviews.map((src, idx) => (
                <MediaThumb
                  key={`new-${idx}`}
                  src={src}
                  isVideo={isVideoFile(imageFiles[idx])}
                  sizeClass="w-32 h-24"
                  removeBtnClass="top-1 right-1 p-1 text-xs"
                  onRemove={() => removeImage(idx, false)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="file"
              multiple
              onChange={handleImageChange}
              className="flex-1 min-w-0 p-1.5 border border-blue-200 rounded-lg"
              accept={MEDIA_ACCEPT}
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
          <p className="text-[11px] text-gray-400">{MEDIA_HINT}</p>
        </div>

        {/* VARIANT TOGGLES — independent */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Color variants
              </p>
              <p className="text-xs text-gray-500">
                Each color gets its own images/videos. Size / Weight not
                required.
              </p>
            </div>
            <InputSwitch
              checked={hasColor}
              onChange={(e) => toggleColor(!!e.value)}
            />
          </div>

          <div className="flex items-center justify-between border-t border-blue-200 pt-2.5">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Size / Weight / Height variants
              </p>
              <p className="text-xs text-gray-500">
                {hasColor
                  ? "Shortcut: turn size options on or off for all colors at once. You can also enable them for individual colors inside each color block."
                  : "Plain variants with different size / weight / height."}
              </p>
            </div>
            <InputSwitch
              checked={hasSize}
              onChange={(e) => toggleSize(!!e.value)}
            />
          </div>
        </div>

        {/* PRICING & STOCK: values entered here fill every variant below */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-blue-600 text-base">₹</span>
            {/* [STOCK] stock off hole heading e "& Stock" thakbe na */}
            Pricing{stockEnabled ? " & Stock" : ""}
          </h3>
          {hasVariants && (
            <p className="text-xs text-gray-500">
              These values are filled into every variant below. You can still
              change them in any individual variant.
            </p>
          )}
          <div
            className={`grid grid-cols-1 gap-2.5 ${
              stockEnabled ? "sm:grid-cols-5" : "sm:grid-cols-3"
            }`}
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                MRP {!hasVariants && <span className="text-red-500">*</span>}
              </label>
              <Controller
                name="mrp"
                control={control}
                render={({ field: f }) => (
                  <InputNumber
                    value={f.value ?? null}
                    onValueChange={(e) => onGlobalChange("mrp", e.value)}
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
                Offer Price
              </label>
              <Controller
                name="offerPrice"
                control={control}
                render={({ field: f }) => (
                  <InputNumber
                    value={f.value ?? null}
                    onValueChange={(e) => onGlobalChange("offerPrice", e.value)}
                    placeholder="Optional"
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

            {/* [STOCK] Opening Stock + Low Stock Alert shudhu stock on thakle */}
            {stockEnabled && (
              <>
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
                        onValueChange={(e) =>
                          onGlobalChange("openingStock", e.value ?? 0)
                        }
                        placeholder="Opening stock"
                        min={0}
                        className="w-full"
                        inputClassName="w-full"
                        useGrouping={false}
                      />
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Low Stock Alert
                  </label>
                  <Controller
                    name={"lowStockThreshold" as any}
                    control={control}
                    render={({ field: f }) => (
                      <InputNumber
                        value={f.value ?? 0}
                        onValueChange={(e) =>
                          onGlobalChange("lowStockThreshold", e.value ?? 0)
                        }
                        placeholder="0 = off"
                        min={0}
                        className="w-full"
                        inputClassName="w-full"
                        useGrouping={false}
                      />
                    )}
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">SKU</label>
              <Controller
                name={"sku" as any}
                control={control}
                render={({ field: f }) => (
                  <InputText
                    className="w-full"
                    value={(f.value as string) ?? ""}
                    onChange={(e) => onGlobalChange("sku", e.target.value)}
                    placeholder="Optional"
                  />
                )}
              />
            </div>
          </div>
          <PackagingFieldsBlock control={control} basePath="packagingDetails" />
        </div>

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
                      getDefaults={getDefaults}
                      showStock={stockEnabled}
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
                      showStock={stockEnabled}
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
                ? hasNewVideo
                  ? "Converting video..."
                  : "Saving..."
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

      {/* VIDEO TRIM DIALOG */}
      {trimDialog}
    </div>
  );
}

export default ProductFrom;