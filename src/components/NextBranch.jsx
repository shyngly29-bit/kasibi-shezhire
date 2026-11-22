import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

// Келесі бұтақ: көрінген кезде бойымен импульс өтеді, кейін тақырып пен батырма шығады
export default function NextBranch({ kicker, title, text, c1, c2, onGo, label = 'Өту →' }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return }
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setOn(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const d = 'M10 70 C 160 70, 210 20, 360 30 S 600 80, 760 40 S 940 20, 990 34'
  return (
    <div className="next-branch" ref={ref} style={{ '--n1': c1, '--n2': c2 }}>
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="nb-svg">
        <defs>
          <linearGradient id="nb-g" x1="0" x2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient>
        </defs>
        <path d={d} className="nb-base" />
        <motion.path d={d} stroke="url(#nb-g)" className="nb-lit" initial={{ pathLength: 0 }} animate={{ pathLength: on ? 1 : 0 }} transition={{ duration: 1.4, ease: [0.215, 0.61, 0.355, 1] }} />
        {on && (
          <circle r="7" fill={c1} className="nb-dot">
            <animateMotion dur="1.4s" repeatCount="1" fill="freeze" path={d} />
          </circle>
        )}
      </svg>
      <motion.div className="nb-text" initial={{ opacity: 0, y: 24 }} animate={on ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1.1, duration: 0.7 }}>
        <small className="kicker" style={{ color: c1 }}>{kicker}</small>
        <h3 className="nb-title">{title}</h3>
        <p>{text}</p>
        <button className="btn" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} onClick={onGo}>{label}</button>
      </motion.div>
    </div>
  )
}
