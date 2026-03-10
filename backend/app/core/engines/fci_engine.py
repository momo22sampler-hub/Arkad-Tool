import numpy as np
from typing import List, Dict, Optional
from datetime import datetime



# ── Pesos de scoring por categoría ───────────────────────────────────────────
# Money Market  → premiar estabilidad; ignorar momentum
# Renta Fija    → balance retorno / riesgo
# Mixto         → momentum más relevante que RF
# Renta Variable → momentum dominante; volatilidad menos penalizada
WEIGHTS = {
    "Money Market": {
        "tea":         0.10,
        "momentum":    0.00,
        "volatility":  0.35,
        "drawdown":    0.15,
        "consistency": 0.40,
    },
    "Renta Fija": {
        "tea":        0.40,
        "momentum":   0.25,
        "volatility": 0.20,
        "drawdown":   0.15,
    },
    "Mixto": {
        "tea":        0.25,
        "momentum":   0.35,
        "volatility": 0.25,
        "drawdown":   0.15,
    },
    "Renta Variable": {
        "tea":        0.30,
        "momentum":   0.45,
        "volatility": 0.10,
        "drawdown":   0.15,
    },
}

# Fallback para categorías no reconocidas (modelo original)
WEIGHTS_DEFAULT = {
    "tea":        0.35,
    "momentum":   0.30,
    "volatility": 0.25,
    "drawdown":   0.10,
}

class FCIEngine:
    def calculate_returns(self, nav_series: List[float]) -> List[float]:
        returns = []
        for i in range(1, len(nav_series)):
            if nav_series[i-1] > 0:
                r = (nav_series[i] / nav_series[i-1]) - 1
                returns.append(r)
        return returns

    def calculate_volatility(self, returns: List[float]) -> float:
        if not returns:
            return 0.0
        return float(np.std(returns) * np.sqrt(252))

    def calculate_drawdown(self, nav_series: List[float]) -> float:
        if not nav_series:
            return 0.0
        peak = nav_series[0]
        max_dd = 0
        for v in nav_series:
            if v > peak:
                peak = v
            dd = (v - peak) / peak
            if dd < max_dd:
                max_dd = dd
        return abs(max_dd)

    def calculate_momentum(self, nav_series: List[float], days: int = 10) -> float:
        if len(nav_series) < days:
            return 0.0
        base = nav_series[-days]
        if base == 0:
            return 0.0
        return (nav_series[-1] / base) - 1

    def calculate_tea(self, nav_series: List[float], fechas: Optional[List[str]] = None) -> float:
        """
        Calcula la TEA usando los dias calendario reales entre el primer y ultimo
        registro de la ventana. Esto corrige el bug donde se usaba el conteo de
        registros como si cada uno fuera exactamente 1 dia calendario, lo que
        inflaba la TEA en fondos con gaps de datos (fines de semana, feriados,
        dias sin datos del proveedor).

        Si no se proveen fechas, usa el conteo de registros como fallback.
        """
        if len(nav_series) < 25:
            return 0.0
        window = min(30, len(nav_series))
        base = nav_series[-window]
        if base == 0:
            return 0.0
        r = (nav_series[-1] / base) - 1

        # Calcular dias calendario reales si hay fechas disponibles
        dias_reales = window  # fallback
        if fechas and len(fechas) >= window:
            try:
                fecha_base = datetime.strptime(fechas[-window], "%Y-%m-%d")
                fecha_fin = datetime.strptime(fechas[-1], "%Y-%m-%d")
                diff = (fecha_fin - fecha_base).days
                if diff > 0:
                    dias_reales = diff
            except (ValueError, IndexError):
                pass  # fallback a conteo de registros

        tea = (1 + r) ** (365 / dias_reales) - 1
        return tea

    def calculate_score(self, metrics: Dict, categoria: str = "") -> float:
        """
        Score ponderado por categoría. Cada tipo de fondo tiene pesos distintos
        que reflejan su perfil de riesgo:
          - Money Market:   estabilidad > retorno; momentum ignorado
          - Renta Fija:     balance TEA / riesgo
          - Mixto:          momentum relevante
          - Renta Variable: momentum dominante; menor penalización por vol

        Fórmula base:
            score = tea*w_tea + momentum*w_mom
                  + (1-volatility)*w_vol + (1-drawdown)*w_dd
                  [+ (1-volatility)*w_consistency  — solo Money Market]
        """
        tea        = metrics["tea"]
        momentum   = metrics["momentum"]
        volatility = metrics["volatility"]
        drawdown   = metrics["drawdown"]

        w = WEIGHTS.get(categoria, WEIGHTS_DEFAULT)

        if categoria == "Money Market":
            score = (
                w["tea"]         * tea
                + w["volatility"]  * (1.0 - volatility)
                + w["drawdown"]    * (1.0 - drawdown)
                + w["consistency"] * (1.0 - volatility)
            )
        else:
            score = (
                w["tea"]        * tea
                + w["momentum"] * momentum
                + w["volatility"] * (1.0 - volatility)
                + w["drawdown"]   * (1.0 - drawdown)
            )

        return round(score * 100, 2)

    def analyze_fci(self, fondo: str, nav_series: List[float], fechas: Optional[List[str]] = None, categoria: str = "") -> Dict:
        # IMPORTANTE: nav_series debe llegar ordenada por fecha desde rank_fcis.
        # NO ordenar por valor numerico — para RV con caidas eso reordena mal la serie.
        returns = self.calculate_returns(nav_series)
        volatility = self.calculate_volatility(returns)
        drawdown = self.calculate_drawdown(nav_series)
        momentum = self.calculate_momentum(nav_series)
        tea = self.calculate_tea(nav_series, fechas)
        metrics = {
            "tea": round(tea, 6),
            "momentum": round(momentum, 6),
            "volatility": round(volatility, 6),
            "drawdown": round(drawdown, 6),
        }
        score = self.calculate_score(metrics, categoria=categoria)
        return {
            "fondo": fondo,
            "score": score,
            "metrics": metrics,
        }

    def rank_fcis(self, fondos_data: Dict[str, List[float]], fondos_fechas: Optional[Dict[str, List[str]]] = None, fondos_categorias: Optional[Dict[str, str]] = None) -> List[Dict]:
        results = []
        for fondo, nav_series in fondos_data.items():
            if len(nav_series) < 25:
                continue
            fechas = fondos_fechas.get(fondo) if fondos_fechas else None
            categoria = fondos_categorias.get(fondo, "") if fondos_categorias else ""
            analysis = self.analyze_fci(fondo, nav_series, fechas, categoria=categoria)
            results.append(analysis)
        results.sort(key=lambda x: x["score"], reverse=True)
        return results