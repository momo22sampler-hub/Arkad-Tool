// components/MacroSignalPanel.tsx

import React, { useMemo, useState } from "react";
import type { MacroSignal, Regime } from "../types/ranking";

type SignalTier = "strong" | "neutral" | "weak";

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIME_LABELS: Record<Regime, { label: string; abbr: string }> = {
  CER:           { label: "CER / Inflación", abbr: "CER" },
  FIXED_RATE:    { label: "Tasa Fija",        abbr: "TF"  },
  HARD_DOLLAR:   { label: "Hard Dollar",      abbr: "HD"  },
  DOLLAR_LINKED: { label: "Dollar Linked",    abbr: "DL"  },
  MONEY_MARKET:  { label: "Money Market",     abbr: "MM"  },
  VARIABLE_RATE: { label: "Tasa Variable",    abbr: "TV"  },
};

const TIER_COLORS: Record<SignalTier, { bar: string; text: string; bg: string; border: string }> = {
  strong:  { bar: "#00b050", text: "#00b050", bg: "rgba(0,176,80,0.08)",    border: "rgba(0,176,80,0.25)"    },
  neutral: { bar: "#f0a500", text: "#f0a500", bg: "rgba(240,165,0,0.08)",  border: "rgba(240,165,0,0.25)"  },
  weak:    { bar: "#e5284a", text: "#e5284a", bg: "rgba(229,40,74,0.08)",  border: "rgba(229,40,74,0.25)"  },
};

function getTier(v: number): SignalTier {
  if (v > 0.60) return "strong";
  if (v >= 0.45) return "neutral";
  return "weak";
}

// ─── Explanations ─────────────────────────────────────────────────────────────

