import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, PieChart, Info, AlertTriangle, BarChart3, Calculator } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatARS = (valor) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

/**
 * Lee fci.metrics[key], multiplica × 100 y formatea.
 * Devuelve "—" si el valor no está disponible.
 */
const fmtMetric = (fci, key, decimals = 2, showSign = false) => {
  const val = fci?.metrics?.[key];
  if (val == null || isNaN(val)) return '—';
  const pct = val * 100;
  const sign = showSign && pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
};

const metricRaw = (fci, key) => {
  const val = fci?.metrics?.[key];
  return val != null && !isNaN(val) ? val * 100 : null;
};

// ── Gráfico de línea SVG ───────────────────────────────────────────────────────

function LineChart({ datos, loading, moneda }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  const W = 800, H = 200, PAD = { top: 20, right: 20, bottom: 32, left: 16 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '14px' }}>
        Cargando histórico...
      </div>
    );
  }
  if (!datos || datos.length < 2) {
    return (
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '14px' }}>
        Sin datos históricos disponibles
      </div>
    );
  }

  const vcps = datos.map(d => d.vcp);
  const minV = Math.min(...vcps), maxV = Math.max(...vcps);
  const rango = maxV - minV || 1;
  const toX = i => PAD.left + (i / (datos.length - 1)) * innerW;
  const toY = v => PAD.top + innerH - ((v - minV) / rango) * innerH;
  const points = datos.map((d, i) => ({ x: toX(i), y: toY(d.vcp), ...d }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M ${points[0].x},${PAD.top + innerH} ` + points.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${points[points.length - 1].x},${PAD.top + innerH} Z`;
  const maxLabels = 8;
  const step = Math.max(1, Math.floor(datos.length / maxLabels));
  const labelIndexes = datos.map((_, i) => i).filter(i => i % step === 0 || i === datos.length - 1);
  const isPositive = vcps[vcps.length - 1] >= vcps[0];
  const lineColor = isPositive ? '#4ade80' : '#ef4444';

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    let closest = 0, minDist = Infinity;
    points.forEach((p, i) => { const d = Math.abs(p.x - mx); if (d < minDist) { minDist = d; closest = i; } });
    setTooltip({ index: closest, x: points[closest].x, y: points[closest].y, ...datos[closest] });
  };

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', cursor: 'crosshair' }} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={PAD.left} y1={PAD.top + innerH * (1 - t)} x2={PAD.left + innerW} y2={PAD.top + innerH * (1 - t)} stroke="#1e293b" strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="2" />
        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + innerH} stroke="#475569" strokeWidth="1" strokeDasharray="4,3" />
            <circle cx={tooltip.x} cy={tooltip.y} r="5" fill={lineColor} stroke="white" strokeWidth="2" />
          </>
        )}
        {labelIndexes.map(i => (
          <text key={i} x={points[i].x} y={H - 4} textAnchor="middle" fill="#475569" fontSize="11" fontWeight="600">{datos[i].fecha}</text>
        ))}
      </svg>
      {tooltip && (
        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10 }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{tooltip.fecha}</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f1f5f9' }}>
            {moneda === 'ARS' ? '$' : 'u$d'} {formatARS(tooltip.vcp)}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#475569' }}>
        <span>Mín: {moneda === 'ARS' ? '$' : 'u$d'} {formatARS(minV)}</span>
        <span>Máx: {moneda === 'ARS' ? '$' : 'u$d'} {formatARS(maxV)}</span>
      </div>
    </div>
  );
}

// ── Vista de detalle ───────────────────────────────────────────────────────────

