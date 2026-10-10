"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import ProductForm from "@/components/product/ProductFrom";

// ---------- API endpoints (tomar route onujayi change koro) ----------
const LIST_ENDPOINT = "/api/product/all-products";
const DELETE_ENDPOINT = "/api/product/delete-product";

// ---------- Types ----------
// [TIER] quantity based price
type PriceTier = { minQty: number; maxQty?: number | null; price: number };

// [GST]
type Gst = { cgst?: number | null; sgst?: number | null; igst?: number | null };

type SizeVariant = {
  size?: string | null;
  weight?: string | null;
  height?: string | null;
  mrp?: number | null;
  offerPrice?: number | null;
  currentStock?: number | null;
  lowStockThreshold?: number | null;
  priceTiers?: PriceTier[];
  gst?: Gst | null; // [GST]
};

type Variant = SizeVariant & {
  _id?: string;
  color?: string | null;
  images?: string[];
  sizeVariants?: SizeVariant[];
};

type ProductRow = {
  _id: string;
  name: string;
  productCode?: string;
  description?: string;
  unit?: string;
  images?: string[];
  mrp?: number | null;
  offerPrice?: number | null;
  minOfferPrice?: number | null;
  maxOfferPrice?: number | null;
  currentStock?: number | null;
  lowStockThreshold?: number | null;
  priceTiers?: PriceTier[];
  gst?: Gst | null; // [GST]
  gstInclusive?: boolean; // [GST]
  variants?: Variant[];
  hasVariants?: boolean;
  hasColor?: boolean;
  hasStockManagement?: boolean;
  isActive: boolean;
  isVerified: boolean;
  createdAt?: string;
  store?: { _id?: string; storeName?: string; storeUniqueId?: string };
  category?: { _id?: string; name?: string };
};

type MediaItem = { url: string; label?: string };

type Unit = {
  label: string;
  mrp?: number | null;
  offerPrice?: number | null;
  currentStock: number;
  lowStockThreshold: number;
  tiers?: PriceTier[];
  gst?: Gst | null; // [GST]
};

// ---------- Helpers ----------
const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const GIF_URL_REGEX = /\.gif(\?.*)?$/i;
const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_REGEX.test(url);

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const money = (n?: number | null) =>
  n === null || n === undefined ? "-" : `₹${inr.format(n)}`;

const ROWS_OPTIONS = [8, 12, 24, 48];

const getThumb = (p: ProductRow): string | null =>
  p.images?.[0] ||
  p.variants?.find((v) => v.images && v.images.length > 0)?.images?.[0] ||
  null;

const getMediaList = (p: ProductRow): MediaItem[] => {
  const list: MediaItem[] = (p.images || []).map((url) => ({ url }));
  (p.variants || []).forEach((v) =>
    (v.images || []).forEach((url) =>
      list.push({ url, label: v.color || undefined }),
    ),
  );
  return list;
};

const attrLabel = (v: SizeVariant) =>
  [v.size, v.weight, v.height].filter(Boolean).join(" / ");

const flattenUnits = (p: ProductRow): Unit[] => {
  const units: Unit[] = [];
  (p.variants || []).forEach((v) => {
    if (v.sizeVariants && v.sizeVariants.length > 0) {
      v.sizeVariants.forEach((sv) =>
        units.push({
          label:
            [v.color, attrLabel(sv)].filter(Boolean).join(" · ") || "Default",
          mrp: sv.mrp,
          offerPrice: sv.offerPrice,
          currentStock: sv.currentStock ?? 0,
          lowStockThreshold: sv.lowStockThreshold ?? 0,
          tiers: sv.priceTiers,
          gst: sv.gst ?? v.gst, // [GST] size -> color
        }),
      );
    } else {
      units.push({
        label: [v.color, attrLabel(v)].filter(Boolean).join(" · ") || "Default",
        mrp: v.mrp,
        offerPrice: v.offerPrice,
        currentStock: v.currentStock ?? 0,
        lowStockThreshold: v.lowStockThreshold ?? 0,
        tiers: v.priceTiers,
        gst: v.gst, // [GST]
      });
    }
  });
  return units;
};

