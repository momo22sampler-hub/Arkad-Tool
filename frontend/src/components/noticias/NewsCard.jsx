import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

// Función para generar observación del sistema
const generateObservation = (news) => {
  const title = news.title.toLowerCase();
  const observations = [];

  // Reglas basadas en keywords
  if (title.includes('milei') || title.includes('bcra') || title.includes('fmi') || title.includes('banco central')) {
    observations.push('Este evento podría repercutir en bonos soberanos como AL y GD.');
  }
  
  if (title.includes('inflación') || title.includes('inflacion') || title.includes('tasa') || title.includes('tasas')) {
    observations.push('Posible impacto en expectativas de tasas y curva en pesos.');
  }
  
  if (title.includes('ypf') || title.includes('empresa') || title.includes('corporativa') || title.includes('on ')) {
    observations.push('Movimiento relevante para ONs corporativas y equity local.');
  }
  
  if (title.includes('dólar') || title.includes('dolar') || title.includes('tipo de cambio') || title.includes('mep') || title.includes('ccl')) {
    observations.push('Atención a spreads cambiarios y dólar-linked.');
  }
  
  if (title.includes('fiscal') || title.includes('déficit') || title.includes('superávit')) {
    observations.push('Impacto potencial en percepción de riesgo país y duration.');
  }

  if (observations.length === 0) {
    return 'Evento de contexto general. Monitorear evolución.';
  }

  return observations.join(' ');
};

// Función para generar métricas cuantitativas mock
const generateMetrics = (news) => {
  const title = news.title.toLowerCase();
  const metrics = [];

  if (title.includes('bono') || title.includes('al30') || title.includes('gd')) {
    const variation = (Math.random() * 4 - 2).toFixed(1);
    const bps = Math.floor(Math.random() * 150 - 75);
    metrics.push(`AL30 ${variation > 0 ? '+' : ''}${variation}%`);
    metrics.push(`TIR ${bps > 0 ? '+' : ''}${bps} bps`);
  }
  
  if (title.includes('dólar') || title.includes('dolar') || title.includes('mep') || title.includes('ccl')) {
    const mep = (Math.random() * 30 + 1130).toFixed(1);
    const spread = (Math.random() * 10 + 5).toFixed(1);
    metrics.push(`MEP $${mep}`);
    metrics.push(`Spread ${spread}%`);
  }
  
  if (title.includes('riesgo país') || title.includes('riesgo pais')) {
    const rp = Math.floor(Math.random() * 50 - 25);
    metrics.push(`Riesgo País ${rp > 0 ? '+' : ''}${rp} pts`);
  }

  if (title.includes('ypf') || title.includes('on ') || title.includes('corporativa')) {
    const variation = (Math.random() * 6 - 3).toFixed(1);
    metrics.push(`YPF ON ${variation > 0 ? '+' : ''}${variation}%`);
  }

  return metrics.length > 0 ? metrics : ['Sin datos cuantitativos'];
};

// Componente NewsCard
const NewsCard = ({ news }) => {
  const observation = generateObservation(news);
  const metrics = generateMetrics(news);

  const getImpactColor = (priority) => {
    switch (priority) {
      case 'high':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', label: 'Alto', color: '#ef4444' };
      case 'medium':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', label: 'Medio', color: '#f59e0b' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.1)', border: '#64748b', label: 'Bajo', color: '#64748b' };
    }
  };

  const impact = getImpactColor(news.priority);

  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      border: `1px solid ${impact.border}`,
      padding: '20px',
      marginBottom: '16px',
      transition: 'all 0.2s'
    }}>
      {/* Header con impacto */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#f1f5f9',
            lineHeight: '1.4',
            marginBottom: '8px'
          }}>
            {news.title}
          </h3>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            color: '#64748b',
            fontWeight: 'bold'
          }}>
            <span>{news.source}</span>
            <span>•</span>
            <span>{news.date}</span>
          </div>
        </div>

        {/* Indicador de impacto */}
        <div style={{
          padding: '6px 12px',
          backgroundColor: impact.bg,
          border: `1px solid ${impact.border}`,
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: 'black',
          color: impact.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap'
        }}>
          {impact.label}
        </div>
      </div>

      {/* Métricas cuantitativas */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #0f172a'
      }}>
        {metrics.map((metric, idx) => {
          const isPositive = metric.includes('+');
          const isNegative = metric.includes('-') && !metric.includes('linked');
          
          return (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#cbd5e1'
            }}>
              {isPositive && <TrendingUp size={12} />}
              {isNegative && <TrendingDown size={12} />}
              {metric}
            </div>
          );
        })}
      </div>

      {/* Observación del sistema */}
      <div style={{
        backgroundColor: '#0f172a',
        borderLeft: '3px solid #3b82f6',
        padding: '12px 16px',
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <AlertCircle size={14} style={{ color: '#60a5fa', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{
              fontSize: '9px',
              fontWeight: 'black',
              color: '#60a5fa',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px'
            }}>
              Observación del Sistema
            </div>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              {observation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;