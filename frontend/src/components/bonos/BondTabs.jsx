import React from 'react';
import { TrendingUp, Building2, FileText, Globe } from 'lucide-react';

export default function BondTabs({ activeTab, onTabChange, bondCount, onCount, letrasCount, boprealCount }) {
  const tabs = [
    { id: 'bonos', label: 'Bonos Soberanos', icon: TrendingUp, count: bondCount },
    { id: 'ons', label: 'Obligaciones Negociables', icon: Building2, count: onCount },
    { id: 'letras', label: 'Letras', icon: FileText, count: letrasCount },
    { id: 'bopreal', label: 'BOPREAL', icon: Globe, count: boprealCount }
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              backgroundColor: isActive ? '#3b82f6' : '#0f172a',
              color: isActive ? 'white' : '#64748b',
              border: isActive ? 'none' : '1px solid #1e293b',
              boxShadow: isActive ? '0 10px 25px rgba(59, 130, 246, 0.3)' : 'none'
            }}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'black',
              backgroundColor: isActive ? '#2563eb' : '#1e293b'
            }}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}