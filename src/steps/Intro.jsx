import { motion } from 'framer-motion'

const PATH = [
  ['🌳', 'Шежіре', 'Отбасыңның кәсіптерін жина'],
  ['🧭', 'Тест', 'Қызығушылық типіңді анықта'],
  ['🎯', 'Pick3', '3 мамандық таңда'],
  ['🥽', 'VR-сынама', 'Мамандықты виртуалды байқап көр'],
  ['🤖', '2040', 'ЖИ-мен болашақтан сұхбат'],
  ['📘', 'Паспорт', 'Кәсіби паспортыңды ал'],
]

export default function Intro({ s, update, next }) {
  const st = s.student
  const set = (k) => (e) => update({ student: { ...st, [k]: e.target.value } })
  return (
    <div className="intro">
      <div className="hero">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          Ата-бабаң кәсібінен<br /><span>болашақ мамандығыңа</span>
        </motion.h1>
        <p>Отбасыңның тарихын зертте, мамандықтарды VR-да байқап көр және жасанды интеллектпен болашақтағы өзіңмен сөйлес.</p>
      </div>

      <div className="path">
        {PATH.map(([ic, t, d], i) => (
          <motion.div key={t} className="path-item" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}>
            <span className="path-ic">{ic}</span>
            <b>{i + 1}. {t}</b>
            <small>{d}</small>
          </motion.div>
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
