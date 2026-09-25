
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  stockInOutSchema,
  stockAdjustSchema,
} from './schemas.js';

const validProductId = '550e8400-e29b-41d4-a716-446655440000';

// Stock In/Out validation tests
test('stock in/out accepts a valid positive quantity', () => {
  const result = stockInOutSchema.safeParse({
    productId: validProductId,
    quantity: 5,
  });

  assert.equal(result.success, true);
});

test('stock in/out rejects zero quantity', () => {
  const result = stockInOutSchema.safeParse({
    productId: validProductId,
    quantity: 0,
  });

  assert.equal(result.success, false);
});

test('stock in/out rejects a negative quantity', () => {
  const result = stockInOutSchema.safeParse({
    productId: validProductId,
    quantity: -3,
  });

  assert.equal(result.success, false);
});

test('stock in/out rejects a non-integer quantity', () => {
  const result = stockInOutSchema.safeParse({
    productId: validProductId,
    quantity: 2.5,
  });

  assert.equal(result.success, false);
});

// Stock Adjustment validation tests
test('stock adjustment accepts zero counted quantity', () => {
  const result = stockAdjustSchema.safeParse({
    productId: validProductId,
    countedQuantity: 0,
  });

  assert.equal(result.success, true);
});

test('stock adjustment accepts a positive whole number', () => {
  const result = stockAdjustSchema.safeParse({
    productId: validProductId,
    countedQuantity: 10,
  });

  assert.equal(result.success, true);
});

test('stock adjustment rejects a negative counted quantity', () => {
  const result = stockAdjustSchema.safeParse({
    productId: validProductId,
    countedQuantity: -1,
  });

  assert.equal(result.success, false);
});

test('stock adjustment rejects a decimal counted quantity', () => {
  const result = stockAdjustSchema.safeParse({
    productId: validProductId,
    countedQuantity: 3.5,
  });

  assert.equal(result.success, false);
});

test('stock in/out rejects an invalid product ID', () => {
  const result = stockInOutSchema.safeParse({
    productId: 'invalid-id',
    quantity: 5,
  });

  assert.equal(result.success, false);
});

test('stock adjustment rejects an invalid product ID', () => {
  const result = stockAdjustSchema.safeParse({
    productId: 'invalid-id',
    countedQuantity: 5,
  });

  assert.equal(result.success, false);
});

test('stock in/out accepts a numeric string quantity', () => {
  const result = stockInOutSchema.safeParse({
    productId: validProductId,
    quantity: '5',
  });

  assert.equal(result.success, true);
});

test('stock adjustment accepts a numeric string quantity', () => {
  const result = stockAdjustSchema.safeParse({
    productId: validProductId,
    countedQuantity: '10',
  });

  assert.equal(result.success, true);
});