import { lazy, Suspense, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const TreeScene = lazy(() => import('./TreeScene'))

// Әр мәтін блогы айналдырудың белгілі бір аралығында көрінеді
function Caption({ p, range, children, className = '' }) {
  const [a, b] = range
  const first = a <= 0
  const opacity = useTransform(p, first ? [0, b - 0.04, b] : [a, a + 0.04, b - 0.04, b], first ? [1, 1, 0] : [0, 1, 1, 0])
  const y = useTransform(p, first ? [0, b - 0.04, b] : [a, a + 0.05, b - 0.04, b], first ? [0, 0, -30] : [40, 0, 0, -30])
  return <motion.div className={`si-cap ${className}`} style={{ opacity, y }}>{children}</motion.div>
}

const CHAPTERS = ['Тамыр', 'Ояну', 'Цифр', 'Саяхат', 'Болашақ']

export default function ScrollIntro({ onStart }) {
  const ref = useRef(null)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const hint = useTransform(p, [0, 0.05], [1, 0])
  const bar = useTransform(p, [0, 1], ['0%', '100%'])
  const shade = useTransform(p, [0.28, 0.45, 0.86, 0.98], [1, 0, 0, 1])
  // соңында сахна сайттың жарық фонына ериді, тақырып біртіндеп шығады
  const veil = useTransform(p, [0.9, 1], [0, 0.9])
  const revealO = useTransform(p, [0.88, 0.96], [0, 1])
  const revealY = useTransform(p, [0.88, 0.97], [40, 0])
  const revealS = useTransform(p, [0.88, 0.98], [0.96, 1])
  const darkUI = useTransform(p, [0.3, 0.42, 0.84, 0.9], [0, 1, 1, 0])

  return (
    <section className="si" ref={ref}>
      <div className="si-sticky">
        <Suspense fallback={<div className="si-fallback" />}>
          <TreeScene progress={p} />
        </Suspense>
        <motion.div className="si-shade" style={{ opacity: shade }} />
        <motion.div className="si-veil" style={{ opacity: veil }} />

        <Caption p={p} range={[0, 0.16]} className="hero-cap">
          <small className="si-kicker">«Қадам-life» · кәсіби бағдар платформасы</small>
          <h1>Ата-бабаң кәсібінен<br /><span>болашақ мамандығыңа</span></h1>
          <p>Айналдыр — бәйтеректің тамырынан цифрлық болашаққа дейін саяхат жаса.</p>
        </Caption>

        <Caption p={p} range={[0.18, 0.36]}>
          <small className="si-kicker">01 · Тамыр</small>
          <h2>Әр әулеттің өз бәйтерегі бар</h2>
          <p>Ата-бабамыздың кәсібі — біздің тамырымыз. Ұста, малшы, тігінші, ұстаз… Олардың білімі бізге жалғасады.</p>
        </Caption>

        <motion.div style={{ opacity: darkUI }} className="si-darkui">
          <Caption p={p} range={[0.4, 0.6]} className="dark top-cap">
            <small className="si-kicker">02 · Цифрлық ояну</small>
            <h2>Білім цифрлық болашаққа ауысады</h2>
            <p>Әр бұтақ — бір кәсіп, әр импульс — жаңа технология.</p>
            <div className="si-trans">
              <div><b>Ұста</b><i>→</i><em>Робототехник</em></div>
              <div><b>Малшы</b><i>→</i><em>Агродрон операторы</em></div>
              <div><b>Тігінші</b><i>→</i><em>Сәнгер-дизайнер</em></div>
            </div>
          </Caption>
          <Caption p={p} range={[0.62, 0.82]} className="dark">
            <small className="si-kicker">03 · Саяхат</small>
            <h2>Жеті атадан — жасанды интеллектке</h2>
            <p>Шежіреңді құр, мамандықтарды VR-да байқап көр, 2040 жылдағы өзіңмен сөйлес.</p>
          </Caption>
        </motion.div>

        <motion.div className="si-reveal" style={{ opacity: revealO, y: revealY, scale: revealS }}>
          <small className="si-kicker">04 · Болашақ</small>
          <h1 className="si-brand">КӘСІБИ ШЕЖІРЕ</h1>
          <p className="si-motto">Тамыр. Технология. Болашақ.</p>
          <p>6 қадам: шежіре, тест, Pick3, VR-сынама, 2040 жылдан сұхбат және кәсіби паспорт.</p>
          <button className="btn" onClick={onStart}>Бастау →</button>
        </motion.div>

        <motion.div className="si-hint" style={{ opacity: hint }}>
          <span>Төмен айналдыр</span>
          <i />
        </motion.div>

        <div className="si-progress">
          <motion.div className="si-bar" style={{ height: bar }} />
          {CHAPTERS.map((c, i) => <span key={c} style={{ top: `${(i / (CHAPTERS.length - 1)) * 100}%` }}>{c}</span>)}
        </div>
      </div>
    </section>
  )
}