export default function FCIDetailView({ fci, onBack }) {
  const [periodo, setPeriodo] = useState('30d');
  const [montoInversion, setMontoInversion] = useState(10000);
  const [historicoReal, setHistoricoReal] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const diasPorPeriodo = { '7d': 7, '30d': 30, '60d': 60, '1y': 365 };
  const nombreFondo = fci.fondo || fci.nombre;

  useEffect(() => {
    const fetchHistorico = async () => {
      setLoadingHistorico(true);
      try {
        const dias = diasPorPeriodo[periodo];
        const url = `https://arkad-tool.onrender.com/api/v1/fcis/historico?fondo=${encodeURIComponent(nombreFondo)}&dias=${dias}`;
        const res = await fetch(url);
        const data = await res.json();
        setHistoricoReal(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error cargando histórico:', e);
        setHistoricoReal([]);
      } finally {
        setLoadingHistorico(false);
      }
    };
    if (nombreFondo) fetchHistorico();
  }, [nombreFondo, periodo]);

  // VCP y simulador
  const vcpActual = fci.nav || fci.vcp || 1;
  const cuotapartes = (montoInversion / vcpActual).toFixed(4);
  const valorActual = parseFloat(cuotapartes) * vcpActual;

  // Performance diaria
  const perfDiariaCalc = (() => {
    const hoy = fci.nav, ayer = fci.nav_anterior;
    if (hoy && ayer && ayer !== 0) return ((hoy - ayer) / ayer) * 100;
    return fci.performance_diaria || 0;
  })();

  // Métricas desde fci.metrics
  const teaRaw      = metricRaw(fci, 'tea');
  const momentumRaw = metricRaw(fci, 'momentum');
  const volRaw      = metricRaw(fci, 'volatility');
  const ddRaw       = metricRaw(fci, 'drawdown');

  const perfDiariaStyle = { color: perfDiariaCalc > 0 ? '#4ade80' : perfDiariaCalc < 0 ? '#ef4444' : '#94a3b8', icon: perfDiariaCalc > 0 ? <TrendingUp size={16} /> : perfDiariaCalc < 0 ? <TrendingDown size={16} /> : null };

  // Perfil del inversor derivado de la categoría real
  const perfilInversor = {
    'Money Market':    { titulo: 'Inversor Conservador', descripcion: 'Busca preservar capital con alta liquidez. Horizonte corto plazo (1-6 meses).', riesgos: ['Riesgo de tasa', 'Riesgo de reinversión'] },
    'Renta Fija':      { titulo: 'Inversor Moderado',    descripcion: 'Acepta volatilidad moderada por mayor rendimiento. Horizonte mediano plazo (6-24 meses).', riesgos: ['Riesgo de inflación', 'Riesgo de tasa', 'Riesgo de crédito'] },
    'Renta Variable':  { titulo: 'Inversor Agresivo',    descripcion: 'Busca crecimiento de capital con alta tolerancia al riesgo. Horizonte largo plazo (+24 meses).', riesgos: ['Alta volatilidad', 'Riesgo de mercado', 'Riesgo cambiario'] },
    'Mixto':           { titulo: 'Inversor Equilibrado', descripcion: 'Combina estabilidad y crecimiento. Horizonte mediano plazo.', riesgos: ['Riesgo de mercado moderado', 'Riesgo de tasa'] },
  };
  const perfil = perfilInversor[fci.categoria] || { titulo: 'Perfil no disponible', descripcion: 'Consultá el reglamento de gestión del fondo.', riesgos: ['Ver prospecto'] };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.4s', padding: '40px' }}>

      {/* Botón volver */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: 'bold', marginBottom: '32px', padding: '8px', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', border: 'none' }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'}
        onMouseOut={e  => e.currentTarget.style.backgroundColor = 'transparent'}>
        <ArrowLeft size={18} /> VOLVER A FCIs
      </button>

      {/* ── CABECERA ────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: '#8b5cf6', borderRadius: '16px' }}>
            <PieChart size={32} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'black', letterSpacing: '-0.03em', color: 'white', margin: 0, lineHeight: 1.2 }}>
              {nombreFondo}
            </h1>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {[
                { label: fci.categoria || 'Sin categoría', bg: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
                { label: fci.moneda || 'ARS', bg: fci.moneda === 'USD' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)', color: fci.moneda === 'USD' ? '#60a5fa' : '#4ade80', border: fci.moneda === 'USD' ? 'rgba(59,130,246,0.3)' : 'rgba(34,197,94,0.3)' },
                ...(fci.riesgo ? [{ label: `Riesgo ${fci.riesgo}`, bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' }] : []),
              ].map((tag, i) => (
                <span key={i} style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '8px', fontWeight: 'black', textTransform: 'uppercase', backgroundColor: tag.bg, color: tag.color, border: `1px solid ${tag.border}` }}>{tag.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Métricas resumen — todas desde fci.metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginTop: '24px' }}>
          {[
            { label: 'VCP Actual',   value: fci.nav != null ? `${fci.moneda === 'ARS' ? '$' : 'u$d'} ${formatARS(vcpActual)}` : '—', color: '#f1f5f9', size: '24px' },
            { label: 'Perf. Diaria', value: `${perfDiariaCalc > 0 ? '+' : ''}${perfDiariaCalc.toFixed(2)}%`, color: perfDiariaStyle.color, icon: perfDiariaStyle.icon, size: '22px' },
            { label: 'TEA (60d)',     value: teaRaw != null ? `${teaRaw > 0 ? '+' : ''}${teaRaw.toFixed(2)}%` : '—', color: '#a78bfa', size: '22px' },
            { label: 'Momentum 10d', value: momentumRaw != null ? `${momentumRaw > 0 ? '+' : ''}${momentumRaw.toFixed(2)}%` : '—', color: momentumRaw != null ? (momentumRaw > 0 ? '#4ade80' : '#ef4444') : '#94a3b8', size: '22px' },
            { label: 'Score',        value: fci.score != null ? fci.score.toFixed(2) : '—', color: '#60a5fa', size: '22px' },
          ].map((m, i) => (
            <div key={i} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '8px' }}>{m.label}</div>
              <div style={{ fontSize: m.size, fontWeight: 'black', color: m.color, display: 'flex', alignItems: 'center', gap: '6px' }}>{m.icon}{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CUERPO ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Gráfico VCP */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 'black', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={14} /> Evolución VCP
              </h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Object.keys(diasPorPeriodo).map(p => (
                  <button key={p} onClick={() => setPeriodo(p)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: periodo === p ? '#8b5cf6' : '#1e293b', color: periodo === p ? 'white' : '#64748b', border: `1px solid ${periodo === p ? '#8b5cf6' : '#334155'}` }}>{p}</button>
                ))}
              </div>
            </div>
            <LineChart datos={historicoReal} loading={loadingHistorico} moneda={fci.moneda} />
          </section>

          {/* Métricas detalladas del engine */}
          <section>
            <h3 style={{ fontSize: '12px', fontWeight: 'black', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={14} /> Métricas del Engine (ventana 60 días)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'TEA Anualizada',  value: teaRaw != null ? `${teaRaw > 0 ? '+' : ''}${teaRaw.toFixed(2)}%` : '—',   color: '#a78bfa', desc: 'Retorno anualizado sobre los últimos 60 días' },
                { label: 'Momentum 10d',    value: momentumRaw != null ? `${momentumRaw > 0 ? '+' : ''}${momentumRaw.toFixed(2)}%` : '—', color: momentumRaw != null ? (momentumRaw > 0 ? '#4ade80' : '#ef4444') : '#94a3b8', desc: 'Retorno acumulado últimos 10 registros' },
                { label: 'Volatilidad',     value: volRaw != null ? `${volRaw.toFixed(2)}%` : '—', color: volRaw != null && volRaw > 15 ? '#f59e0b' : '#94a3b8', desc: 'Desviación estándar anualizada (√252)' },
                { label: 'Max. Drawdown',   value: ddRaw != null ? `-${ddRaw.toFixed(2)}%` : '—', color: ddRaw != null && ddRaw > 5 ? '#ef4444' : '#94a3b8', desc: 'Caída máxima desde el pico de la ventana' },
              ].map((m, i) => (
                <div key={i} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '4px' }}>{m.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 'black', color: m.color, marginBottom: '4px' }}>{m.value}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── COMPOSICIÓN DE CARTERA ────────────────────────────────────── */}
          <section>
            <h3 style={{ fontSize: '12px', fontWeight: 'black', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={14} /> Composición de Cartera
            </h3>
            {/* No se renderiza composición si no proviene del backend */}
            {fci.composicion && Array.isArray(fci.composicion) && fci.composicion.length > 0 ? (
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {fci.composicion.map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                          <span style={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: '14px' }}>{item.activo || item.nombre}</span>
                          {item.tipo && <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>({item.tipo})</span>}
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: 'black', color: '#60a5fa' }}>{item.porcentaje}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.porcentaje}%`, height: '100%', backgroundColor: '#60a5fa', borderRadius: '8px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '32px', borderRadius: '12px', textAlign: 'center' }}>
                <PieChart size={32} style={{ color: '#334155', margin: '0 auto 12px' }} />
                <p style={{ color: '#475569', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>
                  Composición de cartera no disponible
                </p>
                <p style={{ color: '#334155', fontSize: '12px', marginTop: '6px' }}>
                  Los datos de composición se publicarán cuando estén disponibles en el backend.
                </p>
              </div>
            )}
          </section>

          {/* Simulador */}
          <section style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(15,23,42,1))', border: '1px solid rgba(139,92,246,0.3)', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Calculator size={20} style={{ color: '#a78bfa' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 'black', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Simulador de Cuotapartes</h3>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '8px' }}>Monto a invertir ({fci.moneda || 'ARS'})</label>
              <input type="number" value={montoInversion} onChange={e => setMontoInversion(Number(e.target.value))} min={fci.minimo_suscripcion || 1000} step={100}
                style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '12px', fontSize: '24px', fontWeight: 'black', color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Mínimo: {fci.moneda || 'ARS'} {(fci.minimo_suscripcion || 1000).toLocaleString()}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>Cuotapartes</div>
                <div style={{ fontSize: '24px', fontWeight: 'black', color: '#a78bfa' }}>{cuotapartes}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(139,92,246,0.15)', padding: '16px', borderRadius: '12px', border: '2px solid rgba(139,92,246,0.4)' }}>
                <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 'black', marginBottom: '4px', textTransform: 'uppercase' }}>Valor Actual</div>
                <div style={{ fontSize: '24px', fontWeight: 'black', color: '#a78bfa' }}>{fci.moneda === 'ARS' ? '$' : 'u$d'} {formatARS(valorActual)}</div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.6', padding: '12px', backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: '8px', border: '1px solid #1e293b', marginTop: '16px' }}>
              <strong>Fórmula:</strong> Cuotapartes = Monto / VCP actual. El valor futuro dependerá de la evolución del VCP.
            </div>
          </section>

        </div>

        {/* ── COLUMNA DERECHA ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Ficha Técnica */}
          <section style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Info size={16} style={{ color: '#60a5fa' }} />
              <h3 style={{ fontSize: '12px', fontWeight: 'black', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Ficha Técnica</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
              {[
                { label: 'Administradora', value: fci.administradora || fci.emisor || '—' },
                { label: 'Categoría',      value: fci.categoria || '—' },
                { label: 'Tipo',           value: fci.tipo || '—' },
                { label: 'Moneda',         value: fci.moneda || '—' },
                { label: 'Horizonte',      value: fci.horizonte || '—' },
                { label: 'Riesgo',         value: fci.riesgo || '—' },
                { label: 'Liquidez',       value: fci.liquidez || '—' },
                { label: 'Com. Admin',     value: fci.comision_admin != null ? `${fci.comision_admin}% anual` : '—' },
                { label: 'Com. Suscripción', value: fci.comision_suscripcion != null ? `${fci.comision_suscripcion}%` : '—' },
                { label: 'Mínimo',         value: fci.minimo_suscripcion != null ? `${fci.moneda || 'ARS'} ${fci.minimo_suscripcion.toLocaleString()}` : '—' },
                { label: 'Última Act.',    value: fci.updated_at ? new Date(fci.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—' },
              ].map((item, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: i < arr.length - 1 ? '1px solid #1e293b' : 'none' }}>
                  <span style={{ color: '#64748b' }}>{item.label}</span>
                  <span style={{ fontWeight: 'bold', color: '#cbd5e1', textAlign: 'right', maxWidth: '55%' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Perfil del Inversor */}
          <section style={{ backgroundColor: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', padding: '20px', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 'black', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '12px' }}>Perfil del Inversor Ideal</h4>
            <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <div style={{ fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>{perfil.titulo}</div>
              <p style={{ margin: 0 }}>{perfil.descripcion}</p>
            </div>
          </section>

          {/* Riesgos */}
          <section style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444' }} />
              <h4 style={{ fontSize: '12px', fontWeight: 'black', color: '#ef4444', textTransform: 'uppercase', margin: 0 }}>Riesgos Asociados</h4>
            </div>
            <ul style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '20px', margin: 0 }}>
              {perfil.riesgos.map((r, i) => <li key={i} style={{ marginBottom: '4px' }}>{r}</li>)}
            </ul>
          </section>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}