import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const API_BASE = 'https://arkad-tool.onrender.com';

const FinancialTicker = () => {
  const [tickerItems, setTickerItems] = useState([]);
  const [position, setPosition] = useState(0);
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  // Cargar datos reales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tcRes, macrosRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/tc-hoy`),
          fetch(`${API_BASE}/api/v1/macros-hoy`)
        ]);
        const tc = await tcRes.json();
        const macros = await macrosRes.json();

        const items = [];

        // Tipos de cambio
        const casas = ['oficial', 'mayorista', 'mep', 'ccl', 'blue', 'cripto', 'tarjeta'];
        const labels = {
          oficial: 'OFICIAL',
          mayorista: 'MAYORISTA',
          mep: 'MEP',
          ccl: 'CCL',
          blue: 'BLUE',
          cripto: 'USDT',
          tarjeta: 'TARJETA'
        };

        casas.forEach(casa => {
          const row = tc.find(r => r.casa === casa);
          if (row) {
            const valor = parseFloat(row.venta || row.compra || 0);
            const variacion = parseFloat(row.variacion || 0);
            if (valor > 0) {
              items.push({
                label: labels[casa] || casa.toUpperCase(),
                value: `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                var: variacion
              });
            }
          }
        });

        // Riesgo país
        const riesgoPais = macros.find(m => m.tipo === 'riesgo_pais');
        if (riesgoPais) {
          items.push({
            label: 'RIESGO PAÍS',
            value: Math.round(parseFloat(riesgoPais.valor || 0)).toString(),
            var: 0
          });
        }

        // Mejor plazo fijo (TNA más alta para clientes)
        const plazosFijos = macros.filter(m => m.tipo === 'plazo_fijo');
        if (plazosFijos.length > 0) {
          const mejor = plazosFijos.reduce((max, m) =>
            parseFloat(m.valor || 0) > parseFloat(max.valor || 0) ? m : max
          );
          const tna = (parseFloat(mejor.valor || 0) * 100).toFixed(1);
          items.push({
            label: 'MEJOR PF TNA',
            value: `${tna}%`,
            var: 0
          });
        }

        setTickerItems(items);
      } catch (err) {
        console.error('Error cargando ticker:', err);
        // Si falla la API, mostrar items vacíos
        setTickerItems([]);
      }
    };

    fetchData();
    // Refrescar cada 5 minutos
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Animación del ticker
  useEffect(() => {
    if (tickerItems.length === 0) return;

    const anim = setInterval(() => {
      setPosition(prev => {
        const contentWidth = contentRef.current?.scrollWidth / 3 || 1000;
        if (Math.abs(prev) >= contentWidth) return 0;
        return prev - 1;
      });
    }, 30);
    return () => clearInterval(anim);
  }, [tickerItems]);

  // Triplicar para loop infinito
  const infiniteItems = [...tickerItems, ...tickerItems, ...tickerItems];

  if (tickerItems.length === 0) {
    return (
      <div style={{
        width: '100%',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '24px'
      }}>
        <span style={{ color: '#334155', fontSize: '12px', fontWeight: 'bold' }}>
          Cargando datos de mercado...
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      width: '100%',
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #1e293b',
      overflow: 'hidden',
      position: 'relative',
      height: '48px'
    }}>
      <div
        ref={contentRef}
        style={{
          display: 'flex',
          position: 'absolute',
          left: `${position}px`,
          gap: '0',
          alignItems: 'center',
          height: '100%',
          paddingLeft: '100%',
          willChange: 'transform'
        }}
      >
        {infiniteItems.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            whiteSpace: 'nowrap',
            padding: '0 20px',
            borderRight: '1px solid #1e293b',
            height: '100%'
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '900',
              color: '#475569',
              letterSpacing: '0.08em'
            }}>
              {item.label}
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#f1f5f9',
              fontFamily: 'monospace'
            }}>
              {item.value}
            </span>
            {item.var !== 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: item.var >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {item.var >= 0
                  ? <TrendingUp size={11} />
                  : <TrendingDown size={11} />
                }
                {Math.abs(item.var).toFixed(2)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinancialTicker;
