"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axiosInstance from "@/service/axios.service";
import VortexLoader from "@/app/(web)/components/VortexLoader";
import { ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react";

const Header = dynamic(() => import("../components/Header"), { ssr: false });
const Footer = dynamic(() => import("../components/Footer"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreReview {
  rating?: number;
  comment?: string;
}

interface ApiSubCategory {
  _id: string;
  name: string;
  image?: string;
  isActive?: boolean;
}

interface ApiCategory {
  _id: string;
  name: string;
  image?: string;
  description?: string;
  subCategories: ApiSubCategory[];
  isActive?: boolean;
}

interface Ad {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  redirectUrl?: string;
  rank?: number;
  isActive?: boolean;
}

interface RecentStore {
  _id: string;
  storeName: string;
  storeType?: string;
  images?: string[];
  address?: { area?: string; state?: string };
  reviews?: StoreReview[];
  isActive?: boolean;
  timing?: { open: string; close: string };
  isFeatured?: boolean;
  gstin?: string;
}

interface ProductAd {
  _id: string;
  productId: {
    _id: string;
    name: string;
    images?: string[];
    description?: string;
    sellingPrice?: number;
    isActive?: boolean;
    isVerified?: boolean;
    storeId?: { _id: string; storeName: string };
  };
  rank?: number;
  expiryDate?: string;
  isActive?: boolean;
}

interface Store {
  _id: string;
  storeName: string;
  storeType: string;
  categoryId?: string;
  subCategoryId?: string;
  isFeatured?: boolean;
  viewCount?: number;
  userId: { _id: string; name: string; email: string; phone: string };
  address: { area: string; state: string; country: string };
  timing: { open: string; close: string };
  contactNo: string;
  whatsappNo: string;
  email: string;
  website: string;
  description: string;
  images: string[];
  lat: number;
  long: number;
  gstin?: string;
  isActive: boolean;
  isVerify: boolean;
  storeUniqueId: string;
  reviews?: StoreReview[];
  createdAt?: string;
  _distance?: number;
}

type FeedMode =
  | "all"
  | "featured"
  | "topViewed"
  | "topRated"
  | "gst"
  | "random"
  | "nearby";

// ─── Static Data ──────────────────────────────────────────────────────────────

const CATEGORY_ICONS = [
  {
    label: "Restaurants",
    icon: "https://cdn-icons-png.flaticon.com/64/3075/3075977.png",
  },
  {
    label: "Hotels",
    icon: "https://cdn-icons-png.flaticon.com/64/2933/2933824.png",
  },
  {
    label: "Beauty Spa",
    icon: "https://cdn-icons-png.flaticon.com/64/3081/3081840.png",
  },
  {
    label: "Home Decor",
    icon: "https://cdn-icons-png.flaticon.com/64/1670/1670088.png",
  },
  {
    label: "Wedding Planning",
    icon: "https://cdn-icons-png.flaticon.com/64/2961/2961948.png",
  },
  {
    label: "Education",
    icon: "https://cdn-icons-png.flaticon.com/64/3976/3976625.png",
  },
  {
    label: "Rent & Hire",
    icon: "https://cdn-icons-png.flaticon.com/64/619/619153.png",
  },
  {
    label: "Hospitals",
    icon: "https://cdn-icons-png.flaticon.com/64/2382/2382461.png",
  },
  {
    label: "Contractors",
    icon: "https://cdn-icons-png.flaticon.com/64/1048/1048945.png",
  },
  {
    label: "Pet Shops",
    icon: "https://cdn-icons-png.flaticon.com/64/2138/2138508.png",
  },
  {
    label: "Groceries",
    icon: "https://cdn-icons-png.flaticon.com/64/1261/1261163.png",
  },
  {
    label: "Electronics",
    icon: "https://cdn-icons-png.flaticon.com/64/2586/2586488.png",
  },
];

const HERO_SLIDES = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=400&fit=crop",
    overlayColor:
      "linear-gradient(90deg, rgba(245,230,200,0.92) 45%, rgba(245,230,200,0.3) 100%)",
    headline: "Get Loan Against\nProperty",
    subtext: "At a competitive interest rate starting from ",
    highlight: "9.00%",
    subtext2: " from AMP Credit",
    cta: "Apply Now →",
    brand: "AMP Finance",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop",
    overlayColor:
      "linear-gradient(90deg, rgba(30,30,60,0.88) 45%, rgba(30,30,60,0.3) 100%)",
    headline: "Find the Best\nDeals Near You",
    subtext: "Discover top-rated stores and ",
    highlight: "exclusive offers",
    subtext2: " in your area",
    cta: "Explore Now →",
    brand: "AMP Shopping",
  },
];

const SERVICE_CARDS = [
  {
    id: 1,
    label: "B2B",
    sub: "Quick Quotes",
    bg: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=230&fit=crop&crop=top",
  },
  {
    id: 2,
    label: "REPAIRS & SERVICES",
    sub: "Get Nearest Vendor",
    bg: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=230&fit=crop&crop=top",
  },
  {
    id: 3,
    label: "REAL ESTATE",
    sub: "Finest Agents",
    bg: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=230&fit=crop&crop=top",
  },
  {
    id: 4,
    label: "DOCTORS",
    sub: "Book Now",
    bg: "linear-gradient(135deg, #059669, #047857)",
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=230&fit=crop&crop=top",
  },
];

const FEED_MODES: Array<{ key: FeedMode; label: string; icon: string }> = [
  { key: "all", label: "All Stores", icon: "pi-th-large" },
  { key: "nearby", label: "Nearby", icon: "pi-map-marker" }, // ← new
  { key: "featured", label: "Featured", icon: "pi-star-fill" },
  { key: "topViewed", label: "Top Viewed", icon: "pi-eye" },
  { key: "topRated", label: "Top Rated", icon: "pi-thumbs-up" },
  { key: "gst", label: "GST Verified", icon: "pi-id-card" },
  { key: "random", label: "Random", icon: "pi-refresh" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fallbackImage =
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=400&fit=crop";
const normalizeText = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
const titleCase = (v: string) =>
  v
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const STATE_ALIASES: Record<string, string> = { westbengal: "West Bengal" };
const canonicalizeState = (v?: string) => {
  const t = v?.trim();
  if (!t) return "";
  const n = normalizeText(t);
  return STATE_ALIASES[n] || titleCase(t);
};
const parseTimeToMin = (v: string) => {
  const n = v.trim().toUpperCase().replace(/\s+/g, "");
  const m = n.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || "0");
  if (m[3] === "AM") h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return h * 60 + min;
};
const isOpenNow = (open: string, close: string) => {
  const o = parseTimeToMin(open);
  const c = parseTimeToMin(close);
  if (o === null || c === null) return false;
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  if (o === c) return true;
  return o < c ? now >= o && now < c : now >= o || now < c;
};
const toNum = (v: unknown, fb = 0) => {
  const p = typeof v === "number" ? v : Number(v);
  return Number.isFinite(p) ? p : fb;
};
const toTs = (v?: string) => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};
const avgRating = (s: Store) => {
  const r = s.reviews || [];
  if (!r.length) return 0;
  return r.reduce((sum, rv) => sum + (Number(rv.rating) || 0), 0) / r.length;
};
const reviewCount = (s: Store) => s.reviews?.length || 0;
const hasGst = (s: Store) => Boolean(s.gstin?.trim());
const discoveryScore = (s: Store) => {
  const age = Math.max(0, (Date.now() - toTs(s.createdAt)) / 86400000);
  return (
    (s.isFeatured ? 70 : 0) +
    (s.isVerify ? 60 : 0) +
    (hasGst(s) ? 12 : 0) +
    (s.isActive ? 8 : 0) +
    avgRating(s) * 15 +
    Math.min(reviewCount(s), 20) * 2 +
    Math.max(0, 80 - age)
  );
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "ST";
const GRADIENTS = [
  "from-rose-500 to-orange-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-yellow-500",
  "from-indigo-500 to-blue-500",
];
const storeGradient = (name: string) =>
  GRADIENTS[Math.abs(name.charCodeAt(0)) % GRADIENTS.length];

const renderStars = (rating: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <i
      key={i}
      className={`pi ${i < Math.round(rating) ? "pi-star-fill text-amber-400" : "pi-star text-slate-300"}`}
      style={{ fontSize: "10px" }}
    />
  ));

function RecentSearches() {
  const [stores, setStores] = useState<RecentStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchRecent = () => {
    axiosInstance
      .get("/api/register/recent-search-stores")
      .then((res) => setStores(res.data.stores || []))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await axiosInstance.delete("/api/register/clear-recent-searches");
      setStores([]);
    } catch {
      // silent fail
    } finally {
      setClearing(false);
    }
  };

  const scroll = (dir: "left" | "right") => {
    sliderRef.current?.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  if (!loading && stores.length === 0) return null;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500">
            <i className="pi pi-clock text-[10px] text-white" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            Recently Visited Stores
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear All button */}
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {clearing ? (
              <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-rose-400" />
            ) : (
              <i className="pi pi-trash text-[10px]" />
            )}
            {clearing ? "Clearing..." : "Clear All"}
          </button>

          {/* Scroll arrows */}
          <button
            onClick={() => scroll("left")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition"
          >
            <ChevronLeft size={14} className="text-slate-500" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition"
          >
            <ChevronRight size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Slider — বাকি সব same থাকবে */}
      <div
        ref={sliderRef}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex shrink-0 flex-col gap-2 rounded-xl border border-slate-100 bg-white p-2 animate-pulse"
                style={{ width: 160 }}
              >
                <div className="h-24 w-full rounded-lg bg-slate-100" />
                <div className="h-3 w-3/4 rounded-full bg-slate-100" />
                <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
              </div>
            ))
          : stores.map((store) => {
              const rating = avgRating(store as Store);
              const open =
                store.isActive &&
                isOpenNow(store.timing?.open || "", store.timing?.close || "");

              return (
                <button
                  key={store._id}
                  onClick={() => router.push(`/store/${store._id}`)}
                  className="group flex shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md text-left"
                  style={{ width: 160 }}
                >
                  <div className="relative h-24 w-full overflow-hidden bg-slate-100">
                    {store.images?.[0] ? (
                      <img
                        src={store.images[0]}
                        alt={store.storeName}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        onError={(e: any) => {
                          e.target.src = fallbackImage;
                        }}
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${storeGradient(store.storeName)} text-white`}
                      >
                        <span className="text-lg font-black">
                          {initials(store.storeName)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${open ? "bg-emerald-500 text-white" : "bg-black/60 text-slate-300"}`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${open ? "bg-white" : "bg-slate-400"}`}
                      />
                      {open ? "Open" : "Closed"}
                    </div>
                    <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                      <i className="pi pi-clock text-[9px] text-white/80" />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-2.5">
                    <p className="line-clamp-2 text-[12px] font-bold leading-snug text-slate-900">
                      {store.storeName}
                    </p>
                    {store.storeType && (
                      <p className="truncate text-[10px] text-slate-400 font-medium">
                        {store.storeType}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-auto pt-1 border-t border-slate-100">
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, i) => (
                          <i
                            key={i}
                            className={`pi ${i < Math.round(rating) ? "pi-star-fill text-amber-400" : "pi-star text-slate-200"}`}
                            style={{ fontSize: "9px" }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        {rating > 0 ? rating.toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// ─── HeroBanner ───────────────────────────────────────────────────────────────

function HeroBanner() {
  const [ads, setAds] = useState<ProductAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);

  useEffect(() => {
    axiosInstance
      .get("/api/ads")
      .then((res) => {
        const sorted = (res.data.ads || [])
          .filter((a: ProductAd) => a.isActive && a.productId?.isActive)
          .sort((a: ProductAd, b: ProductAd) => (a.rank ?? 999) - (b.rank ?? 999));
        setAds(sorted);
      })
      .catch(() => setAds([]))
      .finally(() => setAdsLoading(false));
  }, []);

  // ─── Bucket ads by rank range ────────────────────────────────
  const buckets = useMemo(() => {
    const ranges: Array<{ min: number; max: number }> = [
      { min: 1, max: 20 },
      { min: 21, max: 40 },
      { min: 41, max: 60 },
      { min: 61, max: 80 },
      { min: 81, max: 100 },
    ];
    return ranges.map((range) =>
      ads.filter((ad) => {
        const r = ad.rank ?? 999;
        return r >= range.min && r <= range.max;
      }),
    );
  }, [ads]);

  const mainAds = buckets[0];
  const sideBuckets = buckets.slice(1); // 4 buckets for the 4 side cards

  if (adsLoading) {
    return (
      <div className="flex gap-3">
        <div
          className="relative flex-1 min-w-0 overflow-hidden rounded-2xl bg-slate-100 animate-pulse"
          style={{ height: 260 }}
        />
        <div
          className="hidden sm:grid grid-cols-2 gap-2 shrink-0"
          style={{ width: "43%", height: 260 }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <MainAdSlider ads={mainAds} />
      <div
        className="hidden sm:grid grid-cols-2 gap-2 shrink-0"
        style={{ width: "43%", height: 260 }}
      >
        {sideBuckets.map((bucketAds, idx) => (
          <SideAdSlider key={idx} ads={bucketAds} fallback={SERVICE_CARDS[idx]} />
        ))}
      </div>
    </div>
  );
}

// ─── Main large slider (rank 1-20) ─────────────────────────────
function MainAdSlider({ ads }: { ads: ProductAd[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (ads.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % ads.length);
    }, 4500);
  }, [ads.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  useEffect(() => {
    setCurrent(0);
  }, [ads]);

  const go = (idx: number) => {
    setCurrent(idx);
    startTimer();
  };
  const prev = () => {
    setCurrent((p) => (p - 1 + ads.length) % ads.length);
    startTimer();
  };
  const next = () => {
    setCurrent((p) => (p + 1) % ads.length);
    startTimer();
  };

  return (
    <div
      className="relative flex-1 min-w-0 overflow-hidden rounded-2xl bg-slate-950"
      style={{ height: 260 }}
    >
      {ads.length === 0 ? (
        <div className="flex h-full items-center justify-center text-slate-400 text-sm">
          No ads available
        </div>
      ) : (
        <>
          {ads.map((ad, idx) => {
            const product = ad.productId;
            const productImage = product.images?.[0];
            const storeLink = product.storeId
              ? `/store/${product.storeId._id}`
              : undefined;

            return (
              <div
                key={ad._id}
                className="absolute inset-0 transition-opacity duration-700"
                style={{
                  opacity: idx === current ? 1 : 0,
                  zIndex: idx === current ? 1 : 0,
                }}
              >
                {productImage && (
                  <>
                    <img
                      src={productImage}
                      alt={product.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e: any) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
                  </>
                )}
                {!productImage && (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
                )}

                <div className="absolute left-4 top-4 z-10">
                  <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[2px] text-amber-300">
                    Advertisement
                  </span>
                </div>

                <div className="absolute inset-y-0 left-0 z-10 flex max-w-[62%] flex-col justify-center px-6 py-5">
                  <h2 className="line-clamp-2 text-[1.4rem] font-black leading-tight text-white">
                    {product.name}
                  </h2>
                  {product.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/55">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {product.sellingPrice !== undefined && (
                      <span className="text-xl font-black text-amber-400">
                        ₹{product.sellingPrice.toLocaleString("en-IN")}
                      </span>
                    )}
                    {product.isVerified && (
                      <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  {product.storeId && (
                    <p className="mt-1 text-[10px] text-white/35">
                      by {product.storeId.storeName}
                    </p>
                  )}
                  {storeLink && (
                    
                      <a href={storeLink}
                      className="mt-4 w-fit rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-amber-400"
                    >
                      View Store →
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {ads.length > 1 && (
            <div className="absolute bottom-4 left-6 z-20 flex gap-1.5">
              {ads.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => go(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === current ? "w-6 bg-amber-400" : "w-2 bg-white/25 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-20">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-white/40">
              {current + 1} / {ads.length}
            </span>
          </div>

          {ads.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/15"
              >
                <i className="pi pi-chevron-left text-xs" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/15"
              >
                <i className="pi pi-chevron-right text-xs" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Small side slider (rank 21-40, 41-60, 61-80, 81-100) ──────
function SideAdSlider({
  ads,
  fallback,
}: {
  ads: ProductAd[];
  fallback: (typeof SERVICE_CARDS)[number];
}) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (ads.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % ads.length);
    }, 3500 + Math.random() * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ads.length]);

  useEffect(() => {
    setCurrent(0);
  }, [ads]);

  // No ads in this bucket — fall back to the static service card
  if (ads.length === 0) {
    return (
      <div
        className="relative overflow-hidden rounded-xl cursor-pointer group"
        style={{ background: fallback.bg }}
      >
        <img
          src={fallback.image}
          alt={fallback.label}
          className="absolute bottom-0 right-0 h-full w-auto object-cover object-top opacity-70 group-hover:opacity-90 transition-opacity"
          onError={(e: any) => {
            e.target.style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        <div className="relative z-10 p-3">
          <p className="text-[10px] font-semibold text-white/75 leading-tight uppercase tracking-wide">
            {fallback.sub}
          </p>
          <h3 className="mt-0.5 text-sm font-black leading-tight text-white">
            {fallback.label}
          </h3>
        </div>
        <div className="absolute bottom-3 left-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-white group-hover:bg-white/40 transition">
          <i className="pi pi-chevron-right text-[10px]" />
        </div>
      </div>
    );
  }

  const ad = ads[current];
  const product = ad.productId;
  const productImage = product.images?.[0];
  const storeLink = product.storeId ? `/store/${product.storeId._id}` : "#";

  return (
    
      <a href={storeLink}
      className="relative overflow-hidden rounded-xl cursor-pointer group block bg-slate-900"
    >
      {productImage && (
        <img
          src={productImage}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          key={ad._id}
          onError={(e: any) => {
            e.target.style.display = "none";
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      <div className="absolute left-2 top-2 z-10">
        <span className="rounded bg-amber-400/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-950">
          Ad
        </span>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end p-3">
        <p className="line-clamp-1 text-[11px] font-black leading-tight text-white">
          {product.name}
        </p>
        {product.sellingPrice !== undefined && (
          <p className="mt-0.5 text-[10px] font-bold text-amber-300">
            ₹{product.sellingPrice.toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {ads.length > 1 && (
        <div className="absolute bottom-1.5 right-2 z-10 flex gap-0.5">
          {ads.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === current ? "w-3 bg-amber-400" : "w-1 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </a>
  );
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-[998] flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        background: "linear-gradient(135deg, #1a3a6b, #2196d3)",
      }}
      title="Back to top"
    >
      <i className="pi pi-arrow-up text-sm text-white" />
    </button>
  );
}

// ─── CategoryGrid (Just Dial icon boxes) ──────────────────────────────────────

function CategoryGrid({
  activeTab,
  onTabChange,
  onSubCategorySelect,
}: {
  activeTab: string;
  onTabChange: (label: string) => void;
  onSubCategorySelect: (subCategoryId: string, subCategoryName: string) => void; // ← add
}) {
  const [showAll, setShowAll] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ApiCategory | null>(
    null,
  );
  const [modalLoading, setModalLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axiosInstance.get("/api/category").then((res) => {
      setCategories(res.data.categories || []);
    });
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  const handleCategoryClick = async (cat: ApiCategory) => {
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await axiosInstance.get(`/api/category/${cat._id}`);
      setSelectedCategory(res.data.category);
    } catch {
      setSelectedCategory(cat);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedCategory(null);
  };

  const renderCategoryBtn = (cat: ApiCategory) => (
    <button
      key={cat._id}
      onClick={() => handleCategoryClick(cat)}
      className="flex shrink-0 flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-orange-400 hover:shadow-sm"
      style={{ minWidth: 90 }}
    >
      {cat.image ? (
        <img
          src={cat.image}
          alt={cat.name}
          className="h-11 w-11 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-100 text-xl">
          🏪
        </div>
      )}
      <span className="text-center text-[11px] font-semibold leading-tight text-slate-700 line-clamp-2">
        {cat.name}
      </span>
    </button>
  );

  const allBtn = (
    <button
      key="all"
      onClick={() => onTabChange("all")}
      className={`flex shrink-0 flex-col items-center gap-2 rounded-xl border px-3 py-3 transition hover:border-orange-400 ${
        activeTab === "all"
          ? "border-orange-400 bg-orange-50"
          : "border-slate-200 bg-white"
      }`}
      style={{ minWidth: 90 }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-2xl">
        🏠
      </div>
      <span className="text-center text-[11px] font-semibold leading-tight text-slate-700">
        All
      </span>
    </button>
  );

  return (
    <>
      <div>
        {showAll ? (
          <>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowAll(false)}
                className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm hover:bg-slate-50"
              >
                <ChevronLeft size={11} /> Show Less
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {allBtn}
              {categories.map(renderCategoryBtn)}
            </div>
          </>
        ) : (
          <div className="relative">
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-md border border-slate-200"
            >
              <ChevronLeft size={18} />
            </button>

            <div
              ref={sliderRef}
              className="flex gap-3 overflow-x-hidden scroll-smooth px-10"
            >
              {allBtn}
              {categories.map(renderCategoryBtn)}

              {/* ── Show All — slider এর শেষে ── */}
              <button
                onClick={() => setShowAll(true)}
                className="flex shrink-0 flex-col items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 transition hover:border-orange-400 hover:bg-orange-100"
                style={{ minWidth: 90 }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-100">
                  <Grid3X3 size={22} className="text-orange-500" />
                </div>
                <span className="text-center text-[11px] font-semibold leading-tight text-orange-500">
                  Show All
                </span>
              </button>
            </div>

            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-md border border-slate-200"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ── SubCategory Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              {selectedCategory?.image && (
                <img
                  src={selectedCategory.image}
                  alt={selectedCategory?.name}
                  className="h-10 w-10 rounded-xl object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedCategory?.name || "Category"}
                </h3>
                {selectedCategory?.description && (
                  <p className="text-xs text-slate-500 truncate">
                    {selectedCategory.description}
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
              >
                <i className="pi pi-times text-xs" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {modalLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 p-3 animate-pulse"
                    >
                      <div className="h-14 w-14 rounded-xl bg-slate-100" />
                      <div className="h-3 w-16 rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : selectedCategory?.subCategories?.length ? (
                <div className="grid grid-cols-3 gap-3">
                  {selectedCategory.subCategories.map((sub) => (
                    <button
                      key={sub._id}
                      onClick={() => {
                        onSubCategorySelect(sub._id, sub.name);
                        closeModal();
                      }}
                      className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-orange-400 hover:bg-orange-50"
                    >
                      {sub.image ? (
                        <img
                          src={sub.image}
                          alt={sub.name}
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 text-2xl">
                          🏪
                        </div>
                      )}
                      <span className="text-center text-[11px] font-semibold leading-tight text-slate-700 line-clamp-2">
                        {sub.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No subcategories found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── StoreCard ────────────────────────────────────────────────────────────────

function StoreCard({ store }: { store: Store }) {
  const rating = avgRating(store);
  const reviews = reviewCount(store);
  const views = toNum(store.viewCount);
  const distance = store._distance; // ← added
  const open =
    store.isActive &&
    isOpenNow(store.timing?.open || "", store.timing?.close || "");
  const owner = store.userId?.name || "—";
  const location = [store.address?.area, store.address?.state]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {store.images?.length > 0 ? (
          <img
            src={store.images[0]}
            alt={store.storeName}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(e: any) => {
              e.target.src = fallbackImage;
            }}
          />
        ) : (
          <div
            className={`flex h-full items-center justify-center bg-gradient-to-br ${storeGradient(store.storeName)} text-white`}
          >
            <div className="text-center">
              <div className="text-3xl font-black tracking-widest">
                {initials(store.storeName)}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-white/70">
                Store
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {store.isFeatured && (
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
              Featured
            </span>
          )}
          {hasGst(store) && (
            <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              GST ✓
            </span>
          )}
          {distance !== undefined && (
            <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              📍{" "}
              {distance < 1
                ? `${Math.round(distance * 1000)}m`
                : `${distance.toFixed(1)}km`}
            </span>
          )}
        </div>
        <div
          className={`absolute bottom-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
            open ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${open ? "bg-white" : "bg-slate-400"}`}
          />
          {open ? "Open" : "Closed"}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h4 className="line-clamp-1 text-[1.05rem] font-bold leading-snug text-slate-900">
            {store.storeName}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            {renderStars(rating)}
            <span className="ml-1 text-slate-700">
              {reviews > 0 ? `${rating.toFixed(1)} (${reviews})` : "No reviews"}
            </span>
          </span>
          <span className="text-slate-400">·</span>
          <span className="flex items-center gap-1">
            <i className="pi pi-eye text-slate-400" />
            {views}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <p
            className="min-w-0 truncate text-xs text-slate-500"
            title={location}
          >
            📍 {location || "Location not set"}
          </p>
          <Link href={`/store/${store._id}`} className="shrink-0">
            <button
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white transition"
              style={{
                background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
              }}
            >
              View →
            </button>
          </Link>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-44 animate-pulse bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
        <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INITIAL_SIZE = 12;
const LOAD_STEP = 12;

export default function Home() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [location, setLocation] = useState("");
  const [activeFeed, setActiveFeed] = useState<FeedMode>("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_SIZE);
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | null>(
    null,
  );
  const [subCategoryStores, setSubCategoryStores] = useState<Store[]>([]);
  const [subCategoryLoading, setSubCategoryLoading] = useState(false);
  const [categoryViewActive, setCategoryViewActive] = useState(false);
  const [categoryViewName, setCategoryViewName] = useState("");
  const [nearbyRadius, setNearbyRadius] = useState<number>(10);
  const [userLatLng, setUserLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationModal, setLocationModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const fetchStoresBySubCategory = async (subCategoryId: string) => {
    setSubCategoryLoading(true);
    setActiveSubCategoryId(subCategoryId);
    try {
      const res = await axiosInstance.get(
        `/api/register/stores-by-subcategory/${subCategoryId}`,
      );
      setSubCategoryStores(res.data.stores || []);
    } catch {
      setSubCategoryStores([]);
    } finally {
      setSubCategoryLoading(false);
    }
  };

  const clearSubCategoryFilter = () => {
    setActiveSubCategoryId(null);
    setSubCategoryStores([]);
  };

  const fetchNearbyStores = useCallback(
    async (lat: number, lng: number, radius: number) => {
      setNearbyLoading(true);
      try {
        const res = await axiosInstance.get(
          `/api/register/nearby-stores?lat=${lat}&long=${lng}&radius=${radius}`,
        );
        const stores: Store[] = (res.data.stores || []).map((s: any) => ({
          ...s,
          _distance: s.distance,
        }));
        setNearbyStores(stores);
      } catch {
        setNearbyStores([]);
      } finally {
        setNearbyLoading(false);
      }
    },
    [],
  );

  // fetch
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/api/register/public-all-stores");
        setAllStores(res.data.stores || []);
      } catch {
        setError("Failed to load stores. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeFeed === "nearby" && userLatLng) {
      fetchNearbyStores(userLatLng.lat, userLatLng.lng, nearbyRadius);
    }
  }, [nearbyRadius, activeFeed, userLatLng, fetchNearbyStores]);

  useEffect(() => {
    setVisibleCount(INITIAL_SIZE);
  }, [
    search,
    location,
    activeFeed,
    selectedCategory,
    selectedState,
    selectedArea,
    activeCategoryTab,
  ]);

  useEffect(() => {
    const stateFromUrl = searchParams.get("state");
    if (stateFromUrl) {
      setSelectedState(stateFromUrl);
    } else {
      setSelectedState("all");
    }
  }, [searchParams]);

  const uniqueCategories = useMemo(
    () =>
      Array.from(
        new Set(allStores.map((s) => s.storeType?.trim()).filter(Boolean)),
      ).sort(),
    [allStores],
  );

  const uniqueStates = useMemo(() => {
    const map = new Map<string, string>();
    allStores.forEach((s) => {
      const label = canonicalizeState(s.address?.state);
      if (!label) return;
      const key = normalizeText(label);
      if (!map.has(key)) map.set(key, label);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [allStores]);

  const uniqueAreas = useMemo(() => {
    const scoped =
      selectedState === "all"
        ? allStores
        : allStores.filter(
            (s) =>
              normalizeText(canonicalizeState(s.address?.state)) ===
              normalizeText(selectedState),
          );
    const map = new Map<string, string>();
    scoped.forEach((s) => {
      const area = s.address?.area?.trim();
      if (!area) return;
      const key = normalizeText(area);
      if (!map.has(key)) map.set(key, area);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [allStores, selectedState]);

  useEffect(() => {
    setSelectedArea("all");
  }, [selectedState]);

  const visibleStores = useMemo(() => {
    const q = normalizeText(search);
    const stateKey =
      selectedState === "all" ? "" : normalizeText(selectedState);
    const areaKey = selectedArea === "all" ? "" : normalizeText(selectedArea);
    const locationKey = normalizeText(location);

    const baseStores = activeSubCategoryId ? subCategoryStores : allStores;

    let stores = baseStores.filter((s) => {
      const searchable = normalizeText(
        [
          s.storeName,
          s.storeType,
          s.address?.area,
          s.address?.state,
          s.description,
          s.userId?.name,
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (q && !searchable.includes(q)) return false;
      if (locationKey) {
        const locationSearch = normalizeText(
          [s.address?.area, s.address?.state, s.storeType]
            .filter(Boolean)
            .join(" "),
        );
        if (!locationSearch.includes(locationKey)) return false;
      }
      if (
        stateKey &&
        normalizeText(canonicalizeState(s.address?.state)) !== stateKey
      )
        return false;
      if (areaKey && normalizeText(s.address?.area) !== areaKey) return false;
      return true;
    });

    switch (activeFeed) {
      case "featured":
        return stores
          .filter((s) => s.isFeatured)
          .sort((a, b) => discoveryScore(b) - discoveryScore(a));
      case "topViewed":
        return stores.sort((a, b) => toNum(b.viewCount) - toNum(a.viewCount));
      case "topRated":
        return stores
          .filter((s) => avgRating(s) > 0)
          .sort(
            (a, b) =>
              avgRating(b) - avgRating(a) || reviewCount(b) - reviewCount(a),
          );
      case "gst":
        return stores
          .filter(hasGst)
          .sort((a, b) => discoveryScore(b) - discoveryScore(a));
      case "random":
        return [...stores].sort(() => Math.random() - 0.5);
      case "nearby": {
        if (!userLatLng) return [];
        return nearbyStores
          .filter((s) => {
            const searchable = normalizeText(
              [
                s.storeName,
                s.storeType,
                s.address?.area,
                s.address?.state,
                s.description,
                s.userId?.name,
              ]
                .filter(Boolean)
                .join(" "),
            );
            if (q && !searchable.includes(q)) return false;
            return true;
          })
          .sort((a, b) => (a._distance ?? 0) - (b._distance ?? 0));
      }
      default:
        return stores.sort((a, b) => discoveryScore(b) - discoveryScore(a));
    }
  }, [
    allStores,
    subCategoryStores,
    activeSubCategoryId,
    search,
    activeFeed,
    selectedState,
    selectedArea,
    location,
    nearbyStores,
    userLatLng,
  ]);

  const pagedStores = useMemo(
    () => visibleStores.slice(0, visibleCount),
    [visibleStores, visibleCount],
  );
  const canLoadMore = visibleStores.length > visibleCount;
  const hasFilters = !!(
    search.trim() ||
    location.trim() ||
    activeFeed !== "all" ||
    selectedCategory !== "all" ||
    selectedState !== "all" ||
    selectedArea !== "all" ||
    activeCategoryTab !== "all" ||
    activeSubCategoryId // ← add
  );

  const requestUserLocation = () => {
    setLocationError(null);
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLatLng({ lat, lng });
        setLocationLoading(false);
        setLocationModal(false);
        setActiveFeed("nearby");
        fetchNearbyStores(lat, lng, nearbyRadius);
      },
      (err) => {
        setLocationLoading(false);
        setLocationError(
          err.code === 1
            ? "Location permission denied. Please allow location access in your browser."
            : "Unable to get your location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const clearAll = () => {
    setSearch("");
    setLocation("");
    setActiveFeed("all");
    setSelectedCategory("all");
    setSelectedState("all");
    setSelectedArea("all");
    setActiveCategoryTab("all");
    clearSubCategoryFilter();
    setCategoryViewActive(false);
    setCategoryViewName("");
    setUserLatLng(null);
    setLocationError(null);
    router.push("/store");
  };

  if (loading) return <VortexLoader />;

  if (categoryViewActive) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />

        {/* ── Sticky Top Bar: Category + Search + Filters ── */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          {/* Category Slider */}
          <div className="px-4 pt-3 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <CategoryGrid
                activeTab={activeCategoryTab}
                onTabChange={(label) => {
                  setActiveCategoryTab(label);
                  if (label === "all") clearAll();
                }}
                onSubCategorySelect={(subId, subName) => {
                  setActiveCategoryTab(subName);
                  setCategoryViewName(subName);
                  fetchStoresBySubCategory(subId);
                }}
              />
            </div>
          </div>

          {/* Search + Filter Pills */}
          <div className="px-4 pb-3 pt-2 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl flex items-center gap-2">
              {/* Back button */}
              <button
                onClick={clearAll}
                className="flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-xs font-semibold text-white transition"
                style={{
                  background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                  borderColor: "#1a3a6b",
                }}
              >
                <ChevronLeft size={14} />
                Back
              </button>

              {/* Search */}
              <div className="relative flex-1">
                <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder={`Search in ${categoryViewName}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-8 pr-4 text-sm text-slate-800 outline-none focus:bg-white transition"
                  style={{ "--tw-ring-color": "#2196d3" } as any}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2196d3";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(33,150,211,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "";
                    e.target.style.boxShadow = "";
                  }}
                />
              </div>

              {/* Filter Pills — desktop */}
              <div className="hidden items-center gap-1.5 sm:flex">
                {FEED_MODES.slice(0, 4).map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setActiveFeed(mode.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                      activeFeed === mode.key
                        ? "text-white shadow"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile filter pills */}
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 sm:hidden">
              {FEED_MODES.slice(0, 4).map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setActiveFeed(mode.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeFeed === mode.key
                      ? "bg-blue-600 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Results Header ── */}
        <div className="mx-auto max-w-7xl px-4 pt-4 pb-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {categoryViewName}
              </h2>
              <p className="text-xs text-slate-400">
                {visibleStores.length} stores found
                {search.trim() ? ` for "${search}"` : ""}
              </p>
            </div>
            {search.trim() && (
              <button
                onClick={() => setSearch("")}
                className="text-xs font-semibold text-blue-500 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {/* ── Store Grid ── */}
        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          {subCategoryLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : visibleStores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
              <div className="mx-auto mb-3 text-5xl">🔍</div>
              <p className="font-bold text-slate-900">
                No stores in {categoryViewName}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different subcategory or clear the search.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {pagedStores.map((store) => (
                  <StoreCard key={store._id} store={store} />
                ))}
              </div>
              {canLoadMore && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={() =>
                      setVisibleCount((c) =>
                        Math.min(c + LOAD_STEP, visibleStores.length),
                      )
                    }
                    className="rounded-full border px-8 py-3 text-sm font-bold text-white shadow-sm transition"
                    style={{
                      background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                      borderColor: "#1a3a6b",
                    }}
                  >
                    Load more (
                    {Math.min(LOAD_STEP, visibleStores.length - visibleCount)}{" "}
                    more)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      {/* ── Category Icons ── */}
      <section className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <CategoryGrid
            activeTab={activeCategoryTab}
            onTabChange={setActiveCategoryTab}
            onSubCategorySelect={(subId, subName) => {
              clearSubCategoryFilter();
              setActiveCategoryTab(subName);
              fetchStoresBySubCategory(subId);
              setCategoryViewActive(true);
              setCategoryViewName(subName);
            }}
          />
        </div>
      </section>

      {/* ── Hero Banner ── */}
      <section className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <HeroBanner />
        </div>
      </section>

      {/* ── Recent Searches ── */}
      <section className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <RecentSearches />
        </div>
      </section>

      {/* ── Store Grid ── */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Sidebar */}
          <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:w-56">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Browse by
                </h3>
              </div>
              <div className="p-2">
                {FEED_MODES.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => {
                      if (mode.key === "nearby") {
                        if (!userLatLng) {
                          setLocationModal(true);
                        } else {
                          setActiveFeed("nearby");
                        }
                      } else {
                        setActiveFeed(mode.key);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                      activeFeed === mode.key
                        ? "text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    style={
                      activeFeed === mode.key
                        ? {
                            background:
                              "linear-gradient(110deg, #1a3a6b, #2196d3)",
                          }
                        : {}
                    }
                  >
                    <i
                      className={`pi ${mode.icon} text-sm ${activeFeed === mode.key ? "text-white" : "text-slate-400"}`}
                    />
                    {mode.label}
                    {mode.key === "nearby" &&
                      userLatLng &&
                      activeFeed !== "nearby" && (
                        <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                          ON
                        </span>
                      )}
                    {activeFeed === mode.key && (
                      <i className="pi pi-check ml-auto text-xs text-white" />
                    )}
                  </button>
                ))}

                {/* Nearby radius pills — sidebar এ, filter active থাকলে দেখাবে */}
                {activeFeed === "nearby" && userLatLng && (
                  <div className="mt-1 px-1 space-y-2">
                    {/* Preset pills */}
                    <div className="flex gap-1.5 flex-wrap">
                      {[5, 10, 20, 50].map((km) => (
                        <button
                          key={km}
                          onClick={() => setNearbyRadius(km)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                            nearbyRadius === km
                              ? "text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          style={
                            nearbyRadius === km
                              ? {
                                  background:
                                    "linear-gradient(110deg, #1a3a6b, #2196d3)",
                                }
                              : {}
                          }
                        >
                          {km} km
                        </button>
                      ))}
                    </div>

                    {/* Custom input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={nearbyRadius}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 1 && val <= 500) setNearbyRadius(val);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition"
                        placeholder="Custom km..."
                      />
                      <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                        km
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={clearAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <i className="pi pi-filter-slash" /> Clear all filters
              </button>
            )}
          </aside>

          {/* Store Grid */}
          <div className="min-w-0 flex-1 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {activeFeed === "nearby" && userLatLng
                    ? `Stores within ${nearbyRadius} km`
                    : FEED_MODES.find((m) => m.key === activeFeed)?.label ||
                      "All Stores"}
                </h2>
                <p className="text-sm text-slate-500">
                  {visibleStores.length} stores found
                  {search.trim() ? ` for "${search}"` : ""}
                  {activeFeed === "nearby" && userLatLng
                    ? ` · within ${nearbyRadius} km`
                    : ""}
                </p>
              </div>
              {hasFilters && (
                <div className="flex flex-wrap gap-2">
                  {search.trim() && (
                    <span
                      className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-white"
                      style={{
                        background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                        borderColor: "#1a3a6b",
                      }}
                    >
                      &quot;{search}&quot;
                      <button onClick={() => setSearch("")}>
                        <i className="pi pi-times text-[10px]" />
                      </button>
                    </span>
                  )}
                  {selectedState !== "all" && (
                    <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {selectedState}
                      <button onClick={() => setSelectedState("all")}>
                        <i className="pi pi-times text-[10px]" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
                <i className="pi pi-exclamation-triangle mb-3 text-3xl text-rose-500" />
                <p className="font-bold text-slate-900">
                  Could not load stores
                </p>
                <p className="mt-1 text-sm text-slate-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white"
                >
                  Try again
                </button>
              </div>
            ) : loading || subCategoryLoading || nearbyLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : visibleStores.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <div className="mx-auto mb-3 text-5xl">🔍</div>
                <p className="font-bold text-slate-900">No stores found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try clearing filters or changing the category.
                </p>
                <button
                  onClick={clearAll}
                  className="mt-4 rounded-full px-5 py-2 text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                  }}
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {pagedStores.map((store) => (
                    <StoreCard key={store._id} store={store} />
                  ))}
                </div>
                {canLoadMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() =>
                        setVisibleCount((c) =>
                          Math.min(c + LOAD_STEP, visibleStores.length),
                        )
                      }
                      className="rounded-full border px-8 py-3 text-sm font-bold text-white shadow-sm transition"
                      style={{
                        background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                        borderColor: "#1a3a6b",
                      }}
                    >
                      Load more (
                      {Math.min(LOAD_STEP, visibleStores.length - visibleCount)}{" "}
                      stores)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {locationModal && (
        <div
          className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => !locationLoading && setLocationModal(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient bar */}
            <div
              className="h-1 w-full"
              style={{
                background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
              }}
            />

            {/* Body */}
            <div className="px-6 pt-6 pb-5 text-center">
              {/* Icon */}
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(135deg, #1a3a6b, #2196d3)",
                }}
              >
                <i className="pi pi-map-marker text-2xl text-white" />
              </div>

              <h2 className="text-lg font-black text-slate-900">
                Find Nearby Stores
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Allow location access to discover stores around you within your
                chosen distance.
              </p>

              {/* Radius selector */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Search Radius
                </p>
                <div className="flex items-center gap-2">
                  {/* Preset buttons */}
                  <div className="flex gap-1.5">
                    {[5, 10, 20, 50].map((km) => (
                      <button
                        key={km}
                        onClick={() => setNearbyRadius(km)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          nearbyRadius === km
                            ? "text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        style={
                          nearbyRadius === km
                            ? {
                                background:
                                  "linear-gradient(110deg, #1a3a6b, #2196d3)",
                              }
                            : {}
                        }
                      >
                        {km}
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      defaultValue={nearbyRadius}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 1 && val <= 500) setNearbyRadius(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = Number(
                            (e.target as HTMLInputElement).value,
                          );
                          if (val >= 1 && val <= 500) setNearbyRadius(val);
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition"
                      placeholder="Custom km..."
                    />
                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                      km
                    </span>
                  </div>
                </div>
              </div>

              {/* Error */}
              {locationError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 text-left text-xs text-red-600">
                  <i className="pi pi-exclamation-circle mt-0.5 shrink-0" />
                  {locationError}
                </div>
              )}

              {/* Buttons */}
              <div className="mt-5 flex gap-2.5">
                <button
                  onClick={() => {
                    setLocationModal(false);
                    setLocationError(null);
                  }}
                  disabled={locationLoading}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={requestUserLocation}
                  disabled={locationLoading}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
                  style={{
                    background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                  }}
                >
                  {locationLoading ? (
                    <>
                      <i className="pi pi-spin pi-spinner text-sm" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <i className="pi pi-map-marker text-sm" />
                      Allow Location
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3 text-[10px] text-slate-300">
                Your location is used only for filtering — never stored.
              </p>
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />
      <Footer />
    </div>
  );
}
