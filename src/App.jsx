import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppState } from './store'
import { wakeAI } from './ai'
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
// Әр бөлімнен келесісіне өту шарты (оқушыға көрсетілетін түсіндірме)
const NEED = {
  intro: 'атыңды жазып, «Саяхатты бастау» бас',
  shezhire: 'кем дегенде бір туысыңның кәсібін енгіз',
  test: 'қызығушылық тестінің 18 сұрағына жауап бер',
  pick3: 'өзіңе сәйкес 3 мамандықты таңда',
  vr: 'кем дегенде бір VR-сынамадан өт',
  ai: '«2040» сұхбатын бастап, ЖИ-мен сөйлес (немесе промптты қолдан)',
  passport: '',
}
// URL hash → бөлім нөмірі (тікелей сілтемелер мен Back/Forward үшін)
const fromHash = () => {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '')
  const i = STEPS.findIndex((st) => st.hash === h)
  return i < 0 ? 0 : i
}

export default function App() {
  useEffect(() => { const t = setTimeout(wakeAI, 1500); return () => clearTimeout(t) }, [])
  const [s, update, reset] = useAppState()
  const done = {
    intro: !!s.student.name,
    shezhire: s.family.some((f) => f.job),
    test: !!s.testBefore,
    pick3: s.pick3.length === 3,
    vr: Object.keys(s.vr).length > 0,
    ai: s.ai.done.length > 0,
    passport: false,
  }
  // Кезекпен өту: алдыңғы бөлімнің шарты орындалмаса, келесісі ашылмайды
  const open = STEPS.findIndex((st) => !done[st.id]) // осы бөлімге дейін ғана өтуге болады
  const openRef = useRef(open)
  openRef.current = open
  const [notice, setNotice] = useState('')
  const noticeT = useRef(0)
  const warn = (msg) => { setNotice(msg); clearTimeout(noticeT.current); noticeT.current = setTimeout(() => setNotice(''), 4200) }
  const clamp = (i) => Math.min(i, openRef.current)
  const [step, setStep] = useState(() => clamp(fromHash()))
  // тікелей сілтеме құлыпталған бөлімге апарса — мекенжайды түзетіп, ескертеміз
  useEffect(() => {
    const want = fromHash()
    if (want > step) { window.history.replaceState({ step }, '', '#' + STEPS[step].hash); warn(`🔒 Алдымен «${STEPS[step].label}» бөлімін аяқта: ${NEED[STEPS[step].id]}`) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const focusTask = (i) => setTimeout(() => {
    const el = i === 0 ? document.getElementById('me') : null
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.querySelector('input')?.focus({ preventScroll: true }) }
  }, 450)
  const [nameGate, setNameGate] = useState(null) // атын жазбай кеткенде — орнында шағын терезе
  const go = (want) => {
    let i = want
    if (want > 0 && openRef.current === 0) { setNameGate(want); return }
    if (want > openRef.current) {
      i = openRef.current
      warn(`🔒 Алдымен «${STEPS[i].label}» бөлімін аяқта: ${NEED[STEPS[i].id]}`)
      focusTask(i)
      if (i === step) return
    }
    if (i !== step) window.history.pushState({ step: i }, '', '#' + STEPS[i].hash)
    setStep(i)
    window.scrollTo({ top: 0, behavior: i === step ? 'smooth' : 'auto' })
  }
  // Back / Forward / қолмен өзгертілген hash — құлыпталған бөлімге өткізбейміз
  useEffect(() => {
    const onPop = () => {
      const want = fromHash(), i = clamp(want)
      if (i !== want) { window.history.replaceState({ step: i }, '', '#' + STEPS[i].hash); warn(`🔒 Алдымен «${STEPS[i].label}» бөлімін аяқта: ${NEED[STEPS[i].id]}`) }
      setStep(i); window.scrollTo({ top: 0 })
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop) }
  }, [])
  const next = () => go(Math.min(step + 1, STEPS.length - 1))
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
      <NavBar steps={STEPS} step={step} done={done} open={open} go={go} />
      <AnimatePresence>
        {nameGate !== null && (
          <motion.div className="gate-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNameGate(null)}>
            <motion.form
              className="card gate-card" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => { e.preventDefault(); if (!s.student.name.trim()) return; setNameGate(null); setTimeout(() => go(1), 50) }}
            >
              <h3>👋 Алдымен танысайық</h3>
              <p className="muted">Саяхат кезекпен өтеді: әр бұтақтың тапсырмасын орындағанда келесісі ашылады.</p>
              <label>Аты-жөнің<input autoFocus value={s.student.name} onChange={(e) => update({ student: { ...s.student, name: e.target.value } })} placeholder="Мысалы: Айдана Серікқызы" /></label>
              <label>Сыныбың<input value={s.student.grade} onChange={(e) => update({ student: { ...s.student, grade: e.target.value } })} placeholder="9 «А»" /></label>
              <div className="row-btns">
                <button className="btn" disabled={!s.student.name.trim()}>Саяхатты бастау →</button>
                <button type="button" className="btn ghost" onClick={() => setNameGate(null)}>Кейін</button>
              </div>
            </motion.form>
          </motion.div>
        )}
        {notice && (
          <motion.div className="gate-toast" role="status" initial={{ opacity: 0, y: 30, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }} onClick={() => setNotice('')}>
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
      <main ref={mainRef}>
        {id !== 'intro' && <BranchRail step={step} done={done} open={open} onGo={go} />}
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
