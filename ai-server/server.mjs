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

const BASE = `Сен — «Кәсіби шежіре» платформасының ЖИ-көмекшісісің. Платформа Ақтөбе облысының 7–11 сынып оқушыларына кәсіби бағдар береді.
Платформа қадамдары: 1) Шежіре — отбасы кәсіптерін енгізу; 2) Холланд (RIASEC) бойынша 18 сұрақтық қызығушылық тесті; 3) 3 мамандық таңдау; 4) VR-сынама (электрик, мұнай ұңғымасының операторы, медбике/дәрігер, агродрон операторы); 5) «2040 жылдан сұхбат»; 6) Кәсіби паспорт.
Холланд типтері: Практик-шебер (R), Зерттеуші (I), Шығармашыл (A), Әлеуметтік (S), Кәсіпкер (E), Ұйымдастырушы (C).
Өңір контексі: Ақтөбе облысы — мұнай-газ, хром және ферроқорытпа өндірісі, ауыл шаруашылығы, медицина, құрылыс, логистика. Ақтөбеде колледждер мен университеттер бар (мыс. Қ. Жұбанов атындағы Ақтөбе өңірлік университеті, Марат Оспанов атындағы Батыс Қазақстан медицина университеті).
Ережелер:
• Әрқашан қазақ тілінде, оқушы жасына сай қарапайым, жылы, ынталандырушы үнмен жаз. Оқушы орысша жазса да, қазақша жауап бер.
• Қысқа абзацтар; тізім керек болса «•». Markdown тақырыптарын (#) және кестелерді қолданба.
• Нақты жалақы, балл, оқу ақысы сияқты сандарды ойдан шығарма. Болашақ туралы айтқанда болжам екенін ескерт.
• Мүмкіндігінше платформа қадамдарына сілте (мыс. «VR-сынамада электрикті байқап көр», «тестті қайта тапсыр»).
• Тек мамандық, оқу, болашақ, дағды тақырыбында сөйлес; басқа тақырыпқа сыпайы түрде кәсіп тақырыбына қайтар.
• Оқушыдан телефон, мекенжай сияқты жеке деректерді сұрама. Егер оқушы қатты уайымдаса немесе қауіп туралы жазса — ата-анаға, мектеп психологына немесе 150 сенім телефонына жүгінуге кеңес бер.`

// Оқушы профилі (сайттан келеді) → ЖИ-ге қысқа контекст
function profileText(d) {
  const list = (a, n = 8) => (Array.isArray(a) ? a : []).slice(0, n).map((x) => clip(x, 60)).filter(Boolean).join(', ')
  const vr = (Array.isArray(d.vr) ? d.vr : []).slice(0, 6).map((v) => `${clip(v.title, 40)} — ${Number(v.score) || 0}%`).join(', ')
  return `Оқушы: ${clip(d.name, 40) || 'аты көрсетілмеген'}, ${clip(d.grade, 20) || 'сыныбы көрсетілмеген'}.
Қызығушылық типтері (Холланд, басымдық ретімен): ${list(d.types, 3) || 'тест әлі өтілмеген'}.
Таңдаған мамандықтары: ${list(d.pick3, 3) || 'әлі таңдалмаған'}.
VR-сынама нәтижелері: ${vr || 'әлі өтілмеген'}.
Отбасы кәсіптері: ${list(d.family) || 'енгізілмеген'}.`
}

