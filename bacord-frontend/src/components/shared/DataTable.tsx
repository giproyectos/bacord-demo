import { useState } from 'react'

export interface Column<T = unknown> {
  key: string
  header: string
  width?: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

interface Props<T = unknown> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
}

const PAGE = 10

export function DataTable<T = unknown>({ columns, data, loading, emptyMessage = 'No se encontraron registros' }: Props<T>) {
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return
    if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col.key); setSortDir('asc') }
    setPage(1)
  }

  const sorted = (sortKey && columns.find(c => c.key === sortKey)?.sortable)
    ? [...data].sort((a, b) => {
        const av = String((a as Record<string, unknown>)[sortKey!] ?? '').toLowerCase()
        const bv = String((b as Record<string, unknown>)[sortKey!] ?? '').toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv, 'es') : bv.localeCompare(av, 'es')
      })
    : data

  const total = sorted.length
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const safePage = Math.min(page, pages)
  const rows = sorted.slice((safePage - 1) * PAGE, safePage * PAGE)
  const from = total === 0 ? 0 : (safePage - 1) * PAGE + 1
  const to = Math.min(safePage * PAGE, total)

  const get = (row: T, key: string) => (row as Record<string, unknown>)[key]

  const pageNums: (number | '…')[] = []
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNums.push(i)
  } else {
    pageNums.push(1)
    if (safePage > 3) pageNums.push('…')
    for (let i = Math.max(2, safePage - 1); i <= Math.min(pages - 1, safePage + 1); i++) pageNums.push(i)
    if (safePage < pages - 2) pageNums.push('…')
    pageNums.push(pages)
  }

  return (
    <>
      <style>{`
        .dt-wrap { overflow-x: auto; }
        .dt { width: 100%; border-collapse: collapse; font-size: 13px; color: var(--ink-2); }

        .dt thead tr { background: #F8FAFC; border-bottom: 1.5px solid var(--hair-2); }
        .dt thead th {
          padding: 9px 13px; text-align: left;
          font-size: 11px; font-weight: 700; color: var(--ink-4);
          text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; user-select: none;
        }
        .dt thead th.dt-sortable { cursor: pointer; }
        .dt thead th.dt-sortable:hover { color: var(--navy); }

        .dt tbody tr { border-bottom: 1px solid var(--hair); transition: background 50ms; }
        .dt tbody tr:hover { background: #F8FAFC; }
        .dt tbody tr:last-child { border-bottom: none; }
        .dt tbody td { padding: 10px 13px; vertical-align: middle; }

        .dt-empty-td { padding: 52px 20px; text-align: center; }
        .dt-empty-icon { font-size: 28px; color: var(--hair-2); display: block; margin-bottom: 10px; }
        .dt-empty-msg  { font-size: 13px; color: var(--ink-4); }

        .dt-sk { height: 13px; background: var(--hair); border-radius: 3px; animation: dtsk 1.2s ease-in-out infinite; }
        @keyframes dtsk { 0%,100%{opacity:.7} 50%{opacity:.3} }

        .dt-footer { display:flex; align-items:center; justify-content:space-between; padding:10px 2px 0; font-size:12px; color:var(--ink-4); min-height:32px; }
        .dt-pgns { display:flex; gap:3px; }
        .dt-pgn {
          min-width:30px; height:30px; padding:0 7px; display:grid; place-items:center;
          border:1.5px solid var(--hair-2); border-radius:var(--r-sm); background:none;
          cursor:pointer; font-size:12.5px; font-family:var(--f-sans); color:var(--ink-3);
          transition:background 80ms, border-color 80ms;
        }
        .dt-pgn:hover:not(:disabled):not(.dt-pgn-ell) { background:var(--paper-2); border-color:var(--hair); }
        .dt-pgn:disabled { opacity:.35; cursor:not-allowed; }
        .dt-pgn.dt-pgn-cur { background:var(--navy); color:#fff; border-color:var(--navy); font-weight:600; }
        .dt-pgn.dt-pgn-ell  { border:none; cursor:default; padding:0 2px; }

        .dt-act { display:flex; align-items:center; gap:2px; justify-content:center; }
        .dt-ab {
          width:30px; height:30px; border:none; border-radius:8px; cursor:pointer;
          display:grid; place-items:center; font-size:12.5px; background:none;
          transition:background 100ms, color 100ms; flex-shrink:0;
        }
        .dt-ab-edit  { color:#2563EB; }
        .dt-ab-edit:hover  { background:#EFF6FF; }
        .dt-ab-del   { color:#DC2626; }
        .dt-ab-del:hover   { background:#FEF2F2; }
        .dt-ab-extra { color:var(--ink-4); }
        .dt-ab-extra:hover { background:var(--paper-2); color:var(--ink); }
      `}</style>

      <div className="dt-wrap">
        <table className="dt">
          <thead>
            <tr>
              {columns.map(c => (
                <th
                  key={c.key}
                  style={{ textAlign: c.align ?? 'left', width: c.width }}
                  className={c.sortable ? 'dt-sortable' : ''}
                  onClick={() => c.sortable && handleSort(c)}
                >
                  {c.header}
                  {c.sortable && (
                    <i
                      className={`fa fa-${sortKey === c.key ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}`}
                      style={{ marginLeft: 4, fontSize: 10, opacity: sortKey === c.key ? 1 : 0.3 }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{columns.map(c => <td key={c.key}><div className="dt-sk" /></td>)}</tr>
                ))
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="dt-empty-td">
                      <i className="fa fa-inbox dt-empty-icon" />
                      <span className="dt-empty-msg">{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              )
              : rows.map((row, i) => (
                <tr key={i}>
                  {columns.map(c => (
                    <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                      {c.render ? c.render(row) : String(get(row, c.key) ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <div className="dt-footer">
        <span>
          {!loading && total > 0 && (
            total > PAGE
              ? `Mostrando ${from}–${to} de ${total} registros`
              : `${total} registro${total !== 1 ? 's' : ''}`
          )}
        </span>
        {total > PAGE && (
          <div className="dt-pgns">
            <button className="dt-pgn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {pageNums.map((n, i) =>
              n === '…'
                ? <button key={`e${i}`} className="dt-pgn dt-pgn-ell" disabled>…</button>
                : <button
                    key={n}
                    className={`dt-pgn${safePage === n ? ' dt-pgn-cur' : ''}`}
                    onClick={() => setPage(n as number)}
                  >{n}</button>
            )}
            <button className="dt-pgn" disabled={safePage === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>
    </>
  )
}
