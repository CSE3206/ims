import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// env.js fails loudly without these, so set them before the middleware loads.
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret';

const { signToken, requireAuth, requireRole } = await import('./auth.js');

const user = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'evan@ims.local', role: 'manager' };

/** Runs a middleware and returns what it passed to next(). */
function run(middleware, req) {
  let passed;
  middleware(req, {}, (err) => {
    passed = err;
  });
  return passed;
}

// requireAuth tests
test('requireAuth accepts a token from signToken and sets req.user', () => {
  const req = { headers: { authorization: `Bearer ${signToken(user)}` } };

  const err = run(requireAuth, req);

  assert.equal(err, undefined);
  assert.deepEqual(req.user, user);
});

test('requireAuth rejects a request with no Authorization header', () => {
  const err = run(requireAuth, { headers: {} });

  assert.equal(err.status, 401);
  assert.equal(err.message, 'Missing Bearer token');
});

test('requireAuth rejects a header without the Bearer prefix', () => {
  const err = run(requireAuth, { headers: { authorization: signToken(user) } });

  assert.equal(err.status, 401);
});

test('requireAuth rejects a token signed with another secret', () => {
  const forged = jwt.sign({ sub: user.id, email: user.email, role: 'admin' }, 'wrong-secret');

  const err = run(requireAuth, { headers: { authorization: `Bearer ${forged}` } });

  assert.equal(err.status, 401);
  assert.equal(err.message, 'Invalid or expired token');
});

test('requireAuth rejects an expired token', () => {
  const expired = jwt.sign({ sub: user.id, role: user.role }, 'test-secret', { expiresIn: -10 });

  const err = run(requireAuth, { headers: { authorization: `Bearer ${expired}` } });

  assert.equal(err.status, 401);
});

// requireRole tests
test('requireRole lets a listed role through', () => {
  const err = run(requireRole('admin', 'manager'), { user });

  assert.equal(err, undefined);
});

test('requireRole forbids a role that is not listed', () => {
  const err = run(requireRole('admin'), { user: { ...user, role: 'staff' } });

  assert.equal(err.status, 403);
  assert.equal(err.message, 'Requires role: admin');
});

test('requireRole returns 401 when requireAuth did not run first', () => {
  const err = run(requireRole('admin'), {});

  assert.equal(err.status, 401);
});
