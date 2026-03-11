import MacroSignalPanel from "./MacroSignalPanel";
import React, { useState, useEffect } from "react";

// ─── CSS ──────────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .rd-root {
    font-family: 'Inter', sans-serif;
    background: #0d0d12;
    color: #e8e8e8;
    min-height: 100vh;
    padding: 24px 28px 60px;
    font-size: 13px;
  }

  /* ── Page header ── */
  .rd-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    margin-bottom: 20px;
    border-bottom: 1px solid #1e1e24;
  }

  .rd-page-title {
    font-size: 18px;
    font-weight: 700;
    color: #f0f0f0;
    letter-spacing: -0.02em;
  }

  .rd-page-date {
    font-family: monospace;
    font-size: 11px;
    color: #444;
    letter-spacing: 0.06em;
  }

  /* ── Section ── */
  .rd-section { margin-bottom: 32px; }

  .rd-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .rd-section-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #888;
  }

  .rd-section-line {
    flex: 1;
    height: 1px;
    background: #1e1e24;
  }

  /* ── Best per regime grid ── */
  .rd-best-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
    gap: 1px;
    background: #1e1e24;
    border: 1px solid #1e1e24;
    border-radius: 4px;
    overflow: hidden;
  }

  .rd-best-card {
    background: #0f0f14;
    padding: 14px 16px;
    position: relative;
    overflow: hidden;
    transition: background 0.15s;
    cursor: default;
  }

  .rd-best-card:hover { background: #141419; }

  .rd-best-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 2px; height: 100%;
    background: #00b050;
  }

  .rd-best-card.null-card::before { background: #2a2a35; }

  .rd-card-regime {
    font-family: monospace;
    font-size: 9px;
    letter-spacing: 0.14em;
    color: #444;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .rd-card-ticker {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: #f0f0f0;
    margin-bottom: 2px;
  }

  .rd-card-score {
    font-family: monospace;
    font-size: 10px;
    color: #00b050;
    margin-bottom: 12px;
  }

  .rd-card-metrics { display: flex; flex-direction: column; gap: 3px; }

  .rd-card-metric {
    display: flex;
    justify-content: space-between;
    font-family: monospace;
    font-size: 10px;
  }

  .rd-card-metric-label { color: #444; }
  .rd-card-metric-value { color: #888; }

  .rd-card-null {
    font-family: monospace;
    font-size: 11px;
    color: #333;
    margin-top: 6px;
  }

  /* ── Regime block ── */
  .rd-regime-block { margin-bottom: 24px; }

  .rd-regime-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: "6px 0";
    margin-bottom: 0;
    background: #13131a;
    border: 1px solid #1e1e24;
    border-bottom: none;
    border-radius: "4px 4px 0 0";
    padding: 8px 14px;
    border-radius: 4px 4px 0 0;
  }

  .rd-regime-name {
    font-size: 12px;
    font-weight: 600;
    color: #c8c8d0;
    letter-spacing: 0.02em;
  }

  .rd-regime-count {
    font-family: monospace;
    font-size: 9px;
    color: #444;
    background: #1a1a20;
    border: 1px solid #2a2a32;
    padding: 1px 6px;
    border-radius: 2px;
  }

  /* ── Table ── */
  .rd-table-wrap {
    border: 1px solid #1e1e24;
    border-radius: 0 0 4px 4px;
    overflow: hidden;
  }

  .rd-table {
    width: 100%;
    border-collapse: collapse;
  }

  .rd-table thead tr {
    background: #0f0f14;
    border-bottom: 1px solid #1e1e24;
  }

  .rd-table th {
    font-family: monospace;
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #444;
    padding: 7px 12px 7px 14px;
    text-align: left;
    white-space: nowrap;
  }

  .rd-table th.align-right { text-align: right; padding-right: 14px; }

  .rd-table tbody tr {
    border-bottom: 1px solid #111116;
    transition: background 0.12s;
  }

  .rd-table tbody tr:last-child { border-bottom: none; }
  .rd-table tbody tr:hover { background: #141419; }
  .rd-table tbody tr.invalid { opacity: 0.3; }

  .rd-table td {
    font-size: 12px;
    padding: 9px 12px 9px 14px;
    color: #888;
    font-family: monospace;
    white-space: nowrap;
  }

  .rd-table td.td-ticker {
    color: #e8e8e8;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: -0.01em;
  }

  .rd-table td.td-score {
    color: #00b050;
    text-align: right;
    padding-right: 14px;
    font-weight: 600;
  }

  .rd-table td.align-right {
    text-align: right;
    padding-right: 14px;
  }

  .rd-invalid-tag {
    display: inline-block;
    font-size: 8px;
    letter-spacing: 0.08em;
    color: #444;
    border: 1px solid #222;
    padding: 1px 5px;
    border-radius: 2px;
    margin-left: 7px;
    vertical-align: middle;
    text-transform: uppercase;
  }

  /* ── States ── */
  .rd-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 70vh;
    flex-direction: column;
    gap: 14px;
  }

  .rd-spinner {
    width: 24px; height: 24px;
    border: 2px solid #1e1e24;
    border-top-color: #00b050;
    border-radius: 50%;
    animation: rd-spin 0.75s linear infinite;
  }

  @keyframes rd-spin { to { transform: rotate(360deg); } }

  .rd-state-text {
    font-family: monospace;
    font-size: 11px;
    color: #444;
    letter-spacing: 0.1em;
  }

  .rd-state-error { color: #e5284a; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v, decimals = 2) =>
  v !== null && v !== undefined ? Number(v).toFixed(decimals) : "—";

const REGIME_LABELS = {
  HARD_DOLLAR:   "Hard Dollar",
  CER:           "CER / Inflación",
  DOLLAR_LINKED: "Dollar Linked",
  VARIABLE_RATE: "Tasa Variable",
  FIXED_RATE:    "Tasa Fija",
  MONEY_MARKET:  "Money Market",
};

// ─── BestCard ─────────────────────────────────────────────────────────────────

function BestCard({ regime, instrument }) {
  const label = REGIME_LABELS[regime] || regime;
  if (!instrument) {
    return (
      <div className="rd-best-card null-card">
        <div className="rd-card-regime">{label}</div>
        <div className="rd-card-null">sin instrumentos válidos</div>
      </div>
    );
  }
  return (
    <div className="rd-best-card">
      <div className="rd-card-regime">{label}</div>
      <div className="rd-card-ticker">{instrument.ticker}</div>
      <div className="rd-card-score">score {fmt(instrument.score)}</div>
      <div className="rd-card-metrics">
        <div className="rd-card-metric">
          <span className="rd-card-metric-label">TIR</span>
          <span className="rd-card-metric-value">{fmt(instrument.metrics?.tir)}%</span>
        </div>
        <div className="rd-card-metric">
          <span className="rd-card-metric-label">DUR</span>
          <span className="rd-card-metric-value">{fmt(instrument.metrics?.duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── RegimeTable ──────────────────────────────────────────────────────────────

function RegimeTable({ regime, instruments }) {
  const sorted = [...instruments].sort((a, b) => b.score - a.score);
  if (!sorted.length) return null;
  const label = REGIME_LABELS[regime] || regime;

  return (
    <div className="rd-regime-block">
      <div className="rd-regime-header">
        <span className="rd-regime-name">{label}</span>
        <span className="rd-regime-count">{sorted.length} instrumentos</span>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th style={{ width: 24, paddingLeft: 14 }}>#</th>
              <th>Ticker</th>
              <th className="align-right">TIR %</th>
              <th className="align-right">Duration</th>
              <th className="align-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inst, i) => (
              <tr key={inst.ticker} className={!inst.valid_for_scoring ? "invalid" : ""}>
                <td style={{ color: "#444", paddingLeft: 14, fontSize: 10 }}>{i + 1}</td>
                <td className="td-ticker">
                  {inst.ticker}
                  {!inst.valid_for_scoring && (
                    <span className="rd-invalid-tag">inválido</span>
                  )}
                </td>
                <td className="align-right">{fmt(inst.metrics?.tir)}%</td>
                <td className="align-right">{fmt(inst.metrics?.duration)}</td>
                <td className="td-score">{fmt(inst.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── RankingDashboard ─────────────────────────────────────────────────────────

export default function RankingDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch("https://arkad-tool.onrender.com/api/v1/ranking")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="rd-root">

        {loading && (
          <div className="rd-state">
            <div className="rd-spinner" />
            <div className="rd-state-text">cargando ranking...</div>
          </div>
        )}

        {error && (
          <div className="rd-state">
            <div className="rd-state-text rd-state-error">error: {error}</div>
          </div>
        )}

        {data && (
          <>
            {/* Page header */}
            <div className="rd-page-header">
              <span className="rd-page-title">Ranking · Renta Fija</span>
              <span className="rd-page-date">{data.date}</span>
            </div>

            {/* Macro signal panel */}
            <MacroSignalPanel
              macroSignal={data.macro_signal}
              parkingMode={data.parking_mode}
              date={data.date}
            />

            {/* Best per regime */}
            <div className="rd-section">
              <div className="rd-section-header">
                <span className="rd-section-title">Mejor por régimen</span>
                <div className="rd-section-line" />
              </div>
              <div className="rd-best-grid">
                {Object.entries(data.best_per_regime).map(([regime, inst]) => (
                  <BestCard key={regime} regime={regime} instrument={inst} />
                ))}
              </div>
            </div>

            {/* Top 5 por régimen */}
            <div className="rd-section">
              <div className="rd-section-header">
                <span className="rd-section-title">Top 5 por régimen</span>
                <div className="rd-section-line" />
              </div>
              {Object.entries(data.ranking_by_regime).map(([regime, instruments]) =>
                instruments.length > 0 ? (
                  <RegimeTable key={regime} regime={regime} instruments={instruments} />
                ) : null
              )}
            </div>
          </>
        )}

      </div>
    </>
  );
}