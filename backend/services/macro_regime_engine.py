"""
MacroRegimeEngine
Detecta el régimen macroeconómico actual y emite señales continuas (0–1)
por clase de activo para uso en el RankingService.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from math import tanh
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _safe_mean(values: List[float]) -> Optional[float]:
    return sum(values) / len(values) if values else None


# ---------------------------------------------------------------------------
# MacroRegimeEngine
# ---------------------------------------------------------------------------

class MacroRegimeEngine:
    """
    Lee datos de Supabase (tablas `macros` y `tc_historico`) de los últimos
    6 meses y devuelve señales continuas en [0, 1] por régimen de inversión.

    Uso:
        engine = MacroRegimeEngine(supabase_client)
        signal = engine.get_macro_signal()
    """

    REGIMES = ["CER", "FIXED_RATE", "HARD_DOLLAR", "DOLLAR_LINKED",
               "MONEY_MARKET", "VARIABLE_RATE"]
    NEUTRAL = 0.5

    def __init__(self, supabase_client):
        self._sb = supabase_client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_macro_signal(self) -> Dict[str, float]:
        """
        Retorna un dict con señal [0,1] para cada régimen.
        Nunca lanza excepción: ante cualquier fallo devuelve señales neutras.
        """
        try:
            return self._compute()
        except Exception as exc:
            logger.error("MacroRegimeEngine error inesperado: %s", exc, exc_info=True)
            return {r: self.NEUTRAL for r in self.REGIMES}

    # ------------------------------------------------------------------
    # Orquestación interna
    # ------------------------------------------------------------------

    def _compute(self) -> Dict[str, float]:
        cutoff = (datetime.utcnow() - timedelta(days=180)).date().isoformat()

        inflacion_score, tasa_real_score, inflacion_prom_3m = self._signal_inflacion(cutoff)
        real_rate_score = self._signal_tasa_real(cutoff, inflacion_prom_3m)
        mep_score = self._signal_mep(cutoff)
        riesgo_score = self._signal_riesgo_pais(cutoff)

        # Invertidos
        inf_inv  = _clamp(1.0 - inflacion_score)
        mep_inv  = _clamp(1.0 - mep_score)
        riesgo_inv = _clamp(1.0 - riesgo_score)  # noqa (alias semántico)

        signals = {
            "CER":           _clamp(_safe_mean([inflacion_score, _clamp(1.0 - real_rate_score)]) or self.NEUTRAL),
            "FIXED_RATE":    _clamp(_safe_mean([real_rate_score, inf_inv]) or self.NEUTRAL),
            "HARD_DOLLAR":   _clamp(_safe_mean([riesgo_inv, mep_inv]) or self.NEUTRAL),
            "DOLLAR_LINKED": _clamp(mep_score),
            "MONEY_MARKET":  _clamp(real_rate_score * 0.8),
            "VARIABLE_RATE": self.NEUTRAL,
        }

        logger.debug("MacroRegimeEngine signals: %s", signals)
        return signals

    # ------------------------------------------------------------------
    # Señal 1 – Inflación trend
    # ------------------------------------------------------------------

    def _signal_inflacion(
        self, cutoff: str
    ) -> Tuple[float, float, float]:
        """
        Retorna (inflacion_score, tasa_real_score_placeholder, inflacion_prom_3m).
        inflacion_prom_3m se reutiliza en _signal_tasa_real.
        """
        try:
            rows = (
                self._sb.table("macros")
                .select("fecha, valor")
                .eq("indicador", "inflacion")
                .gte("fecha", cutoff)
                .order("fecha", desc=True)
                .execute()
                .data
            )
        except Exception as exc:
            logger.warning("Error leyendo inflacion: %s", exc)
            return self.NEUTRAL, self.NEUTRAL, 0.0

        if not rows:
            return self.NEUTRAL, self.NEUTRAL, 0.0

        values: List[Tuple[str, float]] = []
        for r in rows:
            try:
                values.append((r["fecha"], float(r["valor"])))
            except (TypeError, ValueError, KeyError):
                continue

        if not values:
            return self.NEUTRAL, self.NEUTRAL, 0.0

        # Ordenados desc → más reciente primero
        vals_only = [v for _, v in values]

        prom_3m = _safe_mean(vals_only[:3]) or 0.0
        prom_6m = _safe_mean(vals_only) or 0.0

        aceleracion = prom_3m - prom_6m
        score = _clamp(0.5 + 0.4 * tanh(aceleracion * 3))

        return score, self.NEUTRAL, prom_3m

    # ------------------------------------------------------------------
    # Señal 2 – Tasa real
    # ------------------------------------------------------------------

    def _signal_tasa_real(self, cutoff: str, inflacion_prom_3m: float) -> float:
        try:
            rows = (
                self._sb.table("macros")
                .select("fecha, valor")
                .eq("indicador", "depositos_30d")
                .gte("fecha", cutoff)
                .order("fecha", desc=True)
                .limit(1)
                .execute()
                .data
            )
        except Exception as exc:
            logger.warning("Error leyendo depositos_30d: %s", exc)
            return self.NEUTRAL

        if not rows:
            return self.NEUTRAL

        try:
            tna = float(rows[0]["valor"])
        except (TypeError, ValueError, KeyError):
            return self.NEUTRAL

        tasa_mensual = tna / 12.0
        real_rate = tasa_mensual - inflacion_prom_3m
        return _clamp(0.5 + 0.4 * tanh(real_rate / 2.0))

    # ------------------------------------------------------------------
    # Señal 3 – MEP momentum
    # ------------------------------------------------------------------

    def _signal_mep(self, cutoff: str) -> float:
        try:
            rows = (
                self._sb.table("tc_historico")
                .select("fecha, compra, venta")
                .eq("casa", "bolsa")
                .gte("fecha", cutoff)
                .order("fecha", desc=True)
                .execute()
                .data
            )
        except Exception as exc:
            logger.warning("Error leyendo MEP: %s", exc)
            return self.NEUTRAL

        if not rows:
            return self.NEUTRAL

        prices: List[Tuple[str, float]] = []
        for r in rows:
            try:
                mid = (float(r["compra"]) + float(r["venta"])) / 2.0
                prices.append((r["fecha"], mid))
            except (TypeError, ValueError, KeyError):
                continue

        if not prices:
            return self.NEUTRAL

        precio_actual = prices[0][1]

        # Buscar precio ~30 días atrás (índice 30 si hay datos diarios)
        precio_30d = self._find_price_approx_days_ago(prices, 30)
        if precio_30d is None or precio_30d == 0:
            return self.NEUTRAL

        variacion_30d = (precio_actual / precio_30d) - 1.0
        return _clamp(0.5 + 0.4 * tanh(variacion_30d * 5.0))

    # ------------------------------------------------------------------
    # Señal 4 – Riesgo país
    # ------------------------------------------------------------------

    def _signal_riesgo_pais(self, cutoff: str) -> float:
        try:
            rows = (
                self._sb.table("macros")
                .select("fecha, valor")
                .eq("indicador", "riesgo_pais")
                .gte("fecha", cutoff)
                .order("fecha", desc=True)
                .execute()
                .data
            )
        except Exception as exc:
            logger.warning("Error leyendo riesgo_pais: %s", exc)
            return self.NEUTRAL

        if not rows:
            return self.NEUTRAL

        prices: List[Tuple[str, float]] = []
        for r in rows:
            try:
                prices.append((r["fecha"], float(r["valor"])))
            except (TypeError, ValueError, KeyError):
                continue

        if not prices:
            return self.NEUTRAL

        actual = prices[0][1]
        hace_30d = self._find_price_approx_days_ago(prices, 30)
        if hace_30d is None or hace_30d == 0:
            return self.NEUTRAL

        variacion = (actual / hace_30d) - 1.0
        # Si riesgo sube → malo para HARD_DOLLAR → score alto (penaliza via inversión)
        return _clamp(0.5 + 0.4 * tanh(variacion * 5.0))

    # ------------------------------------------------------------------
    # Utilidad compartida
    # ------------------------------------------------------------------

    @staticmethod
    def _find_price_approx_days_ago(
        prices: List[Tuple[str, float]], days: int
    ) -> Optional[float]:
        """
        Dado un listado ordenado desc de (fecha_str, precio),
        busca el precio más cercano a `days` días atrás desde el primero.
        """
        if not prices:
            return None

        try:
            ref_date = datetime.fromisoformat(prices[0][0]).date()
        except (ValueError, TypeError):
            return None

        target = ref_date - timedelta(days=days)
        best_price: Optional[float] = None
        best_delta = timedelta(days=9999)

        for fecha_str, precio in prices:
            try:
                d = datetime.fromisoformat(fecha_str).date()
            except (ValueError, TypeError):
                continue
            delta = abs(d - target)
            if delta < best_delta:
                best_delta = delta
                best_price = precio

        return best_price