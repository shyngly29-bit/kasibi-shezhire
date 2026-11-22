// DIGITAL ROOTS JOURNEY: «Шежіре» бұтағы → жарық жол → оюлы портал → жарық әлем
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { portalTexture } from './textures'

// Жол: діңнен → «Шежіре» түйіні → сыртқа қарай → портал
export function makeJourney(node, H) {
  const out = new THREE.Vector3(node.x, 0, node.z).normalize()
  if (!isFinite(out.x) || out.lengthSq() < 0.01) out.set(0, 0, 1)
  const up = new THREE.Vector3(0, 1, 0)
  const portal = node.clone().addScaledVector(out, 18).add(new THREE.Vector3(0, 1.2, 0))
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, H * 0.45, 0),
    new THREE.Vector3(node.x * 0.5, (H * 0.45 + node.y) / 2 + 0.6, node.z * 0.5),
    node.clone(),
    node.clone().addScaledVector(out, 6).add(new THREE.Vector3(0, 0.4, 0)),
    node.clone().addScaledVector(out, 12).add(new THREE.Vector3(0, 0.9, 0)),
    portal.clone(),
  ])
  // камера бөлігі (q: 0..1). Камера жолдың сыртында және сәл жоғарыда — геометрия арқылы өтпейді
  const side = new THREE.Vector3().crossVectors(up, out).normalize()
  const cam = [
    { t: 0.3, pos: node.clone().addScaledVector(out, 7).addScaledVector(side, 2.5).add(new THREE.Vector3(0, 1.6, 0)), look: node.clone() },
    { t: 0.5, pos: path.getPoint(0.6).addScaledVector(side, 0.9).add(new THREE.Vector3(0, 1.3, 0)), look: path.getPoint(0.78) },
    { t: 0.78, pos: path.getPoint(0.86).add(new THREE.Vector3(0, 0.9, 0)), look: portal.clone() },
    { t: 1.0, pos: portal.clone().addScaledVector(out, 2.5).add(new THREE.Vector3(0, 0.3, 0)), look: portal.clone().addScaledVector(out, 14).add(new THREE.Vector3(0, 1.5, 0)) },
  ]
  return { path, portal, out, cam }
}

// Бұтақ → жарық жол: импульс ағады, алтын жебелер жүгіреді
export function LightPath({ U, S, J }) {
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.TubeGeometry(J.path, 240, 0.16, 10, false)
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { ...U, uReveal: { value: 0 }, uOp: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uTime; uniform float uReveal; uniform float uOp; varying vec2 vUv;
        void main(){
          float x = vUv.x;
          if (x > uReveal) discard;
          float head = smoothstep(0.08, 0.0, uReveal - x) * step(uReveal, 0.999);
          float flow = pow(fract(x*14.0 - uTime*0.9), 6.0);
          float chev = step(0.86, fract(x*40.0 - uTime*1.4)) * smoothstep(0.35, 0.0, abs(vUv.y - 0.5));
          vec3 c = vec3(0.0,0.8,1.0)*(0.6 + flow*1.8) + vec3(1.0,0.8,0.45)*chev*2.0 + vec3(0.6,0.95,1.0)*head*4.0;
          gl_FragColor = vec4(c*uOp, 1.0);
        }`,
    })
    return { geo, mat }
  }, [U, J])
  useFrame(() => {
    const q = S.current.q
    mat.uniforms.uReveal.value = THREE.MathUtils.smoothstep(q, 0.04, 0.42)
    mat.uniforms.uOp.value = THREE.MathUtils.smoothstep(q, 0.0, 0.08) * (1 - THREE.MathUtils.smoothstep(q, 0.76, 0.9))
  })
  return <mesh geometry={geo} material={mat} />
}

// Оюлы портал: ішінде жарық әлем
export function Portal({ S, J }) {
  const g = useRef()
  const tex = useMemo(() => portalTexture(), [])
  const disc = useRef()
  const rim = useRef()
  useFrame(({ clock }) => {
    const q = S.current.q
    // портал көрінеді, ал камера өтер алдында диск біртіндеп мөлдір болады (ақ экран жоқ)
    const k = THREE.MathUtils.smoothstep(q, 0.25, 0.6) * (1 - THREE.MathUtils.smoothstep(q, 0.84, 0.96))
    g.current.visible = k > 0.01
    g.current.position.copy(J.portal)
    g.current.lookAt(J.portal.clone().sub(J.out))
    g.current.scale.setScalar(0.4 + k * 0.6)
    disc.current.material.opacity = k * 0.85
    disc.current.rotation.z = clock.elapsedTime * 0.05
    rim.current.material.opacity = k * (0.8 + Math.sin(clock.elapsedTime * 2) * 0.2)
  })
  return (
    <group ref={g}>
      <mesh ref={disc}>
        <circleGeometry args={[4.2, 96]} />
        <meshBasicMaterial map={tex} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} color={new THREE.Color(0.95, 0.92, 0.86)} />
      </mesh>
      <mesh ref={rim}>
        <torusGeometry args={[4.25, 0.06, 10, 160]} />
        <meshBasicMaterial color={new THREE.Color(0.3, 2.2, 2.8)} transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  )
}
