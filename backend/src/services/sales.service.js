/**
 * Sales orders (stock OUT side of the business).
 * Owner: Rukaiya — feature/inventory-reports
 *
 * Lifecycle:  draft ──▶ confirmed ──▶ fulfilled     (stock leaves here)
 *               └──────────┴────────▶ cancelled
 *
 * Availability is checked twice: cheaply at confirm time so the user gets a
 * useful message, and again inside the fulfilment transaction where the row
 * lock makes it authoritative.
 */
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { salesOrders, salesOrderItems, products, users } from '../db/schema.js';
import { applyMovement } from './stock.service.js';
import { ApiError } from '../utils/ApiError.js';
import { nextDocumentNumber } from '../utils/documentNumber.js';
import { lineItemsTotal } from '../utils/money.js';

export async function listSalesOrders(query = {}) {
  const { status, page = 1, limit = 20 } = query;
  const where = status ? eq(salesOrders.status, status) : undefined;

  const rows = await db
    .select({
      id: salesOrders.id,
      soNumber: salesOrders.soNumber,
      customerName: salesOrders.customerName,
      customerEmail: salesOrders.customerEmail,
      status: salesOrders.status,
      total: salesOrders.total,
      fulfilledAt: salesOrders.fulfilledAt,
      createdByName: users.name,
      createdAt: salesOrders.createdAt,
      itemCount: sql`(select count(*)::int from ${salesOrderItems}
                      where ${salesOrderItems.salesOrderId} = ${salesOrders.id})`.as('item_count'),
    })
    .from(salesOrders)
    .leftJoin(users, eq(salesOrders.createdBy, users.id))
    .where(where)
    .orderBy(desc(salesOrders.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(salesOrders)
    .where(where);

  return {
    data: rows,
    pagination: { page, limit, total: count, totalPages: Math.max(1, Math.ceil(count / limit)) },
  };
}

export async function getSalesOrder(id) {
  const order = await db.query.salesOrders.findFirst({
    where: eq(salesOrders.id, id),
    with: {
      createdByUser: { columns: { id: true, name: true, email: true } },
      items: {
        with: { product: { columns: { id: true, sku: true, name: true, unit: true, quantity: true } } },
      },
    },
  });
  if (!order) throw ApiError.notFound('Sales order not found');
  return order;
}

export async function createSalesOrder(
  { customerName, customerEmail, notes, items },
  userId,
) {
  if (!items?.length) throw ApiError.badRequest('A sales order needs at least one line item');

  return db.transaction(async (tx) => {
    const existing = await tx.select({ soNumber: salesOrders.soNumber }).from(salesOrders);
    const soNumber = nextDocumentNumber('SO', existing.map((r) => r.soNumber));

    const [order] = await tx
      .insert(salesOrders)
      .values({
        soNumber,
        customerName,
        customerEmail: customerEmail ?? null,
        notes: notes ?? null,
        status: 'draft',
        total: lineItemsTotal(items, 'unitPrice'),
        createdBy: userId ?? null,
      })
      .returning();

    await tx.insert(salesOrderItems).values(
      items.map((item) => ({
        salesOrderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice ?? 0),
      })),
    );

    return order;
  });
}

/**
 * Move draft → confirmed, refusing anything we clearly cannot supply.
 * This is a courtesy check; fulfilment re-verifies under a row lock.
 */
export async function confirmSalesOrder(id) {
  const order = await requireStatus(id, ['draft'], 'Only a draft order can be confirmed');

  const lines = await db
    .select({
      sku: products.sku,
      available: products.quantity,
      wanted: salesOrderItems.quantity,
    })
    .from(salesOrderItems)
    .innerJoin(products, eq(salesOrderItems.productId, products.id))
    .where(eq(salesOrderItems.salesOrderId, order.id));

  const short = lines.filter((l) => l.available < l.wanted);
  if (short.length) {
    throw ApiError.badRequest(
      'Not enough stock to confirm this order',
      short.map((l) => ({
        field: l.sku,
        message: `wanted ${l.wanted}, only ${l.available} in stock`,
      })),
    );
  }

  const [updated] = await db
    .update(salesOrders)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(eq(salesOrders.id, order.id))
    .returning();
  return updated;
}

/** Ship the goods: deduct every line from stock in one transaction. */
export async function fulfilSalesOrder(id, userId) {
  const order = await requireStatus(
    id,
    ['confirmed'],
    'Confirm the order before fulfilling it',
  );

  return db.transaction(async (tx) => {
    const items = await tx
      .select()
      .from(salesOrderItems)
      .where(eq(salesOrderItems.salesOrderId, order.id));

    for (const item of items) {
      await applyMovement(tx, {
        productId: item.productId,
        delta: -item.quantity,
        type: 'out',
        reason: `Sold on ${order.soNumber}`,
        reference: order.soNumber,
        userId,
      });
    }

    const [updated] = await tx
      .update(salesOrders)
      .set({ status: 'fulfilled', fulfilledAt: new Date(), updatedAt: new Date() })
      .where(eq(salesOrders.id, order.id))
      .returning();

    return updated;
  });
}

export async function cancelSalesOrder(id) {
  const order = await requireStatus(
    id,
    ['draft', 'confirmed'],
    'A fulfilled order cannot be cancelled — take the return in as a stock-in instead',
  );
  const [updated] = await db
    .update(salesOrders)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(salesOrders.id, order.id))
    .returning();
  return updated;
}

async function requireStatus(id, allowed, message) {
  const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, id));
  if (!order) throw ApiError.notFound('Sales order not found');
  if (!allowed.includes(order.status)) throw ApiError.badRequest(message);
  return order;
}
