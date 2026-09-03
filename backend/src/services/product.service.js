/**
 * Product catalogue — search, filter, paginate, CRUD.
 * Owner: Evan — feature/auth-catalog
 *
 * NOTE FOR THE TEAM: nothing here writes `products.quantity`. Stock levels are
 * only ever changed through stock.service.js so that every change is recorded
 * in the stock_movements ledger. Creating a product with an opening quantity is
 * the one exception, and it writes a movement too.
 */
import { and, asc, desc, eq, ilike, or, sql, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, categories, suppliers, stockMovements } from '../db/schema.js';
import { ApiError } from '../utils/ApiError.js';

/** Column list joined with category/supplier names — used by list and getOne. */
const productColumns = {
  id: products.id,
  sku: products.sku,
  name: products.name,
  description: products.description,
  categoryId: products.categoryId,
  categoryName: categories.name,
  supplierId: products.supplierId,
  supplierName: suppliers.name,
  unit: products.unit,
  costPrice: products.costPrice,
  sellingPrice: products.sellingPrice,
  quantity: products.quantity,
  reorderLevel: products.reorderLevel,
  isActive: products.isActive,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

const baseQuery = () =>
  db
    .select(productColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id));

const SORTABLE = {
  name: products.name,
  sku: products.sku,
  quantity: products.quantity,
  sellingPrice: products.sellingPrice,
  createdAt: products.createdAt,
};

export async function listProducts(query = {}) {
  const { search, categoryId, supplierId, lowStock, page = 1, limit = 20, sort = 'name', order = 'asc' } = query;

  const filters = [];
  if (search) {
    filters.push(or(ilike(products.name, `%${search}%`), ilike(products.sku, `%${search}%`)));
  }
  if (categoryId) filters.push(eq(products.categoryId, categoryId));
  if (supplierId) filters.push(eq(products.supplierId, supplierId));
  // "Low stock" means at or below the product's own reorder level.
  if (lowStock) filters.push(lte(products.quantity, products.reorderLevel));

  const where = filters.length ? and(...filters) : undefined;
  const sortColumn = SORTABLE[sort] || products.name;
  const direction = order === 'desc' ? desc : asc;

  const rows = await baseQuery()
    .where(where)
    .orderBy(direction(sortColumn))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(products)
    .where(where);

  return {
    data: rows,
    pagination: { page, limit, total: count, totalPages: Math.max(1, Math.ceil(count / limit)) },
  };
}

export async function getProduct(id) {
  const [row] = await baseQuery().where(eq(products.id, id));
  if (!row) throw ApiError.notFound('Product not found');
  return row;
}

export async function createProduct(data, userId) {
  const openingQuantity = Number(data.quantity || 0);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({ ...data, sku: data.sku.toUpperCase(), quantity: openingQuantity })
      .returning();

    // Opening stock is still stock — record it so the ledger reconciles.
    if (openingQuantity > 0) {
      await tx.insert(stockMovements).values({
        productId: created.id,
        type: 'in',
        quantity: openingQuantity,
        quantityAfter: openingQuantity,
        reason: 'Opening stock',
        reference: 'INIT',
        userId: userId ?? null,
      });
    }

    return created;
  });
}

export async function updateProduct(id, patch) {
  // quantity is deliberately dropped: use the stock endpoints to change it.
  const { quantity: _ignored, ...safe } = patch;
  if (safe.sku) safe.sku = safe.sku.toUpperCase();

  const [updated] = await db
    .update(products)
    .set({ ...safe, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  if (!updated) throw ApiError.notFound('Product not found');
  return updated;
}

export async function deleteProduct(id) {
  const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
  if (!deleted) throw ApiError.notFound('Product not found');
  return deleted;
}

/** Used by the dashboard and by the reorder report. */
export async function listLowStock(limit = 50) {
  return baseQuery()
    .where(lte(products.quantity, products.reorderLevel))
    .orderBy(asc(products.quantity))
    .limit(limit);
}
