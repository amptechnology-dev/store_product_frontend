"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoreOption = {
  _id: string;
  storeName: string;
  storeType?: string;
  images?: string[];
  address?: { area?: string; state?: string };
};

type ProductOption = {
  _id: string;
  name: string;
  images?: string[];
  sellingPrice?: number;
  isActive?: boolean;
};

type AdsFormProps = {
  adId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdsForm({ adId, onClose, onSuccess }: AdsFormProps) {
  const isEditMode = !!adId;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [rank, setRank] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // ── Store search ────────────────────────────────────────────────────────────
  const [allStores, setAllStores] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);
  const storeRef = useRef<HTMLDivElement>(null);

  // ── Product state ───────────────────────────────────────────────────────────
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const productRef = useRef<HTMLDivElement>(null);

  // ── Fetch all stores on mount ───────────────────────────────────────────────
  useEffect(() => {
    setStoresLoading(true);
    axiosInstance
      .get("/api/register/public-all-stores")
      .then((res) => setAllStores(res.data.stores || []))
      .catch(() => toast.error("Failed to load stores"))
      .finally(() => setStoresLoading(false));
  }, []);

  // ── Fetch products when store selected ─────────────────────────────────────
  useEffect(() => {
  if (!selectedStore) {
    if (!adId) {
      setProducts([]);
      setSelectedProduct(null);
      setProductSearch("");
    }
    return;
  }

  // Edit mode-এ initial load হয়ে গেলে skip — শুধু user manually store change করলে reload
  if (adId && products.length > 0) return;

  setProductsLoading(true);
  axiosInstance
    .get(`/api/register/store-with-products/${selectedStore._id}`)
    .then((res) => setProducts(res.data.products || []))
    .catch(() => {
      toast.error("Failed to load products");
      setProducts([]);
    })
    .finally(() => setProductsLoading(false));
}, [selectedStore]);

  // ── Edit mode — fetch existing ad ──────────────────────────────────────────
  useEffect(() => {
  if (!adId) return;
  setFormLoading(true);
  axiosInstance
    .get(`/api/ads/${adId}`)
    .then((res) => {
      const ad = res.data.ads;
      setRank(ad.rank ?? null);
      setIsActive(ad.isActive ?? true);
      if (ad.expiryDate) setExpiryDate(ad.expiryDate.split("T")[0]);

      const storeId =
        typeof ad.storeId === "object" ? ad.storeId?._id : ad.storeId;
      const productId =
        typeof ad.productId === "object" ? ad.productId?._id : ad.productId;

      if (!storeId) return;

      // ── Store + Products একসাথে fetch ──
      setProductsLoading(true);
      axiosInstance
        .get(`/api/register/store-with-products/${storeId}`)
        .then((res) => {
          const store = res.data.store;
          const loadedProducts: ProductOption[] = res.data.products || [];

          // Store set
          if (store) {
            setSelectedStore(store);
            setStoreSearch(store.storeName);
          }

          // Products set
          setProducts(loadedProducts);

          // Selected product match
          if (productId) {
            const matched = loadedProducts.find((p) => p._id === productId);
            if (matched) {
              setSelectedProduct(matched);
              setProductSearch(matched.name);
            }
          }
        })
        .catch(() => toast.error("Failed to load store & products"))
        .finally(() => setProductsLoading(false));
    })
    .catch((err) => {
      toast.error(err.response?.data?.message || "Failed to fetch ad");
      onClose();
    })
    .finally(() => setFormLoading(false));
}, [adId]);

  // ── Close dropdowns on outside click ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (storeRef.current && !storeRef.current.contains(e.target as Node))
        setStoreDropdownOpen(false);
      if (productRef.current && !productRef.current.contains(e.target as Node))
        setProductDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredStores = allStores.filter((s) =>
    s.storeName.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedStore) return toast.error("Please select a store");
  if (!selectedProduct) return toast.error("Please select a product");
  if (!expiryDate) return toast.error("Please set an expiry date");

  setIsSubmitting(true);
  try {
    const payload = {
      productId: selectedProduct._id,
      storeId: selectedStore._id,  // ← এটা add হলো
      rank: rank ?? undefined,
      expiryDate,
      isActive,
    };
    const url = isEditMode ? `/api/ads/${adId}` : `/api/ads`;
    const method = isEditMode ? "put" : "post";
    const res = await axiosInstance.request({ url, method, data: payload });
    toast.success(
      res.data.message || `Ad ${isEditMode ? "updated" : "created"} successfully!`
    );
    onSuccess();
  } catch (err: any) {
    toast.error(
      err.response?.data?.message ||
        `Failed to ${isEditMode ? "update" : "create"} ad`
    );
  } finally {
    setIsSubmitting(false);
  }
};

  // ── Loading state ───────────────────────────────────────────────────────────
  if (formLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <i className="pi pi-spin pi-spinner text-3xl text-blue-500" />
          <p className="text-sm text-slate-500">Loading ad details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-5">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── STEP 1: Store Selection ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-black">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Select Store <span className="text-red-500">*</span>
            </h3>
          </div>

          <div ref={storeRef} className="relative">
            {/* Input */}
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition cursor-text ${
                storeDropdownOpen
                  ? "border-blue-400 bg-white ring-2 ring-blue-100"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
              onClick={() => {
                setStoreDropdownOpen(true);
              }}
            >
              {storesLoading ? (
                <i className="pi pi-spin pi-spinner text-blue-400 text-sm shrink-0" />
              ) : (
                <i className="pi pi-shop text-slate-400 text-sm shrink-0" />
              )}
              <input
                type="text"
                value={storeSearch}
                onChange={(e) => {
                  setStoreSearch(e.target.value);
                  setSelectedStore(null);
                  setStoreDropdownOpen(true);
                }}
                onFocus={() => setStoreDropdownOpen(true)}
                placeholder="Search and select a store..."
                className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder-slate-400"
              />
              {selectedStore && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStore(null);
                    setStoreSearch("");
                    setSelectedProduct(null);
                    setProductSearch("");
                    setProducts([]);
                  }}
                  className="shrink-0 text-slate-300 hover:text-red-400 transition"
                >
                  <i className="pi pi-times text-xs" />
                </button>
              )}
              <i
                className={`pi pi-chevron-down text-xs text-slate-400 shrink-0 transition-transform ${
                  storeDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Dropdown */}
            {storeDropdownOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {storesLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                    <i className="pi pi-spin pi-spinner text-blue-400" /> Loading stores...
                  </div>
                ) : filteredStores.length === 0 ? (
                  <div className="px-4 py-4 text-center text-sm text-slate-400">
                    No stores found
                  </div>
                ) : (
                  <ul className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {filteredStores.map((store) => (
                      <li key={store._id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStore(store);
                            setStoreSearch(store.storeName);
                            setStoreDropdownOpen(false);
                            setSelectedProduct(null);
                            setProductSearch("");
                            setProducts([]);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-blue-50 ${
                            selectedStore?._id === store._id ? "bg-blue-50" : ""
                          }`}
                        >
                          {store.images?.[0] ? (
                            <img
                              src={store.images[0]}
                              alt={store.storeName}
                              className="h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-100"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-black text-blue-600">
                              {store.storeName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-800">
                              {store.storeName}
                            </p>
                            {store.address?.area && (
                              <p className="truncate text-[11px] text-slate-400">
                                📍 {store.address.area}
                              </p>
                            )}
                          </div>
                          {selectedStore?._id === store._id && (
                            <i className="pi pi-check text-blue-500 shrink-0" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Selected store chip */}
          {selectedStore && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              {selectedStore.images?.[0] ? (
                <img
                  src={selectedStore.images[0]}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  alt={selectedStore.storeName}
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-200 text-xs font-black text-blue-700">
                  {selectedStore.storeName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-blue-900">
                  {selectedStore.storeName}
                </p>
                {selectedStore.address?.state && (
                  <p className="text-[11px] text-blue-400">{selectedStore.address.state}</p>
                )}
              </div>
              <i className="pi pi-check-circle text-blue-500 shrink-0" />
            </div>
          )}
        </div>

        {/* ── STEP 2: Product Selection ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
                selectedStore
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              2
            </div>
            <h3
              className={`text-sm font-bold ${
                selectedStore ? "text-slate-800" : "text-slate-400"
              }`}
            >
              Select Product{" "}
              {selectedStore && <span className="text-red-500">*</span>}
            </h3>
            {selectedStore && productsLoading && (
              <i className="pi pi-spin pi-spinner text-xs text-emerald-500" />
            )}
            {selectedStore && !productsLoading && (
              <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                {products.length} products
              </span>
            )}
          </div>

          <div
            ref={productRef}
            className={`relative ${!selectedStore ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition cursor-text ${
                productDropdownOpen
                  ? "border-emerald-400 bg-white ring-2 ring-emerald-100"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
              onClick={() => selectedStore && setProductDropdownOpen(true)}
            >
              {productsLoading ? (
                <i className="pi pi-spin pi-spinner text-emerald-400 text-sm shrink-0" />
              ) : (
                <i className="pi pi-box text-slate-400 text-sm shrink-0" />
              )}
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setSelectedProduct(null);
                  setProductDropdownOpen(true);
                }}
                onFocus={() => selectedStore && setProductDropdownOpen(true)}
                placeholder={
                  selectedStore
                    ? "Search products from this store..."
                    : "Select a store first"
                }
                className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder-slate-400"
                disabled={!selectedStore}
              />
              {selectedProduct && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProduct(null);
                    setProductSearch("");
                  }}
                  className="shrink-0 text-slate-300 hover:text-red-400 transition"
                >
                  <i className="pi pi-times text-xs" />
                </button>
              )}
              <i
                className={`pi pi-chevron-down text-xs text-slate-400 shrink-0 transition-transform ${
                  productDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Dropdown */}
            {productDropdownOpen && selectedStore && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {productsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                    <i className="pi pi-spin pi-spinner text-emerald-400" /> Loading products...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="px-4 py-5 text-center text-sm text-slate-400">
                    {products.length === 0
                      ? "No products in this store"
                      : `No match for "${productSearch}"`}
                  </div>
                ) : (
                  <ul className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {filteredProducts.map((p) => (
                      <li key={p._id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct(p);
                            setProductSearch(p.name);
                            setProductDropdownOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-emerald-50 ${
                            selectedProduct?._id === p._id ? "bg-emerald-50" : ""
                          }`}
                        >
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-100"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-black text-emerald-600">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-800">
                              {p.name}
                            </p>
                            {p.sellingPrice !== undefined && (
                              <p className="text-[11px] text-slate-400">
                                ₹{p.sellingPrice.toLocaleString("en-IN")}
                              </p>
                            )}
                          </div>
                          {!p.isActive && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase">
                              Inactive
                            </span>
                          )}
                          {selectedProduct?._id === p._id && (
                            <i className="pi pi-check text-emerald-500 shrink-0" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Selected product chip */}
          {selectedProduct && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              {selectedProduct.images?.[0] ? (
                <img
                  src={selectedProduct.images[0]}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  alt={selectedProduct.name}
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-200 text-xs font-black text-emerald-700">
                  {selectedProduct.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-emerald-900">
                  {selectedProduct.name}
                </p>
                {selectedProduct.sellingPrice !== undefined && (
                  <p className="text-[11px] text-emerald-500">
                    ₹{selectedProduct.sellingPrice.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
              <i className="pi pi-check-circle text-emerald-500 shrink-0" />
            </div>
          )}
        </div>

        {/* ── Rank + Expiry ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <i className="pi pi-sort-numeric-up text-indigo-500 text-xs" />
              Rank
            </label>
            <InputNumber
              value={rank}
              onValueChange={(e) => setRank(e.value ?? null)}
              placeholder="e.g. 1"
              min={1}
              className="w-full"
              inputClassName="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400">
              Lower = higher display priority
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <i className="pi pi-calendar text-rose-500 text-xs" />
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={expiryDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 transition"
            />
          </div>
        </div>

        {/* ── Active Toggle ── */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                isActive ? "bg-emerald-100" : "bg-slate-200"
              }`}
            >
              <i
                className={`pi pi-power-off text-sm ${
                  isActive ? "text-emerald-600" : "text-slate-400"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Ad Status</p>
              <p className="text-[11px] text-slate-400">
                {isActive ? "Live — visible to users" : "Hidden — not displayed"}
              </p>
            </div>
          </div>
          <InputSwitch checked={isActive} onChange={(e) => setIsActive(e.value)} />
        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            onClick={onClose}
            outlined
            disabled={isSubmitting}
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
          />
          <Button
            type="submit"
            label={isSubmitting ? "Saving..." : isEditMode ? "Update Ad" : "Create Ad"}
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            disabled={isSubmitting}
            className="flex-1 border-0 text-white shadow-md"
            style={{ background: "linear-gradient(110deg, #1a3a6b, #2196d3)" }}
          />
        </div>
      </form>
    </div>
  );
}