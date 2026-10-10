import { z as zod } from "zod";

// Product type constants
const productTypes = ["FUEL", "ACCESSORY"] as const;
const productUnits = ["LITRE", "PIECE", "KG", "BOX"] as const;

const objectIdSchema = zod
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

// ===============================
// OPTIONAL NUMBER (MRP / Offer Price er jonno)
// null, "", undefined, NaN -> undefined hoye jay (coerce(null) = 0 hobe na)
// ===============================
const optionalNumber = zod.preprocess(
  (v) =>
    v === "" ||
    v === null ||
    v === undefined ||
    (typeof v === "number" && Number.isNaN(v))
      ? undefined
      : v,
  zod.coerce.number().nonnegative().optional(),
);

export const LoginSchema = zod.object({
  email: zod
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: zod
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters long"),
});

export const createUserSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Invalid email format").toLowerCase(),
  phone: zod
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(11, "Phone number too long"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  role: zod.enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"]),
  shiftType: zod.enum(["MORNING", "EVENING", "NIGHT"]),
  isActive: zod.boolean().optional(),
  createdBy: zod.string().optional(),
});

export const updateUserSchema = zod.object({
  name: zod.string().min(2).optional(),
  email: zod.string().email().toLowerCase().optional(),
  phone: zod.string().min(10).max(15).optional(),
  role: zod.enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"]).optional(),
  shiftType: zod.enum(["MORNING", "EVENING", "NIGHT"]).optional(),
  isActive: zod.boolean().optional(),
});

// ===============================
// PACKAGING DETAILS SCHEMA (product-e o thake, proti variant/size-e o thake)
// ===============================
export const packagingDetailsSchema = zod
  .object({
    expectedDeliveryDays: zod.coerce.number().min(0).optional(),
    length: zod.coerce.number().min(0).optional(),
    breadth: zod.coerce.number().min(0).optional(),
    height: zod.coerce.number().min(0).optional(),
    weight: zod.coerce.number().min(0).optional(),
  })
  .optional();

// ===============================
// QUANTITY BASED PRICE TIER (1-4 => 20, 5-10 => 40, 50+ => 200)
// coerce use kori ni, karon coerce(null) = 0 hoye jay.
// asol validation ProductFrom er validateTiers e hoy.
// ===============================
export const priceTierSchema = zod.object({
  minQty: zod.number().nullable().optional(),
  maxQty: zod.number().nullable().optional(),
  price: zod.number().nullable().optional(),
});

// ===============================
// SIZE/WEIGHT/HEIGHT VARIANT (color-er nested hisebe, ba direct flat variant hisebe)
// ===============================
export const sizeVariantSchema = zod.object({
  _id: zod.string().optional(),
  size: zod.string().trim().optional(),
  weight: zod.string().trim().optional(),
  height: zod.string().trim().optional(),
  mrp: optionalNumber, // MRP optional
  offerPrice: optionalNumber,
  openingStock: zod.coerce.number().nonnegative().optional().default(0),
  currentStock: zod.coerce.number().nonnegative().optional(),
  lowStockThreshold: zod.coerce.number().nonnegative().optional().default(0),
  sku: zod.string().trim().optional(),
  packagingDetails: packagingDetailsSchema,
  priceTiers: zod.array(priceTierSchema).optional(),
});

// ===============================
// COLOR VARIANT (nijer sizeVariants thakte pare, na thakle direct pricing)
// ===============================
export const colorVariantSchema = zod.object({
  _id: zod.string().optional(),
  color: zod.string().trim().optional(),
  images: zod.array(zod.string()).optional(),
  mrp: optionalNumber, // MRP optional
  offerPrice: optionalNumber,
  openingStock: zod.coerce.number().nonnegative().optional().default(0),
  currentStock: zod.coerce.number().nonnegative().optional(),
  lowStockThreshold: zod.coerce.number().nonnegative().optional().default(0),
  sku: zod.string().trim().optional(),
  packagingDetails: packagingDetailsSchema,
  priceTiers: zod.array(priceTierSchema).optional(),
  sizeVariants: zod.array(sizeVariantSchema).optional(),
});

