import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, X, TrendingUp, TrendingDown, Minus,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  PieChart as PieChartIcon, LayoutList, RefreshCw
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const BASE = 'https://arkad-tool.onrender.com';

// ── Tema (consistente con el resto de la app) ─────────────────────────────────
const th = {
  bg:     '#020617',
  card:   '#0f172a',
  card2:  '#0d1526',
  border: '#1e293b',
  text:   '#e2e8f0',
  sub:    '#64748b',
  sub2:   '#94a3b8',
  green:  '#22c55e',
  red:    '#ef4444',
  yellow: '#eab308',
  blue:   '#3b82f6',
  purple: '#a855f7',
  cyan:   '#06b6d4',
};

const TIPO_COLORS = [th.blue, th.green, th.purple, th.cyan, th.yellow, '#f97316', '#ec4899'];

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = (n, d = 2) => n != null ? Number(n).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const fmtPct = (n) => n != null ? `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%` : '—';
const fmtARS = (n) => n != null ? `$${fmt(n, 0)}` : '—';
const fmtUSD = (n) => n != null ? `u$d ${fmt(n)}` : '—';

// ── Inflación acumulada compuesta desde fecha hasta hoy ───────────────────────
function calcInflacionAcumulada(historial, fechaDesde, fechaHasta = null) {
  if (!historial || historial.length === 0) return null;
  const desde = new Date(fechaDesde);
  const hasta = fechaHasta ? new Date(fechaHasta) : new Date();
  let acum = 1;
  let usados = 0;
  for (const row of historial) {
    const f = new Date(row.fecha);
    if (f >= desde && f <= hasta) {
      acum *= (1 + row.valor / 100);
      usados++;
    }
  }
  return usados > 0 ? (acum - 1) * 100 : null;
}

// ── Calcular días entre dos fechas ───────────────────────────────────────────
function diasEntre(desde, hasta = null) {
  const d1 = new Date(desde);
  const d2 = hasta ? new Date(hasta) : new Date();
  return Math.max(0, Math.floor((d2 - d1) / 86400000));
}

// ── Badge de delta ────────────────────────────────────────────────────────────
function Delta({ value }) {
  if (value == null) return <span style={{ color: th.sub, fontSize: 11 }}>—</span>;
  const v = Number(value);
  const color = v === 0 ? th.sub : v > 0 ? th.green : th.red;
  const Icon  = v === 0 ? Minus : v > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color }}>
      <Icon size={11} />{v > 0 ? '+' : ''}{v.toFixed(2)}%
    </span>
  );
}