// stock management off hole ba stock data na thakle null
const getStockInfo = (p: ProductRow) => {
  if (!p.hasStockManagement) return null;

  let units: { currentStock: number; lowStockThreshold: number }[];
  if (p.variants && p.variants.length > 0) {
    units = flattenUnits(p);
  } else {
    // list API te currentStock na ashle (projection e nai) stock dekhabo na
    if (p.currentStock === undefined || p.currentStock === null) return null;
    units = [
      {
        currentStock: p.currentStock ?? 0,
        lowStockThreshold: p.lowStockThreshold ?? 0,
      },
    ];
  }

  const total = units.reduce((sum, u) => sum + u.currentStock, 0);
  const low = units.some(
    (u) => u.lowStockThreshold > 0 && u.currentStock <= u.lowStockThreshold,
  );
  return { total, low, out: total === 0 };
};

const getVariantCounts = (p: ProductRow) => {
  const variants = p.variants || [];
  const colors = p.hasColor ? variants.length : 0;
  const sizes = p.hasColor
    ? variants.reduce((s, v) => s + (v.sizeVariants?.length || 0), 0)
    : variants.length;
  return { colors, sizes };
};

const getDiscount = (p: ProductRow): number | null => {
  if (p.variants && p.variants.length > 0) return null;
  if (p.mrp == null || p.offerPrice == null || p.mrp <= 0) return null;
  if (p.offerPrice >= p.mrp) return null;
  return Math.round(((p.mrp - p.offerPrice) / p.mrp) * 100);
};

// [TIER] kono level e (simple / color / size) tier ache kina
const hasTiers = (p: ProductRow) =>
  (p.priceTiers?.length ?? 0) > 0 ||
  (p.variants || []).some(
    (v) =>
      (v.priceTiers?.length ?? 0) > 0 ||
      (v.sizeVariants || []).some((s) => (s.priceTiers?.length ?? 0) > 0),
  );

// [GST] label: "CGST 9% + SGST 9%"
const gstOf = (g?: Gst | null) =>
  [
    g?.cgst != null ? `CGST ${g.cgst}%` : null,
    g?.sgst != null ? `SGST ${g.sgst}%` : null,
    g?.igst != null ? `IGST ${g.igst}%` : null,
  ]
    .filter(Boolean)
    .join(" + ");

// [GST] kono level e GST ache kina
const hasGst = (p: ProductRow) =>
  !!gstOf(p.gst) ||
  (p.variants || []).some(
    (v) =>
      !!gstOf(v.gst) || (v.sizeVariants || []).some((s) => !!gstOf(s.gst)),
  );

const tierRangeLabel = (t: PriceTier) =>
  t.maxQty ? `${t.minQty}-${t.maxQty}` : `${t.minQty}+`;

function TierChips({ tiers }: { tiers?: PriceTier[] }) {
  if (!tiers || tiers.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tiers.map((t, i) => (
        <span
          key={i}
          className="px-2 py-0.5 rounded-full text-[11px] bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap"
        >
          {tierRangeLabel(t)} qty: <b>{money(t.price)}</b>
        </span>
      ))}
    </div>
  );
}

// ---------- Media preview (image / gif / video) ----------
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

    // screen e dekha gele play, na dekha gele pause (performance)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
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
        {showBadge && GIF_URL_REGEX.test(src) && (
          <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 pointer-events-none">
            <i className="pi pi-play text-[9px]"></i>
            GIF
          </span>
        )}
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

