import ScrollIntro from '../intro/ScrollIntro'
import { BRANCHES } from '../branches'
import Ornament from '../components/Ornament'

// Саяхат жоспары: әр бөлімнің өз түсі мен символы бар карточкалар (басқанда сол бөлімге өтеді)
const PATH = [
  ['shezhire', '🌳', 'Шежіре', 'Тектің тамыры — болашақтың тірегі'],
  ['test', '📋', 'Тест', 'Қызығушылық пен қабілетті анықта'],
  ['pick3', '🎯', 'Pick3', 'Өзіңе сәйкес 3 мамандықты таңда'],
  ['vr', '🥽', 'VR-сынама', 'Мамандықты виртуалды кеңістікте тәжірибеден өткіз'],
  ['ai', '🏙️', '2040', 'Болашақтың мамандықтары'],
  ['passport', '📘', 'Паспорт', 'Сенің кәсіби бағыт паспортың'],
]

export default function Intro({ s, update, next, go }) {
  const st = s.student
  const set = (k) => (e) => update({ student: { ...st, [k]: e.target.value } })
  return (
    <div className="intro">
      <ScrollIntro
        s={s}
        onNavigate={go}
        onStart={() => document.getElementById('start')?.scrollIntoView({ behavior: 'smooth' })}
      />
      <div className="hero shz-head" id="start">
        <Ornament width={180} />
        <h2 className="mega">Саяхат жоспары</h2>
        <p>Алты бұтақтан өтіп, өз кәсіби паспортыңды аласың.</p>
      </div>

      <div className="journey">
        {PATH.map(([id, ic, t, d], i) => (
          <button
            key={id} className="jcard"
            style={{ '--c1': BRANCHES[id].c1, '--c2': BRANCHES[id].c2 }}
            onClick={() => go(i + 1)}
            aria-label={`${t} бөліміне өту`}
          >
            <span className="jn">0{i + 1}</span>
            <span className="jsym" aria-hidden="true">{ic}</span>
            <div>
              <b>{t}</b>
              <small>{d}</small>
            </div>
          </button>
        ))}
      </div>

      <div className="card form">
        <h3>Өзің туралы</h3>
        <label>Аты-жөнің<input value={st.name} onChange={set('name')} placeholder="Мысалы: Айдана Серікқызы" /></label>
        <div className="row2">
          <label>Сыныбың<input value={st.grade} onChange={set('grade')} placeholder="9 «А»" /></label>
          <label>Мектебің<input value={st.school} onChange={set('school')} placeholder="№ 21 мектеп" /></label>
        </div>
        <button className="btn" disabled={!st.name.trim()} onClick={next}>Саяхатты бастау →</button>
      </div>
    </div>
  )
}
