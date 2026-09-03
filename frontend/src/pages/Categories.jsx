/** Owner: Evan — feature/auth-catalog */
import { useState } from 'react';
import { api } from '../services/api.js';
import { date } from '../services/format.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { PageHeader, Badge, Field, ErrorNote, EmptyState } from '../components/ui.jsx';

export default function Categories() {
  const { canManage } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.categories.list(), []);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing('new');
    setForm({ name: '', description: '' });
    setFormError(null);
  };

  const openEdit = (category) => {
    setEditing(category.id);
    setForm({ name: category.name, description: category.description || '' });
    setFormError(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await api.categories.create(form);
        toast.success('Category created');
      } else {
        await api.categories.update(editing, form);
        toast.success('Category updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const warning =
      category.productCount > 0
        ? `${category.productCount} product(s) will become uncategorised. Continue?`
        : `Delete ${category.name}?`;
    if (!window.confirm(warning)) return;
    try {
      await api.categories.remove(category.id);
      toast.success('Category deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Group products so reports and filters stay meaningful."
        actions={
          canManage && (
            <button type="button" className="btn" onClick={openCreate}>
              + New category
            </button>
          )
        }
      />

      <ErrorNote error={error} />

      <div className="card">
        <DataTable
          loading={loading}
          rows={data?.data}
          empty={<EmptyState title="No categories yet" message="Add one to start organising the catalogue." />}
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="cell-strong">{r.name}</span> },
            {
              key: 'description',
              header: 'Description',
              render: (r) => r.description || <span className="cell-muted">—</span>,
            },
            {
              key: 'productCount',
              header: 'Products',
              align: 'right',
              render: (r) => <Badge tone={r.productCount ? 'info' : 'neutral'}>{r.productCount}</Badge>,
            },
            {
              key: 'createdAt',
              header: 'Created',
              align: 'right',
              render: (r) => <span className="cell-muted">{date(r.createdAt)}</span>,
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
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => handleDelete(row)}
                        >
                          Delete
                        </button>
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
        title={editing === 'new' ? 'New category' : 'Edit category'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="category-form" className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <ErrorNote error={formError} />
        <form id="category-form" onSubmit={handleSave}>
          <Field label="Name">
            <input
              type="text"
              required
              autoFocus
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
        </form>
      </Modal>
    </>
  );
}
