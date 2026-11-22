import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSim, Hot, Scene, SimShell, Floor } from './engine'

const STEPS = [
  { id: 'breaker', hint: 'Басты автоматты өшір (қауіпсіздік!)', ok: 'Дұрыс! Тоқ өшірілді — енді жұмыс қауіпсіз.' },
  { id: 'tester', hint: 'Индикаторлық бұрағышпен кернеудің жоқтығын тексер', ok: 'Кернеу жоқ ✓ Кәсіби электрик әрқашан тексереді.' },
  { id: 'broken', hint: 'Зақымдалған қызыл сымды ажырат', ok: 'Ескі сым алынды.' },
  { id: 'spare', hint: 'Жаңа сымды (көк орам) орнат', ok: 'Жаңа сым жалғанды. Тізбек тұйықталды.' },
  { id: 'breaker', hint: 'Автоматты қайта қос — шам жансын!', ok: 'Шам жанды! 💡 Жұмыс аяқталды.' },
]

const rule = (id, idx) => {
  if (id === 'broken' && idx === 0) return '⚡ ТОҚ СОҚТЫ! Алдымен автоматты өшір — бұл электриктің №1 ережесі.'
  if (id === 'breaker' && idx > 0 && idx < 4) return 'Әлі ерте! Жөндеу аяқталмай тоқты қоспа.'
  if (id === 'spare' && idx < 3) return 'Алдымен ескі зақымдалған сымды ажырату керек.'
}

function Spark({ on }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.visible = on && Math.sin(clock.elapsedTime * 25) > 0.2
  })
  return (
    <mesh ref={ref} position={[0, 2.2, -1.3]}>
      <sphereGeometry args={[0.07, 12, 12]} />
      <meshStandardMaterial color="#ffe066" emissive="#ffcc00" emissiveIntensity={3} />
    </mesh>
  )
}

function World({ sim }) {
  const { idx, act } = sim
  const breakerOn = idx < 1 || idx >= 5
  const broken = idx < 3
  const fixed = idx >= 4
  const lamp = idx >= 5
  return (
    <>
      <Floor color="#3a3f47" />
      <mesh position={[0, 1.6, -1.5]}>
        <boxGeometry args={[6, 3.2, 0.1]} />
        <meshStandardMaterial color="#cfd6de" />
      </mesh>
      {/* Щит */}
      <mesh position={[-1.4, 1.4, -1.4]}>
        <boxGeometry args={[0.8, 1, 0.1]} />
        <meshStandardMaterial color="#5b6672" />
      </mesh>
      <Hot id="breaker" act={act} label="Автомат" position={[-1.4, 1.45, -1.3]}>
        <mesh position={[0, breakerOn ? 0.1 : -0.1, 0]}>
          <boxGeometry args={[0.18, 0.3, 0.12]} />
          <meshStandardMaterial color={breakerOn ? '#2ecc71' : '#e74c3c'} />
        </mesh>
      </Hot>
      {/* Сымдар */}
      {broken && (
        <Hot id="broken" act={act} label="Зақымдалған сым" position={[-0.3, 2.2, -1.4]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 1.6, 12]} />
            <meshStandardMaterial color="#c0392b" />
          </mesh>
        </Hot>
      )}
      <Spark on={broken && breakerOn} />
      {fixed && (
        <mesh position={[-0.3, 2.2, -1.4]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 12]} />
          <meshStandardMaterial color="#2e86de" />
        </mesh>
      )}
      {/* Шам */}
      <mesh position={[0.8, 2.2, -1.3]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color={lamp ? '#fff3b0' : '#777'} emissive={lamp ? '#ffd54a' : '#000'} emissiveIntensity={lamp ? 2.5 : 0} />
      </mesh>
      {lamp && <pointLight position={[0.8, 2, -1]} intensity={6} distance={6} color="#ffd54a" />}
      {/* Үстел мен құралдар */}
      <mesh position={[0.3, 0.5, 0.2]}>
        <boxGeometry args={[1.6, 0.08, 0.8]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>
      <Hot id="tester" act={act} label="Индикатор" position={[-0.3, 0.6, 0.25]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
          <meshStandardMaterial color="#f1c40f" />
        </mesh>
      </Hot>
      {idx < 4 && (
        <Hot id="spare" act={act} label="Жаңа сым" position={[0.85, 0.62, 0.15]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.035, 12, 32]} />
            <meshStandardMaterial color="#2e86de" />
          </mesh>
        </Hot>
      )}
    </>
  )
}

export default function Electric({ onSave, onExit }) {
  const sim = useSim(STEPS, rule)
  return (
    <SimShell
      id="electric" sim={sim} onSave={onSave} onExit={onExit}
      scene={<Scene camera={[0, 1.7, 3.4]} target={[-0.2, 1.3, -0.8]}><World sim={sim} /></Scene>}
    />
  )
}
