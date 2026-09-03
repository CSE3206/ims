/**
 * Owner: Rukaiya — feature/inventory-reports
 * One screen answering: what do we own, what is running out, what just moved?
 */
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { currency, number, dateTime } from '../services/format.js';
import { useFetch } from '../hooks/useFetch.js';
import DataTable from '../components/DataTable.jsx';
import { PageHeader, StatCard, StatusBadge, Spinner, ErrorNote } from '../components/ui.jsx';

export default function Dashboard() {
  const { data, loading, error } = useFetch(() => api.reports.dashboard(), []);

  if (loading) return <Spinner />;
  if (error) return <ErrorNote error={error} />;

  const { metrics, lowStock, recentMovements, stockByCategory } = data;
  const maxCategoryValue = Math.max(...stockByCategory.map((c) => Number(c.value)), 1);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Live picture of stock, purchasing and sales."
      />

      <div className="grid grid--stats" style={{ marginBottom: 20 }}>
        <StatCard
          label="Stock value"
          value={currency(metrics.stockValue)}
          hint={`${number(metrics.totalUnits)} units at cost`}
        />
        <StatCard
          label="Products"
          value={number(metrics.productCount)}
          hint={`${metrics.categoryCount} categories · ${metrics.supplierCount} suppliers`}
          tone="info"
        />
        <StatCard
          label="Low stock"
          value={number(metrics.lowStockCount)}
          hint={`${metrics.outOfStockCount} completely out`}
          tone={metrics.lowStockCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Revenue (fulfilled)"
          value={currency(metrics.fulfilledRevenue)}
          hint={`${metrics.openSalesOrders} open sales orders`}
          tone="success"
        />
        <StatCard
          label="Open purchase orders"
          value={number(metrics.openPurchaseOrders)}
          hint="Awaiting delivery"
          tone="info"
        />
      </div>

      <div className="grid grid--halves" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card__header">
            <h2>Needs reordering</h2>
            <Link className="btn btn--ghost btn--sm" to="/products?lowStock=true">
              View all
            </Link>
          </div>
          <DataTable
            loading={false}
            rows={lowStock}
            empty={<div className="empty-state"><p>Everything is above its reorder level.</p></div>}
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
              { key: 'supplierName', header: 'Supplier', render: (r) => r.supplierName || '—' },
              {
                key: 'quantity',
                header: 'On hand',
                align: 'right',
                render: (row) => (
                  <span className="num">
                    <strong style={{ color: row.quantity === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                      {row.quantity}
                    </strong>
                    <span className="cell-muted"> / {row.reorderLevel}</span>
                  </span>
                ),
              },
            ]}
          />
        </div>

        <div className="card">
          <div className="card__header">
            <h2>Stock value by category</h2>
          </div>
          <div className="card__body">
            {stockByCategory.map((row) => (
              <div className="bar-row" key={row.category}>
                <span className="bar-row__label">{row.category}</span>
                <span className="bar-row__track">
                  <span
                    className="bar-row__fill"
                    style={{ width: `${(Number(row.value) / maxCategoryValue) * 100}%` }}
                  />
                </span>
                <span className="bar-row__value">{currency(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2>Recent stock movements</h2>
          <Link className="btn btn--ghost btn--sm" to="/stock">
            Full ledger
          </Link>
        </div>
        <DataTable
          loading={false}
          rows={recentMovements}
          columns={[
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
                  {row.quantity}
                </span>
              ),
            },
            { key: 'reference', header: 'Reference', render: (r) => r.reference || '—' },
            {
              key: 'createdAt',
              header: 'When',
              align: 'right',
              render: (row) => <span className="cell-muted">{dateTime(row.createdAt)}</span>,
            },
          ]}
        />
      </div>
    </>
  );
}
