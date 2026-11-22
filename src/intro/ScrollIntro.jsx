import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BRANCHES, ORDER } from '../branches'

gsap.registerPlugin(ScrollTrigger)
gsap.ticker.lagSmoothing(0)
const TreeScene = lazy(() => import('./TreeScene'))
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const AWAKE_KEY = 'ks-awake-v3'

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

function Caption({ p, range, children, className = '' }) {
  const [a, b] = range
  const first = a <= 0
  const opacity = useTransform(p, first ? [0, b - 0.03, b] : [a, a + 0.035, b - 0.035, b], first ? [1, 1, 0] : [0, 1, 1, 0])
  const y = useTransform(p, first ? [0, b - 0.03, b] : [a, a + 0.04, b - 0.035, b], first ? [0, 0, -24] : [36, 0, 0, -28])
  const pointerEvents = useTransform(opacity, (v) => (v > 0.3 ? 'auto' : 'none'))
  return <motion.div className={`si-cap ${className}`} style={{ opacity, y, pointerEvents }}>{children}</motion.div>
}

const SCENES = ['Табиғат', 'Ояну', 'Трансформация', 'Цифрлық әлем', 'Шежіре']

export default function ScrollIntro({ onNavigate, onStart }) {
  const ref = useRef(null)
  const p = useMotionValue(0)
  const A = useRef({ intro: 0 })
  const tl = useRef(null)
  const [ready, setReady] = useState(false)
  const [awaking, setAwaking] = useState(false)
  const [gl] = useState(() => (typeof window === 'undefined' ? true : hasWebGL()))

  // Бірыңғай scroll-timeline: GSAP ScrollTrigger (sticky pin + scrub), кері бағытта да жұмыс істейді
  useLayoutEffect(() => {
    const proxy = { v: 0 }
    const tw = gsap.to(proxy, {
      v: 1, ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: REDUCED ? true : 1.2 },
      onUpdate: () => p.set(proxy.v),
    })
    return () => { tw.scrollTrigger?.kill(); tw.kill() }
  }, [p])

  // Таңғы ояну: қараңғыдан күн шығады, камера шегінеді (сессияда бір рет, өткізуге болады)
  useEffect(() => {
    if (!ready) return
    const t = gsap.timeline({ onComplete: () => { setAwaking(false); try { sessionStorage.setItem(AWAKE_KEY, '1') } catch { /* */ } } })
    t.to(A.current, { intro: 1, duration: 3.2, ease: 'power2.inOut' })
    tl.current = t
    let seen = false
    try { seen = !!sessionStorage.getItem(AWAKE_KEY) } catch { /* */ }
    if (REDUCED || seen) t.progress(1)
    else setAwaking(true)
    return () => t.kill()
  }, [ready])

  const hint = useTransform(p, [0, 0.04], [1, 0])
  const bar = useTransform(p, [0, 1], ['0%', '100%'])
  const heroO = useTransform(p, [0.86, 0.95], [0, 1])
  const heroX = useTransform(p, [0.86, 0.96], [40, 0])
  const heroPE = useTransform(heroO, (v) => (v > 0.5 ? 'auto' : 'none'))
  const fadeOut = useTransform(p, [0.97, 1], [0, 1])

  return (
    <section className="si si-dark" ref={ref}>
      <div className="si-sticky">
        {gl ? (
          <Suspense fallback={<div className="si-fallback nature"><span>Табиғат оянуда…</span></div>}>
            <TreeScene A={A} progress={p} onNavigate={onNavigate} onReady={() => setReady(true)} />
          </Suspense>
        ) : (
          <div className="si-fallback dark nogl"><span>Құрылғы 3D-графиканы қолдамайды — сайттың өзі толық жұмыс істейді.</span></div>
        )}

        {/* 0–20% — табиғат */}
        <Caption p={p} range={[0, 0.17]} className="nature-cap">
          <small className="si-kicker">«Қадам-life» · кәсіби бағдар</small>
          <h2>Әр мамандықтың тамыры бар</h2>
          <p>Айналдыр — нақты ағаштан цифрлық әлемге дейін саяхат жаса.</p>
        </Caption>

        {/* 20–40% — энергияның оянуы */}
        <Caption p={p} range={[0.2, 0.38]} className="dark">
          <small className="si-kicker">01 · Энергияның оянуы</small>
          <h2>Тамырдан — білім ағыны</h2>
          <p>Ата-бабамыздың кәсібі — тамыр. Энергия діңмен көтеріліп, бүгінгі білімге айналады.</p>
        </Caption>

        {/* 40–60% — цифрлық трансформация */}
        <Caption p={p} range={[0.42, 0.6]} className="dark top-cap">
          <small className="si-kicker">02 · Цифрлық трансформация</small>
          <h2>Дәстүр технологияға ұласады</h2>
          <div className="si-trans">
            <div><b>Ұста</b><i>→</i><em>Робототехник</em></div>
            <div><b>Малшы</b><i>→</i><em>Агродрон операторы</em></div>
            <div><b>Тігінші</b><i>→</i><em>Сәнгер-дизайнер</em></div>
          </div>
        </Caption>

        {/* 60–85% — цифрлық әлем, бұтақтар = бөлімдер */}
        <Caption p={p} range={[0.62, 0.84]} className="dark">
          <small className="si-kicker">03 · Цифрлық әлем</small>
          <h2>Әр бұтақ — бір қадам</h2>
          <p>Ағаштағы жарқыраған түйінді немесе төмендегі бұтақты бас.</p>
          <div className="si-chips">
            {ORDER.slice(1).map((id, i) => (
              <button key={id} style={{ '--c1': BRANCHES[id].c1, '--c2': BRANCHES[id].c2 }} onClick={() => onNavigate(i + 1)}>{BRANCHES[id].label}</button>
            ))}
          </div>
        </Caption>

        {/* 85–100% — бас экран: ағаш сол жақта, тақырып оң жақта */}
        <motion.div className="si-hero" style={{ opacity: heroO, x: heroX, pointerEvents: heroPE }}>
          <h1>КӘСІБИ<br />ШЕЖІРЕ</h1>
          <p>Жеті атадан — болашақ мамандыққа</p>
          <div className="si-cta-row left">
            <button className="btn hero-btn" onClick={() => onNavigate(1)}>Бастау →</button>
            <button className="btn ghost dark-ghost" onClick={onStart}>Саяхат жоспары ↓</button>
          </div>
        </motion.div>

        <motion.div className="si-endfade" style={{ opacity: fadeOut }} />
        {awaking && <button className="si-skip" onClick={() => tl.current?.progress(1)}>Өткізу ⏭</button>}
        <motion.div className="si-hint dark" style={{ opacity: hint }}><span>Төмен айналдыр</span><i /></motion.div>
        <div className="si-progress dark">
          <motion.div className="si-bar" style={{ height: bar }} />
          {SCENES.map((c, i) => <span key={c} style={{ top: `${(i / (SCENES.length - 1)) * 100}%` }}>{c}</span>)}
        </div>
      </div>
    </section>
  )
}
