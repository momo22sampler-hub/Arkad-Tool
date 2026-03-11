/**
 * api.js — Servicio central para todas las llamadas al backend
 * Importar en componentes: import api from '../services/api'
 */
// v2 - production build
const BASE_URL = 'https://arkad-tool.onrender.com';

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API Error ${res.status}: ${path}`);
  return res.json();
}

const api = {
  // Market data
  getMarketData:    () => get('/api/v1/market-data'),
  getBonos:         () => get('/api/v1/bonos'),
  getOns:           () => get('/api/v1/ons'),
  getCauciones:     () => get('/api/v1/cauciones'),
  getFcis:          () => get('/api/v1/fci'),
  getInstrument:    (ticker) => get(`/api/v1/instrument/${ticker}`),

  // Macro y TC
  getTcHoy:         () => get('/api/v1/tc-hoy'),
  getMacrosHoy:     () => get('/api/v1/macros-hoy'),
  getMacros:        (indicador, limit = 365) => {
    const params = new URLSearchParams();
    if (indicador) params.set('indicador', indicador);
    params.set('limit', limit);
    return get(`/api/v1/macros?${params}`);
  },

  // Health
  health:           () => get('/api/v1/health'),
};

export default api;