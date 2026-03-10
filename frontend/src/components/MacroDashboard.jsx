import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Clock, Wallet, Landmark, Minus, Info, ChevronDown, ChevronUp } from 'lucide-react';

const API_MACRO      = 'http://localhost:18000/api/v1/macro';
const API_CAUCIONES  = 'http://localhost:18000/api/v1/cauciones';
const API_BILLETERAS = 'http://localhost:18000/api/v1/billeteras';

const theme = {
    bg:      '#020617',
    card:    '#0f172a',
    card2:   '#0d1526',
    border:  '#1e293b',
    text:    '#e2e8f0',
    subtext: '#94a3b8',
    green:   '#22c55e',
    red:     '#ef4444',
    accent:  '#3b82f6',
    yellow:  '#eab308',
};

const fmt    = (n) => n != null ? n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '—';
const fmtPct = (n) => n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(2)}%` : '—';
const fmtARS = (n) => n != null ? `$${Number(n).toLocaleString('es-AR')}` : 'Sin límite';

function changeStyle(change, invertBad = false) {
    if (change == null || change === 0) return { color: theme.subtext, Icon: Minus };
    const isPositive = change > 0;
    const isGood = invertBad ? !isPositive : isPositive;
    return { color: isGood ? theme.green : theme.red, Icon: isPositive ? TrendingUp : TrendingDown };
}

export default function MacroDashboard() {
    const [macro,      setMacro]      = useState(null);
    const [cauciones,  setCauciones]  = useState([]);
    const [billeteras, setBilleteras] = useState([]);
    const [loading,    setLoading]    = useState(true);

    useEffect(() => {
        Promise.all([
            fetch(API_MACRO).then(r => r.json()).catch(() => null),
            fetch(API_CAUCIONES).then(r => r.json()).catch(() => []),
            fetch(API_BILLETERAS).then(r => r.json()).catch(() => []),
        ]).then(([m, c, b]) => {
            if (m) setMacro(m);
            if (c) setCauciones(Array.isArray(c) ? c : []);
            if (b) setBilleteras(Array.isArray(b) ? b : []);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg, color: theme.subtext }}>
            <Activity style={{ animation: 'spin 1s linear infinite' }} size={24} />
        </div>
    );

    const fxHoy       = macro?.fx_hoy        || {};
    const riesgoPais  = macro?.riesgo_pais   || {};
    const inflacion   = macro?.inflacion     || {};
    const uva         = macro?.uva           || {};
    const plazosFijos = macro?.tasas_pasivas || [];

    const caucionesARS = cauciones
        .filter(c => c.moneda === 'ARS')
        .sort((a, b) => (a.plazo || 0) - (b.plazo || 0));

    const fxKeys = ['oficial', 'mayorista', 'blue', 'bolsa', 'contadoconliqui', 'cripto', 'tarjeta'];

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px', backgroundColor: theme.bg, color: theme.text, fontFamily: "'Inter', 'Segoe UI', monospace" }}>

            <header style={{ marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 12 }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monitor Macroeconómico</h1>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: theme.subtext }}>Terminal AFI • Vista General de Mercado</p>
            </header>

            {/* FILA 1: FX */}
            <div style={{ marginBottom: 24 }}>
                <SectionTitle>Mercado Cambiario</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
                    {fxKeys.map(casa => <FXCard key={casa} casa={casa} data={fxHoy[casa]} />)}
                </div>
            </div>

            {/* FILA 2: MACRO */}
            <div style={{ marginBottom: 24 }}>
                <SectionTitle>Indicadores Principales</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <MacroCard label="Riesgo País (EMBI+)"  value={riesgoPais.valor ? fmt(riesgoPais.valor) : '—'}   unit="bps" change={riesgoPais.variacion_diaria}       changeLabel="Var. Diaria"          invertBad={true} />
                    <MacroCard label="Inflación Mensual"    value={inflacion.mensual?.valor ?? '—'}                   unit="%"   change={inflacion.mensual?.variacion}        changeLabel="Var. vs mes anterior" invertBad={true} />
                    <MacroCard label="Inflación Interanual" value={inflacion.interanual?.valor ?? '—'}                unit="%"   change={inflacion.interanual?.variacion}     changeLabel="Var. vs mes anterior" invertBad={true} />
                    <MacroCard label="Valor UVA"            value={uva.valor ? fmt(uva.valor) : '—'}                 unit="ARS" change={uva.variacion}                       changeLabel="Var. Mensual"         invertBad={false} />
                </div>
            </div>

            {/* FILA 3: TASAS */}
            <div>
                <SectionTitle>Tasas de Interés y Rendimientos</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

                    {/* Plazos Fijos */}
                    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, padding: 16, borderRadius: 6, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, color: theme.subtext }}>
                            <Landmark size={14} />
                            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Plazos Fijos</h4>
                        </div>
                        {plazosFijos.length === 0
                            ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subtext, fontSize: 11, opacity: 0.5 }}>Sin datos</div>
                            : <>
                                <div style={{ overflowY: 'auto', maxHeight: 260, marginRight: -4, paddingRight: 4 }}>
                                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: theme.card }}>
                                            <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.subtext }}>
                                                <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600 }}>Entidad</th>
                                                <th style={{ textAlign: 'right', paddingBottom: 8, fontWeight: 600 }}>TNA</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {plazosFijos.map((pf, i) => (
                                                <tr key={i} style={{ borderBottom: i < plazosFijos.length - 1 ? `1px dashed ${theme.border}` : 'none' }}>
                                                    <td style={{ padding: '9px 0', fontWeight: 500, fontSize: 11, color: theme.text }}>{pf.entidad}</td>
                                                    <td style={{ textAlign: 'right', padding: '9px 0', color: theme.green, fontWeight: 700 }}>{Number(pf.tna).toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${theme.border}`, fontSize: 10, color: theme.subtext, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{plazosFijos.length} entidades · BCRA</span>
                                </div>
                            </>
                        }
                    </div>

                    {/* Billeteras Virtuales */}
                    <BilleterasCard billeteras={billeteras} />

                    {/* Cauciones ARS */}
                    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, padding: 16, borderRadius: 6, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, color: theme.subtext }}>
                            <Clock size={14} />
                            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Cauciones ARS</h4>
                        </div>
                        {caucionesARS.length === 0
                            ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subtext, fontSize: 11, opacity: 0.5 }}>Sin datos</div>
                            : <>
                                <div style={{ overflowY: 'auto', maxHeight: 260, marginRight: -4, paddingRight: 4 }}>
                                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: theme.card }}>
                                            <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.subtext }}>
                                                <th style={{ textAlign: 'left',  paddingBottom: 8, fontWeight: 600 }}>Plazo</th>
                                                <th style={{ textAlign: 'right', paddingBottom: 8, fontWeight: 600 }}>TNA</th>
                                                <th style={{ textAlign: 'right', paddingBottom: 8, fontWeight: 600 }}>TEA</th>
                                                <th style={{ textAlign: 'right', paddingBottom: 8, fontWeight: 600 }}>Rend.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {caucionesARS.map((c, i) => (
                                                <tr key={i} style={{ borderBottom: i < caucionesARS.length - 1 ? `1px dashed ${theme.border}` : 'none' }}>
                                                    <td style={{ padding: '9px 0', fontWeight: 600, color: theme.text }}>{c.plazo === 1 ? '1 Día' : `${c.plazo} Días`}</td>
                                                    <td style={{ textAlign: 'right', padding: '9px 0', color: theme.green, fontWeight: 700 }}>{c.tna != null ? `${Number(c.tna).toFixed(2)}%` : '—'}</td>
                                                    <td style={{ textAlign: 'right', padding: '9px 0', color: theme.subtext, fontSize: 11 }}>{c.tea != null ? `${Number(c.tea).toFixed(2)}%` : '—'}</td>
                                                    <td style={{ textAlign: 'right', padding: '9px 0', color: theme.accent, fontSize: 11 }}>{c.rendimiento_plazo != null ? `+${Number(c.rendimiento_plazo).toFixed(4)}%` : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${theme.border}`, fontSize: 10, color: theme.subtext, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{caucionesARS.length} plazos · BYMA</span>
                                    <span>Mín. ARS 1.000</span>
                                </div>
                            </>
                        }
                    </div>

                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ── Billeteras Card ───────────────────────────────────────────────────────────

function BilleterasCard({ billeteras }) {
    const [expanded, setExpanded] = useState(null);

    return (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, padding: 16, borderRadius: 6, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, color: theme.subtext }}>
                <Wallet size={14} />
                <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Billeteras Virtuales</h4>
            </div>

            {billeteras.length === 0
                ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subtext, fontSize: 11, opacity: 0.5 }}>Sin datos</div>
                : <>
                    <div style={{ overflowY: 'auto', maxHeight: 260, marginRight: -4, paddingRight: 4 }}>
                        {billeteras.map((b, i) => {
                            const isOpen = expanded === i;
                            const { color: varColor, Icon: VarIcon } = changeStyle(b.variacion_diaria, false);
                            const hasInfo = b.condiciones_corto || b.tope;

                            return (
                                <div key={i} style={{ borderBottom: i < billeteras.length - 1 ? `1px dashed ${theme.border}` : 'none' }}>
                                    {/* Fila principal */}
                                    <div
                                        style={{ display: 'flex', alignItems: 'center', padding: '9px 0', gap: 6, cursor: hasInfo ? 'pointer' : 'default' }}
                                        onClick={() => hasInfo && setExpanded(isOpen ? null : i)}
                                    >
                                        {/* Nombre */}
                                        <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: theme.text }}>{b.fondo}</div>

                                        {/* TEA en gris chico */}
                                        <div style={{ fontSize: 10, color: theme.subtext, marginRight: 4 }}>
                                            {b.tea != null ? `${Number(b.tea).toFixed(1)}% TEA` : ''}
                                        </div>

                                        {/* TNA principal */}
                                        <div style={{ fontSize: 13, fontWeight: 800, color: theme.green, minWidth: 52, textAlign: 'right' }}>
                                            {b.tna != null ? `${Number(b.tna).toFixed(1)}%` : '—'}
                                        </div>

                                        {/* Variación diaria */}
                                        {b.variacion_diaria != null
                                            ? <div style={{ fontSize: 10, fontWeight: 700, color: varColor, display: 'flex', alignItems: 'center', gap: 2, minWidth: 44, justifyContent: 'flex-end' }}>
                                                <VarIcon size={9} />
                                                {Math.abs(b.variacion_diaria).toFixed(2)}pp
                                              </div>
                                            : <div style={{ minWidth: 44 }} />
                                        }

                                        {/* Chevron si tiene info */}
                                        {hasInfo && (
                                            <div style={{ color: theme.subtext, marginLeft: 2 }}>
                                                {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </div>
                                        )}
                                    </div>

                                    {/* Panel expandido */}
                                    {isOpen && hasInfo && (
                                        <div style={{ background: theme.card2, border: `1px solid ${theme.border}`, borderRadius: 4, padding: '10px 12px', marginBottom: 8, fontSize: 11 }}>
                                            {b.tope && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: b.condiciones_corto ? 6 : 0 }}>
                                                    <span style={{ color: theme.subtext }}>Tope</span>
                                                    <span style={{ color: theme.yellow, fontWeight: 700 }}>{fmtARS(b.tope)}</span>
                                                </div>
                                            )}
                                            {b.condiciones_corto && (
                                                <div style={{ color: theme.subtext, lineHeight: 1.5, display: 'flex', gap: 6 }}>
                                                    <Info size={11} style={{ marginTop: 2, flexShrink: 0, color: theme.accent }} />
                                                    <span>{b.condiciones_corto}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${theme.border}`, fontSize: 10, color: theme.subtext, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{billeteras.length} billeteras · T+0</span>
                        <span>TNA · Clic para detalles</span>
                    </div>
                </>
            }
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
    return <h3 style={{ fontSize: 11, fontWeight: 700, color: theme.subtext, textTransform: 'uppercase', marginBottom: 12, marginTop: 0, letterSpacing: '0.05em' }}>{children}</h3>;
}

function FXCard({ casa, data }) {
    const labels = { oficial: 'Oficial', mayorista: 'Mayorista', blue: 'Blue', bolsa: 'MEP', contadoconliqui: 'CCL', cripto: 'Cripto', tarjeta: 'Tarjeta' };
    const label  = labels[casa] || casa;
    const { color, Icon } = changeStyle(data?.variacion, false);

    if (!data || (!data.venta && !data.compra)) return (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, padding: '12px 14px', borderRadius: 6, opacity: 0.5 }}>
            <div style={{ fontSize: 10, color: theme.subtext, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>USD / {label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.subtext }}>N/A</div>
        </div>
    );

    return (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, padding: '12px 14px', borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: theme.subtext, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                USD / {label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginBottom: 8, letterSpacing: '-0.02em' }}>${fmt(data.venta)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: theme.subtext, textTransform: 'uppercase', fontWeight: 600 }}>C ${fmt(data.compra)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Icon size={10} />{fmtPct(data.variacion)}
                </span>
            </div>
        </div>
    );
}

function MacroCard({ label, value, unit, change, changeLabel, invertBad = false }) {
    const { color, Icon } = changeStyle(change, invertBad);
    const hasChange = change != null && change !== 0;

    return (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, padding: '16px 20px', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: theme.subtext, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: theme.text, letterSpacing: '-0.02em' }}>{value}</span>
                <span style={{ fontSize: 12, color: theme.subtext, fontWeight: 600 }}>{unit}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: theme.subtext, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{changeLabel}</span>
                {hasChange
                    ? <span style={{ fontSize: 11, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 4 }}><Icon size={12} />{Math.abs(change).toFixed(2)}%</span>
                    : <span style={{ fontSize: 11, color: theme.subtext, display: 'flex', alignItems: 'center', gap: 4 }}><Minus size={12} /> —</span>
                }
            </div>
        </div>
    );
}