/**
 * Zod request schemas. Shared file — keep each section with its owner.
 * Used by the `validate()` middleware in front of every write endpoint.
 */
import { z } from 'zod';

/* --- reusable pieces ---------------------------------------------------- */

export const uuidParam = z.object({ id: z.string().uuid('Not a valid id') });

const positiveInt = z.coerce.number().int().positive();
const nonNegativeMoney = z.coerce.number().nonnegative().max(99_999_999);

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

/* --- Evan: auth, users, categories, products ---------------------------- */

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email address').max(160),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  role: z.enum(['admin', 'manager', 'staff']).default('staff'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['admin', 'manager', 'staff']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(120),
  description: z.string().trim().max(1000).optional().nullable(),
});

export const createProductSchema = z.object({
  sku: z.string().trim().min(2, 'SKU must be at least 2 characters').max(64),
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  unit: z.string().trim().max(24).default('pcs'),
  costPrice: nonNegativeMoney.default(0).transform(String),
  sellingPrice: nonNegativeMoney.default(0).transform(String),
  quantity: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  isActive: z.boolean().default(true),
});

// Written out rather than createProductSchema.partial(): Zod still applies
// .default() inside a partial, so a PATCH of just the name would reset prices,
// unit, reorder level and isActive. No quantity here — stock goes via the ledger.
export const updateProductSchema = z
  .object({
    sku: z.string().trim().min(2, 'SKU must be at least 2 characters').max(64),
    name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(200),
    description: z.string().trim().max(2000).nullable(),
    categoryId: z.string().uuid().nullable(),
    supplierId: z.string().uuid().nullable(),
    unit: z.string().trim().max(24),
    costPrice: nonNegativeMoney.transform(String),
    sellingPrice: nonNegativeMoney.transform(String),
    reorderLevel: z.coerce.number().int().min(0),
    isActive: z.boolean(),
  })
  .partial();

export const productQuerySchema = paginationQuery.extend({
  search: z.string().trim().max(120).optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sort: z.enum(['name', 'sku', 'quantity', 'sellingPrice', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

/* --- Najmul: suppliers, purchase orders --------------------------------- */

export const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Supplier name must be at least 2 characters').max(160),
  contactPerson: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email('Enter a valid email address').max(160).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateSupplierSchema = supplierSchema.partial();

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Choose a supplier'),
  expectedAt: z.string().datetime().or(z.string().date()).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Choose a product'),
        quantity: positiveInt,
        unitCost: nonNegativeMoney.default(0),
      }),
    )
    .min(1, 'Add at least one line item'),
});

export const purchaseOrderQuerySchema = paginationQuery.extend({
  status: z.enum(['draft', 'ordered', 'received', 'cancelled']).optional(),
  supplierId: z.string().uuid().optional(),
});

/* --- Rukaiya: stock, sales, reports ------------------------------------- */

export const stockInOutSchema = z.object({
  productId: z.string().uuid('Choose a product'),
  quantity: positiveInt,
  reason: z.string().trim().max(200).optional(),
  reference: z.string().trim().max(64).optional(),
});

export const stockAdjustSchema = z.object({
  productId: z.string().uuid('Choose a product'),
  countedQuantity: z.coerce.number().int().min(0),
  reason: z.string().trim().max(200).optional(),
});

export const movementQuerySchema = paginationQuery.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  productId: z.string().uuid().optional(),
  type: z.enum(['in', 'out', 'adjustment']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const createSalesOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name is required').max(160),
  customerEmail: z.string().trim().email().max(160).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Choose a product'),
        quantity: positiveInt,
        unitPrice: nonNegativeMoney.default(0),
      }),
    )
    .min(1, 'Add at least one line item'),
});

export const salesOrderQuerySchema = paginationQuery.extend({
  status: z.enum(['draft', 'confirmed', 'fulfilled', 'cancelled']).optional(),
});

export const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});