export const createProductSchema = zod.object({
  name: zod.string().trim().min(1, "Product name is required"),
  description: zod.string().trim().min(1, "Product description is required"),
  unit: zod.string().trim().min(1, "Unit is required"),
  storeId: zod.string().min(1, "Store is required"),
  categoryId: zod.string().min(1, "Category is required"),

  // Simple (no-variant) product fields
  mrp: optionalNumber, // MRP optional
  offerPrice: optionalNumber,
  openingStock: zod.coerce.number().min(0).optional(),
  lowStockThreshold: zod.coerce.number().min(0).optional(),
  packagingDetails: packagingDetailsSchema,
  priceTiers: zod.array(priceTierSchema).optional(),

  // Loose union - real per-row validation component-e manually hoy
  variants: zod
    .array(zod.union([colorVariantSchema, sizeVariantSchema]))
    .optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const bannerURLSchema = zod
  .string()
  .trim()
  .max(2048, "URL is too long")
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }, "Enter a valid URL starting with http:// or https://")
  .optional();

export const createBannerSchema = zod.object({
  name: zod.string().trim().min(1, "Banner name is required"),
  storeId: zod.string().min(1, "Store is required"),
  categoryIds: zod.array(zod.string()),
  productId: zod.string().nullable().optional(),
  offerBanner: zod.boolean(),
});

export const updateBannerSchema = createBannerSchema.partial();

export const createFinancialYearSchema = zod.object({
  name: zod
    .string()
    .min(1, "Financial year name is required")
    .regex(/^\d{4}-\d{4}$/, "Format should be YYYY-YYYY (e.g., 2024-2025)"),
  startDate: zod.string().datetime("Invalid date format"),
  endDate: zod.string().datetime("Invalid date format"),
  isActive: zod.boolean().optional(),
});

export const updateFinancialYearSchema = zod.object({
  name: zod
    .string()
    .min(1, "Financial year name is required")
    .regex(/^\d{4}-\d{4}$/, "Format should be YYYY-YYYY (e.g., 2024-2025)")
    .optional(),
  startDate: zod.string().datetime("Invalid date format").optional(),
  endDate: zod.string().datetime("Invalid date format").optional(),
  isActive: zod.boolean().optional(),
});

export const createSupplierSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.union([
    zod.string().email("Invalid email format"),
    zod.literal(""),
  ]),
  phone: zod.union([
    zod
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .max(11, "Phone number too long"),
    zod.literal(""),
  ]),
  gstId: zod.union([
    zod
      .string()
      .min(15, "GST ID must be at least 15 characters")
      .max(15, "GST ID cannot exceed 15 characters"),
    zod.literal(""),
  ]),
  address: zod.union([
    zod.string().min(5, "Address must be at least 5 characters"),
    zod.literal(""),
  ]),
  isActive: zod.boolean().optional(),
});

export const updateSupplierSchema = zod.object({
  name: zod.string().min(2).optional(),
  email: zod.union([zod.string().email(), zod.literal("")]).optional(),
  phone: zod.union([zod.string().min(10).max(15), zod.literal("")]).optional(),
  gstId: zod.union([zod.string().min(15).max(15), zod.literal("")]).optional(),
  address: zod.union([zod.string().min(5), zod.literal("")]).optional(),
  isActive: zod.boolean().optional(),
});

// ===============================
// NOZZLE SCHEMAS
// ===============================

export const createNozzleSchema = zod.object({
  nozzleNumber: zod
    .string()
    .min(2, "Nozzle number must be at least 2 characters")
    .max(50, "Nozzle number is too long")
    .trim(),
  tank: objectIdSchema,
  machineName: zod.string().max(100, "Machine name is too long").optional(),
  initialReading: zod.coerce
    .number()
    .nonnegative("Initial reading must be greater than or equal to 0"),
  status: zod.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).default("ACTIVE"),
});

export const updateNozzleSchema = createNozzleSchema.partial();

// ===============================
// PURCHASE SCHEMA
// ===============================

export const purchaseItemSchema = zod.object({
  productId: objectIdSchema,
  quantity: zod.coerce.number().positive("Quantity must be greater than 0"),
  costPrice: zod.coerce
    .number()
    .positive("Cost price must be greater than 0")
    .optional(),
  discount: zod.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100")
    .default(0),
  tankId: zod
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, { message: "Invalid tankId" })
    .nullable()
    .optional(),
});

