import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSim, Hot, Scene, SimShell, Floor, Html } from './engine'

const STEPS = [
  { id: 'gauge', hint: 'Манометрден қысымды тексер', ok: 'Қысым көтеріліп жатыр! Тез әрекет ет!' },
  { id: 'relief', hint: 'Жасыл сақтандыру клапанын аш', ok: 'Қысым қалыпқа түсті ✓ Апат болдырылмады.' },
  { id: 'main', hint: 'Қызыл негізгі ысырманы аш', ok: 'Мұнай құбырға ағып жатыр.' },
  { id: 'pump', hint: 'Сорғыны іске қос', ok: 'Сорғы жұмыс істеп тұр.' },
  { id: 'log', hint: 'Көрсеткіштерді журналға жаз', ok: 'Ауысым журналы толтырылды 📋' },
]

const rule = (id, idx) => {
  if (id === 'main' && idx < 2) return 'Қысым жоғары кезде негізгі ысырманы ашуға болмайды — апат қаупі!'
  if (id === 'pump' && idx < 3) return 'Ысырма жабық — сорғы бос айналып бұзылады!'
}

function Gauge({ p, act }) {
  const a = (0.75 - (p / 100) * 1.5) * Math.PI
  return (
    <Hot id="gauge" act={act} label={`Манометр: ${Math.round(p)} атм`} position={[0, 1.75, 0.18]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 32]} />
        <meshStandardMaterial color={p > 80 ? '#ffd6d6' : '#f4f4f4'} />
      </mesh>
      <mesh position={[0, 0, 0.03]} rotation={[0, 0, a]}>
        <boxGeometry args={[0.02, 0.32, 0.01]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
    </Hot>
  )
}

function Alarm({ on }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.emissiveIntensity = on ? (Math.sin(clock.elapsedTime * 10) > 0 ? 3 : 0.2) : 0
  })
  return (
    <mesh position={[0, 2.25, 0]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial ref={ref} color="#e74c3c" emissive="#ff2200" />
    </mesh>
  )
}

function Wheel({ id, act, label, color, open, position }) {
  const ref = useRef()
  useFrame((_, d) => { if (ref.current && open) ref.current.rotation.z += d * 2 })
  return (
    <Hot id={id} act={act} label={label} position={position}>
      <mesh ref={ref}>
        <torusGeometry args={[0.16, 0.035, 12, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </Hot>
  )
}

function Flywheel({ on }) {
  const ref = useRef()
  useFrame((_, d) => { if (ref.current && on) ref.current.rotation.z += d * 4 })
  return (
    <mesh ref={ref} position={[1.6, 0.6, 0.3]}>
      <cylinderGeometry args={[0.25, 0.25, 0.06, 6]} />
      <meshStandardMaterial color="#34495e" />
    </mesh>
  )
}

function World({ sim, p }) {
  const { idx, act } = sim
  return (
    <>
      <Floor color="#c9a66b" size={30} />
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 2, 16]} />
        <meshStandardMaterial color="#7f8c8d" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.8, 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 1.6, 12]} />
        <meshStandardMaterial color="#95a5a6" metalness={0.6} />
      </mesh>
      <mesh position={[-0.35, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 12]} />
        <meshStandardMaterial color="#95a5a6" />
      </mesh>
      <Gauge p={p} act={act} />
      <Alarm on={p > 80} />
      <Wheel id="relief" act={act} label="Сақтандыру клапаны" color="#27ae60" open={idx >= 2} position={[-0.62, 1.1, 0]} />
      <Wheel id="main" act={act} label="Негізгі ысырма" color="#c0392b" open={idx >= 3} position={[0, 0.85, 0.2]} />
      <Hot id="pump" act={act} label="Сорғы" position={[1.6, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.6, 0.5]} />
          <meshStandardMaterial color="#e67e22" />
        </mesh>
      </Hot>
      <Flywheel on={idx >= 4} />
      <Hot id="log" act={act} label="Журнал" position={[-1.4, 0.9, 0.6]}>
        <mesh>
          <boxGeometry args={[0.35, 0.45, 0.03]} />
          <meshStandardMaterial color="#ecf0f1" />
        </mesh>
      </Hot>
      <mesh position={[-1.4, 0.45, 0.6]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {idx >= 1 && (
        <Html position={[0.9, 2.2, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
          <div className={`tag3 ${p > 80 ? 'warn' : ''}`}>Қысым: {Math.round(p)} атм {p > 80 ? '⚠' : '✓'}</div>
        </Html>
      )}
    </>
  )
}

export default function Oil({ onSave, onExit }) {
  const sim = useSim(STEPS, rule)
  const [p, setP] = useState(62)
  const { idx, mistake } = sim
  useEffect(() => {
    const t = setInterval(() => {
      setP((v) => {
        if (idx === 1) {
          if (v >= 98) { mistake('🚨 АПАТ ҚАУПІ! Қысым шектен асты. Жасыл клапанды тезірек аш!'); return 75 }
          return v + 1.5
        }
        if (idx >= 2) return v > 48 ? v - 2 : v
        return v
      })
    }, 200)
    return () => clearInterval(t)
  }, [idx]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <SimShell
      id="oil" sim={sim} onSave={onSave} onExit={onExit}
      scene={<Scene camera={[0.3, 1.8, 3.6]} target={[0.1, 1, 0]} bg="#9fc6e8"><World sim={sim} p={p} /></Scene>}
    />
  )
}
