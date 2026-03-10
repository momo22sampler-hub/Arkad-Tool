// pages/RankingPage.tsx  –  ejemplo de integración

import React from "react";
import { MacroSignalPanel } from "../components/MacroSignalPanel";
import { useRanking } from "../hooks/useRanking";

export default function RankingPage() {
  const { data, loading, error, refetch } = useRanking();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0c10]">
        <span className="text-white/40 text-sm font-mono animate-pulse">
          Cargando señal macro…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#0a0c10]">
        <p className="text-rose-400 text-sm">Error: {error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-white/[0.06] text-white/60 hover:bg-white/10 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white px-4 py-10 max-w-2xl mx-auto space-y-8">

      {/* ── Bloque macro (nuevo) ── */}
      <MacroSignalPanel
        macroSignal={data.macro_signal}
        parkingMode={data.parking_mode}
        date={data.date}
      />

      {/* ── Ranking existente (sin modificar) ── */}
      <section>
        <h2 className="text-base font-bold text-white/80 mb-4">
          Ranking por Régimen
        </h2>
        {/* Tu componente de ranking existente va aquí — sin cambios */}
        {/* <RankingTable data={data.ranking_by_regime} /> */}
        <pre className="text-xs text-white/30 bg-white/[0.03] p-4 rounded-xl overflow-auto">
          {JSON.stringify(data.ranking_by_regime, null, 2)}
        </pre>
      </section>
    </div>
  );
}