// ЖИ клиенті: сайт API кілтін білмейді — тек өз серверімізге (ai-server) сұрау жібереді.
// Сервер мекенжайы құрастыру кезінде беріледі: VITE_AI_URL (мыс. https://kasibi-shezhire-ai.onrender.com)
import { PROFESSIONS, RIASEC, VR_INFO } from './data'
import { topTypes } from './store'

export const AI_URL = (import.meta.env.VITE_AI_URL || '').replace(/\/$/, '')
export const aiEnabled = !!AI_URL

// Тегін Render сервері ұйықтап қалады — сайт ашылғанда алдын ала оятамыз
let woke = false
export function wakeAI() {
  if (!aiEnabled || woke) return
  woke = true
  fetch(`${AI_URL}/health`, { mode: 'cors' }).catch(() => { woke = false })
}

// Платформадағы барлық нәтиже → ЖИ-ге жеке контекст
export function profileOf(s) {
  return {
    name: s.student?.name, grade: s.student?.grade,
    types: topTypes(s.testAfter || s.testBefore).slice(0, 3).map((k) => RIASEC[k].name),
    pick3: (s.pick3 || []).map((id) => PROFESSIONS.find((x) => x.id === id)?.name).filter(Boolean),
    vr: Object.entries(s.vr || {}).map(([id, r]) => ({ title: VR_INFO[id]?.title || id, score: r.score })),
    family: (s.family || []).filter((f) => f.job?.trim()).map((f) => `${f.role}: ${f.job}`),
  }
}

export async function askAI(task, data, { onSlow, fresh } = {}) {
  if (!aiEnabled) throw new Error('ЖИ сервері әлі қосылмаған')
  const slow = onSlow && setTimeout(onSlow, 7000)
  try {
    const res = await fetch(`${AI_URL}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, data, fresh }),
      signal: AbortSignal.timeout(120_000),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.text || 'ЖИ уақытша қолжетімсіз. Кейінірек қайталап көр.')
    return json.text || ''
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'TypeError') throw new Error('ЖИ серверіне қосыла алмадым. Интернетті тексеріп, қайталап көр.')
    throw e
  } finally { clearTimeout(slow) }
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
