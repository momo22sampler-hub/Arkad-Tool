import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Briefcase, Info, AlertTriangle, Clock } from 'lucide-react';
import FCIDetailView from './FCIDetailView';

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatARS = (valor) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

/**
 * Lee una métrica de fondo.metrics y la convierte a porcentaje con N decimales.
 * Si metrics no existe o el valor es nulo, devuelve "—".
 */
const fmtMetric = (fci, key, decimals = 2) => {
  const val = fci?.metrics?.[key];
  if (val == null || isNaN(val)) return '—';
  const pct = val * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(decimals)}%`;
};

const fmtMetricRaw = (fci, key) => {
  const val = fci?.metrics?.[key];
  if (val == null || isNaN(val)) return null;
  return val * 100;
};

// ── Subcomponentes ─────────────────────────────────────────────────────────────

const MetricBadge = ({ value, positive }) => {
  if (value == null) return <span style={{ color: '#475569', fontWeight: 'bold' }}>—</span>;
  const color = positive === true ? '#4ade80' : positive === false ? '#ef4444' : '#94a3b8';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color, fontWeight: 'black', fontSize: '14px' }}>
      {positive === true && <TrendingUp size={13} />}
      {positive === false && <TrendingDown size={13} />}
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </div>
  );
};

const getRiesgoColor = (riesgo) => {
  switch (riesgo) {
    case 'Bajo':  return { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  color: '#4ade80' };
    case 'Medio': return { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24' };
    case 'Alto':  return { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  color: '#ef4444' };
    default:      return { bg: '#1e293b', border: '#334155', color: '#94a3b8' };
  }
};

// ── Componente principal ───────────────────────────────────────────────────────

export default function FCIView({ fcis, loading }) {
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [selectedFCI,     setSelectedFCI]     = useState(null);
  const [monedaFCI,       setMonedaFCI]       = useState('ARS');

  if (selectedFCI) {
    return <FCIDetailView fci={selectedFCI} onBack={() => setSelectedFCI(null)} />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b', fontWeight: 'bold', padding: '48px' }}>
        <Briefcase style={{ animation: 'spin 1s linear infinite' }} />
        Cargando fondos comunes de inversión...
      </div>
    );
  }

  // Categorías disponibles dinámicamente desde los datos (filtradas por moneda)
  const fcisPorMoneda = fcis.filter(f => (f.moneda || 'ARS') === monedaFCI);
  const categorias    = ['all', ...Array.from(new Set(fcisPorMoneda.map(f => f.categoria).filter(Boolean))).sort()];

  const filteredFCIs = fcisPorMoneda.filter(fci => {
    const catMatch = filterCategoria === 'all' || fci.categoria === filterCategoria;
    return catMatch;
  });

  const cntARS = fcis.filter(f => (f.moneda || 'ARS') === 'ARS').length;
  const cntUSD = fcis.filter(f => f.moneda === 'USD').length;

  // Mejor TEA del universo (desde metrics.tea)
  const bestTEA = fcis.reduce((best, f) => {
    const t = f?.metrics?.tea;
    return (t != null && t > best.val) ? { val: t, fondo: f.fondo } : best;
  }, { val: -Infinity, fondo: null });

  return (
    <div style={{ padding: '48px' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#8b5cf6', borderRadius: '12px' }}>
            <Briefcase size={28} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '48px', fontWeight: 'black', letterSpacing: '-0.05em', margin: 0, color: '#f1f5f9' }}>
              Fondos Comunes de Inversión
            </h1>
            <p style={{ color: '#64748b', fontWeight: 'bold', marginTop: '4px', fontSize: '16px' }}>
              Money Market • Renta Fija • Renta Variable
            </p>
          </div>
        </div>
        {fcis.length > 0 && fcis[0].updated_at && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', fontWeight: '600', color: '#94a3b8', fontSize: '12px' }}>
            <Clock size={12} />
            Actualizado: {new Date(fcis[0].updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
          </div>
        )}
      </header>

      {/* ── INFO PANEL ─────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '32px', display: 'flex', gap: '16px' }}>
        <Info size={24} style={{ color: '#8b5cf6', flexShrink: 0 }} />
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 'black', color: '#8b5cf6', marginBottom: '8px' }}>¿Qué son los FCIs?</h3>
          <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            Los Fondos Comunes de Inversión permiten acceso a carteras diversificadas administradas profesionalmente.
            Combinan el capital de múltiples inversores para invertir en bonos, acciones, money market y más.
            <strong> TEA:</strong> rendimiento anualizado estimado basado en los últimos 60 días de cotización.
            <strong> Momentum:</strong> retorno acumulado de los últimos 10 días hábiles.
          </p>
        </div>
      </div>

      {/* ── FILTROS ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Solapas ARS / USD */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { value: 'ARS', label: '$ ARS', count: cntARS, color: '#22c55e' },
            { value: 'USD', label: 'u$d USD', count: cntUSD, color: '#3b82f6' },
          ].map(tab => (
            <button key={tab.value} onClick={() => { setMonedaFCI(tab.value); setFilterCategoria('all'); }}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: monedaFCI === tab.value ? `${tab.color}22` : '#1e293b',
                color:           monedaFCI === tab.value ? tab.color : '#64748b',
                border:          `1px solid ${monedaFCI === tab.value ? tab.color : '#334155'}`,
              }}>
              {tab.label}
              <span style={{ background: monedaFCI === tab.value ? tab.color : '#334155', color: 'white', borderRadius: '4px', padding: '1px 6px', fontSize: '10px' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase' }}>Filtrar:</span>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categorias.map(cat => (
            <button key={cat} onClick={() => setFilterCategoria(cat)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: filterCategoria === cat ? '#8b5cf6' : '#1e293b', color: filterCategoria === cat ? 'white' : '#64748b', border: `1px solid ${filterCategoria === cat ? '#8b5cf6' : '#334155'}` }}>
              {cat === 'all' ? 'Todas las categorías' : cat}
            </button>
          ))}
        </div>


      </div>

      {/* ── TABLA ──────────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <tr>
              <th style={{ padding: '16px 24px', width: '36px' }}>#</th>
              <th style={{ padding: '16px 8px' }}>Fondo</th>
              <th style={{ padding: '16px 8px' }}>VCP</th>
              <th style={{ padding: '16px 8px' }}>Perf. Diaria</th>
              <th style={{ padding: '16px 8px' }}>TEA</th>
              <th style={{ padding: '16px 8px' }}>Momentum 10d</th>
              <th style={{ padding: '16px 24px 16px 8px' }}>Liquidez</th>
            </tr>
          </thead>
          <tbody>
            {filteredFCIs.map((fci, i) => {
              const riesgoStyle = getRiesgoColor(fci.riesgo);

              // Performance diaria: preferir nav vs nav_anterior, fallback a performance_diaria
              const perfDiaria = (() => {
                const hoy  = fci.nav;
                const ayer = fci.nav_anterior;
                if (hoy && ayer && ayer !== 0) return ((hoy - ayer) / ayer) * 100;
                return fci.performance_diaria || fci.variacion_diaria || 0;
              })();

              // Métricas desde fondo.metrics (con fallback seguro)
              const teaRaw      = fmtMetricRaw(fci, 'tea');
              const momentumRaw = fmtMetricRaw(fci, 'momentum');

              // Rank: si el backend lo incluye lo usamos, sino usamos índice
              const rank = fci.rank ?? i + 1;

              return (
                <tr
                  key={fci.fondo || i}
                  onClick={() => setSelectedFCI(fci)}
                  style={{ borderTop: '1px solid #1e293b', transition: 'background-color 0.15s', cursor: 'pointer' }}
                  onMouseOver={e  => e.currentTarget.style.backgroundColor = 'rgba(30,41,59,0.6)'}
                  onMouseOut={e   => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Rank */}
                  <td style={{ padding: '20px 8px 20px 24px', color: '#475569', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {rank}
                  </td>

                  {/* Fondo */}
                  <td style={{ padding: '20px 8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'white', marginBottom: '3px' }}>
                      {fci.fondo || fci.nombre}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '5px', fontWeight: 'black', backgroundColor: '#1e293b', color: '#64748b', textTransform: 'uppercase' }}>
                        {fci.categoria}
                      </span>
                      <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '5px', fontWeight: 'black', backgroundColor: fci.moneda === 'ARS' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: fci.moneda === 'ARS' ? '#4ade80' : '#60a5fa', border: `1px solid ${fci.moneda === 'ARS' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                        {fci.moneda}
                      </span>
                    </div>
                  </td>

                  {/* VCP */}
                  <td style={{ padding: '20px 8px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                    {fci.nav != null ? `${fci.moneda === 'ARS' ? '$' : 'u$d'} ${formatARS(fci.nav)}` : '—'}
                  </td>

                  {/* Perf. Diaria */}
                  <td style={{ padding: '20px 8px' }}>
                    <MetricBadge value={perfDiaria} positive={perfDiaria > 0 ? true : perfDiaria < 0 ? false : null} />
                  </td>

                  {/* TEA — desde fci.metrics.tea */}
                  <td style={{ padding: '20px 8px' }}>
                    <span style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#a78bfa', padding: '6px 12px', borderRadius: '8px', fontWeight: 'black', fontSize: '14px', border: '1px solid rgba(139,92,246,0.2)', whiteSpace: 'nowrap' }}>
                      {teaRaw != null ? `${teaRaw > 0 ? '+' : ''}${teaRaw.toFixed(2)}%` : '—'}
                    </span>
                  </td>

                  {/* Momentum — desde fci.metrics.momentum */}
                  <td style={{ padding: '20px 8px' }}>
                    <MetricBadge value={momentumRaw} positive={momentumRaw != null ? momentumRaw > 0 : null} />
                  </td>




                  {/* Liquidez */}
                  <td style={{ padding: '20px 24px 20px 8px', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>
                    {fci.liquidez || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredFCIs.length === 0 && (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '48px', borderRadius: '16px', textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '16px' }}>
            No hay fondos que coincidan con los filtros seleccionados.
          </p>
        </div>
      )}

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '8px' }}>Mejor TEA</div>
          <div style={{ fontSize: '28px', fontWeight: 'black', color: '#8b5cf6', marginBottom: '4px' }}>
            {bestTEA.val > -Infinity ? `${(bestTEA.val * 100).toFixed(2)}%` : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{bestTEA.fondo ?? '—'}</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '8px' }}>Fondos en ranking</div>
          <div style={{ fontSize: '28px', fontWeight: 'black', color: '#f1f5f9' }}>{fcis.length}</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '8px' }}>Comisión Admin Prom.</div>
          <div style={{ fontSize: '28px', fontWeight: 'black', color: '#f1f5f9' }}>
            {fcis.length > 0 && fcis.some(f => f.comision_admin != null)
              ? `${(fcis.filter(f => f.comision_admin != null).reduce((s, f) => s + f.comision_admin, 0) / fcis.filter(f => f.comision_admin != null).length).toFixed(1)}%`
              : '—'}
          </div>
        </div>
      </div>

      {/* ── DISCLAIMER ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '32px', fontSize: '11px', color: '#475569', fontStyle: 'italic', lineHeight: '1.6', padding: '16px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}>
        <strong>Advertencia:</strong> La TEA es una estimación anualizada basada en los últimos 60 días de cotización y NO garantiza rendimientos futuros.
        Los FCIs pueden tener volatilidad y el valor de tu inversión puede bajar. Leé siempre el reglamento de gestión antes de invertir.
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}