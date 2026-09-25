import test from 'node:test';
import assert from 'node:assert/strict';

import { updateProductSchema } from './schemas.js';

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
