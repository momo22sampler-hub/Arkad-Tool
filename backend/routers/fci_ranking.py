"""
Router: FCI Ranking
Endpoints:
  GET /api/v1/fcis/ranking   → ranking global con score y métricas
  GET /api/v1/fcis/historico → serie VCP de un fondo para el gráfico

Pipeline del ranking:
  1. Fetch paginado de fci_precios_historico (supera límite 1000 filas de Supabase)
  2. Agrupa por fondo ordenando cronológicamente por fecha
  3. Pasa series NAV + fechas al FCIEngine
  4. El engine aplica filtros de calidad (ver fci_engine.py):
       - MIN_OBSERVACIONES = 50 (fondos con menos registros son excluidos)
       - TEA <= 200%
       - Volatilidad anualizada <= 25%
  5. Adjunta categoría derivada del campo `tipo`
  6. Devuelve ranking con campos: rank, fondo, categoria, tea, volatilidad,
     drawdown, momentum, score

Cache en memoria de CACHE_TTL segundos (los VCP se actualizan una vez por día).
"""

import time
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException
from collections import defaultdict
from typing import List, Dict, Any

from app.repositories.supabase_market_data import SupabaseMarketData
from app.core.engines.fci_engine import FCIEngine

router = APIRouter(prefix="/api/v1/fcis", tags=["FCIs"])

_engine = FCIEngine()

PAGE_SIZE = 1000
CACHE_TTL = 300  # 5 minutos
_ranking_cache: Dict[str, Any] = {"data": None, "timestamp": 0}


# ------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------

def _derivar_categoria(tipo: str) -> str:
    t = (tipo or "").upper()
    if "MM" in t or "MONEY" in t:
        return "Money Market"
    if "RF" in t or "RENTA FIJA" in t:
        return "Renta Fija"
    if "RV" in t or "RENTA VARIABLE" in t:
        return "Renta Variable"
    if "MIXTO" in t:
        return "Mixto"
    return "Otro"


def _fetch_all_rows(client, table: str, columns: str) -> List[Dict]:
    """Pagina hasta traer todas las filas (Supabase limita a 1000 por request)."""
    all_rows = []
    offset = 0
    while True:
        resp = (
            client
            .table(table)
            .select(columns)
            .order("fecha", desc=False)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return all_rows


# ------------------------------------------------------------------
# ENDPOINTS
# ------------------------------------------------------------------

@router.get("/ranking")
async def get_fci_ranking() -> Dict[str, Any]:
    """
    Ranking de FCIs ordenado por score cuantitativo descendente.

    Campos de respuesta por fondo:
      rank, fondo, categoria, tipo, score,
      tea (%), momentum (%), volatilidad (%), drawdown (%)

    Los fondos excluidos por filtros de calidad no aparecen en el resultado.
    """
    if _ranking_cache["data"] and (time.time() - _ranking_cache["timestamp"]) < CACHE_TTL:
        return _ranking_cache["data"]

    # ── 1. Fetch ─────────────────────────────────────────────────────
    try:
        market_data = SupabaseMarketData()
        rows = _fetch_all_rows(
            market_data.client,
            "fci_precios_historico",
            "fondo, fecha, vcp, tipo",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error al consultar Supabase: {exc}")

    if not rows:
        raise HTTPException(status_code=404, detail="No se encontraron datos en fci_precios_historico.")

    # ── 2. Agrupar por fondo ─────────────────────────────────────────
    fondos_rows: Dict[str, list] = defaultdict(list)
    fondos_tipo: Dict[str, str] = {}

    for row in rows:
        fondo = row.get("fondo")
        if not fondo:
            continue
        tipo = row.get("tipo") or ""
        fecha = row.get("fecha") or ""
        vcp = row.get("vcp")
        if tipo:
            fondos_tipo[fondo] = tipo
        if vcp is not None:
            try:
                v = float(vcp)
                if v > 0:
                    fondos_rows[fondo].append((fecha, v))
            except (TypeError, ValueError):
                continue

    if not fondos_rows:
        raise HTTPException(status_code=422, detail="No se encontraron series NAV válidas.")

    # ── 3. Construir series ordenadas por fecha ───────────────────────
    # Crítico para RV: NO dejar que el engine ordene por valor numérico
    fondos_data: Dict[str, List[float]] = {}
    fondos_fechas: Dict[str, List[str]] = {}
    for fondo, items in fondos_rows.items():
        items_sorted = sorted(items, key=lambda x: x[0])
        fondos_data[fondo] = [v for _, v in items_sorted]
        fondos_fechas[fondo] = [f for f, _ in items_sorted]

    # ── 4. Ranking (el engine aplica filtros internamente) ────────────
    ranking_raw = _engine.rank_fcis(fondos_data, fondos_fechas)

    # ── 5. Construir output con todos los campos requeridos ───────────
    ranking_output = []
    for i, item in enumerate(ranking_raw, start=1):
        tipo = fondos_tipo.get(item["fondo"], "")
        m = item["metrics"]
        ranking_output.append({
            "rank": i,
            "fondo": item["fondo"],
            "categoria": _derivar_categoria(tipo),
            "tipo": tipo,
            "score": item["score"],
            "tea": round(m["tea"] * 100, 2),            # en %
            "momentum": round(m["momentum"] * 100, 2),  # en %
            "volatilidad": round(m["volatility"] * 100, 2),  # en %
            "drawdown": round(m["drawdown"] * 100, 2),        # en %
        })

    result = {
        "ranking": ranking_output,
        "total": len(ranking_output),
        "generado_en": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    _ranking_cache["data"] = result
    _ranking_cache["timestamp"] = time.time()
    return result


@router.get("/historico")
async def get_historico_fci(fondo: str, dias: int = 30) -> List[Dict[str, Any]]:
    """
    Serie histórica de VCP de un fondo para los últimos N días.
    `fondo` debe coincidir exactamente con el campo en fci_precios_historico.
    Se pasa como query param para evitar problemas de encoding en el path.

    Ejemplo: GET /api/v1/fcis/historico?fondo=Max Money Market - Clase B&dias=30
    """
    desde = (date.today() - timedelta(days=dias)).isoformat()

    try:
        market_data = SupabaseMarketData()
        resp = (
            market_data.client
            .table("fci_precios_historico")
            .select("fecha, vcp")
            .eq("fondo", fondo)
            .gte("fecha", desde)
            .order("fecha", desc=False)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error al consultar Supabase: {exc}")

    return [
        {
            "fecha": row["fecha"][5:],   # "MM-DD" desde "YYYY-MM-DD"
            "vcp": float(row["vcp"]),
        }
        for row in rows
        if row.get("vcp") is not None
    ]