import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSim, Scene, SimShell, Floor } from './engine'

const SICK = [3, 8, 9, 14, 20]
const COLS = 6
const ROWS = 4
const pos = (i) => [(i % COLS) - 2.5, 0.02, Math.floor(i / COLS) - 1.5]

const STEPS = [
  { id: 'select', hint: 'Сарғайған (ауру) 5 алқапты белгіле', ok: 'Барлық ауру алқап белгіленді ✓' },
  { id: 'area', hint: 'Өңделетін ауданды есепте', ok: '5 × (100 м × 50 м) = 25 000 м² = 2,5 га ✓' },
  { id: 'liters', hint: 'Ерітінді мөлшерін есепте', ok: '2,5 га × 10 л = 25 л ✓' },
  { id: 'fly', hint: 'Дронды ұшыр!', ok: 'Дрон маршрутпен ұшып жатыр…' },
]

function Tile({ i, sel, onPick }) {
  const sick = SICK.includes(i)
  const [hover, setHover] = useState(false)
  const color = sel ? '#2bb3a3' : sick ? '#d4b23c' : '#4caf50'
  return (
    <mesh
      position={pos(i)} rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => { e.stopPropagation(); onPick(i) }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto' }}
    >
      <planeGeometry args={[0.92, 0.92]} />
      <meshStandardMaterial color={color} emissive={hover ? '#333' : '#000'} />
    </mesh>
  )
}

function DroneModel({ route, flying, onLanded }) {
  const g = useRef()
  const rotors = useRef([])
  const t = useRef(0)
  const v = new THREE.Vector3()
  useFrame((_, d) => {
    rotors.current.forEach((r) => r && (r.rotation.y += d * 40))
    if (!g.current) return
    if (flying && route.length) {
      t.current += d * 0.8
      const k = Math.min(Math.floor(t.current), route.length - 1)
      const [x, , z] = pos(route[k])
      v.set(x, 1.2, z)
      g.current.position.lerp(v, 0.06)
      if (t.current > route.length + 0.8) { t.current = -999; onLanded() }
    } else {
      g.current.position.y = 1.5 + Math.sin(performance.now() / 400) * 0.05
    }
  })
  return (
    <group ref={g} position={[0, 1.5, 2.6]}>
      <mesh><boxGeometry args={[0.35, 0.08, 0.35]} /><meshStandardMaterial color="#263238" /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
        <mesh key={i} ref={(el) => (rotors.current[i] = el)} position={[a * 0.22, 0.06, b * 0.22]}>
          <cylinderGeometry args={[0.12, 0.12, 0.01, 16]} />
          <meshStandardMaterial color="#90a4ae" transparent opacity={0.7} />
        </mesh>
      ))}
      {flying && (
        <mesh position={[0, -0.5, 0]}>
          <coneGeometry args={[0.35, 0.9, 16, 1, true]} />
          <meshStandardMaterial color="#7fdbff" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

function NumQ({ q, answer, onRight, onWrong, unit }) {
  const [v, setV] = useState('')
  const check = () => {
    const n = parseFloat(v.replace(',', '.'))
    if (Math.abs(n - answer) < 0.01) onRight()
    else onWrong()
  }
  return (
    <div className="quiz">
      <b>{q}</b>
      <div className="row-btns">
        <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && check()} placeholder="Жауап" inputMode="decimal" />
        <span className="muted">{unit}</span>
        <button className="btn sm" onClick={check}>Тексеру</button>
      </div>
    </div>
  )
}

export default function Drone({ onSave, onExit }) {
  const sim = useSim(STEPS)
  const [sel, setSel] = useState([])
  const [landed, setLanded] = useState(false)
  const flying = sim.idx >= 4

  const pick = (i) => {
    if (sim.idx !== 0 || sel.includes(i)) return
    if (!SICK.includes(i)) { sim.mistake('Бұл алқап сау 🌱 — химикатты бекер шашпа!'); return }
    const next = [...sel, i]
    setSel(next)
    if (next.length === SICK.length) sim.act('select')
  }

  let extra = null
  if (sim.idx === 1) extra = <NumQ key="a" q="Әр алқап 100 м × 50 м. 5 алқаптың жалпы ауданы неше гектар? (1 га = 10 000 м²)" answer={2.5} unit="га" onRight={() => sim.act('area')} onWrong={() => sim.mistake('Қайта есепте: 100 × 50 = 5000 м². Оны 5-ке көбейтіп, 10 000-ға бөл.')} />
  if (sim.idx === 2) extra = <NumQ key="l" q="1 гектарға 10 литр ерітінді жұмсалады. Барлығы неше литр керек?" answer={25} unit="л" onRight={() => sim.act('liters')} onWrong={() => sim.mistake('Пропорция: аудан (га) × 10 л.')} />
  if (sim.idx === 3) extra = <button className="btn" onClick={() => sim.act('fly')}>🚁 Дронды ұшыру</button>

  return (
    <SimShell
      id="drone" sim={sim} extra={extra} finished={landed} onSave={onSave} onExit={onExit}
      scene={
        <Scene camera={[0, 4.5, 5.2]} target={[0, 0, 0]} origin={[0, 0, 4]} bg="#a7d3f2">
          <Floor color="#7a5c3a" size={30} />
          {Array.from({ length: COLS * ROWS }, (_, i) => <Tile key={i} i={i} sel={sel.includes(i)} onPick={pick} />)}
          <DroneModel route={sel} flying={flying} onLanded={() => setLanded(true)} />
        </Scene>
      }
    />
  )
}
