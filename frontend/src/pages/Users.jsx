/** Owner: Evan — feature/auth-catalog. Admin-only. */
import { useState } from 'react';
import { api } from '../services/api.js';
import { date } from '../services/format.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { PageHeader, Badge, Field, ErrorNote } from '../components/ui.jsx';

const ROLE_TONES = { admin: 'info', manager: 'success', staff: 'neutral' };
const BLANK = { name: '', email: '', password: '', role: 'staff' };

export default function Users() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.users.list(), []);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing('new');
    setForm(BLANK);
    setFormError(null);
  };

  const openEdit = (row) => {
    setEditing(row.id);
    // Password stays blank on edit; only sent if the admin types a new one.
    setForm({ name: row.name, email: row.email, password: '', role: row.role });
    setFormError(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await api.users.create(form);
        toast.success('User created');
      } else {
        const patch = { name: form.name, role: form.role };
        if (form.password) patch.password = form.password;
        await api.users.update(editing, patch);
        toast.success('User updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await api.users.update(row.id, { isActive: !row.isActive });
      toast.success(row.isActive ? 'User deactivated' : 'User reactivated');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Admins manage everything, managers manage data, staff record stock."
        actions={
          <button type="button" className="btn" onClick={openCreate}>
            + New user
          </button>
        }
      />

      <ErrorNote error={error} />

      <div className="card">
        <DataTable
          loading={loading}
          rows={data?.data}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (row) => (
                <>
                  <span className="cell-strong">{row.name}</span>
                  {row.id === currentUser?.id && <span className="cell-muted"> (you)</span>}
                </>
              ),
            },
            { key: 'email', header: 'Email', render: (r) => <span className="cell-muted">{r.email}</span> },
            { key: 'role', header: 'Role', render: (row) => <Badge tone={ROLE_TONES[row.role]}>{row.role}</Badge> },
            {
              key: 'isActive',
              header: 'Status',
              render: (row) => (
                <Badge tone={row.isActive ? 'success' : 'danger'}>
                  {row.isActive ? 'active' : 'disabled'}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              header: 'Joined',
              align: 'right',
              render: (r) => <span className="cell-muted">{date(r.createdAt)}</span>,
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <div className="row-actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  {row.id !== currentUser?.id && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => toggleActive(row)}
                    >
                      {row.isActive ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={Boolean(editing)}
        title={editing === 'new' ? 'New user' : 'Edit user'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="user-form" className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save user'}
            </button>
          </>
        }
      >
        <ErrorNote error={formError} />
        <form id="user-form" onSubmit={handleSave}>
          <Field label="Full name">
            <input
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              disabled={editing !== 'new'}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field
            label={editing === 'new' ? 'Password' : 'New password'}
            hint={editing === 'new' ? 'At least 6 characters' : 'Leave blank to keep the current password'}
          >
            <input
              type="password"
              required={editing === 'new'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff — record stock, create sales orders</option>
              <option value="manager">Manager — manage products, suppliers, orders</option>
              <option value="admin">Admin — everything, including users</option>
            </select>
          </Field>
        </form>
      </Modal>
    </>
  );
}
