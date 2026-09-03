/**
 * Purchase orders (stock IN side of the business).
 * Owner: Najmul — feature/purchasing
 *
 * Lifecycle:  draft ──▶ ordered ──▶ received      (stock arrives here)
 *               └────────┴────────▶ cancelled
 *
 * Receiving is the only step that touches inventory, and it does so through
 * Rukaiya's stock ledger so the movement history stays complete.
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  purchaseOrders,
  purchaseOrderItems,
  products,
  suppliers,
  users,
} from '../db/schema.js';
import { applyMovement } from './stock.service.js';
import { ApiError } from '../utils/ApiError.js';
import { nextDocumentNumber } from '../utils/documentNumber.js';
import { lineItemsTotal } from '../utils/money.js';

export async function listPurchaseOrders(query = {}) {
  const { status, supplierId, page = 1, limit = 20 } = query;

  const filters = [];
  if (status) filters.push(eq(purchaseOrders.status, status));
  if (supplierId) filters.push(eq(purchaseOrders.supplierId, supplierId));
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      status: purchaseOrders.status,
      expectedAt: purchaseOrders.expectedAt,
      receivedAt: purchaseOrders.receivedAt,
      total: purchaseOrders.total,
      notes: purchaseOrders.notes,
      createdByName: users.name,
      createdAt: purchaseOrders.createdAt,
      itemCount: sql`(select count(*)::int from ${purchaseOrderItems}
                      where ${purchaseOrderItems.purchaseOrderId} = ${purchaseOrders.id})`.as('item_count'),
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
    .where(where)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(purchaseOrders)
    .where(where);

  return {
    data: rows,
    pagination: { page, limit, total: count, totalPages: Math.max(1, Math.ceil(count / limit)) },
  };
}

/** One order with its supplier and fully expanded line items. */
export async function getPurchaseOrder(id) {
  const order = await db.query.purchaseOrders.findFirst({
    where: eq(purchaseOrders.id, id),
    with: {
      supplier: true,
      createdByUser: { columns: { id: true, name: true, email: true } },
      items: { with: { product: { columns: { id: true, sku: true, name: true, unit: true } } } },
    },
  });
  if (!order) throw ApiError.notFound('Purchase order not found');
  return order;
}

export async function createPurchaseOrder({ supplierId, expectedAt, notes, items }, userId) {
  if (!items?.length) throw ApiError.badRequest('A purchase order needs at least one line item');

  return db.transaction(async (tx) => {
    const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, supplierId));
    if (!supplier) throw ApiError.badRequest('Supplier not found');

    const existing = await tx.select({ poNumber: purchaseOrders.poNumber }).from(purchaseOrders);
    const poNumber = nextDocumentNumber('PO', existing.map((r) => r.poNumber));

    const [order] = await tx
      .insert(purchaseOrders)
      .values({
        poNumber,
        supplierId,
        status: 'draft',
        expectedAt: expectedAt ? new Date(expectedAt) : null,
        notes: notes ?? null,
        total: lineItemsTotal(items, 'unitCost'),
        createdBy: userId ?? null,
      })
      .returning();

    await tx.insert(purchaseOrderItems).values(
      items.map((item) => ({
        purchaseOrderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: String(item.unitCost ?? 0),
      })),
    );

    return order;
  });
}

/** Move draft → ordered. After this the order is with the supplier. */
export async function markOrdered(id) {
  const order = await requireStatus(id, ['draft'], 'Only a draft order can be marked as ordered');
  const [updated] = await db
    .update(purchaseOrders)
    .set({ status: 'ordered', updatedAt: new Date() })
    .where(eq(purchaseOrders.id, order.id))
    .returning();
  return updated;
}

/**
 * Receive the goods: every line item is added to stock in one transaction.
 * If any single line fails (e.g. a product was deleted) nothing is applied.
 */
export async function receivePurchaseOrder(id, userId) {
  const order = await requireStatus(
    id,
    ['draft', 'ordered'],
    'This order has already been received or cancelled',
  );

  return db.transaction(async (tx) => {
    const items = await tx
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, order.id));

    if (!items.length) throw ApiError.badRequest('Cannot receive an order with no line items');

    for (const item of items) {
      await applyMovement(tx, {
        productId: item.productId,
        delta: item.quantity,
        type: 'in',
        reason: `Received on ${order.poNumber}`,
        reference: order.poNumber,
        userId,
      });

      // Receiving is also when we learn the real cost price.
      await tx
        .update(products)
        .set({ costPrice: item.unitCost, updatedAt: new Date() })
        .where(eq(products.id, item.productId));
    }

    const [updated] = await tx
      .update(purchaseOrders)
      .set({ status: 'received', receivedAt: new Date(), updatedAt: new Date() })
      .where(eq(purchaseOrders.id, order.id))
      .returning();

    return updated;
  });
}

export async function cancelPurchaseOrder(id) {
  const order = await requireStatus(
    id,
    ['draft', 'ordered'],
    'A received order cannot be cancelled — reverse it with a stock adjustment instead',
  );
  const [updated] = await db
    .update(purchaseOrders)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(purchaseOrders.id, order.id))
    .returning();
  return updated;
}

export async function deletePurchaseOrder(id) {
  const order = await requireStatus(id, ['draft', 'cancelled'], 'Only draft or cancelled orders can be deleted');
  const [deleted] = await db.delete(purchaseOrders).where(eq(purchaseOrders.id, order.id)).returning();
  return deleted;
}

/** Loads an order and asserts its status is one of `allowed`. */
async function requireStatus(id, allowed, message) {
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
  if (!order) throw ApiError.notFound('Purchase order not found');
  if (!allowed.includes(order.status)) throw ApiError.badRequest(message);
  return order;
}