// ---------- тапсырмалар ----------
function build(task, d) {
  const p = d.profile || {}
  if (task === 'interview') {
    const prof = clip(d.profession, 80) || 'электрик'
    const msgs = (Array.isArray(d.messages) ? d.messages : []).slice(-10)
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: clip(m.content, 600) }))
    if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: 'Сәлем! Өзіңді таныстыр.' })
    return {
      system: `${BASE}

Рөл ойыны «2040 жылдан сұхбат»: сен — 2040 жылы Ақтөбеде жұмыс істейтін «${prof}» маманысың, яғни осы оқушының болашақтағы өзісің. «Мен» деп сөйле, оқушыға «сен» деп жүгін.
${profileText(p)}
Оқушы профилін әңгімеге табиғи түрде қос (мыс. отбасы кәсібі, тест нәтижесі), бірақ тізіп шықпа.
Жұмыс күніңді, қолданатын технологияларды (ЖИ, роботтар, дрондар т.б.), мектепте қай пәндер көмектескенін, қандай қиындықтан өткеніңді әңгімеле.
Әр жауап 3–6 сөйлем, соңында оқушыға бір қысқа сұрақ қой.`,
      messages: msgs,
      maxTokens: 1000,
    }
  }
  if (task === 'shezhire') {
    const rel = (Array.isArray(d.relatives) ? d.relatives : []).slice(0, 8)
      .map((r) => `• ${clip(r.role, 40)}: ${clip(r.job, 60)}`).join('\n')
    if (!rel) return null
    return {
      system: BASE,
      messages: [{ role: 'user', content: `Менің отбасымның кәсіптері:\n${rel}\n\nӘр кәсіп бойынша қысқаша (2–3 сөйлем): 2040 жылға қарай технологиялардың әсерінен қалай өзгереді және одан туатын 2 болашақ мамандықты атап, оларға қай мектеп пәндері керек екенін айт. Соңында менің әулетімнің кәсіби «тамыры» туралы бір жылы қорытынды сөйлем жаз және платформадағы келесі қадамды (қызығушылық тесті) ұсын.` }],
      maxTokens: 1600,
      cache: true,
    }
  }
  if (task === 'passport') {
    return {
      system: BASE,
      messages: [{ role: 'user', content: `${profileText(p)}

Осы деректер бойынша кәсіби паспортқа жеке қорытынды жаз (8–10 сөйлем):
• күшті жақтарым (тест пен VR нәтижесіне сүйен);
• қай бағыт маған ең сәйкес және неге (отбасы тамырын да ескер);
• келесі 3 нақты қадам: қай пәнге көңіл бөлу, қандай үйірме/жоба, Ақтөбеде нені оқу.
Деректер аз болса, қай платформа қадамын аяқтау керегін айт. Соңында шешімді оқушының өзі қабылдайтынын еске сал.` }],
      maxTokens: 1600,
      cache: true,
    }
  }
  return null
}

// ---------- кэш: бірдей деректерге қайта ақша жұмсамау (шежіре, паспорт) ----------
const cache = new Map()
const CACHE_TTL = 24 * 60 * 60 * 1000
function cacheGet(k) { const c = cache.get(k); if (c && Date.now() < c.exp) return c.v; cache.delete(k) }
function cacheSet(k, v) { if (cache.size > 500) cache.delete(cache.keys().next().value); cache.set(k, { v, exp: Date.now() + CACHE_TTL }) }

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
    const key = job.cache && JSON.stringify([payload.task, job.messages])
    const hit = key && !payload.fresh && cacheGet(key)
    if (hit) return send(res, 200, hit, origin)
    const out = await ask(job)
    if (key && !out.refused) cacheSet(key, out)
    return send(res, 200, out, origin)
  } catch (err) {
    const st = Number(err.status) || 0
    console.error(`OpenRouter ${st}:`, err.message)
    if (st === 401 || st === 403) return send(res, 500, { error: 'auth' }, origin)
    if (st === 402) return send(res, 502, { error: 'credits', text: 'ЖИ балансы таусылды. Мұғалімге хабарла.' }, origin)
    if (st === 429) return send(res, 429, { error: 'upstream_rate', text: 'ЖИ қазір бос емес. Бір минуттан соң қайталап көр.' }, origin)
    return send(res, 502, { error: 'upstream' }, origin)
  }
}).listen(PORT, () => console.log(`Кәсіби шежіре ЖИ сервері: :${PORT}, модель ${MODEL}`))
