import { PROFESSIONS, RIASEC, VR_INFO, transformJob } from '../data'
import { topTypes } from '../store'
import { Bars } from './Test'
import GlassFolder from '@/components/ui/glass-folder-cards'
import AIBox from '../components/AIBox'

const ARTS = { electric: 'ember', oil: 'dusk', nurse: 'glacier', drone: 'verdant' }

function Portfolio({ s }) {
  const w = Math.min(300, (typeof window !== 'undefined' ? window.innerWidth : 360) - 48)
  const fam = s.family.filter((f) => f.job).map((f) => ({ name: f.role, meta: f.job }))
  const vr = Object.entries(s.vr).map(([id, r]) => ({ name: VR_INFO[id].title, meta: r.score + '%', art: ARTS[id] }))
  const picks = s.pick3.map((id) => ({ name: PROFESSIONS.find((p) => p.id === id)?.name || id, meta: '🎯' }))
  const folders = [
    { label: 'Шежіре', art: 'heritage', seed: 5, files: fam, empty: 'Шежіре толтырылмаған' },
    { label: 'VR-сынамалар', art: 'vr', seed: 11, files: vr, empty: 'Сынама өтілмеген' },
    { label: 'Менің 3 мамандығым', art: 'pick3', seed: 3, files: picks, empty: 'Таңдалмаған' },
  ]
  return (
    <div className="portfolio no-print">
      {folders.map((f, i) => (
        <GlassFolder
          key={f.label + f.files.length}
          label={f.label}
          meta={f.files.length ? `${f.files.length} құжат · ашу үшін бас` : f.empty}
          tone="light" art={f.art} seed={f.seed} action="none" width={w}
          appearDelay={i * 140}
          files={f.files.length ? f.files : [{ name: f.empty }]}
        />
      ))}
    </div>
  )
}

export default function Passport({ s, update, go, reset }) {
  const vrDone = Object.entries(s.vr)
  const tokens = vrDone.reduce((a, [, r]) => a + r.tokens, 0)
  const top = topTypes(s.testAfter || s.testBefore).slice(0, 2)
  return (
    <div className="passport">
      <div className="head no-print">
        <h2>Кәсіби паспорт</h2>
        <p>Барлық нәтижең бір жерде. Папканы басып аш — ішіндегі құжаттар шығады. Төменде басып шығаруға арналған паспорт.</p>
      </div>
      <Portfolio s={s} />
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
      <AIBox
        title="ЖИ қорытындысы: менің келесі қадамдарым"
        hint="Тест, VR-сынама және таңдаған мамандықтарың бойынша ЖИ жеке қорытынды жазады — ол паспортқа басылады."
        button="ЖИ қорытындысын алу ✦"
        task="passport"
        data={() => ({
          name: s.student.name, grade: s.student.grade,
          types: top.map((k) => RIASEC[k].name),
          pick3: s.pick3.map((id) => PROFESSIONS.find((x) => x.id === id)?.name).filter(Boolean),
          vr: Object.entries(s.vr).map(([id, r]) => ({ title: VR_INFO[id]?.title || id, score: r.score })),
          family: s.family.filter((f) => f.job).map((f) => `${f.role}: ${f.job}`),
        })}
        value={s.ai.summary}
        onSave={(text) => update({ ai: { ...s.ai, summary: text } })}
      />
      <div className="actions no-print">
        <button className="btn ghost" onClick={() => { if (confirm('Барлық деректі өшіріп, басынан бастау керек пе?')) { reset(); go(0) } }}>Жаңа оқушы</button>
        <button className="btn" onClick={() => window.print()}>Басып шығару / PDF</button>
      </div>
    </div>
  )
}
