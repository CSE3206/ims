/**
 * Generic table renderer. Pass columns as
 *   [{ key, header, render?, align?, width? }]
 * so each page describes its data instead of repeating <table> markup.
 */
import { EmptyState, Spinner } from './ui.jsx';

export default function DataTable({ columns, rows, loading, empty, rowKey = (row) => row.id, onRowClick }) {
  if (loading) return <Spinner />;
  if (!rows?.length) {
    return empty || <EmptyState title="Nothing here yet" message="No records match this view." />;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: column.align || 'left', width: column.width }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'is-clickable' : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align || 'left' }}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
