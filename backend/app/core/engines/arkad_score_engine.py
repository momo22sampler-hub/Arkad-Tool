"""
app/engines/arkad_score_engine.py

Motor de scoring independiente para clasificación y ranking de instrumentos financieros.
Sin dependencias de base de datos ni framework web.
"""

from __future__ import annotations

import math
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes de régimen
# ---------------------------------------------------------------------------

REGIMEN_HARD_DOLLAR   = "HARD_DOLLAR"
REGIMEN_CER           = "CER"
REGIMEN_DOLLAR_LINKED = "DOLLAR_LINKED"
REGIMEN_VARIABLE_RATE = "VARIABLE_RATE"
REGIMEN_FIXED_RATE    = "FIXED_RATE"
REGIMEN_MONEY_MARKET  = "MONEY_MARKET"

ALL_REGIMENES = [
    REGIMEN_HARD_DOLLAR,
    REGIMEN_CER,
    REGIMEN_DOLLAR_LINKED,
    REGIMEN_VARIABLE_RATE,
    REGIMEN_FIXED_RATE,
    REGIMEN_MONEY_MARKET,
]

# Pesos por régimen: (tir, parity, liquidez, duration)
REGIMEN_WEIGHTS: dict[str, dict[str, float]] = {
    REGIMEN_HARD_DOLLAR:   {"tir": 0.45, "parity": 0.15, "liquidez": 0.25, "duration": 0.15},
    REGIMEN_CER:           {"tir": 0.35, "parity": 0.30, "liquidez": 0.20, "duration": 0.15},
    REGIMEN_DOLLAR_LINKED: {"tir": 0.35, "parity": 0.30, "liquidez": 0.20, "duration": 0.15},
    REGIMEN_VARIABLE_RATE: {"tir": 0.40, "parity": 0.20, "liquidez": 0.25, "duration": 0.15},
    REGIMEN_FIXED_RATE:    {"tir": 0.40, "parity": 0.25, "liquidez": 0.20, "duration": 0.15},
    REGIMEN_MONEY_MARKET:  {"tir": 0.60, "parity": 0.00, "liquidez": 0.30, "duration": 0.10},
}

# ---------------------------------------------------------------------------
# Señales de clasificación por ticker / emisor / tipo
# ---------------------------------------------------------------------------

_CER_KEYWORDS      = {"cer", "tc", "dicp", "cuap", "parp", "para", "discount", "par", "boncer", "txs", "tzx", "tx2"}
_DOLLAR_LINKED_KW  = {"tv", "tvm", "t2v", "tvpp", "linked", "dolar link"}
_VARIABLE_RATE_KW  = {"badlar", "tamar", "t.variable", "tasa variable", "floating"}
_BOPREAL_KW        = {"bopreal", "bpr"}
_MONEY_MARKET_KW   = {"letes", "letras", "letra", "lete", "s", "x", "billi", "tbill", "tbond"}

def _contains_any(text: str, keywords: set[str]) -> bool:
    t = text.lower()
    return any(k in t for k in keywords)


# ---------------------------------------------------------------------------
# Utilidades estadísticas (solo stdlib + math)
# ---------------------------------------------------------------------------

def _percentile_rank(value: float, population: list[float]) -> float:
    """
    Devuelve el percentil robusto de `value` dentro de `population`.
    Equivalente a: fracción de la población estrictamente menor que value,
    ajustado con un tie-break suavizado (método de interpolación).
    Retorna valor en [0, 1].
    """
    if not population:
        return 0.5
    n = len(population)
    below  = sum(1 for x in population if x < value)
    equal  = sum(1 for x in population if x == value)
    # Fórmula con tie-break (percentile rank con interpolación central)
    rank = (below + 0.5 * equal) / n
    return max(0.0, min(1.0, rank))


def _safe_log(x: float, fallback: float = 0.0) -> float:
    if x > 0:
        return math.log(x)
    return fallback


