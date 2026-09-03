/**
 * Suppliers — CRUD plus the product count each one supplies.
 * Owner: Najmul — feature/purchasing
 */
import { asc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { suppliers, products } from '../db/schema.js';
import { ApiError } from '../utils/ApiError.js';

export async function listSuppliers(query = {}) {
  const { search } = query;
  const where = search
    ? or(ilike(suppliers.name, `%${search}%`), ilike(suppliers.email, `%${search}%`))
    : undefined;

  return db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      contactPerson: suppliers.contactPerson,
      email: suppliers.email,
      phone: suppliers.phone,
      address: suppliers.address,
      isActive: suppliers.isActive,
      createdAt: suppliers.createdAt,
      productCount: sql`count(${products.id})::int`.as('product_count'),
    })
    .from(suppliers)
    .leftJoin(products, eq(products.supplierId, suppliers.id))
    .where(where)
    .groupBy(suppliers.id)
    .orderBy(asc(suppliers.name));
}

export async function getSupplier(id) {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id));
  if (!row) throw ApiError.notFound('Supplier not found');
  return row;
}

export async function createSupplier(data) {
  const [created] = await db.insert(suppliers).values(data).returning();
  return created;
}

export async function updateSupplier(id, patch) {
  const [updated] = await db
    .update(suppliers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(suppliers.id, id))
    .returning();
  if (!updated) throw ApiError.notFound('Supplier not found');
  return updated;
}

export async function deleteSupplier(id) {
  // purchase_orders.supplier_id is ON DELETE RESTRICT: a supplier with order
  // history cannot be deleted. Deactivate it instead.
  const [deleted] = await db.delete(suppliers).where(eq(suppliers.id, id)).returning();
  if (!deleted) throw ApiError.notFound('Supplier not found');
  return deleted;
}
