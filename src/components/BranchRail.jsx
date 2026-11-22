import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BRANCHES, ORDER } from '../branches'

// Интерактивті саяхат картасы: 7 түйін — 7 бөлім.
// Күйлер: active (қазір осында), done (тапсырма орындалды — кіру ≠ орындау), available (өтуге болады).
// Басқанда: түйін жанады → импульс сызық бойымен сол түйінге жетеді (~0.4 с) → бөлім ашылады.
const W = 1000
const PAD = 40
const xs = ORDER.map((_, i) => PAD + (i * (W - PAD * 2)) / (ORDER.length - 1))
const ys = ORDER.map((_, i) => 46 + Math.sin(i * 1.25) * 14)
const D = xs.reduce((d, x, i) => {
  if (i === 0) return `M${x},${ys[0]}`
  const mx = (xs[i - 1] + x) / 2
  return `${d} C${mx},${ys[i - 1]} ${mx},${ys[i]} ${x},${ys[i]}`
}, '')
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const STATE_TXT = { active: 'Қазір осындасың', done: 'Орындалды ✓', available: 'Өтуге болады' }
const ease = (k) => 1 - Math.pow(1 - k, 3)

export default function BranchRail({ step, done, onGo }) {
  const path = useRef(null)
  const dot = useRef(null)
  const raf = useRef(0)
  const prev = useRef(step)
  const skip = useRef(null)
  const scroller = useRef(null)
  const [lens, setLens] = useState(null)
  const [hover, setHover] = useState(-1)
  const [tip, setTip] = useState(-1)
  const [pending, setPending] = useState(-1)

  useLayoutEffect(() => {
    const p = path.current
    const total = p.getTotalLength()
    const out = []
    let li = 0
    for (let s = 0; s <= total && li < xs.length; s += 2) {
      if (p.getPointAtLength(s).x >= xs[li] - 1) { out.push(s); li++ }
    }
    while (out.length < xs.length) out.push(total)
    setLens(out)
  }, [])

  // импульс: from → to ұзындығы бойымен
  const pulse = (from, to, dur, done) => {
    cancelAnimationFrame(raf.current)
    const el = dot.current
    const place = (l, o) => { const pt = path.current.getPointAtLength(l); el.setAttribute('cx', pt.x); el.setAttribute('cy', pt.y); el.style.opacity = String(o) }
    if (REDUCED || dur <= 0 || from === to) { place(to, 0.15); done?.(); return }
    const t0 = performance.now()
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      place(from + (to - from) * ease(k), 0.25 + Math.sin(k * Math.PI) * 0.75)
      if (k < 1) raf.current = requestAnimationFrame(tick)
      else done?.()
    }
    raf.current = requestAnimationFrame(tick)
  }

  // бөлім кез келген жолмен ауысса (мәзір, hash, Back/Forward) — импульс жаңа түйінге жүгіреді
  useEffect(() => {
    if (!lens) return
    if (skip.current === step) { skip.current = null; prev.current = step; return }
    pulse(lens[prev.current], lens[step], 700)
    prev.current = step
    // телефонда белсенді түйінді көрінетін жерге айналдыру
    const sc = scroller.current
    if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollTo({ left: (xs[step] / W) * sc.scrollWidth - sc.clientWidth / 2, behavior: REDUCED ? 'auto' : 'smooth' })
  }, [step, lens]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const choose = (i) => {
    if (i === step) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (pending >= 0 || !lens) return
    setPending(i); setTip(i)
    skip.current = i
    pulse(lens[step], lens[i], 420) // тек көрініс
    // өту кадр жиілігіне тәуелсіз: импульс баяуласа да навигация кешікпейді
    setTimeout(() => {
      onGo(i)
      setPending(-1)
      setTimeout(() => setTip(-1), 500)
    }, REDUCED ? 0 : 420)
  }

  const cur = BRANCHES[ORDER[step]]
  const target = pending >= 0 ? pending : step
  const lit = lens ? lens[target] : 0
  return (
    <div className="rail-scroll" ref={scroller}>
      <nav className="rail" aria-label="Саяхат картасы">
        <svg viewBox={`0 0 ${W} 96`} preserveAspectRatio="none" className="rail-svg" aria-hidden="true">
          <defs>
            <linearGradient id="rail-g" x1="0" x2="1">
              <stop offset="0" stopColor="#315c47" />
              <stop offset="0.45" stopColor="#1b9d8d" />
              <stop offset="1" stopColor={cur.c1} />
            </linearGradient>
          </defs>
          <path ref={path} d={D} className="rail-base" />
          {lens && <path d={D} className="rail-lit" stroke="url(#rail-g)" style={{ strokeDasharray: `${lit} 9999` }} />}
          <circle ref={dot} r="7" className="rail-pulse" fill="#c9a568" />
        </svg>
        <div className="rail-nodes">
          {ORDER.map((id, i) => {
            const b = BRANCHES[id]
            const state = i === step ? 'active' : done[id] ? 'done' : 'available'
            const showTip = hover === i || tip === i
            return (
              <button
                key={id}
                type="button"
                className={`rn rn-${state} ${pending === i ? 'rn-pending' : ''}`}
                style={{ left: `${(xs[i] / W) * 100}%`, top: `${ys[i]}px`, '--c1': b.c1, '--c2': b.c2 }}
                onClick={() => choose(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(-1)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(-1)}
                aria-current={i === step ? 'step' : undefined}
                aria-label={`${i + 1}. ${b.label} — ${STATE_TXT[state]}`}
              >
                <i className="rn-dot" aria-hidden="true">{state === 'done' ? '✓' : ''}</i>
                <span className="rn-lbl">{b.label}</span>
                <AnimatePresence>
                  {showTip && (
                    <motion.span
                      className="rn-tip" role="tooltip"
                      initial={{ opacity: 0, y: 6, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.16 }}
                    >
                      <b>{i + 1}. {b.label}</b>
                      <small>{STATE_TXT[state]}</small>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
