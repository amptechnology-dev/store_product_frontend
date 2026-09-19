"use client";

import React, { useRef, useState, useEffect } from "react";

interface Category {
  label: string;
  icon?: string; // URL or emoji
  value: string;
}

interface CategorySliderProps {
  categories: Category[];
  selected: string;
  onSelect: (value: string) => void;
}

const CategorySlider: React.FC<CategorySliderProps> = ({
  categories,
  selected,
  onSelect,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [categories]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -240 : 240, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-sm px-1 py-2">
      {/* Left Arrow */}
      <button
        onClick={() => scroll("left")}
        disabled={!canScrollLeft}
        className={`flex-shrink-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition
          ${
            canScrollLeft
              ? "border-yellow-400 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 shadow-sm"
              : "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
          }`}
      >
        <i className="pi pi-chevron-left text-xs" />
      </button>

      {/* Scrollable Category Strip */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {categories.map((cat) => {
          const isSelected = selected === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onSelect(cat.value)}
              className={`flex flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-4 py-2 transition-all duration-200
                ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-50 shadow-sm"
                    : "border-gray-100 bg-white hover:border-yellow-300 hover:bg-yellow-50"
                }`}
              style={{ minWidth: "80px" }}
            >
              {/* Icon — supports image URL or emoji */}
              {cat.icon ? (
                cat.icon.startsWith("http") || cat.icon.startsWith("/") ? (
                  <img
                    src={cat.icon}
                    alt={cat.label}
                    className="h-8 w-8 object-contain"
                    onError={(e: any) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <span className="text-2xl leading-none">{cat.icon}</span>
                )
              ) : (
                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <i className="pi pi-tag text-yellow-600 text-sm" />
                </div>
              )}

              <span
                className={`text-xs font-medium leading-tight text-center whitespace-nowrap
                  ${isSelected ? "text-yellow-700 font-semibold" : "text-gray-600"}`}
              >
                {cat.label}
              </span>

              {/* Active indicator dot */}
              {isSelected && (
                <span className="h-1 w-4 rounded-full bg-yellow-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll("right")}
        disabled={!canScrollRight}
        className={`flex-shrink-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition
          ${
            canScrollRight
              ? "border-yellow-400 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 shadow-sm"
              : "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
          }`}
      >
        <i className="pi pi-chevron-right text-xs" />
      </button>
    </div>
  );
};

export default CategorySlider;


// ─── USAGE EXAMPLE ────────────────────────────────────────────────────────────
//
// Step 1: Copy this file to your components folder:
//   src/components/CategorySlider.tsx
//
// Step 2: Import and use in your store list page:
//
// import CategorySlider from "@/components/CategorySlider";
//
// const categories = [
//   { label: "All",              value: "all",              icon: "🏠" },
//   { label: "Restaurants",      value: "restaurants",      icon: "🍔" },
//   { label: "Hotels",           value: "hotels",           icon: "🏨" },
//   { label: "Beauty Spa",       value: "beauty_spa",       icon: "💆" },
//   { label: "Home Decor",       value: "home_decor",       icon: "🛋️" },
//   { label: "Wedding Planning", value: "wedding_planning", icon: "💍" },
//   { label: "Education",        value: "education",        icon: "🎓" },
//   { label: "Rent & Hire",      value: "rent_hire",        icon: "🏠" },
//   { label: "Hospitals",        value: "hospitals",        icon: "🏥" },
//   { label: "Contractors",      value: "contractors",      icon: "🔧" },
//   { label: "Pet Shops",        value: "pet_shops",        icon: "🐾" },
//   { label: "Groceries",        value: "groceries",        icon: "🛒" },
// ];
//
// Step 3: Add state in your component:
//   const [selectedCategory, setSelectedCategory] = useState("all");
//
// Step 4: Place the component just below your {header} section:
//
//   {header}
//
//   <div className="mt-3 mb-2">
//     <CategorySlider
//       categories={categories}
//       selected={selectedCategory}
//       onSelect={(val) => {
//         setSelectedCategory(val);
//         // optionally reset pagination:
//         setPagination((prev) => ({ ...prev, page: 1 }));
//       }}
//     />
//   </div>
//
//   {storeData.length === 0 && !loading && <EmptyState />}
//   ...rest of your JSX
//
// Step 5: Use selectedCategory in your API call filter:
//   if (selectedCategory !== "all") {
//     params.storeType = selectedCategory;
//   }