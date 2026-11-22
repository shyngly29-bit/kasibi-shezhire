// ЖИ клиенті: сайт API кілтін білмейді — тек өз серверімізге (ai-server) сұрау жібереді.
// Сервер мекенжайы құрастыру кезінде беріледі: VITE_AI_URL (мыс. https://kasibi-shezhire-ai.onrender.com)
export const AI_URL = (import.meta.env.VITE_AI_URL || '').replace(/\/$/, '')
export const aiEnabled = !!AI_URL

export async function askAI(task, data, { signal } = {}) {
  if (!aiEnabled) throw new Error('ЖИ сервері әлі қосылмаған')
  const res = await fetch(`${AI_URL}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, data }),
    signal,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.text || 'ЖИ уақытша қолжетімсіз. Кейінірек қайталап көр.')
  return json.text || ''
}

// Жауапты қарапайым абзацтарға бөлу (markdown белгілерін тазалау)
export function paragraphs(text) {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .split(/\n{2,}|\n(?=•|- )/)
    .map((p) => p.trim())
    .filter(Boolean)
}
