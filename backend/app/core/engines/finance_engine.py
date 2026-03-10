"""
FinanceEngine — Motor de cálculo de renta fija argentina.

Implementa el patrón Strategy para separar la lógica de valuación
según el tipo de instrumento (sub_clase_activo):

  - HardDollar    → AL30, GD30, GD35, ONs dolarizadas
  - DollarLinked  → YMCWO, TV24 (usan Dólar Oficial A3500)
  - CER           → DICP, CUAP, TX26, TZX26  
  - Badlar / TM20 → PBA25, ONs Badlar
  - ZeroCoupon    → Letras a descuento (IC = 0)

Convención: ACT/365 para todas las operaciones de tiempo.
Base VN = 1.0 (los cashflows en Supabase están normalizados a VN=1).
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> Optional[datetime]:
    for fmt in ('%d/%m/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(date_str, fmt)
        except (ValueError, TypeError):
            continue
    return None


def _parse_cashflows(cash_flows: List[Dict], settle_dt: datetime):
    """
    Parsea y separa los cashflows en pasados y futuros.
    Retorna (past_cfs, future_renta_cfs, future_amort_cfs)
    donde cada elemento es (datetime, float, str).
    """
    parsed = []
    for cf in cash_flows:
        dt = _parse_date(str(cf.get('fecha', '')))
        if not dt:
            continue
        monto = float(cf.get('monto', 0) or 0)
        tipo = str(cf.get('tipo', 'CUPON')).upper()
        parsed.append((dt, monto, tipo))

    parsed.sort(key=lambda x: x[0])

    past = [c for c in parsed if c[0] <= settle_dt]
    future_renta = [c for c in parsed if c[0] > settle_dt and
                    any(k in c[2] for k in ('RENTA', 'CUP', 'INTERES'))]
    future_amort = [c for c in parsed if c[0] > settle_dt and 'AMORT' in c[2]]

    return past, future_renta, future_amort


def _calc_vr(past_amort_sum: float, all_future_amort: List) -> float:
    """
    Valor Residual como suma de amortizaciones futuras.
    En base VN=1, el VR = suma de amorts futuras pendientes.
    """
    return sum(m for _, m, _ in all_future_amort)


def _calc_ic(settle_dt: datetime,
             past_cfs: List,
             future_renta_cfs: List) -> float:
    """
    Calcula el Interés Corrido por interpolación proporcional entre el
    último pago y el próximo.

    Cuando el cashflow sólo tiene AMORTIZACION (como AL30), usamos
    como proxy de cupón: next_amort * tasa_implícita ≈ 0.
    En esos casos el IC real debe deducirse de la estructura del bono,
    pero como no tenemos la tasa por separado, mantenemos IC=0 y
    reportamos Clean = Dirty (conservador, no erróneo).

    Retorna IC en la misma unidad que los cashflows (base VN=1).
    """
    if not future_renta_cfs:
        return 0.0

    next_dt, next_monto, next_tipo = future_renta_cfs[0]

    # Si el próximo flujo es AMORTIZACION (no RENTA), el IC
    # representaría un porcentaje del capital que no es el cupón.
    # En ese caso no calculamos IC proporcional para no introducir
    # un error de signo (evita Clean > Dirty).
    if 'AMORT' in next_tipo and 'RENTA' not in next_tipo:
        return 0.0

    # Fecha base: último pago de cualquier tipo
    if past_cfs:
        prev_dt = past_cfs[-1][0]
    else:
        if len(future_renta_cfs) > 1:
            period_days = abs((future_renta_cfs[1][0] - next_dt).days)
        else:
            period_days = 182  # fallback semestral
        prev_dt = next_dt - timedelta(days=period_days)

    days_total = (next_dt - prev_dt).days
    days_elapsed = (settle_dt - prev_dt).days

    if days_total <= 0 or days_elapsed < 0:
        return 0.0

    # IC = proporción del cupón devengada hasta hoy
def _infer_ic_from_past_renta(settle_dt: datetime, past_cfs: List,
                               future_amort: List) -> float:
    """
    Para bonos que ya no tienen RENTA futura en la DB (ej: AL30 desde jul-2024),
    infiere el Interés Corrido a partir del último cupón de RENTA pagado.

    Método:
      1. Localizar el último flujo de RENTA y el penúltimo (para inferir período).
      2. Calcular tasa por período = monto_cupon / vr_en_ese_momento.
      3. Devengar esa tasa sobre los días transcurridos desde el último AMORT.
    Retorna IC en la misma base que los cashflows (VN=1).
    """
    past_renta = [(dt, m, t) for dt, m, t in past_cfs if 'RENTA' in t]
    past_amort = [(dt, m, t) for dt, m, t in past_cfs if 'AMORT' in t]

    if not past_renta:
        return 0.0

    # Tomar el último par RENTA + AMORT del pasado para inferir la tasa
    last_renta_dt, last_renta_m, _ = past_renta[-1]

    # Período del cupón: diferencia entre últimos dos RENTA
    if len(past_renta) >= 2:
        prev_renta_dt = past_renta[-2][0]
        period_days = (last_renta_dt - prev_renta_dt).days
    else:
        period_days = 182  # fallback semestral

    if period_days <= 0:
        return 0.0

    # VR aproximado al momento del último cupón
    # (suma de amortizaciones futuras + la que está próxima)
    vr_at_last = sum(m for _, m, _ in future_amort)
    if vr_at_last <= 0:
        return 0.0

    # Tasa por período = cupón / VR (en esa fecha)
    # Para el AL30 la tasa step-up ya está reflejada en los montos históricos
    # Usamos el promedio de los últimos 2 cupón / VR de ese momento
    rate_per_period = last_renta_m / (vr_at_last + sum(m for _, m, _ in past_amort) * 0.5 + 0.001)

    # Base: último AMORT pasado (fecha de ese pago de capital)
    if past_amort:
        base_dt = past_amort[-1][0]
    else:
        base_dt = last_renta_dt

    days_elapsed = (settle_dt - base_dt).days
    if days_elapsed < 0:
        return 0.0

    # IC proporcional al período de cupón
    ic = rate_per_period * vr_at_last * (days_elapsed / period_days)
    return max(0.0, ic)


def _calc_ic(settle_dt: datetime,
             past_cfs: List,
             future_renta_cfs: List) -> float:
    """
    Calcula el Interés Corrido proporcional entre el último pago
    y el próximo cupón de RENTA.

    Retorna IC en la misma unidad que los cashflows (base VN=1).
    """
    if not future_renta_cfs:
        return 0.0

    next_dt, next_monto, next_tipo = future_renta_cfs[0]

    # Si el próximo flujo es AMORTIZACION (no RENTA), no podemos calcular
    # el IC como proporción de ese flujo (sería capital, no interés)
    if 'AMORT' in next_tipo and 'RENTA' not in next_tipo:
        return 0.0

    # Fecha base: buscar el último RENTA pasado para tener el período correcto
    past_renta = [(dt, m, t) for dt, m, t in past_cfs if 'RENTA' in t]
    if past_renta:
        prev_dt = past_renta[-1][0]
    elif past_cfs:
        prev_dt = past_cfs[-1][0]
    else:
        if len(future_renta_cfs) > 1:
            period_days = abs((future_renta_cfs[1][0] - next_dt).days)
        else:
            period_days = 182
        prev_dt = next_dt - timedelta(days=period_days)

    days_total = (next_dt - prev_dt).days
    days_elapsed = (settle_dt - prev_dt).days

    if days_total <= 0 or days_elapsed < 0:
        return 0.0

    ic = next_monto * (days_elapsed / days_total)
    return max(0.0, ic)


def _safe_metrics(dirty_price: float) -> Dict[str, Any]:
    """Retorna métricas vacías/neutras cuando no se puede calcular."""
    return {
        "clean_price": round(dirty_price, 4) if dirty_price else 0.0,
        "accrued_interest": 0.0,
        "technical_value": None,
        "parity": None,
        "residual_value": None,
        "calc_notes": "Sin cashflows suficientes para calcular"
    }


# ---------------------------------------------------------------------------
# Estrategias de valuación
# ---------------------------------------------------------------------------

class _HardDollarStrategy:
    """
    Bonos Hard Dollar: AL30, GD30, GD35, ONs dolarizadas.
    
    - dirty_price ya está en USD (si venía en ARS, el caller dividió por MEP)
    - IC en USD, se resta al dirty para obtener clean
    - VT = VR + IC (base VN=1)
    - Paridad = dirty_price / VT * 100
    
    Para bonos como AL30 que ya no tienen RENTA futura en la DB:
    usa _infer_ic_from_past_renta para calcular IC desde la tasa implícita.
    """
    def calc(self, dirty_price: float, cash_flows: List[Dict],
             settle_dt: datetime, fx_rates: Dict = None) -> Dict[str, Any]:
        past, future_renta, future_amort = _parse_cashflows(cash_flows, settle_dt)
        vr = _calc_vr(None, future_amort)

        # Intentar IC desde RENTA futura (caso normal: CUAP, bonos con cupones)
        ic = _calc_ic(settle_dt, past, future_renta)

        # Si no hay IC (future_renta vacía o próximo es solo AMORT), inferir
        # desde el último RENTA histórico (caso AL30/GD30 post-mid 2024)
        if ic == 0.0:
            ic = _infer_ic_from_past_renta(settle_dt, past, future_amort)

        clean_price = dirty_price - ic
        # Guardrail: Clean nunca puede superar al Dirty
        if clean_price > dirty_price or clean_price < 0:
            print(f"[WARN HardDollar] clean={clean_price:.4f} inválido vs dirty={dirty_price:.4f} — forzando IC=0")
            clean_price = dirty_price
            ic = 0.0

        vt = vr + ic if vr > 0 else None
        parity = (dirty_price / vt) * 100 if vt and vt > 0 else None

        return {
            "clean_price": round(float(clean_price), 4),
            "accrued_interest": round(float(ic), 4),
            "technical_value": round(float(vt), 4) if vt is not None else None,
            "parity": round(float(parity), 2) if parity is not None else None,
            "residual_value": round(float(vr), 4),
            "calc_notes": "HardDollar ACT/365"
        }


class _DollarLinkedStrategy:
    """
    Bonos Dollar Linked: YMCWO, TV24.
    
    Usan el Dólar Oficial BCRA (A3500), nunca MEP.
    Si no hay cashflows, retorna N/D.
    """
    def calc(self, dirty_price: float, cash_flows: List[Dict],
             settle_dt: datetime, fx_rates: Dict = None) -> Dict[str, Any]:
        if not cash_flows:
            notes = "DollarLinked: sin cashflows en DB → métricas N/D"
            return {**_safe_metrics(dirty_price), "calc_notes": notes}

        # Para instrumentos Dollar-Linked el precio en pesos se convierte
        # al oficial para calcular métricas en USD-linked
        oficial = (fx_rates or {}).get('oficial', 0)
        price_usd_linked = dirty_price / oficial if oficial > 0 else dirty_price

        past, future_renta, future_amort = _parse_cashflows(cash_flows, settle_dt)
        vr = _calc_vr(None, future_amort)
        ic = _calc_ic(settle_dt, past, future_renta)

        clean_linked = price_usd_linked - ic
        if clean_linked > price_usd_linked:
            clean_linked = price_usd_linked
            ic = 0.0

        # Reconvertir a pesos
        clean_price = clean_linked * oficial if oficial > 0 else clean_linked
        ic_ars = ic * oficial if oficial > 0 else ic

        vt_linked = vr + ic if vr > 0 else None
        vt_ars = vt_linked * oficial if vt_linked and oficial > 0 else None
        parity = (dirty_price / vt_ars) * 100 if vt_ars and vt_ars > 0 else None

        return {
            "clean_price": round(clean_price, 2),
            "accrued_interest": round(ic_ars, 2),
            "technical_value": round(vt_ars, 2) if vt_ars is not None else None,
            "parity": round(parity, 2) if parity is not None else None,
            "residual_value": round(vr, 4),
            "calc_notes": f"DollarLinked via Oficial={oficial}"
        }


class _CerStrategy:
    """
    Bonos CER: DICP, CUAP, TX26, TZX26.
    
    - El precio ya está en ARS (no se convierte por FX)
    - Los cashflows están en USD histórico nominal → se tratan como
      proporciones para calcular IC relativo (ya que no hay coeficiente CER)
    - VT aproximado: sin ajuste CER exacto (requeriría el índice del BCRA)
    - Paridad = Precio_Dirty / VT
    """
    def calc(self, dirty_price: float, cash_flows: List[Dict],
             settle_dt: datetime, fx_rates: Dict = None) -> Dict[str, Any]:
        if not cash_flows:
            return {**_safe_metrics(dirty_price), "calc_notes": "CER: sin cashflows"}

        past, future_renta, future_amort = _parse_cashflows(cash_flows, settle_dt)

        # Para CER el VR es la fracción de flujos de amortización futuros
        # sobre el total emitido (estimado como suma de amortizaciones totales)
        all_amort = [c for c in past if 'AMORT' in c[2]] + future_amort
        total_amort = sum(m for _, m, _ in all_amort) if all_amort else 0
        future_amort_sum = sum(m for _, m, _ in future_amort)

        # VR normalizado: porcentaje del capital pendiente
        vr_pct = (future_amort_sum / total_amort) if total_amort > 0 else 1.0

        # IC como proporción del próximo cupón.
        # Para CER: los cashflows y el precio YA están en ARS (no hay conversión FX).
        # Si los cashflows figuran como 'moneda_pago=USD' pero son valores históricos
        # nominales del 2004, sus montos son ridículamente pequeños en USD pero
        # ya se comparan contra dirty_price en ARS → NO multiplicar por MEP.
        ic_raw = _calc_ic(settle_dt, past, future_renta)

        # Guardrail: el IC nunca puede ser mayor que el 15% del precio dirty
        # (preveiene bugs cuando los cashflows tienen unidades inconsistentes)
        max_ic = dirty_price * 0.15
        ic_ars = min(ic_raw, max_ic)

        # VT aproximado: escalar dirty_price por la fracción del VR
        # (sin índice CER del BCRA, es la mejor aproximación disponible)
        vt = dirty_price / vr_pct if vr_pct > 0 else None

        clean_price = dirty_price - ic_ars
        if clean_price > dirty_price:
            clean_price = dirty_price
            ic_ars = 0.0

        parity = (dirty_price / vt) * 100 if vt and vt > 0 else None

        return {
            "clean_price": round(clean_price, 2),
            "accrued_interest": round(ic_ars, 2),
            "technical_value": round(vt, 2) if vt is not None else None,
            "parity": round(parity, 2) if parity is not None else None,
            "residual_value": round(vr_pct * 100, 2),
            "calc_notes": "CER: approx sin índice BCRA"
        }


class _BadlarStrategy:
    """
    Bonos Badlar/TM20: PBA25, sub-soberanos, ONs Badlar.
    
    El cupón flotante se proyecta usando la tasa vigente en los cashflows.
    Si los cashflows ya tienen el monto calculado, se usa directamente.
    """
    def calc(self, dirty_price: float, cash_flows: List[Dict],
             settle_dt: datetime, fx_rates: Dict = None) -> Dict[str, Any]:
        if not cash_flows:
            return {**_safe_metrics(dirty_price), "calc_notes": "Badlar: sin cashflows"}

        past, future_renta, future_amort = _parse_cashflows(cash_flows, settle_dt)
        vr = _calc_vr(None, future_amort)
        ic = _calc_ic(settle_dt, past, future_renta)

        clean_price = dirty_price - ic
        if clean_price > dirty_price:
            clean_price = dirty_price
            ic = 0.0

        vt = vr + ic if vr > 0 else None
        parity = (dirty_price / vt) * 100 if vt and vt > 0 else None

        return {
            "clean_price": round(clean_price, 4),
            "accrued_interest": round(ic, 4),
            "technical_value": round(vt, 4) if vt is not None else None,
            "parity": round(parity, 2) if parity is not None else None,
            "residual_value": round(vr, 4),
            "calc_notes": "Badlar/TM20 ACT/365"
        }


class _ZeroCouponStrategy:
    """
    Letras a descuento y otros Zero Coupon.
    
    - IC = 0 (no pagan cupones intermedios)
    - Clean Price = Dirty Price
    - VT = 1.0 (valor nominal a vencimiento)
    - Paridad = Dirty / 1.0 * 100
    """
    def calc(self, dirty_price: float, cash_flows: List[Dict],
             settle_dt: datetime, fx_rates: Dict = None) -> Dict[str, Any]:
        # VT = VR en vencimiento = 1.0 (base VN=1) o la suma de amortizaciones
        past, _, future_amort = _parse_cashflows(cash_flows, settle_dt)
        vr = _calc_vr(None, future_amort)
        if vr <= 0:
            vr = 1.0  # fallback para zero coupon puro

        parity = (dirty_price / vr) * 100 if vr > 0 else None

        return {
            "clean_price": round(dirty_price, 4),
            "accrued_interest": 0.0,
            "technical_value": round(vr, 4),
            "parity": round(parity, 2) if parity is not None else None,
            "residual_value": round(vr, 4),
            "calc_notes": "ZeroCoupon: IC=0"
        }


# ---------------------------------------------------------------------------
# Mapeo tipo → estrategia
# ---------------------------------------------------------------------------

_STRATEGY_MAP = {
    "HARD_DOLLAR":   _HardDollarStrategy(),
    "DOLLAR_LINKED": _DollarLinkedStrategy(),
    "CER":           _CerStrategy(),
    "BADLAR":        _BadlarStrategy(),
    "TM20":          _BadlarStrategy(),
    "TAMAR":         _BadlarStrategy(),
    "LETRA":         _ZeroCouponStrategy(),
    "LECAP":         _ZeroCouponStrategy(),
    "BONCAP":        _ZeroCouponStrategy(),
    "BOPREAL":       _HardDollarStrategy(),
    # ONs: por defecto Hard Dollar (la mayoría lo son)
    "ON":            _HardDollarStrategy(),
}

_DEFAULT_STRATEGY = _HardDollarStrategy()


# ---------------------------------------------------------------------------
# FinanceEngine principal
# ---------------------------------------------------------------------------

class FinanceEngine:
    """
    Motor de cálculo para valuación de bonos y ONs.
    No usa bibliotecas financieras externas — implementación propia.
    Convención unificada: ACT/365.
    Base de cashflows: VN = 1.0 (normalizado en Supabase).
    """

    def calculate_bond_metrics(
        self,
        cash_flows: List[Dict],
        dirty_price: float,
        instrument_type: str = "HARD_DOLLAR",
        fx_rates: Dict = None,
        settlement_date: str = None
    ) -> Dict[str, Any]:
        """
        Calcula Clean Price, Interés Corrido, Valor Técnico y Paridad
        usando la estrategia correcta según el tipo de instrumento.

        Args:
            cash_flows:       Lista de {fecha, monto, tipo} en VN=1
            dirty_price:      Precio de mercado (en USD si HD/DL, ARS si CER)
            instrument_type:  sub_clase_activo del instrumento ('HARD_DOLLAR', 'CER', etc.)
            fx_rates:         Dict con 'bolsa' (MEP), 'oficial', 'contadoconliqui' (CCL)
            settlement_date:  Fecha de liquidación DD/MM/YYYY (default: hoy)

        Returns:
            Dict con clean_price, accrued_interest, technical_value, parity, residual_value
        """
        try:
            if settlement_date:
                settle_dt = _parse_date(settlement_date) or datetime.now()
            else:
                settle_dt = datetime.now()

            tipo_norm = (instrument_type or "HARD_DOLLAR").upper().strip()
            strategy = _STRATEGY_MAP.get(tipo_norm, _DEFAULT_STRATEGY)

            result = strategy.calc(dirty_price, cash_flows, settle_dt, fx_rates or {})
            return result

        except Exception as e:
            print(f"[ERROR] calculate_bond_metrics ({instrument_type}): {e}")
            return _safe_metrics(dirty_price)

    # -----------------------------------------------------------------------
    # Métodos legacy (sin cambios — se mantienen para compatibilidad)
    # -----------------------------------------------------------------------

    def calculate_valuation(self, dirty_price: float, residual_capital: float,
                            coupon_rate: float, days_since_last: int,
                            vn: float = 100, periodicity_days: int = 180,
                            base_calc: str = "30/360") -> Dict[str, Any]:
        """Legacy: cálculo parametrizado manual. Usar calculate_bond_metrics() en nuevo código."""
        vr = vn * residual_capital
        periods_per_year = 365.0 / periodicity_days
        period_coupon = (coupon_rate / periods_per_year) * vn
        fraction = days_since_last / 180.0 if base_calc == "30/360" else days_since_last / periodicity_days
        ic = period_coupon * fraction
        clean_price = dirty_price - ic
        vt = vr + ic
        parity = (dirty_price / vr) * 100 if vr > 0 else 0
        return {
            "clean_price": round(clean_price, 2),
            "accrued_interest": round(ic, 2),
            "technical_value": round(vt, 2),
            "parity": round(parity, 1)
        }

    def generate_sensitivity(self, current_price: float, mod_duration: float,
                             tir_range: List[int] = None) -> List[Dict[str, Any]]:
        if tir_range is None:
            tir_range = [-200, -100, -50, 0, 50, 100, 200]
        scenarios = []
        for delta_bps in tir_range:
            delta_yield = delta_bps / 10000
            price_change = -mod_duration * delta_yield * current_price
            new_price = current_price + price_change
            impact_pct = (price_change / current_price) * 100
            scenarios.append({
                "scenario": f"{delta_bps:+d} bps" if delta_bps != 0 else "0%",
                "impact": round(impact_pct, 2),
                "new_price": round(new_price, 2)
            })
        return scenarios

    def calculate_tir(self, cash_flows: List[Dict], price: float,
                      settlement_date: str = None,
                      max_iter: int = 100, tolerance: float = 1e-6) -> float:
        """
        Calcula TIR usando descuento discreto ACT/365.
        Fórmula: Precio = Σ(CF_i / (1 + r)^t_i)
        """
        try:
            settle_dt = _parse_date(settlement_date) if settlement_date else datetime.now()
            if settle_dt is None:
                settle_dt = datetime.now()

            periods, amounts = [], []
            for cf in cash_flows:
                cf_date = _parse_date(str(cf.get('fecha', '')))
                if not cf_date:
                    continue
                days = (cf_date - settle_dt).days
                years = days / 365.0
                if years > 0:
                    periods.append(years)
                    amounts.append(float(cf.get('monto', 0) or 0))

            if not periods or not amounts or price <= 0:
                return 0.0

            def npv(rate):
                if rate <= -1:
                    return float('inf')
                try:
                    return sum(amt / ((1 + rate) ** t) for amt, t in zip(amounts, periods)) - price
                except (OverflowError, ZeroDivisionError):
                    return float('inf')

            def npv_deriv(rate):
                if rate <= -1:
                    return 0
                try:
                    return sum(-t * amt / ((1 + rate) ** (t + 1)) for amt, t in zip(amounts, periods))
                except (OverflowError, ZeroDivisionError):
                    return 0

            total_cf = sum(amounts)
            weighted_time = sum(t * amt for t, amt in zip(periods, amounts)) / total_cf
            rate = (total_cf / price - 1) / weighted_time

            for _ in range(max_iter):
                current_npv = npv(rate)
                if abs(current_npv) < tolerance:
                    break
                derivative = npv_deriv(rate)
                if abs(derivative) < 1e-10:
                    break
                rate_new = rate - current_npv / derivative
                if abs(rate_new - rate) > 0.5:
                    rate_new = rate - 0.5 * np.sign(current_npv)
                rate = max(-0.99, min(10.0, rate_new))

            result = rate * 100
            if not np.isfinite(result):
                result = ((total_cf / price - 1) / weighted_time) * 100
            result = max(-99, min(1000, result))
            return round(float(result), 2)

        except Exception:
            return 0.0

    def calculate_duration(self, cash_flows: List[Dict], tir: float,
                           price: float, settlement_date: str = None) -> Dict[str, float]:
        try:
            settle_dt = _parse_date(settlement_date) if settlement_date else datetime.now()
            if settle_dt is None:
                settle_dt = datetime.now()

            rate = tir / 100.0
            weighted_time = 0.0
            total_pv = 0.0

            for cf in cash_flows:
                cf_date = _parse_date(str(cf.get('fecha', '')))
                if not cf_date:
                    continue
                days = (cf_date - settle_dt).days
                years = days / 365.0
                if years > 0:
                    discount_factor = (1 + rate) ** years
                    pv = float(cf.get('monto', 0) or 0) / discount_factor
                    weighted_time += years * pv
                    total_pv += pv

            if total_pv <= 0:
                return {"macaulay_duration": 0.0, "modified_duration": 0.0}

            macaulay = weighted_time / total_pv
            modified = macaulay / (1 + rate) if rate > -1 else macaulay
            return {
                "macaulay_duration": round(macaulay, 2),
                "modified_duration": round(modified, 2)
            }
        except Exception:
            return {"macaulay_duration": 0.0, "modified_duration": 0.0}

    def generate_cashflow_schedule(self, bond_params: Dict) -> List[Dict[str, Any]]:
        estructura = bond_params.get('estructura')
        vn = bond_params.get('vn', 100)
        tasa = bond_params.get('tasa_cupon', 0)
        periodicidad = bond_params.get('periodicidad', 'Semestral')
        fecha_venc = datetime.strptime(bond_params['fecha_vencimiento'], '%d/%m/%Y')
        freq_months = {'Semestral': 6, 'Trimestral': 3, 'Anual': 12}.get(periodicidad, 6)
        periods_per_year = 12.0 / freq_months
        schedule = []
        current_date = datetime.now()
        payment_date = current_date
        residual = 100.0
        while payment_date < fecha_venc:
            payment_date += timedelta(days=int(freq_months * 30.42))
            if payment_date > fecha_venc:
                payment_date = fecha_venc
            if payment_date <= current_date:
                continue
            cupon = (tasa / periods_per_year) * vn
            amort = vn if estructura == "Bullet" and payment_date >= fecha_venc else (vn * 0.1 if estructura != "Bullet" else 0)
            residual -= (amort / vn) * 100
            residual = max(0, residual)
            schedule.append({
                "fecha": payment_date.strftime('%d/%m/%Y'),
                "tipo": "Capital+Cupón" if amort > 0 else "Cupón",
                "monto": round(cupon + amort, 2),
                "residual": round(residual, 2)
            })
        return schedule

    def get_ai_analysis(self, ticker: str, parity: float,
                        duration: float, tir: float) -> str:
        insights = []
        if parity and parity < 70:
            insights.append(f"{ticker} cotiza con descuento significativo ({parity}%). Evaluar riesgo crediticio.")
        if duration and duration > 5:
            insights.append("Alta sensibilidad a tasas.")
        if tir and tir > 20:
            insights.append("TIR elevada puede reflejar percepción de riesgo o iliquidez.")
        return " ".join(insights) if insights else f"{ticker} presenta características estándar para su categoría."