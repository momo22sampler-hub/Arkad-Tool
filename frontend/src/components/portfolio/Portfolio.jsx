import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon,
  Plus, Trash2, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  MinusCircle, RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
  Wallet, Edit3, Check, PieChart
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Calendar from '../calendario/Calendar';

const BASE       = 'https://arkad-tool.onrender.com';
const API        = `${BASE}/api/v1/portfolio`;
const API_CONFIG = `${BASE}/api/v1/portfolio/config`;
const API_MACRO  = `${BASE}/api/v1/macro`;
const API_ONS    = `${BASE}/api/v1/ons`;
const API_LETRAS = `${BASE}/api/v1/letras`;
const API_FCI    = `${BASE}/api/v1/fci`;
const API_CAUCION= `${BASE}/api/v1/cauciones`;
const API_FCI_HIST = `${BASE}/api/v1/fcis/historico`;
const API_ONS_DATA = `${BASE}/api/v1/ons`;
const API_LETRAS_DATA = `${BASE}/api/v1/letras`;

const th = {
  bg: '#020617', card: '#0f172a', card2: '#0d1526',
  border: '#1e293b', border2: '#243044',
  text: '#e2e8f0', sub: '#64748b', sub2: '#94a3b8',
  green: '#22c55e', red: '#ef4444', yellow: '#eab308',
  blue: '#3b82f6', purple: '#a855f7', orange: '#f97316', cyan: '#06b6d4',
};

const TIPO_COLOR = { BOND: th.blue, ON: th.purple, CAUCION: th.yellow, LETRA: th.orange, BOPREAL: th.cyan, FCI: th.green };
const TIPO_LABEL = { BOND: 'Bono', ON: 'ON', CAUCION: 'Caución', LETRA: 'Letra', BOPREAL: 'BOPREAL', FCI: 'FCI' };
const STATUS = {
  ACTIVA:  { label: 'Activa',  color: th.green,  Icon: CheckCircle2 },
  VENDIDA: { label: 'Vendida', color: th.sub2,   Icon: MinusCircle  },
  VENCIDA: { label: 'Vencida', color: th.yellow, Icon: AlertCircle  },
};

const fmt    = (n, dec = 2) => n != null ? Number(n).toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—';
const fmtPct = (n) => n != null ? `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%` : '—';
const fmtUSD = (n) => n != null ? `u$d ${fmt(n)}` : '—';
const fmtARS = (n) => n != null ? `$${fmt(n, 0)}` : '—';

function DeltaBadge({ value, suffix = '%' }) {
  if (value == null) return <span style={{ color: th.sub, fontSize: 11 }}>—</span>;
  const v = Number(value);
  const color = v === 0 ? th.sub : v > 0 ? th.green : th.red;
  const Icon  = v === 0 ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color }}>
      <Icon size={11} />{v > 0 ? '+' : ''}{v.toFixed(2)}{suffix}
    </span>
  );
}

const TABS = [
  { id: 'posiciones',   label: 'Posiciones'   },
  { id: 'distribucion', label: 'Distribución' },
  { id: 'calendarios',  label: 'Calendarios'  },
  { id: 'rendimiento',  label: 'Rendimiento'  },
];



