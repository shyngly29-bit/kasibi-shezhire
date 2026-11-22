import { useState } from 'react'
import { aiEnabled, askAI, paragraphs } from '../ai'

// Бір реттік ЖИ талдауы: батырма → Claude жауабы → state-ке сақталады (басып шығаруға кіреді)
export default function AIBox({ title, hint, button, task, data, value, onSave, disabled }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!aiEnabled && !value) return null
  const run = async () => {
    setBusy(true); setErr('')
    try { onSave(await askAI(task, data())) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="card ai-box">
      <div className="ai-head">
        <span className="ai-badge">ЖИ · Claude</span>
        <h3>{title}</h3>
      </div>
      {value ? (
        <div className="ai-text">{paragraphs(value).map((p, i) => <p key={i}>{p}</p>)}</div>
      ) : (
        <p className="muted">{hint}</p>
      )}
      {err && <p className="ai-err">{err}</p>}
      {aiEnabled && (
        <div className="row-btns no-print">
          <button className="btn" onClick={run} disabled={busy || disabled}>
            {busy ? <><span className="ai-dots"><i /><i /><i /></span> ЖИ ойлануда…</> : value ? 'Қайта сұрау' : button}
          </button>
        </div>
      )}
      <small className="ai-note">ЖИ қателесуі мүмкін — жауапты сыни тұрғыдан оқы.</small>
    </div>
  )
}
