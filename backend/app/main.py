from dotenv import load_dotenv
load_dotenv()
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import uvicorn
from supabase import create_client


from app.core.engines.finance_engine import FinanceEngine
from app.core.engines.arkad_score_engine import ArkadScoreEngine
from app.repositories.supabase_market_data import SupabaseMarketData
from app.instruments.router import router as instruments_router
from routers.ranking import router as ranking_router
from routers.fci_ranking import router as fci_ranking_router

from services.ranking_service import RankingService
from routers import ranking as ranking_router_module
from routers.ranking import router as ranking_router


app = FastAPI(title="Docta Terminal API", version="1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)


market_data = SupabaseMarketData()
app.include_router(instruments_router)
app.include_router(ranking_router)
app.include_router(fci_ranking_router)

import time

_market_cache = {
    "data": None,
    "timestamp": 0
}
CACHE_TTL = 30

def get_cached_market_data():
    if _market_cache["data"] is None or (time.time() - _market_cache["timestamp"]) > CACHE_TTL:
        _market_cache["data"] = market_data.get_market_data()
        _market_cache["timestamp"] = time.time()
    return _market_cache["data"]

# ---------------------------------------------------------------------------
# Ranking — singleton service para que el cache persista entre requests
# ---------------------------------------------------------------------------

_ranking_service = RankingService(
    repo=SupabaseMarketData(),
    engine=ArkadScoreEngine(),
)

# Sobreescribir la dependencia del router para usar el singleton
app.dependency_overrides[ranking_router_module.get_ranking_service] = lambda: _ranking_service
app.include_router(ranking_router)


# ---------------------------------------------------------------------------
# Endpoints existentes (sin modificar)
# ---------------------------------------------------------------------------

@app.get("/api/v1/market-data")
async def get_market_data():
    try: return get_cached_market_data()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/bonos")
async def get_bonos():
    try: return market_data.get_bonos()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/letras")
async def get_letras():
    try: return market_data.get_letras()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/bopreal")
async def get_bopreal():
    try: return market_data.get_bopreal()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/ons")
async def get_ons():
    try: return market_data.get_ons()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/cauciones")
async def get_cauciones():
    try: return market_data.get_cauciones()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/fci")
async def get_fci():
    try: return market_data.get_fcis()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/instrument/{ticker}")
async def get_instrument_detail(ticker: str):
    try:
        instrument = market_data.get_instrument_data(ticker)
        if not instrument:
            raise HTTPException(status_code=404, detail=f"Instrumento {ticker} no encontrado")
        return instrument
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/tc-hoy")
async def get_tc_hoy():
    try: return market_data.get_tc_hoy()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/macros-hoy")
async def get_macros_hoy():
    try: return market_data.get_macros_hoy()
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/macros")
async def get_macros_historico(indicador: Optional[str] = None, limit: int = 365):
    try: return market_data.get_macros_historico(indicador=indicador, limit=limit)
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

from collections import defaultdict


def fix_encoding(s: str) -> str:
    if not s:
        return s
    try:
        return s.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        pairs = [
            ('\u00c3\u00a9', 'é'), ('\u00c3\u00a1', 'á'),
            ('\u00c3\u00ad', 'í'), ('\u00c3\u00b3', 'ó'),
            ('\u00c3\u00ba', 'ú'), ('\u00c3\u00b1', 'ñ'),
            ('\u00c3\u0089', 'É'), ('\u00c3\u0081', 'Á'),
            ('\u00c3\u008d', 'Í'), ('\u00c3\u0093', 'Ó'),
            ('\u00c3\u009a', 'Ú'), ('\u00c3\u0091', 'Ñ'),
            ('\u00c3\u0082', ''),
        ]
        for bad, good in pairs:
            s = s.replace(bad, good)
        return s


# ── /api/v1/macro ─────────────────────────────────────────────────────────────

@app.get("/api/v1/macro")
async def get_macro_dashboard():
    try:
        # 1. FX con variación desde tc_historico
        resp_hist = market_data.client.table("tc_historico") \
            .select("casa,venta,compra,fecha") \
            .order("fecha", desc=True) \
            .limit(20) \
            .execute()

        hist_by_casa = defaultdict(list)
        for row in (resp_hist.data or []):
            hist_by_casa[row["casa"]].append(row)

        fx_variacion = {}
        for casa, rows in hist_by_casa.items():
            rows_sorted = sorted(rows, key=lambda r: r["fecha"], reverse=True)
            if len(rows_sorted) >= 2:
                venta_hoy  = float(rows_sorted[0].get("venta") or 0)
                venta_prev = float(rows_sorted[1].get("venta") or 0)
                fx_variacion[casa] = round(((venta_hoy - venta_prev) / venta_prev) * 100, 2) if venta_prev > 0 else 0.0
            else:
                fx_variacion[casa] = 0.0

        tc_rows = market_data.get_tc_hoy()
        fx_hoy = {}
        for row in tc_rows:
            casa = (row.get("casa") or "").lower().strip()
            if not casa:
                continue
            var_db = row.get("variacion")
            variacion = float(var_db) if var_db not in (None, "", "0", "0.0000") else fx_variacion.get(casa, 0.0)
            fx_hoy[casa] = {
                "compra":    float(row.get("compra") or 0) or None,
                "venta":     float(row.get("venta")  or 0) or None,
                "variacion": variacion,
            }

        # 2. Variaciones macro desde tabla macros
        def get_last_two(indicador: str):
            try:
                resp = market_data.client.table("macros") \
                    .select("valor,fecha") \
                    .eq("indicador", indicador) \
                    .order("fecha", desc=True) \
                    .limit(2) \
                    .execute()
                rows = resp.data or []
                if len(rows) >= 2:
                    actual   = float(rows[0]["valor"])
                    anterior = float(rows[1]["valor"])
                    variacion = round(((actual - anterior) / anterior) * 100, 2) if anterior else 0
                    return actual, variacion
                elif len(rows) == 1:
                    return float(rows[0]["valor"]), 0
                return 0, 0
            except Exception as e:
                print(f"Error get_last_two({indicador}): {e}")
                return 0, 0

        rp_val,     rp_var     = get_last_two("riesgo_pais")
        inf_val,    inf_var    = get_last_two("inflacion")
        inf_ia_val, inf_ia_var = get_last_two("inflacion_interanual")
        uva_val,    uva_var    = get_last_two("uva")

        # 3. Plazos fijos desde macros_hoy con fix de encoding
        resp_pf = market_data.client.table("macros_hoy") \
            .select("entidad,valor,logo_url,enlace,fecha") \
            .eq("tipo", "plazo_fijo") \
            .not_.is_("valor", "null") \
            .order("valor", desc=True) \
            .execute()

        tasas_pasivas = []
        seen = set()
        for r in (resp_pf.data or []):
            entidad = fix_encoding(r.get("entidad") or "")
            if not entidad or entidad in seen:
                continue
            if "otros bancos" in entidad.lower():
                continue
            val = float(r.get("valor") or 0)
            if val <= 0:
                continue
            seen.add(entidad)
            tna = round(val * 100, 2) if val < 2 else round(val, 2)
            tasas_pasivas.append({
                "entidad":  entidad,
                "tna":      tna,
                "logo_url": r.get("logo_url"),
                "enlace":   r.get("enlace"),
                "fecha":    str(r.get("fecha") or ""),
            })

        return {
            "fx_hoy": fx_hoy,
            "riesgo_pais": {
                "valor":            rp_val,
                "variacion_diaria": rp_var,
            },
            "inflacion": {
                "mensual":    {"valor": round(inf_val,    2), "variacion": inf_var},
                "interanual": {"valor": round(inf_ia_val, 2), "variacion": inf_ia_var},
            },
            "uva": {
                "valor":    round(uva_val, 2),
                "variacion": uva_var,
            },
            "tasas_pasivas": tasas_pasivas,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── /api/v1/billeteras ────────────────────────────────────────────────────────

@app.get("/api/v1/billeteras")
async def get_billeteras():
    try:
        resp = market_data.client.table("billeteras_hoy") \
            .select("fondo,tna,tea,tope,fecha,condiciones,condiciones_corto,variacion_diaria,updated_at") \
            .order("tna", desc=True) \
            .execute()

        result = []
        for row in (resp.data or []):
            tna_raw = float(row.get("tna") or 0)
            tea_raw = float(row.get("tea") or 0)
            tope    = row.get("tope")
            var     = row.get("variacion_diaria")

            result.append({
                "fondo":             row.get("fondo"),
                "tna":               round(tna_raw * 100, 3),
                "tea":               round(tea_raw * 100, 3),
                "tope":              float(tope) if tope else None,
                "fecha":             str(row.get("fecha") or ""),
                "condiciones":       row.get("condiciones"),
                "condiciones_corto": row.get("condiciones_corto"),
                "variacion_diaria":  float(var) if var is not None else None,
                "updated_at":        str(row.get("updated_at") or ""),
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from datetime import datetime, date, timedelta
from typing import Optional
from pydantic import BaseModel


# ── Modelos de entrada ────────────────────────────────────────────────────────

class OperacionIn(BaseModel):
    type:               str
    ticker:             Optional[str] = None
    nombre:             Optional[str] = None
    status:             str = "ACTIVA"
    objetivo:           Optional[str] = None
    date_compra:        str
    qty:                Optional[float] = None
    price_compra:       Optional[float] = None
    amount_ars:         Optional[float] = None
    price_compra_usd:   Optional[float] = None
    tna:                Optional[float] = None
    term_dias:          Optional[int]   = None
    operacion_fci:      Optional[str]   = None
    lugar_compra:       Optional[str]   = None
    notas:              Optional[str]   = None


class VentaIn(BaseModel):
    date_venta:         str
    price_venta:        float
    amount_venta_ars:   Optional[float] = None
    price_venta_usd:    Optional[float] = None


# ── Helpers internos ──────────────────────────────────────────────────────────

def _resolver_tc_para_fecha(client, fecha_str: str) -> Optional[float]:
    """
    Busca el TC oficial (venta) para una fecha dada en tc_historico.
    Intenta el día exacto, luego busca hacia atrás hasta 7 días.
    """
    try:
        fecha = date.fromisoformat(fecha_str)
        for delta in range(8):
            dia = (fecha - timedelta(days=delta)).isoformat()
            resp = client.table("tc_historico") \
                .select("venta") \
                .eq("casa", "oficial") \
                .eq("fecha", dia) \
                .limit(1) \
                .execute()
            if resp.data and resp.data[0].get("venta"):
                return float(resp.data[0]["venta"])
    except Exception as e:
        print(f"Error resolviendo TC para {fecha_str}: {e}")
    return None


def _resolver_vcp_para_fecha(client, nombre_fondo: str, fecha_str: str) -> Optional[float]:
    """
    Busca el VCP (cuotaparte) de un FCI en fci_precios_historico para una fecha dada.
    Intenta el día exacto, luego busca hacia atrás hasta 7 días.
    """
    try:
        fecha = date.fromisoformat(fecha_str)
        for delta in range(8):
            dia = (fecha - timedelta(days=delta)).isoformat()
            resp = client.table("fci_precios_historico") \
                .select("vcp") \
                .eq("fondo", nombre_fondo) \
                .eq("fecha", dia) \
                .limit(1) \
                .execute()
            if resp.data and resp.data[0].get("vcp"):
                return float(resp.data[0]["vcp"])
    except Exception as e:
        print(f"Error resolviendo VCP para {nombre_fondo} / {fecha_str}: {e}")
    return None


def _calcular_metricas(op: dict, client) -> dict:
    extras = {}

    if op.get("type") == "CAUCION" and op.get("date_compra") and op.get("term_dias"):
        try:
            inicio = date.fromisoformat(op["date_compra"])
            extras["date_vencimiento"] = (inicio + timedelta(days=int(op["term_dias"]))).isoformat()
            tna = float(op.get("tna") or 0)
            plazo = int(op["term_dias"])
            extras["rendimiento_esperado"] = round(tna * plazo / 365, 4)
        except Exception:
            pass

    if not op.get("tc_compra") and op.get("date_compra"):
        tc = _resolver_tc_para_fecha(client, op["date_compra"])
        if tc:
            extras["tc_compra"] = tc
            ars = float(op.get("amount_ars") or 0)
            if ars > 0:
                extras["amount_usd"] = round(ars / tc, 2)

    if op.get("type") == "FCI" and op.get("nombre") and op.get("date_compra"):
        if not op.get("cuotaparte_entrada"):
            vcp = _resolver_vcp_para_fecha(client, op["nombre"], op["date_compra"])
            if vcp:
                extras["cuotaparte_entrada"] = vcp

    return extras


# ── Endpoints portfolio operaciones ───────────────────────────────────────────

@app.get("/api/v1/portfolio")
async def get_portfolio():
    try:
        resp = market_data.client.table("portfolio_operaciones") \
            .select("*") \
            .order("date_compra", desc=True) \
            .execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/portfolio", status_code=201)
async def crear_operacion(op: OperacionIn):
    try:
        payload = op.model_dump(exclude_none=True)
        extras = _calcular_metricas(payload, market_data.client)
        payload.update(extras)
        payload["created_at"] = datetime.now().isoformat()
        payload["updated_at"] = datetime.now().isoformat()
        resp = market_data.client.table("portfolio_operaciones").insert(payload).execute()
        if resp.data:
            return resp.data[0]
        raise HTTPException(status_code=500, detail="No se pudo insertar la operación")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/v1/portfolio/{operacion_id}/vender")
async def cerrar_posicion(operacion_id: str, venta: VentaIn):
    try:
        resp = market_data.client.table("portfolio_operaciones") \
            .select("*").eq("id", operacion_id).limit(1).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Operación no encontrada")
        original = resp.data[0]
        tc_venta = _resolver_tc_para_fecha(market_data.client, venta.date_venta)
        rendimiento_realizado = None
        price_compra = float(original.get("price_compra") or 0)
        if price_compra > 0 and venta.price_venta > 0:
            carry = float(original.get("carry_acumulado") or 0)
            rendimiento_realizado = round(
                ((venta.price_venta - price_compra + carry) / price_compra) * 100, 4
            )
        patch = {
            "status": "VENDIDA", "date_venta": venta.date_venta,
            "price_venta": venta.price_venta, "amount_venta_ars": venta.amount_venta_ars,
            "price_venta_usd": venta.price_venta_usd, "tc_venta": tc_venta,
            "rendimiento_realizado": rendimiento_realizado,
            "updated_at": datetime.now().isoformat(),
        }
        patch = {k: v for k, v in patch.items() if v is not None}
        resp_update = market_data.client.table("portfolio_operaciones") \
            .update(patch).eq("id", operacion_id).execute()
        return resp_update.data[0] if resp_update.data else {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/v1/portfolio/{operacion_id}/vencida")
async def marcar_vencida(operacion_id: str):
    try:
        resp = market_data.client.table("portfolio_operaciones") \
            .update({"status": "VENCIDA", "updated_at": datetime.now().isoformat()}) \
            .eq("id", operacion_id).execute()
        return resp.data[0] if resp.data else {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/portfolio/{operacion_id}", status_code=204)
async def eliminar_operacion(operacion_id: str):
    try:
        market_data.client.table("portfolio_operaciones").delete().eq("id", operacion_id).execute()
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/portfolio/resolver-tc")
async def resolver_tc(fecha: str):
    tc = _resolver_tc_para_fecha(market_data.client, fecha)
    if tc is None:
        raise HTTPException(status_code=404, detail=f"No se encontró TC para {fecha}")
    return {"fecha": fecha, "tc_oficial": tc}


@app.get("/api/v1/portfolio/resolver-vcp")
async def resolver_vcp(fondo: str, fecha: str):
    vcp = _resolver_vcp_para_fecha(market_data.client, fondo, fecha)
    if vcp is None:
        raise HTTPException(status_code=404, detail=f"No se encontró VCP para {fondo} en {fecha}")
    return {"fondo": fondo, "fecha": fecha, "vcp": vcp}


@app.get("/api/v1/portfolio/config")
async def get_config():
    resp = market_data.client.table("portfolio_config").select("*").eq("id", "singleton").execute()
    return resp.data[0] if resp.data else {"liquidez_ars": 0}


@app.patch("/api/v1/portfolio/config/liquidez")
async def update_liquidez(body: dict):
    delta = float(body.get("delta", 0))
    resp  = market_data.client.rpc("ajustar_liquidez", {"delta": delta}).execute()
    return resp.data


# ══════════════════════════════════════════════════════════════════════════════
# PORTFOLIO FCI — CRUD endpoints
# ══════════════════════════════════════════════════════════════════════════════

class PortfolioFCIIn(BaseModel):
    fondo:              str
    tipo:               Optional[str]   = None
    estado:             str             = "ACTIVO"
    fecha_entrada:      str
    fecha_salida:       Optional[str]   = None
    monto_ars:          float
    tc_oficial_entrada: Optional[float] = None
    tc_mep_entrada:     Optional[float] = None
    cuotas:             Optional[float] = None
    vcp_entrada:        Optional[float] = None
    notas:              Optional[str]   = None


class PortfolioFCICierreIn(BaseModel):
    fecha_salida:        str
    monto_ars_salida:    float
    tc_oficial_salida:   Optional[float] = None
    tc_mep_salida:       Optional[float] = None
    vcp_salida:          Optional[float] = None
    inflacion_acumulada: Optional[float] = None


def _resolver_mep_para_fecha(client, fecha_str: str) -> Optional[float]:
    try:
        fecha = date.fromisoformat(fecha_str)
        for delta in range(8):
            dia = (fecha - timedelta(days=delta)).isoformat()
            resp = client.table("tc_historico") \
                .select("venta").eq("casa", "bolsa").eq("fecha", dia).limit(1).execute()
            if resp.data and resp.data[0].get("venta"):
                return float(resp.data[0]["venta"])
    except Exception as e:
        print(f"Error resolviendo MEP para {fecha_str}: {e}")
    return None


@app.get("/api/v1/portfolio-fci")
async def get_portfolio_fci():
    try:
        resp = market_data.client.table("portfolio_fci") \
            .select("*").order("fecha_entrada", desc=True).execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/portfolio-fci", status_code=201)
async def crear_posicion_fci(pos: PortfolioFCIIn):
    try:
        payload = pos.model_dump(exclude_none=True)

        if not payload.get("tc_oficial_entrada"):
            tc = _resolver_tc_para_fecha(market_data.client, payload["fecha_entrada"])
            if tc:
                payload["tc_oficial_entrada"] = tc

        if not payload.get("tc_mep_entrada"):
            tc_mep = _resolver_mep_para_fecha(market_data.client, payload["fecha_entrada"])
            if tc_mep:
                payload["tc_mep_entrada"] = tc_mep

        if not payload.get("vcp_entrada") and payload.get("fondo"):
            vcp = _resolver_vcp_para_fecha(market_data.client, payload["fondo"], payload["fecha_entrada"])
            if vcp:
                payload["vcp_entrada"] = vcp
                if not payload.get("cuotas") and payload.get("monto_ars") and vcp > 0:
                    payload["cuotas"] = round(payload["monto_ars"] / vcp, 6)

        payload["created_at"] = datetime.now().isoformat()
        payload["updated_at"] = datetime.now().isoformat()

        resp = market_data.client.table("portfolio_fci").insert(payload).execute()
        if resp.data:
            return resp.data[0]
        raise HTTPException(status_code=500, detail="No se pudo insertar la posición")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/v1/portfolio-fci/{posicion_id}/cerrar")
async def cerrar_posicion_fci(posicion_id: str, cierre: PortfolioFCICierreIn):
    try:
        patch = cierre.model_dump(exclude_none=True)
        patch["estado"] = "CERRADO"

        if not patch.get("tc_oficial_salida"):
            tc = _resolver_tc_para_fecha(market_data.client, patch["fecha_salida"])
            if tc:
                patch["tc_oficial_salida"] = tc

        if not patch.get("tc_mep_salida"):
            tc_mep = _resolver_mep_para_fecha(market_data.client, patch["fecha_salida"])
            if tc_mep:
                patch["tc_mep_salida"] = tc_mep

        patch["updated_at"] = datetime.now().isoformat()

        resp = market_data.client.table("portfolio_fci") \
            .update(patch).eq("id", posicion_id).execute()
        return resp.data[0] if resp.data else {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/portfolio-fci/{posicion_id}", status_code=204)
async def eliminar_posicion_fci(posicion_id: str):
    try:
        market_data.client.table("portfolio_fci").delete().eq("id", posicion_id).execute()
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/portfolio-fci/inflacion-historial")
async def get_inflacion_historial():
    try:
        resp = market_data.client.table("macros") \
            .select("fecha, valor") \
            .eq("indicador", "inflacion") \
            .order("fecha", desc=False) \
            .execute()

        result = []
        for row in (resp.data or []):
            v = row.get("valor")
            f = row.get("fecha")
            if v is not None and f:
                val = float(v)
                if val < 2:
                    val = round(val * 100, 4)
                result.append({"fecha": str(f), "valor": val})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=18000)