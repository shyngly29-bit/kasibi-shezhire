import { PROFESSIONS, RIASEC, VR_INFO, transformJob } from '../data'
import { topTypes } from '../store'
import { Bars } from './Test'

export default function Passport({ s, go, reset }) {
  const vrDone = Object.entries(s.vr)
  const tokens = vrDone.reduce((a, [, r]) => a + r.tokens, 0)
  const top = topTypes(s.testAfter || s.testBefore).slice(0, 2)
  return (
    <div className="passport">
      <div className="head no-print">
        <h2>📘 Кәсіби паспорт</h2>
        <p>Барлық нәтижең бір жерде. Басып шығаруға немесе PDF ретінде сақтауға болады.</p>
      </div>
      <div className="card pass">
        <div className="pass-top">
          <div>
            <small>КӘСІБИ ПАСПОРТ</small>
            <h2>{s.student.name || '—'}</h2>
            <p>{s.student.grade} · {s.student.school}</p>
          </div>
          <div className="tokens"><b>{tokens}</b><small>жетон</small></div>
        </div>

        <h4>🌳 Кәсіби шежірем</h4>
        <ul className="plain">
          {s.family.filter((f) => f.job).map((f, i) => (
            <li key={i}><b>{f.role}:</b> {f.job} → <i>{transformJob(f.job).join(', ')}</i></li>
          ))}
        </ul>

        <h4>🧭 Қызығушылық профилім {top.length > 0 && `— ${top.map((k) => RIASEC[k].name).join(', ')}`}</h4>
        {s.testBefore ? <Bars scores={s.testAfter || s.testBefore} compare={s.testAfter ? s.testBefore : null} /> : <p className="muted">Тест әлі өтілмеген.</p>}
        {!s.testAfter && s.testBefore && vrDone.length >= 2 && (
          <button className="btn ghost no-print" onClick={() => go(2)}>Қорытынды тестті өту (өзгерісті көру)</button>
        )}

        <h4>🎯 Менің 3 мамандығым</h4>
        <div className="pick-row">
          {s.pick3.map((id) => <span key={id} className="tag2">{PROFESSIONS.find((p) => p.id === id)?.name}</span>)}
        </div>

        <h4>🥽 VR-сынамалар мөрлері</h4>
        <div className="stamps">
          {Object.entries(VR_INFO).map(([id, v]) => (
            <div key={id} className={`stamp ${s.vr[id] ? 'got' : ''}`}>
              <span>{v.icon}</span><small>{v.title}</small>{s.vr[id] && <b>{s.vr[id].score}%</b>}
            </div>
          ))}
        </div>

        {s.ai.note && (<><h4>🤖 Болашақтағы өзімнің кеңесім</h4><blockquote>{s.ai.note}</blockquote></>)}
      </div>
      <div className="actions no-print">
        <button className="btn ghost" onClick={() => { if (confirm('Барлық деректі өшіріп, басынан бастау керек пе?')) { reset(); go(0) } }}>Жаңа оқушы</button>
        <button className="btn" onClick={() => window.print()}>Басып шығару / PDF</button>
      </div>
    </div>
  )
}
