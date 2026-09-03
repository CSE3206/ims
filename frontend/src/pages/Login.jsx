/** Owner: Evan — feature/auth-catalog */
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, ErrorNote } from '../components/ui.jsx';

const DEMO_ACCOUNTS = [
  { email: 'evan@ims.local', role: 'admin' },
  { email: 'najmul@ims.local', role: 'manager' },
  { email: 'rukaiya@ims.local', role: 'staff' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__brand">
          <span className="sidebar__logo">IMS</span>
          <h1>Inventory Management</h1>
          <p>Sign in to continue</p>
        </div>

        <ErrorNote error={error} />

        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-hint">
          <strong>Demo accounts (password: <code>password123</code>)</strong>
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => setForm({ email: account.email, password: 'password123' })}
            >
              {account.email} — {account.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
