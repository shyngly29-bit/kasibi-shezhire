import { useState } from 'react'
import { aiPrompts } from '../data'

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
        <h2>🤖 2040 жылдан сұхбат</h2>
        <p>Промптты көшіріп, ChatGPT немесе Gemini-ге қой. Жауапты сыни тұрғыдан оқы: ЖИ қателесуі мүмкін!</p>
      </div>
      <div className="prompts">
        {prompts.map((p, i) => (
          <div className="card prompt" key={i}>
            <h3>{s.ai.done.includes(i) ? '✓ ' : ''}{p.title}</h3>
            <p>{p.text}</p>
            <div className="row-btns">
              <button className="btn" onClick={() => copy(i)}>{copied === i ? 'Көшірілді ✓' : 'Көшіру'}</button>
              <a className="btn ghost" href="https://chatgpt.com" target="_blank" rel="noreferrer">ChatGPT</a>
              <a className="btn ghost" href="https://gemini.google.com" target="_blank" rel="noreferrer">Gemini</a>
            </div>
          </div>
        ))}
      </div>
      <div className="card form">
        <h3>Болашақтағы өзімнен алған ең маңызды кеңес</h3>
        <textarea rows={3} value={s.ai.note} onChange={(e) => update({ ai: { ...s.ai, note: e.target.value } })} placeholder="ЖИ-дің жауабынан ең маңызды ойды өз сөзіңмен жаз…" />
      </div>
      <div className="actions"><button className="btn" onClick={next}>Келесі: кәсіби паспорт →</button></div>
    </div>
  )
}
