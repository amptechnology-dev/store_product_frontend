import { z as zod } from "zod";

// Product type constants
const productTypes = ["FUEL", "ACCESSORY"] as const;
const productUnits = ["LITRE", "PIECE", "KG", "BOX"] as const;

const objectIdSchema = zod
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

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
// SIZE/WEIGHT/HEIGHT VARIANT (color-er nested hisebe, ba direct flat variant hisebe)
// ===============================
// NOTE: kono store-setting er upor r depend kore na. Ei product-e "color" key
// pathano hocche ki na, r protyek color-e "sizeVariants" ache ki na - eituku
// dekhei structure decide hoy. Tai schema level e loose rekhe real validation
// component-er nijer validateVariants() function-e kora hoy.
export const sizeVariantSchema = zod.object({
  _id: zod.string().optional(),
  size: zod.string().trim().optional(),
  weight: zod.string().trim().optional(),
  height: zod.string().trim().optional(),
  mrp: zod.coerce.number().nonnegative().optional(),
  offerPrice: zod.coerce.number().nonnegative().optional(),
  openingStock: zod.coerce.number().nonnegative().optional().default(0),
  currentStock: zod.coerce.number().nonnegative().optional(),
  sku: zod.string().trim().optional(),
  packagingDetails: packagingDetailsSchema,
});

// ===============================
// COLOR VARIANT (nijer sizeVariants thakte pare, na thakle direct pricing)
// ===============================
export const colorVariantSchema = zod.object({
  _id: zod.string().optional(),
  color: zod.string().trim().optional(),
  images: zod.array(zod.string()).optional(),
  mrp: zod.coerce.number().nonnegative().optional(),
  offerPrice: zod.coerce.number().nonnegative().optional(),
  openingStock: zod.coerce.number().nonnegative().optional().default(0),
  currentStock: zod.coerce.number().nonnegative().optional(),
  sku: zod.string().trim().optional(),
  packagingDetails: packagingDetailsSchema,
  sizeVariants: zod.array(sizeVariantSchema).optional(),
});

export const createProductSchema = zod.object({
  name: zod.string().trim().min(1, "Product name is required"),
  description: zod.string().trim().min(1, "Product description is required"),
  unit: zod.string().trim().min(1, "Unit is required"),
  storeId: zod.string().min(1, "Store is required"),
  categoryId: zod.string().min(1, "Category is required"),

  // Simple (no-variant) product fields
  mrp: zod.coerce.number().min(0).optional(),
  offerPrice: zod.coerce.number().min(0).optional(),
  openingStock: zod.coerce.number().min(0).optional(),
  packagingDetails: packagingDetailsSchema,

  // Loose union - real per-row validation component-e manually hoy
  variants: zod.array(zod.union([colorVariantSchema, sizeVariantSchema])).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createBannerSchema = zod.object({
  name: zod.string().trim().min(1, "Banner name is required"),
  storeId: zod.string().min(1, "Store is required"),
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