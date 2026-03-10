import React, { useState } from 'react';
import { Layers, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// Sortable column header
function SortTh({ label, field, sort, onSort, style }) {
  const isActive = sort.field === field;
  const Icon = isActive ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
      onClick={() => onSort(field)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <Icon size={12} style={{ color: isActive ? '#60a5fa' : '#475569' }} />
      </span>
    </th>
  );
}

export default function ONTable({ ons, onSelect, loading }) {
  const [sort, setSort] = useState({ field: 'ticker', dir: 'asc' });

  const handleSort = (field) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '32px', borderRadius: '16px', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontWeight: 'bold' }}>Cargando obligaciones negociables...</p>
      </div>
    );
  }

  if (!ons || ons.length === 0) {
    return (
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '32px', borderRadius: '16px', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontWeight: 'bold' }}>No se encontraron obligaciones negociables.</p>
      </div>
    );
  }

  const getCurrencyLabel = (c) => c === 'USD' ? 'USD' : c === 'USD_CABLE' ? 'USD C' : c || '-';
  const getCurrencyColor = (c) => c === 'USD' ? '#22c55e' : c === 'USD_CABLE' ? '#3b82f6' : '#fbbf24';

  const formatPrice = (price, currency) => {
    if (!price || price <= 0) return 'N/A';
    const sym = currency === 'USD' ? 'u$d' : currency === 'USD_CABLE' ? 'u$d C' : '$';
    return price >= 1000
      ? `${sym} ${Math.round(price).toLocaleString('es-AR')}`
      : `${sym} ${price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Sort rows
  const sorted = [...ons].sort((a, b) => {
    let va = a[sort.field] ?? '';
    let vb = b[sort.field] ?? '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sort.dir === 'asc' ? -1 : 1;
    if (va > vb) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <tr>
            <SortTh label="Instrumento" field="ticker" sort={sort} onSort={handleSort} style={{ padding: '16px 24px' }} />
            <SortTh label="Precio Dirty" field="price" sort={sort} onSort={handleSort} />
            <SortTh label="Precio Clean" field="clean_price" sort={sort} onSort={handleSort} />
            <th>Moneda</th>
            <SortTh label="Paridad" field="parity" sort={sort} onSort={handleSort} />
            <SortTh label="TIR %" field="tir" sort={sort} onSort={handleSort} />
            <SortTh label="Volumen" field="volume" sort={sort} onSort={handleSort} />
            <SortTh label="Variación" field="variation" sort={sort} onSort={handleSort} />
            <th style={{ paddingRight: '24px', textAlign: 'right' }}>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((on, i) => (
            <tr
              key={i}
              onClick={() => onSelect && onSelect(on)}
              style={{ borderTop: '1px solid #1e293b', cursor: onSelect ? 'pointer' : 'default', transition: 'background-color 0.2s' }}
              onMouseOver={(e) => { if (onSelect) { e.currentTarget.style.backgroundColor = 'rgba(30,41,59,0.5)'; e.currentTarget.querySelector('.ticker').style.color = '#60a5fa'; } }}
              onMouseOut={(e) => { if (onSelect) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.querySelector('.ticker').style.color = 'white'; } }}
            >
              <td style={{ padding: '20px 24px' }}>
                <div className="ticker" style={{ fontWeight: 'bold', fontSize: '16px', color: 'white', transition: 'color 0.2s' }}>{on.ticker}</div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>{on.tipo}</div>
                <div style={{ fontSize: '10px', color: on.source === 'BYMA' ? '#22c55e' : '#fbbf24', marginTop: '4px' }}>
                  {on.source === 'BYMA' ? '📡' : '📋'} {on.source}
                </div>
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold' }}>
                {on.price > 0 ? formatPrice(on.price, on.currency) : <span style={{ color: '#64748b' }}>N/A</span>}
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold' }}>
                {on.clean_price > 0 ? formatPrice(on.clean_price, on.currency) : <span style={{ color: '#64748b' }}>-</span>}
              </td>
              <td>
                <span style={{ backgroundColor: `${getCurrencyColor(on.currency)}22`, color: getCurrencyColor(on.currency), padding: '5px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', border: `1px solid ${getCurrencyColor(on.currency)}44` }}>
                  {getCurrencyLabel(on.currency)}
                </span>
              </td>
              <td style={{ fontWeight: 'bold', color: '#cbd5e1' }}>
                {on.parity > 0 ? `${on.parity.toFixed(2)}%` : <span style={{ color: '#475569' }}>-</span>}
              </td>
              <td style={{ fontWeight: 'bold', color: (on.tir || 0) > 0 ? '#34d399' : '#64748b' }}>
                {on.tir > 0 ? `${on.tir.toFixed(2)}%` : <span style={{ color: '#475569' }}>-</span>}
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold' }}>
                {on.volume > 0 ? on.volume.toLocaleString() : '-'}
              </td>
              <td style={{ fontWeight: 'bold', color: (on.variation != null && on.variation >= 0) ? '#4ade80' : '#ef4444' }}>
                {on.variation != null
                  ? <>{on.variation > 0 ? '+' : ''}{on.variation.toFixed(2)}%</>
                  : <span style={{ color: '#64748b' }}>-</span>}
              </td>
              <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                {onSelect && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>
                    Ver más <Layers size={12} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}