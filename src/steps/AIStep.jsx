import { useEffect, useRef, useState } from 'react'
import { aiPrompts, PROFESSIONS } from '../data'
import { aiEnabled, askAI, paragraphs, profileOf } from '../ai'

const SUGGEST = ['Сенің бір жұмыс күнің қалай өтеді?', 'Мектепте қай пәнді жақсы оқуым керек?', 'Ақтөбеде бұл мамандыққа қайда оқуға болады?', 'ЖИ сенің жұмысыңды алмастыра ма?', 'Менің отбасымның кәсібі бұл жұмысқа көмектесе ме?']

// «2040 жылдан сұхбат» — Claude болашақтағы маман рөлінде
function Chat({ s, update }) {
  const profs = (s.pick3 || []).map((id) => PROFESSIONS.find((x) => x.id === id)?.name).filter(Boolean)
  const [prof, setProf] = useState(s.ai.chatProf || profs[0] || 'Электрик')
  const [msgs, setMsgs] = useState(s.ai.chat || [])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [slow, setSlow] = useState(false)
  const box = useRef(null)
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  const send = async (text) => {
    const t = (text ?? input).trim()
    if (busy || !t) return
    const next = [...msgs, { role: 'user', content: t }]
    setMsgs(next); setInput(''); setBusy(true); setErr(''); setSlow(false)
    try {
      const answer = await askAI('interview', { profession: prof, profile: profileOf(s), messages: next }, { onSlow: () => setSlow(true) })
      const all = [...next, { role: 'assistant', content: answer }]
      setMsgs(all)
      update({ ai: { ...s.ai, chat: all.slice(-20), chatProf: prof, done: s.ai.done.includes(0) ? s.ai.done : [...s.ai.done, 0] } })
    } catch (e) { setErr(e.message); setMsgs(msgs); setInput(t) } finally { setBusy(false); setSlow(false) }
  }
  const restart = (p) => { setProf(p); setMsgs([]); update({ ai: { ...s.ai, chat: [], chatProf: p } }) }

  return (
    <div className="card chat">
      <div className="ai-head">
        <span className="ai-badge">ЖИ · Claude</span>
        <h3>Болашақтағы өзіммен сұхбат</h3>
      </div>
      <div className="chat-profs">
        {(profs.length ? profs : ['Электрик', 'Агродрон операторы', 'Медбике / дәрігер']).map((p) => (
          <button key={p} className={`pchip ${p === prof ? 'on' : ''}`} onClick={() => p !== prof && !busy && restart(p)}>{p}</button>
        ))}
      </div>
      <div className="chat-log" ref={box}>
        {!msgs.length && !busy && <p className="muted">Сен 2040 жылғы «{prof}» маманымен — яғни болашақтағы өзіңмен сөйлесесің. Бастау үшін батырманы бас немесе сұрағыңды жаз.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' && <small>2040 · {prof}</small>}
            {paragraphs(m.content).map((p, j) => <p key={j}>{p}</p>)}
          </div>
        ))}
        {busy && <div className="msg assistant"><span className="ai-dots"><i /><i /><i /></span>{slow && <small style={{ marginTop: 6 }}>Сервер оянып жатыр, сәл күте тұр…</small>}</div>}
      </div>
      {err && <p className="ai-err">{err}</p>}
      {!msgs.length && (
        <div className="row-btns"><button className="btn" onClick={() => send('Сәлем! Сен болашақтағы менсің бе? Жұмыс күніңді айтып берші.')} disabled={busy}>Сұхбатты бастау →</button></div>
      )}
      {msgs.length > 0 && !busy && (
        <div className="chat-suggest">
          {SUGGEST.filter((q) => !msgs.some((m) => m.content === q)).slice(0, 3).map((q) => (
            <button key={q} className="pchip" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} placeholder="Сұрағыңды жаз… (мыс.: қай пәнді жақсы оқуым керек?)" />
        <button className="btn" disabled={busy || !input.trim()}>Жіберу</button>
      </form>
      <small className="ai-note">ЖИ — болжам жасайтын көмекші, қателесуі мүмкін. Жеке деректеріңді (телефон, мекенжай) жазба.</small>
    </div>
  )
}

export default function AIStep({ s, update, next }) {
  const prompts = aiPrompts(s)
  const [copied, setCopied] = useState(null)
  const copy = async (i) => {
    try { await navigator.clipboard.writeText(prompts[i].text) } catch { /* көшіру қолжетімсіз */ }
    setCopied(i)
    if (!s.ai.done.includes(i)) update({ ai: { ...s.ai, done: [...s.ai.done, i] } })
  }
  return (
    <div>
      <div className="head">
        <h2>2040 жылдан сұхбат</h2>
        <p>{aiEnabled ? 'Таңдаған мамандығың бойынша болашақтағы өзіңмен сөйлес. Жауапты сыни тұрғыдан оқы: ЖИ қателесуі мүмкін!' : 'Промптты көшіріп, ЖИ-көмекшіге (Claude) қой. Жауапты сыни тұрғыдан оқы: ЖИ қателесуі мүмкін!'}</p>
      </div>
      {aiEnabled && <Chat s={s} update={update} />}
      <details className="prompts-more" open={!aiEnabled}>
        <summary>{aiEnabled ? 'Қосымша: дайын промпттар' : 'Дайын промпттар'}</summary>
        <div className="prompts">
          {prompts.map((p, i) => (
            <div className="card prompt" key={i}>
              <h3>{s.ai.done.includes(i) ? '✓ ' : ''}{p.title}</h3>
              <p>{p.text}</p>
              <div className="row-btns">
                <button className="btn" onClick={() => copy(i)}>{copied === i ? 'Көшірілді ✓' : 'Көшіру'}</button>
                <a className="btn ghost" href="https://claude.ai" target="_blank" rel="noreferrer">Claude</a>
              </div>
            </div>
          ))}
        </div>
      </details>
      <div className="card form">
        <h3>Болашақтағы өзімнен алған ең маңызды кеңес</h3>
        <textarea rows={3} value={s.ai.note} onChange={(e) => update({ ai: { ...s.ai, note: e.target.value } })} placeholder="ЖИ-дің жауабынан ең маңызды ойды өз сөзіңмен жаз…" />
      </div>
      <div className="actions"><button className="btn" onClick={next}>Келесі: кәсіби паспорт →</button></div>
    </div>
  )
}
