# backend/services/ranking_service.py

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from zoneinfo import ZoneInfo

from .macro_regime_engine import MacroRegimeEngine
from app.core.engines.arkad_score_engine import ArkadScoreEngine, ALL_REGIMENES
from app.repositories.supabase_market_data import SupabaseMarketData

_TZ_ARG = ZoneInfo("America/Argentina/Buenos_Aires")
_TOP_N = 5


class RankingService:

    def __init__(self, repo: SupabaseMarketData, engine: ArkadScoreEngine) -> None:
        self._repo = repo
        self._engine = engine
        self._cache_date: Optional[str] = None
        self._cache_result: Optional[dict[str, Any]] = None

    def _today(self) -> str:
        return datetime.now(tz=_TZ_ARG).date().isoformat()

    def _fetch_instruments(self) -> list[dict[str, Any]]:
        return (
            self._repo.get_bonos()
            + self._repo.get_letras()
            + self._repo.get_bopreal()
            + self._repo.get_ons()
        )

    def _build_response(self, instruments: list[dict[str, Any]], today: str) -> dict[str, Any]:
        raw: dict[str, list[dict]] = self._engine.rank_by_regimen(instruments)

        ranking_by_regime: dict[str, list[dict]] = {}
        best_per_regime: dict[str, Optional[dict]] = {}

        for regimen in ALL_REGIMENES:
            items = raw.get(regimen, [])

            valid_items = sorted(
                [i for i in items if i.get("valid_for_scoring")],
                key=lambda x: x["score"],
                reverse=True,
            )

            best_per_regime[regimen] = valid_items[0] if valid_items else None
            ranking_by_regime[regimen] = valid_items[:_TOP_N]

        return {
            "date": today,
            "best_per_regime": best_per_regime,
            "ranking_by_regime": ranking_by_regime,
        }

    def get_ranking(self) -> dict[str, Any]:
        today = self._today()

        # Cache
        if self._cache_date == today and self._cache_result is not None:
            return self._cache_result

        # ==========================
        # 1️⃣ Señal macro
        # ==========================
        macro_engine = MacroRegimeEngine(self._repo.client)
        macro_signal = macro_engine.get_macro_signal()

        print("MACRO SIGNAL:", macro_signal)  # temporal para test

        # ==========================
        # 2️⃣ Fetch instrumentos
        # ==========================
        instruments = self._fetch_instruments()

        # ==========================
        # 3️⃣ Aplicar multiplicador macro
        # ==========================
        for item in instruments:
            regimen = item.get("regimen", "VARIABLE_RATE")
            multiplicador = macro_signal.get(regimen, 0.5)

            score_interno = item.get("score", 0)
            item["score"] = score_interno * multiplicador

        # ==========================
        # 4️⃣ Construir respuesta
        # ==========================
        result = self._build_response(instruments, today)

        result["macro_signal"] = macro_signal
        result["parking_mode"] = max(macro_signal.values()) < 0.55

        # Cache
        self._cache_date = today
        self._cache_result = result

        return result