// ═══════════════════════════════════════════════════════════════════════════════
export default function Portfolio({ bonds: marketBonds = [] }) {
  const [operaciones,   setOperaciones]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('posiciones');
  const [showForm,      setShowForm]      = useState(false);
  const [showCerradas,  setShowCerradas]  = useState(false);
  const [ventaModal,    setVentaModal]    = useState(null);
  const [liquidezARS,   setLiquidezARS]   = useState(0);
  const [editLiquidez,  setEditLiquidez]  = useState(false);
  const [liquidezInput, setLiquidezInput] = useState('');
  const [mepRate,       setMepRate]       = useState(null);
  const [oficialRate,   setOficialRate]   = useState(null);
  // Precios de mercado extendidos: FCI (VCP actual), ON y LETRA (precio actual)
  const [fciPrices,     setFciPrices]     = useState({});   // { nombre: vcpActual }
  const [onLetrasMap,   setOnLetrasMap]   = useState({});   // { ticker: precioActual }

  // FX
  useEffect(() => {
    fetch(API_MACRO).then(r => r.json()).then(d => {
      setMepRate(d?.fx_hoy?.bolsa?.venta || null);
      setOficialRate(d?.fx_hoy?.oficial?.venta || null);
    }).catch(() => {});
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [resOps, resConfig] = await Promise.all([fetch(API), fetch(API_CONFIG)]);
      const ops    = await resOps.json();
      const config = await resConfig.json();
      const hoy    = new Date().toISOString().split('T')[0];
      const act    = await Promise.all((ops || []).map(async op => {
        if (op.status === 'ACTIVA' && op.date_vencimiento && op.date_vencimiento < hoy) {
          await fetch(`${API}/${op.id}/vencida`, { method: 'PATCH' });
          return { ...op, status: 'VENCIDA' };
        }
        return op;
      }));
      setOperaciones(act || []);
      setLiquidezARS(parseFloat(config?.liquidez_ars || 0));
      setLiquidezInput(String(config?.liquidez_ars || 0));
    } catch { setOperaciones([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Fetch precios de mercado para FCI, ON, LETRA ───────────────────────────
  useEffect(() => {
    if (operaciones.length === 0) return;
    const activas = operaciones.filter(o => o.status === 'ACTIVA');

    // FCI: obtener VCP actual para cada fondo único
    const fondosUnicos = [...new Set(activas.filter(o => o.type === 'FCI' && o.nombre).map(o => o.nombre))];
    if (fondosUnicos.length > 0) {
      Promise.all(fondosUnicos.map(nombre =>
        fetch(`${API_FCI_HIST}?fondo=${encodeURIComponent(nombre)}&dias=3`)
          .then(r => r.json())
          .then(data => {
            // Devuelve array [{fecha, vcp}], el más reciente primero o último
            const arr = Array.isArray(data) ? data : [];
            const sorted = arr.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
            const vcp = sorted[0]?.vcp || null;
            return [nombre, vcp];
          })
          .catch(() => [nombre, null])
      )).then(results => {
        const map = {};
        results.forEach(([nombre, vcp]) => { if (vcp) map[nombre] = vcp; });
        setFciPrices(map);
      });
    }

    // ON y LETRA: obtener precios actuales
    const tieneOns    = activas.some(o => o.type === 'ON');
    const tieneLetras = activas.some(o => o.type === 'LETRA');
    const fetches = [];
    if (tieneOns)    fetches.push(fetch(API_ONS_DATA).then(r => r.json()).catch(() => []));
    if (tieneLetras) fetches.push(fetch(API_LETRAS_DATA).then(r => r.json()).catch(() => []));
    if (fetches.length > 0) {
      Promise.all(fetches).then(results => {
        const map = {};
        results.flat().forEach(b => { if (b.ticker && b.price != null) map[b.ticker] = b.price; });
        setOnLetrasMap(map);
      });
    }
  }, [operaciones]);

  // ── Caución vencida → acreditar automáticamente a liquidez ────────────────
  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    operaciones.forEach(async op => {
      if (op.type === 'CAUCION' && op.status === 'ACTIVA' && op.date_vencimiento && op.date_vencimiento <= hoy) {
        // Calcular monto final con intereses
        const capital = parseFloat(op.amount_ars || 0);
        const tna     = parseFloat(op.tna || 0) / 100;
        const plazo   = parseInt(op.term_dias || 0);
        const cobro   = capital * (1 + tna * plazo / 365);
        // Marcar como VENCIDA en backend
        await fetch(`${API}/${op.id}/vencida`, { method: 'PATCH' });
        // Acreditar monto total (capital + intereses) a liquidez
        await fetch(`${API_CONFIG}/liquidez`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: cobro }) });
        setLiquidezARS(prev => prev + cobro);
        setOperaciones(prev => prev.map(o => o.id === op.id ? { ...o, status: 'VENCIDA' } : o));
      }
    });
  }, [operaciones]);

  const guardarLiquidez = async () => {
    const nueva = parseFloat(liquidezInput.replace(/\./g, '').replace(',', '.')) || 0;
    const delta = nueva - liquidezARS;
    await fetch(`${API_CONFIG}/liquidez`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) });
    setLiquidezARS(nueva);
    setEditLiquidez(false);
  };

  const crearOperacion = async (payload) => {
    const res  = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setOperaciones(prev => [data, ...prev]);
    const monto = parseFloat(payload.amount_ars || 0);
    if (monto > 0) {
      await fetch(`${API_CONFIG}/liquidez`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: -monto }) });
      setLiquidezARS(prev => Math.max(0, prev - monto));
    }
    setShowForm(false);
  };

  const cerrarPosicion = async (id, payload) => {
    const res  = await fetch(`${API}/${id}/vender`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setOperaciones(prev => prev.map(o => o.id === id ? data : o));
    const monto = parseFloat(payload.amount_venta_ars || 0);
    if (monto > 0) {
      await fetch(`${API_CONFIG}/liquidez`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: monto }) });
      setLiquidezARS(prev => prev + monto);
    }
    setVentaModal(null);
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta operación?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setOperaciones(prev => prev.filter(o => o.id !== id));
  };

  const stats = useMemo(() => {
    const activas = operaciones.filter(o => o.status === 'ACTIVA');
    const tc = mepRate || 1;
    let totalUSD = 0;
    let pnlDiaARS = 0;

    activas.forEach(op => {
      let valorUSD = 0;

      if (op.type === 'BOND' || op.type === 'ON' || op.type === 'LETRA' || op.type === 'BOPREAL') {
        const market = marketBonds.find(b => b.ticker === op.ticker)
          || (onLetrasMap[op.ticker] != null ? { price: onLetrasMap[op.ticker], currency: 'USD' } : null);
        if (market) {
          const precioUSD = market.currency === 'ARS' ? (market.price || 0) / tc : (market.price || 0);
          valorUSD = (parseFloat(op.qty || 0) / 100) * precioUSD;
          // PnL del día si hay variación diaria
          if (market.variacion_diaria != null) {
            pnlDiaARS += valorUSD * tc * (parseFloat(market.variacion_diaria) / 100);
          }
        } else {
          valorUSD = parseFloat(op.amount_usd || 0);
        }
      } else if (op.type === 'FCI') {
        const vcpActual = fciPrices[op.nombre];
        const vcpEntrada = parseFloat(op.cuotaparte_entrada || 0);
        const cuotapartes = parseFloat(op.qty || op.cuotapartes_cantidad || 0);
        if (vcpActual && cuotapartes) {
          const valorARS = cuotapartes * vcpActual;
          valorUSD = valorARS / tc;
          if (vcpEntrada && cuotapartes) {
            pnlDiaARS += (vcpActual - vcpEntrada) * cuotapartes; // simplificado
          }
        } else {
          valorUSD = parseFloat(op.amount_usd || 0);
        }
      } else if (op.type === 'CAUCION') {
        // Accrual: capital × (1 + TNA/365)^días_transcurridos
        const capital = parseFloat(op.amount_ars || 0);
        const tna     = parseFloat(op.tna || 0) / 100;
        const inicio  = new Date(op.date_compra + 'T12:00:00');
        const hoy     = new Date();
        const diasTransc = Math.max(0, Math.floor((hoy - inicio) / 86400000));
        const valorARS = capital * (1 + tna * diasTransc / 365);
        valorUSD = valorARS / tc;
        // PnL diario = interés de 1 día
        pnlDiaARS += capital * tna / 365;
      } else {
        valorUSD = parseFloat(op.amount_usd || 0);
      }

      totalUSD += valorUSD;
    });

    const carryTotal = activas.reduce((a, o) => a + parseFloat(o.carry_restante || 0), 0);
    const cerradas   = operaciones.filter(o => o.status === 'VENDIDA' && o.rendimiento_realizado != null);
    const rendProm   = cerradas.length > 0 ? cerradas.reduce((a, o) => a + parseFloat(o.rendimiento_realizado), 0) / cerradas.length : null;
    const proxEvento = activas.filter(o => o.date_vencimiento).sort((a, b) => a.date_vencimiento.localeCompare(b.date_vencimiento))[0];
    return { totalUSD, carryTotal, rendProm, proxEvento, nActivas: activas.length, pnlDiaARS };
  }, [operaciones, marketBonds, mepRate, fciPrices, onLetrasMap]);

  const { eventosPagos, eventosPersonales } = useMemo(() => {
    const pagos = [], personales = [];
    const hoy   = new Date();
    operaciones.forEach(op => {
      // Compra siempre al personal
      personales.push({ date: new Date(op.date_compra + 'T12:00:00'), ticker: op.ticker || op.nombre || op.type, tipo: `Compra ${TIPO_LABEL[op.type] || op.type}`, monto: op.amount_ars ? fmtARS(op.amount_ars) : '—', moneda: 'ARS', isActualPayment: false });
      // Venta al personal
      if (op.status === 'VENDIDA' && op.date_venta) {
        personales.push({ date: new Date(op.date_venta + 'T12:00:00'), ticker: op.ticker || op.nombre || op.type, tipo: `Venta ${TIPO_LABEL[op.type] || op.type}`, monto: op.amount_venta_ars ? fmtARS(op.amount_venta_ars) : '—', moneda: 'ARS', isActualPayment: false });
      }
      // Vencimiento de Caución → pagos Y personal
      if (op.type === 'CAUCION' && op.date_vencimiento && op.status === 'ACTIVA') {
        const fecha = new Date(op.date_vencimiento + 'T12:00:00');
        if (fecha >= hoy) {
          const cobro = parseFloat(op.amount_ars || 0) * (1 + (parseFloat(op.tna || 0) / 100) * parseInt(op.term_dias || 0) / 365);
          const evt = { date: fecha, ticker: 'CAUCION', tipo: 'Vencimiento Caución', monto: fmtARS(cobro), moneda: 'ARS', isActualPayment: true };
          pagos.push(evt);
          personales.push(evt);
        }
      }
      // Vencimiento de Letra → personal
      if (op.type === 'LETRA' && op.date_vencimiento && op.status === 'ACTIVA') {
        const fecha = new Date(op.date_vencimiento + 'T12:00:00');
        if (fecha >= hoy) {
          personales.push({ date: fecha, ticker: op.ticker || 'LETRA', tipo: 'Vencimiento Letra', monto: op.amount_ars ? fmtARS(op.amount_ars) : '—', moneda: 'ARS', isActualPayment: true });
        }
      }
      // Cupones / amortizaciones de bonos en cartera → pagos Y personal
      if (['BOND','ON','LETRA','BOPREAL'].includes(op.type) && op.status === 'ACTIVA') {
        const bond = marketBonds.find(b => b.ticker === op.ticker);
        if (bond?.cash_flow) {
          bond.cash_flow.forEach(cf => {
            const [d, m, y] = cf.fecha.split('/');
            const fecha = new Date(y, m - 1, d);
            const monto = (cf.monto * (parseFloat(op.qty || 0) / 100)).toFixed(2);
            const evt = { date: fecha, ticker: bond.ticker, tipo: cf.tipo, monto, moneda: bond.moneda || 'USD', isActualPayment: true };
            if (fecha >= hoy) pagos.push(evt);
            personales.push(evt);
          });
        }
      }
    });
    return { eventosPagos: pagos.sort((a, b) => a.date - b.date), eventosPersonales: personales.sort((a, b) => a.date - b.date) };
  }, [operaciones, marketBonds]);

  const activas  = operaciones.filter(o => o.status === 'ACTIVA');
  const cerradas = operaciones.filter(o => o.status !== 'ACTIVA');

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: th.sub }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ marginLeft: 10, fontSize: 13 }}>Cargando portfolio...</span>
    </div>
  );

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1440, margin: '0 auto', color: th.text, fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace" }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em' }}>Portfolio Pro</h1>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: th.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {stats.nActivas} posición{stats.nActivas !== 1 ? 'es' : ''} activa{stats.nActivas !== 1 ? 's' : ''}
            {mepRate && <> · MEP {fmtARS(mepRate)}</>}
            {oficialRate && <> · Oficial {fmtARS(oficialRate)}</>}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', backgroundColor: th.blue, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          <Plus size={15} /> Nueva Operación
        </button>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="Valorización USD"      value={fmtUSD(stats.totalUSD)}   color={th.blue} />
        <StatCard label="PnL del Día"           value={stats.pnlDiaARS != null ? fmtARS(stats.pnlDiaARS) : '—'} color={stats.pnlDiaARS >= 0 ? th.green : th.red} sub={stats.pnlDiaARS != null ? `${stats.pnlDiaARS >= 0 ? '+' : ''}${((stats.pnlDiaARS / ((stats.totalUSD * (mepRate||1)) || 1)) * 100).toFixed(2)}% hoy` : 'Sin datos'} />
        <StatCard label="Rend. Realizado Prom"  value={stats.rendProm != null ? fmtPct(stats.rendProm) : '—'} color={stats.rendProm != null && stats.rendProm >= 0 ? th.green : th.red} sub="Posiciones cerradas" />
        <StatCard label="Próx. Evento"          value={stats.proxEvento ? new Date(stats.proxEvento.date_vencimiento + 'T12:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'} color={th.yellow} sub={stats.proxEvento?.ticker || ''} />
        {/* Liquidez editable */}
        <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wallet size={10} /> Liquidez Disponible
            </div>
            <button onClick={() => { setEditLiquidez(!editLiquidez); setLiquidezInput(String(liquidezARS)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: th.sub, padding: 0 }}>
              <Edit3 size={12} />
            </button>
          </div>
          {editLiquidez ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="text" value={liquidezInput} onChange={e => setLiquidezInput(e.target.value)} style={{ background: th.card2, border: `1px solid ${th.border}`, padding: '4px 8px', borderRadius: 4, color: th.text, outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1, minWidth: 0 }} autoFocus onKeyDown={e => e.key === 'Enter' && guardarLiquidez()} />
              <button onClick={guardarLiquidez} style={{ background: th.green, border: 'none', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', color: '#000', display: 'flex' }}><Check size={13} /></button>
            </div>
          ) : (
            <div style={{ fontSize: 18, fontWeight: 900, color: liquidezARS > 0 ? th.green : th.sub, letterSpacing: '-0.02em' }}>{fmtARS(liquidezARS)}</div>
          )}
          <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>Cuenta comitente</div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${th.border}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase', color: tab === t.id ? th.blue : th.sub, borderBottom: tab === t.id ? `2px solid ${th.blue}` : '2px solid transparent', marginBottom: -1, transition: 'color 0.15s' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'posiciones' && (
        <div>
          {activas.length === 0
            ? <EmptyState>No hay posiciones activas. Registrá tu primera operación.</EmptyState>
            : <PosicionesTable operaciones={activas} marketBonds={marketBonds} mepRate={mepRate} oficialRate={oficialRate} fciPrices={fciPrices} onLetrasMap={onLetrasMap} onEliminar={eliminar} onVender={setVentaModal} />
          }
          {cerradas.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <button onClick={() => setShowCerradas(!showCerradas)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: th.sub, fontSize: 10, fontWeight: 700, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.05em', padding: 0, marginBottom: 14 }}>
                {showCerradas ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {cerradas.length} posición{cerradas.length !== 1 ? 'es' : ''} cerrada{cerradas.length !== 1 ? 's' : ''}
              </button>
              {showCerradas && <PosicionesTable operaciones={cerradas} marketBonds={marketBonds} mepRate={mepRate} oficialRate={oficialRate} fciPrices={fciPrices} onLetrasMap={onLetrasMap} onEliminar={eliminar} onVender={null} cerradas />}
            </div>
          )}
        </div>
      )}

      {tab === 'distribucion' && <DistribucionPanel operaciones={operaciones} marketBonds={marketBonds} mepRate={mepRate} liquidezARS={liquidezARS} />}

      {tab === 'calendarios' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          <div>
            <SectionTitle icon={<DollarSign size={13} />}>Calendario de Pagos</SectionTitle>
            <p style={{ fontSize: 11, color: th.sub, marginTop: -10, marginBottom: 14 }}>Cupones, amortizaciones y vencimientos — automático</p>
            <Calendar bonds={marketBonds} customEvents={eventosPagos} />
          </div>
          <div>
            <SectionTitle icon={<CalendarIcon size={13} />}>Calendario Personal</SectionTitle>
            <p style={{ fontSize: 11, color: th.sub, marginTop: -10, marginBottom: 14 }}>Compras y ventas registradas</p>
            <Calendar bonds={[]} customEvents={eventosPersonales} />
          </div>
        </div>
      )}

      {tab === 'rendimiento' && <RendimientoPanel operaciones={operaciones} marketBonds={marketBonds} mepRate={mepRate} fciPrices={fciPrices} onLetrasMap={onLetrasMap} />}

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Nueva Operación">
          <OperacionForm marketBonds={marketBonds} mepRate={mepRate} oficialRate={oficialRate} onGuardar={crearOperacion} onCancel={() => setShowForm(false)} />
        </Modal>
      )}

      {ventaModal && (
        <Modal onClose={() => setVentaModal(null)} title={`Cerrar Posición — ${ventaModal.ticker || ventaModal.nombre}`}>
          <VentaForm operacion={ventaModal} mepRate={mepRate} oficialRate={oficialRate} onGuardar={(p) => cerrarPosicion(ventaModal.id, p)} onCancel={() => setVentaModal(null)} />
        </Modal>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Tabla Posiciones ─────────────────────────────────────────────────────────
function PosicionesTable({ operaciones, marketBonds, mepRate, oficialRate, fciPrices = {}, onLetrasMap = {}, onEliminar, onVender, cerradas = false }) {
  const [expanded, setExpanded] = useState(null);
  const cols = cerradas
    ? ['Instrumento', 'Tipo', 'Fecha', 'Monto Compra', 'Monto Venta', 'Rend. ARS', 'Rend. USD', 'Estado', '']
    : ['Instrumento', 'Tipo', 'Fecha', 'Monto ARS', 'Valor Actual', 'PnL ARS', 'Rend. %', 'Estado', ''];

  return (
    <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${th.border}` }}>
            {cols.map(c => <th key={c} style={{ padding: '11px 14px', textAlign: 'left', color: th.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {operaciones.map((op, i) => {
            const isExp  = expanded === op.id;
            const tc     = mepRate || 1;
            const statusInfo = STATUS[op.status] || STATUS.ACTIVA;
            const invARS = parseFloat(op.amount_ars || 0);

            // ── Calcular valor actual y PnL según tipo ──
            let valorActualARS = null;
            let valorActualUSD = null;
            let pnlARS = null;
            let rendPct = null;
            let labelValor = null;

            if (['BOND', 'ON', 'LETRA', 'BOPREAL'].includes(op.type)) {
              const market = marketBonds.find(b => b.ticker === op.ticker)
                || (onLetrasMap[op.ticker] != null ? { price: onLetrasMap[op.ticker], currency: 'USD' } : null);
              if (market && op.qty) {
                const precioUSD = market.currency === 'ARS' ? (market.price || 0) / tc : (market.price || 0);
                valorActualUSD = (parseFloat(op.qty) / 100) * precioUSD;
                valorActualARS = valorActualUSD * tc;
                if (invARS > 0) { pnlARS = valorActualARS - invARS; rendPct = (pnlARS / invARS) * 100; }
                labelValor = fmtUSD(valorActualUSD);
              } else {
                valorActualUSD = parseFloat(op.amount_usd || 0);
                labelValor = fmtUSD(valorActualUSD);
              }
            } else if (op.type === 'FCI') {
              const vcpActual = fciPrices[op.nombre];
              const cuotapartes = parseFloat(op.qty || op.cuotapartes_cantidad || 0);
              if (vcpActual && cuotapartes) {
                valorActualARS = cuotapartes * vcpActual;
                valorActualUSD = valorActualARS / tc;
                if (invARS > 0) { pnlARS = valorActualARS - invARS; rendPct = (pnlARS / invARS) * 100; }
                labelValor = fmtARS(valorActualARS);
              } else {
                valorActualARS = invARS;
                labelValor = <span style={{ color: th.sub }}>Sin VCP</span>;
              }
            } else if (op.type === 'CAUCION') {
              const capital = invARS;
              const tna     = parseFloat(op.tna || 0) / 100;
              const inicio  = new Date(op.date_compra + 'T12:00:00');
              const hoy     = new Date();
              const diasTransc = Math.max(0, Math.floor((hoy - inicio) / 86400000));
              valorActualARS = capital * (1 + tna * diasTransc / 365);
              valorActualUSD = valorActualARS / tc;
              pnlARS = valorActualARS - capital;
              rendPct = capital > 0 ? (pnlARS / capital) * 100 : null;
              // Mostrar cobro esperado al vencimiento
              const cobroFinal = capital * (1 + tna * parseInt(op.term_dias || 0) / 365);
              labelValor = <span title={`Vence: ${fmtARS(cobroFinal)}`}>{fmtARS(valorActualARS)}</span>;
            } else {
              valorActualUSD = parseFloat(op.amount_usd || 0);
              labelValor = fmtUSD(valorActualUSD);
            }

            const rendARS = op.amount_venta_ars && op.amount_ars ? ((parseFloat(op.amount_venta_ars) - parseFloat(op.amount_ars)) / parseFloat(op.amount_ars)) * 100 : null;
            const cUSD    = op.amount_ars && op.tc_compra ? parseFloat(op.amount_ars) / parseFloat(op.tc_compra) : null;
            const vUSD    = op.amount_venta_ars && op.tc_venta ? parseFloat(op.amount_venta_ars) / parseFloat(op.tc_venta) : null;
            const rendUSD = cUSD && vUSD ? ((vUSD - cUSD) / cUSD) * 100 : null;
            const market  = marketBonds.find(b => b.ticker === op.ticker);

            return (
              <React.Fragment key={op.id}>
                <tr style={{ borderTop: i > 0 ? `1px solid ${th.border}` : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = th.card2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setExpanded(isExp ? null : op.id)}
                >
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 3, height: 26, borderRadius: 2, backgroundColor: TIPO_COLOR[op.type] || th.sub, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{op.ticker || op.nombre || '—'}</div>
                        <div style={{ fontSize: 10, color: th.sub, marginTop: 1 }}>{op.lugar_compra || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: `${TIPO_COLOR[op.type] || th.sub}22`, color: TIPO_COLOR[op.type] || th.sub }}>{TIPO_LABEL[op.type] || op.type}</span>
                  </td>
                  <td style={{ padding: '13px 14px', color: th.sub2, fontSize: 11 }}>{op.date_compra}</td>
                  <td style={{ padding: '13px 14px', fontWeight: 600 }}>
                    {op.amount_ars ? fmtARS(op.amount_ars) : op.qty ? `${fmt(op.qty, 0)} nom.` : '—'}
                    {op.tc_compra && <div style={{ fontSize: 10, color: th.sub }}>TC ${fmt(op.tc_compra, 0)}</div>}
                  </td>
                  {cerradas ? (
                    <td style={{ padding: '13px 14px', fontWeight: 600 }}>
                      {op.amount_venta_ars ? fmtARS(op.amount_venta_ars) : '—'}
                      {op.tc_venta && <div style={{ fontSize: 10, color: th.sub }}>TC ${fmt(op.tc_venta, 0)}</div>}
                    </td>
                  ) : (
                    <td style={{ padding: '13px 14px', fontWeight: 700, color: th.blue }}>
                      {labelValor}
                      {op.type === 'CAUCION' && op.date_vencimiento && (
                        <div style={{ fontSize: 10, color: th.sub }}>Vence {op.date_vencimiento}</div>
                      )}
                    </td>
                  )}
                  {cerradas ? (
                    <><td style={{ padding: '13px 14px' }}><DeltaBadge value={rendARS} /></td><td style={{ padding: '13px 14px' }}><DeltaBadge value={rendUSD} /></td></>
                  ) : (
                    <>
                      <td style={{ padding: '13px 14px', fontWeight: 700, color: pnlARS != null ? (pnlARS >= 0 ? th.green : th.red) : th.sub }}>
                        {pnlARS != null ? fmtARS(pnlARS) : '—'}
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        {rendPct != null ? <DeltaBadge value={rendPct} /> : <span style={{ color: th.sub, fontSize: 11 }}>—</span>}
                      </td>
                    </>
                  )}
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: statusInfo.color }}>
                      <statusInfo.Icon size={11} /> {statusInfo.label}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                      {!cerradas && onVender && op.status === 'ACTIVA' && <ActionBtn color={th.yellow} onClick={() => onVender(op)} title="Vender"><ArrowUpRight size={12} /></ActionBtn>}
                      <ActionBtn color={th.red} onClick={() => onEliminar(op.id)} title="Eliminar"><Trash2 size={12} /></ActionBtn>
                    </div>
                  </td>
                </tr>
                {isExp && (
                  <tr style={{ background: th.card2 }}>
                    <td colSpan={9} style={{ padding: '0 14px 14px' }}>
                      <ExpandedRow op={op} market={market} fciPrices={fciPrices} onLetrasMap={onLetrasMap} mepRate={mepRate} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExpandedRow({ op, market, fciPrices = {}, onLetrasMap = {}, mepRate }) {
  const vcpActual = op.type === 'FCI' ? fciPrices[op.nombre] : null;
  const tc = mepRate || 1;

  // Caución accrual
  let interesAcumulado = null;
  let diasTranscurridos = null;
  if (op.type === 'CAUCION' && op.date_compra && op.tna) {
    const inicio = new Date(op.date_compra + 'T12:00:00');
    diasTranscurridos = Math.max(0, Math.floor((new Date() - inicio) / 86400000));
    interesAcumulado = parseFloat(op.amount_ars || 0) * (parseFloat(op.tna) / 100) * diasTranscurridos / 365;
  }

  const fields = [
    op.qty                && { label: 'Nominales',      value: fmt(op.qty, 0) },
    op.price_compra       && { label: 'Precio Compra',  value: fmt(op.price_compra) },
    op.price_venta        && { label: 'Precio Venta',   value: fmt(op.price_venta) },
    op.tna                && { label: 'TNA',            value: `${op.tna}%` },
    op.term_dias          && { label: 'Plazo',          value: `${op.term_dias} días` },
    diasTranscurridos != null && { label: 'Días transcurridos', value: `${diasTranscurridos}d` },
    interesAcumulado != null  && { label: 'Interés acumulado',  value: fmtARS(interesAcumulado), color: th.green },
    op.date_vencimiento   && { label: 'Vencimiento',    value: op.date_vencimiento },
    op.cuotaparte_entrada && { label: 'VCP Entrada',    value: fmt(op.cuotaparte_entrada) },
    vcpActual             && { label: 'VCP Actual',     value: fmt(vcpActual), color: th.green },
    vcpActual && op.cuotaparte_entrada && { label: 'Var. VCP', value: `${(((vcpActual / parseFloat(op.cuotaparte_entrada)) - 1) * 100).toFixed(2)}%`, color: vcpActual >= parseFloat(op.cuotaparte_entrada) ? th.green : th.red },
    onLetrasMap[op.ticker] && { label: 'Precio Actual', value: fmt(onLetrasMap[op.ticker]) },
    market?.tir           && { label: 'TIR Actual',     value: `${market.tir.toFixed(2)}%` },
    market?.modified_duration && { label: 'Dur. Mod.',  value: market.modified_duration.toFixed(2) },
    op.notas              && { label: 'Notas',          value: op.notas },
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px', paddingTop: 12, borderTop: `1px dashed ${th.border}` }}>
      {fields.map(f => (
        <div key={f.label} style={{ minWidth: 120 }}>
          <div style={{ fontSize: 9, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.label}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: f.color || th.text }}>{f.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Distribución ─────────────────────────────────────────────────────────────
function DistribucionPanel({ operaciones, marketBonds, mepRate, liquidezARS }) {
  const activas = operaciones.filter(o => o.status === 'ACTIVA');

  const porTipo = useMemo(() => {
    const g = {};
    activas.forEach(op => { const m = parseFloat(op.amount_ars || 0); g[op.type] = (g[op.type] || 0) + m; });
    return Object.entries(g).filter(([, v]) => v > 0).map(([k, v]) => ({ name: TIPO_LABEL[k] || k, value: v, color: TIPO_COLOR[k] || th.sub }));
  }, [activas]);

  const totalInvertido = activas.reduce((a, o) => a + parseFloat(o.amount_ars || 0), 0);
  const porLiquidez = [
    { name: 'Invertido',  value: totalInvertido, color: th.blue  },
    { name: 'Disponible', value: liquidezARS,    color: th.green },
  ].filter(d => d.value > 0);
  const totalLiq = porLiquidez.reduce((a, d) => a + d.value, 0);
  const totalTipo = porTipo.reduce((a, d) => a + d.value, 0);

  const Tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const total = d.payload.totalRef || 1;
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, padding: '10px 14px', borderRadius: 6, fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: d.payload.color, marginBottom: 4 }}>{d.name}</div>
        <div style={{ color: th.text }}>{fmtARS(d.value)}</div>
        <div style={{ color: th.sub, fontSize: 10 }}>{((d.value / total) * 100).toFixed(1)}%</div>
      </div>
    );
  };

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const R = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * R);
    const y = cy + r * Math.sin(-midAngle * R);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{(percent * 100).toFixed(0)}%</text>;
  };

  porTipo.forEach(d => d.totalRef = totalTipo);
  porLiquidez.forEach(d => d.totalRef = totalLiq);

  if (porTipo.length === 0 && porLiquidez.length === 0) return <EmptyState>Sin posiciones para mostrar distribución.</EmptyState>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      {/* Torta 1 — por instrumento */}
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, padding: '24px 20px' }}>
        <SectionTitle icon={<PieChart size={13} />}>Por Instrumento</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <RechartsPie>
            <Pie data={porTipo} cx="50%" cy="50%" outerRadius={100} dataKey="value" labelLine={false} label={renderLabel}>
              {porTipo.map((e, i) => <Cell key={i} fill={e.color} stroke={th.bg} strokeWidth={2} />)}
            </Pie>
            <Tooltip content={<Tip />} />
          </RechartsPie>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 12, justifyContent: 'center' }}>
          {porTipo.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
              <span style={{ color: th.sub2 }}>{d.name}</span>
              <span style={{ fontWeight: 700 }}>{fmtARS(d.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Torta 2 — invertido vs liquidez */}
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, padding: '24px 20px' }}>
        <SectionTitle icon={<Wallet size={13} />}>Invertido vs Disponible</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <RechartsPie>
            <Pie data={porLiquidez} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" labelLine={false} label={renderLabel}>
              {porLiquidez.map((e, i) => <Cell key={i} fill={e.color} stroke={th.bg} strokeWidth={2} />)}
            </Pie>
            <Tooltip content={<Tip />} />
          </RechartsPie>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {porLiquidez.map(d => (
            <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: th.card2, borderRadius: 6, border: `1px solid ${th.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                <span style={{ fontSize: 12, color: th.sub2 }}>{d.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: d.color }}>{fmtARS(d.value)}</div>
                <div style={{ fontSize: 10, color: th.sub }}>{((d.value / totalLiq) * 100).toFixed(1)}%</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: `${th.blue}11`, borderRadius: 6, border: `1px solid ${th.blue}33`, fontSize: 11 }}>
            <span style={{ color: th.sub }}>Total</span>
            <span style={{ fontWeight: 700 }}>{fmtARS(totalLiq)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Rendimiento ──────────────────────────────────────────────────────────────
function RendimientoPanel({ operaciones, marketBonds, mepRate, fciPrices = {}, onLetrasMap = {} }) {
  const cerradas = operaciones.filter(o => o.status === 'VENDIDA');
  const activas  = operaciones.filter(o => o.status === 'ACTIVA');
  const tc = mepRate || 1;

  // Ganancia latente para TODAS las posiciones activas
  const gananciasLatentes = useMemo(() => {
    return activas.map(op => {
      const invARS = parseFloat(op.amount_ars || 0);
      const invUSD = op.type === 'CAUCION' ? invARS / tc : (op.amount_ars && op.tc_compra ? invARS / parseFloat(op.tc_compra) : parseFloat(op.amount_usd || 0));
      let valorActualARS = null;
      let valorActualUSD = null;
      let fuente = null;

      if (['BOND', 'ON', 'LETRA', 'BOPREAL'].includes(op.type)) {
        const market = marketBonds.find(b => b.ticker === op.ticker)
          || (onLetrasMap[op.ticker] != null ? { price: onLetrasMap[op.ticker], currency: 'USD' } : null);
        if (market && op.qty) {
          const precioUSD = market.currency === 'ARS' ? (market.price || 0) / tc : (market.price || 0);
          valorActualUSD = (parseFloat(op.qty) / 100) * precioUSD;
          valorActualARS = valorActualUSD * tc;
          fuente = 'Precio mercado';
        }
      } else if (op.type === 'FCI') {
        const vcpActual = fciPrices[op.nombre];
        const cuotapartes = parseFloat(op.qty || op.cuotapartes_cantidad || 0);
        if (vcpActual && cuotapartes) {
          valorActualARS = cuotapartes * vcpActual;
          valorActualUSD = valorActualARS / tc;
          fuente = `VCP $${fmt(vcpActual)}`;
        }
      } else if (op.type === 'CAUCION') {
        const capital = invARS;
        const tna = parseFloat(op.tna || 0) / 100;
        const plazo = parseInt(op.term_dias || 0);
        const inicio = new Date(op.date_compra + 'T12:00:00');
        const diasTransc = Math.max(0, Math.floor((new Date() - inicio) / 86400000));
        // Si es día 0, mostrar rendimiento esperado al vencimiento
        const diasEfectivos = diasTransc === 0 ? plazo : diasTransc;
        valorActualARS = capital * (1 + tna * diasEfectivos / 365);
        valorActualUSD = valorActualARS / tc;
        fuente = diasTransc === 0 ? `Estimado ${plazo}d` : `Accrual ${diasTransc}d`;
      }

      if (valorActualARS == null) return null;
      const rendARS = invARS > 0 ? ((valorActualARS - invARS) / invARS) * 100 : null;
      const rendUSD = invUSD > 0 && valorActualUSD != null ? ((valorActualUSD - invUSD) / invUSD) * 100 : null;
      return { op, valorActualARS, valorActualUSD, rendARS, rendUSD, invARS, invUSD, fuente };
    }).filter(Boolean);
  }, [activas, marketBonds, mepRate, fciPrices, onLetrasMap]);

  // Resumen realizado
  const cerradasConRend   = cerradas.filter(o => o.amount_venta_ars && o.amount_ars);
  const gananciaRealizada = cerradasConRend.reduce((a, o) => a + (parseFloat(o.amount_venta_ars) - parseFloat(o.amount_ars)), 0);
  const rendPromARS       = cerradasConRend.length > 0
    ? cerradasConRend.reduce((a, o) => a + ((parseFloat(o.amount_venta_ars) - parseFloat(o.amount_ars)) / parseFloat(o.amount_ars)) * 100, 0) / cerradasConRend.length
    : null;

  // Ganancia latente total
  const gLatenteTotalARS = gananciasLatentes.reduce((a, r) => a + ((r.valorActualARS || r.invARS) - r.invARS), 0);

  const noHayNada = gananciasLatentes.length === 0 && cerradas.length === 0;
  if (noHayNada) return <EmptyState>Sin datos de rendimiento aún. Registrá posiciones para ver la evolución acá.</EmptyState>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 9, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ganancia Latente</div>
          {gananciasLatentes.length > 0 ? (
            <>
              <div style={{ fontSize: 17, fontWeight: 900, color: gLatenteTotalARS >= 0 ? th.blue : th.red }}>{fmtARS(gLatenteTotalARS)}</div>
              <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>{gananciasLatentes.length} pos. con precio de mercado</div>
            </>
          ) : <div style={{ fontSize: 13, color: th.sub }}>Sin datos de mercado</div>}
        </div>
        <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 9, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ganancia Realizada</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: gananciaRealizada >= 0 ? th.green : th.red }}>{fmtARS(gananciaRealizada)}</div>
          <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>{cerradasConRend.length} operación{cerradasConRend.length !== 1 ? 'es' : ''} cerrada{cerradasConRend.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 9, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Rend. Prom. Realizado</div>
          {rendPromARS != null
            ? <div style={{ fontSize: 17, fontWeight: 900, color: rendPromARS >= 0 ? th.green : th.red }}>{fmtPct(rendPromARS)}</div>
            : <div style={{ fontSize: 14, color: th.sub }}>—</div>}
          <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>en ARS · posiciones cerradas</div>
        </div>
      </div>

      {/* Tabla revalorización activas */}
      {gananciasLatentes.length > 0 && (
        <div>
          <SectionTitle icon={<TrendingUp size={13} />}>Revalorización — Posiciones Activas</SectionTitle>
          <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${th.border}` }}>
                  {['Instrumento', 'Tipo', 'Invertido ARS', 'Valor Actual', 'Ganancia ARS', 'Rend. ARS', 'Rend. USD', 'Fuente'].map(c =>
                    <th key={c} style={{ padding: '11px 14px', textAlign: 'left', color: th.sub, fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{c}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {gananciasLatentes.map(({ op, valorActualARS, valorActualUSD, rendARS, rendUSD, invARS, fuente }, i) => (
                  <tr key={op.id} style={{ borderTop: i > 0 ? `1px solid ${th.border}` : 'none' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: TIPO_COLOR[op.type] || th.sub, flexShrink: 0 }} />
                        <span style={{ fontWeight: 700 }}>{op.ticker || op.nombre || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${TIPO_COLOR[op.type] || th.sub}22`, color: TIPO_COLOR[op.type] || th.sub }}>{TIPO_LABEL[op.type] || op.type}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>{fmtARS(invARS)}</td>
                    <td style={{ padding: '12px 14px', color: th.blue, fontWeight: 700 }}>
                      {op.type === 'FCI' || op.type === 'CAUCION' ? fmtARS(valorActualARS) : fmtUSD(valorActualUSD)}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: (valorActualARS - invARS) >= 0 ? th.green : th.red }}>
                      {valorActualARS != null ? fmtARS(valorActualARS - invARS) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}><DeltaBadge value={rendARS} /></td>
                    <td style={{ padding: '12px 14px' }}><DeltaBadge value={rendUSD} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 10, color: th.sub }}>{fuente || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10, color: th.sub, marginTop: 8 }}>
            * BOND/ON/LETRA/BOPREAL: precio de cierre. FCI: VCP del día. Caución: accrual diario (interés simple).
          </div>
        </div>
      )}

      {/* Historial cerradas */}
      {cerradas.length > 0 && (
        <div>
          <SectionTitle icon={<TrendingDown size={13} />}>Historial de Posiciones Cerradas</SectionTitle>
          <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${th.border}` }}>
                  {['Instrumento', 'Tipo', 'Compra', 'Venta', 'Monto Compra', 'Monto Venta', 'Rend. ARS', 'Rend. USD', 'Realizado'].map(c => (
                    <th key={c} style={{ padding: '10px 14px', textAlign: 'left', color: th.sub, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cerradas.map((op, i) => {
                  const rendARS = op.amount_venta_ars && op.amount_ars ? ((parseFloat(op.amount_venta_ars) - parseFloat(op.amount_ars)) / parseFloat(op.amount_ars)) * 100 : null;
                  const cUSD    = op.amount_ars && op.tc_compra ? parseFloat(op.amount_ars) / parseFloat(op.tc_compra) : null;
                  const vUSD    = op.amount_venta_ars && op.tc_venta ? parseFloat(op.amount_venta_ars) / parseFloat(op.tc_venta) : null;
                  const rendUSD = cUSD && vUSD ? ((vUSD - cUSD) / cUSD) * 100 : null;
                  return (
                    <tr key={op.id} style={{ borderTop: i > 0 ? `1px solid ${th.border}` : 'none' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{op.ticker || op.nombre || '—'}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${TIPO_COLOR[op.type] || th.sub}22`, color: TIPO_COLOR[op.type] || th.sub }}>{TIPO_LABEL[op.type] || op.type}</span></td>
                      <td style={{ padding: '12px 14px', color: th.sub2, fontSize: 11 }}>{op.date_compra}</td>
                      <td style={{ padding: '12px 14px', color: th.sub2, fontSize: 11 }}>{op.date_venta || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{op.amount_ars ? fmtARS(op.amount_ars) : '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{op.amount_venta_ars ? fmtARS(op.amount_venta_ars) : '—'}</td>
                      <td style={{ padding: '12px 14px' }}><DeltaBadge value={rendARS} /></td>
                      <td style={{ padding: '12px 14px' }}><DeltaBadge value={rendUSD} /></td>
                      <td style={{ padding: '12px 14px' }}><DeltaBadge value={op.rendimiento_realizado} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Formulario Nueva Operación ───────────────────────────────────────────────
function OperacionForm({ marketBonds, mepRate, oficialRate, onGuardar, onCancel }) {
  const [type, setType]         = useState('BOND');
  const [tc, setTc]             = useState(null);
  const [vcp, setVcp]           = useState(null);
  const [tnaSugerida, setTna]   = useState(null);
  const [fciList, setFciList]   = useState([]);
  const [onsList, setOnsList]   = useState([]);
  const [letrasList, setLetras] = useState([]);
  const [form, setForm]         = useState({
    date_compra: new Date().toISOString().split('T')[0],
    lugar_compra: '', notas: '', ticker: '', nombre: '',
    qty: '', cuotapartes: '', price_compra: '', amount_ars: '', amount_usd: '',
    tna: '', term_dias: '', operacion_fci: 'SUSCRIPCION',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.date_compra) return;
    fetch(`${API}/resolver-tc?fecha=${form.date_compra}`).then(r => r.json()).then(d => setTc(d.tc_mayorista || null)).catch(() => {});
  }, [form.date_compra]);

  // Cargar lista de FCIs desde /api/v1/fci
  useEffect(() => {
    if (type !== 'FCI') return;
    fetch(API_FCI).then(r => r.json()).then(data => {
      setFciList(Array.isArray(data) ? data : (data?.fondos || data?.results || []));
    }).catch(() => setFciList([]));
  }, [type]);

  // Cargar ONs desde /api/v1/ons
  useEffect(() => {
    if (type !== 'ON') return;
    fetch(API_ONS).then(r => r.json()).then(data => {
      setOnsList(Array.isArray(data) ? data : (data?.bonos || data?.results || []));
    }).catch(() => setOnsList([]));
  }, [type]);

  // Cargar Letras desde /api/v1/letras
  useEffect(() => {
    if (type !== 'LETRA') return;
    fetch(API_LETRAS).then(r => r.json()).then(data => {
      setLetras(Array.isArray(data) ? data : (data?.bonos || data?.results || []));
    }).catch(() => setLetras([]));
  }, [type]);

  useEffect(() => {
    if (type !== 'FCI' || !form.nombre || !form.date_compra) return;
    fetch(`${API}/resolver-vcp?fondo=${encodeURIComponent(form.nombre)}&fecha=${form.date_compra}`).then(r => r.json()).then(d => {
      const vcpVal = d.vcp || null;
      setVcp(vcpVal);
      if (vcpVal && form.cuotapartes) {
        const monto = parseFloat(form.cuotapartes) * vcpVal;
        set('amount_ars', monto.toFixed(0));
        if (oficialRate) set('amount_usd', (monto / oficialRate).toFixed(2));
      }
    }).catch(() => {});
  }, [type, form.nombre, form.date_compra]);

  useEffect(() => {
    if (type !== 'CAUCION' || !form.term_dias) return;
    fetch(API_CAUCION).then(r => r.json()).then(data => {
      const ars   = (data || []).filter(c => c.moneda === 'ARS').sort((a, b) => parseInt(a.plazo) - parseInt(b.plazo));
      const match = ars.find(c => parseInt(c.plazo) >= parseInt(form.term_dias)) || ars[ars.length - 1];
      if (match?.tna) { setTna(parseFloat(match.tna)); set('tna', String(parseFloat(match.tna))); }
    }).catch(() => {});
  }, [type, form.term_dias]);

  const tcParaTipo = ['BOND','ON','LETRA','BOPREAL'].includes(type) ? (mepRate || tc || 1) : (oficialRate || tc || 1);
  const tcLabel    = ['BOND','ON','LETRA','BOPREAL'].includes(type) ? 'MEP' : 'Oficial';

  const handleARS = v => { set('amount_ars', v); if (v && tcParaTipo) set('amount_usd', (parseFloat(v) / tcParaTipo).toFixed(2)); };
  const handleUSD = v => { set('amount_usd', v); if (v && tcParaTipo) set('amount_ars', (parseFloat(v) * tcParaTipo).toFixed(0)); };

  const handleCuotapartes = v => {
    set('cuotapartes', v);
    if (vcp && v) {
      const monto = parseFloat(v) * vcp;
      set('amount_ars', monto.toFixed(0));
      if (oficialRate) set('amount_usd', (monto / oficialRate).toFixed(2));
    }
  };

  const handleGuardar = () => {
    const payload = { type, ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] == null) delete payload[k]; });
    ['qty','cuotapartes','price_compra','amount_ars','amount_usd','tna','term_dias'].forEach(k => { if (payload[k] !== undefined) payload[k] = parseFloat(payload[k]); });
    onGuardar(payload);
  };

  // Para BOND y BOPREAL seguimos usando marketBonds
  const bondsFiltered   = marketBonds.filter(b => {
    const t = (b.tipo || b.type || b.category || '').toUpperCase();
    if (type === 'BOND')    return ['HARD_DOLLAR','CER','DOLLAR_LINKED','TASA_FIJA','TASA_VARIABLE','SOBERANO','NACIONAL'].some(x => t.includes(x)) || t === '';
    if (type === 'BOPREAL') return t.includes('BOPREAL') || (b.ticker || '').toUpperCase().startsWith('BPY') || (b.ticker || '').toUpperCase().startsWith('BPD');
    return false;
  });

  // Selecciona la lista correcta por tipo
  const tickersFiltrados = type === 'ON' ? onsList : type === 'LETRA' ? letrasList : bondsFiltered;

  const TIPOS = ['BOND','ON','LETRA','BOPREAL','FCI','CAUCION'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <FieldLabel>Tipo de Instrumento</FieldLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPOS.map(t => (
            <button key={t} onClick={() => setType(t)} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${type === t ? TIPO_COLOR[t] : th.border}`, background: type === t ? `${TIPO_COLOR[t]}22` : 'transparent', color: type === t ? TIPO_COLOR[t] : th.sub, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <FieldLabel>Fecha de Compra</FieldLabel>
          <FormInput type="date" value={form.date_compra} onChange={e => set('date_compra', e.target.value)} />
          {tc && <div style={{ fontSize: 10, color: th.sub, marginTop: 4 }}>TC {tcLabel}: <span style={{ color: th.yellow, fontWeight: 700 }}>{fmtARS(tcParaTipo)}</span></div>}
        </div>
        <div>
          <FieldLabel>Lugar de Compra</FieldLabel>
          <FormInput type="text" placeholder="IOL, Balanz, PPI..." value={form.lugar_compra} onChange={e => set('lugar_compra', e.target.value)} />
        </div>

        {['BOND','ON','LETRA','BOPREAL'].includes(type) && <>
          <div>
            <FieldLabel>Ticker</FieldLabel>
            <FormSelect value={form.ticker} onChange={e => set('ticker', e.target.value)}>
              <option value="">{tickersFiltrados.length === 0 && ['ON','LETRA'].includes(type) ? 'Cargando...' : 'Seleccionar...'}</option>
              {tickersFiltrados.map(b => <option key={b.ticker} value={b.ticker}>{b.ticker}{b.nombre ? ` — ${(b.nombre || b.descripcion || '').slice(0, 36)}` : ''}</option>)}
            </FormSelect>
            {tickersFiltrados.length === 0 && !['ON','LETRA'].includes(type) && <div style={{ fontSize: 10, color: th.yellow, marginTop: 3 }}>Sin tickers disponibles</div>}
            {tickersFiltrados.length > 0 && <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>{tickersFiltrados.length} instrumento{tickersFiltrados.length !== 1 ? 's' : ''} disponible{tickersFiltrados.length !== 1 ? 's' : ''}</div>}
          </div>
          <div><FieldLabel>Nominales</FieldLabel><FormInput type="number" placeholder="Ej: 1000" value={form.qty} onChange={e => set('qty', e.target.value)} /></div>
          <div><FieldLabel>Precio Compra (USD)</FieldLabel><FormInput type="number" placeholder="Ej: 83.50" value={form.price_compra} onChange={e => set('price_compra', e.target.value)} /></div>
          <div>
            <FieldLabel>Monto ARS</FieldLabel>
            <FormInput type="number" placeholder="Ej: 920000" value={form.amount_ars} onChange={e => handleARS(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Equivalente USD</FieldLabel>
            <FormInput type="number" placeholder="Auto" value={form.amount_usd} onChange={e => handleUSD(e.target.value)} />
            <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>Usando TC {tcLabel} {fmtARS(tcParaTipo)}</div>
          </div>
        </>}

        {type === 'CAUCION' && <>
          <div><FieldLabel>Monto ARS</FieldLabel><FormInput type="number" placeholder="Ej: 500000" value={form.amount_ars} onChange={e => handleARS(e.target.value)} /></div>
          <div><FieldLabel>Plazo (días)</FieldLabel><FormInput type="number" placeholder="Ej: 7" value={form.term_dias} onChange={e => set('term_dias', e.target.value)} /></div>
          <div>
            <FieldLabel>TNA (%)</FieldLabel>
            <FormInput type="number" placeholder="Ej: 32" value={form.tna} onChange={e => set('tna', e.target.value)} />
            {tnaSugerida && <div style={{ fontSize: 10, color: th.green, marginTop: 3 }}>Sugerida según plazo: {tnaSugerida}%</div>}
          </div>
          {form.amount_ars && form.tna && form.term_dias && (
            <div style={{ padding: '10px 14px', background: `${th.green}11`, border: `1px solid ${th.green}33`, borderRadius: 6, fontSize: 11 }}>
              <div style={{ color: th.sub, marginBottom: 4 }}>Cobro estimado al vencimiento</div>
              <div style={{ color: th.green, fontWeight: 800, fontSize: 14 }}>{fmtARS(parseFloat(form.amount_ars) * (1 + (parseFloat(form.tna) / 100) * parseInt(form.term_dias) / 365))}</div>
              <div style={{ color: th.sub, fontSize: 10 }}>Interés: {fmtARS(parseFloat(form.amount_ars) * (parseFloat(form.tna) / 100) * parseInt(form.term_dias) / 365)}</div>
            </div>
          )}
        </>}

        {type === 'FCI' && <>
          <div>
            <FieldLabel>Fondo de Inversión</FieldLabel>
            {fciList.length > 0 ? (
              <FormSelect value={form.nombre} onChange={e => set('nombre', e.target.value)}>
                <option value="">Seleccionar fondo...</option>
                {fciList.map(f => (
                  <option key={f.id || f.nombre} value={f.nombre}>{f.nombre}{f.tipo ? ` — ${f.tipo}` : ''}</option>
                ))}
              </FormSelect>
            ) : (
              <FormInput type="text" placeholder="Galileo Money Market" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            )}
            {vcp && <div style={{ fontSize: 10, color: th.green, marginTop: 3 }}>VCP en esa fecha: ${fmt(vcp)}</div>}
          </div>
          <div>
            <FieldLabel>Operación</FieldLabel>
            <FormSelect value={form.operacion_fci} onChange={e => set('operacion_fci', e.target.value)}>
              <option value="SUSCRIPCION">Suscripción</option>
              <option value="RESCATE">Rescate</option>
            </FormSelect>
          </div>
          <div>
            <FieldLabel>Cuotapartes</FieldLabel>
            <FormInput type="number" placeholder="Ej: 1542.38" value={form.cuotapartes} onChange={e => handleCuotapartes(e.target.value)} />
            {vcp && form.cuotapartes && <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>= {fmtARS(parseFloat(form.cuotapartes) * vcp)} al VCP actual</div>}
          </div>
          <div><FieldLabel>Monto ARS</FieldLabel><FormInput type="number" placeholder="Ej: 200000" value={form.amount_ars} onChange={e => handleARS(e.target.value)} /></div>
          <div>
            <FieldLabel>Equivalente USD</FieldLabel>
            <FormInput type="number" placeholder="Auto" value={form.amount_usd} onChange={e => handleUSD(e.target.value)} />
            <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>Usando TC Oficial {fmtARS(oficialRate)}</div>
          </div>
        </>}

        <div style={{ gridColumn: '1 / -1' }}>
          <FieldLabel>Notas (opcional)</FieldLabel>
          <FormInput type="text" placeholder="Observaciones libres" value={form.notas} onChange={e => set('notas', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${th.border}` }}>
        <button onClick={onCancel} style={{ padding: '8px 20px', background: 'transparent', border: `1px solid ${th.border}`, color: th.sub, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12 }}>Cancelar</button>
        <button onClick={handleGuardar} style={{ padding: '8px 20px', background: th.blue, border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12 }}>Guardar</button>
      </div>
    </div>
  );
}

