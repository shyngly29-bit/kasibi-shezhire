import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { XR, XROrigin, createXRStore } from '@react-three/xr'
import { OrbitControls } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { VR_INFO } from '../data'

const store = createXRStore({ emulate: false })

// Жеңіл 3D-жазулар: DOM элементі Canvas сыртында, орны әр кадрда есептеледі
const LabelReg = createContext(null)
const tmp = new THREE.Vector3()
function Html({ position = [0, 0, 0], children }) {
  const reg = useContext(LabelReg)
  const id = 'lbl' + useId().replace(/:/g, '')
  const ref = useRef()
  useEffect(() => { reg?.set(id, children) }, [children]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => reg?.remove(id), []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ camera, size }) => {
    const el = document.getElementById(id)
    if (!el || !ref.current) return
    tmp.setFromMatrixPosition(ref.current.matrixWorld).project(camera)
    const x = ((tmp.x + 1) / 2) * size.width
    const y = ((1 - tmp.y) / 2) * size.height
    el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
    el.style.visibility = tmp.z < 1 ? 'visible' : 'hidden'
  })
  return <object3D ref={ref} position={position} />
}

// Қадамдық симуляция логикасы
export function useSim(steps, rule) {
  const [idx, setIdx] = useState(0)
  const [mist, setMist] = useState(0)
  const [msg, setMsg] = useState(null)
  const mistake = (t) => { setMist((m) => m + 1); setMsg({ ok: false, t }) }
  const act = (id) => {
    if (idx >= steps.length) return
    if (steps[idx].id === id) {
      setMsg({ ok: true, t: steps[idx].ok || 'Дұрыс! ✓' })
      setIdx(idx + 1)
      return
    }
    const used = steps.slice(0, idx).some((s) => s.id === id) && !steps.slice(idx).some((s) => s.id === id)
    if (used) return
    mistake(rule?.(id, idx) || 'Бұл қадам қазір емес. Нұсқауды оқы 👉')
  }
  return { idx, mist, msg, act, mistake, finished: idx >= steps.length, steps }
}

// Басылатын 3D нысан
export function Hot({ id, act, label, children, ...props }) {
  const [hover, setHover] = useState(false)
  return (
    <group
      {...props}
      scale={hover ? 1.08 : 1}
      onClick={(e) => { e.stopPropagation(); act(id) }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto' }}
    >
      {children}
      {label && (
        <Html position={[0, 0.32, 0]}>
          <div className={`tag3 ${hover ? 'hi' : ''}`}>{label}</div>
        </Html>
      )}
    </group>
  )
}

export function Scene({ camera, target, origin, bg = '#0f2236', children }) {
  return (
    <Canvas camera={{ position: camera, fov: 55 }} dpr={[1, 2]}>
      <color attach="background" args={[bg]} />
      <hemisphereLight args={['#dfefff', '#2a2a2a', 0.9]} />
      <directionalLight position={[3, 6, 4]} intensity={1.4} />
      <XR store={store}>
        <XROrigin position={origin || [camera[0], 0, camera[2]]} />
        {children}
      </XR>
      <OrbitControls target={target} maxPolarAngle={Math.PI / 2.05} minDistance={1.5} maxDistance={12} />
    </Canvas>
  )
}

export function SimShell({ id, sim, scene, extra, finished, onSave, onExit }) {
  const info = VR_INFO[id]
  const done = finished ?? sim.finished
  const score = Math.max(40, 100 - sim.mist * 12)
  const [vrOk, setVrOk] = useState(null)
  const [labels, setLabels] = useState({})
  const reg = useMemo(() => ({
    set: (k, c) => setLabels((m) => ({ ...m, [k]: c })),
    remove: (k) => setLabels((m) => { const n = { ...m }; delete n[k]; return n }),
  }), [])
  const exit = onExit

  useEffect(() => {
    navigator.xr?.isSessionSupported?.('immersive-vr').then(setVrOk).catch(() => setVrOk(false))
    if (!navigator.xr) setVrOk(false)
  }, [])
  useEffect(() => { if (done) onSave({ score, tokens: score }) }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const stepsView = useMemo(() => sim.steps.map((s, i) => (
    <li key={i} className={i < sim.idx ? 'ok' : i === sim.idx ? 'now' : ''}>{i < sim.idx ? '✓' : i + 1}. {s.hint}</li>
  )), [sim.steps, sim.idx])

  return (
    <div className="sim">
      <div className="sim-canvas">
        <LabelReg.Provider value={reg}>{scene}</LabelReg.Provider>
        <div className="labels">
          {Object.entries(labels).map(([k, c]) => <div key={k} id={k} className="lbl">{c}</div>)}
        </div>
        <div className="sim-bar">
          <button className="btn ghost sm" onClick={exit}>← Артқа</button>
          <button className="btn sm" disabled={!vrOk} title={vrOk ? '' : 'VR-көзілдірік табылмады — экранда ойнай бер'} onClick={() => store.enterVR()}>🥽 VR-ға кіру</button>
        </div>
        <small className="sim-help">Тінтуірмен айналдыр · нысанды бас</small>
      </div>
      <aside className="sim-panel">
        <h3>{info.icon} {info.title}</h3>
        {!done && (
          <>
            <ol className="checklist">{stepsView}</ol>
            <AnimatePresence mode="wait">
              {sim.msg && (
                <motion.div key={sim.msg.t + sim.mist} className={`msg ${sim.msg.ok ? 'good' : 'bad'}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  {sim.msg.t}
                </motion.div>
              )}
            </AnimatePresence>
            {extra}
            <p className="muted">Қателер: {sim.mist}</p>
          </>
        )}
        {done && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="result">
            <div className="big-stamp">{info.icon}<b>{score}%</b><small>+{score} жетон</small></div>
            <h4>📚 Сабақтағы қай тақырып керек болды?</h4>
            <p className="muted">{info.subject}</p>
            <ul className="plain">{info.topics.map((t) => <li key={t}>• {t}</li>)}</ul>
            <h4>📊 Мамандық картасы</h4>
            <ul className="plain small">
              <li><b>Ақтөбеде сұраныс:</b> {info.demand}</li>
              <li><b>Қайда оқуға болады:</b> {info.study}</li>
              <li><b>Болашағы:</b> {info.future}</li>
            </ul>
            <button className="btn" onClick={exit}>Мөр паспортқа басылды ✓ · Басқа мамандық</button>
          </motion.div>
        )}
      </aside>
    </div>
  )
}

export function Floor({ color = '#26384d', size = 20 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export { Html }
