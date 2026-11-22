import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppState } from './store'
import { BRANCHES } from './branches'
import BranchRail from './components/BranchRail'
import NavBar from './components/NavBar'
import Intro from './steps/Intro'
import Shezhire from './steps/Shezhire'
import Test from './steps/Test'
import Pick3 from './steps/Pick3'
import VRHub from './steps/VRHub'
import AIStep from './steps/AIStep'
import Passport from './steps/Passport'

const STEPS = [
  { id: 'intro', hash: 'bastau', label: 'Бастау', icon: '🏠' },
  { id: 'shezhire', hash: 'shezhire', label: 'Шежіре', icon: '🌳' },
  { id: 'test', hash: 'test', label: 'Тест', icon: '🧭' },
  { id: 'pick3', hash: 'pick3', label: 'Pick3', icon: '🎯' },
  { id: 'vr', hash: 'vr', label: 'VR-сынама', icon: '🥽' },
  { id: 'ai', hash: '2040', label: '2040', icon: '🏙️' },
  { id: 'passport', hash: 'passport', label: 'Паспорт', icon: '📘' },
]
// URL hash → бөлім нөмірі (тікелей сілтемелер мен Back/Forward үшін)
const fromHash = () => {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '')
  const i = STEPS.findIndex((st) => st.hash === h)
  return i < 0 ? 0 : i
}

export default function App() {
  const [s, update, reset] = useAppState()
  const [step, setStep] = useState(fromHash)
  const go = (i) => {
    if (i !== step) window.history.pushState({ step: i }, '', '#' + STEPS[i].hash)
    setStep(i)
    window.scrollTo({ top: 0, behavior: i === step ? 'smooth' : 'auto' })
  }
  // Back / Forward / қолмен өзгертілген hash
  useEffect(() => {
    const onPop = () => { setStep(fromHash()); window.scrollTo({ top: 0 }) }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop) }
  }, [])
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
      const els = mainRef.current?.querySelectorAll('.card, .q, .chip, .vr-card, .path-item, .jcard, .prompt, .gf-root') || []
      els.forEach((el, i) => el.animate(
        [{ opacity: 0, transform: 'translateY(35px)' }, { opacity: 1, transform: 'none' }],
        { duration: 800, delay: Math.min(i, 12) * 100, easing: 'cubic-bezier(.215,.61,.355,1)', fill: 'backwards' },
      ))
    }, 60)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div className="app" style={{ '--b1': branch.c1, '--b2': branch.c2 }} data-branch={id}>
      <NavBar steps={STEPS} step={step} done={done} go={go} />
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
