/** App shell: sidebar navigation + top bar. Every signed-in page renders here. */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: '▦', end: true }],
  },
  {
    label: 'Catalogue',
    items: [
      { to: '/products', label: 'Products', icon: '▣' },
      { to: '/categories', label: 'Categories', icon: '◱' },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { to: '/suppliers', label: 'Suppliers', icon: '⌂' },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: '↓' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/sales-orders', label: 'Sales Orders', icon: '↑' },
      { to: '/stock', label: 'Stock Movements', icon: '⇄' },
      { to: '/reports', label: 'Reports', icon: '◔' },
    ],
  },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">IMS</span>
          <div>
            <strong>Inventory</strong>
            <small>Management System</small>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV_SECTIONS.map((section) => (
            <div className="sidebar__section" key={section.label}>
              <p className="sidebar__section-label">{section.label}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
                >
                  <span className="sidebar__icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}

          {isAdmin && (
            <div className="sidebar__section">
              <p className="sidebar__section-label">Admin</p>
              <NavLink
                to="/users"
                className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
              >
                <span className="sidebar__icon">◎</span>
                Users
              </NavLink>
            </div>
          )}
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__user">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{user?.name}</strong>
              <small className={`role-tag role-tag--${user?.role}`}>{user?.role}</small>
            </div>
          </div>
          <button type="button" className="btn btn--ghost" onClick={handleLogout}>
            Sign out
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