def _duration_penalty(duration: float, regime: str) -> float:
    """
    Penalización suave por duration excesiva.
    Retorna un score entre 0 y 1 (1 = sin penalización).
    Umbrales razonables según régimen.
    """
    thresholds = {
        REGIMEN_HARD_DOLLAR:   10.0,
        REGIMEN_CER:           8.0,
        REGIMEN_DOLLAR_LINKED: 5.0,
        REGIMEN_VARIABLE_RATE: 4.0,
        REGIMEN_FIXED_RATE:    5.0,
        REGIMEN_MONEY_MARKET:  0.5,
    }
    max_d = thresholds.get(regime, 8.0)
    if duration <= 0:
        return 0.5  # Neutral cuando no hay dato
    if duration <= max_d:
        return 1.0
    # Penalización logarítmica suave
    excess = duration - max_d
    penalty = 1.0 / (1.0 + math.log1p(excess))
    return max(0.0, min(1.0, penalty))


# ---------------------------------------------------------------------------
# Motor principal
# ---------------------------------------------------------------------------

class ArkadScoreEngine:
    """
    Motor de scoring independiente para instrumentos financieros argentinos.
    Clasificación por régimen, filtrado de validez, scoring por percentiles,
    y ranking estructurado.
    """

    # ------------------------------------------------------------------
    # 1. Clasificación por régimen
    # ------------------------------------------------------------------

    def classify_regimen(self, instrument: dict[str, Any]) -> str:
        """
        Clasifica un instrumento en uno de los seis regímenes financieros.
        La lógica usa ticker, tipo, emisor, legislacion y moneda_emision.
        """
        ticker    = str(instrument.get("ticker", "")).upper()
        tipo      = str(instrument.get("tipo", "")).lower()
        emisor    = str(instrument.get("emisor", "")).lower()
        moneda    = str(instrument.get("moneda_emision", "")).lower()
        legisl    = str(instrument.get("legislacion", "")).lower()

        combined = f"{ticker} {tipo} {emisor} {legisl}".lower()

        # MONEY_MARKET: letras y otros instrumentos de corto plazo sin cupón relevante
        # Clasificación exclusivamente por tipo explícito, nunca por duración
        if (
            _contains_any(combined, {"letes", "lete", "letra", "lecap", "lici", "lecer"})
            or tipo in {"letra", "letes", "lecap", "lici", "lecer"}
        ):
            return REGIMEN_MONEY_MARKET

        # CER
        if (
            _contains_any(combined, _CER_KEYWORDS)
            or "cer" in tipo
            or "inflacion" in tipo
        ):
            return REGIMEN_CER

        # DOLLAR_LINKED
        if (
            _contains_any(combined, _DOLLAR_LINKED_KW)
            or "dollar link" in tipo
            or "dolar link" in tipo
        ):
            return REGIMEN_DOLLAR_LINKED

        # VARIABLE_RATE
        if (
            _contains_any(combined, _VARIABLE_RATE_KW)
            or "badlar" in tipo
            or "tamar" in tipo
        ):
            return REGIMEN_VARIABLE_RATE

        # HARD_DOLLAR: bonos soberanos en USD, BOPREAL, ON en USD
        is_usd = moneda in {"usd", "u$s", "dolar", "dollar"}
        is_soberano = emisor in {"tesoro", "nacion", "republica argentina", "argentina"} or "soberano" in tipo
        is_bopreal = _contains_any(combined, _BOPREAL_KW)
        is_on_usd = ("on" in tipo or "obligacion negociable" in tipo) and is_usd

        if is_bopreal or is_on_usd or (is_soberano and is_usd):
            return REGIMEN_HARD_DOLLAR

        # FIXED_RATE: tasa fija ARS nominal (default para ARS no clasificados)
        if moneda in {"ars", "pesos", "peso", "$", ""}:
            return REGIMEN_FIXED_RATE

        # Fallback
        return REGIMEN_FIXED_RATE

    # ------------------------------------------------------------------
    # 2. Filtro de validez
    # ------------------------------------------------------------------

    def filter_valid(self, instrument: dict[str, Any], regimen: str) -> tuple[bool, list[str]]:
        """
        Determina si un instrumento es válido para scoring.
        Retorna (is_valid, reasons_if_invalid).
        No elimina el instrumento, solo marca su estado.
        """
        reasons: list[str] = []

        tir            = instrument.get("tir") or 0.0
        mod_duration   = instrument.get("modified_duration") or 0.0
        parity         = instrument.get("parity") or 0.0
        monto_operado  = instrument.get("monto_operado") or 0.0

        # TIR inválida: solo se rechaza si es extremadamente negativa o extremadamente positiva
        if tir < -5:
            reasons.append("tir_extreme_negative")
        if tir > 80:
            reasons.append("tir_extreme_positive")

        # Duration (excepto MONEY_MARKET)
        if regimen != REGIMEN_MONEY_MARKET and mod_duration <= 0:
            reasons.append("modified_duration_lte_zero")

        # Parity (excepto MONEY_MARKET)
        if regimen != REGIMEN_MONEY_MARKET and parity <= 0:
            reasons.append("parity_lte_zero")

        # Liquidez
        if monto_operado <= 0:
            reasons.append("monto_operado_lte_zero")

        return (len(reasons) == 0, reasons)

    # ------------------------------------------------------------------
    # 3. Cálculo de percentiles dentro de un régimen
    # ------------------------------------------------------------------

    def compute_percentiles(
        self, instruments: list[dict[str, Any]], regimen: str
    ) -> dict[str, list[float]]:
        """
        Pre-computa las poblaciones de cada métrica para el régimen dado.
        Solo usa instrumentos válidos para construir las distribuciones.
        """
        tirs      = [i["_tir"]           for i in instruments if i.get("_valid")]
        logs_mont = [i["_log_monto"]     for i in instruments if i.get("_valid")]
        parities  = [i["_parity"]        for i in instruments if i.get("_valid")]
        durations = [i["_mod_duration"]  for i in instruments if i.get("_valid")]
        dias      = [i["_dias"]          for i in instruments if i.get("_valid")]

        return {
            "tir":      tirs,
            "liquidez": logs_mont,
            "parity":   parities,
            "duration": durations,
            "dias":     dias,
        }

    # ------------------------------------------------------------------
    # 4. Cálculo de score individual
    # ------------------------------------------------------------------

    def compute_score(
        self,
        instrument_enriched: dict[str, Any],
        populations: dict[str, list[float]],
        regimen: str,
    ) -> float:
        """
        Calcula el score compuesto de un instrumento usando percentiles robustos.
        """
        weights = REGIMEN_WEIGHTS.get(regimen, REGIMEN_WEIGHTS[REGIMEN_FIXED_RATE])

        tir           = instrument_enriched["_tir"]
        log_monto     = instrument_enriched["_log_monto"]
        parity        = instrument_enriched["_parity"]
        mod_duration  = instrument_enriched["_mod_duration"]
        dias          = instrument_enriched["_dias"]

        # Percentiles
        score_tir      = _percentile_rank(tir, populations["tir"])
        score_liquidez = _percentile_rank(log_monto, populations["liquidez"])
        # Parity: menor es mejor (precio bajo puede ser oportunidad), invertir percentil
        score_parity   = 1.0 - _percentile_rank(parity, populations["parity"])
        # Duration: penalización suave
        score_duration = _duration_penalty(mod_duration, regimen)

        if regimen == REGIMEN_MONEY_MARKET:
            # días a vencimiento: menor es mejor (más líquido)
            score_dias = 1.0 - _percentile_rank(dias, populations["dias"])
            score = (
                weights["tir"]      * score_tir
                + weights["liquidez"] * score_liquidez
                + weights["duration"] * score_dias
            )
        else:
            score = (
                weights["tir"]      * score_tir
                + weights["parity"]   * score_parity
                + weights["liquidez"] * score_liquidez
                + weights["duration"] * score_duration
            )

        return round(max(0.0, min(1.0, score)), 6)

    # ------------------------------------------------------------------
    # 5. Método principal de ranking
    # ------------------------------------------------------------------

    def rank_by_regimen(self, instruments: list[dict[str, Any]]) -> dict[str, list[dict]]:
        """
        Punto de entrada principal.

        Args:
            instruments: Lista de dicts con campos:
                ticker, tipo, emisor, legislacion, moneda_emision,
                price, tir, modified_duration, macaulay_duration,
                volumen, monto_operado, parity

        Returns:
            Dict con clave = régimen, valor = lista ordenada por score desc.
            Cada elemento: { ticker, score, regimen, valid_for_scoring, metrics }
        """
        if not instruments:
            return {r: [] for r in ALL_REGIMENES}

        # --- Paso 1: clasificar y enriquecer cada instrumento ---
        enriched: list[dict[str, Any]] = []
        for inst in instruments:
            regimen = self.classify_regimen(inst)
            valid, reasons = self.filter_valid(inst, regimen)

            tir           = float(inst.get("tir") or 0.0)
            mod_duration  = float(inst.get("modified_duration") or 0.0)
            parity        = float(inst.get("parity") or 0.0)
            monto_operado = float(inst.get("monto_operado") or 0.0)
            # días a vencimiento: si no existe, se estima a partir de macaulay * 365
            macaulay      = float(inst.get("macaulay_duration") or 0.0)
            dias          = float(inst.get("dias_a_vencimiento") or macaulay * 365 or 30.0)

            enriched.append({
                # datos originales
                **inst,
                # clasificación
                "_regimen":      regimen,
                "_valid":        valid,
                "_reasons":      reasons,
                # valores normalizados para scoring
                "_tir":          tir,
                "_log_monto":    _safe_log(monto_operado),
                "_parity":       parity,
                "_mod_duration": mod_duration,
                "_dias":         dias,
            })

        # --- Paso 2: agrupar por régimen ---
        by_regimen: dict[str, list[dict]] = {r: [] for r in ALL_REGIMENES}
        for inst in enriched:
            r = inst["_regimen"]
            if r not in by_regimen:
                by_regimen[r] = []
            by_regimen[r].append(inst)

        # --- Paso 3: scoring por régimen ---
        result: dict[str, list[dict]] = {r: [] for r in ALL_REGIMENES}

        for regimen, group in by_regimen.items():
            if not group:
                result[regimen] = []
                continue

            # Construir poblaciones solo con válidos
            populations = self.compute_percentiles(group, regimen)

            ranked = []
            for inst in group:
                valid = inst["_valid"]

                if valid and len(populations["tir"]) > 0:
                    score = self.compute_score(inst, populations, regimen)
                else:
                    # Inválidos reciben score 0 pero se incluyen en el output
                    score = 0.0

                ranked.append({
                    "ticker":            inst.get("ticker", ""),
                    "score":             score,
                    "regimen":           regimen,
                    "valid_for_scoring": valid,
                    "invalid_reasons":   inst["_reasons"],
                    "metrics": {
                        "tir":           inst.get("tir"),
                        "duration":      inst.get("modified_duration"),
                        "parity":        inst.get("parity"),
                        "monto_operado": inst.get("monto_operado"),
                        "price":         inst.get("price"),
                        "emisor":        inst.get("emisor"),
                        "moneda":        inst.get("moneda_emision"),
                        "legislacion":   inst.get("legislacion"),
                    },
                })

            # Ordenar: válidos primero (por score desc), luego inválidos
            ranked.sort(key=lambda x: (x["valid_for_scoring"], x["score"]), reverse=True)
            result[regimen] = ranked

        return result


# ---------------------------------------------------------------------------
# Instancia de módulo (singleton ligero)
# ---------------------------------------------------------------------------

engine = ArkadScoreEngine()