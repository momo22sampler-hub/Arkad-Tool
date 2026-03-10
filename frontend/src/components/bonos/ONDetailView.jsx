import React from 'react';
import { ArrowLeft, FileText, TrendingUp, DollarSign } from 'lucide-react';

const DataRow = ({ label, value, highlight = false }) => (
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
      {label}
    </span>
    <div style={{
      fontWeight: 'bold',
      color: highlight ? '#60a5fa' : '#f1f5f9'
    }}>
      {value || '---'}
    </div>
  </div>
);

export default function ONDetailView({ on, onBack }) {
  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'USD': return 'u$d';
      case 'USD_CABLE': return 'u$d (Cable)';
      case 'ARS': return '$';
      default: return '$';
    }
  };

  const getCurrencyLabel = (currency) => {
    switch (currency) {
      case 'USD': return 'Dólar MEP';
      case 'USD_CABLE': return 'Dólar Cable';
      case 'ARS': return 'Pesos Argentinos';
      default: return currency || '-';
    }
  };

  return (
    <div style={{
      maxWidth: '1152px',
      margin: '0 auto',
      animation: 'fadeIn 0.5s'
    }}>
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
          border: 'none',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <ArrowLeft size={18} /> VOLVER AL PANEL GENERAL
      </button>

      <div style={{
        borderBottom: '1px solid #1e293b',
        paddingBottom: '32px',
        marginBottom: '32px'
      }}>
        <h1 style={{
          fontSize: '72px',
          fontWeight: 'black',
          letterSpacing: '-0.05em',
          color: 'white',
          margin: 0
        }}>
          {on.ticker}
        </h1>
        <p style={{
          color: '#94a3b8',
          fontWeight: 'bold',
          marginTop: '8px',
          fontSize: '16px'
        }}>
          Obligación Negociable • {getCurrencyLabel(on.currency)}
        </p>
        <div style={{
          color: '#cbd5e1',
          fontSize: '12px',
          fontWeight: 'bold',
          marginTop: '4px'
        }}>
          Actualizado: {on.updated_at && on.updated_at !== 'N/A'
            ? new Date(on.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
            : 'N/A'}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <span style={{
            fontSize: '10px',
            padding: '4px 12px',
            borderRadius: '8px',
            fontWeight: 'black',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            color: '#06b6d4',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            {on.tipo}
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
            {getCurrencyLabel(on.currency)}
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '40px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
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
              <TrendingUp size={14} /> Datos de Mercado
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 48px'
            }}>
              <DataRow label="Precio Último" value={`${getCurrencySymbol(on.currency)} ${on.price?.toFixed(2) || 'N/A'}`} highlight />
              <DataRow label="Moneda" value={getCurrencyLabel(on.currency)} />
              <DataRow label="Bid" value={on.bid ? `${getCurrencySymbol(on.currency)} ${on.bid.toFixed(2)}` : '-'} />
              <DataRow label="Ask" value={on.ask ? `${getCurrencySymbol(on.currency)} ${on.ask.toFixed(2)}` : '-'} />
              <DataRow label="Volumen" value={on.volume > 0 ? on.volume.toLocaleString() : '-'} />
              <DataRow label="Variación" value={on.variation !== undefined ? `${on.variation > 0 ? '+' : ''}${on.variation.toFixed(2)}%` : '-'} />
              <DataRow label="Apertura" value={on.open ? `${getCurrencySymbol(on.currency)} ${on.open.toFixed(2)}` : '-'} />
              <DataRow label="Máximo" value={on.high ? `${getCurrencySymbol(on.currency)} ${on.high.toFixed(2)}` : '-'} />
              <DataRow label="Mínimo" value={on.low ? `${getCurrencySymbol(on.currency)} ${on.low.toFixed(2)}` : '-'} />
              <DataRow label="Cierre Anterior" value={on.previous_close ? `${getCurrencySymbol(on.currency)} ${on.previous_close.toFixed(2)}` : '-'} />
            </div>
          </section>

          {on.expiration && (
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
                <FileText size={14} /> Vencimiento
              </h3>
              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                padding: '16px',
                borderRadius: '12px'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#f1f5f9'
                }}>
                  {on.expiration}
                </div>
              </div>
            </section>
          )}

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
              <Activity size={14} /> Valuación (Clean vs Dirty)
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 48px'
            }}>
              <DataRow
                label="Precio Dirty"
                value={`${getCurrencySymbol(on.currency)} ${on.dirty_price?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || on.price?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}`}
                highlight
                tooltip="dirty_price"
              />
              <DataRow
                label="Precio Clean"
                value={`${getCurrencySymbol(on.currency)} ${on.clean_price?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}`}
                tooltip="clean_price"
              />
              <DataRow
                label="Interés Corrido (IC)"
                value={`${getCurrencySymbol(on.currency)} ${on.accrued_interest?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}`}
                tooltip="interes_corrido"
              />
              <DataRow
                label="Valor Técnico (VT)"
                value={`${getCurrencySymbol(on.currency)} ${on.technical_value?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}`}
                highlight
              />

              <DataRow
                label="Paridad"
                value={`${on.parity || 0}%`}
                highlight
                tooltip="paridad"
              />
              <DataRow
                label="TIR Estimada"
                value={`${on.tir || 0}%`}
                highlight
                tooltip="TIR"
              />
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <section style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(15, 23, 42, 1))',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            padding: '24px',
            borderRadius: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <DollarSign size={14} style={{ color: '#06b6d4' }} />
              <h3 style={{
                fontSize: '10px',
                fontWeight: 'black',
                color: '#06b6d4',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Precio Actual
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
                  Último Operado
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'black',
                  color: 'white'
                }}>
                  {getCurrencySymbol(on.currency)} {on.price?.toFixed(2) || 'N/A'}
                </div>
              </div>

              {on.variation !== undefined && on.variation !== null && (
                <div style={{
                  backgroundColor: on.variation >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: on.variation >= 0 ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '9px',
                    color: on.variation >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 'black',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                  }}>
                    Variación del día
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'black',
                    color: on.variation >= 0 ? '#4ade80' : '#ef4444'
                  }}>
                    {on.variation > 0 ? '+' : ''}{on.variation.toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
          </section>

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
              Información de Datos
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Fuente</span>
                <span style={{
                  fontWeight: 'bold',
                  color: on.source === 'BYMA' ? '#22c55e' : '#fbbf24'
                }}>
                  {on.source}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Timestamp</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>
                  {on.timestamp || '-'}
                </span>
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