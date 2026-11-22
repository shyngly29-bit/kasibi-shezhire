import { lazy, Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { VR_INFO } from '../data'

const SIMS = {
  electric: lazy(() => import('../vr/Electric')),
  oil: lazy(() => import('../vr/Oil')),
  nurse: lazy(() => import('../vr/Nurse')),
  drone: lazy(() => import('../vr/Drone')),
}

export default function VRHub({ s, update, next }) {
  const [open, setOpen] = useState(null)
  if (open) {
    const Sim = SIMS[open]
    return (
      <Suspense fallback={<div className="card loading">3D-сахна жүктелуде…</div>}>
        <Sim
          onSave={(r) => update((prev) => ({ vr: { ...prev.vr, [open]: r } }))}
          onExit={() => setOpen(null)}
        />
      </Suspense>
    )
  }
  const count = Object.keys(s.vr).length
  return (
    <div>
      <div className="head">
        <h2>🥽 VR-кәсіби сынама</h2>
        <p>Мамандықты виртуалды түрде байқап көр. Экранда тінтуірмен немесе VR-көзілдірікпен ойнауға болады. Әр сынама үшін паспортқа мөр мен жетон беріледі.</p>
      </div>
      <div className="vr-grid">
        {Object.entries(VR_INFO).map(([id, v], i) => (
          <motion.button
            key={id} className={`vr-card ${s.vr[id] ? 'done' : ''}`} onClick={() => setOpen(id)}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -6 }} whileTap={{ scale: 0.97 }}
          >
            <span className="vr-ic">{v.icon}</span>
            <b>{v.title}</b>
            <small>Пән: {v.subject}</small>
            <em>{s.vr[id] ? `✓ ${s.vr[id].score}% · қайта өту` : 'Бастау →'}</em>
          </motion.button>
        ))}
      </div>
      <div className="actions">
        <span className="muted">Өтілді: {count}/4</span>
        <button className="btn" disabled={!count} onClick={next}>Келесі: 2040 →</button>
      </div>
    </div>
  )
}
