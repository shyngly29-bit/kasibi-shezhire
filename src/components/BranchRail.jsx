import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { BRANCHES, ORDER } from '../branches'

// TREE JOURNEY NAVIGATION — бас цифрлық ағаштың тірі бұтағы: 7 түйін — 7 бөлім.
// Күйлер: active (қазір осында), done (тапсырма орындалды — кіру ≠ орындау), available (өтуге болады).
const W = 1000
const VH = 170
const PAD = 70
const xs = ORDER.map((_, i) => PAD + (i * (W - PAD * 2)) / (ORDER.length - 1))
const ys = ORDER.map((_, i) => 82 + Math.sin(i * 1.3 + 0.4) * 16)
// бұтақ: түйіндерден өтетін тегіс иілген сызық (басы мен ұшы сәл шығып тұрады)
const D = (() => {
  const P = [[8, ys[0] + 10], ...xs.map((x, i) => [x, ys[i]]), [W - 8, ys[ys.length - 1] - 8]]
  return P.reduce((d, [x, y], i) => {
    if (!i) return `M${x},${y}`
    const [px, py] = P[i - 1]
    const mx = (px + x) / 2
    return `${d} C${mx},${py} ${mx},${y} ${x},${y}`
  }, '')
})()
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const STATE_TXT = { active: 'Қазір осындасың', done: 'Орындалды ✓', available: 'Өтуге болады' }

// Түйін белгішелері (24×24, сызықты)
const ICONS = {
  intro: <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h5v-5.5h3V20h5V9.8" />,
  shezhire: <><path d="M12 21v-6.5M12 17l-3 3M12 17l3 3" /><path d="M12 14.5c-4.2 0-7-2.6-7-6a7 7 0 0 1 14 0c0 3.4-2.8 6-7 6Z" /><path d="M12 14.5V9M12 11l-2.5-2M12 10.5l2.5-2" /></>,
  test: <><path d="M4 5h3v3H4zM4 11h3v3H4zM4 17h3v3H4z" /><path d="M10 6.5h10M10 12.5h10M10 18.5h7" /></>,
  pick3: <path d="m12 3 9 4.8-9 4.8-9-4.8L12 3ZM3 12.2l9 4.8 9-4.8M3 16.4l9 4.8 9-4.8" />,
  vr: <><path d="M3.5 8h17a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 20.5 16H16l-2-2.5h-4L8 16H3.5A1.5 1.5 0 0 1 2 14.5v-5A1.5 1.5 0 0 1 3.5 8Z" /><circle cx="7.5" cy="11.8" r="1.6" /><circle cx="16.5" cy="11.8" r="1.6" /></>,
  ai: <path d="M4 20V13M9.5 20V9.5M15 20v-6M3 20h18M13.5 8.5 17 5l3 3M17 5v4" />,
  passport: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="8.5" cy="11" r="2.2" /><path d="M5.5 16c.7-1.6 1.8-2.3 3-2.3s2.3.7 3 2.3M14 9.5h4.5M14 12.5h4.5M14 15.5h3" /></>,
}

// Жапырақ пішіні (негізі 0,0 нүктесінде, ұзындығы ~26)
const LEAF = 'M0,0 C7,-12 22,-13 34,0 C22,12 7,12 0,0 Z'

