import React from 'react';
import { ArrowLeft, FileText, Calendar, Activity, TrendingUp, DollarSign, ExternalLink } from 'lucide-react';
import EducationalTooltip from '../shared/EducationalTooltip';
import SensitivitySimulator from './SensitivitySimulator';
import AIAnalysisSection from './AIAnalysisSection';

const DataRow = ({ label, value, sub, highlight = false, tooltip = null }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #1e293b',
    backgroundColor: highlight ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
    paddingLeft: highlight ? '8px' : '0',
    paddingRight: highlight ? '8px' : '0'
  }}>
    <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
      {tooltip ? (
        <EducationalTooltip concept={tooltip}>
          {label}
        </EducationalTooltip>
      ) : (
        label
      )}
    </span>
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontWeight: 'bold',
        color: highlight ? '#60a5fa' : '#f1f5f9'
      }}>
        {value || '---'}
      </div>
      {sub && (
        <div style={{
          fontSize: '10px',
          color: '#64748b',
          textTransform: 'uppercase',
          fontWeight: 'black',
          marginTop: '2px'
        }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

export default function BondDetailView({ bond, onBack }) {
  return (
    <div style={{
      maxWidth: '1152px',
      margin: '0 auto',
      animation: 'fadeIn 0.5s'
    }}>
      {/* HEADER DE NAVEGACIÓN */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#60a5fa',
          fontWeight: 'bold',
          marginBottom: '32px',
          padding: '8px',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <ArrowLeft size={18} /> VOLVER AL PANEL GENERAL
      </button>

      {/* TÍTULO E IMPACTO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '1px solid #1e293b',
        paddingBottom: '32px',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{
            fontSize: '72px',
            fontWeight: 'black',
            letterSpacing: '-0.05em',
            color: 'white',
            margin: 0
          }}>
            {bond.ticker}
          </h1>
          <p style={{
            color: '#94a3b8',
            fontWeight: 'bold',
            marginTop: '8px',
            fontSize: '16px'
          }}>
            {bond.emisor} • <span style={{ color: '#60a5fa' }}>Ley {bond.legislacion}</span>
          </p>
          <div style={{
            color: '#cbd5e1',
            fontSize: '12px',
            fontWeight: 'bold',
            marginTop: '4px'
          }}>
            Actualizado: {bond.updated_at && bond.updated_at !== 'N/A'
              ? new Date(bond.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
              : 'N/A'}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <span style={{
              fontSize: '10px',
              padding: '4px 12px',
              borderRadius: '8px',
              fontWeight: 'black',
              textTransform: 'uppercase',
              backgroundColor: bond.tipo === 'Bono Soberano' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(6, 182, 212, 0.1)',
              color: bond.tipo === 'Bono Soberano' ? '#a855f7' : '#06b6d4',
              border: bond.tipo === 'Bono Soberano' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              {bond.tipo}
            </span>
            <span style={{
              fontSize: '10px',
              padding: '4px 12px',
              borderRadius: '8px',
              fontWeight: 'black',
              textTransform: 'uppercase',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155'
            }}>
              {bond.moneda}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{
              fontSize: '10px',
              color: '#64748b',
              fontWeight: 'black',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              TIR ANUAL
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: 'black',
              color: '#4ade80'
            }}>
              {bond.tir}%
            </div>
          </div>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{
              fontSize: '10px',
              color: '#64748b',
              fontWeight: 'black',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              <EducationalTooltip concept="paridad">PARIDAD</EducationalTooltip>
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: 'black',
              color: '#60a5fa'
            }}>
              {bond.parity}%
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN G: ASISTENTE IA */}
      <div style={{ marginBottom: '40px' }}>
        <AIAnalysisSection bond={bond} />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '40px'
      }}>
        {/* COLUMNA IZQUIERDA (A, B, C, F) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

          {/* SECCIÓN A: IDENTIDAD */}
          <section>
            <h3 style={{
              fontSize: '12px',
              fontWeight: 'black',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FileText size={14} /> Sección A: Identidad y Prospecto
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 48px'
            }}>
              <DataRow label="Tipo de Instrumento" value={bond.tipo} />
              <DataRow
                label="Estructura de Pago"
                value={bond.estructura}
                sub={bond.estructura === 'Amortizable' ? 'Paga capital en cuotas' : 'Todo al final'}
              />
              <DataRow label="Fecha Emisión" value={bond.fecha_emision} />
              <DataRow label="Fecha Vencimiento" value={bond.fecha_vencimiento} />
              {bond.capital_residual > 0 && (
                <DataRow label="Capital Residual" value={`${(bond.capital_residual * 100).toFixed(2)}%`} />
              )}
            </div>

            {bond.prospecto && (
              <a
                href={bond.prospecto}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
              >
                <FileText size={14} />
                Ver Prospecto Oficial
                <ExternalLink size={12} />
              </a>
            )}
          </section>

            {/* SECCIÓN B: PRÓXIMO PAGO */}
          <section>
            <h3 style={{
              fontSize: '12px',
              fontWeight: 'black',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Calendar size={14} /> Sección B: Cupón y Pagos
            </h3>
            <div style={{
              marginTop: '16px',
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#60a5fa',
                fontWeight: 'black',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                Próximo Pago Estimado
              </div>
              {(() => {
                const hoy = new Date();
                const pago = bond.proximo_pago || (bond.cash_flow || []).find(cf => {
                  if (!cf.fecha) return false;
                  const [d, m, y] = cf.fecha.split('/');
                  return new Date(`${y}-${m}-${d}`) > hoy;
                }) || null;
                if (!pago) return <span style={{ color: '#64748b', fontSize: '13px' }}>Sin pagos futuros</span>;
                const monto = pago.monto.toFixed(4);
                const simbolo = pago.moneda === 'USD' ? 'u$d' : '$';
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{pago.fecha}</span>
                    <span style={{ fontSize: '18px', fontWeight: 'black', color: '#4ade80' }}>
                      {simbolo} {monto}
                    </span>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* SECCIÓN C: VALUACIÓN */}
          <section>
            <h3 style={{
              fontSize: '12px',
              fontWeight: 'black',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Activity size={14} /> Sección C: Valuación (Clean vs Dirty)
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 48px'
            }}>
              <DataRow
                label="Precio Dirty"
                value={`${bond.currency === 'ARS' ? '$' : 'u$d'} ${bond.dirty_price?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}`}
                highlight
                tooltip="dirty_price"
              />
              <DataRow
                label="Precio Clean"
                value={`${bond.currency === 'ARS' ? '$' : 'u$d'} ${bond.clean_price?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}`}
                tooltip="clean_price"
              />
              <DataRow
                label="Interés Corrido (IC)"
                value={`${bond.currency === 'ARS' ? '$' : 'u$d'} ${bond.accrued_interest?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}`}
                tooltip="interes_corrido"
              />
              <DataRow
                label="Valor Técnico (VT)"
                value={`${bond.currency === 'ARS' ? '$' : 'u$d'} ${bond.technical_value?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}`}
                highlight
              />
            </div>

          </section>

          {/* SECCIÓN F: FLUJO DE FONDOS */}
          <section>
            <h3 style={{
              fontSize: '12px',
              fontWeight: 'black',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <TrendingUp size={14} /> Sección F: Flujo de Fondos (Proyectado)
            </h3>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
              Montos expresados por cada VN $100. Solo pagos futuros.
            </div>
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                textAlign: 'left',
                fontSize: '12px',
                borderCollapse: 'collapse'
              }}>
                <thead style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                  <tr>
                    <th style={{ padding: '16px' }}>FECHA</th>
                    <th style={{ padding: '16px' }}>TIPO</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>MONTO</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>RESIDUAL</th>
                  </tr>
                </thead>
                <tbody>
                  {bond.cash_flow?.filter(cf => {
                    if (!cf.fecha) return false;
                    const [d, m, y] = cf.fecha.split('/');
                    return new Date(`${y}-${m}-${d}`) > new Date();
                  }).map((cf, i) => (
                    <tr
                      key={i}
                      style={{
                        borderTop: '1px solid #1e293b',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontWeight: 'bold', color: '#f1f5f9' }}>{cf.fecha}</td>
                      <td style={{ padding: '16px', color: '#64748b' }}>{cf.tipo}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'black', color: '#4ade80' }}>
                        {cf.moneda === 'USD' ? 'u$d' : '$'} {cf.monto.toFixed(4)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#94a3b8' }}>
                        {cf.residual != null ? `u$d ${cf.residual}` : <span style={{color:'#475569'}}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA (D, E) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* SECCIÓN E: SIMULADOR DE SENSIBILIDAD */}
          <SensitivitySimulator
            currentPrice={bond.dirty_price}
            modifiedDuration={bond.modified_duration}
            currentTIR={bond.tir}
            currency={bond.currency}
          />

          {/* SECCIÓN D: YIELD PROYECTADO */}
          <section style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(15, 23, 42, 1))',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            padding: '24px',
            borderRadius: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <DollarSign size={14} style={{ color: '#4ade80' }} />
              <h3 style={{
                fontSize: '10px',
                fontWeight: 'black',
                color: '#4ade80',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Sección D: Rendimiento
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{
                  fontSize: '10px',
                  color: '#64748b',
                  fontWeight: 'black',
                  textTransform: 'uppercase',
                  marginBottom: '4px'
                }}>
                  <EducationalTooltip concept="tir">TIR / Yield to Maturity</EducationalTooltip>
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'black',
                  color: 'white'
                }}>
                  {bond.tir}%
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '9px',
                  color: '#4ade80',
                  fontWeight: 'black',
                  textTransform: 'uppercase',
                  marginBottom: '4px'
                }}>
                  Current Yield
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'black',
                  color: 'white'
                }}>
                  {bond.current_yield != null ? `${bond.current_yield}%` : '---'}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: '#64748b',
                  marginTop: '8px'
                }}>
                  Cupón anual / Precio actual
                </div>
              </div>

              <div style={{
                fontSize: '10px',
                color: '#64748b',
                lineHeight: '1.5'
              }}>
                <strong style={{ color: '#94a3b8' }}>Relación inversa:</strong> Si el precio baja → TIR sube.
                Si el precio sube → TIR baja.
              </div>
            </div>
          </section>

          {/* INFO ADICIONAL */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            padding: '20px',
            borderRadius: '12px'
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 'black',
              color: '#64748b',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              Características
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Legislación</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{bond.legislacion}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Moneda</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{bond.moneda}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>
                  <EducationalTooltip concept="modified_duration">Mod. Duration</EducationalTooltip>
                </span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{bond.modified_duration}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}