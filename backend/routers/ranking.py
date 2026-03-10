# backend/routers/ranking.py

from __future__ import annotations

from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.engines.arkad_score_engine import ArkadScoreEngine
from app.repositories.supabase_market_data import SupabaseMarketData
from services.ranking_service import RankingService

router = APIRouter(prefix="/api/v1", tags=["ranking"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class InstrumentMetrics(BaseModel):
    tir: Optional[float]
    duration: Optional[float]
    parity: Optional[float]
    monto_operado: Optional[float]
    price: Optional[float]
    emisor: Optional[str]
    moneda: Optional[str]
    legislacion: Optional[str]


class RankedInstrument(BaseModel):
    ticker: str
    score: float
    regimen: str
    valid_for_scoring: bool
    invalid_reasons: List[str]
    metrics: InstrumentMetrics


class RankingResponse(BaseModel):
    date: str
    best_per_regime: Dict[str, Optional[RankedInstrument]]
    ranking_by_regime: Dict[str, List[RankedInstrument]]
    macro_signal: Dict[str, float]
    parking_mode: bool


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

def get_repo() -> SupabaseMarketData:
    return SupabaseMarketData()


def get_engine() -> ArkadScoreEngine:
    return ArkadScoreEngine()


def get_ranking_service(
    repo: SupabaseMarketData = Depends(get_repo),
    engine: ArkadScoreEngine = Depends(get_engine),
) -> RankingService:
    return RankingService(repo=repo, engine=engine)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/ranking", response_model=RankingResponse)
async def get_ranking(
    service: RankingService = Depends(get_ranking_service),
) -> RankingResponse:
    try:
        return service.get_ranking()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))