"""
Router de instrumentos contractuales.

Endpoints que exponen datos contractuales.
NUNCA fallan por datos faltantes.
"""

from fastapi import APIRouter, HTTPException
from typing import List

from .models import InstrumentListItem, InstrumentContractDetail
from .service import InstrumentService


router = APIRouter(prefix="/api/instruments", tags=["instruments"])
service = InstrumentService()


@router.get("/", response_model=List[InstrumentListItem])
async def list_instruments():
    """
    Lista todos los instrumentos con su estado contractual.
    
    Devuelve:
    - ticker
    - nombre (si existe)
    - tipo de instrumento (si existe)
    - contract_status (COMPLETE/INCOMPLETE)
    - missing_fields (lista de campos faltantes)
    
    ⚠️ Este endpoint NUNCA falla por datos incompletos.
    """
    try:
        items = service.list_instruments()
        return items
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error obteniendo listado de instrumentos: {str(e)}"
        )


@router.get("/{ticker}/contract", response_model=InstrumentContractDetail)
async def get_instrument_contract(ticker: str):
    """
    Obtiene el detalle contractual completo de un instrumento.
    
    Devuelve:
    - contract: todos los campos del modelo interno (pueden ser null)
    - validation: contract_status y missing_fields
    
    ⚠️ Este endpoint NUNCA falla por datos incompletos.
    ⚠️ Devuelve 404 solo si el instrumento no existe en Supabase.
    """
    try:
        detail = service.get_instrument_detail(ticker.upper())
        
        if not detail:
            raise HTTPException(
                status_code=404,
                detail=f"Instrumento {ticker} no encontrado"
            )
        
        return detail
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error obteniendo contrato de {ticker}: {str(e)}"
        )