export default function BranchRail({ step, done, onGo }) {
  const path = useRef(null)
  const lit = useRef(null)
  const dot = useRef(null)
  const trail = useRef(null)
  const scroller = useRef(null)
  const tw = useRef(null)
  const prev = useRef(step)
  const skip = useRef(null)
  const [lens, setLens] = useState(null)
  const [twigs, setTwigs] = useState([])
  const [hover, setHover] = useState(-1)
  const [tip, setTip] = useState(-1)
  const [pending, setPending] = useState(-1)

  // ұзындықтар мен бұтақшалар (жапырақтар) геометриясын бір рет есептейміз
  useLayoutEffect(() => {
    const p = path.current
    const total = p.getTotalLength()
    const out = []
    let li = 0
    for (let s = 0; s <= total && li < xs.length; s += 1.5) {
      if (p.getPointAtLength(s).x >= xs[li] - 0.8) { out.push(s); li++ }
    }
    while (out.length < xs.length) out.push(total)
    const pt = (l) => p.getPointAtLength(Math.max(0, Math.min(total, l)))
    const tw = []
    const mk = (l, side, len, node, minor) => {
      const a = pt(l - 2), b = pt(l + 2), o = pt(l)
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      const dir = ang + side * (Math.PI / 2.8)
      const ex = o.x + Math.cos(dir) * len, ey = o.y + Math.sin(dir) * len
      tw.push({ x: o.x, y: o.y, ex, ey, ang: (dir * 180) / Math.PI, side, node, minor, seed: tw.length })
    }
    // сегменттер арасында екі бұтақша + ұштарында жапырақтар
    for (let i = 0; i < out.length - 1; i++) {
      const L = out[i + 1] - out[i]
      mk(out[i] + L * 0.3, i % 2 ? 1 : -1, 30, i, false)
      mk(out[i] + L * 0.68, i % 2 ? -1 : 1, 24, i + 1, true)
    }
    mk(out[0] - 40, 1, 22, 0, true)
    mk(out[out.length - 1] + 40, -1, 24, out.length - 1, true)
    setTwigs(tw)
    setLens(out)
  }, [])

  // энергия толуы: белсенді түйінге дейін + бет айналдыруына қарай келесі түйінге қарай ақырын
  const target = pending >= 0 ? pending : step
  const furthestDone = useMemo(() => ORDER.reduce((m, id, i) => (done[id] ? i : m), 0), [done])
  useEffect(() => {
    if (!lens) return
    let raf = 0
    const base = () => lens[Math.max(target, furthestDone)]
    const apply = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - innerHeight
      const k = max > 0 ? Math.min(1, scrollY / max) : 0
      const nxt = lens[Math.min(lens.length - 1, target + 1)]
      const extra = target === Math.max(target, furthestDone) ? (nxt - lens[target]) * 0.55 * k : 0
      if (lit.current) lit.current.style.strokeDasharray = `${base() + extra} 99999`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply) }
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [lens, target, furthestDone])

  // GSAP импульсі бұтақ бойымен
  const pulse = (from, to, dur) => {
    tw.current?.kill()
    const el = dot.current, tr = trail.current, p = path.current
    const place = (l, o) => {
      const pt = p.getPointAtLength(l)
      el.setAttribute('cx', pt.x); el.setAttribute('cy', pt.y); el.style.opacity = String(o)
      const a = Math.min(from, l), b = Math.max(from, l)
      tr.style.strokeDasharray = `0 ${a} ${b - a} 99999`
      tr.style.opacity = String(o * 0.9)
    }
    if (REDUCED || dur <= 0 || from === to) { place(to, 0); return }
    const o = { l: from }
    tw.current = gsap.to(o, {
      l: to, duration: dur, ease: 'power2.inOut',
      onUpdate() { const k = this.progress(); place(o.l, Math.sin(Math.min(1, k * 1.15) * Math.PI) * 0.95 + 0.05) },
      onComplete() { place(to, 0) },
    })
  }

  // бөлім кез келген жолмен ауысса (мәзір, hash, Back/Forward) — импульс жаңа түйінге жүгіреді
  useEffect(() => {
    if (!lens) return
    if (skip.current === step) { skip.current = null; prev.current = step; return }
    pulse(lens[prev.current], lens[step], 0.7)
    prev.current = step
    const sc = scroller.current
    if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollTo({ left: (xs[step] / W) * sc.scrollWidth - sc.clientWidth / 2, behavior: REDUCED ? 'auto' : 'smooth' })
  }, [step, lens]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tw.current?.kill(), [])

  const choose = (i) => {
    if (i === step) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (pending >= 0 || !lens) return
    setPending(i); setTip(i)
    skip.current = i
    pulse(lens[step], lens[i], 0.42)
    // навигация кадр жиілігіне тәуелсіз (импульс баяуласа да кешікпейді)
    setTimeout(() => { onGo(i); setPending(-1); setTimeout(() => setTip(-1), 500) }, REDUCED ? 0 : 420)
  }

  const nodeOpen = hover >= 0 ? hover : pending
  return (
    <div className="tj-scroll" ref={scroller}>
      <nav className="tj" aria-label="Саяхат картасы — бұтақ">
        <svg viewBox={`0 0 ${W} ${VH}`} className="tj-svg" aria-hidden="true">
          <defs>
            <linearGradient id="tj-bark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9b46a" />
              <stop offset="0.35" stopColor="#a9803b" />
              <stop offset="0.7" stopColor="#7a5528" />
              <stop offset="1" stopColor="#5a3c1b" />
            </linearGradient>
            <linearGradient id="tj-leaf" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#9ccf63" />
              <stop offset="0.55" stopColor="#4f9a45" />
              <stop offset="1" stopColor="#2f6e3a" />
            </linearGradient>
            <linearGradient id="tj-energy" x1="0" x2="1">
              <stop offset="0" stopColor="#1fbf8f" />
              <stop offset="0.6" stopColor="#19d1b8" />
              <stop offset="1" stopColor="#f2cf7a" />
            </linearGradient>
            <filter id="tj-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>

          {/* бұтақшалар мен жапырақтар (артқы қабат) */}
          {twigs.map((t) => (
            <g key={t.seed} className={`tj-twig ${t.minor ? 'minor' : ''} ${nodeOpen === t.node ? 'open' : ''}`}>
              <path d={`M${t.x},${t.y} Q${(t.x + t.ex) / 2 + t.side * 4},${(t.y + t.ey) / 2} ${t.ex},${t.ey}`} className="tj-twig-stem" />
              <g transform={`translate(${t.ex},${t.ey}) rotate(${t.ang})`}><path d={LEAF} className="tj-leaf" style={{ '--d': `${(t.seed % 5) * 0.6}s` }} /><path d="M2,0 L31,0" className="tj-rib" /></g>
              <g transform={`translate(${(t.x + t.ex) / 2},${(t.y + t.ey) / 2}) rotate(${t.ang - t.side * 55}) scale(0.72)`}><path d={LEAF} className="tj-leaf" style={{ '--d': `${(t.seed % 3) * 0.8}s` }} /><path d="M2,0 L31,0" className="tj-rib" /></g>
            </g>
          ))}

          {/* қабық: көлеңке → негіз → талшық текстурасы → жоғарғы жарқыл */}
          <path d={D} className="tj-shadow" transform="translate(0,5)" filter="url(#tj-soft)" />
          <path ref={path} d={D} className="tj-bark" stroke="url(#tj-bark)" />
          <path d={D} className="tj-grain" />
          <path d={D} className="tj-grain b" />
          <path d={D} className="tj-shine" transform="translate(0,-3)" />
          {/* изумруд пен алтын тамырлар */}
          <path d={D} className="tj-vein green" transform="translate(0,-1.5)" />
          <path d={D} className="tj-vein gold" transform="translate(0,2.5)" />
          {/* өтілген бөлік бойымен изумруд энергия */}
          <path ref={lit} d={D} className="tj-lit" stroke="url(#tj-energy)" />
          <path ref={trail} d={D} className="tj-trail" />
          <circle ref={dot} r="7" className="tj-pulse" />
        </svg>

        {/* шеттердегі нәзік қазақ оюы */}
        <svg className="tj-orn left" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 52V30C30 18 16 16 12 24c-3 6 4 11 8 7M30 30c0-12 14-14 18-6 3 6-4 11-8 7" /></svg>
        <svg className="tj-orn right" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 52V30C30 18 16 16 12 24c-3 6 4 11 8 7M30 30c0-12 14-14 18-6 3 6-4 11-8 7" /></svg>

        <div className="tj-nodes">
          {ORDER.map((id, i) => {
            const b = BRANCHES[id]
            const state = i === step ? 'active' : done[id] ? 'done' : 'available'
            const showTip = hover === i || tip === i
            return (
              <button
                key={id} type="button"
                className={`tjn tjn-${state} ${pending === i ? 'tjn-pending' : ''}`}
                style={{ left: `${(xs[i] / W) * 100}%`, top: `${(ys[i] / VH) * 100}%`, '--c1': b.c1, '--c2': b.c2 }}
                onClick={() => choose(i)}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
                onFocus={() => setHover(i)} onBlur={() => setHover(-1)}
                aria-current={i === step ? 'step' : undefined}
                aria-label={`${i + 1}. ${b.label} — ${STATE_TXT[state]}`}
              >
                <span className="tjn-drop" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="tjn-ic">{ICONS[id]}</svg>
                  {state === 'done' && <i className="tjn-check">✓</i>}
                </span>
                <span className="tjn-lbl">{b.label}</span>
                <AnimatePresence>
                  {showTip && (
                    <motion.span className="tjn-tip" role="tooltip"
                      initial={{ opacity: 0, y: 6, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.16 }}>
                      <b>{i + 1}. {b.label}</b><small>{STATE_TXT[state]}</small>
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
