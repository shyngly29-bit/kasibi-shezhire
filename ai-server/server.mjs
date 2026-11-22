// «Кәсіби шежіре» — ЖИ сервері (Claude). API кілті ТЕК осы серверде сақталады, сайтқа берілмейді.
// Сайт тек оқушы деректерін жібереді; тапсырма (prompt) осы серверде құрылады — сервер жалпы чат ретінде пайдаланылмайды.
import http from 'node:http'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // ANTHROPIC_API_KEY ортадан оқылады
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5'
const PORT = Number(process.env.PORT || 8787)
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://shyngly29-bit.github.io,http://localhost:5180').split(',').map((s) => s.trim())
// Server-side fallback (бас тарту кезінде басқа модельде қайта орындау) — Opus / Sonnet / Fable үшін
const USE_FALLBACK = /opus|sonnet|fable/.test(MODEL)

// ---------- шектеулер ----------
const LIMIT = Number(process.env.RATE_LIMIT || 30) // 10 минутта бір IP-ден
const WINDOW = 10 * 60 * 1000
const hits = new Map()
function allowed(ip) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || now > h.reset) { hits.set(ip, { n: 1, reset: now + WINDOW }); return true }
  h.n++
  return h.n <= LIMIT
}
const clip = (s, n) => String(s ?? '').slice(0, n)

const BASE = `Сен — «Кәсіби шежіре» платформасындағы мектеп оқушыларына (7–11 сынып) арналған кәсіби бағдар беретін жылы, ынталандырушы көмекшісің.
Әрқашан қазақ тілінде, қарапайым, түсінікті жаз. Қысқа абзацтар, тізім керек болса «•» белгісі. Markdown тақырыптарын (#) қолданба.
Қазақстан мен Ақтөбе облысының шынайы мүмкіндіктеріне сүйен. Нақты жалақы, нақты оқу орны атауларын ойдан шығарма — білмесең, жалпы айт.`

// ---------- тапсырмалар ----------
function build(task, d) {
  if (task === 'interview') {
    const prof = clip(d.profession, 80) || 'электрик'
    const msgs = (Array.isArray(d.messages) ? d.messages : []).slice(-12)
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: clip(m.content, 800) }))
    if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: 'Сәлем! Өзіңді таныстыр.' })
    return {
      system: `${BASE}
Рөл ойыны: сен — 2040 жылы өмір сүріп жатқан «${prof}» маманысың және сен оқушының болашақтағы өзісің (оқушының аты: ${clip(d.name, 40) || 'белгісіз'}, сынып: ${clip(d.grade, 20) || 'белгісіз'}).
Өз жұмыс күніңді, қолданатын технологияларыңды (ЖИ, роботтар, дрондар т.б.) және мектепте қай пәндер көмектескенін әңгімеле.
Әр жауап 4–7 сөйлемнен аспасын, соңында оқушыға бір сұрақ қой. Шынайы бол: болашақты болжап айтып тұрғаныңды ескерт.`,
      messages: msgs,
      maxTokens: 1200,
    }
  }
  if (task === 'shezhire') {
    const rel = (Array.isArray(d.relatives) ? d.relatives : []).slice(0, 8)
      .map((r) => `• ${clip(r.role, 40)}: ${clip(r.job, 60)}`).join('\n')
    return {
      system: BASE,
      messages: [{ role: 'user', content: `Менің отбасымның кәсіптері:\n${rel}\n\nӘр кәсіп үшін: 2040 жылға қарай ол технологиялардың әсерінен қалай өзгереді және одан туатын 2 болашақ мамандықты атап, оған қай мектеп пәндері керек екенін айт. Соңында менің әулетімнің кәсіби «тамыры» туралы бір жылы қорытынды сөйлем жаз.` }],
      maxTokens: 1500,
    }
  }
  if (task === 'passport') {
    const list = (a) => (Array.isArray(a) ? a : []).slice(0, 8).map((x) => clip(x, 60)).join(', ')
    const vr = (Array.isArray(d.vr) ? d.vr : []).slice(0, 6).map((v) => `${clip(v.title, 40)} — ${Number(v.score) || 0}%`).join(', ')
    return {
      system: BASE,
      messages: [{ role: 'user', content: `Оқушы: ${clip(d.name, 40)} (${clip(d.grade, 20)}).
Қызығушылық типтері (Холланд): ${list(d.types) || 'тест өтілмеген'}.
Таңдаған 3 мамандығы: ${list(d.pick3) || 'таңдалмаған'}.
VR-сынамалар: ${vr || 'өтілмеген'}.
Отбасы кәсіптері: ${list(d.family) || 'енгізілмеген'}.

Осы деректер бойынша кәсіби паспортқа арналған қысқа жеке қорытынды жаз (8–10 сөйлем): күшті жақтары, қай бағыт ең сәйкес, келесі 3 нақты қадам (қай пәнге көңіл бөлу, қандай үйірме, не оқу). Ынталандырушы бол, бірақ шешімді оқушының өзі қабылдайтынын айт.` }],
      maxTokens: 1500,
    }
  }
  return null
}

