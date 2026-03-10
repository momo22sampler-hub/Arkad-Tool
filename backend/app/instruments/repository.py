"""
Repositorio de instrumentos contractuales.
Lee desde Supabase en modo READ-ONLY.
Tablas: instrumentos_bonos, instrumentos_ons, instrumentos_letras, instrumentos_bopreal, precios_hoy
"""

import os
from typing import List, Optional
from supabase import create_client, Client
from datetime import datetime

from .models import (
    InstrumentContract,
    InstrumentType,
    DayCount,
    BusinessDayRule
)


class InstrumentRepository:

    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL y SUPABASE_KEY deben estar configurados")
        self.client: Client = create_client(supabase_url, supabase_key)

    # ------------------------------------------------------------------
    # TABLAS DE INSTRUMENTOS
    # ------------------------------------------------------------------
    INSTRUMENT_TABLES = {
        "bonos":   ("instrumentos_bonos",   InstrumentType.BONO),
        "ons":     ("instrumentos_ons",      InstrumentType.ON),
        "letras":  ("instrumentos_letras",   InstrumentType.BONO),   # Tratar como bono
        "bopreal": ("instrumentos_bopreal",  InstrumentType.BONO),
    }

    def get_all_instruments(self) -> List[InstrumentContract]:
        instruments = []
        for key, (table, tipo) in self.INSTRUMENT_TABLES.items():
            try:
                resp = self.client.table(table).select("*").execute()
                for row in resp.data:
                    instruments.append(self._map_row_to_contract(row, tipo))
            except Exception as e:
                print(f"Error leyendo {table}: {e}")
        return instruments

    def get_instrument_by_ticker(self, ticker: str) -> Optional[InstrumentContract]:
        ticker = ticker.upper()
        for key, (table, tipo) in self.INSTRUMENT_TABLES.items():
            try:
                resp = self.client.table(table).select("*").eq("ticker", ticker).execute()
                if resp.data:
                    return self._map_row_to_contract(resp.data[0], tipo)
            except Exception as e:
                print(f"Error buscando {ticker} en {table}: {e}")
        return None

    # ------------------------------------------------------------------
    # MAPPING
    # ------------------------------------------------------------------
    def _map_row_to_contract(self, row: dict, tipo: InstrumentType) -> InstrumentContract:
        issue_date = self._parse_date(row.get("fecha_emision"))
        maturity_date = self._parse_date(row.get("fecha_vencimiento"))

        # day_count y business_day_rule no existen en las tablas actuales
        # Se dejan None hasta que se agreguen las columnas

        tipo_instrumento = tipo
        if row.get("sub_clase_activo"):
            sub = row["sub_clase_activo"].upper()
            if "ON" in sub or "OBLIGACION" in sub:
                tipo_instrumento = InstrumentType.ON

        return InstrumentContract(
            ticker=row.get("ticker"),
            isin=None,                           # No existe en schema actual
            nombre_completo=row.get("nombre"),
            tipo_instrumento=tipo_instrumento,
            issue_date=issue_date,
            accrual_start_date=None,
            maturity_date=maturity_date,
            day_count=None,                      # No existe en schema actual
            business_day_rule=None,              # No existe en schema actual
            settlement_lag=None,                 # No existe en schema actual
            currency=row.get("moneda_emision"),
            ley=row.get("legislacion")
        )

    def _parse_date(self, value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value)).date()
        except Exception:
            return None
