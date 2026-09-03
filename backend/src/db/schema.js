/**
 * Drizzle ORM schema — the single source of truth for the database.
 *
 * OWNERSHIP: this file is SHARED. Everybody's tables live here, so it is the
 * most likely place for a merge conflict. Rules agreed by the team:
 *   1. Keep your tables inside your own clearly-marked section below.
 *   2. Never reformat or reorder someone else's section.
 *   3. Schema changes are announced in the group chat before you push.
 * See docs/TEAM.md for the full ownership map.
 *
 * Apply changes to Neon with:  npm run db:push
 */
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ===========================================================================
 * ENUMS — shared vocabulary. Adding a value is a team decision.
 * ========================================================================= */

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'staff']);
export const poStatusEnum = pgEnum('po_status', ['draft', 'ordered', 'received', 'cancelled']);
export const soStatusEnum = pgEnum('so_status', ['draft', 'confirmed', 'fulfilled', 'cancelled']);
export const movementTypeEnum = pgEnum('movement_type', ['in', 'out', 'adjustment']);

/* ===========================================================================
 * SECTION 1 — Evan  (auth, users, categories, products)
 * Branch: feature/auth-catalog
 * ========================================================================= */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('staff'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('categories_name_unique').on(t.name)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: varchar('sku', { length: 64 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    unit: varchar('unit', { length: 24 }).notNull().default('pcs'),
    costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0'),
    sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull().default('0'),
    // Denormalised running total. Only ever changed through the stock service
    // so that products.quantity and the stock_movements ledger stay in sync.
    quantity: integer('quantity').notNull().default(0),
    reorderLevel: integer('reorder_level').notNull().default(10),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('products_sku_unique').on(t.sku),
    index('products_category_idx').on(t.categoryId),
    index('products_supplier_idx').on(t.supplierId),
  ],
);

/* ===========================================================================
 * SECTION 2 — Najmul  (suppliers, purchase orders, goods receipt)
 * Branch: feature/purchasing
 * ========================================================================= */

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 160 }).notNull(),
    contactPerson: varchar('contact_person', { length: 120 }),
    email: varchar('email', { length: 160 }),
    phone: varchar('phone', { length: 40 }),
    address: text('address'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('suppliers_name_unique').on(t.name)],
);

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    poNumber: varchar('po_number', { length: 32 }).notNull(),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    status: poStatusEnum('status').notNull().default('draft'),
    expectedAt: timestamp('expected_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    notes: text('notes'),
    total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('purchase_orders_number_unique').on(t.poNumber),
    index('purchase_orders_supplier_idx').on(t.supplierId),
    index('purchase_orders_status_idx').on(t.status),
  ],
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull().default('0'),
  },
  (t) => [index('po_items_order_idx').on(t.purchaseOrderId)],
);

/* ===========================================================================
 * SECTION 3 — Rukaiya  (stock ledger, sales / stock-out, reporting)
 * Branch: feature/inventory-reports
 * ========================================================================= */

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    type: movementTypeEnum('type').notNull(),
    // Signed change applied to products.quantity: +5 received, -3 sold.
    quantity: integer('quantity').notNull(),
    quantityAfter: integer('quantity_after').notNull(),
    reason: varchar('reason', { length: 200 }),
    // Free-text link back to the document that caused it, e.g. "PO-1004".
    reference: varchar('reference', { length: 64 }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('stock_movements_product_idx').on(t.productId),
    index('stock_movements_created_idx').on(t.createdAt),
  ],
);

export const salesOrders = pgTable(
  'sales_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    soNumber: varchar('so_number', { length: 32 }).notNull(),
    customerName: varchar('customer_name', { length: 160 }).notNull(),
    customerEmail: varchar('customer_email', { length: 160 }),
    status: soStatusEnum('status').notNull().default('draft'),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    notes: text('notes'),
    total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sales_orders_number_unique').on(t.soNumber),
    index('sales_orders_status_idx').on(t.status),
  ],
);

export const salesOrderItems = pgTable(
  'sales_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salesOrderId: uuid('sales_order_id')
      .notNull()
      .references(() => salesOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  },
  (t) => [index('so_items_order_idx').on(t.salesOrderId)],
);

/* ===========================================================================
 * RELATIONS — lets us use db.query.<table>.findMany({ with: { ... } })
 * ========================================================================= */

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  purchaseOrders: many(purchaseOrders),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  movements: many(stockMovements),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  createdByUser: one(users, { fields: [purchaseOrders.createdBy], references: [users.id] }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, { fields: [purchaseOrderItems.productId], references: [products.id] }),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  createdByUser: one(users, { fields: [salesOrders.createdBy], references: [users.id] }),
  items: many(salesOrderItems),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderItems.salesOrderId],
    references: [salesOrders.id],
  }),
  product: one(products, { fields: [salesOrderItems.productId], references: [products.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  user: one(users, { fields: [stockMovements.userId], references: [users.id] }),
}));
