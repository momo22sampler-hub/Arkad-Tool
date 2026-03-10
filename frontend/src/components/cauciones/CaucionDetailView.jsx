import React, { useState } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, Calculator, Clock, Shield, Info, BarChart3 } from 'lucide-react';

export default function CaucionDetailView({ caucion, allCauciones, onBack }) {
  const [montoInversion, setMontoInversion] = useState(10000);

  // Datos históricos simulados (en producción vendrían del backend)
  const historicoTNA = [
    { fecha: '2024-01', tna: 28.5 },
    { fecha: '2024-04', tna: 30.2 },
    { fecha: '2024-07', tna: 31.8 },
    { fecha: '2024-10', tna: 33.1 },
    { fecha: '2025-01', tna: caucion.tna }
  ];

  // Calcular rendimiento proyectado
  const calcularRendimiento = (monto, plazo, tna) => {
    const rendimiento = (monto * (tna / 100) * plazo) / 365;
    return {
      bruto: rendimiento,
      impuestos: rendimiento * 0.05, // 5% retención
      neto: rendimiento * 0.95,
      total: monto + (rendimiento * 0.95)
    };
  };

  const rendimiento = calcularRendimiento(montoInversion, caucion.plazo, caucion.tna);

  // Cauciones del mismo tipo (misma moneda)
  const mismaTipoCauciones = allCauciones
    .filter(c => c.moneda === caucion.moneda)
    .sort((a, b) => a.plazo - b.plazo);

  // Comparativa con otras alternativas
  const alternativas = [
    {
      instrumento: 'Plazo Fijo Tradicional',
      tna: caucion.moneda === 'ARS' ? 30.0 : 3.8,
      tea: caucion.moneda === 'ARS' ? 34.5 : 3.9,
      liquidez: 'T+30',
      garantia: 'Banco Central (hasta $30M)'
    },
    {
      instrumento: `FCI Money Market ${caucion.moneda}`,
      tna: caucion.moneda === 'ARS' ? 31.5 : 4.0,
      tea: caucion.moneda === 'ARS' ? 36.2 : 4.1,
      liquidez: 'T+0 a T+1',
      garantia: 'Sin garantía específica'
    }
  ];

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      animation: 'fadeIn 0.5s'
    }}>
      {/* HEADER NAVEGACIÓN */}
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
          transition: 'background-color 0.2s',
          border: 'none'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <ArrowLeft size={18} /> VOLVER A CAUCIONES
      </button>

      {/* TÍTULO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '1px solid #1e293b',
        paddingBottom: '32px',
        marginBottom: '32px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#4ade80',
              borderRadius: '16px'
            }}>
              <Clock size={32} color="white" />
            </div>
            <h1 style={{
              fontSize: '56px',
              fontWeight: 'black',
              letterSpacing: '-0.05em',
              color: 'white',
              margin: 0
            }}>
              Caución {caucion.plazo} {caucion.plazo === 1 ? 'Día' : 'Días'}
            </h1>
          </div>
          <p style={{
            color: '#94a3b8',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            Moneda: {caucion.moneda} • Garantía {caucion.garantia} • Liquidación {caucion.liquidacion}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            minWidth: '140px'
          }}>
            <div style={{
              fontSize: '10px',
              color: '#64748b',
              fontWeight: 'black',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              TNA
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 'black',
              color: '#4ade80'
            }}>
              {caucion.tna}%
            </div>
          </div>

          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            minWidth: '140px'
          }}>
            <div style={{
              fontSize: '10px',
              color: '#64748b',
              fontWeight: 'black',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              TEA
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 'black',
              color: '#60a5fa'
            }}>
              {caucion.tea}%
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '32px'
      }}>
        {/* COLUMNA IZQUIERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* SIMULADOR DE INVERSIÓN */}
          <section style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(15, 23, 42, 1))',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '28px',
            borderRadius: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <Calculator size={20} style={{ color: '#4ade80' }} />
              <h3 style={{
                fontSize: '16px',
                fontWeight: 'black',
                color: '#4ade80',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0
              }}>
                Simulador de Rendimiento
              </h3>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#cbd5e1',
                marginBottom: '8px'
              }}>
                Monto a invertir ({caucion.moneda})
              </label>
              <input
                type="number"
                value={montoInversion}
                onChange={(e) => setMontoInversion(Number(e.target.value))}
                min={caucion.minimo}
                step={1000}
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
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                marginTop: '6px'
              }}>
                Mínimo: {caucion.moneda} {caucion.minimo.toLocaleString()}
              </div>
            </div>

            {/* RESULTADOS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>
                  Rendimiento Bruto
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'black', color: '#4ade80' }}>
                  {caucion.moneda} {rendimiento.bruto.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>
                  Retención (5%)
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'black', color: '#ef4444' }}>
                  {caucion.moneda} {rendimiento.impuestos.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>
                  Rendimiento Neto
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'black', color: '#4ade80' }}>
                  {caucion.moneda} {rendimiento.neto.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                padding: '16px',
                borderRadius: '12px',
                border: '2px solid rgba(34, 197, 94, 0.4)'
              }}>
                <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 'black', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Total a Cobrar
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'black', color: '#4ade80' }}>
                  {caucion.moneda} {rendimiento.total.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '11px',
              color: '#64748b',
              fontStyle: 'italic',
              lineHeight: '1.6',
              padding: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '8px',
              border: '1px solid #1e293b'
            }}>
              <strong>Nota:</strong> Rendimiento calculado como (Monto × TNA × Días) / 365.
              Retención estimada del 5% sobre ganancias (ley de mercado de capitales).
            </div>
          </section>

          {/* CURVA DE PLAZOS */}
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
              <TrendingUp size={14} /> Curva de Tasas - Todos los Plazos ({caucion.moneda})
            </h3>

            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                textAlign: 'left',
                fontSize: '14px',
                borderCollapse: 'collapse'
              }}>
                <thead style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                  <tr>
                    <th style={{ padding: '16px' }}>PLAZO</th>
                    <th>TNA</th>
                    <th>TEA</th>
                    <th>REND. EN PLAZO</th>
                    <th style={{ textAlign: 'right', paddingRight: '16px' }}>POR {caucion.moneda} 10.000</th>
                  </tr>
                </thead>
                <tbody>
                  {mismaTipoCauciones.map((c, i) => {
                    const isActual = c.plazo === caucion.plazo;
                    const rend = calcularRendimiento(10000, c.plazo, c.tna);

                    return (
                      <tr
                        key={i}
                        style={{
                          borderTop: '1px solid #1e293b',
                          backgroundColor: isActual ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                          fontWeight: isActual ? 'bold' : 'normal'
                        }}
                      >
                        <td style={{ padding: '16px', color: isActual ? '#60a5fa' : '#f1f5f9' }}>
                          {c.plazo} {c.plazo === 1 ? 'día' : 'días'}
                          {isActual && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#60a5fa' }}>← ACTUAL</span>}
                        </td>
                        <td style={{ color: '#cbd5e1' }}>{c.tna}%</td>
                        <td style={{ color: '#4ade80', fontWeight: 'bold' }}>{c.tea}%</td>
                        <td style={{ color: '#94a3b8' }}>+{c.rendimiento_plazo}%</td>
                        <td style={{ textAlign: 'right', paddingRight: '16px', color: '#4ade80', fontFamily: 'monospace' }}>
                          +{rend.neto.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* HISTÓRICO TNA */}
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
              <BarChart3 size={14} /> Evolución Histórica TNA - Último Año
            </h3>

            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              padding: '24px',
              borderRadius: '12px',
              position: 'relative',
              height: '240px'
            }}>
              {/* Gráfico simulado con barras */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                height: '180px',
                gap: '16px'
              }}>
                {historicoTNA.map((punto, i) => {
                  const altura = (punto.tna / Math.max(...historicoTNA.map(p => p.tna))) * 100;
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      gap: '8px'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#4ade80',
                        marginBottom: '4px'
                      }}>
                        {punto.tna}%
                      </div>
                      <div style={{
                        width: '100%',
                        height: `${altura}%`,
                        backgroundColor: i === historicoTNA.length - 1 ? '#4ade80' : '#1e293b',
                        borderRadius: '8px 8px 0 0',
                        transition: 'all 0.3s',
                        border: i === historicoTNA.length - 1 ? '2px solid #22c55e' : 'none'
                      }}></div>
                      <div style={{
                        fontSize: '10px',
                        color: '#64748b',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}>
                        {punto.fecha}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* COMPARATIVA */}
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
              <DollarSign size={14} /> Comparativa con Otras Alternativas
            </h3>

            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                textAlign: 'left',
                fontSize: '13px',
                borderCollapse: 'collapse'
              }}>
                <thead style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                  <tr>
                    <th style={{ padding: '16px' }}>INSTRUMENTO</th>
                    <th>TNA</th>
                    <th>TEA</th>
                    <th>LIQUIDEZ</th>
                    <th>GARANTÍA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #1e293b'
                  }}>
                    <td style={{ padding: '16px', color: '#60a5fa' }}>
                      Caución {caucion.plazo}d {caucion.moneda} ← ACTUAL
                    </td>
                    <td style={{ color: '#cbd5e1' }}>{caucion.tna}%</td>
                    <td style={{ color: '#4ade80' }}>{caucion.tea}%</td>
                    <td style={{ color: '#94a3b8' }}>{caucion.liquidacion}</td>
                    <td style={{ color: '#60a5fa' }}>{caucion.garantia}</td>
                  </tr>
                  {alternativas.map((alt, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #1e293b' }}>
                      <td style={{ padding: '16px', color: '#cbd5e1' }}>{alt.instrumento}</td>
                      <td style={{ color: '#94a3b8' }}>{alt.tna}%</td>
                      <td style={{
                        color: alt.tea > caucion.tea ? '#4ade80' : '#ef4444',
                        fontWeight: 'bold'
                      }}>
                        {alt.tea}%
                      </td>
                      <td style={{ color: '#64748b' }}>{alt.liquidez}</td>
                      <td style={{ color: '#64748b', fontSize: '11px' }}>{alt.garantia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* CARACTERÍSTICAS TÉCNICAS */}
          <section style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            padding: '24px',
            borderRadius: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <Info size={16} style={{ color: '#60a5fa' }} />
              <h3 style={{
                fontSize: '12px',
                fontWeight: 'black',
                color: '#60a5fa',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0
              }}>
                Ficha Técnica
              </h3>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '14px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>Tipo</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{caucion.tipo}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>Moneda</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{caucion.moneda}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>Plazo</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>
                  {caucion.plazo} {caucion.plazo === 1 ? 'día' : 'días'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>TNA</span>
                <span style={{ fontWeight: 'bold', color: '#4ade80', fontSize: '18px' }}>
                  {caucion.tna}%
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>TEA</span>
                <span style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '18px' }}>
                  {caucion.tea}%
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>Mínimo</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>
                  {caucion.moneda} {caucion.minimo.toLocaleString()}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>Liquidación</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{caucion.liquidacion}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>Mercado</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{caucion.mercado || 'BYMA'}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #1e293b'
              }}>
                <span style={{ color: '#64748b' }}>Última Act.</span>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>
                  {caucion?.fecha_actualizacion || caucion?.updated_at
                    ? new Date(caucion.fecha_actualizacion || caucion.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'N/D'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: '#64748b' }}>Garantía</span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Shield size={14} style={{ color: '#60a5fa' }} />
                  <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>{caucion.garantia}</span>
                </div>
              </div>
            </div>
          </section>

          {/* INFO EDUCATIVA */}
          <section style={{
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            padding: '20px',
            borderRadius: '12px'
          }}>
            <h4 style={{
              fontSize: '12px',
              fontWeight: 'black',
              color: '#60a5fa',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              ¿Cómo funciona?
            </h4>
            <div style={{
              fontSize: '13px',
              color: '#cbd5e1',
              lineHeight: '1.6'
            }}>
              <p style={{ marginBottom: '12px' }}>
                Una <strong>caución bursátil</strong> es un préstamo garantizado a corto plazo.
                Tu dinero queda asegurado por títulos depositados en BYMA.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>Proceso:</strong>
              </p>
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                <li>Colocás tu dinero por el plazo elegido</li>
                <li>Al vencimiento recibís capital + intereses</li>
                <li>La garantía es automática (cámara compensadora)</li>
              </ol>
            </div>
          </section>

          {/* DISCLAIMER */}
          <div style={{
            fontSize: '10px',
            color: '#475569',
            fontStyle: 'italic',
            lineHeight: '1.5',
            padding: '12px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px'
          }}>
            Las tasas son referenciales y pueden variar según condiciones de mercado.
            Rendimientos netos sujetos a retención impositiva vigente.
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