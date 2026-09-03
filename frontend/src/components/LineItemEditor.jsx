/**
 * Line-item editor shared by the purchase-order and sales-order forms.
 * SHARED FILE — Najmul and Rukaiya both depend on it, so agree changes first.
 *
 * `priceKey` is 'unitCost' for purchases and 'unitPrice' for sales; everything
 * else about the two forms is identical.
 */
import { currency } from '../services/format.js';

export default function LineItemEditor({
  items,
  onChange,
  products,
  priceKey,
  priceLabel,
  showAvailable = false,
}) {
  const update = (index, patch) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const addRow = () => onChange([...items, { productId: '', quantity: 1, [priceKey]: 0 }]);
  const removeRow = (index) => onChange(items.filter((_, i) => i !== index));

  /** Picking a product pre-fills the price from the catalogue. */
  const pickProduct = (index, productId) => {
    const product = products.find((p) => p.id === productId);
    update(index, {
      productId,
      [priceKey]: product
        ? Number(priceKey === 'unitCost' ? product.costPrice : product.sellingPrice)
        : 0,
    });
  };

  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item[priceKey] || 0),
    0,
  );

  return (
    <>
      <div className="line-items">
        <div className="line-items__head">
          <span>Product</span>
          <span>Qty</span>
          <span>{priceLabel}</span>
          <span />
        </div>

        {items.map((item, index) => {
          const product = products.find((p) => p.id === item.productId);
          const short = showAvailable && product && item.quantity > product.quantity;

          return (
            // Rows have no stable id before they are saved, so the index is the
            // only key available here.
            // eslint-disable-next-line react/no-array-index-key
            <div className="line-item" key={index}>
              <div>
                <select
                  required
                  value={item.productId}
                  onChange={(e) => pickProduct(index, e.target.value)}
                >
                  <option value="">Choose a product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
                {showAvailable && product && (
                  <small
                    className={short ? 'field__error' : 'field__hint'}
                    style={{ display: 'block' }}
                  >
                    {product.quantity} in stock
                    {short ? ` — only ${product.quantity} available` : ''}
                  </small>
                )}
              </div>

              <input
                type="number"
                min="1"
                required
                value={item.quantity}
                onChange={(e) => update(index, { quantity: Number(e.target.value) })}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={item[priceKey]}
                onChange={(e) => update(index, { [priceKey]: Number(e.target.value) })}
              />

              <button
                type="button"
                className="line-item__remove"
                onClick={() => removeRow(index)}
                aria-label="Remove line"
                disabled={items.length === 1}
              >
                ×
              </button>
            </div>
          );
        })}

        <div className="line-items__total">
          <span>Order total</span>
          <span>{currency(total)}</span>
        </div>
      </div>

      <button type="button" className="btn btn--ghost btn--sm" onClick={addRow} style={{ marginTop: 10 }}>
        + Add line
      </button>
    </>
  );
}
