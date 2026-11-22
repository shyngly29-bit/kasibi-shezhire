import { useState } from 'react'
import { motion } from 'framer-motion'
import { QUESTIONS, RIASEC } from '../data'
import { topTypes } from '../store'

const OPTS = [['Ұнамайды', 0], ['Бейтарап', 1], ['Ұнайды', 2]]

export function Bars({ scores, compare }) {
  return (
    <div className="bars">
      {Object.entries(RIASEC).map(([k, t]) => (
        <div className="bar" key={k}>
          <span>{t.name}</span>
          <div className="track">
            {compare && <div className="fill ghost" style={{ width: `${(compare[k] / 6) * 100}%` }} />}
            <motion.div className="fill" style={{ background: t.color }} initial={{ width: 0 }} animate={{ width: `${(scores[k] / 6) * 100}%` }} transition={{ duration: 0.8 }} />
          </div>
          <b>{scores[k]}</b>
        </div>
      ))}
    </div>
  )
}

export default function Test({ s, update, next }) {
  const mode = s.testBefore && Object.keys(s.vr).length >= 2 ? 'after' : 'before'
  const [ans, setAns] = useState({})
  const [redo, setRedo] = useState(false)
  const result = mode === 'after' ? s.testAfter : s.testBefore
  const total = Object.keys(ans).length

  const finish = () => {
    const sc = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
    QUESTIONS.forEach(([t], i) => { sc[t] += ans[i] ?? 0 })
    update(mode === 'after' ? { testAfter: sc } : { testBefore: sc })
    setRedo(false)
    setAns({})
  }

  if (result && !redo) {
    const top = topTypes(result).slice(0, 2)
    return (
      <div>
        <div className="head">
          <h2>🧭 Сенің қызығушылық профилің</h2>
          <p>Холланд (RIASEC) моделі бойынша. {mode === 'after' && 'Ашық жолақ — бастапқы нәтиже.'}</p>
        </div>
        <div className="card">
          <Bars scores={result} compare={mode === 'after' ? s.testBefore : null} />
          <div className="types">
            {top.map((k) => <div key={k} className="type" style={{ borderColor: RIASEC[k].color }}><b>{RIASEC[k].name}</b><small>{RIASEC[k].desc}</small></div>)}
          </div>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={() => setRedo(true)}>Қайта өту</button>
          <button className="btn" onClick={next}>Келесі: Pick3 →</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="head">
        <h2>🧭 {mode === 'after' ? 'Қорытынды тест' : 'Қызығушылық тесті'}</h2>
        <p>Әр әрекет саған қаншалықты ұнайды? Дұрыс не бұрыс жауап жоқ. ({total}/{QUESTIONS.length})</p>
      </div>
      <div className="progress"><div style={{ width: `${(total / QUESTIONS.length) * 100}%` }} /></div>
      <div className="qs">
        {QUESTIONS.map(([, q], i) => (
          <div className={`q ${ans[i] !== undefined ? 'done' : ''}`} key={i}>
            <span>{i + 1}. {q}</span>
            <div className="opts">
              {OPTS.map(([l, v]) => (
                <button key={l} className={ans[i] === v ? 'sel' : ''} onClick={() => setAns({ ...ans, [i]: v })}>{l}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="actions"><button className="btn" disabled={total < QUESTIONS.length} onClick={finish}>Нәтижені көру</button></div>
    </div>
  )
}
