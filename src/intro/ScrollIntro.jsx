import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BRANCHES, ORDER } from '../branches'
import { transformJob } from '../data'
import GlassFolder from '@/components/ui/glass-folder-cards'
import Ornament from '../components/Ornament'

gsap.registerPlugin(ScrollTrigger)
const RETURN_KEY = 'ks-portal-return'
const SPLIT = 0.7 // 0..SPLIT — табиғаттан цифрлық ағашқа; SPLIT..1 — «Шежіре» бұтағы бойымен порталға
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

const SCENES = ['Табиғат', 'Ояну', 'Трансформация', 'Цифрлық әлем', 'Көтерілу', 'Бұтақ', 'Шежіре']

export default function ScrollIntro({ s, onNavigate, onStart }) {
  const ref = useRef(null)
  const P = useMotionValue(0) // жалпы айналдыру
  const p = useTransform(P, (v) => Math.min(1, v / SPLIT))
  const q = useTransform(P, (v) => Math.min(1, Math.max(0, (v - SPLIT) / (1 - SPLIT))))
  const A = useRef({ intro: 0 })
  const tl = useRef(null)
  const [ready, setReady] = useState(false)
  const [awaking, setAwaking] = useState(false)
  const [gl] = useState(() => (typeof window === 'undefined' ? true : hasWebGL()))
  // Кіріспе экраннан тыс болса — 3D-рендер толық тоқтайды (батарея мен FPS үнемі)
  const [active, setActive] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '100px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const navLock = useRef(false)
  const progScroll = useRef(false)
  const navRef = useRef(onNavigate)
  navRef.current = onNavigate

  // Бірыңғай scroll-timeline: GSAP ScrollTrigger (sticky pin + scrub), кері бағытта да жұмыс істейді.
  // Портал арқылы толық өткенде (тек алға айналдырғанда) «Шежіре» бөлімі ашылады — pin босатылады.
  useLayoutEffect(() => {
    const proxy = { v: 0 }
    const st = { prog: 0, dir: 1 }
    const tw = gsap.to(proxy, {
      v: 1, ease: 'none',
      scrollTrigger: {
        trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: REDUCED ? true : 1.2,
        onUpdate: (self) => { st.prog = self.progress; st.dir = self.direction },
      },
      onUpdate: () => {
        const v = proxy.v
        P.set(v)
        // айналдыру соңына жетті (алға) және камера порталдан өтті → «Шежіре» бөлімі
        if (st.prog > 0.995 && st.dir > 0 && v > 0.985 && !navLock.current && !progScroll.current) {
          navLock.current = true
          try { sessionStorage.setItem(RETURN_KEY, String(window.scrollY)) } catch { /* */ }
          navRef.current(1)
        }
      },
    })
    return () => { tw.scrollTrigger?.kill(); tw.kill() }
  }, [P])
  // 3D жүктелгеннен кейін ScrollTrigger өлшемдерін жаңарту (секірулерсіз)
  useEffect(() => { if (ready) ScrollTrigger.refresh() }, [ready])

  // «Шежіре»-ден Back басқанда — порталдың жанына қайтамыз, кері айналдыруға болады
  useEffect(() => {
    if (!ready) return
    let y = null
    try { y = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY) } catch { /* */ }
    if (!y) return
    progScroll.current = true
    const t = setTimeout(() => {
      ScrollTrigger.refresh()
      window.scrollTo({ top: Math.max(0, Number(y) - window.innerHeight * 0.9), behavior: 'auto' })
      setTimeout(() => { progScroll.current = false }, 1800)
    }, 120)
    return () => clearTimeout(t)
  }, [ready])
  const startPlan = () => { progScroll.current = true; setTimeout(() => { progScroll.current = false }, 2500); onStart() }

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
  const bar = useTransform(P, [0, 1], ['0%', '100%'])
  const heroO = useTransform([p, q], ([a, b]) => Math.min(1, Math.max(0, (a - 0.86) / 0.09)) * (1 - Math.min(1, b / 0.09)))
  const heroX = useTransform(p, [0.86, 0.96], [40, 0])
  const heroPE = useTransform(heroO, (v) => (v > 0.5 ? 'auto' : 'none'))
  // портал ішінде: жұмсақ піл сүйегі жарығы (кенет ақ экрансыз), кейін «Шежіре» кіреберісі
  const veil = useTransform(q, [0.86, 0.99], [0, 0.94])
  const entO = useTransform(q, [0.9, 1], [0, 1])
  const entY = useTransform(q, [0.9, 1], [30, 0])
  const entPE = useTransform(entO, (v) => (v > 0.5 ? 'auto' : 'none'))
  const fam = (s?.family || []).filter((f) => f.job?.trim())
  const fw = typeof window !== 'undefined' ? Math.min(230, (window.innerWidth - 60) / (window.innerWidth < 760 ? 1 : 3)) : 230

  return (
    <section className="si si-dark" ref={ref}>
      <div className="si-sticky">
        {gl ? (
          <Suspense fallback={<div className="si-fallback nature"><span>Табиғат оянуда…</span></div>}>
            <TreeScene A={A} progress={p} progress2={q} active={active} onNavigate={onNavigate} onReady={() => setReady(true)} />
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
          <Ornament width={200} className="left" />
          <h1>КӘСІБИ<br />ШЕЖІРЕ</h1>
          <Ornament width={200} className="left bottom" />
          <p>Жеті атадан — болашақ мамандыққа</p>
          <div className="si-cta-row left">
            <button className="btn hero-btn" onClick={() => onNavigate(1)}>Бастау →</button>
            <button className="btn hero-btn map" onClick={startPlan}>🗺 Саяхат жоспары</button>
          </div>
        </motion.div>

        {/* DIGITAL ROOTS JOURNEY — «Шежіре» бұтағы бойымен порталға */}
        <Caption p={q} range={[0.12, 0.33]} className="dark">
          <small className="si-kicker">05 · Көтерілу</small>
          <h2>Діңмен жоғары — тамырдан тәжге</h2>
          <p>Энергия талшықтары діңді орап, бізді бұтақтардың айрығына көтереді.</p>
        </Caption>
        <Caption p={q} range={[0.42, 0.66]} className="dark top-cap">
          <small className="si-kicker">06 · Шежіре бұтағы</small>
          <h2>Бұтақ бойымен — порталға</h2>
          <p>Бұтақтың ұшында — жеті атаның есігі. Оның ар жағында — «Шежіре».</p>
        </Caption>

        <motion.div className="si-veil ivory" style={{ opacity: veil }} />
        <div className="si-reveal-wrap">
          <motion.div className="shz-entry" style={{ opacity: entO, y: entY, pointerEvents: entPE }}>
            <Ornament width={200} />
            <h2 className="shz-title">ШЕЖІРЕ</h2>
            <Ornament width={140} />
            <p className="shz-sub">Әулетіңнің кәсіптері — болашақ мамандығыңның тамыры</p>
            <div className="si-folders">
              <GlassFolder
                width={fw} tone="light" art="heritage" seed={5} action="none"
                label="Менің әулетім" meta={fam.length ? `${fam.length} буын` : 'әлі толтырылмаған'}
                files={fam.length ? fam.map((f) => ({ name: f.role, meta: f.job })) : [{ name: 'Шежірені толтыр →' }]}
                onFileSelect={() => onNavigate(1)}
              />
              <GlassFolder
                width={fw} tone="light" art="heritage" seed={9} action="none"
                label="Кәсіп → 2040" meta="болашақ мамандықтар"
                files={fam.length ? fam.slice(0, 4).map((f) => ({ name: transformJob(f.job)[0], meta: f.job })) : [{ name: 'Шежірені толтыр →' }]}
                onFileSelect={() => onNavigate(1)}
              />
              <GlassFolder
                width={fw} tone="light" art="digital-test" seed={7} action="none"
                label="Келесі бұтақ" meta="Қызығушылық тесті"
                files={[{ name: 'Тестке өту →', meta: '18 сұрақ' }]}
                onFileSelect={() => onNavigate(2)}
              />
            </div>
            <div className="shz-steps" aria-hidden="true"><i className="on" /><i /><i /><i /><i /><i /></div>
            <div className="si-cta-row">
              <button className="btn heritage" onClick={() => onNavigate(1)}>Шежірені құру →</button>
              <button className="btn ghost" onClick={() => onNavigate(2)}>Тест →</button>
            </div>
          </motion.div>
        </div>
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
