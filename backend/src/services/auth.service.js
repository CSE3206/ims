/**
 * Authentication + user management.
 * Owner: Evan — feature/auth-catalog
 */
import bcrypt from 'bcryptjs';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';

/** Never send passwordHash to the client. */
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  createdAt: u.createdAt,
});

export async function register({ name, email, password, role = 'staff' }) {
  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(users)
    .values({ name, email: email.toLowerCase(), passwordHash, role })
    .returning();

  return { user: publicUser(created), token: signToken(created) };
}

export async function login({ email, password }) {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

  // Same message for "no such user" and "wrong password" — do not leak which
  // emails are registered.
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  return { user: publicUser(user), token: signToken(user) };
}

export async function getById(id) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw ApiError.notFound('User not found');
  return publicUser(user);
}

export async function listUsers() {
  const rows = await db.select().from(users).orderBy(asc(users.name));
  return rows.map(publicUser);
}

export async function updateUser(id, patch) {
  const values = { updatedAt: new Date() };
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.role !== undefined) values.role = patch.role;
  if (patch.isActive !== undefined) values.isActive = patch.isActive;
  if (patch.password) values.passwordHash = await bcrypt.hash(patch.password, 10);

  const [updated] = await db.update(users).set(values).where(eq(users.id, id)).returning();
  if (!updated) throw ApiError.notFound('User not found');
  return publicUser(updated);
}

export async function deleteUser(id) {
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
  if (!deleted) throw ApiError.notFound('User not found');
  return publicUser(deleted);
}
