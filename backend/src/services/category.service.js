/**
 * Product categories — simple CRUD.
 * Owner: Evan — feature/auth-catalog
 */
import { eq, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories, products } from '../db/schema.js';
import { ApiError } from '../utils/ApiError.js';

/** Categories with a live count of the products filed under each. */
export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      createdAt: categories.createdAt,
      productCount: sql`count(${products.id})::int`.as('product_count'),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}

export async function getCategory(id) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id));
  if (!row) throw ApiError.notFound('Category not found');
  return row;
}

export async function createCategory(data) {
  const [created] = await db.insert(categories).values(data).returning();
  return created;
}

export async function updateCategory(id, patch) {
  const [updated] = await db
    .update(categories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
  if (!updated) throw ApiError.notFound('Category not found');
  return updated;
}

export async function deleteCategory(id) {
  // products.category_id is ON DELETE SET NULL, so products survive as
  // "Uncategorised" rather than disappearing with the category.
  const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning();
  if (!deleted) throw ApiError.notFound('Category not found');
  return deleted;
}
