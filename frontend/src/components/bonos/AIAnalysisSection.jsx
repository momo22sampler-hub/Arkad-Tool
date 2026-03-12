import React, { useState } from 'react';
import { Loader, AlertCircle, MessageSquare } from 'lucide-react';

export default function AIAnalysisSection({ bond }) {
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCustomQuestion = async (e) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;

    setLoading(true);
    setError('');
    setCustomAnswer('');

    const systemPrompt = `Eres un analista de renta fija senior argentino especializado en bonos soberanos y ONs corporativas.

REGLAS ESTRICTAS:
- NUNCA repitas datos numéricos que el usuario ya ve en pantalla (precio, TIR, paridad, duration)
- Tu función es INTERPRETAR, no listar datos
- Responde en 2-4 oraciones máximo
- Tono profesional pero accesible
- Si detectás incoherencias (TIR altísima, paridad muy baja), mencionalo
- Si te preguntan conceptos (¿qué es paridad?), explicá con ejemplo práctico`;

    const fullQuestion = `Contexto: estoy analizando ${bond.ticker} (${bond.emisor || ''}).
TIR: ${bond.tir}% | Paridad: ${bond.parity}% | Duration: ${bond.modified_duration}

Pregunta: ${customQuestion}

Respondé de forma clara y concisa (máximo 3 oraciones).`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: fullQuestion }]
        })
      });

      const data = await response.json();
      if (data.content && data.content[0]?.text) {
        setCustomAnswer(data.content[0].text);
      } else {
        throw new Error('Respuesta inválida');
      }
    } catch (err) {
      setError('Error al conectar con el asistente. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    '¿Por qué la paridad está tan baja?',
    '¿Qué significa que sea amortizable vs bullet?',
    '¿Es mucho riesgo para perfil conservador?',
    '¿Cómo impacta la legislación extranjera?'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <MessageSquare size={14} style={{ color: '#60a5fa' }} />
          <h5 style={{ fontSize: '10px', fontWeight: 'black', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Preguntale al Asistente
          </h5>
        </div>

        {/* Preguntas sugeridas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {suggestedQuestions.map((q, i) => (
            <button key={i} onClick={() => { setCustomQuestion(q); setCustomAnswer(''); }}
              style={{
                fontSize: '10px', padding: '6px 12px', backgroundColor: '#1e293b', color: '#94a3b8',
                borderRadius: '8px', border: '1px solid #334155', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.target.style.backgroundColor = '#334155'; e.target.style.color = '#e2e8f0'; }}
              onMouseOut={(e) => { e.target.style.backgroundColor = '#1e293b'; e.target.style.color = '#94a3b8'; }}
            >{q}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleCustomQuestion(e); }}
            placeholder="Escribí tu pregunta sobre este instrumento..."
            style={{
              width: '100%', backgroundColor: 'rgba(15, 23, 42, 1)', border: '1px solid #1e293b',
              padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box'
            }}
          />
          <button
            onClick={handleCustomQuestion}
            disabled={loading || !customQuestion.trim()}
            style={{
              width: '100%',
              backgroundColor: loading || !customQuestion.trim() ? '#1e293b' : '#3b82f6',
              color: loading || !customQuestion.trim() ? '#475569' : 'white',
              padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold',
              cursor: loading || !customQuestion.trim() ? 'not-allowed' : 'pointer',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s'
            }}
          >
            {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Consultando...</> : 'Enviar Pregunta'}
          </button>
        </div>

        {/* Respuesta */}
        {customAnswer && (
          <div style={{ marginTop: '16px', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '9px', color: '#60a5fa', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '8px' }}>Respuesta</div>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>{customAnswer}</p>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'start', gap: '8px', color: '#ef4444', fontSize: '12px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div style={{ fontSize: '10px', color: '#475569', fontStyle: 'italic', lineHeight: '1.5' }}>
        El asistente IA es una herramienta educativa. No constituye asesoramiento financiero. Consultá con un profesional antes de tomar decisiones de inversión.
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}