import { z as zod } from "zod";

// Product type constants
const productTypes = ["FUEL", "ACCESSORY"] as const;
const productUnits = ["LITRE", "PIECE", "KG", "BOX"] as const;

const objectIdSchema = zod.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

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

const variantSchema = zod
  .object({
    size: zod.string().trim().optional(),
    weight: zod.string().trim().optional(),
    mrp: zod.coerce
      .number({ error: "MRP is required" })
      .nonnegative("MRP must be >= 0"),
    offerPrice: zod.coerce
      .number({ error: "Offer price is required" })
      .nonnegative("Offer price must be >= 0"),
    stock: zod.coerce
      .number()
      .nonnegative("Stock must be >= 0")
      .optional()
      .default(0),
    sku: zod.string().trim().optional(),
  })
  .refine((v) => !!v.size || !!v.weight, {
    message: "Size or weight is required",
    path: ["size"],
  })
  .refine((v) => v.offerPrice <= v.mrp, {
    message: "Offer price cannot be greater than MRP",
    path: ["offerPrice"],
  });

export const createProductSchema = zod.object({
  name: zod.string().min(1, "Product name is required").trim(),
  description: zod.string().min(1, "Description is required"),
  unit: zod.string().min(1, "Unit is required"),
  deliveryTime: zod.string().optional(),
  storeId: objectIdSchema,
  categoryId: objectIdSchema,
  variants: zod
    .array(variantSchema)
    .min(1, "At least one variant is required"),
});

export const updateProductSchema = zod.object({
  name: zod.string().min(1).trim().optional(),
  description: zod.string().min(1).optional(),
  unit: zod.string().min(1).optional(),
  deliveryTime: zod.string().optional(),
  storeId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  variants: zod.array(variantSchema).min(1).optional(),
});

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
  // Name is required for create
  name: zod.string().min(2, "Name must be at least 2 characters"),

  // Optional fields: allow either a valid value or an empty string
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
  // For update, all fields are optional; allow empty string as valid input (means unset)
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

  // Initial meter reading (required on create). Accepts string or number and coerces to number.
  initialReading: zod.coerce
    .number()
    .nonnegative("Initial reading must be greater than or equal to 0"),

  // Status of the nozzle: ACTIVE | INACTIVE | MAINTENANCE
  status: zod.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).default("ACTIVE"),
});

// For updates, allow any field to be optional. Reuse the create schema rules but make all fields optional.
export const updateNozzleSchema = createNozzleSchema.partial();

// ===============================
// PURCHASE SCHEMA (frontend copy of backend purchase.schema.js)
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
