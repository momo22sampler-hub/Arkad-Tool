"""
SupabaseMarketData — repositorio central de datos de mercado.
Lee SOLO desde Supabase. No extrae datos externos.

Sirve datos para todos los endpoints de main.py:
  - bonos / ons / cauciones / fcis
  - market-data (consolidado)
  - instrument detail por ticker
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from supabase import create_client, Client
from datetime import datetime, date, timedelta
from app.core.engines.finance_engine import FinanceEngine


class SupabaseMarketData:

    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL y SUPABASE_KEY deben estar configurados")
        self.client: Client = create_client(supabase_url, supabase_key)

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_monto(monto_pago: float) -> float:
        """
        Normaliza monto_pago a escala VN=100.
        La BD puede tener cashflows en VN=1 (ej: 0.0175) o ya en VN=100 (ej: 1.75).
        Regla: si monto < 5 asumimos VN=1 y multiplicamos x100.
        Valores >= 5 ya están en escala VN=100 o nominal, se usan tal cual.
        """
        if monto_pago < 5.0:
            return round(monto_pago * 100, 6)
        return monto_pago

    # ------------------------------------------------------------------
    # BONOS Y ONs
    # ------------------------------------------------------------------

    def get_bonos(self) -> List[Dict]:
        """Lee instrumentos_bonos + precios_hoy y los combina."""
        return self._get_renta_fija([("instrumentos_bonos", "Bono Soberano")])

    def get_letras(self) -> List[Dict]:
        """Lee instrumentos_letras + precios_hoy y los combina."""
        return self._get_renta_fija([("instrumentos_letras", "Letra")])

    def get_bopreal(self) -> List[Dict]:
        """Lee instrumentos_bopreal + precios_hoy y los combina."""
        return self._get_renta_fija([("instrumentos_bopreal", "BOPREAL")])

    def get_ons(self) -> List[Dict]:
        """Lee instrumentos_ons + precios_hoy y los combina."""
        return self._get_renta_fija([("instrumentos_ons", "ON Corporativa")])

    def _get_renta_fija(self, tablas_instrumentos: List[Tuple[str, str]]) -> List[Dict]:
        try:
            engine = FinanceEngine()

            # 1. Datos estáticos del instrumento (combinando multiples tablas)
            instrumentos = {}
            for tabla, tipo_default in tablas_instrumentos:
                try:
                    resp_inst = self.client.table(tabla).select("*").execute()
                    for row in resp_inst.data:
                        # Guardamos también el tipo por defecto asociado a la tabla
                        row["_tipo_default"] = tipo_default
                        instrumentos[row["ticker"]] = row
                except Exception as e:
                    print(f"Warning: error al leer tabla {tabla}: {e}")

            # 2. Precios actuales
            resp_precios = self.client.table("precios_hoy").select("*").execute()
            precios = {row["ticker"]: row for row in resp_precios.data}

            # 3. Cashflows
            ticker_list = list(instrumentos.keys())
            cf_data = []
            for i in range(0, len(ticker_list), 100):
                chunk = ticker_list[i:i+100]
                resp = self.client.table("cashflows").select("*").in_("ticker", chunk).execute()
                cf_data.extend(resp.data)

            cashflows: Dict[str, list] = {}
            for cf in cf_data:
                t = cf["ticker"]
                if t not in cashflows:
                    cashflows[t] = []
                cashflows[t].append({
                    "fecha": self._format_fecha(cf.get("fecha_pago")),
                    "monto": self._normalize_monto(float(cf.get("monto_pago") or 0)),
                    "tipo": cf.get("tipo_pago", "Cupón"),
                    "moneda": cf.get("moneda_pago", "USD")
                })

            # 4. Precios históricos para calcular variación diaria
            prev_prices: Dict[str, float] = {}
            try:
                hoy_str = date.today().isoformat()  # "YYYY-MM-DD"
                resp_hist = self.client.table("precios_historicos") \
                    .select("ticker,precio,fecha_registro") \
                    .lt("fecha_registro", hoy_str) \
                    .order("fecha_registro", desc=True) \
                    .limit(1000) \
                    .execute()
                for h in resp_hist.data:
                    t = h.get("ticker")
                    if t and t not in prev_prices and h.get("precio"):
                        prev_prices[t] = float(h["precio"])
            except Exception as e:
                print(f"Warning: no se pudieron obtener precios históricos: {e}")

            # 5. Tipos de cambio: MEP, Oficial A3500 y CCL en una sola consulta
            fx_rates = {"bolsa": 0.0, "oficial": 0.0, "contadoconliqui": 0.0}
            try:
                resp_tc = self.client.table("tc_hoy").select("casa, venta").execute()
                for row in resp_tc.data:
                    casa = (row.get("casa") or "").lower().strip()
                    venta = float(row.get("venta") or 0)
                    if casa in fx_rates:
                        fx_rates[casa] = venta
            except Exception as e:
                print(f"Warning: no se pudieron obtener tipos de cambio: {e}")
            mep_rate = fx_rates.get("bolsa", 0.0)  # alias legacy

            result = []
            for ticker, inst in instrumentos.items():
                precio_row = precios.get(ticker, {})
                price = float(precio_row.get("precio") or 0)
                vol = float(precio_row.get("volumen") or 0)
                currency = precio_row.get("moneda") or inst.get("moneda_emision") or "USD"

                var_db = precio_row.get("variacion")
                variation = None
                if var_db is not None and float(var_db) != 0:
                    v = float(var_db)
                    variation = round(v if abs(v) > 2.0 else v * 100, 2)
                else:
                    prev_price = prev_prices.get(ticker)
                    if price > 0 and prev_price and prev_price > 0:
                        variation = round(((price - prev_price) / prev_price) * 100, 2)

                # Cashflows de este ticker
                ticker_cfs = cashflows.get(ticker, [])

                # Tipo de instrumento para seleccionar la estrategia correcta
                sub_clase = (inst.get("sub_clase_activo") or "").upper().strip()
                is_cer = sub_clase == "CER"
                is_dollar_linked = sub_clase == "DOLLAR_LINKED"
                is_letra = inst.get("_tipo_default", "") == "Letra"

                # ── Precio para TIR y métricas (convertido según FX) ──────────────
                price_for_tir = price
                if is_letra:
                    # Letras: precio en ARS, no hay conversión FX
                    price_for_tir = price
                elif is_cer:
                    # CER: precio ARS, no convertir
                    price_for_tir = price
                elif is_dollar_linked and fx_rates.get("oficial", 0) > 0:
                    # Dollar Linked: usar Dólar Oficial A3500
                    if ticker_cfs and currency == "ARS" and price > 1000:
                        price_for_tir = price / fx_rates["oficial"]
                elif not is_cer and ticker_cfs and currency == "ARS" and mep_rate > 0:
                    # Hard Dollar cotizando en ARS (ej: AL30D, GD30D)
                    cf_moneda = (ticker_cfs[0].get("moneda") or "USD").upper()
                    if cf_moneda == "USD" and price > 1000:
                        price_for_tir = price / mep_rate

                # ── TIR ────────────────────────────────────────────────────────────
                tir = 0.0
                if price_for_tir > 0 and ticker_cfs:
                    try:
                        tir = engine.calculate_tir(ticker_cfs, price_for_tir)
                    except Exception:
                        tir = 0.0

                # ── Duration ───────────────────────────────────────────────────────
                mac_dur = 0.0
                mod_dur = 0.0
                if tir != 0.0 and price_for_tir > 0 and ticker_cfs:
                    try:
                        dur = engine.calculate_duration(ticker_cfs, tir, price_for_tir)
                        mac_dur = dur.get("macaulay_duration", 0.0)
                        mod_dur = dur.get("modified_duration", 0.0)
                    except Exception:
                        pass

                # ── Métricas de Valuación (Strategy) ───────────────────────────────
                parity = 0.0
                clean_price = 0.0
                accrued_interest = 0.0
                technical_value = 0.0

                if price_for_tir > 0 and ticker_cfs:
                    try:
                        metrics = engine.calculate_bond_metrics(
                            ticker_cfs,
                            price_for_tir,
                            instrument_type=sub_clase if sub_clase else ("LETRA" if is_letra else "HARD_DOLLAR"),
                            fx_rates=fx_rates
                        )
                        parity = metrics.get("parity") or 0.0
                        if parity > 0 and parity <= 3.0:
                            parity = parity * 100.0
                        parity = round(parity, 2)
                        
                        clean_cp = metrics.get("clean_price") or 0.0
                        ic_raw   = metrics.get("accrued_interest") or 0.0
                        vt_raw   = metrics.get("technical_value")

                        # Si el precio base fue convertido a USD (Hard Dollar ARS), reconvertir a ARS
                        was_converted = (price_for_tir != price) and (mep_rate > 0 or fx_rates.get("oficial", 0) > 0)
                        if was_converted:
                            fx_used = mep_rate if not is_dollar_linked else fx_rates.get("oficial", mep_rate)
                            clean_price      = round(clean_cp * fx_used, 2)
                            accrued_interest = round(ic_raw  * fx_used, 2)
                            technical_value  = round(vt_raw  * fx_used, 2) if vt_raw is not None else 0.0
                        else:
                            clean_price      = round(clean_cp, 2)
                            accrued_interest = round(ic_raw, 2)
                            technical_value  = round(vt_raw, 2) if vt_raw is not None else 0.0
                    except Exception as e:
                        print(f"[WARN] métricas fallaron para {ticker}: {e}")
                
                item = {
                    "ticker": ticker,
                    "nombre": inst.get("nombre"),
                    "tipo": inst.get("sub_clase_activo") or inst.get("_tipo_default", "Bono Soberano"),
                    "emisor": inst.get("emisor"),
                    "legislacion": inst.get("legislacion"),
                    "sector": inst.get("sector"),
                    "fecha_vencimiento": self._format_fecha(inst.get("fecha_vencimiento")),
                    "fecha_emision": self._format_fecha(inst.get("fecha_emision")),
                    "moneda_emision": inst.get("moneda_emision"),
                    "estado": inst.get("estado"),
                    # Precios
                    "price": price,
                    "dirty_price": price,
                    "volumen": vol,
                    "volume": vol,
                    "variation": variation,
                    "monto_operado": float(precio_row.get("monto_operado") or 0),
                    "currency": currency,
                    "source": precio_row.get("fuente") or "Supabase",
                    "updated_at": str(precio_row.get("updated_at") or ""),
                    # Cashflows
                    "cash_flow": ticker_cfs,
                    # Campos calculados por FinanceEngine
                    "tir": tir,
                    "modified_duration": mod_dur,
                    "macaulay_duration": mac_dur,
                    # Campos derivados dinámicamente de sus flujos de caja
                    "parity": parity,
                    "clean_price": clean_price,
                    "accrued_interest": accrued_interest,
                    "technical_value": technical_value,
                    # Tipo especial
                    "is_cer": is_cer,
                }
                result.append(item)

            return result

        except Exception as e:
            print(f"Error en _get_renta_fija({tablas_instrumentos}): {e}")
            return []


    # ------------------------------------------------------------------
    # CAUCIONES
    # ------------------------------------------------------------------

    def get_cauciones(self) -> List[Dict]:
        """
        Lee tabla cauciones y mapea al formato que espera CaucionesView.jsx.
        Deduplica por ticker conservando solo el registro más reciente.

        CaucionesView espera:
          plazo, moneda, tna, tea, rendimiento_plazo, minimo, garantia,
          liquidacion, source, ticker, nombre
        """
        try:
            resp = self.client.table("cauciones_actuales").select("*").execute()

            if not resp.data:
                return []

            # Encontrar la fecha más reciente del scraping (solo la parte de fecha, sin hora)
            # Para mostrar solo los plazos de la última sesión de scraping
            fechas = [
                str(row.get("fecha_actualizacion") or "")[:10]  # solo YYYY-MM-DD
                for row in resp.data
                if row.get("fecha_actualizacion")
            ]
            if not fechas:
                return []
            fecha_mas_reciente = max(fechas)

            result = []
            for row in resp.data:
                # Filtrar: solo filas de la sesión de scraping más reciente
                fecha_row = str(row.get("fecha_actualizacion") or "")[:10]
                if fecha_row != fecha_mas_reciente:
                    continue

                # tna = tasa_tomadora: lo que recibe el inversor que PRESTA (colocador)
                # tasa_colocadora es lo que paga el tomador (más alta, incluye spread del broker)
                tna = float(row.get("tasa_tomadora") or 0)
                plazo = int(row.get("plazo_dias") or 0)

                # TEA: tasa efectiva anual reinvirtiendo cada `plazo` días
                tea = round(((1 + tna / 100 / 365 * plazo) ** (365 / plazo) - 1) * 100, 2) if plazo > 0 else 0

                # Rendimiento en el plazo (ganancia real en esos N días)
                rend_plazo = round((tna / 100 / 365 * plazo) * 100, 4) if plazo > 0 else 0

                result.append({
                    "ticker": row.get("ticker"),
                    "nombre": row.get("nombre"),
                    "moneda": row.get("moneda"),
                    "plazo": plazo,
                    "plazo_dias": plazo,
                    "tna": round(tna, 2),
                    "tea": tea,
                    "tasa_actual": float(row.get("tasa_actual") or 0),
                    "tasa_tomadora": float(row.get("tasa_tomadora") or 0),
                    "tasa_colocadora": float(row.get("tasa_colocadora") or 0),
                    "rendimiento_plazo": round(rend_plazo, 4),
                    "rendimiento_simple_pct": float(row.get("rendimiento_simple_pct") or 0),
                    "rendimiento_compuesto_pct": float(row.get("rendimiento_compuesto_pct") or 0),
                    "ganancia_por_100k_simple": float(row.get("ganancia_por_100k_simple") or 0),
                    "ganancia_por_100k_compuesta": float(row.get("ganancia_por_100k_compuesta") or 0),
                    "ganancia_mensual_renovando": float(row.get("ganancia_mensual_renovando") or 0),
                    "ganancia_anual_renovando": float(row.get("ganancia_anual_renovando") or 0),
                    "variacion": float(row.get("variacion") or 0),
                    "variacion_positiva": row.get("variacion_positiva"),
                    "spread": float(row.get("spread") or 0),
                    "max_dia": float(row.get("max_dia") or 0),
                    "min_dia": float(row.get("min_dia") or 0),
                    "volumen": float(row.get("volumen") or 0),
                    "minimo": 1000,
                    "garantia": "BYMA",
                    "liquidacion": "T+1" if plazo <= 1 else f"T+{min(plazo, 3)}",
                    "source": "BYMA",
                    "activo": row.get("activo", True),
                    "fecha_actualizacion": str(row.get("fecha_actualizacion") or ""),
                })

            # Solo cauciones activas, ordenadas por plazo
            result = [c for c in result if c["activo"]]
            result.sort(key=lambda x: x["plazo"])
            return result

        except Exception as e:
            print(f"Error en get_cauciones: {e}")
            return []

    # ------------------------------------------------------------------
    # FCIs
    # ------------------------------------------------------------------

    def get_fcis(self) -> List[Dict]:
        """
        Combina fci_precios_hoy + top30_* + fci_precios_historico
        y mapea al formato que espera FCIView.jsx.

        FCIView espera:
          ticker, nombre, nav, performance_diaria, performance_30d,
          tea_proyectada, riesgo, liquidez, moneda, categoria,
          comision_admin, minimo_suscripcion
        """
        try:
            # 1. Precios de hoy
            resp_hoy = self.client.table("fci_precios_hoy").select("*").execute()
            precios_hoy = {row["fondo"]: row for row in resp_hoy.data}

            # 2. Todos los fondos rankeados (top30_*)
            fondos_rankeados = {}
            for tabla in ["top30_mm", "top30_rf", "top30_rv", "top30_mixtos"]:
                try:
                    resp = self.client.table(tabla).select("*").execute()
                    for row in resp.data:
                        fondos_rankeados[row["fondo"]] = row
                except Exception as e:
                    print(f"Error leyendo {tabla}: {e}")

            # 3. Histórico para calcular performance_30d
            fecha_30d = (date.today() - timedelta(days=30)).isoformat()
            resp_hist = self.client.table("fci_precios_historico")\
                .select("fondo,vcp,fecha")\
                .gte("fecha", fecha_30d)\
                .execute()

            # Agrupar histórico por fondo
            historico: Dict[str, list] = {}
            for row in resp_hist.data:
                fondo = row["fondo"]
                if fondo not in historico:
                    historico[fondo] = []
                historico[fondo].append({
                    "fecha": row["fecha"],
                    "vcp": float(row.get("vcp") or 0)
                })

            result = []
            for fondo_nombre, precio_row in precios_hoy.items():
                vcp_hoy = float(precio_row.get("vcp") or 0)
                tipo = precio_row.get("tipo") or ""

                # Performance diaria: usar variacion_diaria_cnv del Excel CNV si existe
                # Es la variación real del día calculada por CNV (VCP hoy vs VCP ayer)
                # Fallback: calcular desde las últimas 2 fechas del histórico
                perf_diaria = 0.0
                if precio_row.get("variacion_diaria_cnv") is not None:
                    perf_diaria = round(float(precio_row["variacion_diaria_cnv"]), 2)
                elif fondo_nombre in historico:
                    hist_ord = sorted(historico[fondo_nombre], key=lambda x: x["fecha"])
                    hist_validos = [h for h in hist_ord if h["vcp"] > 0]
                    if len(hist_validos) >= 2:
                        vcp_penultimo = hist_validos[-2]["vcp"]
                        if vcp_penultimo > 0:
                            perf_diaria = round(((vcp_hoy - vcp_penultimo) / vcp_penultimo) * 100, 2)

                # Performance 30d desde histórico
                perf_30d = 0.0
                if fondo_nombre in historico:
                    hist = sorted(historico[fondo_nombre], key=lambda x: x["fecha"])
                    if hist and vcp_hoy > 0:
                        vcp_30d_atras = hist[0]["vcp"]
                        if vcp_30d_atras > 0:
                            perf_30d = round(((vcp_hoy - vcp_30d_atras) / vcp_30d_atras) * 100, 4)

                # TEA proyectada desde perf_30d
                tea_proyectada = round(((1 + perf_30d / 100) ** (365 / 30) - 1) * 100, 2) if perf_30d != 0 else 0

                # Datos del ranking si existe
                rank_row = fondos_rankeados.get(fondo_nombre, {})
                rend_90d  = float(rank_row.get("rendimiento_90d")  or 0)
                rend_180d = float(rank_row.get("rendimiento_180d") or 0)

                # Categoría desde tipo (solo para clasificar, sin hardcodes de riesgo/liquidez)
                categoria = self._derivar_categoria(tipo)

                # nav_anterior: último VCP del histórico (para el frontend)
                nav_anterior = None
                if fondo_nombre in historico:
                    hist_ant = sorted(historico[fondo_nombre], key=lambda x: x["fecha"])
                    anteriores = [h for h in hist_ant if h["vcp"] > 0]
                    if anteriores:
                        nav_anterior = anteriores[-1]["vcp"]

                result.append({
                    "ticker":             fondo_nombre,
                    "nombre":             fondo_nombre,
                    "fondo":              fondo_nombre,
                    "tipo":               tipo,
                    "categoria":          categoria,
                    "moneda":             precio_row.get("moneda") or rank_row.get("moneda") or "ARS",
                    "nav":                vcp_hoy,
                    "vcp":                vcp_hoy,
                    "nav_anterior":       nav_anterior,
                    "performance_diaria": perf_diaria,
                    "performance_30d":    perf_30d,
                    "rendimiento_90d":    rend_90d,
                    "rendimiento_180d":   rend_180d,
                    "rendimiento_ytd":    float(precio_row.get("rendimiento_ytd") or 0),
                    "rendimiento_12m":    float(precio_row.get("rendimiento_12m") or 0),
                    "tea_proyectada":     tea_proyectada,
                    "patrimonio":         float(precio_row.get("patrimonio") or 0),
                    "score":              float(rank_row.get("score") or 0),
                    "fecha":              str(precio_row.get("fecha") or ""),
                    "updated_at":         str(precio_row.get("updated_at") or ""),
                    # Ficha técnica real desde fci_precios_hoy (poblada por fci_precios.py)
                    "administradora":          precio_row.get("administradora"),
                    "depositaria":             precio_row.get("depositaria"),
                    "calificacion":            precio_row.get("calificacion"),
                    "horizonte":               precio_row.get("horizonte"),
                    "liquidez":                precio_row.get("liquidez"),
                    "liquidez_dias":           precio_row.get("liquidez_dias"),
                    "minimo_suscripcion":      precio_row.get("minimo_suscripcion"),
                    "honorarios_sg":           precio_row.get("honorarios_sg"),
                    "honorarios_sd":           precio_row.get("honorarios_sd"),
                    "gastos_gestion":          precio_row.get("gastos_gestion"),
                    "comision_suscripcion":    precio_row.get("comision_suscripcion"),
                    "comision_rescate":        precio_row.get("comision_rescate"),
                    "comision_transferencia":  precio_row.get("comision_transferencia"),
                    # comision_admin = honorarios_sg (campo legacy que espera el frontend)
                    "comision_admin":          precio_row.get("honorarios_sg"),
                })

            # Ordenar por score descendente
            result.sort(key=lambda x: x["score"], reverse=True)
            return result

        except Exception as e:
            print(f"Error en get_fcis: {e}")
            return []

    # ------------------------------------------------------------------
    # INSTRUMENT DETAIL (para InvestmentIntelligence)
    # ------------------------------------------------------------------

    def get_instrument_data(self, ticker: str) -> Optional[Dict]:
        """Busca un instrumento en todas las tablas y devuelve datos combinados con precio y métricas calculadas."""
        ticker = ticker.upper()
        tablas = [
            ("instrumentos_bonos", "Bono Soberano"),
            ("instrumentos_ons", "ON Corporativa"),
            ("instrumentos_letras", "Letra"),
            ("instrumentos_bopreal", "BOPREAL"),
        ]
        for tabla, tipo_default in tablas:
            try:
                resp = self.client.table(tabla).select("*").eq("ticker", ticker).execute()
                if resp.data:
                    inst = resp.data[0]

                    # ── Precio ────────────────────────────────────────────────
                    resp_p = self.client.table("precios_hoy").select("*").eq("ticker", ticker).execute()
                    precio_row = resp_p.data[0] if resp_p.data else {}
                    price = float(precio_row.get("precio") or 0)
                    currency = precio_row.get("moneda") or inst.get("moneda_emision") or "USD"

                    # ── Cashflows ─────────────────────────────────────────────
                    resp_cf = self.client.table("cashflows").select("*").eq("ticker", ticker).order("fecha_pago").execute()
                    cash_flows_raw = [{
                        "fecha": self._format_fecha(cf.get("fecha_pago")),
                        "monto": self._normalize_monto(float(cf.get("monto_pago") or 0)),
                        "tipo": cf.get("tipo_pago", "Cupón"),
                        "moneda": cf.get("moneda_pago", "USD"),
                    } for cf in resp_cf.data]

                    # ── Calcular residual por fila ─────────────────────────────
                    # Residual = suma de AMORTIZACION posteriores a esta fecha
                    amort_rows = [
                        (cf["fecha"], cf["monto"])
                        for cf in cash_flows_raw
                        if "AMORT" in cf["tipo"].upper()
                    ]
                    total_amort = sum(m for _, m in amort_rows)

                    cash_flows = []
                    acum_amort = 0.0
                    for cf in cash_flows_raw:
                        residual = None
                        if "AMORT" in cf["tipo"].upper():
                            acum_amort += cf["monto"]
                            residual = round((total_amort - acum_amort) * 100, 4)
                        cash_flows.append({**cf, "residual": residual})

                    # ── Histórico de precios ───────────────────────────────────
                    resp_hist = self.client.table("precios_historicos")\
                        .select("precio,fecha_registro")\
                        .eq("ticker", ticker)\
                        .order("fecha_registro", desc=False)\
                        .limit(30)\
                        .execute()
                    historical = [
                        {"price": float(h["precio"]), "date": str(h["fecha_registro"])}
                        for h in resp_hist.data if h.get("precio")
                    ]

                    # ── FX rates para conversión ──────────────────────────────
                    fx_rates = self._get_fx_rates()
                    mep_rate = fx_rates.get("bolsa", 0)

                    # ── Tipo de instrumento ───────────────────────────────────
                    sub_clase = (inst.get("sub_clase_activo") or "").upper().strip()
                    is_cer = sub_clase == "CER"
                    is_dollar_linked = sub_clase == "DOLLAR_LINKED"
                    is_letra = tipo_default == "Letra"

                    # ── Precio para cálculos (convertido si es Hard Dollar en ARS) ──
                    price_for_calc = price
                    if is_dollar_linked and fx_rates.get("oficial", 0) > 0:
                        if cash_flows and currency == "ARS" and price > 1000:
                            price_for_calc = price / fx_rates["oficial"]
                    elif not is_cer and cash_flows and currency == "ARS" and mep_rate > 0:
                        cf_moneda = (cash_flows[0].get("moneda") or "USD").upper()
                        if cf_moneda == "USD" and price > 1000:
                            price_for_calc = price / mep_rate

                    # ── Estructura de pago (derivada de cashflows) ────────────
                    tiene_amort = any(
                        "AMORT" in (cf.get("tipo_pago") or "").upper()
                        for cf in resp_cf.data
                    )
                    estructura = "Amortizable" if tiene_amort else "Bullet"

                    # ── Próximo pago (primer cashflow futuro) ─────────────────
                    proximo_pago = None
                    for cf in resp_cf.data:
                        fecha_cf = self._parse_date_raw(cf.get("fecha_pago"))
                        if fecha_cf and fecha_cf > today:
                            proximo_pago = {
                                "fecha": self._format_fecha(cf.get("fecha_pago")),
                                "monto": self._normalize_monto(float(cf.get("monto_pago") or 0)),
                                "tipo": cf.get("tipo_pago", ""),
                                "moneda": cf.get("moneda_pago", "USD"),
                            }
                            break

                    today = datetime.now()
                    capital_residual = 0.0
                    proximos_pagos_renta = []
                    for cf in resp_cf.data:
                        fecha_cf = self._parse_date_raw(cf.get("fecha_pago"))
                        if fecha_cf and fecha_cf > today:
                            tipo_cf = (cf.get("tipo_pago") or "").upper()
                            monto_cf = float(cf.get("monto_pago") or 0)
                            if "AMORT" in tipo_cf:
                                capital_residual += monto_cf
                            if "RENTA" in tipo_cf or "CUP" in tipo_cf:
                                proximos_pagos_renta.append((fecha_cf, monto_cf))

                    # ── Current Yield (suma RENTA próximos 12 meses / precio) ─
                    current_yield = None
                    if price_for_calc > 0 and proximos_pagos_renta:
                        cutoff_12m = today + timedelta(days=365)
                        renta_12m = sum(m for f, m in proximos_pagos_renta if f <= cutoff_12m)
                        if renta_12m > 0:
                            current_yield = round((renta_12m * 100 / price_for_calc) * 100, 2)

                    # ── TIR ───────────────────────────────────────────────────
                    engine = FinanceEngine()
                    tir = 0.0
                    if price_for_calc > 0 and cash_flows:
                        try:
                            tir = engine.calculate_tir(cash_flows, price_for_calc)
                        except Exception:
                            tir = 0.0

                    # ── Duration ──────────────────────────────────────────────
                    mac_dur = 0.0
                    mod_dur = 0.0
                    if tir != 0.0 and price_for_calc > 0 and cash_flows:
                        try:
                            dur = engine.calculate_duration(cash_flows, tir, price_for_calc)
                            mac_dur = dur.get("macaulay_duration", 0.0)
                            mod_dur = dur.get("modified_duration", 0.0)
                        except Exception:
                            pass

                    # ── Métricas de valuación (clean, IC, VT, paridad) ────────
                    parity = 0.0
                    clean_price = 0.0
                    accrued_interest = 0.0
                    technical_value = 0.0
                    if price_for_calc > 0 and cash_flows:
                        try:
                            metrics = engine.calculate_bond_metrics(
                                cash_flows,
                                price_for_calc,
                                instrument_type=sub_clase if sub_clase else ("LETRA" if is_letra else "HARD_DOLLAR"),
                                fx_rates=fx_rates
                            )
                            parity = metrics.get("parity") or 0.0
                            if parity > 0 and parity <= 3.0:
                                parity = parity * 100.0
                            parity = round(parity, 2)

                            was_converted = (price_for_calc != price) and (mep_rate > 0 or fx_rates.get("oficial", 0) > 0)
                            if was_converted:
                                fx_used = mep_rate if not is_dollar_linked else fx_rates.get("oficial", mep_rate)
                                clean_price      = round((metrics.get("clean_price") or 0.0) * fx_used, 2)
                                accrued_interest = round((metrics.get("accrued_interest") or 0.0) * fx_used, 2)
                                technical_value  = round((metrics.get("technical_value") or 0.0) * fx_used, 2)
                            else:
                                clean_price      = round(metrics.get("clean_price") or 0.0, 2)
                                accrued_interest = round(metrics.get("accrued_interest") or 0.0, 2)
                                technical_value  = round(metrics.get("technical_value") or 0.0, 2)
                        except Exception as e:
                            print(f"[WARN] métricas fallaron para {ticker}: {e}")

                    return {
                        "ticker": ticker,
                        "nombre": inst.get("nombre"),
                        "tipo": sub_clase or tipo_default,
                        "emisor": inst.get("emisor"),
                        "legislacion": inst.get("legislacion"),
                        "moneda_emision": inst.get("moneda_emision"),
                        "fecha_emision": self._format_fecha(inst.get("fecha_emision")),
                        "fecha_vencimiento": self._format_fecha(inst.get("fecha_vencimiento")),
                        "estado": inst.get("estado"),
                        "estructura": estructura,
                        "proximo_pago": proximo_pago,
                        # Precio
                        "price": price,
                        "dirty_price": price,
                        "currency": currency,
                        "source": precio_row.get("fuente") or "Supabase",
                        "updated_at": str(precio_row.get("updated_at") or ""),
                        # Calculados desde cashflows
                        "capital_residual": round(capital_residual, 4),
                        "current_yield": current_yield,
                        "tir": tir,
                        "modified_duration": mod_dur,
                        "macaulay_duration": mac_dur,
                        # Valuación
                        "parity": parity,
                        "clean_price": clean_price,
                        "accrued_interest": accrued_interest,
                        "technical_value": technical_value,
                        # Cashflows y histórico
                        "cash_flow": cash_flows,
                        "historical_prices": historical,
                    }
            except Exception as e:
                print(f"Error buscando {ticker} en {tabla}: {e}")
        return None

    def _parse_date_raw(self, value) -> Optional[datetime]:
        """Parsea una fecha raw de Supabase a datetime."""
        if not value:
            return None
        s = str(value)[:10]  # tomar solo YYYY-MM-DD
        try:
            return datetime.strptime(s, "%Y-%m-%d")
        except Exception:
            return None

    # ------------------------------------------------------------------
    # MARKET DATA CONSOLIDADO (para /api/v1/market-data)
    # ------------------------------------------------------------------

    def get_market_data(self) -> Dict:
        bonos = self.get_bonos()
        letras = self.get_letras()
        bopreal = self.get_bopreal()
        ons = self.get_ons()
        cauciones = self.get_cauciones()
        fcis = self.get_fcis()
        def _max_date(items: List[Dict], field: str) -> str:
            dates = [i.get(field) for i in items if i.get(field)]
            if not dates: return "N/A"
            # Some dates might be ISO strings, simple max() string comparison works well enough
            return str(max(str(d) for d in dates))

        all_rf = bonos + letras + bopreal + ons
        last_update_bonos = _max_date(all_rf, "updated_at")
        last_update_cauciones = _max_date(cauciones, "fecha_actualizacion")
        last_update_fcis = _max_date(fcis, "updated_at")

        return {
            "bonos": bonos,
            "letras": letras,
            "bopreal": bopreal,
            "ons": ons,
            "cauciones": cauciones,
            "fcis": fcis,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "total_bonos": len(bonos),
                "total_letras": len(letras),
                "total_bopreal": len(bopreal),
                "total_ons": len(ons),
                "total_cauciones": len(cauciones),
                "total_fcis": len(fcis),
                "last_update_bonos": last_update_bonos,
                "last_update_cauciones": last_update_cauciones,
                "last_update_fcis": last_update_fcis,
            }
        }

    # ------------------------------------------------------------------
    # TC y MACRO (para FinancialTicker y panel macro)
    # ------------------------------------------------------------------

    def get_tc_hoy(self) -> List[Dict]:
        """Lee tc_hoy para el FinancialTicker."""
        try:
            resp = self.client.table("tc_hoy").select("*").execute()
            return resp.data or []
        except Exception as e:
            print(f"Error en get_tc_hoy: {e}")
            return []

    def get_macros_hoy(self) -> List[Dict]:
        """Lee macros_hoy (riesgo país, plazo fijo por banco)."""
        try:
            resp = self.client.table("macros_hoy").select("*").execute()
            data = resp.data or []
            
            # Limpiar duplicados de riesgo pais quedandonos con el ultimo
            riesgo_pais_rows = [r for r in data if r.get("tipo") == "riesgo_pais" and r.get("valor")]
            if len(riesgo_pais_rows) > 1:
                # Ordenar de mas reciente a mas lejano
                riesgo_pais_rows.sort(key=lambda x: x.get("fecha") or "", reverse=True)
                # Mantener solo el mas reciente (0), remover el resto
                a_eliminar = riesgo_pais_rows[1:]
                data = [r for r in data if r not in a_eliminar]
                
            return data
        except Exception as e:
            print(f"Error en get_macros_hoy: {e}")
            return []

    def get_macros_historico(self, indicador: Optional[str] = None, limit: int = 365) -> List[Dict]:
        """Lee macros (histórico de inflación, riesgo país, UVA, etc.)."""
        try:
            q = self.client.table("macros").select("*").order("fecha", desc=False).limit(limit)
            if indicador:
                q = q.eq("indicador", indicador)
            resp = q.execute()
            return resp.data or []
        except Exception as e:
            print(f"Error en get_macros_historico: {e}")
            return []

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    def _format_fecha(self, value) -> Optional[str]:
        """Convierte fecha ISO a DD/MM/YYYY para el frontend."""
        if not value:
            return None
        try:
            d = datetime.fromisoformat(str(value))
            return d.strftime("%d/%m/%Y")
        except Exception:
            return str(value)

    def _derivar_categoria(self, tipo: str) -> str:
        """Deriva categoría legible desde el tipo interno (MM/RF/RV/MIXTO)."""
        tipo_upper = (tipo or "").upper()
        if "MM" in tipo_upper or "MONEY" in tipo_upper:
            return "Money Market"
        elif "RV" in tipo_upper or "RENTA VARIABLE" in tipo_upper:
            return "Renta Variable"
        elif "MIXTO" in tipo_upper:
            return "Mixto"
        return "Renta Fija"