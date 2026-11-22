import { motion } from 'framer-motion'

// Тест прогресі: 18 түйінді цифрлық бұтақ. Әр жауап бір түйінді жағады.
export default function BranchProgress({ total, answered }) {
  const W = 1000
  const pts = Array.from({ length: total }, (_, i) => {
    const x = 24 + (i * (W - 48)) / (total - 1)
    const y = 34 + Math.sin(i * 0.9) * 12
    return [x, y]
  })
  const d = pts.reduce((s, [x, y], i) => {
    if (!i) return `M${x},${y}`
    const [px, py] = pts[i - 1]
    const mx = (px + x) / 2
    return `${s} C${mx},${py} ${mx},${y} ${x},${y}`
  }, '')
  const count = answered.filter(Boolean).length
  const full = count === total
  return (
    <div className={`bprog ${full ? 'full' : ''}`}>
      <svg viewBox={`0 0 ${W} 68`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="bp-g" x1="0" x2="1">
            <stop offset="0" stopColor="#0c9fa5" />
            <stop offset="1" stopColor="#327eff" />
          </linearGradient>
        </defs>
        <path d={d} className="bp-base" />
        <motion.path d={d} className="bp-lit" stroke="url(#bp-g)" initial={false} animate={{ pathLength: count / total }} transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }} />
      </svg>
      <div className="bp-nodes">
        {pts.map(([x, y], i) => (
          <span key={i} className={answered[i] ? 'on' : ''} style={{ left: `${(x / W) * 100}%`, top: `${y}px` }} />
        ))}
      </div>
      <div className="bp-label">{full ? 'Бұтақ толық жанды ✓' : `${count} / ${total} түйін`}</div>
    </div>
  )
}
