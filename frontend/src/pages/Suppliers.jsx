/** Owner: Najmul — feature/purchasing */
import { useState } from 'react';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { PageHeader, Badge, Field, ErrorNote, EmptyState } from '../components/ui.jsx';

const BLANK = { name: '', contactPerson: '', email: '', phone: '', address: '', isActive: true };

export default function Suppliers() {
  const { canManage, isAdmin } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.suppliers.list(), []);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing('new');
    setForm(BLANK);
    setFormError(null);
  };

  const openEdit = (supplier) => {
    setEditing(supplier.id);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      isActive: supplier.isActive,
    });
    setFormError(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    // Blank optional fields must go over as null so the email format check
    // does not reject an empty string.
    const payload = {
      ...form,
      contactPerson: form.contactPerson || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
    };
    try {
      if (editing === 'new') {
        await api.suppliers.create(payload);
        toast.success('Supplier added');
      } else {
        await api.suppliers.update(editing, payload);
        toast.success('Supplier updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Delete ${supplier.name}? Suppliers with order history cannot be deleted.`)) return;
    try {
      await api.suppliers.remove(supplier.id);
      toast.success('Supplier deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Who we buy from, and how to reach them."
        actions={
          canManage && (
            <button type="button" className="btn" onClick={openCreate}>
              + New supplier
            </button>
          )
        }
      />

      <ErrorNote error={error} />

      <div className="card">
        <DataTable
          loading={loading}
          rows={data?.data}
          empty={<EmptyState title="No suppliers yet" message="Add a supplier before raising a purchase order." />}
          columns={[
            {
              key: 'name',
              header: 'Supplier',
              render: (row) => (
                <>
                  <div className="cell-strong">{row.name}</div>
                  {row.contactPerson && <div className="cell-muted">{row.contactPerson}</div>}
                </>
              ),
            },
            {
              key: 'email',
              header: 'Contact',
              render: (row) => (
                <>
                  <div>{row.email || <span className="cell-muted">—</span>}</div>
                  {row.phone && <div className="cell-muted">{row.phone}</div>}
                </>
              ),
            },
            {
              key: 'address',
              header: 'Address',
              render: (row) => <span className="cell-muted">{row.address || '—'}</span>,
            },
            {
              key: 'productCount',
              header: 'Products',
              align: 'right',
              render: (row) => <Badge tone={row.productCount ? 'info' : 'neutral'}>{row.productCount}</Badge>,
            },
            {
              key: 'isActive',
              header: 'Status',
              render: (row) => (
                <Badge tone={row.isActive ? 'success' : 'neutral'}>
                  {row.isActive ? 'active' : 'inactive'}
                </Badge>
              ),
            },
            ...(canManage
              ? [
                  {
                    key: 'actions',
                    header: '',
                    align: 'right',
                    render: (row) => (
                      <div className="row-actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(row)}>
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
      </div>

      <Modal
        open={Boolean(editing)}
        title={editing === 'new' ? 'New supplier' : 'Edit supplier'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="supplier-form" className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save supplier'}
            </button>
          </>
        }
      >
        <ErrorNote error={formError} />
        <form id="supplier-form" onSubmit={handleSave}>
          <Field label="Company name">
            <input
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="form-row">
            <Field label="Contact person">
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active supplier
          </label>
        </form>
      </Modal>
    </>
  );
}
