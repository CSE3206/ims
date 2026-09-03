/**
 * Dashboard metrics and exportable reports.
 * Owner: Rukaiya — feature/inventory-reports
 */
import { and, desc, eq, gte, lte, sql, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  products,
  categories,
  suppliers,
  stockMovements,
  purchaseOrders,
  salesOrders,
  salesOrderItems,
} from '../db/schema.js';

/** Everything the dashboard needs, in one round trip per widget. */
export async function getDashboard() {
  const [totals] = await db
    .select({
      productCount: sql`count(*)::int`,
      totalUnits: sql`coalesce(sum(${products.quantity}), 0)::int`,
      // Inventory is valued at cost, which is what an accountant expects.
      stockValue: sql`coalesce(sum(${products.quantity} * ${products.costPrice}), 0)::numeric(14,2)`,
      lowStockCount: sql`count(*) filter (where ${products.quantity} <= ${products.reorderLevel})::int`,
      outOfStockCount: sql`count(*) filter (where ${products.quantity} = 0)::int`,
    })
    .from(products);

  const [supplierCount] = await db.select({ count: sql`count(*)::int` }).from(suppliers);
  const [categoryCount] = await db.select({ count: sql`count(*)::int` }).from(categories);

  const [openPurchases] = await db
    .select({ count: sql`count(*) filter (where ${purchaseOrders.status} in ('draft','ordered'))::int` })
    .from(purchaseOrders);

  const [openSales] = await db
    .select({ count: sql`count(*) filter (where ${salesOrders.status} in ('draft','confirmed'))::int` })
    .from(salesOrders);

  const [revenue] = await db
    .select({
      fulfilledRevenue: sql`coalesce(sum(${salesOrders.total}) filter (where ${salesOrders.status} = 'fulfilled'), 0)::numeric(14,2)`,
    })
    .from(salesOrders);

  const lowStock = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      quantity: products.quantity,
      reorderLevel: products.reorderLevel,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(lte(products.quantity, products.reorderLevel))
    .orderBy(asc(products.quantity))
    .limit(8);

  const recentMovements = await db
    .select({
      id: stockMovements.id,
      sku: products.sku,
      productName: products.name,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      reference: stockMovements.reference,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(8);

  const stockByCategory = await db
    .select({
      category: sql`coalesce(${categories.name}, 'Uncategorised')`.as('category'),
      units: sql`coalesce(sum(${products.quantity}), 0)::int`.as('units'),
      value: sql`coalesce(sum(${products.quantity} * ${products.costPrice}), 0)::numeric(14,2)`.as('value'),
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .groupBy(sql`coalesce(${categories.name}, 'Uncategorised')`)
    .orderBy(desc(sql`sum(${products.quantity} * ${products.costPrice})`));

  return {
    metrics: {
      ...totals,
      supplierCount: supplierCount.count,
      categoryCount: categoryCount.count,
      openPurchaseOrders: openPurchases.count,
      openSalesOrders: openSales.count,
      fulfilledRevenue: revenue.fulfilledRevenue,
    },
    lowStock,
    recentMovements,
    stockByCategory,
  };
}

/** Full valuation of the warehouse, product by product. */
export async function getInventoryValuation() {
  return db
    .select({
      sku: products.sku,
      name: products.name,
      category: sql`coalesce(${categories.name}, 'Uncategorised')`.as('category'),
      quantity: products.quantity,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      stockValue: sql`(${products.quantity} * ${products.costPrice})::numeric(14,2)`.as('stock_value'),
      potentialRevenue: sql`(${products.quantity} * ${products.sellingPrice})::numeric(14,2)`.as('potential_revenue'),
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(sql`${products.quantity} * ${products.costPrice}`));
}

/** Units in vs units out over a date window, for the movement report. */
export async function getStockFlow({ from, to } = {}) {
  const filters = [];
  if (from) filters.push(gte(stockMovements.createdAt, new Date(from)));
  if (to) filters.push(lte(stockMovements.createdAt, new Date(to)));
  const where = filters.length ? and(...filters) : undefined;

  return db
    .select({
      day: sql`date_trunc('day', ${stockMovements.createdAt})::date`.as('day'),
      unitsIn: sql`coalesce(sum(${stockMovements.quantity}) filter (where ${stockMovements.quantity} > 0), 0)::int`.as('units_in'),
      unitsOut: sql`coalesce(abs(sum(${stockMovements.quantity}) filter (where ${stockMovements.quantity} < 0)), 0)::int`.as('units_out'),
    })
    .from(stockMovements)
    .where(where)
    .groupBy(sql`date_trunc('day', ${stockMovements.createdAt})`)
    .orderBy(asc(sql`date_trunc('day', ${stockMovements.createdAt})`));
}

/** Best sellers by units shipped — only fulfilled orders count as a sale. */
export async function getTopProducts(limit = 10) {
  return db
    .select({
      sku: products.sku,
      name: products.name,
      unitsSold: sql`coalesce(sum(${salesOrderItems.quantity}), 0)::int`.as('units_sold'),
      revenue: sql`coalesce(sum(${salesOrderItems.quantity} * ${salesOrderItems.unitPrice}), 0)::numeric(14,2)`.as('revenue'),
    })
    .from(salesOrderItems)
    .innerJoin(salesOrders, eq(salesOrderItems.salesOrderId, salesOrders.id))
    .innerJoin(products, eq(salesOrderItems.productId, products.id))
    .where(eq(salesOrders.status, 'fulfilled'))
    .groupBy(products.id, products.sku, products.name)
    .orderBy(desc(sql`sum(${salesOrderItems.quantity})`))
    .limit(limit);
}

/** Turn any array of flat row objects into CSV for the export buttons. */
export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
}
