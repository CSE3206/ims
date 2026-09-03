/**
 * Owner: Evan — feature/auth-catalog
 * Searchable, filterable, paginated catalogue with create/edit/delete.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { currency, number } from '../services/format.js';
import { useFetch, useDebounced } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { PageHeader, Pagination, Field, ErrorNote, EmptyState } from '../components/ui.jsx';

const BLANK = {
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  supplierId: '',
  unit: 'pcs',
  costPrice: 0,
  sellingPrice: 0,
  quantity: 0,
  reorderLevel: 10,
};

export default function Products() {
  const { canManage, isAdmin } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    supplierId: '',
    // Deep link from the dashboard: /products?lowStock=true
    lowStock: searchParams.get('lowStock') === 'true',
    page: 1,
    limit: 20,
  });
  const debouncedSearch = useDebounced(filters.search);

  const query = {
    ...filters,
    search: debouncedSearch,
    lowStock: filters.lowStock ? 'true' : undefined,
  };

  const { data, loading, error, reload } = useFetch(
    () => api.products.list(query),
    [debouncedSearch, filters.categoryId, filters.supplierId, filters.lowStock, filters.page],
  );
  const { data: categoryData } = useFetch(() => api.categories.list(), []);
  const { data: supplierData } = useFetch(() => api.suppliers.list(), []);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const categories = categoryData?.data || [];
  const suppliers = supplierData?.data || [];

  const openCreate = () => {
    setEditing('new');
    setForm(BLANK);
    setFormError(null);
  };

  const openEdit = (product) => {
    setEditing(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      unit: product.unit,
      costPrice: Number(product.costPrice),
      sellingPrice: Number(product.sellingPrice),
      reorderLevel: product.reorderLevel,
    });
    setFormError(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    // Empty selects must be sent as null, not "", or the uuid check fails.
    const payload = {
      ...form,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
    };
    if (editing !== 'new') delete payload.quantity;

    try {
      if (editing === 'new') {
        await api.products.create(payload);
        toast.success('Product created');
      } else {
        await api.products.update(editing, payload);
        toast.success('Product updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await api.products.remove(product.id);
      toast.success('Product deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Everything the warehouse holds, with live stock levels."
        actions={
          canManage && (
            <button type="button" className="btn" onClick={openCreate}>
              + New product
            </button>
          )
        }
      />

      <div className="filters">
        <input
          type="search"
          placeholder="Search name or SKU…"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
        />
        <select value={filters.categoryId} onChange={(e) => setFilter({ categoryId: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={filters.supplierId} onChange={(e) => setFilter({ supplierId: e.target.value })}>
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(e) => setFilter({ lowStock: e.target.checked })}
          />
          Low stock only
        </label>
      </div>

      <ErrorNote error={error} />

      <div className="card">
        <DataTable
          loading={loading}
          rows={data?.data}
          empty={
            <EmptyState
              title="No products found"
              message="Try clearing the filters, or add your first product."
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Product',
              render: (row) => (
                <>
                  <div className="cell-strong">{row.name}</div>
                  <div className="cell-sku">{row.sku}</div>
                </>
              ),
            },
            {
              key: 'categoryName',
              header: 'Category',
              render: (row) => row.categoryName || <span className="cell-muted">Uncategorised</span>,
            },
            {
              key: 'supplierName',
              header: 'Supplier',
              render: (row) => row.supplierName || <span className="cell-muted">—</span>,
            },
            {
              key: 'quantity',
              header: 'On hand',
              align: 'right',
              render: (row) => <StockCell row={row} />,
            },
            {
              key: 'costPrice',
              header: 'Cost',
              align: 'right',
              render: (row) => <span className="num cell-muted">{currency(row.costPrice)}</span>,
            },
            {
              key: 'sellingPrice',
              header: 'Price',
              align: 'right',
              render: (row) => <span className="num cell-strong">{currency(row.sellingPrice)}</span>,
            },
            ...(canManage
              ? [
                  {
                    key: 'actions',
                    header: '',
                    align: 'right',
                    render: (row) => (
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            onClick={() => handleDelete(row)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
        <Pagination
          pagination={data?.pagination}
          onChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </div>

      <Modal
        open={Boolean(editing)}
        title={editing === 'new' ? 'New product' : 'Edit product'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="product-form" className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save product'}
            </button>
          </>
        }
      >
        <ErrorNote error={formError} />
        <form id="product-form" onSubmit={handleSave}>
          <div className="form-row">
            <Field label="SKU">
              <input
                type="text"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="LAP-1001"
              />
            </Field>
            <Field label="Unit">
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="pcs"
              />
            </Field>
          </div>

          <Field label="Name">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div className="form-row">
            <Field label="Category">
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Supplier">
              <select
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              >
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="form-row--three form-row">
            <Field label="Cost price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </Field>
            <Field label="Selling price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
              />
            </Field>
            <Field label="Reorder level" hint="Warn below this">
              <input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              />
            </Field>
          </div>

          {editing === 'new' && (
            <Field
              label="Opening stock"
              hint="Recorded as a stock movement. Afterwards, change stock from the Stock page."
            >
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
          )}
        </form>
      </Modal>
    </>
  );
}

/** On-hand quantity with a small bar showing how it compares to reorder level. */
function StockCell({ row }) {
  const ratio = Math.min(row.quantity / Math.max(row.reorderLevel * 2, 1), 1);
  const colour =
    row.quantity === 0
      ? 'var(--danger)'
      : row.quantity <= row.reorderLevel
        ? 'var(--warning)'
        : 'var(--success)';

  return (
    <span className="stock-bar" style={{ justifyContent: 'flex-end' }}>
      <span className="num cell-strong" style={{ color: colour }}>
        {number(row.quantity)}
      </span>
      <span className="stock-bar__track">
        <span
          className="stock-bar__fill"
          style={{ width: `${Math.max(ratio * 100, 4)}%`, background: colour }}
        />
      </span>
    </span>
  );
}