// ---------- Small UI pieces ----------
const Badge = ({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${className}`}
  >
    {children}
  </span>
);

function StatusBadges({ p }: { p: ProductRow }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        className={
          p.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }
      >
        {p.isActive ? "✓ Active" : "✗ Inactive"}
      </Badge>
      <Badge
        className={
          p.isVerified
            ? "bg-blue-100 text-blue-800"
            : "bg-yellow-100 text-yellow-800"
        }
      >
        {p.isVerified ? "Verified" : "Pending"}
      </Badge>
    </div>
  );
}

function StockBadge({ p }: { p: ProductRow }) {
  const info = getStockInfo(p);
  if (!info) return <span className="text-xs text-gray-400">-</span>;
  if (info.out)
    return <Badge className="bg-red-100 text-red-800">Out of stock</Badge>;
  if (info.low)
    return (
      <Badge className="bg-amber-100 text-amber-800">
        Low stock: {info.total}
      </Badge>
    );
  return (
    <Badge className="bg-green-100 text-green-800">Stock: {info.total}</Badge>
  );
}

function PriceBlock({ p }: { p: ProductRow }) {
  const min = p.minOfferPrice;
  const max = p.maxOfferPrice;
  if (min === null || min === undefined)
    return <span className="text-sm text-gray-400">-</span>;

  const isRange = max !== null && max !== undefined && max !== min;
  const showMrp =
    !(p.variants && p.variants.length > 0) &&
    p.mrp != null &&
    p.offerPrice != null &&
    p.mrp > p.offerPrice;

  return (
    <div className="flex items-baseline gap-1.5 flex-wrap">
      <span className="text-base font-bold text-gray-900">
        {isRange ? `${money(min)} - ${money(max)}` : money(min)}
      </span>
      {showMrp && (
        <span className="text-xs text-gray-400 line-through">
          {money(p.mrp)}
        </span>
      )}
    </div>
  );
}

const EmptyState = ({ searching, term }: { searching: boolean; term: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-12">
    <div className="text-6xl mb-4">{searching ? "🔍" : "📦"}</div>
    <h2 className="text-xl font-semibold text-gray-700">
      {searching ? "No products found" : "No Products Yet"}
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      {searching
        ? `No product matches "${term}". Try a different name or product code.`
        : "You haven't added any products yet. Click 'Add Product' to create your first one."}
    </p>
  </div>
);

const NoThumb = ({ className = "" }: { className?: string }) => (
  <div
    className={`flex items-center justify-center bg-blue-500 text-white ${className}`}
  >
    <i className="pi pi-image text-2xl" />
  </div>
);

// ---------- Quick view ----------
function PreviewBody({
  product,
  onEdit,
}: {
  product: ProductRow;
  onEdit: () => void;
}) {
  const media = useMemo(() => getMediaList(product), [product]);
  const units = useMemo(() => flattenUnits(product), [product]);
  const [active, setActive] = useState(0);
  const current = media[active];

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Code", value: product.productCode || "-" },
    { label: "Category", value: product.category?.name || "-" },
    { label: "Store", value: product.store?.storeName || "-" },
    { label: "Unit", value: product.unit || "-" },
    { label: "Price", value: <PriceBlock p={product} /> },
    // [GST]
    {
      label: "GST",
      value: gstOf(product.gst)
        ? `${gstOf(product.gst)}${product.gstInclusive ? " (incl.)" : " (extra)"}`
        : "-",
    },
    { label: "Stock", value: <StockBadge p={product} /> },
    { label: "Status", value: <StatusBadges p={product} /> },
    { label: "Created", value: formatDate(product.createdAt || "") },
  ];

  return (
    <div className="space-y-4">
      {/* Gallery */}
      <div className="space-y-2">
        <div className="relative w-full h-64 sm:h-80 rounded-lg overflow-hidden border border-blue-100 bg-black">
          {current ? (
            isVideoUrl(current.url) ? (
              <video
                key={current.url}
                src={current.url}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                key={current.url}
                src={current.url}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <NoThumb className="w-full h-full" />
          )}
          {current?.label && (
            <span className="absolute top-2 left-2 bg-black/60 text-white text-xs rounded px-2 py-0.5">
              {current.label}
            </span>
          )}
        </div>

        {media.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {media.map((m, i) => (
              <button
                key={`${m.url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                title={m.label || `Media ${i + 1}`}
                className={`shrink-0 rounded-md border-2 ${
                  i === active ? "border-blue-500" : "border-transparent"
                }`}
              >
                <MediaPreview
                  src={m.url}
                  autoPlay={false}
                  showBadge={false}
                  wrapperClassName="h-16 w-16 rounded-md bg-gray-100"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title + description */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
            {product.description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/50 border border-blue-100 rounded-lg p-3">
        {details.map((d) => (
          <div key={d.label} className="min-w-0">
            <p className="text-[11px] text-gray-500">{d.label}</p>
            <div className="text-sm font-medium text-gray-800 break-words">
              {d.value}
            </div>
          </div>
        ))}
      </div>

      {/* [TIER] simple product er quantity pricing */}
      {(product.priceTiers?.length ?? 0) > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            Quantity pricing
          </h4>
          <TierChips tiers={product.priceTiers} />
        </div>
      )}

      {/* Variants */}
      {units.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            Variants ({units.length})
          </h4>
          <div className="border border-blue-100 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-gray-600 text-xs">
                <tr>
                  <th className="text-left px-3 py-2">Variant</th>
                  <th className="text-left px-3 py-2">MRP</th>
                  <th className="text-left px-3 py-2">Offer</th>
                  {product.hasStockManagement && (
                    <th className="text-left px-3 py-2">Stock</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {units.map((u, i) => (
                  <React.Fragment key={i}>
                    <tr className="border-t border-blue-50">
                      <td className="px-3 py-2">
                        {u.label}
                        {/* [GST] variant er nijer / inherit kora (color) GST */}
                        {gstOf(u.gst) && (
                          <p className="text-[10px] text-green-700">
                            {gstOf(u.gst)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {money(u.mrp)}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {money(u.offerPrice ?? u.mrp)}
                      </td>
                      {product.hasStockManagement && (
                        <td className="px-3 py-2">
                          <span
                            className={
                              u.currentStock === 0
                                ? "text-red-600 font-semibold"
                                : u.lowStockThreshold > 0 &&
                                    u.currentStock <= u.lowStockThreshold
                                  ? "text-amber-600 font-semibold"
                                  : ""
                            }
                          >
                            {u.currentStock}
                          </span>
                        </td>
                      )}
                    </tr>
                    {/* [TIER] variant er quantity pricing */}
                    {u.tiers && u.tiers.length > 0 && (
                      <tr>
                        <td
                          colSpan={product.hasStockManagement ? 4 : 3}
                          className="px-3 pb-2"
                        >
                          <TierChips tiers={u.tiers} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          icon="pi pi-pencil"
          label="Edit Product"
          onClick={onEdit}
          className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
        />
      </div>
    </div>
  );
}

// ===============================================================
// PAGE
// ===============================================================
function Page() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);

  const [visible, setVisible] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<ProductRow | null>(null);

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [pagination, setPagination] = useState({ page: 1, rows: 8 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const reqIdRef = useRef(0);

  // ---------- Fetch (server-side pagination + search) ----------
  const fetchProducts = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    try {
      setLoading(true);
      const res = await axiosInstance.get(LIST_ENDPOINT, {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(search ? { search } : {}),
        },
      });
      // purono request er response ignore
      if (reqId !== reqIdRef.current) return;
      setProducts(res.data.products || []);
      setTotalProducts(res.data.totalProducts || 0);
    } catch (error: any) {
      if (reqId !== reqIdRef.current) return;
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [pagination.page, pagination.rows, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // search debounce (400ms), search change hole page 1 e ferot
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ---------- Actions ----------
  const handleAddProduct = () => {
    setEditProductId(null);
    setVisible(true);
  };

  const handleUpdate = (row: ProductRow) => {
    setPreviewProduct(null);
    setEditProductId(row._id);
    setVisible(true);
  };

  const closeForm = () => {
    setVisible(false);
    setEditProductId(null);
  };

  const handleFormSuccess = () => {
    const wasCreate = !editProductId;
    closeForm();
    // notun product e newest first, tai page 1 e niye jai
    if (wasCreate && pagination.page !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      fetchProducts();
    }
  };

  const confirmDelete = (row: ProductRow) => {
    confirmDialog({
      message: `Are you sure you want to delete "${row.name}"? This cannot be undone.`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `${DELETE_ENDPOINT}/${row._id}`,
          );
          toast.success(res.data.message || "Product deleted successfully");
          // page er sesh product delete hole ager page e jao
          if (products.length === 1 && pagination.page > 1) {
            setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
          } else {
            await fetchProducts();
          }
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const onPageChange = (e: { page?: number; rows: number }) =>
    setPagination({ page: (e.page ?? 0) + 1, rows: e.rows });

  const rangeStart =
    totalProducts === 0 ? 0 : (pagination.page - 1) * pagination.rows + 1;
  const rangeEnd = Math.min(pagination.page * pagination.rows, totalProducts);

  // ---------- Table templates ----------
  const productCell = (row: ProductRow) => {
    const thumb = getThumb(row);
    return (
      <div className="flex items-center gap-3 min-w-[220px]">
        <button
          type="button"
          onClick={() => setPreviewProduct(row)}
          title="Quick view"
          className="shrink-0"
        >
          {thumb ? (
            <MediaPreview
              src={thumb}
              alt={row.name}
              autoPlay={false}
              showBadge={false}
              wrapperClassName="h-12 w-16 rounded-lg border border-gray-200 bg-gray-100"
            />
          ) : (
            <NoThumb className="h-12 w-16 rounded-lg" />
          )}
        </button>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">{row.name}</p>
          <p className="text-xs text-gray-500">{row.productCode}</p>
        </div>
      </div>
    );
  };

  const variantsCell = (row: ProductRow) => {
    const { colors, sizes } = getVariantCounts(row);
    // [TIER] bulk pricing badge
    const bulk = hasTiers(row) ? (
      <Badge className="bg-purple-100 text-purple-800">Bulk</Badge>
    ) : null;
    // [GST] badge
    const gstBadge = hasGst(row) ? (
      <Badge className="bg-green-100 text-green-800">GST</Badge>
    ) : null;

    if (!colors && !sizes) {
      if (!bulk && !gstBadge)
        return <span className="text-xs text-gray-400">Simple</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {bulk}
          {gstBadge}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {colors > 0 && (
          <Badge className="bg-purple-100 text-purple-800">
            {colors} color{colors > 1 ? "s" : ""}
          </Badge>
        )}
        {sizes > 0 && (
          <Badge className="bg-indigo-100 text-indigo-800">
            {sizes} option{sizes > 1 ? "s" : ""}
          </Badge>
        )}
        {bulk}
        {gstBadge}
      </div>
    );
  };

  const actionTemplate = (row: ProductRow) => (
    <div className="flex gap-1.5">
      <Button
        icon="pi pi-eye"
        tooltip="View"
        tooltipOptions={{ position: "top" }}
        onClick={() => setPreviewProduct(row)}
        style={{
          background: "#f0fdf4",
          color: "#15803d",
          border: "1px solid #bbf7d0",
        }}
      />
      <Button
        icon="pi pi-pencil"
        tooltip="Edit"
        tooltipOptions={{ position: "top" }}
        onClick={() => handleUpdate(row)}
        style={{
          background: "#eff6ff",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
        }}
      />
      <Button
        icon="pi pi-trash"
        tooltip="Delete"
        tooltipOptions={{ position: "top" }}
        onClick={() => confirmDelete(row)}
        severity="danger"
      />
    </div>
  );

  // ---------- Header ----------
  const viewButton = (mode: "card" | "table", icon: string) => (
    <Button
      icon={icon}
      onClick={() => setViewMode(mode)}
      className={viewMode === mode ? "font-semibold" : ""}
      style={{
        minWidth: "36px",
        padding: "6px",
        background: viewMode === mode ? "#fff" : "transparent",
        color: viewMode === mode ? "#1d4ed8" : "#fff",
        border: "1px solid #93c5fd",
      }}
    />
  );

  const header = (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
      style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-white">
          Products
        </h2>
        <p className="text-xs text-blue-100">
          {totalProducts} {search ? "found" : "total"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-stretch sm:items-center w-full sm:w-auto">
        <div className="flex gap-0.5 bg-white/20 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
          {viewButton("card", "pi pi-th-large")}
          {viewButton("table", "pi pi-bars")}
        </div>

        <Button
          label="Refresh"
          icon="pi pi-refresh"
          onClick={fetchProducts}
          loading={loading}
          className="w-full sm:w-auto"
          style={{
            background: "transparent",
            color: "#fff",
            border: "1px solid #93c5fd",
          }}
        />

        <Button
          label="Add Product"
          icon="pi pi-plus"
          onClick={handleAddProduct}
          className="w-full sm:w-auto"
          style={{
            background: "#fff",
            color: "#1d4ed8",
            border: "1px solid #93c5fd",
          }}
        />
      </div>
    </div>
  );

  // typing cholche (debounce baki) ba request cholche -> spinner
  const isSearching = loading || searchInput.trim() !== search;

  const searchBar = (
    <div className="mt-3 px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-3 shadow-sm">
        {/* Search input */}
        <div className="product-search relative w-full sm:max-w-md">
          <i className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-sm pointer-events-none" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchInput("");
            }}
            placeholder="Search by product name or code..."
            className="product-search-input w-full"
            aria-label="Search products"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
              aria-label="Clear search"
            >
              {isSearching ? (
                <i className="pi pi-spin pi-spinner text-[10px]" />
              ) : (
                <i className="pi pi-times text-[10px]" />
              )}
            </button>
          ) : null}
        </div>

        {/* Result info */}
        <div className="flex items-center gap-2 text-sm">
          {search ? (
            <>
              <span className="inline-flex items-center gap-1.5 max-w-[220px] rounded-full bg-blue-100 text-blue-800 font-medium px-3 py-1">
                <i className="pi pi-filter text-[11px]" />
                <span className="truncate">“{search}”</span>
              </span>
              <span className="text-gray-600 whitespace-nowrap">
                <b className="text-blue-700">{totalProducts}</b> result
                {totalProducts === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-blue-100 text-gray-600 px-3 py-1">
              <i className="pi pi-box text-blue-500 text-[11px]" />
              <b className="text-blue-700">{totalProducts}</b> products
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const FormHeader = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle: string;
  }) => (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-box text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-white/90">{subtitle}</p>
      </div>
    </div>
  );

  const showEmpty = !loading && products.length === 0;

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}
        {searchBar}

        {showEmpty && <EmptyState searching={!!search} term={search} />}

        {/* first load spinner */}
        {loading && products.length === 0 && (
          <div className="flex justify-center items-center py-16">
            <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
          </div>
        )}

        {/* ---------- CARD VIEW ---------- */}
        {viewMode === "card" && products.length > 0 && (
          <div className="p-2 sm:p-3">
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 transition-opacity ${
                loading ? "opacity-60" : ""
              }`}
            >
              {products.map((p) => {
                const thumb = getThumb(p);
                const discount = getDiscount(p);
                const { colors, sizes } = getVariantCounts(p);

                return (
                  <div
                    key={p._id}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-blue-100 flex flex-col h-full"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewProduct(p)}
                      title="Quick view"
                      className="block w-full relative"
                    >
                      {thumb ? (
                        <MediaPreview
                          src={thumb}
                          alt={p.name}
                          autoPlay
                          wrapperClassName="w-full h-44 bg-gray-100"
                        />
                      ) : (
                        <NoThumb className="w-full h-44" />
                      )}

                      {p.category?.name && (
                        <span className="absolute top-2 left-2 bg-white/90 text-blue-700 text-[11px] font-semibold rounded-full px-2 py-0.5 shadow-sm pointer-events-none">
                          {p.category.name}
                        </span>
                      )}
                      {discount !== null && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-bold rounded-full px-2 py-0.5 shadow-sm pointer-events-none">
                          {discount}% OFF
                        </span>
                      )}
                    </button>

                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 font-medium">
                          {p.productCode}
                        </p>
                        <h3
                          className="text-sm font-semibold text-gray-800 truncate"
                          title={p.name}
                        >
                          {p.name}
                        </h3>
                        {p.store?.storeName && (
                          <p className="text-xs text-gray-500 truncate">
                            🏬 {p.store.storeName}
                          </p>
                        )}
                      </div>

                      <PriceBlock p={p} />

                      <div className="flex flex-wrap gap-1">
                        {colors > 0 && (
                          <Badge className="bg-purple-100 text-purple-800">
                            {colors} color{colors > 1 ? "s" : ""}
                          </Badge>
                        )}
                        {sizes > 0 && (
                          <Badge className="bg-indigo-100 text-indigo-800">
                            {sizes} option{sizes > 1 ? "s" : ""}
                          </Badge>
                        )}
                        {/* [TIER] */}
                        {hasTiers(p) && (
                          <Badge className="bg-purple-100 text-purple-800">
                            Bulk pricing
                          </Badge>
                        )}
                        {/* [GST] */}
                        {hasGst(p) && (
                          <Badge className="bg-green-100 text-green-800">
                            GST{p.gstInclusive ? " incl." : ""}
                          </Badge>
                        )}
                        {p.hasStockManagement && <StockBadge p={p} />}
                      </div>

                      <StatusBadges p={p} />

                      <p className="text-xs text-gray-500">
                        📅 {formatDate(p.createdAt || "")}
                      </p>

                      <div className="flex gap-1 justify-between mt-auto pt-1">
                        <Button
                          icon="pi pi-pencil"
                          label="Edit"
                          onClick={() => handleUpdate(p)}
                          className="flex-1 text-xs"
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            padding: "4px 8px",
                          }}
                        />
                        <Button
                          icon="pi pi-trash"
                          label="Delete"
                          onClick={() => confirmDelete(p)}
                          className="flex-1 text-xs"
                          severity="danger"
                          style={{ padding: "4px 8px" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-6 pt-3 border-t border-blue-100">
              <p className="text-sm text-gray-600">
                Showing {rangeStart} to {rangeEnd} of {totalProducts} products
              </p>
              <Paginator
                first={(pagination.page - 1) * pagination.rows}
                rows={pagination.rows}
                totalRecords={totalProducts}
                rowsPerPageOptions={ROWS_OPTIONS}
                onPageChange={onPageChange}
                template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                className="!p-0"
              />
            </div>
          </div>
        )}

        {/* ---------- TABLE VIEW ---------- */}
        {viewMode === "table" && products.length > 0 && (
          <DataTable
            value={products}
            lazy
            paginator
            first={(pagination.page - 1) * pagination.rows}
            rows={pagination.rows}
            totalRecords={totalProducts}
            loading={loading}
            rowsPerPageOptions={ROWS_OPTIONS}
            onPage={(e) => onPageChange({ page: e.page, rows: e.rows })}
            dataKey="_id"
            responsiveLayout="scroll"
            className="mt-3"
          >
            <Column
              header="#"
              body={(_, options) =>
                (pagination.page - 1) * pagination.rows + options.rowIndex + 1
              }
              style={{ width: "55px" }}
            />
            <Column header="Product" body={productCell} />
            <Column
              header="Category"
              body={(row: ProductRow) => row.category?.name || "-"}
            />
            <Column
              header="Store"
              body={(row: ProductRow) => row.store?.storeName || "-"}
            />
            <Column
              header="Price"
              body={(row: ProductRow) => <PriceBlock p={row} />}
            />
            <Column header="Variants" body={variantsCell} />
            <Column
              header="Stock"
              body={(row: ProductRow) => <StockBadge p={row} />}
            />
            <Column
              header="Status"
              body={(row: ProductRow) => <StatusBadges p={row} />}
            />
            <Column
              header="Created"
              body={(row: ProductRow) => formatDate(row.createdAt || "")}
            />
            <Column header="Actions" body={actionTemplate} />
          </DataTable>
        )}

        {/* ---------- ADD / EDIT DIALOG ---------- */}
        {visible && (
          <Dialog
            header={
              editProductId ? (
                <FormHeader
                  title="Edit Product"
                  subtitle="Update details, images, videos and variants"
                />
              ) : (
                <FormHeader
                  title="Add New Product"
                  subtitle="Add details, images or videos, and variants"
                />
              )
            }
            visible={visible}
            style={{ width: "min(96vw, 1100px)" }}
            contentStyle={{ maxHeight: "88vh", overflow: "auto" }}
            onHide={closeForm}
            closable={false}
            dismissableMask={false}
            draggable={false}
          >
            <ProductForm
              productId={editProductId}
              onClose={closeForm}
              onSuccess={handleFormSuccess}
            />
          </Dialog>
        )}

        {/* ---------- QUICK VIEW DIALOG ---------- */}
        <Dialog
          header="Product Details"
          visible={!!previewProduct}
          style={{ width: "min(96vw, 760px)" }}
          contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
          onHide={() => setPreviewProduct(null)}
          dismissableMask
          draggable={false}
        >
          {previewProduct && (
            <PreviewBody
              key={previewProduct._id}
              product={previewProduct}
              onEdit={() => handleUpdate(previewProduct)}
            />
          )}
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>

      {/* Search bar styling */}
      <style jsx global>{`
        .product-search-input.p-inputtext {
          width: 100%;
          padding: 11px 40px 11px 42px;
          border-radius: 999px;
          border: 1.5px solid #bfdbfe;
          background: #fff;
          font-size: 14px;
          color: #1f2937;
          box-shadow: 0 1px 2px rgba(29, 78, 216, 0.06);
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }
        .product-search-input.p-inputtext::placeholder {
          color: #9ca3af;
        }
        .product-search-input.p-inputtext:hover {
          border-color: #93c5fd;
        }
        .product-search-input.p-inputtext:enabled:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
        }
      `}</style>
    </div>
  );
}

export default Page;