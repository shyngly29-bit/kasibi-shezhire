import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppState } from './store'
import Intro from './steps/Intro'
import Shezhire from './steps/Shezhire'
import Test from './steps/Test'
import Pick3 from './steps/Pick3'
import VRHub from './steps/VRHub'
import AIStep from './steps/AIStep'
import Passport from './steps/Passport'

const STEPS = [
  { id: 'intro', label: 'Бастау', icon: '✦' },
  { id: 'shezhire', label: 'Шежіре', icon: '🌳' },
  { id: 'test', label: 'Тест', icon: '🧭' },
  { id: 'pick3', label: 'Pick3', icon: '🎯' },
  { id: 'vr', label: 'VR-сынама', icon: '🥽' },
  { id: 'ai', label: '2040', icon: '🤖' },
  { id: 'passport', label: 'Паспорт', icon: '📘' },
]

export default function App() {
  const [s, update, reset] = useAppState()
  const [step, setStep] = useState(0)
  const go = (i) => { setStep(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const next = () => go(Math.min(step + 1, STEPS.length - 1))

  const done = {
    intro: !!s.student.name,
    shezhire: s.family.some((f) => f.job),
    test: !!s.testBefore,
    pick3: s.pick3.length === 3,
    vr: Object.keys(s.vr).length > 0,
    ai: s.ai.done.length > 0,
    passport: false,
  }
  const props = { s, update, next, go, reset }
  const id = STEPS[step].id

  return (
    <div className="app">
      <header className="top">
        <div className="brand" onClick={() => go(0)}>
          <span className="logo">ш</span>
          <div>
            <b>Кәсіби шежіре</b>
            <small>Жеті атадан — болашақ мамандыққа</small>
          </div>
        </div>
        <nav className="steps">
          {STEPS.map((st, i) => (
            <button key={st.id} className={`step ${i === step ? 'on' : ''} ${done[st.id] ? 'ok' : ''}`} onClick={() => go(i)}>
              <span>{done[st.id] ? '✓' : st.icon}</span>
              <em>{st.label}</em>
            </button>
          ))}
        </nav>
      </header>
      <main>
        <AnimatePresence mode="wait">
          <motion.section
            key={id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {id === 'intro' && <Intro {...props} />}
            {id === 'shezhire' && <Shezhire {...props} />}
            {id === 'test' && <Test {...props} />}
            {id === 'pick3' && <Pick3 {...props} />}
            {id === 'vr' && <VRHub {...props} />}
            {id === 'ai' && <AIStep {...props} />}
            {id === 'passport' && <Passport {...props} />}
          </motion.section>
        </AnimatePresence>
      </main>
      <footer className="foot">«Қадам-life» кәсіби бағдар беру жобасы · Ақтөбе · 2026</footer>
    </div>
  )
}
