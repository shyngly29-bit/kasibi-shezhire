// «Кәсіби шежіре» — ЖИ сервері (Claude). API кілті ТЕК осы серверде сақталады, сайтқа берілмейді.
// Сайт тек оқушы деректерін жібереді; тапсырма (prompt) осы серверде құрылады — сервер жалпы чат ретінде пайдаланылмайды.
import http from 'node:http'

// Claude OpenRouter арқылы: кілт OPENROUTER_API_KEY ортадан оқылады
const KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.AI_MODEL || 'anthropic/claude-opus-5.5'
const SITE = process.env.SITE_URL || 'https://shyngly29-bit.github.io/kasibi-shezhire/'
const PORT = Number(process.env.PORT || 8787)
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://shyngly29-bit.github.io,http://localhost:5180').split(',').map((s) => s.trim())

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

class UpstreamError extends Error { constructor(status, msg) { super(msg); this.status = status } }

async function ask(job) {
  if (!KEY) throw new UpstreamError(401, 'OPENROUTER_API_KEY орнатылмаған')
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': SITE,
      'X-Title': 'Kasibi Shezhire',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: job.maxTokens,
      messages: [{ role: 'system', content: job.system }, ...job.messages],
      reasoning: { effort: 'low' }, // чат үшін жылдам әрі арзан
    }),
    signal: AbortSignal.timeout(90_000),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok || json.error) throw new UpstreamError(json.error?.code || r.status, json.error?.message || `HTTP ${r.status}`)
  const choice = json.choices?.[0]
  const text = String(choice?.message?.content || '').trim()
  if (!text || choice?.finish_reason === 'content_filter' || choice?.native_finish_reason === 'refusal') {
    return { refused: true, text: 'Кешір, бұл сұраққа жауап бере алмаймын. Басқаша сұрап көр.' }
  }
  return { text, truncated: choice.finish_reason === 'length' }
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
    const st = Number(err.status) || 0
    console.error(`OpenRouter ${st}:`, err.message)
    if (st === 401 || st === 403) return send(res, 500, { error: 'auth' }, origin)
    if (st === 402) return send(res, 502, { error: 'credits', text: 'ЖИ балансы таусылды. Мұғалімге хабарла.' }, origin)
    if (st === 429) return send(res, 429, { error: 'upstream_rate', text: 'ЖИ қазір бос емес. Бір минуттан соң қайталап көр.' }, origin)
    return send(res, 502, { error: 'upstream' }, origin)
  }
}).listen(PORT, () => console.log(`Кәсіби шежіре ЖИ сервері: :${PORT}, модель ${MODEL}`))
