import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppState } from './store'
import { BRANCHES } from './branches'
import BranchRail from './components/BranchRail'
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
  const branch = BRANCHES[id === 'vr' ? 'vr' : id]
  const mainRef = useRef(null)

  // Карточкалардың кезекпен шығуы: y 35px → 0, 0.8s, stagger 0.1s, power3.out
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => {
      const els = mainRef.current?.querySelectorAll('.card, .q, .chip, .vr-card, .path-item, .prompt, .gf-root') || []
      els.forEach((el, i) => el.animate(
        [{ opacity: 0, transform: 'translateY(35px)' }, { opacity: 1, transform: 'none' }],
        { duration: 800, delay: Math.min(i, 12) * 100, easing: 'cubic-bezier(.215,.61,.355,1)', fill: 'backwards' },
      ))
    }, 60)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div className="app" style={{ '--b1': branch.c1, '--b2': branch.c2 }} data-branch={id}>
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
      <main ref={mainRef}>
        {id !== 'intro' && <BranchRail step={step} done={done} onGo={go} />}
        {id !== 'intro' && <motion.div key={'flash' + step} className="branch-flash" initial={{ x: '-100%', opacity: 0.9 }} animate={{ x: '100%', opacity: 0 }} transition={{ duration: 1, ease: [0.215, 0.61, 0.355, 1] }} />}
        <AnimatePresence mode="wait">
          <motion.section
            key={id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.215, 0.61, 0.355, 1] }}
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
