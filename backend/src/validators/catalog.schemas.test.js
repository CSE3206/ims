import test from 'node:test';
import assert from 'node:assert/strict';

import { categorySchema, createProductSchema, updateProductSchema } from './schemas.js';

// Product update validation tests
test('product update with only a name does not fill in defaults', () => {
  const result = updateProductSchema.safeParse({ name: 'USB-C Hub' });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { name: 'USB-C Hub' });
});

test('product update drops quantity so stock cannot be edited directly', () => {
  const result = updateProductSchema.safeParse({ quantity: 999 });

  assert.equal(result.success, true);
  assert.equal('quantity' in result.data, false);
});

test('product update converts prices to strings for the numeric column', () => {
  const result = updateProductSchema.safeParse({ costPrice: 120.5, sellingPrice: '150' });

  assert.equal(result.success, true);
  assert.equal(result.data.costPrice, '120.5');
  assert.equal(result.data.sellingPrice, '150');
});

test('product update allows clearing the category', () => {
  const result = updateProductSchema.safeParse({ categoryId: null });

  assert.equal(result.success, true);
  assert.equal(result.data.categoryId, null);
});

test('product update rejects a negative price', () => {
  const result = updateProductSchema.safeParse({ sellingPrice: -1 });

  assert.equal(result.success, false);
});

// Category validation tests
test('category accepts a name with an optional description', () => {
  const result = categorySchema.safeParse({ name: 'Monitors', description: 'Displays and panels' });

  assert.equal(result.success, true);
});

test('category accepts a null description', () => {
  const result = categorySchema.safeParse({ name: 'Monitors', description: null });

  assert.equal(result.success, true);
});

test('category rejects a name that is only whitespace', () => {
  const result = categorySchema.safeParse({ name: '   ' });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].message, 'Category name must be at least 2 characters');
});

test('category partial update accepts just a description', () => {
  const result = categorySchema.partial().safeParse({ description: 'Updated' });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { description: 'Updated' });
});

// Product create validation tests
test('product create fills in defaults for a minimal product', () => {
  const result = createProductSchema.safeParse({ sku: 'MON-6001', name: '27" IPS Monitor' });

  assert.equal(result.success, true);
  assert.equal(result.data.unit, 'pcs');
  assert.equal(result.data.costPrice, '0');
  assert.equal(result.data.sellingPrice, '0');
  assert.equal(result.data.quantity, 0);
  assert.equal(result.data.reorderLevel, 10);
  assert.equal(result.data.isActive, true);
});

test('product create coerces numeric strings from form inputs', () => {
  const result = createProductSchema.safeParse({
    sku: 'MON-6001',
    name: '27" IPS Monitor',
    costPrice: '18000',
    sellingPrice: '23500.50',
    quantity: '12',
    reorderLevel: '5',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.costPrice, '18000');
  assert.equal(result.data.sellingPrice, '23500.5');
  assert.equal(result.data.quantity, 12);
  assert.equal(result.data.reorderLevel, 5);
});

test('product create rejects a negative opening quantity', () => {
  const result = createProductSchema.safeParse({ sku: 'MON-6001', name: 'Monitor', quantity: -1 });

  assert.equal(result.success, false);
});

test('product create rejects a fractional opening quantity', () => {
  const result = createProductSchema.safeParse({ sku: 'MON-6001', name: 'Monitor', quantity: 1.5 });

  assert.equal(result.success, false);
});

test('product create rejects a one-character SKU', () => {
  const result = createProductSchema.safeParse({ sku: 'M', name: 'Monitor' });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].message, 'SKU must be at least 2 characters');
});

test('product create rejects a category id that is not a uuid', () => {
  const result = createProductSchema.safeParse({ sku: 'MON-6001', name: 'Monitor', categoryId: '' });

  assert.equal(result.success, false);
});