function getExplanation(regime: Regime, value: number, allSignals: MacroSignal): string[] {
  const tier = getTier(value);
  const p = Math.round(value * 100);
  const rank = (Object.entries(allSignals) as [Regime, number][])
    .sort(([, a], [, b]) => b - a)
    .findIndex(([r]) => r === regime) + 1;
  const strength = tier === "strong" ? "fuerte" : tier === "neutral" ? "moderada" : "débil";
  const lines: string[] = [];

  switch (regime) {
    case "CER":
      lines.push(`Señal CER: ${p}% — intensidad ${strength}.`);
      if (tier === "strong") {
        lines.push("La inflación de los últimos 3 meses está acelerando por encima del promedio semestral. Los bonos CER (BONCER, TX26, TX28, DICP, Lecer) ajustan capital por el índice CER, protegiendo contra esa aceleración.");
        lines.push("La tasa real de depósitos a 30 días es negativa frente a la inflación mensual: la tasa fija pierde poder adquisitivo en este entorno.");
        lines.push("CER es el régimen con mayor capacidad de preservar y hacer crecer el capital en términos reales.");
      } else if (tier === "neutral") {
        lines.push("La inflación muestra cierta aceleración pero sin tendencia clara. La tasa real está cerca del equilibrio.");
        lines.push("CER sigue siendo cobertura válida, aunque no con la urgencia de una aceleración sostenida.");
      } else {
        lines.push("La inflación no acelera o la tasa real es positiva. La ventaja de CER frente a otras opciones es baja.");
        lines.push("Hay regímenes con mejor relación riesgo/retorno disponibles según las señales actuales.");
      }
      break;
    case "FIXED_RATE":
      lines.push(`Señal Tasa Fija: ${p}% — intensidad ${strength}.`);
      if (tier === "strong") {
        lines.push("La tasa real de depósitos a 30 días es positiva: el rendimiento nominal supera la inflación mensual promedio. Instrumentos: Lecap, Boncap, ONs corporativas en pesos a tasa fija.");
        lines.push("La inflación no está acelerando, reduciendo el riesgo de pérdida real. Entorno ideal para asegurar rendimiento en pesos sin exposición cambiaria.");
      } else if (tier === "neutral") {
        lines.push("Tasa real cerca de cero. Los instrumentos de tasa fija preservan el valor aproximadamente pero sin ganancia real significativa.");
      } else {
        lines.push("Tasa real negativa o inflación acelerando. Los instrumentos de tasa fija perderían valor real. Se recomienda priorizar cobertura inflacionaria o cambiaria.");
      }
      break;
    case "HARD_DOLLAR":
      lines.push(`Señal Hard Dollar: ${p}% — intensidad ${strength}.`);
      if (tier === "strong") {
        lines.push("Riesgo país con tendencia bajista en 30 días: spreads comprimiéndose. Instrumentos: GD29, GD30, GD35, AL29, AL30, ONs YPF/Pampa/Telecom en USD.");
        lines.push("MEP sin presión alcista fuerte, sugiriendo estabilidad cambiaria relativa. Buen momento para posicionarse en renta fija dolarizada.");
      } else if (tier === "neutral") {
        lines.push("Riesgo país y MEP sin tendencias definidas. Hard dollar como cobertura razonable sin señal clara de dirección.");
      } else {
        lines.push("Riesgo país subiendo o MEP con presión alcista. Spreads podrían ampliarse, generando pérdidas de capital en posiciones hard dollar de corto plazo.");
      }
      break;
    case "DOLLAR_LINKED":
      lines.push(`Señal Dollar Linked: ${p}% — intensidad ${strength}.`);
      if (tier === "strong") {
        lines.push("MEP con momentum alcista sostenido en 30 días. Instrumentos: T2V25, TV26, TVD26, ONs dollar linked corporativas.");
        lines.push("Los instrumentos dollar linked ajustan por tipo de cambio oficial (A3500), capturando devaluación directamente. Régimen a priorizar ante expectativa de ajuste cambiario.");
      } else if (tier === "neutral") {
        lines.push("MEP con movimiento moderado. Dollar linked ofrece cobertura parcial ante posible devaluación, sin urgencia.");
      } else {
        lines.push("MEP estable o cayendo. Dollar linked no captura ganancia cambiaria en este contexto y puede quedar rezagado.");
      }
      break;
    case "MONEY_MARKET":
      lines.push(`Señal Money Market: ${p}% — intensidad ${strength}.`);
      if (tier === "strong") {
        lines.push("Tasa real de corto plazo positiva. Instrumentos: FCI Money Market, cauciones bursátiles, plazos fijos, Letras del Tesoro de muy corto plazo.");
        lines.push("Liquidez inmediata con rendimiento real positivo y riesgo prácticamente nulo. Ideal como base de cartera en este entorno.");
      } else if (tier === "neutral") {
        lines.push("Tasa real cercana a cero. Money market funciona como parking de liquidez sin ganancia real relevante.");
      } else {
        lines.push("Tasa real negativa: mantener en money market implica pérdida de poder adquisitivo. Solo como refugio transitorio ante incertidumbre extrema.");
      }
      break;
    case "VARIABLE_RATE":
      lines.push(`Señal Tasa Variable: ${p}% — posición neutral.`);
      lines.push("Este régimen se mantiene fijo en 50% en el modelo actual. Instrumentos: bonos BADLAR (PR13), fideicomisos con cupón variable, ONs corporativas BADLAR + spread.");
      lines.push("Complementario en entornos de tasas cambiantes, pero requiere análisis adicional fuera del modelo macro.");
      break;
  }

  lines.push(`Ranking actual: #${rank} de 6 regímenes.`);
  return lines;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  @keyframes yf-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
  @keyframes yf-fill  { from{width:0%} }
  @keyframes yf-drop  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

  .yf-fill { animation: yf-fill 0.7s cubic-bezier(0.4,0,0.2,1) both; }
  .yf-row:hover { background: #1a1a1f !important; cursor: pointer; }
  .yf-expand { animation: yf-drop 0.18s ease both; }
`;

// ─── RegimeRow ────────────────────────────────────────────────────────────────

interface RegimeRowProps {
  regime: Regime; value: number; isTop: boolean; rank: number;
  isOpen: boolean; onToggle: () => void; allSignals: MacroSignal;
}

const RegimeRow: React.FC<RegimeRowProps> = ({ regime, value, isTop, rank, isOpen, onToggle, allSignals }) => {
  const tier = getTier(value);
  const c = TIER_COLORS[tier];
  const p = Math.round(value * 100);
  const { label, abbr } = REGIME_LABELS[regime];
  const explanation = useMemo(() => getExplanation(regime, value, allSignals), [regime, value, allSignals]);

  return (
    <div>
      {/* Row */}
      <div
        className="yf-row"
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: "28px 44px 1fr 140px 52px 16px",
          alignItems: "center",
          gap: 12,
          padding: "9px 14px",
          background: isOpen ? "#1a1a1f" : "transparent",
          borderBottom: "1px solid #1e1e24",
          userSelect: "none",
          transition: "background 0.15s",
        }}
      >
        {/* Rank */}
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#444", textAlign: "center" }}>
          {rank}
        </span>

        {/* Abbr pill */}
        <span style={{
          fontFamily: "monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "2px 6px", borderRadius: 3,
          background: c.bg, border: `1px solid ${c.border}`, color: c.text,
          textAlign: "center",
        }}>
          {abbr}
        </span>

        {/* Label + overweight */}
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: isTop ? 600 : 400, color: isTop ? "#e8e8e8" : "#a0a0a8" }}>
            {label}
          </span>
          {isTop && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#00b050",
              background: "rgba(0,176,80,0.1)", border: "1px solid rgba(0,176,80,0.25)",
              padding: "1px 6px", borderRadius: 2,
            }}>
              ↑ overweight
            </span>
          )}
        </span>

        {/* Bar */}
        <div style={{ height: 4, background: "#1e1e24", borderRadius: 2, overflow: "hidden" }}>
          <div
            className="yf-fill"
            style={{ height: "100%", width: `${p}%`, background: c.bar, borderRadius: 2 }}
          />
        </div>

        {/* Pct */}
        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: c.text, textAlign: "right" }}>
          {p}%
        </span>

        {/* Chevron */}
        <span style={{
          fontSize: 9, color: "#444", textAlign: "center",
          transition: "transform 0.2s", display: "inline-block",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        }}>▾</span>
      </div>

      {/* Expansion */}
      {isOpen && (
        <div className="yf-expand" style={{
          padding: "14px 18px 16px 60px",
          background: "#111116",
          borderBottom: "1px solid #1e1e24",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: c.text, marginBottom: 4 }}>
            ¿Por qué {label}?
          </div>
          {explanation.map((line, i) => {
            const isFirst = i === 0;
            const isLast = i === explanation.length - 1;
            return (
              <p key={i} style={{
                fontSize: isLast ? 10 : 12,
                lineHeight: 1.65,
                color: isFirst ? "#c8c8d0" : isLast ? "#444" : "#787880",
                fontFamily: isLast ? "monospace" : "inherit",
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                {!isFirst && !isLast && <span style={{ color: c.text, opacity: 0.5, flexShrink: 0 }}>·</span>}
                {line}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Banner ───────────────────────────────────────────────────────────────────

const MarketModeBanner: React.FC<{ parkingMode: boolean }> = ({ parkingMode }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 14px",
    background: parkingMode ? "rgba(240,165,0,0.06)" : "rgba(0,176,80,0.06)",
    border: `1px solid ${parkingMode ? "rgba(240,165,0,0.2)" : "rgba(0,176,80,0.15)"}`,
    borderRadius: 4,
    fontSize: 12, fontWeight: 500,
    color: parkingMode ? "#f0a500" : "#00b050",
  }}>
    <span style={{
      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
      background: parkingMode ? "#f0a500" : "#00b050",
      animation: "yf-pulse 2s ease-in-out infinite", display: "inline-block",
    }} />
    <span>{parkingMode ? "⚠ Modo defensivo activado — señales débiles en todos los regímenes" : "Mercado en régimen activo"}</span>
    <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.45 }}>
      {parkingMode ? "DEFENSIVE" : "ACTIVE"}
    </span>
  </div>
);

// ─── MacroSignalPanel ─────────────────────────────────────────────────────────

interface MacroSignalPanelProps {
  macroSignal: MacroSignal;
  parkingMode: boolean;
  date?: string;
}

export const MacroSignalPanel: React.FC<MacroSignalPanelProps> = ({ macroSignal, parkingMode, date }) => {
  const [openRegime, setOpenRegime] = useState<Regime | null>(null);

  const sorted = useMemo<[Regime, number][]>(
    () => (Object.entries(macroSignal) as [Regime, number][]).sort(([, a], [, b]) => b - a),
    [macroSignal]
  );

  const topRegime = sorted[0]?.[0];
  const avgSignal = useMemo(
    () => Math.round(((Object.values(macroSignal) as number[]).reduce((a, b) => a + b, 0) / 6) * 100),
    [macroSignal]
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{ fontFamily: "'Inter', sans-serif", marginBottom: 28 }}>

        {/* Panel header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px",
          background: "#13131a",
          border: "1px solid #1e1e24",
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e8e8e8", letterSpacing: "-0.01em" }}>
              Señal Macroeconómica
            </span>
            {date && (
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#444", letterSpacing: "0.06em" }}>
                {date}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "#e8e8e8" }}>
              {avgSignal}%
            </span>
            <span style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              promedio
            </span>
          </div>
        </div>

        {/* Banner */}
        <div style={{ padding: "8px 14px", background: "#0f0f14", border: "1px solid #1e1e24", borderTop: "none", borderBottom: "none" }}>
          <MarketModeBanner parkingMode={parkingMode} />
        </div>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "28px 44px 1fr 140px 52px 16px",
          gap: 12,
          padding: "7px 14px",
          background: "#0f0f14",
          border: "1px solid #1e1e24",
          borderTop: "1px solid #1e1e24",
          borderBottom: "none",
        }}>
          {["#", "Tipo", "Régimen", "Señal", "%", ""].map((h, i) => (
            <span key={i} style={{
              fontFamily: "monospace", fontSize: 9, fontWeight: 400,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#444", textAlign: i === 4 ? "right" : "left",
            }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ border: "1px solid #1e1e24", borderRadius: "0 0 4px 4px", overflow: "hidden", background: "#0d0d12" }}>
          {sorted.map(([regime, value], i) => (
            <RegimeRow
              key={regime}
              regime={regime}
              value={value}
              isTop={regime === topRegime}
              rank={i + 1}
              isOpen={openRegime === regime}
              onToggle={() => setOpenRegime(prev => prev === regime ? null : regime)}
              allSignals={macroSignal}
            />
          ))}

          {/* Legend footer */}
          <div style={{
            display: "flex", alignItems: "center", gap: 18,
            padding: "8px 14px",
            borderTop: "1px solid #1e1e24",
            background: "#0f0f14",
          }}>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#333", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 4 }}>
              señal:
            </span>
            {(["strong", "neutral", "weak"] as SignalTier[]).map(t => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "monospace", fontSize: 9, color: "#444" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIER_COLORS[t].bar, display: "inline-block" }} />
                {t === "strong" ? ">60%" : t === "neutral" ? "45–60%" : "<45%"}
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 9, color: "#333", letterSpacing: "0.08em" }}>
              click fila → análisis
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default MacroSignalPanel;