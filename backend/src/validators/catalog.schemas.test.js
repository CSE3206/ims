import test from 'node:test';
import assert from 'node:assert/strict';

import {
  categorySchema,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from './schemas.js';

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

// Product list query tests
test('product query applies defaults when no parameters are given', () => {
  const result = productQuerySchema.safeParse({});

  assert.equal(result.success, true);
  assert.equal(result.data.page, 1);
  assert.equal(result.data.limit, 20);
  assert.equal(result.data.sort, 'name');
  assert.equal(result.data.order, 'asc');
  assert.equal(result.data.lowStock, false);
});

test('product query coerces page and limit from query strings', () => {
  const result = productQuerySchema.safeParse({ page: '3', limit: '50' });

  assert.equal(result.success, true);
  assert.equal(result.data.page, 3);
  assert.equal(result.data.limit, 50);
});

test('product query rejects a limit above 200', () => {
  const result = productQuerySchema.safeParse({ limit: '201' });

  assert.equal(result.success, false);
});

test('product query rejects page 0', () => {
  const result = productQuerySchema.safeParse({ page: '0' });

  assert.equal(result.success, false);
});

test('product query turns lowStock=true into a boolean', () => {
  const result = productQuerySchema.safeParse({ lowStock: 'true' });

  assert.equal(result.success, true);
  assert.equal(result.data.lowStock, true);
});

test('product query rejects a lowStock value other than true or false', () => {
  const result = productQuerySchema.safeParse({ lowStock: 'yes' });

  assert.equal(result.success, false);
});

test('product query rejects a sort column that is not allowed', () => {
  const result = productQuerySchema.safeParse({ sort: 'costPrice' });

  assert.equal(result.success, false);
});

test('product query accepts a combined search, filter and sort', () => {
  const result = productQuerySchema.safeParse({
    search: '  laptop ',
    categoryId: '550e8400-e29b-41d4-a716-446655440000',
    lowStock: 'true',
    sort: 'quantity',
    order: 'desc',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.search, 'laptop');
  assert.equal(result.data.sort, 'quantity');
  assert.equal(result.data.order, 'desc');
});

test('product query rejects a supplier id that is not a uuid', () => {
  const result = productQuerySchema.safeParse({ supplierId: 'acme' });

  assert.equal(result.success, false);
});
