import React, { useState } from 'react';
import NewsCard from './NewsCard';

// Datos mockeados
const MOCK_NEWS = [
  {
    id: 1,
    category: 'hoy',
    title: 'BCRA interviene con USD 180M en el mercado cambiario',
    source: 'Ámbito Financiero',
    date: '10/01/2026 14:32',
    url: '#',
    priority: 'high'
  },
  {
    id: 2,
    category: 'hoy',
    title: 'Bonos en dólares suben hasta 2.5% tras anuncio del FMI',
    source: 'Cronista',
    date: '10/01/2026 13:15',
    url: '#',
    priority: 'high'
  },
  {
    id: 3,
    category: 'mercado-local',
    title: 'YPF emite ON por USD 500M con cupón del 7.5%',
    source: 'Bloomberg',
    date: '10/01/2026 11:20',
    url: '#',
    priority: 'medium'
  },
  {
    id: 4,
    category: 'renta-fija',
    title: 'AL30 alcanza paridad del 62% en jornada volátil',
    source: 'Portfolio Personal',
    date: '10/01/2026 10:45',
    url: '#',
    priority: 'medium'
  },
  {
    id: 5,
    category: 'politica',
    title: 'Milei confirma veto a reforma del Banco Central',
    source: 'La Nación',
    date: '10/01/2026 09:30',
    url: '#',
    priority: 'high'
  },
  {
    id: 6,
    category: 'mercado-local',
    title: 'Inflación de diciembre se ubicó en 2.4% mensual',
    source: 'iProfesional',
    date: '09/01/2026 18:05',
    url: '#',
    priority: 'medium'
  },
  {
    id: 7,
    category: 'renta-fija',
    title: 'Tesoro coloca LECAP a tasa promedio del 3.2% mensual',
    source: 'El Economista',
    date: '09/01/2026 16:20',
    url: '#',
    priority: 'low'
  },
  {
    id: 8,
    category: 'politica',
    title: 'Caputo adelanta superávit fiscal del 1.8% para 2026',
    source: 'Infobae',
    date: '09/01/2026 14:50',
    url: '#',
    priority: 'medium'
  }
];

const NewsSection = () => {
  const [activeCategory, setActiveCategory] = useState('hoy');

  const categories = [
    { id: 'hoy', label: 'Hoy', icon: '📰' },
    { id: 'mercado-local', label: 'Mercado', icon: '📊' },
    { id: 'renta-fija', label: 'Renta Fija', icon: '💰' },
    { id: 'politica', label: 'Política', icon: '🏛️' }
  ];

  const filteredNews = activeCategory === 'hoy' 
    ? MOCK_NEWS 
    : MOCK_NEWS.filter(n => n.category === activeCategory);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#0f172a',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #0f172a'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'black',
          color: '#f1f5f9',
          letterSpacing: '-0.03em'
        }}>
          Noticias Financieras
        </h2>
      </div>

      {/* Categorías */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '12px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #0f172a',
        overflowX: 'auto'
      }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '8px 12px',
              backgroundColor: activeCategory === cat.id ? '#3b82f6' : 'transparent',
              color: activeCategory === cat.id ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Lista de noticias con NewsCard */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {filteredNews.map(news => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>
    </div>
  );
};

export default NewsSection;