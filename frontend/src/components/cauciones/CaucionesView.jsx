import React, { useState } from 'react';
import { Clock, TrendingUp, Shield, DollarSign, Info } from 'lucide-react';
import CaucionDetailView from './CaucionDetailView';

export default function CaucionesView({ cauciones, loading }) {
  const [selectedCaucion, setSelectedCaucion] = useState(null);

  // Si hay una caución seleccionada, mostrar vista de detalle
  if (selectedCaucion) {
    return (
      <CaucionDetailView
        caucion={selectedCaucion}
        allCauciones={cauciones}
        onBack={() => setSelectedCaucion(null)}
      />
    );
  }

  const caucionesARS = cauciones.filter(c => c.moneda === 'ARS');

  // Safe max evita -Infinity cuando el array está vacío
  const safeMax = (arr, fn) => arr.length === 0 ? null : Math.max(...arr.map(fn));

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        color: '#64748b',
        fontWeight: 'bold',
        padding: '48px'
      }}>
        <Clock style={{ animation: 'spin 1s linear infinite' }} />
        Cargando tasas de mercado monetario...
      </div>
    );
  }

  const CaucionTable = ({ data, moneda }) => (
    <div style={{
      backgroundColor: '#0f172a',
      borderRadius: '16px',
      border: '1px solid #1e293b',
      overflow: 'hidden',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        padding: '20px 24px',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <DollarSign size={20} style={{ color: moneda === 'ARS' ? '#4ade80' : '#60a5fa' }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'black',
            color: '#f1f5f9',
            margin: 0
          }}>
            Cauciones en {moneda}
          </h3>
        </div>
      </div>

      <table style={{
        width: '100%',
        textAlign: 'left',
        borderCollapse: 'collapse'
      }}>
        <thead style={{
          backgroundColor: '#1e293b',
          color: '#94a3b8',
          fontSize: '10px',
          fontWeight: 'black',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <tr>
            <th style={{ padding: '24px' }}>Plazo</th>
            <th>TNA</th>
            <th>TEA</th>
            <th>Rend. en Plazo</th>
            <th>Mínimo</th>
            <th style={{ paddingRight: '24px' }}>Garantía</th>
          </tr>
        </thead>
        <tbody>
          {data.map((caucion, i) => (
            <tr
              key={i}
              onClick={() => setSelectedCaucion(caucion)}
              style={{
                borderTop: '1px solid #1e293b',
                transition: 'background-color 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <td style={{ padding: '24px' }}>
                <div style={{
                  fontWeight: 'black',
                  fontSize: '18px',
                  color: 'white'
                }}>
                  {caucion.plazo} {caucion.plazo === 1 ? 'día' : 'días'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#64748b',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  marginTop: '2px'
                }}>
                  Liquidación {caucion.liquidacion}
                  <div style={{
                    fontSize: '10px',
                    color: caucion.source === 'BYMA' ? '#22c55e' : '#8b5cf6',
                    fontWeight: 'bold',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {caucion.source === 'BYMA' ? '📡' : '📊'} {caucion.source || 'BYMA'}
                  </div>
                </div>
              </td>

              <td style={{
                fontFamily: 'monospace',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#cbd5e1'
              }}>
                {caucion.tna}%
              </td>

              <td>
                <span style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  color: '#4ade80',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 'black',
                  fontSize: '16px',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  {caucion.tea}%
                </span>
              </td>

              <td style={{
                fontWeight: 'bold',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                +{caucion.rendimiento_plazo}%
              </td>

              <td style={{
                color: '#64748b',
                fontWeight: 'bold'
              }}>
                {moneda} {caucion.minimo.toLocaleString()}
              </td>

              <td style={{ paddingRight: '24px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 'black',
                  color: '#60a5fa'
                }}>
                  <Shield size={14} />
                  {caucion.garantia}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const [montoInversion, setMontoInversion] = useState(100000);
  const [plazoSim, setPlazoSim] = useState(1);
  const [tnaSim, setTnaSim] = useState('');
  const [tnaError, setTnaError] = useState(false);

  // Initial values based on market
  React.useEffect(() => {
    if (caucionesARS && caucionesARS.length > 0 && tnaSim === '') {
      const p1 = caucionesARS.find(c => c.plazo === 1);
      if (p1) {
        setPlazoSim(p1.plazo);
        setTnaSim(p1.tna);
      } else {
        const top = caucionesARS.reduce((max, c) => c.tna > max.tna ? c : max, caucionesARS[0]);
        setPlazoSim(top.plazo);
        setTnaSim(top.tna);
      }
    }
  }, [caucionesARS]);

  // Al cambiar el plazo → autocompletar TNA del mercado y limpiar error
  const handlePlazoChange = (e) => {
    const p = Number(e.target.value);
    setPlazoSim(p);
    const mkt = caucionesARS.find(c => c.plazo === p);
    if (mkt) {
      setTnaSim(mkt.tna);
      setTnaError(false);
    }
  };

  // Al cambiar la TNA manualmente → validar que coincida con el mercado para ese plazo
  const handleTnaChange = (e) => {
    const val = e.target.value;
    setTnaSim(val);
    const mkt = caucionesARS.find(c => c.plazo === plazoSim);
    if (mkt && val !== '' && Number(val) !== mkt.tna) {
      setTnaError(true);
    } else {
      setTnaError(false);
    }
  };

  const currentTNA = Number(tnaSim) || 0;
  const mktCaucion = caucionesARS.find(c => c.plazo === plazoSim);
  const rendimientoSimulado = !tnaError
    ? (montoInversion * (currentTNA / 100) * (plazoSim / 365))
    : null;

  return (
    <div style={{ padding: '48px' }}>
      {/* HEADER */}
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            padding: '12px',
            backgroundColor: '#4ade80',
            borderRadius: '12px'
          }}>
            <Clock size={28} color="white" />
          </div>
          <div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'black',
              letterSpacing: '-0.05em',
              margin: 0,
              color: '#f1f5f9'
            }}>
              Cauciones Bursátiles
            </h1>
            <p style={{
              color: '#64748b',
              fontWeight: 'bold',
              marginTop: '4px',
              fontSize: '16px'
            }}>
              Mercado Monetario • Garantía BYMA
            </p>
          </div>
        </div>

        {/* FECHA DE ACTUALIZACIÓN BADGE */}
        {cauciones.length > 0 && cauciones[0].fecha_actualizacion && (
          <div className="text-xs text-slate-500" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            fontWeight: '600',
            color: '#94a3b8'
          }}>
            <Clock size={12} />
            🗓️ Actualizado: {new Date(cauciones[0].fecha_actualizacion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
          </div>
        )}
      </header>

      {/* INFO PANEL */}
      <div style={{
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        display: 'flex',
        gap: '16px'
      }}>
        <Info size={24} style={{ color: '#60a5fa', flexShrink: 0 }} />
        <div>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 'black',
            color: '#60a5fa',
            marginBottom: '8px'
          }}>
            ¿Qué son las Cauciones?
          </h3>
          <p style={{
            color: '#cbd5e1',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0
          }}>
            Las cauciones bursátiles son operaciones de préstamo garantizado a muy corto plazo (1 a 30 días).
            Tu dinero queda garantizado por títulos depositados en BYMA. <strong>Ideal para:</strong> liquidez
            inmediata, tasas competitivas vs plazo fijo, disponibilidad T+0 o T+1.
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{
            fontSize: '10px',
            color: '#64748b',
            fontWeight: 'black',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Mejor TEA ARS
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'black',
            color: '#4ade80'
          }}>
            {safeMax(caucionesARS, c => c.tea) !== null ? `${safeMax(caucionesARS, c => c.tea)}%` : '-'}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#64748b',
            marginTop: '4px'
          }}>
            {caucionesARS.find(c => c.tea === safeMax(caucionesARS, x => x.tea))?.plazo} días
          </div>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{
            fontSize: '10px',
            color: '#64748b',
            fontWeight: 'black',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Liquidez
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'black',
            color: '#60a5fa'
          }}>
            T+0 / T+1
          </div>
          <div style={{
            fontSize: '11px',
            color: '#64748b',
            marginTop: '4px'
          }}>
            Disponibilidad inmediata
          </div>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{
            fontSize: '10px',
            color: '#64748b',
            fontWeight: 'black',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Garantía
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: 'black',
            color: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Shield size={24} style={{ color: '#60a5fa' }} />
            100% BYMA
          </div>
          <div style={{
            fontSize: '11px',
            color: '#64748b',
            marginTop: '4px'
          }}>
            Cámara compensadora
          </div>
        </div>
      </div>

      {/* TABLAS */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <CaucionTable data={caucionesARS} moneda="ARS" />
      </div>

      {/* SIMULADOR DE INVERSIÓN */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(15, 23, 42, 1))',
        border: '1px solid rgba(74, 222, 128, 0.3)',
        padding: '28px',
        borderRadius: '16px',
        marginTop: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <TrendingUp size={20} style={{ color: '#4ade80' }} />
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'black',
            color: '#4ade80',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0
          }}>
            Simulador de Rendimientos
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: '24px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '8px' }}>
              Monto a caucionar (ARS)
            </label>
            <input
              type="number"
              value={montoInversion}
              onChange={(e) => setMontoInversion(Number(e.target.value))}
              min={1000}
              step={100}
              style={{
                width: '100%',
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '24px',
                fontWeight: 'black',
                color: '#f1f5f9',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '8px' }}>
                Plazo (Días)
              </label>
              <select
                value={plazoSim}
                onChange={handlePlazoChange}
                style={{
                  width: '100%',
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '20px',
                  fontWeight: 'black',
                  color: '#f1f5f9',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                {caucionesARS
                  .slice()
                  .sort((a, b) => a.plazo - b.plazo)
                  .map(c => (
                    <option key={c.plazo} value={c.plazo}>
                      {c.plazo} {c.plazo === 1 ? 'Día' : 'Días'} — TNA {c.tna}%
                    </option>
                  ))
                }
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: tnaError ? '#f87171' : '#cbd5e1', marginBottom: '8px' }}>
                Tasa (TNA %) {tnaError ? '— ⚠ No coincide con el mercado' : `— Mercado: ${mktCaucion?.tna ?? '—'}%`}
              </label>
              <input
                type="number"
                value={tnaSim}
                onChange={handleTnaChange}
                step="0.1"
                min="0"
                style={{
                  width: '100%',
                  backgroundColor: tnaError ? 'rgba(248, 113, 113, 0.05)' : '#0f172a',
                  border: tnaError ? '2px solid #f87171' : '1px solid #1e293b',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '20px',
                  fontWeight: 'black',
                  color: tnaError ? '#f87171' : '#4ade80',
                  outline: 'none',
                  transition: 'border-color 0.2s, color 0.2s'
                }}
              />
              {tnaError && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⚠ La TNA ingresada no corresponde a ninguna caución disponible para {plazoSim} {plazoSim === 1 ? 'día' : 'días'}.
                  La tasa de mercado es <strong>{mktCaucion?.tna ?? '—'}%</strong>.
                  <button
                    onClick={() => { setTnaSim(mktCaucion?.tna ?? ''); setTnaError(false); }}
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: 'rgba(248, 113, 113, 0.2)',
                      border: '1px solid #f87171',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Usar {mktCaucion?.tna}%
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {tnaError ? (
            <div style={{
              gridColumn: '1 / -1',
              backgroundColor: 'rgba(248, 113, 113, 0.05)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              textAlign: 'center',
              color: '#f87171',
              fontWeight: 'bold',
              fontSize: '15px'
            }}>
              ⚠ Corregí la TNA para ver el resultado del simulador
            </div>
          ) : (
            <>
              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #1e293b'
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Interés Ganado en {plazoSim} {plazoSim === 1 ? 'día' : 'días'}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'black', color: '#4ade80' }}>
                  + ${rendimientoSimulado.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                padding: '16px',
                borderRadius: '12px',
                border: '2px solid rgba(74, 222, 128, 0.3)'
              }}>
                <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 'black', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Total a Recibir (Capital + Interés)
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'black', color: '#4ade80' }}>
                  $ {(montoInversion + rendimientoSimulado).toFixed(2)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DISCLAIMER */}
      <div style={{
        marginTop: '32px',
        fontSize: '11px',
        color: '#475569',
        fontStyle: 'italic',
        lineHeight: '1.6',
        padding: '16px',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px'
      }}>
        <strong>Nota técnica:</strong> TNA = Tasa Nominal Anual. TEA = Tasa Efectiva Anual calculada
        como (1 + TNA/365)^365 - 1. El rendimiento en el plazo es aproximado y no considera costos operativos.
        Las tasas son referenciales y pueden variar según disponibilidad de mercado.
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}