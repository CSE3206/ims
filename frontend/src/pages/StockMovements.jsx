/**
 * Owner: Rukaiya — feature/inventory-reports
 * The audit trail, plus the manual stock-in / stock-out / stock-take actions.
 */
import { useState } from 'react';
import { api } from '../services/api.js';
import { dateTime, number } from '../services/format.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { PageHeader, StatusBadge, Pagination, Field, ErrorNote, EmptyState } from '../components/ui.jsx';

const ACTION_LABELS = {
  in: { title: 'Record stock in', verb: 'Add to stock', quantityLabel: 'Quantity received' },
  out: { title: 'Record stock out', verb: 'Remove from stock', quantityLabel: 'Quantity removed' },
  adjust: { title: 'Stock take adjustment', verb: 'Save count', quantityLabel: 'Counted quantity' },
};

export default function StockMovements() {
  const { canManage } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState({ productId: '', type: '', page: 1, limit: 50 });
  const { data, loading, error, reload } = useFetch(
    () => api.stock.movements(filters),
    [filters.productId, filters.type, filters.page],
  );
  const { data: productData, reload: reloadProducts } = useFetch(
    () => api.products.list({ limit: 200 }),
    [],
  );
  const products = productData?.data || [];

  const [action, setAction] = useState(null); // 'in' | 'out' | 'adjust'
  const [form, setForm] = useState({ productId: '', quantity: 1, countedQuantity: 0, reason: '' });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === form.productId);

  const openAction = (kind) => {
    setAction(kind);
    setForm({ productId: '', quantity: 1, countedQuantity: 0, reason: '' });
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (action === 'adjust') {
        await api.stock.adjust({
          productId: form.productId,
          countedQuantity: Number(form.countedQuantity),
          reason: form.reason || undefined,
        });
      } else {
        const call = action === 'in' ? api.stock.in : api.stock.out;
        await call({
          productId: form.productId,
          quantity: Number(form.quantity),
          reason: form.reason || undefined,
        });
      }
      toast.success('Stock updated');
      setAction(null);
      reload();
      reloadProducts();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const labels = action ? ACTION_LABELS[action] : null;

  return (
    <>
      <PageHeader
        title="Stock Movements"
        subtitle="Every change to inventory, and why it happened."
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => openAction('in')}>
              Stock in
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => openAction('out')}>
              Stock out
            </button>
            {canManage && (
              <button type="button" className="btn" onClick={() => openAction('adjust')}>
                Stock take
              </button>
            )}
          </>
        }
      />

      <div className="filters">
        <select
          value={filters.productId}
          onChange={(e) => setFilters({ ...filters, productId: e.target.value, page: 1 })}
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.name}
            </option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
        >
          <option value="">All types</option>
          <option value="in">Stock in</option>
          <option value="out">Stock out</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </div>

      <ErrorNote error={error} />

      <div className="card">
        <DataTable
          loading={loading}
          rows={data?.data}
          empty={<EmptyState title="No movements recorded" message="Stock changes will appear here." />}
          columns={[
            {
              key: 'createdAt',
              header: 'When',
              render: (row) => <span className="cell-muted">{dateTime(row.createdAt)}</span>,
            },
            {
              key: 'productName',
              header: 'Product',
              render: (row) => (
                <>
                  <div className="cell-strong">{row.productName}</div>
                  <div className="cell-sku">{row.sku}</div>
                </>
              ),
            },
            { key: 'type', header: 'Type', render: (row) => <StatusBadge status={row.type} /> },
            {
              key: 'quantity',
              header: 'Change',
              align: 'right',
              render: (row) => (
                <span
                  className="num cell-strong"
                  style={{ color: row.quantity > 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  {row.quantity > 0 ? '+' : ''}
                  {number(row.quantity)}
                </span>
              ),
            },
            {
              key: 'quantityAfter',
              header: 'Balance',
              align: 'right',
              render: (row) => <span className="num">{number(row.quantityAfter)}</span>,
            },
            {
              key: 'reference',
              header: 'Reference',
              render: (row) => <span className="cell-sku">{row.reference || '—'}</span>,
            },
            { key: 'reason', header: 'Reason', render: (row) => row.reason || <span className="cell-muted">—</span> },
            { key: 'userName', header: 'By', render: (row) => <span className="cell-muted">{row.userName || '—'}</span> },
          ]}
        />
        <Pagination pagination={data?.pagination} onChange={(page) => setFilters({ ...filters, page })} />
      </div>

      <Modal
        open={Boolean(action)}
        title={labels?.title}
        onClose={() => setAction(null)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setAction(null)}>
              Cancel
            </button>
            <button type="submit" form="stock-form" className="btn" disabled={saving}>
              {saving ? 'Saving…' : labels?.verb}
            </button>
          </>
        }
      >
        <ErrorNote error={formError} />
        <form id="stock-form" onSubmit={handleSubmit}>
          <Field label="Product">
            <select
              required
              autoFocus
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              <option value="">Choose a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} ({p.quantity} in stock)
                </option>
              ))}
            </select>
          </Field>

          {action === 'adjust' ? (
            <Field
              label={labels.quantityLabel}
              hint={
                selectedProduct
                  ? `System says ${selectedProduct.quantity}. The difference is recorded as an adjustment.`
                  : undefined
              }
            >
              <input
                type="number"
                min="0"
                required
                value={form.countedQuantity}
                onChange={(e) => setForm({ ...form, countedQuantity: e.target.value })}
              />
            </Field>
          ) : (
            <Field
              label={labels?.quantityLabel}
              hint={
                selectedProduct && action === 'out'
                  ? `${selectedProduct.quantity} currently in stock`
                  : undefined
              }
            >
              <input
                type="number"
                min="1"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
          )}

          <Field label="Reason" hint="Shown in the ledger — be specific.">
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder={action === 'out' ? 'Damaged in transit' : 'Supplier sample'}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
