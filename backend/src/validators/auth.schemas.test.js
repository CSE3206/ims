import test from 'node:test';
import assert from 'node:assert/strict';

import { registerSchema, loginSchema, updateUserSchema, uuidParam } from './schemas.js';

// Register validation tests
test('register accepts a valid account and defaults the role to staff', () => {
  const result = registerSchema.safeParse({
    name: 'Evan',
    email: 'evan@ims.local',
    password: 'password123',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.role, 'staff');
});

test('register trims whitespace around name and email', () => {
  const result = registerSchema.safeParse({
    name: '  Evan  ',
    email: '  evan@ims.local  ',
    password: 'password123',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.name, 'Evan');
  assert.equal(result.data.email, 'evan@ims.local');
});

test('register rejects an invalid email address', () => {
  const result = registerSchema.safeParse({
    name: 'Evan',
    email: 'not-an-email',
    password: 'password123',
  });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].message, 'Enter a valid email address');
});

test('register rejects a password shorter than 6 characters', () => {
  const result = registerSchema.safeParse({
    name: 'Evan',
    email: 'evan@ims.local',
    password: '12345',
  });

  assert.equal(result.success, false);
});

test('register rejects a one-character name', () => {
  const result = registerSchema.safeParse({
    name: 'E',
    email: 'evan@ims.local',
    password: 'password123',
  });

  assert.equal(result.success, false);
});

test('register rejects an unknown role', () => {
  const result = registerSchema.safeParse({
    name: 'Evan',
    email: 'evan@ims.local',
    password: 'password123',
    role: 'owner',
  });

  assert.equal(result.success, false);
});

// Login validation tests
test('login accepts an email and password', () => {
  const result = loginSchema.safeParse({ email: 'evan@ims.local', password: 'x' });

  assert.equal(result.success, true);
});

test('login rejects an empty password', () => {
  const result = loginSchema.safeParse({ email: 'evan@ims.local', password: '' });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].message, 'Password is required');
});

test('login rejects a missing email', () => {
  const result = loginSchema.safeParse({ password: 'password123' });

  assert.equal(result.success, false);
});

// User update validation tests
test('user update accepts an empty patch', () => {
  const result = updateUserSchema.safeParse({});

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {});
});

test('user update accepts a role change and deactivation', () => {
  const result = updateUserSchema.safeParse({ role: 'manager', isActive: false });

  assert.equal(result.success, true);
});

test('user update rejects isActive sent as a string', () => {
  const result = updateUserSchema.safeParse({ isActive: 'false' });

  assert.equal(result.success, false);
});

test('user update rejects a short new password', () => {
  const result = updateUserSchema.safeParse({ password: 'abc' });

  assert.equal(result.success, false);
});

// Id param validation tests
test('id param accepts a uuid', () => {
  const result = uuidParam.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });

  assert.equal(result.success, true);
});

test('id param rejects a non-uuid string', () => {
  const result = uuidParam.safeParse({ id: 'low-stock' });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].message, 'Not a valid id');
});
