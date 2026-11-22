import { useState } from 'react'
import { useSim, Hot, Scene, SimShell, Floor, Html } from './engine'

const STEPS = [
  { id: 'sanitizer', hint: 'Қолыңды антисептикпен өңде', ok: 'Гигиена сақталды ✓' },
  { id: 'thermo', hint: 'Дене температурасын өлше', ok: 'Температура: 38,6 °C — жоғары!' },
  { id: 'tono', hint: 'Артериялық қысымды өлше', ok: 'Қысым: 125/80 — қалыпты.' },
  { id: 'oxi', hint: 'Пульс пен оттегі деңгейін өлше', ok: 'Пульс: 104 соққы/мин, SpO₂: 96%.' },
  { id: 'decide', hint: 'Шешім қабылда', ok: 'Дұрыс шешім! 👏' },
]

const rule = (id, idx) => {
  if (idx === 0 && id !== 'sanitizer') return '🧼 Гигиена! Науқасқа жақындамас бұрын қолды өңде.'
}

const CHOICES = [
  ['Науқас сау — сабаққа бара береді', false, 'Температура 38,6 °C — бұл қалыпты емес.'],
  ['Қызба мен жиі пульс — инфекция белгілері. Дәрігерге жолдаймын, көп сұйықтық ішуге кеңес беремін', true],
  ['Шұғыл түрде реанимацияға жеткіземін', false, 'Қысым мен оттегі қалыпты — реанимация қажет емес.'],
]

function World({ sim }) {
  const { idx, act } = sim
  return (
    <>
      <Floor color="#d8e3ea" />
      <mesh position={[0, 0.3, -0.5]}>
        <boxGeometry args={[2, 0.5, 0.95]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.1, 0.72, -0.5]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.2, 1, 8, 16]} />
        <meshStandardMaterial color="#7fb3d5" />
      </mesh>
      <mesh position={[-0.75, 0.78, -0.5]}>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial color="#e0b796" />
      </mesh>
      <mesh position={[1.0, 0.68, 0.6]}>
        <boxGeometry args={[1.9, 0.05, 0.5]} />
        <meshStandardMaterial color="#b0bec5" />
      </mesh>
      <Hot id="sanitizer" act={act} label="Антисептик" position={[0.2, 0.82, 0.6]}>
        <mesh><cylinderGeometry args={[0.05, 0.05, 0.25, 16]} /><meshStandardMaterial color="#27ae60" /></mesh>
      </Hot>
      <Hot id="thermo" act={act} label="Термометр" position={[0.7, 0.73, 0.6]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 0.22, 8]} /><meshStandardMaterial color="#ecf0f1" /></mesh>
        <mesh position={[0.11, 0, 0]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#e74c3c" /></mesh>
      </Hot>
      <Hot id="tono" act={act} label="Тонометр" position={[1.25, 0.76, 0.6]}>
        <mesh><boxGeometry args={[0.18, 0.08, 0.12]} /><meshStandardMaterial color="#2c3e50" /></mesh>
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.07, 0.025, 8, 24]} /><meshStandardMaterial color="#34495e" /></mesh>
      </Hot>
      <Hot id="oxi" act={act} label="Пульсоксиметр" position={[1.8, 0.74, 0.6]}>
        <mesh><boxGeometry args={[0.08, 0.06, 0.12]} /><meshStandardMaterial color="#2980b9" /></mesh>
      </Hot>
      <mesh position={[1.4, 1.5, -0.95]}>
        <boxGeometry args={[0.9, 0.6, 0.05]} />
        <meshStandardMaterial color="#1b2631" />
      </mesh>
      <Html position={[1.4, 1.5, -0.9]} center distanceFactor={5} style={{ pointerEvents: 'none' }}>
        <div className="monitor">
          <div>🌡 {idx >= 2 ? '38,6 °C' : '—'}</div>
          <div>🩸 {idx >= 3 ? '125/80' : '—'}</div>
          <div>❤ {idx >= 4 ? '104' : '—'} · O₂ {idx >= 4 ? '96%' : '—'}</div>
        </div>
      </Html>
    </>
  )
}

export default function Nurse({ onSave, onExit }) {
  const sim = useSim(STEPS, rule)
  const [picked, setPicked] = useState(null)
  const extra = sim.idx === 4 && (
    <div className="quiz">
      <b>Нәтижелерге қарап шешім қабылда:</b>
      {CHOICES.map(([t, ok, why], i) => (
        <button key={i} className={`opt ${picked === i ? (ok ? 'right' : 'wrong') : ''}`} onClick={() => { setPicked(i); if (ok) sim.act('decide'); else sim.mistake(why) }}>{t}</button>
      ))}
    </div>
  )
  return (
    <SimShell
      id="nurse" sim={sim} extra={extra} onSave={onSave} onExit={onExit}
      scene={<Scene camera={[0.8, 1.9, 2.9]} target={[0.4, 0.7, 0]} bg="#c7dbe6"><World sim={sim} /></Scene>}
    />
  )
}