// ─── Formulario Venta ─────────────────────────────────────────────────────────
function VentaForm({ operacion, mepRate, oficialRate, onGuardar, onCancel }) {
  const [form, setForm] = useState({ date_venta: new Date().toISOString().split('T')[0], price_venta: '', amount_venta_ars: '', price_venta_usd: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tc  = ['BOND','ON','LETRA','BOPREAL'].includes(operacion.type) ? (mepRate || 1) : (oficialRate || 1);

  const rendARS = form.amount_venta_ars && operacion.amount_ars
    ? ((parseFloat(form.amount_venta_ars) - parseFloat(operacion.amount_ars)) / parseFloat(operacion.amount_ars)) * 100
    : null;

  const handleGuardar = () => {
    const payload = { ...form };
    ['price_venta','amount_venta_ars','price_venta_usd'].forEach(k => { if (payload[k]) payload[k] = parseFloat(payload[k]); else delete payload[k]; });
    onGuardar(payload);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '10px 14px', background: th.card2, borderRadius: 6, border: `1px solid ${th.border}`, fontSize: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div><span style={{ color: th.sub }}>Instrumento: </span><span style={{ fontWeight: 700 }}>{operacion.ticker || operacion.nombre}</span></div>
        {operacion.amount_ars && <div><span style={{ color: th.sub }}>Invertido: </span><span style={{ fontWeight: 700 }}>{fmtARS(operacion.amount_ars)}</span></div>}
        {operacion.tc_compra  && <div><span style={{ color: th.sub }}>TC compra: </span><span style={{ fontWeight: 700 }}>${fmt(operacion.tc_compra, 0)}</span></div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><FieldLabel>Fecha de Venta</FieldLabel><FormInput type="date" value={form.date_venta} onChange={e => set('date_venta', e.target.value)} /></div>
        <div><FieldLabel>Precio de Venta (USD)</FieldLabel><FormInput type="number" placeholder="Ej: 88.00" value={form.price_venta} onChange={e => set('price_venta', e.target.value)} /></div>
        <div><FieldLabel>Monto Cobrado (ARS)</FieldLabel><FormInput type="number" placeholder="Ej: 1050000" value={form.amount_venta_ars} onChange={e => set('amount_venta_ars', e.target.value)} /></div>
        <div>
          <FieldLabel>Equivalente USD cobrado</FieldLabel>
          <FormInput type="number" placeholder="Opcional" value={form.price_venta_usd} onChange={e => set('price_venta_usd', e.target.value)} />
          <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>TC referencia: {fmtARS(tc)}</div>
        </div>
      </div>
      {rendARS != null && (
        <div style={{ padding: '10px 14px', background: rendARS >= 0 ? `${th.green}11` : `${th.red}11`, border: `1px solid ${rendARS >= 0 ? th.green : th.red}33`, borderRadius: 6, fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: th.sub }}>Rendimiento estimado en ARS</span>
          <DeltaBadge value={rendARS} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${th.border}` }}>
        <button onClick={onCancel} style={{ padding: '8px 20px', background: 'transparent', border: `1px solid ${th.border}`, color: th.sub, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12 }}>Cancelar</button>
        <button onClick={handleGuardar} style={{ padding: '8px 20px', background: th.yellow, border: 'none', color: '#000', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12 }}>Registrar Venta</button>
      </div>
    </div>
  );
}

// ─── Auxiliares ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, sub }) => (
  <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 8, padding: '14px 16px' }}>
    <div style={{ fontSize: 9, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 900, color: color || th.text, letterSpacing: '-0.02em' }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>{sub}</div>}
  </div>
);
const SectionTitle = ({ children, icon }) => (
  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>{icon}{children}</h3>
);
const EmptyState  = ({ children }) => <div style={{ padding: '60px 0', textAlign: 'center', color: th.sub, fontSize: 13 }}>{children}</div>;
const Modal = ({ children, onClose, title }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
    <div style={{ background: th.card, border: `1px solid ${th.border2}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: th.sub, cursor: 'pointer', padding: 4 }}><X size={17} /></button>
      </div>
      {children}
    </div>
  </div>
);
const ActionBtn = ({ children, onClick, color, title }) => (
  <button onClick={onClick} title={title} style={{ padding: '5px 7px', background: `${color}18`, border: `1px solid ${color}44`, color, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{children}</button>
);
const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 10, color: th.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{children}</div>
);
const inputBase  = { background: th.card2, border: `1px solid ${th.border}`, padding: '9px 12px', borderRadius: 6, color: th.text, outline: 'none', fontSize: 12, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };
const FormInput  = (props) => <input style={inputBase} {...props} />;
const FormSelect = ({ children, ...props }) => <select style={{ ...inputBase, cursor: 'pointer' }} {...props}>{children}</select>;