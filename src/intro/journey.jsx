// BranchPortalTransition — қайта қолданылатын жүйе: діңмен көтерілу → нақты бұтақ бойымен ұшу → энергия порталы → бөлім
// dest: 0 Шежіре, 1 Тест, 2 Pick3, 3 VR, 4 2040, 5 Паспорт. Әр бағыттың өз бұтағы (ағаштағы түйін) мен портал түсі бар.
// Қазір толық қосылғаны: dest = 0 (Шежіре).
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { portalTexture, landscapeTexture, glowTexture } from './textures'

const UP = new THREE.Vector3(0, 1, 0)
const sm = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)

// Уақыт шкаласы (q: 0..1)
export const QT = { ascA: 0.1, ascB: 0.32, flyA: 0.4, flyB: 0.8, cross: 1.0 }

export function makeJourney(T, H, dest = 0, hero = new THREE.Vector3(-11, 8, 35)) {
  const trunk = T.skeleton[0]
  const tp = trunk.pts.map((p) => p.clone())
  const tr = trunk.radii
  const node = T.nodes[dest].clone()
  const top = tp[tp.length - 1].clone()

  // 1) Нақты бұтақ: діңнің жоғарғы нүктесінен түйінге дейінгі сызықты бұтақ төбелеріне «жабыстырамыз»
  const bp = T.branchPts
  const N = 18
  const raw = []
  for (let i = 1; i < N; i++) {
    const target = top.clone().lerp(node, i / N)
    let best = null, bd = 2.8 * 2.8
    for (let k = 0; k < bp.length; k++) {
      const d = bp[k].distanceToSquared(target)
      if (d < bd) { bd = d; best = bp[k] }
    }
    raw.push((best || target).clone())
  }
  const smooth = raw.map((p, i) => {
    const a = raw[Math.max(0, i - 1)], c = raw[Math.min(raw.length - 1, i + 1)]
    return p.clone().multiplyScalar(0.5).add(a.clone().add(c).multiplyScalar(0.25))
  })
  const branchPts = [top, ...smooth, node]
  const endDir = node.clone().sub(smooth[smooth.length - 3] || top).setY(0).normalize()
  if (!isFinite(endDir.x) || endDir.lengthSq() < 0.1) endDir.set(node.x, 0, node.z).normalize()
  const portal = node.clone().addScaledVector(endDir, 7).add(new THREE.Vector3(0, 0.6, 0))
  const branchCurve = new THREE.CatmullRomCurve3([...branchPts, portal])
  const energyCurve = new THREE.CatmullRomCurve3([...tp, ...smooth, node, portal])

  // 2) Көтерілу: камера діңнің бүйірінде (радиус + қашықтық), геометрия арқылы өтпейді
  const side = new THREE.Vector3(hero.x - tp[0].x, 0, hero.z - tp[0].z).normalize()
  const ascPos = new THREE.CatmullRomCurve3(tp.map((p, i) => p.clone().addScaledVector(side, (tr[i] || 0.6) + 5.2).add(new THREE.Vector3(0, 0.4, 0))))
  const ascLook = new THREE.CatmullRomCurve3(tp.map((p, i) => tp[Math.min(tp.length - 1, i + 3)].clone().addScaledVector(side, 0.4).add(new THREE.Vector3(0, 1.2, 0))))

  // 3) Бұтақ бойымен ұшу: бұтақтың үстінде және сәл бүйірінде, алға қарап
  const fp = [], fl = []
  for (let i = 0; i <= 14; i++) {
    const u = (i / 14) * 0.82
    const c = branchCurve.getPointAt(u)
    const tan = branchCurve.getTangentAt(u)
    const sb = new THREE.Vector3().crossVectors(tan, UP).normalize()
    fp.push(c.clone().addScaledVector(UP, 1.05).addScaledVector(sb, 0.75))
    fl.push(branchCurve.getPointAt(Math.min(1, u + 0.09)).addScaledVector(UP, 0.55))
  }
  const flyPos = new THREE.CatmullRomCurve3(fp)
  const flyLook = new THREE.CatmullRomCurve3(fl)

  const P = new THREE.Vector3(), L = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3()
  const approachP = portal.clone().addScaledVector(endDir, -5).add(new THREE.Vector3(0, 0.2, 0))
  const beyondP = portal.clone().addScaledVector(endDir, 3.5)
  const beyondL = portal.clone().addScaledVector(endDir, 14).add(new THREE.Vector3(0, 1.2, 0))

  // q бойынша камера күйі (бас экран күйінен басталады)
  function sample(q, heroP, heroL, outP, outL) {
    if (q <= QT.ascA) {
      const e = sm(0, QT.ascA, q)
      outP.lerpVectors(heroP, ascPos.getPoint(0), e)
      outL.lerpVectors(heroL, ascLook.getPoint(0), e)
    } else if (q <= QT.ascB) {
      const u = sm(QT.ascA, QT.ascB, q)
      ascPos.getPoint(u, outP); ascLook.getPoint(u, outL)
    } else if (q <= QT.flyA) {
      const e = sm(QT.ascB, QT.flyA, q)
      ascPos.getPoint(1, A); flyPos.getPoint(0, B); outP.lerpVectors(A, B, e)
      ascLook.getPoint(1, A); flyLook.getPoint(0, B); outL.lerpVectors(A, B, e)
    } else if (q <= QT.flyB) {
      const u = (q - QT.flyA) / (QT.flyB - QT.flyA)
      flyPos.getPoint(u, outP); flyLook.getPoint(u, outL)
    } else {
      const e = sm(QT.flyB, QT.cross, q)
      flyPos.getPoint(1, A)
      if (e < 0.55) { outP.lerpVectors(A, approachP, e / 0.55); outL.copy(portal) }
      else { const k = (e - 0.55) / 0.45; outP.lerpVectors(approachP, beyondP, k); outL.lerpVectors(portal, beyondL, k) }
    }
    return outP
  }
  return { dest, node, portal, endDir, branchCurve, energyCurve, sample, P, L }
}

