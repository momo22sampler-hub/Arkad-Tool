import React, { useState, useEffect, useMemo } from "react";

// ─── CSS ──────────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fci-spin  { to { transform: rotate(360deg); } }
  @keyframes fci-fill  { from { width: 0% } }
  @keyframes fci-drop  { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fci-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }

  .fci-root {
    font-family: 'Inter', sans-serif;
    background: #0d0d12;
    color: #e8e8e8;
    min-height: 100vh;
    padding: 24px 28px 60px;
    font-size: 13px;
  }

  /* ── Page header ── */
  .fci-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    margin-bottom: 20px;
    border-bottom: 1px solid #1e1e24;
  }
  .fci-page-title { font-size: 18px; font-weight: 700; color: #f0f0f0; letter-spacing: -0.02em; }
  .fci-page-date  { font-family: monospace; font-size: 11px; color: #444; letter-spacing: 0.06em; }

  /* ── Section ── */
  .fci-section { margin-bottom: 32px; }
  .fci-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .fci-section-title  { font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #888; }
  .fci-section-line   { flex: 1; height: 1px; background: #1e1e24; }

  /* ── Signal panel header ── */
  .fci-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px;
    background: #13131a;
    border: 1px solid #1e1e24;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
  }
  .fci-panel-title { font-size: 13px; font-weight: 600; color: #e8e8e8; letter-spacing: -0.01em; }
  .fci-panel-avg   { font-family: monospace; font-size: 18px; font-weight: 700; color: #e8e8e8; }
  .fci-panel-avg-label { font-size: 10px; color: #444; letter-spacing: 0.1em; text-transform: uppercase; margin-left: 4px; }

  /* ── Table header ── */
  .fci-table-head {
    display: grid;
    grid-template-columns: 28px 44px 1fr 200px 60px 16px;
    gap: 12px;
    padding: 7px 14px;
    background: #0f0f14;
    border: 1px solid #1e1e24;
    border-top: 1px solid #1e1e24;
    border-bottom: none;
  }
  .fci-table-head span {
    font-family: monospace; font-size: 9px; font-weight: 400;
    letter-spacing: 0.14em; text-transform: uppercase; color: #444;
  }

  /* ── Category rows ── */
  .fci-rows-wrap {
    border: 1px solid #1e1e24;
    border-radius: 0 0 4px 4px;
    overflow: hidden;
    background: #0d0d12;
  }

  .fci-cat-row {
    display: grid;
    grid-template-columns: 28px 44px 1fr 200px 60px 16px;
    align-items: center;
    gap: 12px;
    padding: 9px 14px;
    border-bottom: 1px solid #1e1e24;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
  }
  .fci-cat-row:hover { background: #1a1a1f; }

  .fci-cat-pill {
    font-family: monospace; font-size: 9px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 2px 6px; border-radius: 3px; text-align: center;
  }

  .fci-cat-name { font-size: 12px; font-weight: 500; color: #c8c8d0; }

  /* ── Score bar ── */
  .fci-bar-track {
    height: 3px; background: #1e1e24; border-radius: 2px; overflow: hidden; width: 140px;
  }
  .fci-bar-fill {
    height: 100%; border-radius: 2px;
    animation: fci-fill 0.7s cubic-bezier(0.4,0,0.2,1) both;
  }

  .fci-score-val {
    font-family: monospace; font-size: 11px; font-weight: 600;
    text-align: right;
  }

  .fci-chevron {
    font-size: 9px; color: #444; text-align: right;
    transition: transform 0.18s;
  }
  .fci-chevron.open { transform: rotate(180deg); }

  /* ── Expand panel ── */
  .fci-expand {
    background: #0f0f14;
    border-bottom: 1px solid #1e1e24;
    padding: 14px 20px 18px;
    animation: fci-drop 0.18s ease both;
  }

  .fci-expand-why {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; margin-bottom: 10px;
  }

  .fci-expand-line {
    font-size: 12px; line-height: 1.65; color: #787880;
    display: flex; gap: 8px; align-items: flex-start;
    margin-bottom: 6px;
  }
  .fci-expand-line.first { color: #c8c8d0; font-weight: 500; }
  .fci-expand-line.last  { font-family: monospace; font-size: 10px; color: #444; }
  .fci-expand-dot { opacity: 0.5; flex-shrink: 0; }

  /* ── Legend footer ── */
  .fci-legend {
    display: flex; align-items: center; gap: 18;
    padding: 8px 14px;
    border-top: 1px solid #1e1e24;
    background: #0f0f14;
    gap: 18px;
  }
  .fci-legend-label {
    font-family: monospace; font-size: 9px; color: #333;
    letter-spacing: 0.1em; text-transform: uppercase; margin-right: 4px;
  }
  .fci-legend-item {
    display: flex; align-items: center; gap: 5px;
    font-family: monospace; font-size: 9px; color: #444;
  }
  .fci-legend-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
  .fci-legend-hint { margin-left: auto; font-family: monospace; font-size: 9px; color: #333; letter-spacing: 0.08em; }

  /* ── Best per category grid ── */
  .fci-best-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
    gap: 1px;
    background: #1e1e24;
    border: 1px solid #1e1e24;
    border-radius: 4px;
    overflow: hidden;
  }

  .fci-best-card {
    background: #0f0f14;
    padding: 14px 16px;
    position: relative;
    overflow: hidden;
    cursor: default;
  }
  .fci-best-card:hover { background: #141419; }
  .fci-best-card::before {
    content: '';
    position: absolute; top: 0; left: 0;
    width: 2px; height: 100%;
    background: #00b050;
  }

  .fci-card-cat   { font-family: monospace; font-size: 9px; letter-spacing: 0.14em; color: #444; text-transform: uppercase; margin-bottom: 8px; }
  .fci-card-name  { font-size: 13px; font-weight: 700; color: #f0f0f0; margin-bottom: 2px; letter-spacing: -0.02em; line-height: 1.3; }
  .fci-card-score { font-family: monospace; font-size: 10px; color: #00b050; margin-bottom: 12px; }
  .fci-card-metrics { display: flex; flex-direction: column; gap: 3px; }
  .fci-card-metric {
    display: flex; justify-content: space-between;
    font-family: monospace; font-size: 10px;
  }
  .fci-card-metric-label { color: #444; }
  .fci-card-metric-value { color: #888; }

  /* ── Top 5 tables ── */
  .fci-regime-block { margin-bottom: 24px; }

  .fci-regime-header {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 14px;
    background: #13131a;
    border: 1px solid #1e1e24;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
  }
  .fci-regime-name  { font-size: 12px; font-weight: 600; color: #c8c8d0; letter-spacing: 0.02em; }
  .fci-regime-count {
    font-family: monospace; font-size: 9px; color: #444;
    background: #1a1a20; border: 1px solid #2a2a32;
    padding: 1px 6px; border-radius: 2px;
  }

  .fci-table-wrap { border: 1px solid #1e1e24; border-radius: 0 0 4px 4px; overflow: hidden; }
  .fci-table { width: 100%; border-collapse: collapse; }
  .fci-table thead tr { background: #0f0f14; border-bottom: 1px solid #1e1e24; }
  .fci-table th {
    font-family: monospace; font-size: 9px; font-weight: 400;
    letter-spacing: 0.14em; text-transform: uppercase; color: #444;
    padding: 7px 12px 7px 14px; text-align: left; white-space: nowrap;
  }
  .fci-table th.ar { text-align: right; padding-right: 14px; }
  .fci-table tbody tr { border-bottom: 1px solid #111116; transition: background 0.12s; }
  .fci-table tbody tr:last-child { border-bottom: none; }
  .fci-table tbody tr:hover { background: #141419; }
  .fci-table td {
    font-size: 12px; padding: 9px 12px 9px 14px;
    color: #888; font-family: monospace; white-space: nowrap;
  }
  .fci-table td.td-name  { color: #e8e8e8; font-weight: 600; font-size: 12px; font-family: 'Inter', sans-serif; white-space: normal; max-width: 320px; }
  .fci-table td.td-score { color: #00b050; text-align: right; padding-right: 14px; font-weight: 600; }
  .fci-table td.ar       { text-align: right; padding-right: 14px; }

  /* ── States ── */
  .fci-state {
    display: flex; align-items: center; justify-content: center;
    height: 70vh; flex-direction: column; gap: 14px;
  }
  .fci-spinner {
    width: 24px; height: 24px;
    border: 2px solid #1e1e24; border-top-color: #00b050;
    border-radius: 50%;
    animation: fci-spin 0.75s linear infinite;
  }
  .fci-state-text { font-family: monospace; font-size: 11px; color: #444; letter-spacing: 0.1em; }
  .fci-state-error { color: #e5284a; }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIAS = ["Renta Variable", "Renta Fija", "Money Market", "Mixto", "Otro"];

const CAT_CONFIG = {
  "Renta Variable": {
    abbr: "RV",
    color: { bar: "#e5284a", text: "#e5284a", bg: "rgba(229,40,74,0.08)", border: "rgba(229,40,74,0.25)" },
  },
  "Renta Fija": {
    abbr: "RF",
    color: { bar: "#f0a500", text: "#f0a500", bg: "rgba(240,165,0,0.08)", border: "rgba(240,165,0,0.25)" },
  },
  "Money Market": {
    abbr: "MM",
    color: { bar: "#00b050", text: "#00b050", bg: "rgba(0,176,80,0.08)", border: "rgba(0,176,80,0.25)" },
  },
  "Mixto": {
    abbr: "MX",
    color: { bar: "#4e9fff", text: "#4e9fff", bg: "rgba(78,159,255,0.08)", border: "rgba(78,159,255,0.25)" },
  },
  "Otro": {
    abbr: "OT",
    color: { bar: "#555", text: "#555", bg: "rgba(85,85,85,0.08)", border: "rgba(85,85,85,0.2)" },
  },
};

// ─── Explanations ─────────────────────────────────────────────────────────────

function getExplanation(categoria, avgScore, rank, totalCats) {
  const cfg   = CAT_CONFIG[categoria] || CAT_CONFIG["Otro"];
  const pct   = Math.round(avgScore);
  const lines = [];

  switch (categoria) {
    case "Renta Variable":
      lines.push(`Score promedio RV: ${pct} — ${pct > 200 ? "rendimiento excepcional" : pct > 100 ? "rendimiento fuerte" : "rendimiento moderado"}.`);
      lines.push("Los fondos de Renta Variable invierten en acciones argentinas y latinoamericanas. Su TEA refleja el retorno anualizado reciente del mercado de renta variable.");
      lines.push("Alta volatilidad esperada: estos fondos oscilan con el mercado accionario. El score elevado indica momentum alcista sostenido en el período analizado.");
      lines.push("Liquidez típica T+2. Horizonte recomendado: largo plazo (+24 meses). Comisión admin promedio: 2.5%.");
      break;
    case "Renta Fija":
      lines.push(`Score promedio RF: ${pct} — posicionamiento ${pct > 90 ? "sólido" : "moderado"}.`);
      lines.push("Los fondos de Renta Fija invierten en bonos soberanos, sub-soberanos y obligaciones negociables en pesos. Ajustan por inflación (CER), tasa fija o mixto.");
      lines.push("Volatilidad media-baja. El score refleja la TEA proyectada desde la variación del VCP en los últimos 27 días hábiles.");
      lines.push("Liquidez típica T+1. Horizonte recomendado: mediano plazo (6–24 meses). Comisión admin promedio: 1.5%.");
      break;
    case "Money Market":
      lines.push(`Score promedio MM: ${pct} — tasa de corto plazo vigente.`);
      lines.push("Los fondos Money Market invierten en instrumentos de muy corto plazo: plazos fijos, cauciones bursátiles, letras del tesoro y cuentas remuneradas.");
      lines.push("Volatilidad prácticamente nula. El VCP crece de forma casi lineal. El score refleja la TEA efectiva del fondo en el período.");
      lines.push("Liquidez inmediata T+0. Horizonte: corto plazo (1–6 meses). Comisión admin promedio: 0.5%. Ideal como parking de liquidez.");
      break;
    case "Mixto":
      lines.push(`Score promedio Mixto: ${pct}.`);
      lines.push("Los fondos Mixtos combinan renta fija y variable en distintas proporciones según el mandato del fondo. Ofrecen diversificación sin gestión activa del inversor.");
      lines.push("Volatilidad intermedia. El score depende de la composición actual del portafolio de cada fondo.");
      lines.push("Liquidez típica T+1. Horizonte: mediano plazo. Comisión admin promedio: 1.5%.");
      break;
    default:
      lines.push(`Score promedio: ${pct}.`);
      lines.push("Categoría no clasificada en el modelo actual.");
      break;
  }

  lines.push(`Ranking actual: #${rank} de ${totalCats} categorías analizadas.`);
  return lines;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v, dec = 2) =>
  v !== null && v !== undefined ? Number(v).toFixed(dec) : "—";

// Los valores del ranking ya vienen en % (ej: 83.7, no 0.837)
const fmtPct = (v) =>
  v !== null && v !== undefined ? `${Number(v).toFixed(1)}%` : "—";

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({ categoria, funds, rank, totalCats, isOpen, onToggle, maxScore }) {
  const cfg     = CAT_CONFIG[categoria] || CAT_CONFIG["Otro"];
  const c       = cfg.color;
  const avgScore = funds.length
    ? funds.reduce((s, f) => s + f.score, 0) / funds.length
    : 0;
  const topScore = funds.length ? funds[0].score : 0;
  const barWidth = maxScore > 0 ? Math.min((topScore / maxScore) * 100, 100) : 0;
  const explanation = useMemo(
    () => getExplanation(categoria, avgScore, rank, totalCats),
    [categoria, avgScore, rank, totalCats]
  );

  return (
    <div>
      <div
        className="fci-cat-row"
        style={{ background: isOpen ? "#1a1a1f" : "transparent" }}
        onClick={onToggle}
      >
        {/* Rank */}
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#444", textAlign: "center" }}>
          {rank}
        </span>

        {/* Abbr pill */}
        <span
          className="fci-cat-pill"
          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
        >
          {cfg.abbr}
        </span>

        {/* Name */}
        <span className="fci-cat-name">{categoria}</span>

        {/* Bar + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="fci-bar-track">
            <div
              className="fci-bar-fill"
              style={{ width: `${barWidth}%`, background: c.bar }}
            />
          </div>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: "#444", minWidth: 48 }}>
            {funds.length} fondos
          </span>
        </div>

        {/* Top score */}
        <span className="fci-score-val" style={{ color: c.text }}>
          {fmt(topScore, 1)}
        </span>

        {/* Chevron */}
        <span className={`fci-chevron ${isOpen ? "open" : ""}`}>▼</span>
      </div>

      {/* Expand */}
      {isOpen && (
        <div className="fci-expand">
          <div className="fci-expand-why" style={{ color: c.text }}>
            ¿Por qué {categoria}?
          </div>
          {explanation.map((line, i) => {
            const isFirst = i === 0;
            const isLast  = i === explanation.length - 1;
            return (
              <p
                key={i}
                className={`fci-expand-line ${isFirst ? "first" : ""} ${isLast ? "last" : ""}`}
              >
                {!isFirst && !isLast && <span className="fci-expand-dot" style={{ color: c.text }}>·</span>}
                {line}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── BestCard ─────────────────────────────────────────────────────────────────

function BestCard({ categoria, fund }) {
  const cfg = CAT_CONFIG[categoria] || CAT_CONFIG["Otro"];
  const c   = cfg.color;

  if (!fund) {
    return (
      <div className="fci-best-card" style={{ "--accent": "#2a2a35" }}>
        <div className="fci-card-cat">{categoria}</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#333", marginTop: 6 }}>
          sin fondos válidos
        </div>
      </div>
    );
  }

  return (
    <div className="fci-best-card" style={{ "--accent": c.bar }}>
      <style>{`.fci-best-card::before { background: ${c.bar} !important; }`}</style>
      <div className="fci-card-cat">{cfg.abbr} · {categoria}</div>
      <div className="fci-card-name">{fund.fondo}</div>
      <div className="fci-card-score" style={{ color: c.text }}>score {fmt(fund.score, 1)}</div>
      <div className="fci-card-metrics">
        <div className="fci-card-metric">
          <span className="fci-card-metric-label">TEA</span>
          <span className="fci-card-metric-value">{fmtPct(fund.tea)}</span>
        </div>
        <div className="fci-card-metric">
          <span className="fci-card-metric-label">MOM</span>
          <span className="fci-card-metric-value">{fmtPct(fund.momentum)}</span>
        </div>
        <div className="fci-card-metric">
          <span className="fci-card-metric-label">VOL</span>
          <span className="fci-card-metric-value">{fmtPct(fund.volatilidad)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── CategoryTable ────────────────────────────────────────────────────────────

function CategoryTable({ categoria, funds }) {
  const top5 = [...funds].slice(0, 5);
  if (!top5.length) return null;
  const cfg = CAT_CONFIG[categoria] || CAT_CONFIG["Otro"];
  const c   = cfg.color;

  return (
    <div className="fci-regime-block">
      <div className="fci-regime-header">
        <span
          className="fci-cat-pill"
          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 9 }}
        >
          {cfg.abbr}
        </span>
        <span className="fci-regime-name">{categoria}</span>
        <span className="fci-regime-count">{funds.length} fondos</span>
      </div>
      <div className="fci-table-wrap">
        <table className="fci-table">
          <thead>
            <tr>
              <th style={{ width: 24, paddingLeft: 14 }}>#</th>
              <th>Fondo</th>
              <th className="ar">TEA</th>
              <th className="ar">Momentum</th>
              <th className="ar">Volatilidad</th>
              <th className="ar">Score</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((fund, i) => (
              <tr key={fund.fondo}>
                <td style={{ color: "#444", paddingLeft: 14, fontSize: 10 }}>{i + 1}</td>
                <td className="td-name">{fund.fondo}</td>
                <td className="ar">{fmtPct(fund.tea)}</td>
                <td className="ar">{fmtPct(fund.momentum)}</td>
                <td className="ar">{fmtPct(fund.volatilidad)}</td>
                <td className="td-score" style={{ color: c.text }}>{fmt(fund.score, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FCIRankingDashboard ──────────────────────────────────────────────────────

export default function FCIRankingDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [openCat, setOpenCat] = useState(null);

  useEffect(() => {
    fetch("https://arkad-tool.onrender.com/api/v1/fcis/ranking")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  // Agrupar por categoría y ordenar por score promedio desc
  const byCategory = useMemo(() => {
    if (!data?.ranking) return [];
    const map = {};
    for (const fund of data.ranking) {
      const cat = fund.categoria || "Otro";
      if (!map[cat]) map[cat] = [];
      map[cat].push(fund);
    }
    // cada categoria ya viene ordenada por score desc desde el backend
    return Object.entries(map)
      .map(([cat, funds]) => ({
        categoria: cat,
        funds,
        avgScore: funds.reduce((s, f) => s + f.score, 0) / funds.length,
        topScore: funds[0]?.score || 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [data]);

  const maxScore = useMemo(
    () => byCategory.reduce((m, c) => Math.max(m, c.topScore), 0),
    [byCategory]
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <style>{styles}</style>
      <div className="fci-root">

        {loading && (
          <div className="fci-state">
            <div className="fci-spinner" />
            <div className="fci-state-text">cargando ranking FCIs...</div>
          </div>
        )}

        {error && (
          <div className="fci-state">
            <div className="fci-state-text fci-state-error">error: {error}</div>
          </div>
        )}

        {data && byCategory.length > 0 && (
          <>
            {/* Page header */}
            <div className="fci-page-header">
              <span className="fci-page-title">Ranking · FCIs</span>
              <span className="fci-page-date">{today}</span>
            </div>

            {/* ── Ranking por categoría (panel clickeable) ── */}
            <div className="fci-section">
              <div className="fci-section-header">
                <span className="fci-section-title">Ranking por tipo de fondo</span>
                <div className="fci-section-line" />
              </div>

              {/* Panel header */}
              <div className="fci-panel-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="fci-panel-title">Score por categoría</span>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#444" }}>{today}</span>
                </div>
                <div>
                  <span className="fci-panel-avg">
                    {byCategory.length}
                  </span>
                  <span className="fci-panel-avg-label">categorías</span>
                </div>
              </div>

              {/* Column headers */}
              <div className="fci-table-head">
                {["#", "Tipo", "Categoría", "Score top fondo", "%", ""].map((h, i) => (
                  <span key={i} style={{ textAlign: i === 4 ? "right" : "left" }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div className="fci-rows-wrap">
                {byCategory.map((item, i) => (
                  <CategoryRow
                    key={item.categoria}
                    categoria={item.categoria}
                    funds={item.funds}
                    rank={i + 1}
                    totalCats={byCategory.length}
                    isOpen={openCat === item.categoria}
                    onToggle={() => setOpenCat(prev => prev === item.categoria ? null : item.categoria)}
                    maxScore={maxScore}
                  />
                ))}

                {/* Legend footer */}
                <div className="fci-legend">
                  <span className="fci-legend-label">tipo:</span>
                  {Object.entries(CAT_CONFIG).map(([cat, cfg]) => (
                    <span key={cat} className="fci-legend-item">
                      <span className="fci-legend-dot" style={{ background: cfg.color.bar }} />
                      {cfg.abbr}
                    </span>
                  ))}
                  <span className="fci-legend-hint">click fila → análisis</span>
                </div>
              </div>
            </div>

            {/* ── Mejor fondo por categoría ── */}
            <div className="fci-section">
              <div className="fci-section-header">
                <span className="fci-section-title">Mejor por categoría</span>
                <div className="fci-section-line" />
              </div>
              <div className="fci-best-grid">
                {byCategory.map((item) => (
                  <BestCard
                    key={item.categoria}
                    categoria={item.categoria}
                    fund={item.funds[0] || null}
                  />
                ))}
              </div>
            </div>

            {/* ── Top 5 por categoría ── */}
            <div className="fci-section">
              <div className="fci-section-header">
                <span className="fci-section-title">Top 5 por categoría</span>
                <div className="fci-section-line" />
              </div>
              {byCategory.map((item) => (
                <CategoryTable
                  key={item.categoria}
                  categoria={item.categoria}
                  funds={item.funds}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </>
  );
}