import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Liquid Glass навигация: кең панель → айналдырғанда ықшам капсула (бөлім атауы + бургер) → бургер-мәзір
export default function NavBar({ steps, step, done, open: openTo = 99, go }) {
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 900)
  const lastY = useRef(0)
  const menuRef = useRef(null)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        const dy = y - lastY.current
        if (y < 80) setCompact(false)
        else if (dy > 6) setCompact(true) // төмен — сығылады
        else if (dy < -6) setCompact(false) // жоғары — қалпына келеді
        lastY.current = y
      })
    }
    const onResize = () => setMobile(window.innerWidth < 900)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [])

  // Escape және сыртқа басу мәзірді жабады
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && setOpen(false)
    const d = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', k)
    document.addEventListener('pointerdown', d)
    return () => { document.removeEventListener('keydown', k); document.removeEventListener('pointerdown', d) }
  }, [open])

  const small = compact || mobile
  const cur = steps[step]
  const pick = (i) => { setOpen(false); go(i) }

  return (
    <div className="lg-wrap" ref={menuRef}>
      <motion.header
        layout
        className={`lg-bar ${small ? 'small' : ''}`}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <button className="lg-brand" onClick={() => pick(0)} aria-label="Бастау">
          <span className="logo">ш</span>
          <AnimatePresence initial={false}>
            {!small && (
              <motion.span className="lg-name" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}>
                <b>Кәсіби шежіре</b>
                <small>Жеті атадан — болашақ мамандыққа</small>
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {!small && (
          <nav className="lg-tabs" aria-label="Бөлімдер">
            {steps.map((st, i) => (
              <a
                key={st.id} href={'#' + st.hash}
                className={`lg-tab ${i === step ? 'on' : ''} ${i > openTo ? 'locked' : ''}`}
                aria-current={i === step ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); pick(i) }}
              >
                {i === step && <motion.span layoutId="lg-active" className="lg-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                <span className="lg-ic">{i > openTo ? '🔒' : done[st.id] && i !== step ? '✓' : st.icon}</span>
                <em>{st.label}</em>
              </a>
            ))}
          </nav>
        )}

        {small && (
          <motion.div className="lg-current" initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={cur.id}>
            <span className="lg-ic">{cur.icon}</span>
            <b>{cur.label}</b>
          </motion.div>
        )}
        {small && (
          <button className={`lg-burger ${open ? 'x' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Мәзір" aria-expanded={open}>
            <i /><i /><i />
          </button>
        )}
      </motion.header>

      <AnimatePresence>
        {open && small && (
          <motion.nav
            className="lg-menu" aria-label="Бөлімдер мәзірі"
            initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          >
            {steps.map((st, i) => (
              <motion.a
                key={st.id} href={'#' + st.hash}
                className={`lg-mi ${i === step ? 'on' : ''} ${i > openTo ? 'locked' : ''}`}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                onClick={(e) => { e.preventDefault(); pick(i) }}
              >
                <span className="lg-ic">{i > openTo ? '🔒' : st.icon}</span>
                <b>{st.label}</b>
                {done[st.id] && <small>✓</small>}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  )
}
