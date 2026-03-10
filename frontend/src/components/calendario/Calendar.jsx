import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function Calendar({ bonds = [], customEvents = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedInstruments, setSelectedInstruments] = useState(new Set());

  const events = useMemo(() => {
    const allEvents = [];

    // Eventos de cash_flow de bonos del mercado
    bonds.forEach(bond => {
      if (!bond.cash_flow) return;
      bond.cash_flow.forEach(cf => {
        try {
          const [day, month, year] = cf.fecha.split('/');
          const eventDate = new Date(year, month - 1, day);
          if (eventDate >= new Date()) {
            allEvents.push({
              date: eventDate,
              dateStr: cf.fecha,
              ticker: bond.ticker,
              emisor: bond.emisor,
              tipo: cf.tipo,
              monto: cf.monto,
              moneda: bond.moneda,
              isCustom: false,
            });
          }
        } catch (e) {
          console.error('Error parsing date:', cf.fecha);
        }
      });
    });

    // Eventos personales (compras, ventas, cupones de cartera, vencimientos)
    customEvents.forEach(ev => {
      try {
        const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
        if (!isNaN(d)) {
          allEvents.push({
            date: d,
            dateStr: d.toLocaleDateString('es-AR'),
            ticker: ev.ticker || '—',
            tipo: ev.tipo || 'Evento',
            monto: ev.monto || '—',
            moneda: ev.moneda || 'ARS',
            isCustom: true,
            isActualPayment: ev.isActualPayment || false,
          });
        }
      } catch (e) {
        console.error('Error parsing customEvent:', ev);
      }
    });

    return allEvents;
  }, [bonds, customEvents]);

  const filteredEvents = useMemo(() => {
    if (selectedInstruments.size === 0) return events;
    return events.filter(e => selectedInstruments.has(e.ticker));
  }, [events, selectedInstruments]);

  const generateCalendarDays = () => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay     = new Date(year, month, 1);
    const lastDay      = new Date(year, month + 1, 0);
    const daysInMonth  = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startDayOfWeek; i++) days.push({ day: null, events: [] });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = filteredEvents.filter(e =>
        e.date.getDate() === day &&
        e.date.getMonth() === month &&
        e.date.getFullYear() === year
      );
      days.push({ day, date, events: dayEvents });
    }
    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthName    = currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth     = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday         = () => setCurrentDate(new Date());

  const toggleInstrument = (ticker) => {
    const s = new Set(selectedInstruments);
    s.has(ticker) ? s.delete(ticker) : s.add(ticker);
    setSelectedInstruments(s);
  };

  const uniqueTickers = [...new Set(events.map(e => e.ticker))];

  const getEventColor = (tipo, isCustom, isActualPayment) => {
    if (isCustom && !isActualPayment) return '#3b82f6';          // Azul  → compra/venta
    if (tipo.includes('Capital') || tipo.includes('Vencimiento')) return '#ef4444'; // Rojo → vencimiento
    if (tipo.includes('Amort'))   return '#f59e0b';               // Naranja → amortización
    return '#4ade80';                                              // Verde  → cupón
  };

  const th = {
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    text: '#f1f5f9', sub: '#64748b', sub2: '#94a3b8', blue: '#60a5fa',
  };

  return (
    <div style={{ backgroundColor: th.bg, border: `1px solid #1e293b`, borderRadius: 16, padding: 24, height: '100%' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarIcon size={20} style={{ color: th.blue }} />
          <h2 style={{ fontSize: 20, fontWeight: 900, color: th.text, margin: 0, textTransform: 'capitalize' }}>
            {monthName}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={goToPreviousMonth} style={{ padding: 8, backgroundColor: th.card, border: `1px solid ${th.border}`, borderRadius: 8, color: th.sub2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToToday} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            Hoy
          </button>
          <button onClick={goToNextMonth} style={{ padding: 8, backgroundColor: th.card, border: `1px solid ${th.border}`, borderRadius: 8, color: th.sub2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* FILTROS */}
      {uniqueTickers.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 10, color: th.sub, fontWeight: 700, textTransform: 'uppercase', alignSelf: 'center', marginRight: 8 }}>Filtrar:</span>
          {uniqueTickers.map(ticker => (
            <button key={ticker} onClick={() => toggleInstrument(ticker)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              backgroundColor: selectedInstruments.has(ticker) ? '#3b82f6' : th.card,
              color: selectedInstruments.has(ticker) ? 'white' : th.sub,
              border: `1px solid ${selectedInstruments.has(ticker) ? '#3b82f6' : th.border}`
            }}>
              {ticker}
            </button>
          ))}
        </div>
      )}

      {/* GRILLA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
          <div key={d} style={{ padding: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: th.sub, textTransform: 'uppercase' }}>{d}</div>
        ))}

        {calendarDays.map((dayData, index) => {
          const isToday = dayData.date && dayData.date.toDateString() === new Date().toDateString();
          return (
            <div key={index} style={{
              minHeight: 80, padding: 8,
              backgroundColor: dayData.day ? th.card : 'transparent',
              borderRadius: 8,
              border: isToday ? '2px solid #3b82f6' : `1px solid ${th.border}`,
              display: 'flex', flexDirection: 'column', gap: 4
            }}>
              {dayData.day && (
                <>
                  <span style={{ fontSize: 14, fontWeight: isToday ? 900 : 700, color: isToday ? th.blue : th.text }}>
                    {dayData.day}
                  </span>
                  {dayData.events.slice(0, 2).map((event, i) => (
                    <div key={i}
                      title={`${event.ticker} — ${event.tipo}: ${event.moneda} ${event.monto}`}
                      style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                        backgroundColor: getEventColor(event.tipo, event.isCustom, event.isActualPayment),
                        color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer'
                      }}
                    >
                      {event.ticker}
                    </div>
                  ))}
                  {dayData.events.length > 2 && (
                    <div style={{ fontSize: 8, color: th.sub, fontWeight: 700, textAlign: 'center' }}>
                      +{dayData.events.length - 2}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* LEYENDA */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 16, fontSize: 11, flexWrap: 'wrap' }}>
        {[
          { color: '#3b82f6', label: 'Compra/Venta' },
          { color: '#4ade80', label: 'Cupón' },
          { color: '#f59e0b', label: 'Amortización' },
          { color: '#ef4444', label: 'Vencimiento' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
            <span style={{ color: th.sub2 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* RESUMEN */}
      <div style={{ marginTop: 24, padding: 16, backgroundColor: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: th.sub2, fontWeight: 700 }}>Eventos este mes:</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: th.blue }}>
            {filteredEvents.filter(e =>
              e.date.getMonth() === currentDate.getMonth() &&
              e.date.getFullYear() === currentDate.getFullYear()
            ).length}
          </span>
        </div>
      </div>
    </div>
  );
}