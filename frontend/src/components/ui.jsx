/**
 * Small presentational building blocks shared by every page.
 * Keeping them together avoids a dozen one-component files.
 */

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = 'default' }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {hint && <p className="stat-card__hint">{hint}</p>}
    </div>
  );
}

/** Coloured pill for statuses, roles and movement types. */
export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

const STATUS_TONES = {
  draft: 'neutral',
  ordered: 'info',
  received: 'success',
  confirmed: 'info',
  fulfilled: 'success',
  cancelled: 'danger',
  in: 'success',
  out: 'danger',
  adjustment: 'warning',
};

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONES[status] || 'neutral'}>{status}</Badge>;
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="page-loading">{label}</div>;
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return (
    <div className="alert alert--error">
      <strong>{error.message}</strong>
      {error.details?.length > 0 && (
        <ul>
          {error.details.map((detail) => (
            <li key={`${detail.field}-${detail.message}`}>
              <code>{detail.field}</code> — {detail.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Simple prev/next pager driven by the API's pagination block. */
export function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;

  return (
    <div className="pagination">
      <span>
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="pagination__buttons">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/** Labelled form field with an inline error slot. */
export function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && !error && <small className="field__hint">{hint}</small>}
      {error && <small className="field__error">{error}</small>}
    </label>
  );
}
