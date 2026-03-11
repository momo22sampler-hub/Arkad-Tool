import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function SensitivitySimulator({ currentPrice, modifiedDuration, currentTIR, currency }) {
  const [tirAdjustment, setTirAdjustment] = useState(0);
  const currencySymbol = currency === 'ARS' ? '$' : 'u$d';

  const calculateNewPrice = (tirChange) => {
    const priceChange = -modifiedDuration * (tirChange / 100) * currentPrice;
    return currentPrice + priceChange;
  };

  const newPrice = calculateNewPrice(tirAdjustment);
  const priceChangePercent = ((newPrice - currentPrice) / currentPrice) * 100;
  const newTIR = currentTIR + tirAdjustment;

  const getTrendIcon = () => {
    if (priceChangePercent > 0.1) return <TrendingUp style={{ color: '#4ade80' }} size={20} />;
    if (priceChangePercent < -0.1) return <TrendingDown style={{ color: '#ef4444' }} size={20} />;
    return <Minus style={{ color: '#64748b' }} size={20} />;
  };

  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: '1px solid #1e293b',
      padding: '24px',
      borderRadius: '16px'
    }}>
      <h3 style={{
        fontSize: '12px',
        fontWeight: 'black',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <TrendingUp size={14} style={{ color: '#f59e0b' }} /> Simulador de Sensibilidad
      </h3>

      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <label style={{
            fontSize: '10px',
            fontWeight: 'black',
            color: '#64748b',
            textTransform: 'uppercase'
          }}>
            Ajuste de TIR (puntos básicos)
          </label>
          <span style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#60a5fa'
          }}>
            {tirAdjustment > 0 ? '+' : ''}{tirAdjustment} bps
          </span>
        </div>

        <input
          type="range"
          min="-200"
          max="200"
          step="25"
          value={tirAdjustment}
          onChange={(e) => setTirAdjustment(Number(e.target.value))}
          style={{
            width: '100%',
            height: '8px',
            background: '#1e293b',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          color: '#475569',
          fontWeight: 'black',
          marginTop: '4px'
        }}>
          <span>-200 bps</span>
          <span>0</span>
          <span>+200 bps</span>
        </div>
      </div>

      {/* ESTADO ACTUAL */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #1e293b'
        }}>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '4px' }}>
            TIR Actual
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'black', color: '#cbd5e1' }}>
            {currentTIR.toFixed(2)}%
          </div>
        </div>
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #1e293b'
        }}>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '4px' }}>
            Precio Actual
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'black', color: '#cbd5e1' }}>
            {currencySymbol} {currentPrice.toFixed(2)}
          </div>
        </div>
      </div>

      {/* PROYECCIÓN */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(15, 23, 42, 1))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '20px',
        borderRadius: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 'black',
            color: '#60a5fa',
            textTransform: 'uppercase'
          }}>
            Proyección
          </span>
          {getTrendIcon()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '4px' }}>
              Nueva TIR
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'black', color: 'white' }}>
              {newTIR.toFixed(2)}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '4px' }}>
              Nuevo Precio
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'black', color: 'white' }}>
              {currencySymbol} {newPrice.toFixed(2)}
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: priceChangePercent > 0 ? 'rgba(74, 222, 128, 0.1)' : priceChangePercent < 0 ? 'rgba(239, 68, 68, 0.1)' : '#1e293b',
            border: priceChangePercent > 0 ? '1px solid rgba(74, 222, 128, 0.3)' : priceChangePercent < 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #1e293b',
            color: priceChangePercent > 0 ? '#4ade80' : priceChangePercent < 0 ? '#ef4444' : '#94a3b8'
          }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }}>
              Impacto en Precio
            </span>
            <span style={{ fontSize: '18px' }}>
              {priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '16px',
        fontSize: '10px',
        color: '#64748b',
        lineHeight: '1.5',
        fontStyle: 'italic'
      }}>
        Este simulador usa la aproximación lineal: ΔP ≈ -Duration × ΔY × P.
        Para cambios grandes (&gt;200 bps) la relación no es perfectamente lineal debido a la convexidad.
      </div>
    </div>
  );
}