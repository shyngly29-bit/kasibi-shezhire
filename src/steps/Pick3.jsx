import { PROFESSIONS, RIASEC } from '../data'
import { topTypes } from '../store'

export default function Pick3({ s, update, next }) {
  const top = topTypes(s.testBefore).slice(0, 2)
  const toggle = (id) => {
    const has = s.pick3.includes(id)
    if (has) update({ pick3: s.pick3.filter((x) => x !== id) })
    else if (s.pick3.length < 3) update({ pick3: [...s.pick3, id] })
  }
  return (
    <div>
      <div className="head">
        <h2>Pick3 — менің 3 мамандығым</h2>
        <p>Ұсыныс: біреуі — <b>шежіреңнен</b>, біреуі — <b>тест нәтижесіңнен</b>, біреуі — <b>болашақ мамандығы</b>. Таңдалды: {s.pick3.length}/3</p>
      </div>
      <div className="chips">
        {PROFESSIONS.map((p) => {
          const on = s.pick3.includes(p.id)
          const rec = top.includes(p.type)
          return (
            <button key={p.id} className={`chip ${on ? 'on' : ''}`} onClick={() => toggle(p.id)} style={{ '--c': RIASEC[p.type].color }}>
              <b>{p.name}</b>
              <small>
                {RIASEC[p.type].name}
                {p.future && ' · болашақ'}
                {p.vr && ' · 🥽 VR'}
                {rec && ' · ★ саған сай'}
              </small>
            </button>
          )
        })}
      </div>
      <div className="actions"><button className="btn" disabled={s.pick3.length !== 3} onClick={next}>Келесі: VR-сынама →</button></div>
    </div>
  )
}
