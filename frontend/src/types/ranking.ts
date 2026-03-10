// types/ranking.ts

export type Regime =
  | "CER"
  | "FIXED_RATE"
  | "HARD_DOLLAR"
  | "DOLLAR_LINKED"
  | "MONEY_MARKET"
  | "VARIABLE_RATE";

export interface MacroSignal extends Record<Regime, number> {}

export interface Instrument {
  ticker: string;
  score: number;
  regimen: Regime;
  valid_for_scoring: boolean;
  invalid_reasons: string[];
  metrics: {
    tir: number | null;
    duration: number | null;
    parity?: number | null;
    monto_operado?: number | null;
    price?: number | null;
    emisor?: string | null;
    moneda?: string | null;
    legislacion?: string | null;
  };
}

export interface RankingResponse {
  date: string;
  best_per_regime: Record<Regime, Instrument | null>;
  ranking_by_regime: Record<Regime, Instrument[]>;
  macro_signal: MacroSignal;
  parking_mode: boolean;
}