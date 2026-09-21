export type CategoryIconOption = { label: string; value: string };
export type CategoryIconGroup = { group: string; items: CategoryIconOption[] };

export const CATEGORY_ICON_GROUPS: CategoryIconGroup[] = [
  {
    group: "Food & Grocery",
    items: [
      { label: "Grocery", value: "🛒" },
      { label: "Fruits", value: "🍎" },
      { label: "Vegetables", value: "🥦" },
      { label: "Meat", value: "🥩" },
      { label: "Fish", value: "🐟" },
      { label: "Dairy", value: "🥛" },
      { label: "Eggs", value: "🥚" },
      { label: "Bakery", value: "🍞" },
      { label: "Rice & Grains", value: "🌾" },
      { label: "Snacks", value: "🍿" },
      { label: "Sweets", value: "🍰" },
      { label: "Fast Food", value: "🍔" },
      { label: "Pizza", value: "🍕" },
      { label: "Restaurant", value: "🍽️" },
      { label: "Beverages", value: "🥤" },
      { label: "Coffee & Tea", value: "☕" },
      { label: "Spices", value: "🌶️" },
    ],
  },
  {
    group: "Fashion & Beauty",
    items: [
      { label: "Clothing", value: "👕" },
      { label: "Dress", value: "👗" },
      { label: "Shoes", value: "👟" },
      { label: "Bags", value: "👜" },
      { label: "Watches", value: "⌚" },
      { label: "Jewellery", value: "💍" },
      { label: "Cosmetics", value: "💄" },
      { label: "Perfume", value: "🧴" },
    ],
  },
  {
    group: "Electronics",
    items: [
      { label: "Mobile", value: "📱" },
      { label: "Laptop", value: "💻" },
      { label: "Headphones", value: "🎧" },
      { label: "Camera", value: "📷" },
      { label: "TV & Appliances", value: "📺" },
      { label: "Gaming", value: "🎮" },
      { label: "Accessories", value: "🔌" },
    ],
  },
  {
    group: "Home & Living",
    items: [
      { label: "Furniture", value: "🛋️" },
      { label: "Kitchen", value: "🍳" },
      { label: "Cleaning", value: "🧹" },
      { label: "Decor", value: "🖼️" },
      { label: "Garden", value: "🌱" },
      { label: "Tools", value: "🔧" },
    ],
  },
  {
    group: "Health & Baby",
    items: [
      { label: "Medicine", value: "💊" },
      { label: "Health Care", value: "🩺" },
      { label: "Baby Care", value: "🍼" },
      { label: "Toys", value: "🧸" },
    ],
  },
  {
    group: "Others",
    items: [
      { label: "Books", value: "📚" },
      { label: "Stationery", value: "✏️" },
      { label: "Sports", value: "⚽" },
      { label: "Automotive", value: "🚗" },
      { label: "Pets", value: "🐾" },
      { label: "Gifts", value: "🎁" },
      { label: "Offers", value: "🏷️" },
      { label: "Others", value: "📦" },
    ],
  },
];