// Энергия импульсі: тамырдан → дің → бұтақ → портал (бұтақ бетіндегі жарық ағын)
export function LightPath({ U, S, J, color = '#00d9ff' }) {
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.TubeGeometry(J.energyCurve, 320, 0.2, 10, false)
    const c = new THREE.Color(color)
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { ...U, uReveal: { value: 0 }, uOp: { value: 0 }, uC: { value: c } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uTime; uniform float uReveal; uniform float uOp; uniform vec3 uC; varying vec2 vUv;
        void main(){
          float x = vUv.x;
          if (x > uReveal) discard;
          float head = smoothstep(0.06, 0.0, uReveal - x) * step(uReveal, 0.999);
          float flow = pow(fract(x*18.0 - uTime*0.9), 6.0);
          float chev = step(0.86, fract(x*50.0 - uTime*1.4)) * smoothstep(0.35, 0.0, abs(vUv.y - 0.5));
          vec3 c = uC*(0.45 + flow*1.8) + vec3(1.0,0.8,0.45)*chev*1.8 + vec3(0.6,0.95,1.0)*head*4.0;
          gl_FragColor = vec4(c*uOp, 1.0);
        }`,
    })
    return { geo, mat }
  }, [U, J, color])
  useFrame(() => {
    const q = S.current.q
    mat.uniforms.uReveal.value = sm(0.02, 0.55, q)
    mat.uniforms.uOp.value = sm(0.0, 0.06, q) * (1 - sm(0.86, 0.95, q))
  })
  return <mesh geometry={geo} material={mat} />
}

// Діңнің айналасында жоғары көтерілетін бөлшектер (көтерілу кезінде)
export function AscentSparks({ U, S, J, lite }) {
  const n = lite ? 300 : 1000
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(n * 3), rnd = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 4
      pos.set([Math.cos(a) * r, Math.random() * 18, Math.sin(a) * r], i * 3)
      rnd[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aR', new THREE.BufferAttribute(rnd, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { ...U, uOp: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `attribute float aR; uniform float uTime; uniform float uPx; varying float vR;
        void main(){ vec3 p = position; p.y = mod(p.y + uTime*(0.6 + aR*1.6), 18.0) + 1.0; vR = aR;
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (2.0 + aR*4.0)*uPx*(14.0/-mv.z); }`,
      fragmentShader: `uniform float uOp; varying float vR; void main(){ float d = length(gl_PointCoord-0.5);
          vec3 c = vR > 0.88 ? vec3(1.0,0.78,0.42)*2.2 : vec3(0.2,0.9,1.0)*2.0; gl_FragColor = vec4(c*smoothstep(0.5,0.0,d)*uOp, 1.0); }`,
    })
    return { geo: g, mat: m }
  }, [U, n])
  useFrame(() => { mat.uniforms.uOp.value = sm(0.05, 0.14, S.current.q) * (1 - sm(0.42, 0.55, S.current.q)) })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// Энергия порталы: айналатын голографиялық ободтар, оюлы алтын сақина, ішінде келесі бөлімнің бейнесі, бөлшектер, туннель сақиналары
export function Portal({ S, J, color = '#00d9ff', lite }) {
  const g = useRef()
  const rims = useRef([])
  const tunnel = useRef([])
  const orn = useMemo(() => portalTexture(), [])
  const glow = useMemo(() => glowTexture(), [])
  const land = useMemo(() => landscapeTexture(), [])
  const c1 = useMemo(() => new THREE.Color(color).multiplyScalar(2.4), [color])
  const gold = useMemo(() => new THREE.Color(2.8, 2.0, 1.0), [])
  // ортасы: «Шежіре» бейнесі, шеттері жұмсақ жарқырайды, жақындағанда ирис ашылады
  const surf = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uMap: { value: land }, uOp: { value: 0 }, uOpen: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D uMap; uniform float uOp; uniform float uOpen; uniform float uTime; varying vec2 vUv;
      void main(){
        vec2 c = vUv - 0.5; float r = length(c)*2.0;
        if (r < uOpen) discard;
        vec2 uv = vUv + c*0.04*sin(uTime*0.8 + r*8.0)*(1.0 - r);
        vec3 col = texture2D(uMap, uv).rgb;
        float rim = smoothstep(0.75, 1.0, r);
        col = mix(col, vec3(0.75, 0.95, 1.0), rim*0.6) + vec3(1.0,0.9,0.7)*smoothstep(uOpen + 0.12, uOpen, r)*step(0.001, uOpen);
        gl_FragColor = vec4(col, uOp * smoothstep(1.0, 0.92, r));
      }`,
  }), [land])
  const { pGeo, pMat } = useMemo(() => {
    const n = lite ? 260 : 900
    const pos = new Float32Array(n * 3), rnd = new Float32Array(n)
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; const r = 4.4 + (Math.random() - 0.5) * 1.6; pos.set([Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 1.5], i * 3); rnd[i] = Math.random() }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    pGeo.setAttribute('aR', new THREE.BufferAttribute(rnd, 1))
    const pMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uOp: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `attribute float aR; uniform float uTime; uniform float uPx; varying float vR;
        void main(){ float a = uTime*(0.2 + aR*0.5); mat2 m = mat2(cos(a), -sin(a), sin(a), cos(a)); vec3 p = position; p.xy = m*p.xy; vR = aR;
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (2.0 + aR*4.0)*uPx*(12.0/-mv.z); }`,
      fragmentShader: `uniform float uOp; varying float vR; void main(){ float d = length(gl_PointCoord-0.5);
          vec3 c = vR > 0.7 ? vec3(1.0,0.8,0.45)*2.4 : vec3(0.2,0.9,1.0)*2.2; gl_FragColor = vec4(c*smoothstep(0.5,0.0,d)*uOp, 1.0); }`,
    })
    return { pGeo, pMat }
  }, [lite])
  // туннель сақиналарының орындары: порталдың алдында, камера арқылы өтеді
  const tun = useMemo(() => Array.from({ length: 6 }, (_, i) => J.portal.clone().addScaledVector(J.endDir, -2 - i * 1.6)), [J])

  useFrame(({ clock }) => {
    const q = S.current.q
    const t = clock.elapsedTime
    const k = sm(0.36, 0.6, q)
    g.current.visible = k > 0.01
    g.current.position.copy(J.portal)
    g.current.lookAt(J.portal.clone().sub(J.endDir))
    g.current.scale.setScalar(0.55 + k * 0.45)
    surf.uniforms.uOp.value = sm(0.45, 0.7, q) * (1 - sm(0.97, 1.0, q))
    surf.uniforms.uOpen.value = sm(0.88, 0.97, q) * 1.05
    surf.uniforms.uTime.value = t
    pMat.uniforms.uTime.value = t
    pMat.uniforms.uOp.value = k * (1 - S.current.light * 0.7)
    rims.current.forEach((m, i) => {
      if (!m) return
      m.rotation.z = t * (0.25 + i * 0.18) * (i % 2 ? -1 : 1)
      m.rotation.x = Math.sin(t * 0.3 + i) * 0.12 * (i + 1)
      m.material.opacity = k * (0.75 + Math.sin(t * 2 + i) * 0.2)
    })
    const tk = sm(0.74, 0.84, q) * (1 - sm(0.96, 1.0, q))
    tunnel.current.forEach((m, i) => {
      if (!m) return
      m.visible = tk > 0.01
      m.position.copy(tun[i])
      m.lookAt(tun[i].clone().sub(J.endDir))
      m.rotation.z = t * 0.4 * (i % 2 ? 1 : -1)
      m.material.opacity = tk * (0.5 + 0.5 * Math.sin(t * 3 - i))
    })
  })
  return (
    <>
      <group ref={g}>
        <mesh material={surf}><circleGeometry args={[4.0, 96]} /></mesh>
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[3.95, 4.35, 128]} />
          <meshBasicMaterial map={orn} transparent opacity={0.95} depthWrite={false} color={gold} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {[4.2, 4.6, 5.0, 5.5].map((r, i) => (
          <mesh key={i} ref={(el) => (rims.current[i] = el)}>
            <torusGeometry args={[r, i === 0 ? 0.09 : 0.04, 10, 180, i === 3 ? Math.PI * 1.4 : Math.PI * 2]} />
            <meshBasicMaterial color={i % 2 ? gold : c1} transparent opacity={0} toneMapped={false} />
          </mesh>
        ))}
        <points geometry={pGeo} material={pMat} />
        <sprite scale={[16, 16, 1]}>
          <spriteMaterial map={glow} color={new THREE.Color(0.4, 1.2, 1.4)} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
      {tun.map((_, i) => (
        <mesh key={i} ref={(el) => (tunnel.current[i] = el)}>
          <torusGeometry args={[2.6 + i * 0.12, 0.03, 8, 120]} />
          <meshBasicMaterial color={i % 2 ? gold : c1} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}
