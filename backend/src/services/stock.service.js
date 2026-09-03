/**
 * Stock ledger — the ONLY place products.quantity is allowed to change.
 * Owner: Rukaiya — feature/inventory-reports
 *
 * Every adjustment writes two things inside one transaction:
 *   1. the new running total on products.quantity
 *   2. an immutable row in stock_movements explaining the change
 *
 * Najmul's goods-receipt and the sales fulfilment both call applyMovement()
 * with their own transaction handle, so a failed order never leaves a
 * half-applied stock change behind.
 */
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, stockMovements, users } from '../db/schema.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Apply one signed stock change and append it to the ledger.
 *
 * @param tx        an active Drizzle transaction (pass `db` for a standalone call)
 * @param delta     signed change: +5 received, -3 sold
 * @param type      'in' | 'out' | 'adjustment'
 * @param allowNegative  set true only for a stock-take correction
 */
export async function applyMovement(
  tx,
  { productId, delta, type, reason, reference, userId, allowNegative = false },
) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw ApiError.badRequest('Stock change must be a non-zero whole number');
  }

  // Lock the row for the duration of the transaction so two concurrent sales
  // cannot both read the same "before" quantity and oversell.
  const [product] = await tx
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .for('update');

  if (!product) throw ApiError.notFound('Product not found');

  const quantityAfter = product.quantity + delta;
  if (quantityAfter < 0 && !allowNegative) {
    throw ApiError.badRequest(
      `Not enough stock for ${product.sku}: have ${product.quantity}, need ${Math.abs(delta)}`,
    );
  }

  await tx
    .update(products)
    .set({ quantity: quantityAfter, updatedAt: new Date() })
    .where(eq(products.id, productId));

  const [movement] = await tx
    .insert(stockMovements)
    .values({
      productId,
      type,
      quantity: delta,
      quantityAfter,
      reason: reason ?? null,
      reference: reference ?? null,
      userId: userId ?? null,
    })
    .returning();

  return { movement, product: { ...product, quantity: quantityAfter } };
}

/** POST /api/stock/in — receive stock outside of a purchase order. */
export async function stockIn({ productId, quantity, reason, reference }, userId) {
  return db.transaction((tx) =>
    applyMovement(tx, {
      productId,
      delta: Math.abs(quantity),
      type: 'in',
      reason: reason || 'Manual stock in',
      reference,
      userId,
    }),
  );
}

/** POST /api/stock/out — issue stock outside of a sales order (damage, sample). */
export async function stockOut({ productId, quantity, reason, reference }, userId) {
  return db.transaction((tx) =>
    applyMovement(tx, {
      productId,
      delta: -Math.abs(quantity),
      type: 'out',
      reason: reason || 'Manual stock out',
      reference,
      userId,
    }),
  );
}

/**
 * POST /api/stock/adjust — set the counted quantity after a physical stock-take.
 * The delta is derived, so the ledger records the correction, not the new total.
 */
export async function adjustStock({ productId, countedQuantity, reason }, userId) {
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, productId)).for('update');
    if (!product) throw ApiError.notFound('Product not found');

    const delta = countedQuantity - product.quantity;
    if (delta === 0) {
      throw ApiError.badRequest('Counted quantity already matches the system quantity');
    }

    return applyMovement(tx, {
      productId,
      delta,
      type: 'adjustment',
      reason: reason || `Stock take: ${product.quantity} → ${countedQuantity}`,
      reference: 'ADJUST',
      userId,
      allowNegative: true,
    });
  });
}

/** GET /api/stock/movements — the audit trail, newest first. */
export async function listMovements(query = {}) {
  const { productId, type, from, to, page = 1, limit = 50 } = query;

  const filters = [];
  if (productId) filters.push(eq(stockMovements.productId, productId));
  if (type) filters.push(eq(stockMovements.type, type));
  if (from) filters.push(gte(stockMovements.createdAt, new Date(from)));
  if (to) filters.push(lte(stockMovements.createdAt, new Date(to)));
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      sku: products.sku,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      quantityAfter: stockMovements.quantityAfter,
      reason: stockMovements.reason,
      reference: stockMovements.reference,
      userName: users.name,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(where)
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(stockMovements)
    .where(where);

  return {
    data: rows,
    pagination: { page, limit, total: count, totalPages: Math.max(1, Math.ceil(count / limit)) },
  };
}