export const createPurchaseSchema = zod
  .object({
    supplierId: objectIdSchema,
    invoiceNo: zod.string().trim().min(1, "Invoice number is required"),
    purchaseDate: zod.coerce.date(),
    paymentStatus: zod.enum(["PAID", "DUE", "PARTIAL"]),
    paymentMethod: zod.enum(["CASH", "BANK", "UPI", "CARD"]).default("CASH"),
    paidAmount: zod.coerce
      .number()
      .min(0, "Paid amount cannot be negative")
      .default(0),
    items: zod
      .array(purchaseItemSchema)
      .min(1, "At least one product is required"),
  })
  .superRefine((data, ctx) => {
    if (data.paymentStatus === "DUE" && data.paidAmount !== 0) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: "For DUE status, paidAmount must be 0",
        path: ["paidAmount"],
      });
    }
    if (data.paymentStatus === "PARTIAL" && data.paidAmount === 0) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: "For PARTIAL status, paidAmount must be greater than 0",
        path: ["paidAmount"],
      });
    }
    if (data.paymentStatus === "PAID" && data.paidAmount === 0) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: "For PAID status, paidAmount must be greater than 0",
        path: ["paidAmount"],
      });
    }
  });

// ===============================
// DELIVERY SETTINGS (STORE)
// null / "" / NaN -> undefined (InputNumber khali hole null dey, coerce(null) = 0 hoye jay)
// ===============================
const blankToUndefined = (v: unknown) =>
  v === "" ||
  v === null ||
  v === undefined ||
  (typeof v === "number" && Number.isNaN(v))
    ? undefined
    : v;

export const deliveryTypeValues = ["LOCAL", "NATIONAL", "BOTH"] as const;

export const deliverySettingsSchema = zod
  .object({
    storeId: zod.string().min(1, "Store is required"),
    deliveryType: zod.enum(deliveryTypeValues),
    pincode: zod
      .string()
      .trim()
      .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6 digit pincode"),
    radiusKm: zod.preprocess(
      blankToUndefined,
      zod.coerce
        .number()
        .positive("Radius must be greater than 0")
        .max(500, "Radius cannot exceed 500 km")
        .optional(),
    ),
    localDeliveryDays: zod.preprocess(
      blankToUndefined,
      zod.coerce
        .number()
        .int("Enter whole days")
        .min(0, "Days cannot be negative")
        .max(30, "Maximum 30 days")
        .optional(),
    ),
    nationalMinDays: zod.preprocess(
      blankToUndefined,
      zod.coerce
        .number()
        .int("Enter whole days")
        .min(0, "Days cannot be negative")
        .max(60, "Maximum 60 days")
        .optional(),
    ),
    nationalMaxDays: zod.preprocess(
      blankToUndefined,
      zod.coerce
        .number()
        .int("Enter whole days")
        .min(0, "Days cannot be negative")
        .max(60, "Maximum 60 days")
        .optional(),
    ),
    handlingDays: zod.preprocess(
      blankToUndefined,
      zod.coerce
        .number()
        .int("Enter whole days")
        .min(0, "Days cannot be negative")
        .max(30, "Maximum 30 days")
        .optional(),
    ),
  })
  .superRefine((d, ctx) => {
    const needsLocal = d.deliveryType === "LOCAL" || d.deliveryType === "BOTH";
    const needsNational =
      d.deliveryType === "NATIONAL" || d.deliveryType === "BOTH";

    if (needsLocal) {
      if (d.radiusKm === undefined) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["radiusKm"],
          message: "Delivery radius is required for local delivery",
        });
      }
      if (d.localDeliveryDays === undefined) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["localDeliveryDays"],
          message: "Local delivery days is required",
        });
      }
    }

    if (needsNational) {
      if (d.nationalMinDays === undefined) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["nationalMinDays"],
          message: "Minimum days is required",
        });
      }
      if (d.nationalMaxDays === undefined) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["nationalMaxDays"],
          message: "Maximum days is required",
        });
      }
      if (
        d.nationalMinDays !== undefined &&
        d.nationalMaxDays !== undefined &&
        d.nationalMaxDays < d.nationalMinDays
      ) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ["nationalMaxDays"],
          message: "Max days cannot be less than min days",
        });
      }
    }
  });