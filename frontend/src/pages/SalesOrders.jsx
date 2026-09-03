/**
 * Owner: Rukaiya — feature/inventory-reports
 * Sell stock out. Confirming checks availability; fulfilling deducts stock.
 */
import { useState } from 'react';
import { api } from '../services/api.js';
import { currency, dateTime } from '../services/format.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import LineItemEditor from '../components/LineItemEditor.jsx';
import { PageHeader, StatusBadge, Pagination, Field, ErrorNote, EmptyState, Spinner } from '../components/ui.jsx';

const BLANK_ITEM = { productId: '', quantity: 1, unitPrice: 0 };

export default function SalesOrders() {
  const { canManage } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState({ status: '', page: 1, limit: 20 });
  const { data, loading, error, reload } = useFetch(
    () => api.salesOrders.list(filters),
    [filters.status, filters.page],
  );
  const { data: productData, reload: reloadProducts } = useFetch(
    () => api.products.list({ limit: 200 }),
    [],
  );

  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState({ customerName: '', customerEmail: '', notes: '', items: [BLANK_ITEM] });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const products = productData?.data || [];

  const openCreate = () => {
    setForm({ customerName: '', customerEmail: '', notes: '', items: [BLANK_ITEM] });
    setFormError(null);
    setCreating(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.salesOrders.create({
        customerName: form.customerName,
        customerEmail: form.customerEmail || null,
        notes: form.notes || null,
        items: form.items.filter((item) => item.productId),
      });
      toast.success('Sales order created as a draft');
      setCreating(false);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action, id, successMessage) => {
    try {
      await action(id);
      toast.success(successMessage);
      reload();
      // Fulfilment changes stock, so the product list the editor uses is stale.
      reloadProducts();
      if (detailId) setDetailId(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Sales Orders"
        subtitle="Sell stock out. Fulfilling an order removes its items from inventory."
        actions={
          <button type="button" className="btn" onClick={openCreate}>
            + New sales order
          </button>
        }
      />

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <ErrorNote error={error} />

      <div className="card">
        <DataTable
          loading={loading}
          rows={data?.data}
          onRowClick={(row) => setDetailId(row.id)}
          empty={<EmptyState title="No sales orders" message="Create one to record a sale." />}
          columns={[
            {
              key: 'soNumber',
              header: 'SO number',
              render: (row) => <span className="cell-sku cell-strong">{row.soNumber}</span>,
            },
            {
              key: 'customerName',
              header: 'Customer',
              render: (row) => (
                <>
                  <div className="cell-strong">{row.customerName}</div>
                  {row.customerEmail && <div className="cell-muted">{row.customerEmail}</div>}
                </>
              ),
            },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'itemCount', header: 'Lines', align: 'right', render: (r) => <span className="num">{r.itemCount}</span> },
            { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="num cell-strong">{currency(r.total)}</span> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {row.status === 'draft' && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => runAction(api.salesOrders.confirm, row.id, `${row.soNumber} confirmed`)}
                    >
                      Confirm
                    </button>
                  )}
                  {row.status === 'confirmed' && (
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() =>
                        runAction(api.salesOrders.fulfil, row.id, `${row.soNumber} fulfilled — stock deducted`)
                      }
                    >
                      Fulfil
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
        <Pagination pagination={data?.pagination} onChange={(page) => setFilters({ ...filters, page })} />
      </div>

      <Modal
        open={creating}
        wide
        title="New sales order"
        onClose={() => setCreating(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="submit" form="so-form" className="btn" disabled={saving}>
              {saving ? 'Creating…' : 'Create draft'}
            </button>
          </>
        }
      >
        <ErrorNote error={formError} />
        <form id="so-form" onSubmit={handleCreate}>
          <div className="form-row">
            <Field label="Customer name">
              <input
                type="text"
                required
                autoFocus
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
            </Field>
            <Field label="Customer email">
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Line items">
            <LineItemEditor
              items={form.items}
              onChange={(items) => setForm({ ...form, items })}
              products={products}
              priceKey="unitPrice"
              priceLabel="Unit price"
              showAvailable
            />
          </Field>

          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </form>
      </Modal>

      <SalesOrderDetail
        id={detailId}
        onClose={() => setDetailId(null)}
        onAction={runAction}
        canManage={canManage}
      />
    </>
  );
}

function SalesOrderDetail({ id, onClose, onAction, canManage }) {
  const { data, loading, error } = useFetch(
    () => (id ? api.salesOrders.get(id) : Promise.resolve(null)),
    [id],
  );
  const order = data?.data;

  return (
    <Modal open={Boolean(id)} wide title={order ? `Sales order ${order.soNumber}` : 'Loading…'} onClose={onClose}>
      {loading && <Spinner />}
      <ErrorNote error={error} />
      {order && (
        <>
          <div className="grid grid--stats" style={{ marginBottom: 18 }}>
            <div>
              <p className="stat-card__label">Customer</p>
              <p className="cell-strong">{order.customerName}</p>
              <p className="cell-muted">{order.customerEmail || '—'}</p>
            </div>
            <div>
              <p className="stat-card__label">Status</p>
              <StatusBadge status={order.status} />
            </div>
            <div>
              <p className="stat-card__label">Fulfilled</p>
              <p>{order.fulfilledAt ? dateTime(order.fulfilledAt) : '—'}</p>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>In stock</th>
                <th style={{ textAlign: 'right' }}>Unit price</th>
                <th style={{ textAlign: 'right' }}>Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="cell-strong">{item.product.name}</div>
                    <div className="cell-sku">{item.product.sku}</div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td
                    className="num"
                    style={{
                      textAlign: 'right',
                      color: item.product.quantity < item.quantity ? 'var(--danger)' : 'inherit',
                    }}
                  >
                    {item.product.quantity}
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{currency(item.unitPrice)}</td>
                  <td className="num cell-strong" style={{ textAlign: 'right' }}>
                    {currency(item.quantity * Number(item.unitPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="line-items__total" style={{ borderRadius: 6, marginTop: 12 }}>
            <span>Order total</span>
            <span>{currency(order.total)}</span>
          </div>

          <div className="row-actions" style={{ marginTop: 18, justifyContent: 'flex-start' }}>
            {order.status === 'draft' && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onAction(api.salesOrders.confirm, order.id, `${order.soNumber} confirmed`)}
              >
                Confirm order
              </button>
            )}
            {order.status === 'confirmed' && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  onAction(api.salesOrders.fulfil, order.id, `${order.soNumber} fulfilled — stock deducted`)
                }
              >
                Fulfil &amp; ship
              </button>
            )}
            {canManage && ['draft', 'confirmed'].includes(order.status) && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => onAction(api.salesOrders.cancel, order.id, `${order.soNumber} cancelled`)}
              >
                Cancel order
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
