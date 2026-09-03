/**
 * Owner: Najmul — feature/purchasing
 * Raise a PO, send it to the supplier, then receive it — receiving is what
 * actually adds stock.
 */
import { useState } from 'react';
import { api } from '../services/api.js';
import { currency, date, dateTime } from '../services/format.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import LineItemEditor from '../components/LineItemEditor.jsx';
import { PageHeader, StatusBadge, Pagination, Field, ErrorNote, EmptyState, Spinner } from '../components/ui.jsx';

const BLANK_ITEM = { productId: '', quantity: 1, unitCost: 0 };

export default function PurchaseOrders() {
  const { canManage } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState({ status: '', page: 1, limit: 20 });
  const { data, loading, error, reload } = useFetch(
    () => api.purchaseOrders.list(filters),
    [filters.status, filters.page],
  );
  const { data: supplierData } = useFetch(() => api.suppliers.list(), []);
  // limit=200 so every product is selectable in the line editor without paging.
  const { data: productData } = useFetch(() => api.products.list({ limit: 200 }), []);

  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState({ supplierId: '', expectedAt: '', notes: '', items: [BLANK_ITEM] });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const suppliers = supplierData?.data || [];
  const products = productData?.data || [];

  const openCreate = () => {
    setForm({ supplierId: '', expectedAt: '', notes: '', items: [BLANK_ITEM] });
    setFormError(null);
    setCreating(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.purchaseOrders.create({
        supplierId: form.supplierId,
        expectedAt: form.expectedAt || null,
        notes: form.notes || null,
        items: form.items.filter((item) => item.productId),
      });
      toast.success('Purchase order created as a draft');
      setCreating(false);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  /** Runs one of the status transitions and refreshes both list and drawer. */
  const runAction = async (action, id, successMessage) => {
    try {
      await action(id);
      toast.success(successMessage);
      reload();
      if (detailId) setDetailId(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        subtitle="Buy stock in. Receiving an order adds its items to inventory."
        actions={
          canManage && (
            <button type="button" className="btn" onClick={openCreate}>
              + New purchase order
            </button>
          )
        }
      />

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <ErrorNote error={error} />

      <div className="card">
        <DataTable
          loading={loading}
          rows={data?.data}
          onRowClick={(row) => setDetailId(row.id)}
          empty={<EmptyState title="No purchase orders" message="Raise one to restock the warehouse." />}
          columns={[
            {
              key: 'poNumber',
              header: 'PO number',
              render: (row) => <span className="cell-sku cell-strong">{row.poNumber}</span>,
            },
            { key: 'supplierName', header: 'Supplier', render: (r) => <span className="cell-strong">{r.supplierName}</span> },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'itemCount', header: 'Lines', align: 'right', render: (r) => <span className="num">{r.itemCount}</span> },
            { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="num cell-strong">{currency(r.total)}</span> },
            {
              key: 'expectedAt',
              header: 'Expected',
              render: (r) => <span className="cell-muted">{r.expectedAt ? date(r.expectedAt) : '—'}</span>,
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {canManage && row.status === 'draft' && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => runAction(api.purchaseOrders.order, row.id, `${row.poNumber} sent to supplier`)}
                    >
                      Mark ordered
                    </button>
                  )}
                  {['draft', 'ordered'].includes(row.status) && (
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() =>
                        runAction(api.purchaseOrders.receive, row.id, `${row.poNumber} received — stock updated`)
                      }
                    >
                      Receive
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
        <Pagination pagination={data?.pagination} onChange={(page) => setFilters({ ...filters, page })} />
      </div>

      {/* --- create ------------------------------------------------------- */}
      <Modal
        open={creating}
        wide
        title="New purchase order"
        onClose={() => setCreating(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="submit" form="po-form" className="btn" disabled={saving}>
              {saving ? 'Creating…' : 'Create draft'}
            </button>
          </>
        }
      >
        <ErrorNote error={formError} />
        <form id="po-form" onSubmit={handleCreate}>
          <div className="form-row">
            <Field label="Supplier">
              <select
                required
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              >
                <option value="">Choose a supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Expected delivery">
              <input
                type="date"
                value={form.expectedAt}
                onChange={(e) => setForm({ ...form, expectedAt: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Line items">
            <LineItemEditor
              items={form.items}
              onChange={(items) => setForm({ ...form, items })}
              products={products}
              priceKey="unitCost"
              priceLabel="Unit cost"
            />
          </Field>

          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </form>
      </Modal>

      {/* --- detail ------------------------------------------------------- */}
      <PurchaseOrderDetail
        id={detailId}
        onClose={() => setDetailId(null)}
        onAction={runAction}
        canManage={canManage}
      />
    </>
  );
}

function PurchaseOrderDetail({ id, onClose, onAction, canManage }) {
  const { data, loading, error } = useFetch(
    () => (id ? api.purchaseOrders.get(id) : Promise.resolve(null)),
    [id],
  );
  const order = data?.data;

  return (
    <Modal open={Boolean(id)} wide title={order ? `Purchase order ${order.poNumber}` : 'Loading…'} onClose={onClose}>
      {loading && <Spinner />}
      <ErrorNote error={error} />
      {order && (
        <>
          <div className="grid grid--stats" style={{ marginBottom: 18 }}>
            <div>
              <p className="stat-card__label">Supplier</p>
              <p className="cell-strong">{order.supplier?.name}</p>
              <p className="cell-muted">{order.supplier?.email || '—'}</p>
            </div>
            <div>
              <p className="stat-card__label">Status</p>
              <StatusBadge status={order.status} />
            </div>
            <div>
              <p className="stat-card__label">Expected</p>
              <p>{date(order.expectedAt)}</p>
            </div>
            <div>
              <p className="stat-card__label">Received</p>
              <p>{order.receivedAt ? dateTime(order.receivedAt) : '—'}</p>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit cost</th>
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
                  <td className="num" style={{ textAlign: 'right' }}>{currency(item.unitCost)}</td>
                  <td className="num cell-strong" style={{ textAlign: 'right' }}>
                    {currency(item.quantity * Number(item.unitCost))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="line-items__total" style={{ borderRadius: 6, marginTop: 12 }}>
            <span>Order total</span>
            <span>{currency(order.total)}</span>
          </div>

          {order.notes && (
            <p className="cell-muted" style={{ marginTop: 12 }}>
              <strong>Notes:</strong> {order.notes}
            </p>
          )}

          <div className="row-actions" style={{ marginTop: 18, justifyContent: 'flex-start' }}>
            {canManage && order.status === 'draft' && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onAction(api.purchaseOrders.order, order.id, `${order.poNumber} sent to supplier`)}
              >
                Mark as ordered
              </button>
            )}
            {['draft', 'ordered'].includes(order.status) && (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    onAction(api.purchaseOrders.receive, order.id, `${order.poNumber} received — stock updated`)
                  }
                >
                  Receive goods
                </button>
                {canManage && (
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => onAction(api.purchaseOrders.cancel, order.id, `${order.poNumber} cancelled`)}
                  >
                    Cancel order
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