// ── Badge check ───────────────────────────────────────────────────────────────
function Check({ value }) {
  if (value == null) return <span style={{ color: th.sub, fontSize: 11 }}>—</span>;
  return value
    ? <span style={{ color: th.green, fontSize: 13 }}>✅</span>
    : <span style={{ color: th.red,   fontSize: 13 }}>❌</span>;
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: th.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: th.sub, cursor: 'pointer' }}><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const inputStyle = {
  background: '#0d1526', border: `1px solid #1e293b`, padding: '9px 12px',
  borderRadius: 6, color: '#e2e8f0', outline: 'none', fontSize: 12,
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box'
};
const Label = ({ children }) => (
  <div style={{ fontSize: 10, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{children}</div>
);

// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIO NUEVA POSICIÓN
// ══════════════════════════════════════════════════════════════════════════════
function FormNuevaPosicion({ fciList, mepRate, oficialRate, onGuardar, onCancel }) {
  const [form, setForm] = useState({
    fondo: '', tipo: '', moneda: 'ARS', fecha_entrada: new Date().toISOString().split('T')[0],
    monto: '', tc_conversion: 'MEP', cuotas: '', notas: ''
  });
  const [resolving, setResolving] = useState(false);
  const [vcpPreview, setVcpPreview] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const esUSD = form.moneda === 'USD';

  // TC de conversión elegido (solo aplica si es USD)
  const tcConversion = form.tc_conversion === 'MEP' ? mepRate : oficialRate;

  // monto_ars efectivo
  const montoARS = (() => {
    const v = parseFloat(form.monto);
    if (!v || v <= 0) return null;
    if (!esUSD) return v;
    return tcConversion ? v * tcConversion : null;
  })();

  // Al elegir fondo → autocompletar tipo y moneda
  const handleFondo = (nombre) => {
    set('fondo', nombre);
    const found = fciList.find(f => f.nombre === nombre);
    if (found?.tipo) set('tipo', found.tipo);
    // Detectar moneda del fondo si viene en el API
    if (found?.moneda) {
      set('moneda', found.moneda === 'USD' ? 'USD' : 'ARS');
    }
  };

  // Preview VCP cuando cambian fondo o fecha
  useEffect(() => {
    if (!form.fondo || !form.fecha_entrada) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/portfolio/resolver-vcp?fondo=${encodeURIComponent(form.fondo)}&fecha=${form.fecha_entrada}`);
        if (res.ok) {
          const d = await res.json();
          setVcpPreview(d.vcp);
        }
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [form.fondo, form.fecha_entrada]);

  // Auto-calcular cuotas cuando cambia monto o TC
  useEffect(() => {
    if (vcpPreview && montoARS && vcpPreview > 0) {
      set('cuotas', (montoARS / vcpPreview).toFixed(6));
    }
  }, [montoARS, vcpPreview]);

  const handleGuardar = async () => {
    if (!form.fondo || !form.monto || !form.fecha_entrada) {
      alert('Completá fondo, fecha y monto');
      return;
    }
    if (!montoARS) {
      alert('No se pudo calcular el monto en ARS. Verificá el TC.');
      return;
    }
    setResolving(true);
    const payload = {
      fondo:         form.fondo,
      tipo:          form.tipo || null,
      moneda:        form.moneda,
      fecha_entrada: form.fecha_entrada,
      monto_ars:     Math.round(montoARS),
      cuotas:        form.cuotas ? parseFloat(form.cuotas) : null,
      notas:         form.notas || null,
    };
    await onGuardar(payload);
    setResolving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Preview TC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 14px', background: th.card2, borderRadius: 6, border: `1px solid ${th.border}`, fontSize: 11, color: th.sub }}>
        <span>TC Oficial: <strong style={{ color: th.text }}>{fmtARS(oficialRate)}</strong></span>
        <span>TC MEP: <strong style={{ color: th.blue }}>{fmtARS(mepRate)}</strong></span>
        {esUSD ? (
          <>
            <span>TC usado ({form.tc_conversion}): <strong style={{ color: th.yellow }}>{fmtARS(tcConversion)}</strong></span>
            <span>Monto ARS equivalente: <strong style={{ color: th.green }}>{montoARS ? fmtARS(montoARS) : '—'}</strong></span>
          </>
        ) : (
          <>
            <span>Equiv. USD Oficial: <strong style={{ color: th.green }}>{montoARS && oficialRate ? fmtUSD(montoARS / oficialRate) : '—'}</strong></span>
            <span>Equiv. USD MEP: <strong style={{ color: th.blue }}>{montoARS && mepRate ? fmtUSD(montoARS / mepRate) : '—'}</strong></span>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Fondo */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Fondo FCI</Label>
          {fciList.length > 0 ? (
            <select style={inputStyle} value={form.fondo} onChange={e => handleFondo(e.target.value)}>
              <option value="">Seleccionar fondo...</option>
              {fciList.map(f => <option key={f.nombre} value={f.nombre}>{f.nombre}{f.tipo ? ` — ${f.tipo}` : ''}</option>)}
            </select>
          ) : (
            <input style={inputStyle} placeholder="Nombre del fondo" value={form.fondo} onChange={e => handleFondo(e.target.value)} />
          )}
        </div>

        {/* Tipo */}
        <div>
          <Label>Tipo {form.tipo && <span style={{ color: th.green, fontWeight: 700 }}>✓ auto</span>}</Label>
          <input style={inputStyle} placeholder="Money Market, Renta Fija..." value={form.tipo} onChange={e => set('tipo', e.target.value)} />
        </div>

        {/* Moneda del fondo */}
        <div>
          <Label>Moneda del fondo</Label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ value: 'ARS', label: '$ ARS' }, { value: 'USD', label: 'u$d USD' }].map(opt => (
              <button key={opt.value} onClick={() => set('moneda', opt.value)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: form.moneda === opt.value ? (opt.value === 'ARS' ? th.green : th.blue) : th.card2,
                  border: `1px solid ${form.moneda === opt.value ? (opt.value === 'ARS' ? th.green : th.blue) : th.border}`,
                  color: form.moneda === opt.value ? 'white' : th.sub2,
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha */}
        <div>
          <Label>Fecha de Entrada</Label>
          <input style={inputStyle} type="date" value={form.fecha_entrada} onChange={e => set('fecha_entrada', e.target.value)} />
        </div>

        {/* Si es USD: selector de TC de conversión */}
        {esUSD && (
          <div>
            <Label>TC para conversión a ARS</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ value: 'MEP', label: `MEP ${fmtARS(mepRate)}` }, { value: 'OFICIAL', label: `Oficial ${fmtARS(oficialRate)}` }].map(opt => (
                <button key={opt.value} onClick={() => set('tc_conversion', opt.value)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: form.tc_conversion === opt.value ? th.blue : th.card2,
                    border: `1px solid ${form.tc_conversion === opt.value ? th.blue : th.border}`,
                    color: form.tc_conversion === opt.value ? 'white' : th.sub2,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monto */}
        <div>
          <Label>Monto {esUSD ? '(USD)' : '(ARS)'}</Label>
          <input style={inputStyle} type="number"
            placeholder={esUSD ? 'Ej: 500' : 'Ej: 500000'}
            value={form.monto} onChange={e => set('monto', e.target.value)} />
        </div>

        {/* Cuotas */}
        <div>
          <Label>Cuotas {vcpPreview && <span style={{ color: th.green }}>VCP: ${fmt(vcpPreview)}</span>}</Label>
          <input style={inputStyle} type="number" placeholder="Auto desde VCP" value={form.cuotas} onChange={e => set('cuotas', e.target.value)} />
        </div>

        {/* Notas */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Notas (opcional)</Label>
          <input style={inputStyle} placeholder="Observaciones libres" value={form.notas} onChange={e => set('notas', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${th.border}` }}>
        <button onClick={onCancel} style={{ padding: '8px 20px', background: 'transparent', border: `1px solid ${th.border}`, color: th.sub, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Cancelar</button>
        <button onClick={handleGuardar} disabled={resolving} style={{ padding: '8px 20px', background: th.blue, border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: resolving ? 0.6 : 1 }}>
          {resolving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIO CIERRE DE POSICIÓN
// ══════════════════════════════════════════════════════════════════════════════
function FormCierrePosicion({ posicion, mepRate, oficialRate, onGuardar, onCancel }) {
  const [form, setForm] = useState({
    fecha_salida: new Date().toISOString().split('T')[0],
    monto_ars_salida: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const rendARS = form.monto_ars_salida && posicion.monto_ars
    ? ((parseFloat(form.monto_ars_salida) - posicion.monto_ars) / posicion.monto_ars) * 100
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '10px 14px', background: th.card2, borderRadius: 6, border: `1px solid ${th.border}`, fontSize: 12 }}>
        <span style={{ color: th.sub }}>Fondo: </span><strong>{posicion.fondo}</strong>
        <span style={{ color: th.sub, marginLeft: 16 }}>Invertido: </span><strong>{fmtARS(posicion.monto_ars)}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label>Fecha de Salida</Label>
          <input style={inputStyle} type="date" value={form.fecha_salida} onChange={e => set('fecha_salida', e.target.value)} />
        </div>
        <div>
          <Label>Monto ARS Cobrado</Label>
          <input style={inputStyle} type="number" placeholder="Ej: 620000" value={form.monto_ars_salida} onChange={e => set('monto_ars_salida', e.target.value)} />
        </div>
      </div>
      {form.monto_ars_salida && oficialRate && mepRate && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 14px', background: th.card2, borderRadius: 6, border: `1px solid ${th.border}`, fontSize: 11, color: th.sub }}>
          <span>USD salida (oficial): <strong style={{ color: th.green }}>{fmtUSD(parseFloat(form.monto_ars_salida) / oficialRate)}</strong></span>
          <span>USD salida (MEP): <strong style={{ color: th.blue }}>{fmtUSD(parseFloat(form.monto_ars_salida) / mepRate)}</strong></span>
        </div>
      )}
      {rendARS != null && (
        <div style={{ padding: '10px 14px', background: rendARS >= 0 ? `${th.green}11` : `${th.red}11`, border: `1px solid ${rendARS >= 0 ? th.green : th.red}33`, borderRadius: 6, fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: th.sub }}>Rendimiento ARS estimado</span>
          <Delta value={rendARS} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${th.border}` }}>
        <button onClick={onCancel} style={{ padding: '8px 20px', background: 'transparent', border: `1px solid ${th.border}`, color: th.sub, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Cancelar</button>
        <button onClick={() => onGuardar({ ...form, monto_ars_salida: parseFloat(form.monto_ars_salida) })} style={{ padding: '8px 20px', background: th.yellow, border: 'none', color: '#000', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Registrar Cierre</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function PortfolioFCI() {
  const [posiciones,     setPosiciones]     = useState([]);
  const [inflHistorial,  setInflHistorial]  = useState([]);
  const [fciList,        setFciList]        = useState([]);
  const [fciPrices,      setFciPrices]      = useState({}); // { nombre: vcpActual }
  const [mepRate,        setMepRate]        = useState(null);
  const [oficialRate,    setOficialRate]    = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [cierreModal,    setCierreModal]    = useState(null);
  const [showCerradas,   setShowCerradas]   = useState(false);
  const [vista,          setVista]          = useState('tabla'); // 'tabla' | 'torta'
  const [tortaVista,     setTortaVista]     = useState('fondo'); // 'fondo' | 'tipo'
  const [solapaMoneda,   setSolapaMoneda]   = useState('ARS');   // 'ARS' | 'USD'

  // ── Fetch inicial ──────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [posRes, inflRes, fciRes, macroRes] = await Promise.all([
        fetch(`${BASE}/api/v1/portfolio-fci`).then(r => r.json()).catch(() => []),
        fetch(`${BASE}/api/v1/portfolio-fci/inflacion-historial`).then(r => r.json()).catch(() => []),
        fetch(`${BASE}/api/v1/fci`).then(r => r.json()).catch(() => []),
        fetch(`${BASE}/api/v1/macro`).then(r => r.json()).catch(() => ({})),
      ]);
      setPosiciones(Array.isArray(posRes) ? posRes : []);
      setInflHistorial(Array.isArray(inflRes) ? inflRes : []);
      setFciList(Array.isArray(fciRes) ? fciRes : []);
      setMepRate(macroRes?.fx_hoy?.bolsa?.venta || null);
      setOficialRate(macroRes?.fx_hoy?.oficial?.venta || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Fetch VCP actuales para posiciones activas ─────────────────────────────
  useEffect(() => {
    const activas = posiciones.filter(p => p.estado === 'ACTIVO' && p.fondo);
    if (activas.length === 0) return;
    const fondosUnicos = [...new Set(activas.map(p => p.fondo))];
    Promise.all(fondosUnicos.map(fondo =>
      fetch(`${BASE}/api/v1/fcis/historico?fondo=${encodeURIComponent(fondo)}&dias=5`)
        .then(r => r.json())
        .then(data => {
          const arr = Array.isArray(data) ? data : [];
          const sorted = arr.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
          return [fondo, sorted[0]?.vcp || null];
        })
        .catch(() => [fondo, null])
    )).then(results => {
      const map = {};
      results.forEach(([fondo, vcp]) => { if (vcp) map[fondo] = vcp; });
      setFciPrices(map);
    });
  }, [posiciones]);

  // ── Enriquecer posiciones con cálculos ────────────────────────────────────
  const posicionesEnriquecidas = useMemo(() => {
    return posiciones.map(p => {
      const dias = diasEntre(p.fecha_entrada, p.fecha_salida);
      const esCerrada = p.estado === 'CERRADO';

      // Valor actual ARS
      const vcpActual = esCerrada ? null : (fciPrices[p.fondo] || null);
      const valorActualARS = esCerrada
        ? p.monto_ars_salida
        : (p.cuotas && vcpActual ? p.cuotas * vcpActual : null);

      // TC para cálculos
      const tcOfEntrada = p.tc_oficial_entrada;
      const tcMepEntrada = p.tc_mep_entrada;
      const tcOfActual = esCerrada ? p.tc_oficial_salida : oficialRate;
      const tcMepActual = esCerrada ? p.tc_mep_salida : mepRate;

      // USD entrada
      const usdEntradaOficial = tcOfEntrada && p.monto_ars ? p.monto_ars / tcOfEntrada : null;
      const usdEntradaMep     = tcMepEntrada && p.monto_ars ? p.monto_ars / tcMepEntrada : null;

      // USD actual/salida
      const usdActualOficial = tcOfActual && valorActualARS ? valorActualARS / tcOfActual : null;
      const usdActualMep     = tcMepActual && valorActualARS ? valorActualARS / tcMepActual : null;

      // Retornos
      const retornoARS = valorActualARS && p.monto_ars
        ? ((valorActualARS - p.monto_ars) / p.monto_ars) * 100 : null;
      const retornoUSDOficial = usdActualOficial && usdEntradaOficial
        ? ((usdActualOficial - usdEntradaOficial) / usdEntradaOficial) * 100 : null;
      const retornoUSDMep = usdActualMep && usdEntradaMep
        ? ((usdActualMep - usdEntradaMep) / usdEntradaMep) * 100 : null;

      // Inflación acumulada compuesta
      const inflAcum = p.inflacion_acumulada != null
        ? p.inflacion_acumulada
        : calcInflacionAcumulada(inflHistorial, p.fecha_entrada, p.fecha_salida);

      // Resultado real = retornoARS - inflación
      const resultadoReal = retornoARS != null && inflAcum != null
        ? retornoARS - inflAcum : null;

      // Rendimiento mensualizado
      const rendMensual = retornoARS != null && dias > 0
        ? ((Math.pow(1 + retornoARS / 100, 30 / dias) - 1) * 100) : null;
      const tnaEstimada = rendMensual != null ? rendMensual * 12 : null;

      // Badges
      const ganoVsInflacion  = resultadoReal != null ? resultadoReal > 0 : null;
      const ganoVsOficial    = retornoUSDOficial != null ? retornoUSDOficial > 0 : null;
      const ganoVsMep        = retornoUSDMep != null ? retornoUSDMep > 0 : null;

      return {
        ...p, dias, valorActualARS,
        usdEntradaOficial, usdEntradaMep,
        usdActualOficial, usdActualMep,
        retornoARS, retornoUSDOficial, retornoUSDMep,
        inflAcum, resultadoReal, rendMensual, tnaEstimada,
        ganoVsInflacion, ganoVsOficial, ganoVsMep,
      };
    });
  }, [posiciones, fciPrices, inflHistorial, mepRate, oficialRate]);

  const activas  = posicionesEnriquecidas.filter(p => p.estado === 'ACTIVO'  && (p.moneda || 'ARS') === solapaMoneda);
  const cerradas = posicionesEnriquecidas.filter(p => p.estado === 'CERRADO' && (p.moneda || 'ARS') === solapaMoneda);
  const cntARS   = posicionesEnriquecidas.filter(p => p.estado === 'ACTIVO'  && (p.moneda || 'ARS') === 'ARS').length;
  const cntUSD   = posicionesEnriquecidas.filter(p => p.estado === 'ACTIVO'  && p.moneda === 'USD').length;

  // ── Datos para torta ──────────────────────────────────────────────────────
  const datosTorta = useMemo(() => {
    const byKey = {};
    activas.forEach(p => {
      const key = tortaVista === 'fondo' ? (p.fondo || 'Sin nombre') : (p.tipo || 'Sin tipo');
      byKey[key] = (byKey[key] || 0) + (p.valorActualARS || p.monto_ars || 0);
    });
    return Object.entries(byKey)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [activas, tortaVista]);

  // ── Resumen stats ─────────────────────────────────────────────────────────
  const totalInvertidoARS = activas.reduce((s, p) => s + (p.monto_ars || 0), 0);
  const totalActualARS    = activas.reduce((s, p) => s + (p.valorActualARS || p.monto_ars || 0), 0);
  const retornoGlobalARS  = totalInvertidoARS > 0 ? ((totalActualARS - totalInvertidoARS) / totalInvertidoARS) * 100 : null;
  const totalUSDOficial   = activas.reduce((s, p) => s + (p.usdActualOficial || 0), 0);
  const totalUSDMep       = activas.reduce((s, p) => s + (p.usdActualMep || 0), 0);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleGuardar = async (payload) => {
    try {
      const res = await fetch(`${BASE}/api/v1/portfolio-fci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowForm(false);
      fetchAll();
    } catch (e) {
      alert(`Error al guardar: ${e.message}`);
    }
  };

  const handleCerrar = async (id, payload) => {
    try {
      const res = await fetch(`${BASE}/api/v1/portfolio-fci/${id}/cerrar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setCierreModal(null);
      fetchAll();
    } catch (e) {
      alert(`Error al cerrar: ${e.message}`);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta posición?')) return;
    await fetch(`${BASE}/api/v1/portfolio-fci/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  // ── Header columns ────────────────────────────────────────────────────────
  const colStyle = (w) => ({ padding: '10px 12px', fontSize: 9, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', minWidth: w });
  const cellStyle = (extra = {}) => ({ padding: '12px 12px', fontSize: 12, color: th.text, borderTop: `1px solid ${th.border}`, verticalAlign: 'middle', ...extra });

  const TH = ({ children, w }) => <th style={colStyle(w)}>{children}</th>;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: th.sub, gap: 10, padding: 60 }}>
      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Cargando portfolio FCI...
    </div>
  );

  return (
    <div style={{ padding: '28px 32px', background: th.bg, minHeight: '100%', color: th.text, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${th.border}` }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>Portfolio FCI</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: th.sub }}>
            {activas.length} posición{activas.length !== 1 ? 'es' : ''} activa{activas.length !== 1 ? 's' : ''} · TC Oficial {fmtARS(oficialRate)} · MEP {fmtARS(mepRate)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setVista(v => v === 'tabla' ? 'torta' : 'tabla')}
            style={{ padding: '8px 14px', background: th.card, border: `1px solid ${th.border}`, color: th.sub2, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
          >
            {vista === 'tabla' ? <PieChartIcon size={14} /> : <LayoutList size={14} />}
            {vista === 'tabla' ? 'Ver torta' : 'Ver tabla'}
          </button>
          <button
            onClick={fetchAll}
            style={{ padding: '8px 14px', background: th.card, border: `1px solid ${th.border}`, color: th.sub2, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
          >
            <RefreshCw size={13} /> Actualizar
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: '8px 16px', background: th.blue, border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
          >
            <Plus size={14} /> Nueva posición
          </button>
        </div>
      </div>

      {/* ── STATS RESUMEN ── */}
      {(() => {
        const totalUSDEntradaOficial = activas.reduce((s, p) => s + (p.usdEntradaOficial || 0), 0);
        const totalUSDEntradaMep     = activas.reduce((s, p) => s + (p.usdEntradaMep || 0), 0);
        const retornoGlobalUSDOf  = totalUSDEntradaOficial > 0 ? ((totalUSDOficial - totalUSDEntradaOficial) / totalUSDEntradaOficial) * 100 : null;
        const retornoGlobalUSDMep = totalUSDEntradaMep     > 0 ? ((totalUSDMep     - totalUSDEntradaMep)     / totalUSDEntradaMep)     * 100 : null;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Invertido ARS',      value: fmtARS(totalInvertidoARS),                                         color: th.sub2  },
              { label: 'Valor Actual ARS',   value: fmtARS(totalActualARS),                                            color: th.text  },
              { label: 'Rendm. ARS %',      value: fmtPct(retornoGlobalARS),  color: (retornoGlobalARS||0) >= 0 ? th.green : th.red },
              { label: 'Total USD 🟢 Oficial', value: fmtUSD(totalUSDOficial || null),                                 color: th.green },
              { label: 'Rendm. USD 🟢 %',      value: fmtPct(retornoGlobalUSDOf),  color: (retornoGlobalUSDOf||0) >= 0 ? th.green : th.red },
              { label: 'Total USD 🔵 MEP',   value: fmtUSD(totalUSDMep || null),                                       color: th.blue  },
              { label: 'Rendm. USD 🔵 MEP %',  value: fmtPct(retornoGlobalUSDMep), color: (retornoGlobalUSDMep||0) >= 0 ? th.blue  : th.red },
            ].map(s => (
              <div key={s.label} style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── VISTA TORTA ── */}
      {vista === 'torta' && (
        <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Distribución del Portfolio
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {['fondo', 'tipo'].map(v => (
                <button key={v} onClick={() => setTortaVista(v)}
                  style={{ padding: '4px 12px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: tortaVista === v ? th.blue : th.card2,
                    border: `1px solid ${tortaVista === v ? th.blue : th.border}`,
                    color: tortaVista === v ? 'white' : th.sub2 }}>
                  Por {v === 'fondo' ? 'FCI' : 'Tipo'}
                </button>
              ))}
            </div>
          </div>
          {datosTorta.length === 0 ? (
            <div style={{ textAlign: 'center', color: th.sub, padding: '40px 0', fontSize: 13 }}>Sin posiciones activas</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={datosTorta}
                    cx="50%" cy="50%"
                    outerRadius={110}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                    labelLine={true}
                  >
                    {datosTorta.map((_, i) => <Cell key={i} fill={TIPO_COLORS[i % TIPO_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [fmtARS(v), name]}
                    contentStyle={{ background: th.card2, border: `1px solid ${th.border}`, borderRadius: 6, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda manual con % */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {datosTorta.map((item, i) => {
                  const total = datosTorta.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? (item.value / total * 100).toFixed(1) : '0';
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: TIPO_COLORS[i % TIPO_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: th.text, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
                        {item.name}
                      </span>
                      <span style={{ color: th.sub2, fontSize: 11, flexShrink: 0 }}>{fmtARS(item.value)}</span>
                      <span style={{ color: TIPO_COLORS[i % TIPO_COLORS.length], fontWeight: 900, fontSize: 12, flexShrink: 0, minWidth: 40, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TABLA POSICIONES ACTIVAS ── */}
      {vista === 'tabla' && (
        <>
          <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { value: 'ARS', label: '$ ARS', count: cntARS, color: th.green },
                  { value: 'USD', label: 'u$d USD', count: cntUSD, color: th.blue },
                ].map(tab => (
                  <button key={tab.value} onClick={() => setSolapaMoneda(tab.value)}
                    style={{
                      padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: solapaMoneda === tab.value ? `${tab.color}22` : 'transparent',
                      border: `1px solid ${solapaMoneda === tab.value ? tab.color : th.border}`,
                      color: solapaMoneda === tab.value ? tab.color : th.sub,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    {tab.label}
                    <span style={{ background: solapaMoneda === tab.value ? tab.color : th.border, color: solapaMoneda === tab.value ? 'white' : th.sub, borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{tab.count}</span>
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 10, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Posiciones Activas ({activas.length})
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#0d1526' }}>
                    <TH w={160}>Fondo</TH>
                    <TH w={80}>Tipo</TH>
                    <TH w={90}>Entrada</TH>
                    <TH w={90}>Salida</TH>
                    <TH w={50}>Días</TH>
                    <TH w={110}>Invertido ARS</TH>
                    <TH w={90}>USD entrada 🟢</TH>
                    <TH w={90}>USD entrada 🔵</TH>
                    <TH w={110}>Valor actual ARS</TH>
                    <TH w={90}>USD actual 🟢</TH>
                    <TH w={90}>USD actual 🔵</TH>
                    <TH w={80}>Rendm. ARS%</TH>
                    <th style={{ ...colStyle(90), color: th.green, background: 'rgba(34,197,94,0.06)' }}>Rendm. USD 🟢</th>
                    <th style={{ ...colStyle(90), color: th.blue,  background: 'rgba(59,130,246,0.06)' }}>Rendm. USD 🔵</th>
                    <TH w={90}>Inflac. acum.%</TH>
                    <th style={{ ...colStyle(80), color: th.cyan,  background: 'rgba(6,182,212,0.06)'  }}>Real%</th>
                    <TH w={70}>TNA est.</TH>
                    <TH w={70}>vs Inf.</TH>
                    <TH w={70}>vs USD 🟢</TH>
                    <TH w={70}>vs USD 🔵</TH>
                    <TH w={60}></TH>
                  </tr>
                </thead>
                <tbody>
                  {activas.length === 0 ? (
                    <tr><td colSpan={20} style={{ padding: '40px 0', textAlign: 'center', color: th.sub, fontSize: 13 }}>No hay posiciones activas. Agregá tu primera inversión.</td></tr>
                  ) : activas.map(p => (
                    <tr key={p.id} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0d1526'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={cellStyle()}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.fondo}</div>
                        {p.notas && <div style={{ fontSize: 10, color: th.sub, marginTop: 2 }}>{p.notas}</div>}
                      </td>
                      <td style={cellStyle()}>
                        <span style={{ background: `${th.blue}20`, color: th.blue, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                          {p.tipo || '—'}
                        </span>
                      </td>
                      <td style={cellStyle({ color: th.sub2 })}>{p.fecha_entrada}</td>
                      <td style={cellStyle({ color: th.sub2 })}>{p.fecha_salida || <span style={{ color: th.sub, fontSize: 10 }}>—</span>}</td>
                      <td style={cellStyle({ textAlign: 'right', fontWeight: 700 })}>{p.dias}</td>
                      <td style={cellStyle({ textAlign: 'right', fontWeight: 700 })}>{fmtARS(p.monto_ars)}</td>
                      <td style={cellStyle({ textAlign: 'right', color: th.green })}>{fmtUSD(p.usdEntradaOficial)}</td>
                      <td style={cellStyle({ textAlign: 'right', color: th.blue })}>{fmtUSD(p.usdEntradaMep)}</td>
                      <td style={cellStyle({ textAlign: 'right', fontWeight: 700 })}>{p.valorActualARS ? fmtARS(p.valorActualARS) : <span style={{ color: th.sub }}>—</span>}</td>
                      <td style={cellStyle({ textAlign: 'right', color: th.green })}>{fmtUSD(p.usdActualOficial)}</td>
                      <td style={cellStyle({ textAlign: 'right', color: th.blue })}>{fmtUSD(p.usdActualMep)}</td>
                      <td style={cellStyle({ textAlign: 'right' })}><Delta value={p.retornoARS} /></td>
                      <td style={cellStyle({ textAlign: 'right', background: 'rgba(34,197,94,0.04)', borderLeft: `2px solid ${th.green}33` })}><Delta value={p.retornoUSDOficial} /></td>
                      <td style={cellStyle({ textAlign: 'right', background: 'rgba(59,130,246,0.04)', borderLeft: `2px solid ${th.blue}33`  })}><Delta value={p.retornoUSDMep} /></td>
                      <td style={cellStyle({ textAlign: 'right', color: th.yellow })}>{p.inflAcum != null ? `+${p.inflAcum.toFixed(2)}%` : '—'}</td>
                      <td style={cellStyle({ textAlign: 'right', background: 'rgba(6,182,212,0.04)', borderLeft: `2px solid ${th.cyan}33` })}><Delta value={p.resultadoReal} /></td>
                      <td style={cellStyle({ textAlign: 'right', color: th.cyan })}>{p.tnaEstimada != null ? `${p.tnaEstimada.toFixed(1)}%` : '—'}</td>
                      <td style={cellStyle({ textAlign: 'center' })}><Check value={p.ganoVsInflacion} /></td>
                      <td style={cellStyle({ textAlign: 'center' })}><Check value={p.ganoVsOficial} /></td>
                      <td style={cellStyle({ textAlign: 'center' })}><Check value={p.ganoVsMep} /></td>
                      <td style={cellStyle({ textAlign: 'right' })}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={() => setCierreModal(p)} title="Cerrar posición"
                            style={{ padding: '4px 8px', background: `${th.yellow}18`, border: `1px solid ${th.yellow}44`, color: th.yellow, borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                            Cerrar
                          </button>
                          <button onClick={() => handleEliminar(p.id)} title="Eliminar"
                            style={{ padding: '4px 6px', background: `${th.red}18`, border: `1px solid ${th.red}44`, color: th.red, borderRadius: 5, cursor: 'pointer' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── POSICIONES CERRADAS ── */}
          {cerradas.length > 0 && (
            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setShowCerradas(v => !v)}
                style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: th.sub, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                <span>Posiciones Cerradas ({cerradas.length})</span>
                {showCerradas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showCerradas && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#0d1526', borderTop: `1px solid ${th.border}` }}>
                        <TH w={160}>Fondo</TH>
                        <TH w={90}>Entrada</TH>
                        <TH w={90}>Salida</TH>
                        <TH w={50}>Días</TH>
                        <TH w={110}>ARS invertido</TH>
                        <TH w={110}>ARS cobrado</TH>
                        <TH w={90}>USD entrada 🟢</TH>
                        <TH w={90}>USD salida 🟢</TH>
                        <TH w={80}>Ret. ARS%</TH>
                        <TH w={80}>Ret. USD 🟢</TH>
                        <TH w={80}>Ret. USD 🔵</TH>
                        <TH w={80}>Inflación</TH>
                        <TH w={80}>Real%</TH>
                        <TH w={70}>vs Inf.</TH>
                        <TH w={60}></TH>
                      </tr>
                    </thead>
                    <tbody>
                      {cerradas.map(p => (
                        <tr key={p.id} style={{ opacity: 0.75, transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#0d1526'; e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.75'; }}
                        >
                          <td style={cellStyle()}><div style={{ fontWeight: 700 }}>{p.fondo}</div></td>
                          <td style={cellStyle({ color: th.sub2 })}>{p.fecha_entrada}</td>
                          <td style={cellStyle({ color: th.sub2 })}>{p.fecha_salida}</td>
                          <td style={cellStyle({ textAlign: 'right', fontWeight: 700 })}>{p.dias}</td>
                          <td style={cellStyle({ textAlign: 'right' })}>{fmtARS(p.monto_ars)}</td>
                          <td style={cellStyle({ textAlign: 'right', fontWeight: 700 })}>{fmtARS(p.monto_ars_salida)}</td>
                          <td style={cellStyle({ textAlign: 'right', color: th.green })}>{fmtUSD(p.usdEntradaOficial)}</td>
                          <td style={cellStyle({ textAlign: 'right', color: th.green })}>{fmtUSD(p.usdActualOficial)}</td>
                          <td style={cellStyle({ textAlign: 'right' })}><Delta value={p.retornoARS} /></td>
                          <td style={cellStyle({ textAlign: 'right' })}><Delta value={p.retornoUSDOficial} /></td>
                          <td style={cellStyle({ textAlign: 'right' })}><Delta value={p.retornoUSDMep} /></td>
                          <td style={cellStyle({ textAlign: 'right', color: th.yellow })}>{p.inflAcum != null ? `+${p.inflAcum.toFixed(2)}%` : '—'}</td>
                          <td style={cellStyle({ textAlign: 'right' })}><Delta value={p.resultadoReal} /></td>
                          <td style={cellStyle({ textAlign: 'center' })}><Check value={p.ganoVsInflacion} /></td>
                          <td style={cellStyle({ textAlign: 'right' })}>
                            <button onClick={() => handleEliminar(p.id)}
                              style={{ padding: '4px 6px', background: `${th.red}18`, border: `1px solid ${th.red}44`, color: th.red, borderRadius: 5, cursor: 'pointer' }}>
                              <Trash2 size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── LEYENDA ── */}
      <div style={{ marginTop: 12, fontSize: 10, color: th.sub, display: 'flex', gap: 16 }}>
        <span>🟢 = TC Oficial</span>
        <span>🔵 = TC MEP</span>
        <span>Inflación acumulada compuesta desde fecha de entrada</span>
      </div>

      {/* ── MODALES ── */}
      {showForm && (
        <Modal title="Nueva Posición FCI" onClose={() => setShowForm(false)}>
          <FormNuevaPosicion
            fciList={fciList}
            mepRate={mepRate}
            oficialRate={oficialRate}
            onGuardar={handleGuardar}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {cierreModal && (
        <Modal title={`Cerrar: ${cierreModal.fondo}`} onClose={() => setCierreModal(null)}>
          <FormCierrePosicion
            posicion={cierreModal}
            mepRate={mepRate}
            oficialRate={oficialRate}
            onGuardar={(payload) => handleCerrar(cierreModal.id, payload)}
            onCancel={() => setCierreModal(null)}
          />
        </Modal>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}