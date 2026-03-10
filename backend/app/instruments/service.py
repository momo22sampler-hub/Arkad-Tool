"""
Servicio de validación contractual.

Determina si un contrato está completo o incompleto.
NO calcula métricas financieras.
NO inventa datos.
"""

from typing import List

from .models import (
    InstrumentContract,
    ContractValidation,
    ContractStatus,
    InstrumentListItem,
    InstrumentContractDetail
)
from .repository import InstrumentRepository


class InstrumentService:
    """
    Servicio de instrumentos contractuales.
    
    Responsabilidades:
    - Validar presencia de campos contractuales
    - Determinar completitud de contratos
    - Exponer datos contractuales
    - NO calcular nada financiero
    """
    
    def __init__(self):
        self.repository = InstrumentRepository()
    
    def list_instruments(self) -> List[InstrumentListItem]:
        """
        Lista todos los instrumentos con su estado contractual.
        
        Returns:
            Lista de instrumentos con validación
        """
        contracts = self.repository.get_all_instruments()
        
        items = []
        for contract in contracts:
            if not contract.ticker:
                continue
            
            validation = self._validate_contract(contract)
            
            item = InstrumentListItem(
                ticker=contract.ticker,
                nombre_completo=contract.nombre_completo,
                tipo_instrumento=contract.tipo_instrumento,
                contract_status=validation.contract_status,
                missing_fields=validation.missing_fields
            )
            items.append(item)
        
        return items
    
    def get_instrument_detail(self, ticker: str) -> InstrumentContractDetail | None:
        """
        Obtiene el detalle contractual completo de un instrumento.
        
        Args:
            ticker: Ticker del instrumento
            
        Returns:
            Detalle contractual o None si no existe
        """
        contract = self.repository.get_instrument_by_ticker(ticker)
        
        if not contract:
            return None
        
        validation = self._validate_contract(contract)
        
        return InstrumentContractDetail(
            contract=contract,
            validation=validation
        )
    
    def _validate_contract(self, contract: InstrumentContract) -> ContractValidation:
        """
        Valida la completitud de un contrato.
        
        Criterios de completitud:
        - DEBE tener: ticker, issue_date, maturity_date, settlement_lag
        - OPCIONAL: todo lo demás
        
        Esta validación es SEPARADA del modelo.
        Se basa SOLO en presencia de campos.
        NO infiere, NO completa, NO asume.
        
        Args:
            contract: Contrato a validar
            
        Returns:
            Resultado de validación
        """
        
        missing_fields = []
        
        # Campos críticos para operaciones básicas
        if not contract.ticker:
            missing_fields.append("ticker")
        if not contract.issue_date:
            missing_fields.append("issue_date")
        if not contract.maturity_date:
            missing_fields.append("maturity_date")
        if contract.settlement_lag is None:
            missing_fields.append("settlement_lag")
        
        # Campos opcionales pero útiles
        # (no afectan status COMPLETE/INCOMPLETE)
        
        status = ContractStatus.COMPLETE if not missing_fields else ContractStatus.INCOMPLETE
        
        return ContractValidation(
            ticker=contract.ticker or "UNKNOWN",
            contract_status=status,
            missing_fields=missing_fields,
            has_issue_date=contract.issue_date is not None,
            has_maturity_date=contract.maturity_date is not None,
            has_day_count=contract.day_count is not None,
            has_business_day_rule=contract.business_day_rule is not None,
            has_settlement_lag=contract.settlement_lag is not None
        )