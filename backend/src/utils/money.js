/**
 * Postgres `numeric` comes back from the driver as a string so that large
 * values keep full precision. These helpers keep the conversion in one place.
 */
export const toNumber = (value) => (value === null || value === undefined ? 0 : Number(value));

/** Format a JS number as a fixed-2 string for storage in a numeric column. */
export const toMoneyString = (value) => Number(value || 0).toFixed(2);

/** Sum of quantity * unitPrice over line items, as a numeric-safe string. */
export const lineItemsTotal = (items, priceKey) =>
  toMoneyString(
    items.reduce((sum, item) => sum + Number(item.quantity) * Number(item[priceKey] || 0), 0),
  );
