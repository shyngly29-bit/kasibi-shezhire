import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BRANCHES, ORDER } from '../branches'

// Бәйтеректің цифрлық бұтағы: бөлімдер — түйіндер, ауысқанда жарық импульсі жүгіреді
const W = 1000
const PAD = 40
const xs = ORDER.map((_, i) => PAD + (i * (W - PAD * 2)) / (ORDER.length - 1))
const ys = ORDER.map((_, i) => 46 + Math.sin(i * 1.25) * 14)
const D = xs.reduce((d, x, i) => {
  if (i === 0) return `M${x},${ys[0]}`
  const px = xs[i - 1]
  const mx = (px + x) / 2
  return `${d} C${mx},${ys[i - 1]} ${mx},${ys[i]} ${x},${ys[i]}`
}, '')
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function BranchRail({ step, done, onGo }) {
  const path = useRef(null)
  const dot = useRef(null)
  const prev = useRef(step)
  const [lens, setLens] = useState(null)

  useLayoutEffect(() => {
    // әр түйінге дейінгі жол ұзындығы
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

  useEffect(() => {
    if (!lens) return
    const from = lens[prev.current]
    const to = lens[step]
    prev.current = step
    const el = dot.current
    if (REDUCED || from === to) {
      const pt = path.current.getPointAtLength(to)
      el.setAttribute('cx', pt.x); el.setAttribute('cy', pt.y)
      return
    }
    const t0 = performance.now()
    const dur = 900
    let raf
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      const pt = path.current.getPointAtLength(from + (to - from) * e)
      el.setAttribute('cx', pt.x); el.setAttribute('cy', pt.y)
      el.style.opacity = String(Math.sin(k * Math.PI) * 0.9 + 0.1)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step, lens])

  const cur = BRANCHES[ORDER[step]]
  const lit = lens ? lens[step] : 0
  return (
    <div className="rail" aria-label="Бөлімдер бұтағы">
      <svg viewBox={`0 0 ${W} 96`} preserveAspectRatio="none" className="rail-svg">
        <defs>
          <linearGradient id="rail-g" x1="0" x2="1">
            <stop offset="0" stopColor="#315c47" />
            <stop offset="0.35" stopColor="#0c9fa5" />
            <stop offset="0.7" stopColor="#287eff" />
            <stop offset="1" stopColor={cur.c2} />
          </linearGradient>
        </defs>
        <path ref={path} d={D} className="rail-base" />
        {lens && (
          <path d={D} className="rail-lit" stroke="url(#rail-g)" style={{ strokeDasharray: `${lit} 9999` }} />
        )}
        <circle ref={dot} r="7" className="rail-pulse" fill={cur.c1} />
      </svg>
      <div className="rail-nodes">
        {ORDER.map((id, i) => {
          const b = BRANCHES[id]
          return (
            <button
              key={id}
              className={`rail-node ${i === step ? 'on' : ''} ${done[id] ? 'ok' : ''}`}
              style={{ left: `${(xs[i] / W) * 100}%`, top: `${ys[i]}px`, '--c1': b.c1, '--c2': b.c2 }}
              onClick={() => onGo(i)}
              title={b.label}
            >
              <i />
              <span>{b.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
