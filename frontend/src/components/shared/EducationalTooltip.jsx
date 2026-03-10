import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

const conceptDatabase = {
  'paridad': {
    title: 'Paridad',
    definition: 'Relación porcentual entre el precio de mercado y el valor residual del bono.',
    formula: 'Paridad = (Precio Dirty / Valor Residual) × 100',
    example: 'Si un bono cotiza a u$d 58.50 y su VR es u$d 84.38, la paridad es 69.3%.',
    interpretation: 'Paridad < 100%: opera bajo la par (descuento). Paridad > 100%: opera sobre la par (premio).'
  },
  'dirty_price': {
    title: 'Precio Dirty',
    definition: 'Precio de mercado que incluye el interés corrido acumulado desde el último pago de cupón.',
    formula: 'Dirty Price = Clean Price + Interés Corrido',
    example: 'Es el precio que efectivamente pagás al comprar.',
    interpretation: 'Siempre mayor al Clean Price, excepto el día exacto del pago de cupón.'
  },
  'clean_price': {
    title: 'Precio Clean',
    definition: 'Precio de mercado sin incluir el interés corrido.',
    formula: 'Clean Price = Dirty Price - Interés Corrido',
    example: 'Si el Dirty es u$d 58.50 y el IC es u$d 2.10, el Clean es u$d 56.40.',
    interpretation: 'Facilita comparar bonos en distintos momentos de su ciclo de pago.'
  },
  'interes_corrido': {
    title: 'Interés Corrido (IC)',
    definition: 'Monto de intereses devengados desde el último pago de cupón hasta hoy.',
    formula: 'IC = (Cupón × VR × Días Corridos) / Base de Cálculo',
    example: 'Si el cupón es 0.75% semestral y pasaron 178 días: IC ≈ 2.1% del VR.',
    interpretation: 'Lo cobrás en el próximo pago de cupón.'
  },
  'tir': {
    title: 'TIR (Yield to Maturity)',
    definition: 'Tasa de retorno anual que obtendrías si comprás hoy y mantenés hasta vencimiento.',
    formula: 'Se calcula resolviendo: Precio = Σ [Flujo / (1+TIR)^t]',
    example: 'TIR 24.5% significa ese rendimiento anualizado.',
    interpretation: 'RELACIÓN INVERSA: si el precio baja, la TIR sube.'
  },
  'modified_duration': {
    title: 'Modified Duration',
    definition: 'Sensibilidad del precio del bono ante cambios en la tasa de interés.',
    formula: 'Mod. Duration = Macaulay Duration / (1 + TIR/n)',
    example: 'Mod. Duration = 2.1 significa que por cada 1% de aumento en la TIR, el precio cae aproximadamente 2.1%.',
    interpretation: 'Mayor duration = mayor riesgo de tasa.'
  }
};

export default function EducationalTooltip({ concept, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const data = conceptDatabase[concept];

  if (!data) return <>{children}</>;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: '#60a5fa',
          borderBottom: '1px dotted #60a5fa',
          background: 'none',
          padding: 0,
          cursor: 'pointer'
        }}
      >
        {children}
        <HelpCircle size={14} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
          left: 0,
          top: '100%',
          marginTop: '8px',
          width: '384px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 20px 50px rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'black', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {data.title}
            </h4>
            <button onClick={() => setIsOpen(false)} style={{ color: '#64748b', padding: 0 }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ color: '#cbd5e1', lineHeight: '1.5' }}>{data.definition}</p>
            </div>

            {data.formula !== 'N/A' && (
              <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Fórmula
                </div>
                <code style={{ color: '#4ade80', fontFamily: 'monospace' }}>{data.formula}</code>
              </div>
            )}

            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '4px' }}>
                Ejemplo
              </div>
              <p style={{ color: '#94a3b8', lineHeight: '1.5' }}>{data.example}</p>
            </div>

            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '4px' }}>
                Interpretación
              </div>
              <p style={{ color: '#cbd5e1', lineHeight: '1.5' }}>{data.interpretation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}