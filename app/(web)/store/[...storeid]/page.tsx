"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Button } from "primereact/button";
import { Chip } from "primereact/chip";
import Link from "next/link";
import axiosInstance from "@/service/axios.service";
import { useAppDispatch } from "@/lib/store/hooks";
import { tokenSlice } from "@/lib/store/features/storeToken";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const AUTH_TOKEN_KEY = "login-token";
const AUTH_USER_KEY = "login-user";

interface Product {
  _id: string;
  name: string;
  images: string[];
  description: string;
  sellingPrice: number;
  isActive: boolean;
  isVerified: boolean;
  storeId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
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

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface ReviewUser {
  _id: string;
  name: string;
  email: string;
  picture?: string;
}

interface Review {
  _id: string;
  comment: string;
  rating: number;
  userId: ReviewUser;
  createdAt: string;
  updatedAt: string;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  submitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
}

interface Address {
  area: string;
  state: string;
  country: string;
}

interface Timing {
  open: string;
  close: string;
}

interface TimingByDay {
  [key: string]: string;
}

interface Store {
  _id: string;
  storeName: string;
  storeType?: string;
  userId: User;
  address: Address;
  timing: Timing;
  timingByDay?: TimingByDay;
  images: string[];
  lat: number;
  long: number;
  contactNo: string;
  whatsappNo: string;
  email: string;
  website: string;
  description: string;
  gstin?: string;
  isActive: boolean;
  isVerify: boolean;
  reviews: any[];
  createdAt: string;
  updatedAt: string;
  storeUniqueId: string;
  __v: number;
}

interface StoreDetailsResponse {
  store: Store;
  totalProducts: number;
  products: Product[];
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  picture?: string;
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const readStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

const normalizeUser = (user: any): AuthUser => ({
  id: user?.id || user?._id || "",
  name: user?.name || user?.email || "User",
  email: user?.email || "",
  role: user?.role,
  picture: user?.picture,
});

const parseStoreTimeToMinutes = (value: string) => {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || "0");
  const period = match[3];
  if (period === "AM") {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }
  return hours * 60 + minutes;
};

const isStoreOpenNow = (openTime: string, closeTime: string) => {
  const openMinutes = parseStoreTimeToMinutes(openTime);
  const closeMinutes = parseStoreTimeToMinutes(closeTime);
  if (openMinutes === null || closeMinutes === null) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (openMinutes === closeMinutes) return true;
  if (openMinutes < closeMinutes)
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
};

const buildWhatsAppShareUrl = (phoneNumber: string, message: string) => {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const normalizedPhone = digitsOnly.startsWith("91")
    ? digitsOnly
    : `91${digitsOnly}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

const trackStoreAction = async (
  storeId: string,
  actionType: "WEBSITE" | "WHATSAPP" | "CALL" | "DIRECTION" | "SHARE",
) => {
  try {
    await axiosInstance.post("/api/store-action", { storeId, actionType });
  } catch (error) {
    console.log("Error Fetching data....", error);
  }
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "ST";

const getAverageRating = (reviews: any[]) => {
  if (!reviews || reviews.length === 0) return 0;
  const total = reviews.reduce(
    (sum, review) => sum + (Number(review?.rating) || 0),
    0,
  );
  return total / reviews.length;
};

const formatReviewDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const renderRatingStars = (rating: number, size = "9px") =>
  Array.from({ length: 5 }, (_, index) => (
    <i
      key={index}
      className={`pi pi-star-fill ${index < Math.round(rating) ? "text-amber-400" : "text-slate-200"}`}
      style={{ fontSize: size }}
    />
  ));

// ─── Image Grid Gallery ────────────────────────────────────────────────────────
interface ImageGalleryProps {
  images: string[];
  storeName: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, storeName }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  }, [lightboxIndex, images.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  }, [lightboxIndex, images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  if (!images || images.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white">
        <div className="text-center">
          <div className="text-5xl font-black tracking-widest">
            {getInitials(storeName)}
          </div>
          <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-white/70">
            No photos available
          </p>
        </div>
      </div>
    );
  }

  const visibleImages = images.slice(0, 5);
  const remainingCount = images.length - 5;

  return (
    <>
      {/* Grid Layout */}
      <div className="overflow-hidden rounded-2xl">
        {images.length === 1 ? (
          <div
            className="relative h-64 w-full cursor-pointer overflow-hidden sm:h-80 lg:h-96"
            onClick={() => openLightbox(0)}
          >
            <img
              src={images[0]}
              alt={storeName}
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
              onError={(e: any) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <i className="pi pi-images text-xs" /> See photo
            </div>
          </div>
        ) : images.length === 2 ? (
          <div className="grid h-64 grid-cols-2 gap-1 sm:h-80">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative cursor-pointer overflow-hidden"
                onClick={() => openLightbox(i)}
              >
                <img
                  src={img}
                  alt={`${storeName} ${i + 1}`}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  onError={(e: any) => {
                    e.target.src =
                      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=400&fit=crop";
                  }}
                />
                <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
              </div>
            ))}
          </div>
        ) : (
          /* Mobile-first gallery: one hero image on phones, mosaic on md+ */
          <div className="grid h-64 grid-cols-1 gap-1 sm:h-80 md:grid-cols-2">
            {/* Main large image */}
            <div
              className="relative h-full cursor-pointer overflow-hidden rounded-2xl md:rounded-l-2xl md:rounded-r-none"
              onClick={() => openLightbox(0)}
            >
              <img
                src={visibleImages[0]}
                alt={`${storeName} 1`}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
                onError={(e: any) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop";
                }}
              />
              <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
              <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <i className="pi pi-images mr-1 text-xs" />
                {storeName}
              </div>
            </div>

            {/* Right grid — only render available images */}
            <div
              className={`hidden gap-1 md:grid ${
                visibleImages.slice(1).length === 1
                  ? "grid-cols-1 grid-rows-1"
                  : visibleImages.slice(1).length === 2
                    ? "grid-cols-1 grid-rows-2"
                    : "grid-cols-2 grid-rows-2"
              }`}
            >
              {visibleImages.slice(1).map((img, idx) => {
                const pos = idx + 1;
                const isLast =
                  idx === visibleImages.slice(1).length - 1 &&
                  remainingCount > 0;
                return (
                  <div
                    key={pos}
                    className={`relative cursor-pointer overflow-hidden ${
                      idx === 0 ? "rounded-tr-2xl" : ""
                    } ${
                      idx === visibleImages.slice(1).length - 1
                        ? "rounded-br-2xl"
                        : ""
                    }`}
                    onClick={() => openLightbox(pos)}
                  >
                    <img
                      src={img}
                      alt={`${storeName} ${pos + 1}`}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      onError={(e: any) => {
                        e.target.src =
                          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop";
                      }}
                    />
                    {isLast ? (
                      <div className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/55 backdrop-blur-[2px] transition hover:bg-black/65">
                        <i className="pi pi-images text-2xl text-white" />
                        <p className="mt-1 text-sm font-bold text-white">
                          +{remainingCount + 1} photos
                        </p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* See all photos button */}
        {images.length > 1 && (
          <button
            onClick={() => openLightbox(0)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
          >
            <i className="pi pi-images text-amber-500" />
            See all {images.length} photos
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
        >
          <button
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
            onClick={closeLightbox}
          >
            <i className="pi pi-times text-lg" />
          </button>

          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            {lightboxIndex + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <button
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
            >
              <i className="pi pi-chevron-left text-lg" />
            </button>
          )}

          <div
            className="mx-16 flex max-h-[85vh] max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIndex]}
              alt={`${storeName} ${lightboxIndex + 1}`}
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              onError={(e: any) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop";
              }}
            />
          </div>

          {images.length > 1 && (
            <button
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
            >
              <i className="pi pi-chevron-right text-lg" />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto px-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                  className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === lightboxIndex
                      ? "border-amber-400 opacity-100"
                      : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <img
                    src={img}
                    alt={`thumb ${i}`}
                    className="h-full w-full object-cover"
                    onError={(e: any) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=100&h=100&fit=crop";
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ─── Product Card ──────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  storeWhatsapp: string;
  storeName: string;
  onAddToCart: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  storeWhatsapp,
  storeName,
  onAddToCart,
}) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const images = product.images?.length > 0 ? product.images : [];

  return (
    <>
      <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        {/* Image */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 lg:h-44">
          {images.length > 0 ? (
            <>
              <img
                src={images[imageIndex]}
                alt={product.name}
                className="h-full w-full cursor-pointer object-cover transition duration-500 group-hover:scale-105"
                onClick={() => setLightboxOpen(true)}
                onError={(e: any) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=400&fit=crop";
                }}
              />
              {images.length > 1 && (
                <>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImageIndex(i)}
                        className={`h-1.5 rounded-full transition-all duration-200 ${
                          i === imageIndex
                            ? "w-4 bg-white"
                            : "w-1.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setImageIndex(
                        (imageIndex - 1 + images.length) % images.length,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/60"
                  >
                    <i className="pi pi-chevron-left text-xs" />
                  </button>
                  <button
                    onClick={() =>
                      setImageIndex((imageIndex + 1) % images.length)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/60"
                  >
                    <i className="pi pi-chevron-right text-xs" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div
              className="flex h-full items-center justify-center cursor-pointer"
              onClick={() => setModalOpen(true)}
            >
              <div className="text-5xl font-black text-amber-300">
                {product.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {product.isVerified && (
              <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                Verified
              </span>
            )}
            {!product.isActive && (
              <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                Unavailable
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
            {product.name}
          </h4>

          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                Price
              </span>
              <span className="text-base font-black text-amber-600">
                ₹{product.sellingPrice.toLocaleString("en-IN")}
              </span>
            </div>
            {images.length > 1 && (
              <button
                onClick={() => setLightboxOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400 transition hover:bg-slate-100"
              >
                <i className="pi pi-images text-[10px]" />
                {images.length}
              </button>
            )}
          </div>

          {/* View Product Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:opacity-90"
            style={{ background: "linear-gradient(110deg, #1a3a6b, #2196d3)" }}
          >
            <i className="pi pi-eye text-xs" />
            View Product
          </button>
        </div>
      </article>

      {/* ── Product Detail Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient bar */}
            <div
              className="h-1 w-full"
              style={{
                background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
              }}
            />

            {/* Close */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow border border-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <i className="pi pi-times text-sm" />
            </button>

            {/* Image */}
            <div className="relative h-48 w-full overflow-hidden bg-slate-100">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[imageIndex]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(e: any) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=400&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Image nav dots */}
                  {images.length > 1 && (
                    <>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setImageIndex(i)}
                            className={`h-1.5 rounded-full transition-all ${
                              i === imageIndex
                                ? "w-4 bg-white"
                                : "w-1.5 bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setImageIndex(
                            (imageIndex - 1 + images.length) % images.length,
                          )
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition"
                      >
                        <i className="pi pi-chevron-left text-xs" />
                      </button>
                      <button
                        onClick={() =>
                          setImageIndex((imageIndex + 1) % images.length)
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition"
                      >
                        <i className="pi pi-chevron-right text-xs" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <span className="text-6xl font-black text-slate-300">
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute left-3 top-3 flex gap-1.5">
                {product.isVerified && (
                  <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white shadow">
                    ✓ Verified
                  </span>
                )}
                {!product.isActive && (
                  <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    Unavailable
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pt-4 pb-5 space-y-4">
              {/* Name + Price row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                    {storeName}
                  </p>
                  <h2 className="text-lg font-black text-slate-900 leading-tight line-clamp-2">
                    {product.name}
                  </h2>
                </div>
                <div className="shrink-0 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 leading-none mb-0.5">
                    Price
                  </p>
                  <p className="text-lg font-black text-amber-600 leading-none">
                    ₹{product.sellingPrice.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                    Description
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* WhatsApp */}

                <a
                  href={buildWhatsAppShareUrl(
                    storeWhatsapp,
                    `Hi, I am interested in *${product.name}* from *${storeName}*.\n\n${product.description ? product.description + "\n\n" : ""}Price: ₹${product.sellingPrice}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
                >
                  <i className="pi pi-whatsapp text-base" />
                  WhatsApp
                </a>

                {/* Call */}

                <a
                  href={`tel:${storeWhatsapp}`}
                  className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition active:scale-95"
                  style={{
                    background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                  }}
                >
                  <i className="pi pi-phone text-base" />
                  Call Store
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[1003] flex items-center justify-center bg-black/95"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            onClick={() => setLightboxOpen(false)}
          >
            <i className="pi pi-times text-lg" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white">
            {imageIndex + 1} / {images.length}
          </div>
          {images.length > 1 && (
            <button
              className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((imageIndex - 1 + images.length) % images.length);
              }}
            >
              <i className="pi pi-chevron-left text-lg" />
            </button>
          )}
          <div
            className="mx-16 max-h-[85vh] max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[imageIndex]}
              alt={product.name}
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              onError={(e: any) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=600&fit=crop";
              }}
            />
          </div>
          {images.length > 1 && (
            <button
              className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((imageIndex + 1) % images.length);
              }}
            >
              <i className="pi pi-chevron-right text-lg" />
            </button>
          )}
        </div>
      )}
    </>
  );
};

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  storeName,
  onSubmit,
  submitting,
  submitError,
  submitSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (submitSuccess) {
      const t = setTimeout(() => {
        onClose();
        setRating(0);
        setComment("");
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [submitSuccess, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ratingLabels: Record<number, { label: string; color: string }> = {
    1: { label: "Poor", color: "text-red-500" },
    2: { label: "Fair", color: "text-orange-500" },
    3: { label: "Good", color: "text-yellow-500" },
    4: { label: "Very Good", color: "text-lime-500" },
    5: { label: "Excellent", color: "text-emerald-500" },
  };

  const active = hoveredRating || rating;

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
          style={{ background: "linear-gradient(110deg, #eef4ff, #f0f6ff)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl shadow-sm"
              style={{
                background: "linear-gradient(135deg, #1a3a6b, #2196d3)",
              }}
            >
              <i className="pi pi-star-fill text-white text-xs" />
            </div>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest leading-none"
                style={{ color: "#1a3a6b" }}
              >
                Rate & Review
              </p>
              <h2
                id="review-modal-title"
                className="text-sm font-black text-slate-900 leading-tight truncate max-w-[200px]"
              >
                {storeName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-400 border border-slate-200 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <i className="pi pi-times text-xs" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3.5">
          {/* Star Rating */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Your Rating
            </p>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <i
                    className={`pi pi-star-fill text-[9px] transition-colors duration-150 ${
                      star <= active ? "text-amber-400" : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {active ? (
              <p
                className={`mt-1.5 text-xs font-bold ${ratingLabels[active].color}`}
              >
                {ratingLabels[active].label}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-300">
                Tap a star to rate
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 pt-3 pb-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Your Review
            </p>
            <textarea
              value={comment}
              onChange={(e) => {
                if (e.target.value.length <= 500) setComment(e.target.value);
              }}
              placeholder="Share your experience with this store..."
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-slate-800 placeholder-slate-300 focus:outline-none"
              rows={3}
            />
            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 mt-1">
              <span className="text-[10px] text-slate-300">
                {comment.length === 0 ? "Min 1 character" : ""}
              </span>
              <span
                className={`text-[10px] font-semibold ${comment.length >= 450 ? "text-orange-500" : "text-slate-300"}`}
              >
                {comment.length}/500
              </span>
            </div>
          </div>

          {/* Error / Success */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 text-xs font-semibold text-red-600">
              <i className="pi pi-exclamation-circle shrink-0" />
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 text-xs font-semibold text-emerald-600">
              <i className="pi pi-check-circle shrink-0" />
              {submitSuccess}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:border-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={async () => await onSubmit(rating, comment)}
            disabled={submitting || rating === 0 || comment.trim().length === 0}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(110deg, #1a3a6b, #2196d3)" }}
          >
            {submitting ? (
              <>
                <i className="pi pi-spin pi-spinner text-sm" />
                Posting...
              </>
            ) : (
              <>
                <i className="pi pi-send text-sm" />
                Post Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function RelatedStoresSlider({
  stores,
  loading,
}: {
  stores: any[];
  loading: boolean;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const CARD_WIDTH = 220; // px — card width + gap

  const startAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      if (!sliderRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 10;
      sliderRef.current.scrollTo({
        left: atEnd ? 0 : scrollLeft + CARD_WIDTH,
        behavior: "smooth",
      });
    }, 2800);
  }, []);

  useEffect(() => {
    if (!loading && stores.length > 1) startAuto();
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [loading, stores.length, startAuto]);

  const scroll = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: dir === "left" ? -CARD_WIDTH * 2 : CARD_WIDTH * 2,
      behavior: "smooth",
    });
    startAuto(); // reset timer on manual scroll
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, #1a3a6b, #2196d3)" }}
          >
            <i className="pi pi-th-large text-white text-xs" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            Related Stores
          </h2>
          {!loading && (
            <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-500">
              {stores.length} found
            </span>
          )}
        </div>

        {/* Scroll arrows */}
        {!loading && stores.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition"
            >
              <i className="pi pi-chevron-left text-[11px] text-slate-500" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition"
            >
              <i className="pi pi-chevron-right text-[11px] text-slate-500" />
            </button>
          </div>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-white to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-white to-transparent" />

        <div
          ref={sliderRef}
          className="flex gap-3 overflow-x-auto scroll-smooth p-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onMouseEnter={() => {
            if (autoRef.current) clearInterval(autoRef.current);
          }}
          onMouseLeave={() => {
            if (!loading && stores.length > 1) startAuto();
          }}
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse shrink-0 rounded-xl border border-slate-100 overflow-hidden"
                  style={{ width: 200 }}
                >
                  <div className="h-32 bg-slate-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-3/4 rounded-full bg-slate-100" />
                    <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
                    <div className="h-2.5 w-2/3 rounded-full bg-slate-100" />
                  </div>
                </div>
              ))
            : stores.map((rs) => {
                const rsRating =
                  rs.reviews?.length > 0
                    ? rs.reviews.reduce(
                        (sum: number, r: any) => sum + (Number(r.rating) || 0),
                        0,
                      ) / rs.reviews.length
                    : 0;
                const rsOpen = isStoreOpenNow(
                  rs.timing?.open || "",
                  rs.timing?.close || "",
                );
                const rsLocation = [rs.address?.area, rs.address?.state]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Link key={rs._id} href={`/store/${rs._id}`}>
                    <article
                      className="group flex shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                      style={{ width: 200 }}
                    >
                      {/* Image */}
                      <div className="relative h-32 overflow-hidden bg-slate-100">
                        {rs.images?.[0] ? (
                          <img
                            src={rs.images[0]}
                            alt={rs.storeName}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            onError={(e: any) => {
                              e.target.src =
                                "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                            <span className="text-2xl font-black">
                              {getInitials(rs.storeName)}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                        {/* Open/Closed */}
                        <div
                          className={`absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            rsOpen
                              ? "bg-emerald-500 text-white"
                              : "bg-black/60 text-slate-300"
                          }`}
                        >
                          <span
                            className={`h-1 w-1 rounded-full ${rsOpen ? "bg-white" : "bg-slate-400"}`}
                          />
                          {rsOpen ? "Open" : "Closed"}
                        </div>

                        {/* Verified */}
                        {rs.isVerify && (
                          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow">
                            <i className="pi pi-verified text-[9px] text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-1 flex-col gap-1.5 p-3">
                        <h4 className="line-clamp-1 text-[13px] font-bold leading-snug text-slate-900">
                          {rs.storeName}
                        </h4>

                        {rs.storeType && (
                          <p className="truncate text-[10px] font-medium text-slate-400">
                            {rs.storeType}
                          </p>
                        )}

                        {/* Stars */}
                        <div className="flex items-center gap-1">
                          <div className="flex">
                            {Array.from({ length: 5 }, (_, i) => (
                              <i
                                key={i}
                                className={`pi pi-star-fill text-[9px] ${
                                  i < Math.round(rsRating)
                                    ? "text-amber-400"
                                    : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400">
                            {rsRating > 0 ? rsRating.toFixed(1) : "—"}
                            {rs.reviews?.length > 0 && (
                              <span className="text-slate-300">
                                {" "}
                                ({rs.reviews.length})
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Location */}
                        <p className="mt-auto truncate text-[10px] text-slate-400 flex items-center gap-1">
                          <i className="pi pi-map-marker text-[9px] text-slate-300" />
                          {rsLocation || "Location not set"}
                        </p>
                      </div>
                    </article>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StoreDetails() {
  const params = useParams();
  const storeId = params?.storeid?.[0];
  const dispatch = useAppDispatch();
  const [ads, setAds] = useState<ProductAd[]>([]);
  const [relatedStores, setRelatedStores] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [visibleProductCount, setVisibleProductCount] = useState(9);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(
    null,
  );
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState<string | null>(
    null,
  );
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "reviews" | "hours">(
    "products",
  );
  const [adsLoading, setAdsLoading] = useState(true);
  const adsScrollRef = useRef<HTMLDivElement>(null);
  const scrollAds = (dir: "left" | "right") => {
    adsScrollRef.current?.scrollBy({
      left: dir === "right" ? 200 : -200,
      behavior: "smooth",
    });
  };

  const fetchReviews = async (currentStoreId: string) => {
    const reviewResponse = await axiosInstance.get(
      `/api/review/store-reviews/${currentStoreId}`,
    );
    setReviews(reviewResponse.data?.reviews || []);
  };

  const syncAuthState = async () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = readStoredUser();
    if (!token) {
      setAuthUser(null);
      setAuthReady(true);
      return;
    }
    dispatch(tokenSlice.actions.saveToken(token));
    if (storedUser?.name) {
      setAuthUser(storedUser);
      setAuthReady(true);
      return;
    }
    try {
      const response = await axiosInstance.get("/api/login/profile-page");
      const resolvedUser = normalizeUser(response.data?.user);
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(resolvedUser));
      setAuthUser(resolvedUser);
    } catch {
      setAuthUser(null);
    } finally {
      setAuthReady(true);
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    const token = response.credential;
    if (!token) return;
    setGoogleLoading(true);
    try {
      const result = await axiosInstance.post(
        "/api/login/continue-with-google",
        { token },
      );
      const accessToken = result.data.token;
      const normalizedUser = normalizeUser(result.data.user);
      dispatch(tokenSlice.actions.saveToken(accessToken));
      window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
      window.localStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify(normalizedUser),
      );
      setAuthUser(normalizedUser);
      window.dispatchEvent(new Event("auth-changed"));
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void syncAuthState();
    const handleAuthChanged = () => void syncAuthState();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY)
        void syncAuthState();
    };
    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!storeId) return;
    setRelatedLoading(true);
    axiosInstance
      .get(`/api/register/related-stores/${storeId}`)
      .then((res) => setRelatedStores(res.data.stores || []))
      .catch(() => setRelatedStores([]))
      .finally(() => setRelatedLoading(false));
  }, [storeId]);

  useEffect(() => {
    axiosInstance
      .get("/api/ads")
      .then((res) => {
        const sorted = (res.data.ads || [])
          .filter((a: ProductAd) => a.isActive && a.productId?.isActive)
          .sort(
            (a: ProductAd, b: ProductAd) => (a.rank ?? 99) - (b.rank ?? 99),
          );
        setAds(sorted);
      })
      .catch(() => setAds([]))
      .finally(() => setAdsLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!adsScrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = adsScrollRef.current;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;
      if (isAtEnd) {
        adsScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        adsScrollRef.current.scrollBy({ left: 190, behavior: "smooth" });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStoreDetails = async () => {
      if (!authReady || !authUser) {
        setLoading(false);
        return;
      }
      if (!storeId) {
        setError("Store not found");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        setReviewsError(null);
        const response = await axiosInstance.get(
          `/api/register/store-with-products/${storeId}`,
        );
        const data: StoreDetailsResponse = response.data;
        setStore(data.store);
        setProducts(data.products || []);
        try {
          await fetchReviews(storeId);
        } catch (reviewErr: any) {
          setReviews([]);
          setReviewsError("Customer comments are temporarily unavailable.");
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            "Failed to load store details. Please try again later.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchStoreDetails();
  }, [storeId, authReady, authUser]);

  if (!mounted || !authReady) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <i
              className="pi pi-spin pi-spinner mb-4 block text-5xl"
              style={{ color: "#2196d3" }}
            />
            <p className="font-semibold text-slate-500">
              Checking sign-in status…
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_28%),linear-gradient(180deg,_#fffdf7_0%,_#ffffff_60%)] text-slate-900">
        <Header />
        <main className="relative flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-16">
          <div className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm" />
          <div className="relative z-40 w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white p-8 shadow-2xl">
            <div className="text-center">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full text-white"
                style={{
                  background: "linear-gradient(135deg, #1a3a6b, #2196d3)",
                }}
              >
                <i className="pi pi-lock text-2xl" />
              </div>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#2196d3" }}
              >
                Sign in required
              </p>
              <h1 className="mt-3 text-2xl font-black text-slate-950">
                View this store
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Store details are private. Sign in with Google to continue.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.error("Google login failed")}
                  text="continue_with"
                  shape="pill"
                  theme="outline"
                  size="large"
                  width="300"
                />
                {googleLoading && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <i className="pi pi-spin pi-spinner" /> Signing in…
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <i
              className="pi pi-spin pi-spinner mb-4 block text-5xl"
              style={{ color: "#2196d3" }}
            />
            <p className="font-semibold text-slate-500">
              Loading store details…
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <i className="pi pi-exclamation-triangle text-3xl text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {error || "Store not found"}
            </p>
            <Link href="/store" className="mt-5 inline-block">
              <Button
                label="Back to Stores"
                icon="pi pi-arrow-left"
                className="border-none bg-slate-900 font-semibold text-white"
              />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!storeId) return;
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      setReviewSubmitError("Please write a comment before submitting.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setReviewSubmitError("Please choose a rating between 1 and 5.");
      return;
    }
    try {
      setReviewSubmitting(true);
      setReviewSubmitError(null);
      setReviewSubmitSuccess(null);
      await axiosInstance.post(`/api/review/add-review/${storeId}`, {
        comment: trimmedComment,
        rating,
      });
      await fetchReviews(storeId);
      setReviewSubmitSuccess("Your review was posted successfully! 🎉");
    } catch (submitErr: any) {
      setReviewSubmitError(
        submitErr?.response?.data?.message ||
          "Failed to submit your review. Please try again.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const storeIsOpenNow = isStoreOpenNow(store.timing.open, store.timing.close);
  const averageRating = getAverageRating(reviews);
  const visibleReviews = reviews.slice(0, 5);
  const hasMoreReviews = reviews.length > visibleReviews.length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f9fa] text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-2 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="min-w-0 space-y-3">
          {/* TOP SECTION — Images + Sidebar side by side */}
          <div className="space-y-3">
            {/* Images + Sidebar + First 3 Products */}
            <div className="grid min-w-0 gap-3 lg:grid-cols-3 items-start">
              {/* LEFT — Images + First 3 Products */}
              <div className="lg:col-span-2 min-w-0 flex flex-col gap-3">
                {/* Images */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <ImageGallery
                    images={store.images}
                    storeName={store.storeName}
                  />
                </div>

                {/* First 3 Products */}
                <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <i
                        className="pi pi-shopping-bag"
                        style={{ color: "#f97316" }}
                      />
                      Products
                      <span className="text-sm font-normal text-slate-500">
                        ({products.length})
                      </span>
                    </h2>
                  </div>

                  {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <i className="pi pi-inbox text-5xl text-slate-200 mb-3" />
                      <p className="text-sm text-slate-400">
                        No products available yet
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {products.slice(0, 9).map((product) => (
                          <ProductCard
                            key={product._id}
                            product={product}
                            storeWhatsapp={store.whatsappNo || store.contactNo}
                            storeName={store.storeName}
                            onAddToCart={() => {}}
                          />
                        ))}
                      </div>

                      {/* Load More Button */}
                      {products.length > 9 && !showAllProducts && (
                        <div className="mt-5 flex justify-center">
                          <button
                            onClick={() => setShowAllProducts(true)}
                            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95"
                            style={{
                              background:
                                "linear-gradient(110deg, #1a3a6b, #2196d3)",
                            }}
                          >
                            <i className="pi pi-plus-circle text-sm" />
                            Load More
                            <span className="text-xs font-normal text-amber-500">
                              ({products.length - 9} remaining)
                            </span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT — Sidebar */}
              <aside className="min-w-0 flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm self-start sticky top-0">
                <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                  <h1 className="text-base font-black text-slate-900 leading-snug">
                    {store.storeName}
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {store.description}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-base font-black text-slate-900">
                      {averageRating.toFixed(1)}
                    </span>
                    <div className="flex gap-0.5">
                      {renderRatingStars(averageRating, "10px")}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      ({reviews.length})
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-slate-100 space-y-2">
                  {store.address?.area && (
                    <div className="flex items-start gap-2">
                      <i className="pi pi-map-marker text-slate-400 text-xs mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {store.address.area}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <i className="pi pi-clock text-slate-400 text-xs shrink-0" />
                    <span
                      className={`text-xs font-semibold ${storeIsOpenNow ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {storeIsOpenNow ? "Open" : "Closed"}
                    </span>
                    <span className="text-xs text-slate-500">
                      · {store.timing.open} - {store.timing.close}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2">
                  {store.website && (
                    <a
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackStoreAction(store._id, "WEBSITE")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
                    >
                      <i className="pi pi-globe text-blue-500 text-xs" />{" "}
                      Website
                    </a>
                  )}
                  {store.whatsappNo && (
                    <a
                      href={buildWhatsAppShareUrl(
                        store.whatsappNo,
                        `Hi, I found your store *${store.storeName}* on AMP Shopping!`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackStoreAction(store._id, "WHATSAPP")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <i className="pi pi-whatsapp text-emerald-500 text-xs" />{" "}
                      WhatsApp
                    </a>
                  )}
                  {store.contactNo && (
                    <a
                      href={`tel:${store.contactNo}`}
                      onClick={() => trackStoreAction(store._id, "CALL")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <i className="pi pi-phone text-blue-500 text-xs" /> Call
                    </a>
                  )}
                  {store.lat && store.long && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.long}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackStoreAction(store._id, "DIRECTION")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="#4285F4"
                        className="h-3.5 w-3.5"
                      >
                        <path
                          d="M12 2L4 10h5v8h6v-8h5L12 2z"
                          transform="rotate(45 12 12)"
                        />
                      </svg>
                      Directions
                    </a>
                  )}
                  <button
                    onClick={() => {
                      trackStoreAction(store._id, "SHARE");
                      setIsShareOpen(true);
                    }}
                    style={{ borderRadius: "9999px" }}
                    className="inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    <i className="pi pi-share-alt text-slate-500 text-xs" />
                    Share
                  </button>
                </div>

                {/* Review List */}
                <div className="divide-y divide-slate-100">
                  <div className="px-4 py-3">
                    <button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95"
                      style={{
                        background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                      }}
                    >
                      <i className="pi pi-star-fill text-[9px]" />
                      Write a Review
                    </button>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <i className="pi pi-star text-[9px] text-slate-200 mb-1" />
                      <p className="text-xs text-slate-400">
                        No reviews yet. Be the first!
                      </p>
                    </div>
                  ) : (
                    <>
                      {visibleReviews.map((review) => (
                        <div
                          key={review._id}
                          className="flex items-start gap-2 px-3 py-2"
                        >
                          <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full mt-0.5">
                            {review.userId.picture ? (
                              <img
                                src={review.userId.picture}
                                alt={review.userId.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[9px] font-bold text-white">
                                {review.userId.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[11px] font-bold text-slate-900 truncate leading-none">
                                {review.userId.name}
                              </p>
                              <p className="text-[9px] text-slate-400 shrink-0 leading-none">
                                {formatReviewDate(review.createdAt)}
                              </p>
                            </div>
                            <div
                              className="flex gap-0.5 mt-0.5 mb-0.5"
                              style={{
                                transform: "scale(0.6)",
                                transformOrigin: "left center",
                              }}
                            >
                              {renderRatingStars(averageRating, "15px")}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                              {review.comment}
                            </p>
                          </div>
                        </div>
                      ))}

                      {reviews.length > 5 && (
                        <button
                          onClick={() => setIsReviewsModalOpen(true)}
                          className="flex w-full items-center justify-center gap-1.5 bg-slate-50 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-amber-50 hover:text-amber-700"
                        >
                          <i className="pi pi-eye text-[10px]" />
                          See all {reviews.length} reviews
                        </button>
                      )}
                    </>
                  )}
                </div>

                {(adsLoading || ads.length > 0) && (
                  <div className="border-t border-slate-100 overflow-hidden">
                    {/* Animated Sponsored Header */}
                    <div
                      className="relative flex items-center justify-between px-3 py-2 overflow-hidden"
                      style={{
                        background: "linear-gradient(110deg, #1a3a6b, #2196d3)",
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
                          animation: "adShimmer 2.5s ease-in-out infinite",
                        }}
                      />
                      <div className="flex items-center gap-1.5 relative z-10">
                        <span className="relative flex h-2 w-2">
                          <span
                            className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"
                            style={{
                              animation:
                                "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
                            }}
                          />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
                        </span>
                        <span
                          className="text-[10px] font-black uppercase tracking-widest text-white"
                          style={{
                            animation: "sponsoredPulse 3s ease-in-out infinite",
                          }}
                        >
                          Sponsored
                        </span>
                      </div>
                      <span
                        className="relative z-10 rounded bg-amber-400 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-900"
                        style={{ animation: "adBlink 2s ease-in-out infinite" }}
                      >
                        AD
                      </span>
                    </div>

                    <style>{`
      @keyframes adShimmer {
        0%   { transform: translateX(-100%); }
        60%  { transform: translateX(100%); }
        100% { transform: translateX(100%); }
      }
      @keyframes sponsoredPulse {
        0%, 100% { opacity: 1;   letter-spacing: 0.15em; }
        50%       { opacity: 0.7; letter-spacing: 0.22em; }
      }
      @keyframes adBlink {
        0%, 100% { opacity: 1;   transform: scale(1); }
        40%       { opacity: 0.5; transform: scale(0.92); }
        60%       { opacity: 1;   transform: scale(1.08); }
      }
      @keyframes ping {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
      @keyframes adCardIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes imgPulse {
        0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(33,150,211,0); }
        50%       { transform: scale(1.07); box-shadow: 0 0 0 4px rgba(33,150,211,0.18); }
      }
      @keyframes namePulse {
        0%, 100% { transform: scale(1);    opacity: 1; }
        50%       { transform: scale(1.04); opacity: 0.75; }
      }
    `}</style>

                    <div className="divide-y divide-slate-100">
                      {adsLoading
                        ? Array.from({ length: 2 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex gap-2.5 px-3 py-2.5 animate-pulse"
                            >
                              <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100" />
                              <div className="flex-1 space-y-1.5 py-0.5">
                                <div className="h-2 w-12 rounded-full bg-slate-100" />
                                <div className="h-2.5 w-3/4 rounded-full bg-slate-100" />
                                <div className="h-2 w-1/2 rounded-full bg-slate-100" />
                              </div>
                            </div>
                          ))
                        : ads.slice(0, 5).map((ad, idx) => {
                            const product = ad.productId;
                            const productImage = product.images?.[0];
                            const storeLink = product.storeId
                              ? `/store/${product.storeId._id}`
                              : undefined;

                            // Each card gets its own staggered animation delay
                            const imgDelay = `${idx * 400}ms`;
                            const nameDelay = `${idx * 400 + 200}ms`;

                            const cardContent = (
                              <div
                                className="group relative flex gap-2.5 px-3 py-2.5 transition-all duration-200 hover:bg-amber-50"
                                style={{
                                  animation: "adCardIn 0.4s ease both",
                                  animationDelay: `${idx * 80}ms`,
                                }}
                              >
                                {/* Left accent bar on hover */}
                                <div
                                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                  style={{
                                    background:
                                      "linear-gradient(180deg, #1a3a6b, #2196d3)",
                                  }}
                                />

                                {/* Image — scale pulse */}
                                <div
                                  className="relative shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-sm"
                                  style={{
                                    width: 56,
                                    height: 56,
                                    animation: `imgPulse 2.8s ease-in-out infinite`,
                                    animationDelay: imgDelay,
                                  }}
                                >
                                  {productImage ? (
                                    <img
                                      src={productImage}
                                      alt={product.name}
                                      className="h-full w-full object-cover"
                                      onError={(e: any) => {
                                        e.target.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
                                      <i className="pi pi-box text-lg text-amber-300" />
                                    </div>
                                  )}
                                  {product.isVerified && (
                                    <div className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 shadow">
                                      <i className="pi pi-check text-[7px] text-white" />
                                    </div>
                                  )}
                                </div>

                                {/* Text */}
                                <div className="min-w-0 flex-1">
                                  {product.storeId && (
                                    <p className="truncate text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                                      {product.storeId.storeName}
                                    </p>
                                  )}

                                  {/* Product name — scale + opacity pulse */}
                                  <p
                                    className="line-clamp-1 text-[12px] font-bold leading-tight text-slate-800 transition-colors group-hover:text-blue-700"
                                    style={{
                                      display: "inline-block",
                                      animation: `namePulse 2.8s ease-in-out infinite`,
                                      animationDelay: nameDelay,
                                      transformOrigin: "left center",
                                    }}
                                  >
                                    {product.name}
                                  </p>

                                  {product.description && (
                                    <p className="line-clamp-1 text-[10px] text-slate-400 mt-0.5">
                                      {product.description}
                                    </p>
                                  )}

                                  <div className="mt-1 flex items-center justify-between">
                                    {product.sellingPrice !== undefined && (
                                      <span className="text-[11px] font-black text-amber-600">
                                        ₹
                                        {product.sellingPrice.toLocaleString(
                                          "en-IN",
                                        )}
                                      </span>
                                    )}
                                    {storeLink && (
                                      <span className="flex items-center gap-0.5 text-[9px] font-semibold text-blue-500 transition-all group-hover:gap-1.5 group-hover:underline">
                                        View{" "}
                                        <i className="pi pi-arrow-right text-[8px]" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );

                            return storeLink ? (
                              <a
                                key={ad._id}
                                href={storeLink}
                                className="block"
                              >
                                {cardContent}
                              </a>
                            ) : (
                              <div key={ad._id}>{cardContent}</div>
                            );
                          })}
                    </div>

                    {!adsLoading && ads.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-center">
                        <p className="text-[9px] text-slate-300">
                          Sponsored · AMP Shopping
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </div>

            {/* FULL WIDTH — Remaining Products after Load More */}
            {showAllProducts && products.length > 9 && (
              <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
                <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <i
                      className="pi pi-shopping-bag"
                      style={{ color: "#f97316" }}
                    />
                    More Products
                  </h2>
                  <button
                    onClick={() => setShowAllProducts(false)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <i className="pi pi-chevron-up text-xs" /> Show less
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {products.slice(9).map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      storeWhatsapp={store.whatsappNo || store.contactNo}
                      storeName={store.storeName}
                      onAddToCart={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Share Modal */}
          {isShareOpen && (
            <div
              className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={() => setIsShareOpen(false)}
            >
              <div
                className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h2 className="text-base font-black text-slate-900">Share</h2>
                  <button
                    onClick={() => setIsShareOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  >
                    <i className="pi pi-times text-sm" />
                  </button>
                </div>

                {/* Share Options */}
                <div className="px-2 py-2 divide-y divide-slate-100">
                  {/* Facebook */}

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 px-3 py-3 rounded-xl transition hover:bg-slate-50"
                    onClick={() => setIsShareOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]">
                      <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">
                      Facebook
                    </span>
                  </a>

                  {/* WhatsApp */}

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Check out ${store.storeName} on AMP Shopping!\n${window.location.href}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 px-3 py-3 rounded-xl transition hover:bg-slate-50"
                    onClick={() => setIsShareOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]">
                      <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">
                      WhatsApp
                    </span>
                  </a>

                  {/* X (Twitter) */}

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${store.storeName} on AMP Shopping!`)}&url=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 px-3 py-3 rounded-xl transition hover:bg-slate-50"
                    onClick={() => setIsShareOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black">
                      <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">
                      X
                    </span>
                  </a>
                </div>

                {/* Copy Link */}
                <div className="px-5 pb-5 pt-2">
                  <p className="text-xs text-slate-400 mb-2">
                    Click to copy link
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100"
                  >
                    <span className="flex-1 truncate text-left text-xs text-slate-600">
                      {window.location.href}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-bold transition ${copied ? "text-emerald-500" : "text-blue-500"}`}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Map Modal */}
          {isMapOpen && store.lat && store.long && (
            <div
              className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/70 px-4 py-6"
              onClick={() => setIsMapOpen(false)}
            >
              <div
                className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#1a3a6b" }}
                    >
                      Store Location
                    </p>
                    <h2 className="mt-0.5 text-lg font-black text-slate-900">
                      {store.storeName}
                    </h2>
                    {store.address?.area && (
                      <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
                        <i className="pi pi-map-marker text-slate-400 text-[10px]" />
                        {store.address.area}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsMapOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                  >
                    <i className="pi pi-times text-lg" />
                  </button>
                </div>

                {/* Google Maps Embed */}
                <div className="relative h-[380px] w-full bg-slate-100">
                  <iframe
                    title={`Map for ${store.storeName}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                      `${store.storeName}, ${store.address?.area || ""}, ${store.address?.state || ""}, India`,
                    )}&hl=en&z=17&output=embed`}
                  />
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      `${store.storeName}, ${store.address?.area || ""}, ${store.address?.state || ""}, India`,
                    )}&destination_place_id=${store.lat},${store.long}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                  >
                    <i className="pi pi-send text-sm" />
                    Get Directions
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(
                      `${store.storeName}, ${store.address?.area || ""}, ${store.address?.state || ""}, India`,
                    )}/@${store.lat},${store.long},17z`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <i className="pi pi-external-link text-sm" />
                    Open in Maps
                  </a>
                </div>
              </div>
            </div>
          )}

          {authUser && (
            <ReviewModal
              isOpen={isReviewModalOpen}
              onClose={() => {
                setIsReviewModalOpen(false);
                setReviewSubmitError(null);
                setReviewSubmitSuccess(null);
              }}
              storeName={store.storeName}
              onSubmit={handleSubmitReview}
              submitting={reviewSubmitting}
              submitError={reviewSubmitError}
              submitSuccess={reviewSubmitSuccess}
            />
          )}

          {isReviewsModalOpen && (
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reviews-modal-title"
              onClick={() => setIsReviewsModalOpen(false)}
            >
              <div
                className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#2196d3" }}
                    >
                      Customer reviews
                    </p>
                    <h2
                      id="reviews-modal-title"
                      className="mt-1 text-xl font-black text-slate-900"
                    >
                      All reviews
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {reviews.length} review{reviews.length === 1 ? "" : "s"}{" "}
                      total
                    </p>
                  </div>
                  <button
                    onClick={() => setIsReviewsModalOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                    aria-label="Close reviews modal"
                  >
                    <i className="pi pi-times text-lg" />
                  </button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto divide-y divide-slate-100">
                  {reviews.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <i className="pi pi-star text-[9px] text-slate-200" />
                      <p className="mt-3 text-sm text-slate-500">
                        No reviews yet.
                      </p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div
                        key={review._id}
                        className="flex items-start gap-2.5 px-4 py-2.5"
                      >
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full mt-0.5">
                          {review.userId.picture ? (
                            <img
                              src={review.userId.picture}
                              alt={review.userId.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white">
                              {review.userId.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-bold text-slate-900 leading-none">
                              {review.userId.name}
                            </p>
                            <p className="shrink-0 text-[10px] text-slate-400 leading-none">
                              {formatReviewDate(review.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-0.5 mt-[2px]">
                            {renderRatingStars(averageRating, "15px")}
                          </div>
                          <p className="text-xs leading-snug text-slate-600 mt-[2px]">
                            {review.comment}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Related Stores ── */}
          {(relatedLoading || relatedStores.length > 0) && (
            <RelatedStoresSlider
              stores={relatedStores}
              loading={relatedLoading}
            />
          )}

          {/* ADS — full width, দুই column জুড়ে */}
          {/* ADS SECTION — Dynamic */}
        </div>
      </main>

      <Footer />
    </div>
  );
}
