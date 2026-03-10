"""
Modelos de datos contractuales de instrumentos.

NO representa contratos completos.
Representa lo que se conoce HOY.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import date
from enum import Enum


class DayCount(str, Enum):
    """Convenciones de day count"""
    ACT_360 = "ACT/360"
    ACT_365 = "ACT/365"
    THIRTY_360 = "30/360"
    ACT_ACT = "ACT/ACT"


class BusinessDayRule(str, Enum):
    """Reglas de días hábiles"""
    FOLLOWING = "FOLLOWING"
    MODIFIED_FOLLOWING = "MODIFIED_FOLLOWING"
    PRECEDING = "PRECEDING"
    UNADJUSTED = "UNADJUSTED"


class InstrumentType(str, Enum):
    """Tipos de instrumento"""
    BONO = "BONO"
    ON = "ON"
    CAUCION = "CAUCION"
    FCI = "FCI"


class ContractStatus(str, Enum):
    """Estado de completitud del contrato"""
    COMPLETE = "COMPLETE"
    INCOMPLETE = "INCOMPLETE"


class InstrumentContract(BaseModel):
    """
    Modelo interno de contrato.
    
    ⚠️ TODOS los campos son opcionales.
    ⚠️ NO usar valores por defecto.
    ⚠️ Representa lo que se conoce, no lo que debería existir.
    """
    
    ticker: Optional[str] = None
    isin: Optional[str] = None
    nombre_completo: Optional[str] = None
    tipo_instrumento: Optional[InstrumentType] = None
    
    # Fechas contractuales
    issue_date: Optional[date] = None
    accrual_start_date: Optional[date] = None
    maturity_date: Optional[date] = None
    
    # Convenciones
    day_count: Optional[DayCount] = None
    business_day_rule: Optional[BusinessDayRule] = None
    settlement_lag: Optional[int] = None
    
    # Identificación
    currency: Optional[str] = None
    ley: Optional[str] = None


class ContractValidation(BaseModel):
    """
    Resultado de validación contractual.
    
    Determina si un contrato está completo o incompleto
    basándose SOLO en presencia de campos.
    """
    
    ticker: str
    contract_status: ContractStatus
    missing_fields: List[str]
    
    # Campos opcionales para debugging
    has_issue_date: bool = False
    has_maturity_date: bool = False
    has_day_count: bool = False
    has_business_day_rule: bool = False
    has_settlement_lag: bool = False


class InstrumentListItem(BaseModel):
    """
    Item de listado de instrumentos.
    
    Vista resumida para endpoints de listado.
    """
    
    ticker: str
    nombre_completo: Optional[str] = None
    tipo_instrumento: Optional[InstrumentType] = None
    contract_status: ContractStatus
    missing_fields: List[str]


class InstrumentContractDetail(BaseModel):
    """
    Detalle completo del contrato.
    
    Vista expandida para endpoint de detalle.
    """
    
    contract: InstrumentContract
    validation: ContractValidation