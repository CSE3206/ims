/**
 * Owner: Rukaiya — feature/inventory-reports
 * Three reports, each downloadable as CSV from the same endpoint.
 */
import { useState } from 'react';
import { api } from '../services/api.js';
import { currency, number, date, downloadBlob } from '../services/format.js';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../context/ToastContext.jsx';
import DataTable from '../components/DataTable.jsx';
import { PageHeader, ErrorNote, EmptyState } from '../components/ui.jsx';

const TABS = [
  { key: 'valuation', label: 'Inventory valuation' },
  { key: 'top-products', label: 'Top products' },
  { key: 'stock-flow', label: 'Stock flow' },
];

const FETCHERS = {
  valuation: () => api.reports.valuation(),
  'top-products': () => api.reports.topProducts(),
  'stock-flow': () => api.reports.stockFlow(),
};

const COLUMNS = {
  valuation: [
    { key: 'sku', header: 'SKU', render: (r) => <span className="cell-sku">{r.sku}</span> },
    { key: 'name', header: 'Product', render: (r) => <span className="cell-strong">{r.name}</span> },
    { key: 'category', header: 'Category' },
    { key: 'quantity', header: 'Qty', align: 'right', render: (r) => <span className="num">{number(r.quantity)}</span> },
    { key: 'costPrice', header: 'Cost', align: 'right', render: (r) => <span className="num cell-muted">{currency(r.costPrice)}</span> },
    { key: 'stockValue', header: 'Stock value', align: 'right', render: (r) => <span className="num cell-strong">{currency(r.stockValue)}</span> },
    { key: 'potentialRevenue', header: 'If all sold', align: 'right', render: (r) => <span className="num">{currency(r.potentialRevenue)}</span> },
  ],
  'top-products': [
    { key: 'sku', header: 'SKU', render: (r) => <span className="cell-sku">{r.sku}</span> },
    { key: 'name', header: 'Product', render: (r) => <span className="cell-strong">{r.name}</span> },
    { key: 'unitsSold', header: 'Units sold', align: 'right', render: (r) => <span className="num">{number(r.unitsSold)}</span> },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => <span className="num cell-strong">{currency(r.revenue)}</span> },
  ],
  'stock-flow': [
    { key: 'day', header: 'Day', render: (r) => date(r.day) },
    { key: 'unitsIn', header: 'Units in', align: 'right', render: (r) => <span className="num" style={{ color: 'var(--success)' }}>+{number(r.unitsIn)}</span> },
    { key: 'unitsOut', header: 'Units out', align: 'right', render: (r) => <span className="num" style={{ color: 'var(--danger)' }}>−{number(r.unitsOut)}</span> },
    {
      key: 'net',
      header: 'Net',
      align: 'right',
      render: (r) => <span className="num cell-strong">{number(r.unitsIn - r.unitsOut)}</span>,
    },
  ],
};

export default function Reports() {
  const toast = useToast();
  const [tab, setTab] = useState('valuation');
  const { data, loading, error } = useFetch(() => FETCHERS[tab](), [tab]);

  const rows = data?.data || [];

  const handleExport = async () => {
    try {
      const blob = await api.reports.downloadCsv(tab);
      downloadBlob(blob, `${tab}-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Valuation is the only report with a meaningful grand total.
  const totalValue =
    tab === 'valuation' ? rows.reduce((sum, r) => sum + Number(r.stockValue), 0) : null;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Export any of these as CSV for a spreadsheet or the report submission."
        actions={
          <button type="button" className="btn" onClick={handleExport} disabled={!rows.length}>
            ↓ Export CSV
          </button>
        }
      />

      <div className="filters">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`btn ${tab === item.key ? '' : 'btn--ghost'}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ErrorNote error={error} />

      <div className="card">
        <DataTable
          loading={loading}
          rows={rows}
          rowKey={(row, index) => row.sku || row.day || index}
          empty={<EmptyState title="Nothing to report yet" message="Record some stock movements first." />}
          columns={COLUMNS[tab]}
        />
        {totalValue !== null && rows.length > 0 && (
          <div className="line-items__total">
            <span>Total inventory value at cost</span>
            <span>{currency(totalValue)}</span>
          </div>
        )}
      </div>
    </>
  );
}
