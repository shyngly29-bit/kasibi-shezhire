import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import GlassFolder from '@/components/ui/glass-folder-cards'
import { BRANCHES, ORDER } from '../branches'

gsap.registerPlugin(ScrollTrigger)
gsap.ticker.lagSmoothing(0) // ояну нақты уақытта жүреді (баяу кадрларда да 6 секунд)
const TreeScene = lazy(() => import('./TreeScene'))
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const AWAKE_KEY = 'ks-awake-v2'

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

function Caption({ p, range, children, className = '' }) {
  const [a, b] = range
  const opacity = useTransform(p, [a, a + 0.035, b - 0.035, b], [0, 1, 1, 0])
  const y = useTransform(p, [a, a + 0.04, b - 0.035, b], [36, 0, 0, -28])
  const pointerEvents = useTransform(opacity, (v) => (v > 0.3 ? 'auto' : 'none'))
  return <motion.div className={`si-cap ${className}`} style={{ opacity, y, pointerEvents }}>{children}</motion.div>
}

const SCENES = ['Келу', 'Көтерілу', 'Бұтақтар', 'Портал', 'Ашылу']

export default function ScrollIntro({ onNavigate, onStart }) {
  const ref = useRef(null)
  const p = useMotionValue(0)
  // оянудың күйі (GSAP Timeline осы объектіні анимациялайды, 3D-сахна әр кадрда оқиды)
  const A = useRef({ platform: 0, wave: 0, trunk: 0, crown: 0, world: 0, pull: 0, title: 0 })
  const title = useMotionValue(0)
  const tl = useRef(null)
  const [ready, setReady] = useState(false)
  const [awaking, setAwaking] = useState(false)
  const [gl] = useState(() => (typeof window === 'undefined' ? true : hasWebGL()))

  // 5. Айналдыру: GSAP ScrollTrigger (pin = sticky, scrub = жұмсақ ілесу)
  useLayoutEffect(() => {
    const proxy = { v: 0 }
    const tw = gsap.to(proxy, {
      v: 1, ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: REDUCED ? true : 1.1 },
      onUpdate: () => p.set(proxy.v),
    })
    return () => { tw.scrollTrigger?.kill(); tw.kill() }
  }, [p])

  // 11. Цифрлық әлемнің оянуы — 6 секундтық GSAP Timeline (сессияда бір рет)
  useEffect(() => {
    if (!ready) return
    const a = A.current
    const t = gsap.timeline({
      onUpdate: () => title.set(a.title),
      onComplete: () => { setAwaking(false); try { sessionStorage.setItem(AWAKE_KEY, '1') } catch { /* */ } },
    })
    t.to(a, { platform: 0.25, duration: 0.8, ease: 'power1.in' }, 0.1)
      .to(a, { platform: 1, duration: 0.6, ease: 'power2.out' }, 1)
      .to(a, { wave: 1, duration: 1.1, ease: 'power2.out' }, 1)
      .to(a, { trunk: 1, duration: 1.2, ease: 'power2.inOut' }, 2)
      .to(a, { crown: 1, duration: 1.3, ease: 'power2.inOut' }, 3)
      .to(a, { world: 1, duration: 1.2, ease: 'power2.out' }, 4)
      .to(a, { pull: 1, duration: 1.8, ease: 'power3.inOut' }, 4.4)
      .to(a, { title: 1, duration: 1, ease: 'power2.out' }, 5)
    tl.current = t
    if (import.meta.env.DEV) { window.__A = a; window.__tl = t }
    let seen = false
    try { seen = !!sessionStorage.getItem(AWAKE_KEY) } catch { /* */ }
    if (REDUCED || seen) t.progress(1)
    else setAwaking(true)
    return () => t.kill()
  }, [ready, title])

  const skip = () => tl.current?.progress(1)

  const hint = useTransform(p, [0, 0.04], [1, 0])
  const bar = useTransform(p, [0, 1], ['0%', '100%'])
  const titleO = useTransform([title, p], ([t, v]) => t * (1 - Math.min(1, Math.max(0, (v - 0.1) / 0.06))))
  const veil = useTransform(p, [0.72, 0.84], [0, 0.94])
  const revealO = useTransform(p, [0.8, 0.9], [0, 1])
  const revealY = useTransform(p, [0.8, 0.92], [40, 0])
  const revealPE = useTransform(revealO, (v) => (v > 0.5 ? 'auto' : 'none'))

  const lightUI = (id) => ({ '--c1': BRANCHES[id].c1, '--c2': BRANCHES[id].c2 })
  const w = typeof window !== 'undefined' ? Math.min(250, (window.innerWidth - 60) / (window.innerWidth < 760 ? 1 : 3)) : 250

  return (
    <section className="si si-dark" ref={ref}>
      <div className="si-sticky">
        {gl ? (
          <Suspense fallback={<div className="si-fallback dark"><span>Цифрлық жүйе іске қосылуда…</span></div>}>
            <TreeScene A={A} progress={p} onNavigate={onNavigate} onReady={() => setReady(true)} />
          </Suspense>
        ) : (
          <div className="si-fallback dark nogl"><span>Құрылғы 3D-графиканы қолдамайды — сайттың өзі толық жұмыс істейді.</span></div>
        )}
        <motion.div className="si-veil light" style={{ opacity: veil }} />

        {/* SCENE 01 — THE ARRIVAL */}
        <motion.div className="si-title" style={{ opacity: titleO }}>
          <h1>КӘСІБИ<br />ШЕЖІРЕ</h1>
          <div className="si-orn"><i /><b>✦</b><i /></div>
          <p>Ата-бабаң кәсібінен — болашақ мамандығыңа</p>
        </motion.div>

        {/* SCENE 02 — THE ASCENT */}
        <Caption p={p} range={[0.15, 0.3]} className="dark">
          <small className="si-kicker">01 · Көтерілу</small>
          <h2>Тамырдан — тәжге</h2>
          <p>Ата-бабамыздың кәсібі — тамыр. Энергия діңмен көтеріліп, бүгінгі білімге айналады.</p>
        </Caption>

        {/* SCENE 03 — THE BRANCHES */}
        <Caption p={p} range={[0.31, 0.5]} className="dark top-cap">
          <small className="si-kicker">02 · Бұтақтар</small>
          <h2>Әр бұтақ — бір қадам</h2>
          <div className="si-chips">
            {ORDER.slice(1).map((id, i) => (
              <button key={id} style={lightUI(id)} onClick={() => onNavigate(i + 1)}>{BRANCHES[id].label}</button>
            ))}
          </div>
        </Caption>

        {/* SCENE 04 — DIGITAL TRANSITION */}
        <Caption p={p} range={[0.52, 0.7]} className="dark">
          <small className="si-kicker">03 · Портал</small>
          <h2>Шежіре бұтағы ашылуда…</h2>
          <p>Цифрлық кеңістік жарыққа ауысады — саяхатың басталады.</p>
        </Caption>

        {/* SCENE 05 — WEBSITE REVEAL */}
        <div className="si-reveal-wrap">
        <motion.div className="si-reveal2" style={{ opacity: revealO, y: revealY, pointerEvents: revealPE }}>
          <small className="si-kicker">04 · Саяхат басталды</small>
          <h2 className="si-brand">КӘСІБИ ШЕЖІРЕ</h2>
          <p className="si-motto">Тамыр. Технология. Болашақ.</p>
          <div className="si-folders">
            {['shezhire', 'test', 'vr'].map((id) => (
              <GlassFolder
                key={id} width={w} tone="light" art={BRANCHES[id].art} seed={id.length * 3} action="none"
                label={BRANCHES[id].label} meta="ашу үшін бас"
                files={[{ name: 'Бөлімге өту →', meta: BRANCHES[id].label }]}
                onFileSelect={() => onNavigate(ORDER.indexOf(id))}
              />
            ))}
          </div>
          <div className="si-cta-row">
            <button className="btn" onClick={() => onNavigate(1)}>Шежірені бастау →</button>
            <button className="btn ghost" onClick={onStart}>Саяхат жоспары ↓</button>
          </div>
        </motion.div>
        </div>

        {awaking && <button className="si-skip" onClick={skip}>Өткізу ⏭</button>}
        <motion.div className="si-hint dark" style={{ opacity: hint }}><span>Төмен айналдыр</span><i /></motion.div>
        <div className="si-progress dark">
          <motion.div className="si-bar" style={{ height: bar }} />
          {SCENES.map((c, i) => <span key={c} style={{ top: `${(i / (SCENES.length - 1)) * 100}%` }}>{c}</span>)}
        </div>
      </div>
    </section>
  )
}
