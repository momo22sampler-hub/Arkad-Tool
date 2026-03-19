import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, Layers, Briefcase, Clock, PieChart, Newspaper,  BarChart3, Activity } from 'lucide-react';
import BondDetailView from './components/bonos/BondDetailView';
import ONDetailView from './components/bonos/ONDetailView';
import BondTabs from './components/bonos/BondTabs';
import ONTable from './components/bonos/ONTable';
import Portfolio from './components/portfolio/Portfolio';
import PortfolioFCI from './components/portfolio/PortfolioFCI';
import CaucionesView from './components/cauciones/CaucionesView';
import FCIView from './components/fci/FCIView';
import FinancialTicker from './components/shared/FinancialTicker';
import NewsSection from './components/noticias/NewsSection';
import logo from './assets/logo.png';
import MacroDashboard from './components/MacroDashboard';
import RankingDashboard from './components/rankingdashboard';
import FCIRankingDashboard from './components/FCIRankingDashboard';


function App() {
  const [bonos, setBonos] = useState([]);
  const [letras, setLetras] = useState([]);
  const [bopreal, setBopreal] = useState([]);
  const [ons, setOns] = useState([]);
  const [cauciones, setCauciones] = useState([]);
  const [fcis, setFcis] = useState([]);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingCauciones, setLoadingCauciones] = useState(true);
  const [loadingFCIs, setLoadingFCIs] = useState(true);
  const [activeTab, setActiveTab] = useState('bonos');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('bonos');
  const [apiMetadata, setApiMetadata] = useState(null);
  const [bondSort, setBondSort] = useState({ field: 'ticker', dir: 'asc' });

  const handleBondSort = (field) => {
    setBondSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  useEffect(() => {
    fetch('https://arkad-tool.onrender.com/api/v1/market-data')
      .then(res => res.json())
      .then(data => {
        console.log("API Response:", data);

        setBonos(data.bonos || []);
        setLetras(data.letras || []);
        setBopreal(data.bopreal || []);
        setOns(data.ons || []);
        setApiMetadata(data.metadata);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error API:", err);
        setLoading(false);
      });
  }, []);

  // Cauciones desde Supabase (ya incluye deduplicación en backend)
  useEffect(() => {
    fetch('https://arkad-tool.onrender.com/api/v1/cauciones')
      .then(res => res.json())
      .then(data => {
        setCauciones(Array.isArray(data) ? data : []);
        setLoadingCauciones(false);
      })
      .catch(err => {
        console.error("Error API Cauciones:", err);
        setLoadingCauciones(false);
      });
  }, []);

  useEffect(() => {
    fetch('https://arkad-tool.onrender.com/api/v1/fci')
      .then(res => res.json())
      .then(data => {
        const normalized = (Array.isArray(data) ? data : []).map(fci => ({
          ...fci,
          metrics: {
            tea:        fci.tea_proyectada  != null ? fci.tea_proyectada  / 100 : null,
            momentum:   fci.performance_30d != null ? fci.performance_30d / 100 : null,
            volatility: null,
            drawdown:   null,
          }
        }));
        setFcis(normalized);
        setLoadingFCIs(false);
      })
      .catch(err => {
        console.error("Error API FCIs:", err);
        setLoadingFCIs(false);
      });
  }, []);

  // Filtra instrumentos con más de 1 campo faltante.
  // Campos evaluados: price, clean_price, parity, tir, volume, variation
  const hasEnoughData = (item) => {
    const campos = [
      item.price > 0,
      item.clean_price > 0,
      item.parity > 0,
      item.tir > 0,
      item.volume > 0,
      item.variation != null,
    ];
    const faltantes = campos.filter(ok => !ok).length;
    return faltantes <= 1;
  };

  const filteredBonos = bonos.filter(item =>
    hasEnoughData(item) &&
    (searchTerm === '' || item.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredLetras = letras.filter(item =>
    hasEnoughData(item) &&
    (searchTerm === '' || item.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredBopreal = bopreal.filter(item =>
    hasEnoughData(item) &&
    (searchTerm === '' || item.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredONs = ons.filter(item =>
    hasEnoughData(item) &&
    (searchTerm === '' || item.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const bondCount = filteredBonos.length;
  const letrasCount = filteredLetras.length;
  const boprealCount = filteredBopreal.length;
  const onCount = filteredONs.length;

  const currentBonosData = (() => {
    const base = activeTab === 'bonos' ? filteredBonos : activeTab === 'letras' ? filteredLetras : activeTab === 'bopreal' ? filteredBopreal : [];
    return [...base].sort((a, b) => {
      let va = a[bondSort.field] ?? '';
      let vb = b[bondSort.field] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return bondSort.dir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
  })();

  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'USD': return 'u$d';
      case 'USD_CABLE': return 'u$d C';
      case 'ARS': return '$';
      default: return '$';
    }
  };

  // Formato argentino: $88.410 (punto como separador de miles)
  const formatPrice = (price, currency) => {
    if (!price || price <= 0) return 'N/A';
    const sym = getCurrencySymbol(currency);
    // Si el precio es grande (>999), mostrar sin decimales con punto como miles
    if (price >= 1000) {
      return `${sym} ${Math.round(price).toLocaleString('es-AR')}`;
    }
    // Si es chico (ej: USD directo), mostrar con 2 decimales
    return `${sym} ${price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (selectedInstrument) {
    if (selectedInstrument.tipo === 'Obligación Negociable') {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0b0f1a',
          padding: '40px',
          overflow: 'auto'
        }}>
          <ONDetailView on={selectedInstrument} onBack={() => setSelectedInstrument(null)} />
        </div>
      );
    } else {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0b0f1a',
          padding: '40px',
          overflow: 'auto'
        }}>
          <BondDetailView bond={selectedInstrument} onBack={() => setSelectedInstrument(null)} />
        </div>
      );
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#0b0f1a',
      color: '#f1f5f9',
      fontFamily: 'sans-serif',
      overflow: 'hidden'
    }}>

      {/* ── TOP NAV HORIZONTAL ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '0 24px',
        height: '52px',
        flexShrink: 0,
        gap: '8px'
      }}>
        {/* Logo */}
        <img
          src={logo}
          alt="AFI"
          style={{ height: '32px', width: 'auto', mixBlendMode: 'screen', marginRight: '16px', flexShrink: 0 }}
        />

        {/* Nav items */}
        {[
          { view: 'ranking',     icon: <BarChart3 size={14} />,  label: 'Ranking'       },
          { view: 'macro',       icon: <Activity size={14} />,   label: 'Macro'         },
          { view: 'noticias',    icon: <Newspaper size={14} />,  label: 'Noticias'      },
          { view: 'mercados',    icon: <TrendingUp size={14} />, label: 'Bonos & ONs'   },
          { view: 'cauciones',   icon: <Clock size={14} />,      label: 'Cauciones'     },
          { view: 'fcis',        icon: <PieChart size={14} />,   label: 'FCIs'          },
          { view: 'fci-ranking', icon: <BarChart3 size={14} />,  label: 'Ranking FCIs'  },
          { view: 'portfolio',   icon: <Briefcase size={14} />,  label: 'Portfolio'     },
        ].map(({ view, icon, label }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: active ? '#1e293b' : 'transparent',
                color: active ? '#60a5fa' : '#64748b',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '12px',
                transition: 'all 0.2s',
                cursor: 'pointer',
                border: active ? '1px solid #334155' : '1px solid transparent',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseOver={(e) => { if (!active) e.currentTarget.style.backgroundColor = '#1e293b'; }}
              onMouseOut={(e)  => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {icon} {label}
            </button>
          );
        })}

        {/* Spacer + market status */}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {apiMetadata && (
            <div style={{
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              border: `1px solid ${apiMetadata.market_status === 'OPEN' ? '#22c55e' : '#ef4444'}`,
              background: apiMetadata.market_status === 'OPEN' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: apiMetadata.market_status === 'OPEN' ? '#4ade80' : '#f87171',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {apiMetadata.market_status === 'OPEN' ? '🟢 Online' : '🔴 Cerrado'}
            </div>
          )}
        </div>
      </header>

      {/* ── FINANCIAL TICKER ── */}
      <FinancialTicker />

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>

          

          

          {currentView === 'macro' && (
            <MacroDashboard />
          )}

          {currentView === 'noticias' && (
            <NewsSection />
          )}

          {currentView === 'cauciones' && (
            <CaucionesView cauciones={cauciones} loading={loadingCauciones} />
          )}

          {currentView === 'fcis' && (
            <FCIView fcis={fcis} loading={loadingFCIs} />
          )}

          {currentView === 'fci-ranking' && (
            <FCIRankingDashboard />
          )}

          {currentView === 'portfolio' && (
            <PortfolioFCI />
          )}

          {currentView === 'ranking' && (
            <RankingDashboard />
          )}

          {currentView === 'mercados' && (
            <div style={{ padding: '48px' }}>
              <header style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h1 style={{
                      fontSize: '48px',
                      fontWeight: 'black',
                      letterSpacing: '-0.05em',
                      margin: 0
                    }}>
                      Market View
                    </h1>
                    <p style={{
                      color: '#64748b',
                      fontWeight: 'bold',
                      marginTop: '4px',
                      fontSize: '16px'
                    }}>
                      Explorador de Renta Fija • Datos BYMA
                    </p>
                  </div>
                  <div style={{
                    position: 'relative',
                    width: '400px'
                  }}>
                    <Search size={18} style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b'
                    }} />
                    <input
                      type="text"
                      placeholder="Buscar ticker..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 48px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                        color: '#f1f5f9',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                </div>

                <BondTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  bondCount={bondCount}
                  onCount={onCount}
                  letrasCount={letrasCount}
                  boprealCount={boprealCount}
                />
              </header>

              {loading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  color: '#64748b',
                  fontWeight: 'bold'
                }}>
                  <TrendingUp style={{ animation: 'spin 1s linear infinite' }} />
                  Conectando con mercados...
                </div>
              ) : ['bonos', 'letras', 'bopreal'].includes(activeTab) ? (
                currentBonosData.length === 0 ? (
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    padding: '32px',
                    borderRadius: '16px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#64748b', fontWeight: 'bold' }}>
                      No se encontraron bonos que coincidan con tu búsqueda.
                    </p>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#0f172a',
                    borderRadius: '16px',
                    border: '1px solid #1e293b',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
                  }}>
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
                          {[['ticker', 'Instrumento'], ['price', 'Precio Dirty'], ['clean_price', 'Precio Clean'], ['currency', 'Moneda'], ['parity', 'Paridad'], ['tir', 'TIR %'], ['volume', 'Volumen'], ['variation', 'Variación']].map(([field, label]) => (
                            <th
                              key={field}
                              style={{ padding: field === 'ticker' ? '24px' : '16px 12px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                              onClick={() => handleBondSort(field)}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {label}
                                {bondSort.field === field
                                  ? (bondSort.dir === 'asc' ? ' ▲' : ' ▼')
                                  : <span style={{ opacity: 0.35 }}> ⇅</span>}
                              </span>
                            </th>
                          ))}
                          <th style={{ paddingRight: '24px', textAlign: 'right' }}>Análisis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentBonosData.map((bond, i) => (
                          <tr
                            key={i}
                            onClick={() => setSelectedInstrument(bond)}
                            style={{
                              borderTop: '1px solid #1e293b',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                              e.currentTarget.querySelector('.ticker').style.color = '#60a5fa';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.querySelector('.ticker').style.color = 'white';
                            }}
                          >
                            <td style={{ padding: '24px' }}>
                              <div className="ticker" style={{
                                fontWeight: 'black',
                                fontSize: '18px',
                                color: 'white',
                                transition: 'color 0.2s'
                              }}>
                                {bond.ticker}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: '#64748b',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                marginTop: '2px'
                              }}>
                                {bond.tipo}
                              </div>

                              <div style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                marginTop: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span style={{ color: bond.source === 'BYMA' ? '#22c55e' : '#fbbf24' }}>
                                  {bond.source === 'BYMA' ? '📡' : '📋'} {bond.source}
                                </span>
                                {bond.is_cer && (
                                  <span style={{
                                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                    border: '1px solid rgba(139, 92, 246, 0.4)',
                                    color: '#a78bfa',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontSize: '9px',
                                    fontWeight: 'black',
                                    letterSpacing: '0.05em'
                                  }}>
                                    CER
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              {bond.price > 0 ? (
                                <>{formatPrice(bond.price, bond.currency)}</>
                              ) : (
                                <span style={{ color: '#64748b' }}>N/A</span>
                              )}
                            </td>
                            <td style={{
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              {bond.clean_price > 0 ? (
                                <>{formatPrice(bond.clean_price, bond.currency)}</>
                              ) : (
                                <span style={{ color: '#64748b' }}>-</span>
                              )}
                            </td>
                            <td>
                              <span style={{
                                backgroundColor: bond.currency === 'USD' ? 'rgba(34, 197, 94, 0.1)' :
                                  bond.currency === 'USD_CABLE' ? 'rgba(59, 130, 246, 0.1)' :
                                    'rgba(251, 191, 36, 0.1)',
                                color: bond.currency === 'USD' ? '#22c55e' :
                                  bond.currency === 'USD_CABLE' ? '#3b82f6' :
                                    '#fbbf24',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontWeight: 'black',
                                fontSize: '11px',
                                border: bond.currency === 'USD' ? '1px solid rgba(34, 197, 94, 0.2)' :
                                  bond.currency === 'USD_CABLE' ? '1px solid rgba(59, 130, 246, 0.2)' :
                                    '1px solid rgba(251, 191, 36, 0.2)'
                              }}>
                                {bond.currency === 'USD' ? 'USD' :
                                  bond.currency === 'USD_CABLE' ? 'USD C' :
                                    'ARS'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 'bold', color: '#cbd5e1' }}>
                              {bond.parity > 0 ? `${bond.parity.toFixed(2)}%` : '-'}
                            </td>
                            <td style={{ fontWeight: 'bold', color: (bond.tir || 0) > 0 ? '#34d399' : '#64748b' }}>
                              {bond.tir > 0 ? `${bond.tir.toFixed(2)}%` : <span style={{ color: '#475569' }}>-</span>}
                            </td>
                            <td style={{
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              color: '#cbd5e1',
                              fontWeight: 'bold'
                            }}>
                              {bond.volume > 0 ? bond.volume.toLocaleString() : '-'}
                            </td>
                            <td style={{
                              fontWeight: 'bold',
                              color: (bond.variation != null && bond.variation >= 0) ? '#4ade80' : '#ef4444'
                            }}>
                              {bond.variation != null ? (
                                <>{bond.variation > 0 ? '+' : ''}{bond.variation.toFixed(2)}%</>
                              ) : (
                                <span style={{ color: '#64748b' }}>-</span>
                              )}
                            </td>
                            <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                backgroundColor: '#0f172a',
                                border: '1px solid #1e293b',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontWeight: 'black',
                                color: '#64748b',
                                textTransform: 'uppercase'
                              }}>
                                Full Data <Layers size={12} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <ONTable
                  ons={filteredONs}
                  onSelect={setSelectedInstrument}
                  loading={false}
                />
              )}
            </div>
          )}
        </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default App;