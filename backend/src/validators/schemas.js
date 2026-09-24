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

/* --- Najmul: suppliers, purchase orders --------------------------------- */

/* --- Rukaiya: stock, sales, reports ------------------------------------- */