async function ask(job) {
  const params = {
    model: MODEL,
    max_tokens: job.maxTokens,
    system: job.system,
    messages: job.messages,
    output_config: { effort: 'low' }, // чат үшін жылдам әрі арзан
  }
  const res = USE_FALLBACK
    ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
    : await client.messages.create(params)
  if (res.stop_reason === 'refusal') return { refused: true, text: 'Кешір, бұл сұраққа жауап бере алмаймын. Басқаша сұрап көр.' }
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  return { text, truncated: res.stop_reason === 'max_tokens' }
}

// ---------- HTTP ----------
function send(res, code, obj, origin) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', Vary: 'Origin' }
  if (origin && ORIGINS.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    h['Access-Control-Allow-Headers'] = 'Content-Type'
  }
  res.writeHead(code, h)
  res.end(obj === null ? '' : JSON.stringify(obj))
}

http.createServer(async (req, res) => {
  const origin = req.headers.origin
  if (req.method === 'OPTIONS') return send(res, 204, null, origin)
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, model: MODEL }, origin)
  if (req.method !== 'POST' || req.url !== '/api/ai') return send(res, 404, { error: 'not_found' }, origin)
  if (!origin || !ORIGINS.includes(origin)) return send(res, 403, { error: 'origin' }, origin)
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim()
  if (!allowed(ip)) return send(res, 429, { error: 'rate', text: 'Тым көп сұрау. Біраз күтіп, қайта көр.' }, origin)

  let body = ''
  for await (const chunk of req) { body += chunk; if (body.length > 20000) return send(res, 413, { error: 'too_large' }, origin) }
  let payload
  try { payload = JSON.parse(body) } catch { return send(res, 400, { error: 'json' }, origin) }
  const job = build(payload.task, payload.data || {})
  if (!job) return send(res, 400, { error: 'task' }, origin)

  try {
    return send(res, 200, await ask(job), origin)
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) { console.error('API кілті жарамсыз'); return send(res, 500, { error: 'auth' }, origin) }
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'upstream_rate', text: 'ЖИ қазір бос емес. Бір минуттан соң қайталап көр.' }, origin)
    if (err instanceof Anthropic.BadRequestError) { console.error('400:', err.message); return send(res, 500, { error: 'bad_request' }, origin) }
    if (err instanceof Anthropic.APIError) { console.error(`API ${err.status}:`, err.message); return send(res, 502, { error: 'upstream' }, origin) }
    console.error(err)
    return send(res, 500, { error: 'server' }, origin)
  }
}).listen(PORT, () => console.log(`Кәсіби шежіре ЖИ сервері: :${PORT}, модель ${MODEL}`))
