// DIGITAL TREE UNIVERSE 2040 — «Кәсіби шежіре» кіріспе сахнасы
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Tree } from '@dgreenheck/ez-tree'
import { Panels, Architecture, DataRain, Beams, EnergyRings, Floor } from './environment'
import { platformTexture, labelTexture, glowTexture } from './textures'
import { BRANCHES, ORDER } from '../branches'

const H = 16
const BASE_Y = 1.15 // платформа үсті
export const LITE = typeof window !== 'undefined' && (window.innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4)
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)
const NAVY = new THREE.Color('#031527')
const LIGHT = new THREE.Color('#f5f2ea')
const SECTIONS = ORDER.slice(1) // шежіре, тест, pick3, vr, ai, passport

// ---------------------------------------------------------------------------
// EZ-Tree + қаңқа (бұтақ осьтері, радиустары) + жапырақ нүктелері
class SkTree extends Tree {
  generate() { this.skeleton = []; this.leafPts = []; super.generate() }
  generateBranchIndices(off, b) {
    super.generateBranchIndices(off, b)
    const v = this.branches.verts
    const N = b.segmentCount + 1
    const pts = []
    const radii = []
    for (let r = 0; r <= b.sectionCount; r++) {
      const c = new THREE.Vector3()
      for (let k = 0; k < b.segmentCount; k++) { const i = (off + r * N + k) * 3; c.x += v[i]; c.y += v[i + 1]; c.z += v[i + 2] }
      c.divideScalar(b.segmentCount)
      const i0 = (off + r * N) * 3
      radii.push(Math.hypot(v[i0] - c.x, v[i0 + 1] - c.y, v[i0 + 2] - c.z))
      pts.push(c)
    }
    this.skeleton.push({ level: b.level, pts, radii })
  }
  generateLeaf(o, q) { this.leafPts?.push(o.clone()); super.generateLeaf(o, q) }
}

const FOG = `uniform vec3 uFogC; uniform float uFogD;
  vec3 applyFog(vec3 c, vec3 wp){ float d = length(wp - cameraPosition); return mix(c, uFogC, 1.0 - exp(-uFogD*uFogD*d*d)); }`

function useHoloTree(U) {
  return useMemo(() => {
    const t = new SkTree()
    t.loadPreset('Oak Large')
    t.options.seed = 2040
    t.generate()
    const box = new THREE.Box3().setFromObject(t)
    const s = H / (box.max.y - box.min.y)
    const dy = -box.min.y
    t.scale.setScalar(s)
    t.position.y = dy * s + BASE_Y - 0.3
    const toW = (p) => p.clone().add(new THREE.Vector3(0, dy, 0)).multiplyScalar(s).add(new THREE.Vector3(0, BASE_Y - 0.3, 0))
    const skeleton = t.skeleton.map((b) => ({ level: b.level, pts: b.pts.map(toW), radii: b.radii.map((r) => r * s) }))
    const leaves = t.leafPts.map(toW)

    // Голографиялық қабық: қараңғы металл + бойлық талшықтар + жоғары ағатын энергия + Френель жиегі
    const bark = new THREE.ShaderMaterial({
      uniforms: { ...U, uEnergy: { value: 0 }, uH: { value: H + BASE_Y } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vWP;
        void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform float uTime; uniform float uEnergy; uniform float uH; varying vec2 vUv; varying vec3 vN; varying vec3 vWP; ${FOG}
        float h1(float n){ return fract(sin(n)*43758.5453); }
        void main(){
          vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vWP);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
          float dif = 0.35 + 0.65*max(dot(N, normalize(vec3(0.2, 1.0, 0.35))), 0.0);
          vec3 base = vec3(0.02, 0.065, 0.11) * dif;
          float lane = floor(vUv.x*10.0);
          float fib = smoothstep(0.78, 1.0, abs(sin(vUv.x*6.2831*10.0 + vWP.y*0.45)));
          float flow = pow(fract(vWP.y*0.22 - uTime*0.55 + h1(lane)*0.8), 7.0);
          float front = uEnergy * uH * 1.12;
          float rev = 1.0 - smoothstep(front - 1.2, front + 0.3, vWP.y);
          float gold = step(0.95, h1(lane*7.0 + floor(vWP.y*0.4))) * flow;
          vec3 cyan = vec3(0.0, 0.85, 1.0), teal = vec3(0.1, 0.9, 0.82);
          vec3 col = base + (cyan*(0.22 + flow*2.6)*fib + teal*fres*1.4 + vec3(1.0,0.78,0.42)*gold*3.0) * rev;
          col += cyan * smoothstep(0.9, 0.0, abs(vWP.y - front)) * 2.2 * (1.0 - step(0.999, uEnergy));
          gl_FragColor = vec4(applyFog(col, vWP), 1.0);
        }`,
    })
    t.branchesMesh.material = bark

    // Кристалл жапырақтар: бастапқы текстураның альфасы + бірюза/көгілдір + сирек алтын жарқыл
    const leafMap = t.leavesMesh.material.map
    const leaf = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { ...U, uMap: { value: leafMap }, uCrown: { value: 0 }, uH: { value: H + BASE_Y } },
      vertexShader: `uniform float uTime; varying vec2 vUv; varying vec3 vWP;
        void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); wp.x += sin(uTime*1.3 + wp.y*0.5 + wp.z*0.3)*0.05; vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform sampler2D uMap; uniform float uCrown; uniform float uH; uniform float uTime; varying vec2 vUv; varying vec3 vWP; ${FOG}
        float h3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){
          vec4 t = texture2D(uMap, vUv); if (t.a < 0.45) discard;
          float front = mix(uH*0.32, uH*1.08, uCrown);
          float on = 1.0 - smoothstep(front - 1.6, front, vWP.y);
          if (on < 0.02) discard;
          float r = h3(floor(vWP*2.2));
          // қараңғы ішкі бөлік + жиектері жарық: бұтақ құрылымы жоғалмайды
          float edge = smoothstep(0.2, 0.0, abs(t.a - 0.55));
          vec3 c = mix(vec3(0.03,0.32,0.36), vec3(0.0,0.45,0.62), r) * (0.45 + 0.5*t.g) + vec3(0.2,0.95,1.0)*edge*0.5;
          float tw = step(0.975, r) * (0.55 + 0.45*sin(uTime*3.0 + r*40.0));
          c = mix(c, vec3(1.0,0.78,0.42)*2.4, tw);
          c *= (1.0 + 2.2*smoothstep(1.6, 0.0, front - vWP.y)*(1.0 - uCrown));
          gl_FragColor = vec4(applyFog(c*on, vWP), 0.9);
        }`,
    })
    t.leavesMesh.material = leaf

    // 6 бөлім түйіні — тәждегі 1-деңгей бұтақтардың ұштары, бұрыш бойынша біркелкі
    const tips = skeleton.filter((b) => b.level === 1).map((b) => b.pts[b.pts.length - 1]).filter((p) => p.y > H * 0.55)
    tips.sort((a, b) => Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z))
    const nodes = SECTIONS.map((_, i) => tips[Math.floor(((i + 0.5) / SECTIONS.length) * tips.length)] || new THREE.Vector3(Math.sin(i) * 5, H * 0.8, Math.cos(i) * 5))
    // камера жақтан көрінуі үшін «Шежіре» түйінін алдыңғы жаққа жақын таңдаймыз
    nodes.sort((a, b) => b.z - a.z)
    return { tree: t, bark, leaf, skeleton, leaves, nodes }
  }, [U])
}

// Діңді орайтын оптоволокно талшықтары (TubeGeometry) — энергия түбінен жоғары ағады
function TrunkFibers({ U, skeleton, S }) {
  const { geo, mat } = useMemo(() => {
    const trunk = skeleton.find((b) => b.level === 0)
    const lvl1 = skeleton.filter((b) => b.level === 1).slice(0, 10)
    const geos = []
    const make = (b, count, twist) => {
      for (let k = 0; k < count; k++) {
        const a0 = (k / count) * Math.PI * 2
        const pts = b.pts.map((p, i) => {
          const a = a0 + i * twist
          const r = (b.radii[i] || 0.3) * 1.04
          return new THREE.Vector3(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r)
        })
        if (pts.length > 2) geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.028, 4, false))
      }
    }
    if (trunk) make(trunk, LITE ? 8 : 16, 0.32)
    lvl1.forEach((b) => make(b, LITE ? 2 : 3, 0.5))
    // бір геометрияға біріктіреміз (draw call азайту)
    const merged = new THREE.BufferGeometry()
    let total = 0, idx = 0
    geos.forEach((g) => { total += g.attributes.position.count; idx += g.index.count })
    const pos = new Float32Array(total * 3), uv = new Float32Array(total * 2), ind = new Uint32Array(idx), seed = new Float32Array(total)
    let vo = 0, io = 0
    geos.forEach((g, gi) => {
      pos.set(g.attributes.position.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2)
      seed.fill(gi * 0.37 % 1, vo, vo + g.attributes.position.count)
      for (let i = 0; i < g.index.count; i++) ind[io + i] = g.index.array[i] + vo
      vo += g.attributes.position.count; io += g.index.count; g.dispose()
    })
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    merged.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    merged.setIndex(new THREE.BufferAttribute(ind, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { ...U, uEnergy: { value: 0 }, uH: { value: H + BASE_Y } },
      vertexShader: `attribute float aSeed; varying vec2 vUv; varying float vS; varying vec3 vWP;
        void main(){ vUv = uv; vS = aSeed; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform float uTime; uniform float uEnergy; uniform float uH; varying vec2 vUv; varying float vS; varying vec3 vWP; ${FOG}
        void main(){
          float front = uEnergy*uH*1.12;
          float on = 1.0 - smoothstep(front - 0.8, front + 0.2, vWP.y);
          float pulse = pow(fract(vUv.x*2.5 - uTime*0.7 + vS), 10.0);
          vec3 c = mix(vec3(0.0,0.6,1.0), vec3(0.0,0.95,1.0), pulse) * (0.55 + pulse*3.0);
          c = mix(c, vec3(1.0,0.78,0.42)*3.0, step(0.93, vS) * pulse);
          gl_FragColor = vec4(applyFog(c, vWP) * on, 1.0);
        }`,
    })
    return { geo: merged, mat: m }
  }, [U, skeleton])
  useFrame(() => { mat.uniforms.uEnergy.value = S.current.trunk })
  return <mesh geometry={geo} material={mat} />
}

// Бұтақ осьтері бойымен жүгіретін нейрон-импульстер
function BranchPulses({ U, skeleton, S }) {
  const { geo, mat } = useMemo(() => {
    const pos = [], depth = []
    skeleton.forEach((b) => {
      const n = b.pts.length - 1
      for (let i = 0; i < n; i++) {
        pos.push(...b.pts[i].toArray(), ...b.pts[i + 1].toArray())
        depth.push((b.level + i / n) / 4, (b.level + (i + 1) / n) / 4)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aD', new THREE.Float32BufferAttribute(depth, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { ...U, uReveal: { value: 0 } },
      vertexShader: 'attribute float aD; varying float vD; varying vec3 vWP; void main(){ vD = aD; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }',
      fragmentShader: `uniform float uTime; uniform float uReveal; varying float vD; varying vec3 vWP; ${FOG}
        void main(){
          float on = smoothstep(vD, vD + 0.05, uReveal*1.1);
          float p = pow(fract(vD*5.0 - uTime*0.5), 12.0);
          vec3 c = vec3(0.0,0.85,1.0) * (0.35 + p*3.0) * on;
          gl_FragColor = vec4(applyFog(c, vWP), 1.0);
        }`,
    })
    return { geo: g, mat: m }
  }, [U, skeleton])
  useFrame(() => { mat.uniforms.uReveal.value = Math.min(1, S.current.trunk * 0.3 + S.current.crown * 0.8) })
  return <lineSegments geometry={geo} material={mat} />
}

// Жапырақ бөлшектері — тәжде жылтылдайды
function CrownSparks({ U, leaves, S }) {
  const { geo, mat } = useMemo(() => {
    const max = LITE ? 900 : 3000
    const step = Math.max(1, Math.ceil(leaves.length / max))
    const pos = [], rnd = []
    for (let i = 0; i < leaves.length; i += step) { pos.push(leaves[i].x, leaves[i].y, leaves[i].z); rnd.push(Math.random()) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aR', new THREE.Float32BufferAttribute(rnd, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { ...U, uOn: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `attribute float aR; uniform float uTime; uniform float uPx; uniform float uOn; varying float vR; varying float vA;
        void main(){ vec3 p = position; p.y += sin(uTime + aR*30.0)*0.08; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
          vA = uOn * (0.4 + 0.6*sin(uTime*2.0 + aR*50.0)); gl_PointSize = (2.0 + aR*4.0) * uPx * (16.0 / -mv.z); vR = aR; }`,
      fragmentShader: `varying float vR; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * max(vA, 0.0);
          vec3 c = vR > 0.9 ? vec3(1.0,0.78,0.42)*2.5 : vec3(0.3,0.95,1.0)*2.0; gl_FragColor = vec4(c*a, 1.0); }`,
    })
    return { geo: g, mat: m }
  }, [U, leaves])
  useFrame(() => { mat.uniforms.uOn.value = S.current.crown * (1 - S.current.light) })
  return <points geometry={geo} material={mat} />
}

// 3. Технологиялық платформа: деңгейлер, гравировка, жарық жолдары, энергия ядросы
function Platform({ U, S }) {
  const engr = useMemo(() => platformTexture(), [])
  const wave = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { ...U, uMap: { value: engr }, uP: { value: 0 }, uWave: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec2 vP; void main(){ vUv = uv; vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D uMap; uniform float uP; uniform float uWave; uniform float uTime; varying vec2 vUv; varying vec2 vP;
      void main(){
        float r = length(vP);
        vec4 t = texture2D(uMap, vUv);
        float w = smoothstep(0.9, 0.0, abs(r - uWave*10.0)) * (1.0 - uWave*0.6);
        float flow = pow(fract(r*0.35 - uTime*0.45), 14.0);
        vec3 c = t.rgb * t.a * (0.9 + flow*2.5) * uP + vec3(0.2,0.9,1.0)*w*3.0;
        gl_FragColor = vec4(c, 1.0);
      }`,
  }), [U, engr])
  const glow = useMemo(() => glowTexture(), [])
  const core = useRef()
  const light = useRef()
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 2.2, 2.8), toneMapped: false, transparent: true, opacity: 0 }), [])
  const goldMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.1), toneMapped: false, transparent: true, opacity: 0 }), [])
  useFrame(({ clock }) => {
    const p = S.current.platform * (1 - S.current.light)
    wave.uniforms.uP.value = p
    wave.uniforms.uWave.value = S.current.wave
    lineMat.opacity = p
    goldMat.opacity = p
    const k = 0.8 + Math.sin(clock.elapsedTime * 2.2) * 0.2
    if (core.current) core.current.material.opacity = p * k
    if (light.current) light.current.intensity = p * 18 * k
  })
  const metal = <meshStandardMaterial color="#0a1a2b" metalness={0.92} roughness={0.22} />
  return (
    <group>
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow><cylinderGeometry args={[8.6, 9.1, 0.6, 96]} />{metal}</mesh>
      <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[6.2, 6.6, 0.36, 96]} />{metal}</mesh>
      <mesh position={[0, 1.04, 0]}><cylinderGeometry args={[4.2, 4.4, 0.2, 96]} /><meshStandardMaterial color="#0d2236" metalness={0.6} roughness={0.08} transparent opacity={0.85} /></mesh>
      <mesh position={[0, 0.605, 0]} rotation={[-Math.PI / 2, 0, 0]} material={wave}><circleGeometry args={[8.6, 96]} /></mesh>
      {[[9.1, 0.02], [8.6, 0.61], [6.6, 0.6], [6.2, 0.965], [4.4, 0.94], [4.2, 1.145]].map(([r, y], i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lineMat}><ringGeometry args={[r - 0.05, r, 128]} /></mesh>
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        return <mesh key={i} position={[Math.sin(a) * 8.85, 0.45, Math.cos(a) * 8.85]} rotation={[0, a, 0]} material={i % 4 ? lineMat : goldMat}><boxGeometry args={[0.5, 0.06, 0.06]} /></mesh>
      })}
      <sprite ref={core} position={[0, 1.6, 0]} scale={[6, 6, 1]}>
        <spriteMaterial map={glow} color={new THREE.Color(0.2, 1.4, 1.8)} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 2, 0]} color="#19e6d2" intensity={0} distance={16} decay={1.6} />
    </group>
  )
}

// 6. Бөлім түйіндері: бұтақ ұшындағы жарық + жазу, басқанда бөлімге өту
function SectionNodes({ nodes, S, onNavigate }) {
  const glow = useMemo(() => glowTexture(), [])
  const items = useMemo(() => SECTIONS.map((id, i) => {
    const b = BRANCHES[id]
    return { id, i, b, pos: nodes[i], label: labelTexture(b.label, b.c1), col: new THREE.Color(b.c1).multiplyScalar(2.4) }
  }), [nodes])
  const refs = useRef([])
  const [hover, setHover] = useState(-1)
  useFrame(({ clock }) => {
    items.forEach((it, i) => {
      const g = refs.current[i]
      if (!g) return
      const k = Math.max(S.current.nodes[i], hover === i ? 1 : 0) * (1 - S.current.light)
      const pulse = 1 + Math.sin(clock.elapsedTime * 3 + i) * 0.12
      g.children[0].material.opacity = k
      g.children[0].scale.setScalar((1.6 + k * 1.4) * pulse)
      g.children[1].material.opacity = k
      g.children[2].material.opacity = Math.min(1, k * 1.2)
    })
  })
  return items.map((it, i) => (
    <group key={it.id} ref={(el) => (refs.current[i] = el)} position={it.pos}>
      <sprite renderOrder={9}>
        <spriteMaterial map={glow} color={it.col} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
      <mesh>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color={it.col} toneMapped={false} transparent opacity={0} />
      </mesh>
      <sprite position={[0, 1.1, 0]} scale={[3.2, 0.8, 1]} renderOrder={10}>
        <spriteMaterial map={it.label} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
      <mesh
        visible={false}
        onClick={(e) => { e.stopPropagation(); onNavigate?.(i + 1) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(i); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(-1); document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[1.1, 8, 8]} />
      </mesh>
    </group>
  ))
}

// Сандық портал — белсенді бұтақта бөлшектер шеңбері
function Portal({ node, S }) {
  const g = useRef()
  const { geo, mat } = useMemo(() => {
    const n = LITE ? 220 : 600
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = 1 + (Math.random() - 0.5) * 0.18
      pos.set([Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.3], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({ color: new THREE.Color(0.6, 2.2, 1.6), size: 0.09, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    return { geo, mat }
  }, [])
  useFrame(({ camera, clock }) => {
    const k = S.current.portal
    g.current.visible = k > 0.01
    g.current.position.copy(node)
    g.current.lookAt(camera.position)
    g.current.rotateZ(clock.elapsedTime * 0.6)
    g.current.scale.setScalar(0.3 + k * 2.4)
    mat.opacity = Math.min(1, k * 1.5) * (1 - S.current.light * 0.8)
  })
  return (
    <group ref={g}>
      <points geometry={geo} material={mat} />
      <mesh>
        <torusGeometry args={[1, 0.02, 8, 96]} />
        <meshBasicMaterial color={new THREE.Color(0.4, 2.6, 2.0)} toneMapped={false} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

// 5. Камера: кілттік кадрлар уақыт бойынша (0–15–30–50–70–100%)
function CameraRig({ S, node }) {
  const { camera, size } = useThree()
  const keys = useMemo(() => {
    const n = node.clone()
    const out = n.clone().setY(0).normalize()
    const aspectPush = size.width < 760 ? 0.95 : 1
    return [
      { t: 0.0, pos: new THREE.Vector3(0, 6.5, 38 * aspectPush), look: new THREE.Vector3(0, 5.6, 0) },
      { t: 0.15, pos: new THREE.Vector3(6, 6.5, 21 * aspectPush), look: new THREE.Vector3(0, 8, 0) },
      { t: 0.3, pos: new THREE.Vector3(10.5, 9.5, 8), look: new THREE.Vector3(0, 12, 0) },
      { t: 0.5, pos: new THREE.Vector3(5.5, H + 4, 10), look: new THREE.Vector3(0, H * 0.82, 0) },
      { t: 0.62, pos: n.clone().add(out.clone().multiplyScalar(5)).add(new THREE.Vector3(0, 0.8, 0)), look: n.clone() },
      { t: 0.72, pos: n.clone().add(out.clone().multiplyScalar(0.6)), look: n.clone().add(out.clone().multiplyScalar(-6)) },
      { t: 1.0, pos: n.clone().add(out.clone().multiplyScalar(-4)).add(new THREE.Vector3(0, 2, 0)), look: n.clone().add(out.clone().multiplyScalar(-14)).add(new THREE.Vector3(0, 3, 0)) },
    ]
  }, [node, size.width])
  const curves = useMemo(() => ({
    pos: new THREE.CatmullRomCurve3(keys.map((k) => k.pos)),
    look: new THREE.CatmullRomCurve3(keys.map((k) => k.look)),
  }), [keys])
  const tmpP = useMemo(() => new THREE.Vector3(), [])
  const tmpL = useMemo(() => new THREE.Vector3(), [])
  const start = useMemo(() => ({ pos: new THREE.Vector3(0, 4, 20), look: new THREE.Vector3(0, 5, 0) }), [])
  useFrame(() => {
    const p = THREE.MathUtils.clamp(S.current.p, 0, 1)
    let i = 0
    while (i < keys.length - 2 && p > keys[i + 1].t) i++
    const u = (i + (p - keys[i].t) / (keys[i + 1].t - keys[i].t)) / (keys.length - 1)
    curves.pos.getPoint(THREE.MathUtils.clamp(u, 0, 1), tmpP)
    curves.look.getPoint(THREE.MathUtils.clamp(u, 0, 1), tmpL)
    if (REDUCED) { tmpP.copy(keys[0].pos); tmpL.copy(keys[0].look) }
    const pull = S.current.pull
    if (pull < 1) { tmpP.lerpVectors(start.pos, tmpP, pull); tmpL.lerpVectors(start.look, tmpL, pull) }
    camera.position.copy(tmpP)
    camera.lookAt(tmpL)
    if (import.meta.env.DEV) window.__intro = { p, pull }
  })
  return null
}

// Сахнаның жалпы күйі: айналдыру + оянудан фондағы түстер мен тұман
function Director({ U, S, A, progress, tree }) {
  const { scene } = useThree()
  useFrame(({ clock }) => {
    const s = S.current
    const p = progress.get()
    s.p = p
    s.platform = A.current.platform
    s.wave = A.current.wave
    s.trunk = A.current.trunk
    s.crown = A.current.crown
    s.world = A.current.world
    s.pull = A.current.pull
    s.nodes = SECTIONS.map((_, i) => ss(0.3 + i * 0.03, 0.34 + i * 0.03, p) * A.current.world)
    s.portal = ss(0.5, 0.64, p) * (1 - ss(0.74, 0.8, p))
    s.light = ss(0.6, 0.8, p)
    U.uTime.value = clock.elapsedTime
    scene.background.copy(NAVY).lerp(LIGHT, s.light)
    U.uFogC.value.copy(scene.background)
    scene.fog.color.copy(scene.background)
    U.uFogD.value = THREE.MathUtils.lerp(0.022, 0.05, s.light)
    tree.bark.uniforms.uEnergy.value = s.trunk
    tree.leaf.uniforms.uCrown.value = s.crown
    tree.tree.update(clock.elapsedTime)
  })
  return null
}

function Universe({ A, progress, onNavigate, onReady }) {
  const U = useMemo(() => ({ uTime: { value: 0 }, uFogC: { value: NAVY.clone() }, uFogD: { value: 0.022 } }), [])
  const S = useRef({ p: 0, platform: 0, wave: 0, trunk: 0, crown: 0, world: 0, pull: 0, light: 0, portal: 0, nodes: SECTIONS.map(() => 0) })
  const T = useHoloTree(U)
  useEffect(() => { onReady?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <color attach="background" args={['#031527']} />
      <fog attach="fog" args={['#031527', 30, 120]} />
      <ambientLight intensity={0.15} color="#5aa8ff" />
      <directionalLight position={[2, 30, 6]} intensity={1.4} color="#7fc4ff" castShadow={!LITE} shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-8, 10, -18]} intensity={1.1} color="#19e6d2" />
      <pointLight position={[6, H * 0.85, 4]} color="#ffc76a" intensity={6} distance={12} />
      <pointLight position={[-5, H * 0.7, -3]} color="#ffc76a" intensity={4} distance={10} />
      <Director U={U} S={S} A={A} progress={progress} tree={T} />
      <primitive object={T.tree} />
      <TrunkFibers U={U} skeleton={T.skeleton} S={S} />
      <BranchPulses U={U} skeleton={T.skeleton} S={S} />
      <CrownSparks U={U} leaves={T.leaves} S={S} />
      <Platform U={U} S={S} />
      <SectionNodes nodes={T.nodes} S={S} onNavigate={onNavigate} />
      <Portal node={T.nodes[0]} S={S} />
      <EnergyRings S={S} />
      <Panels U={U} S={S} lite={LITE} />
      <Architecture U={U} S={S} lite={LITE} />
      <DataRain U={U} S={S} lite={LITE} />
      <Beams U={U} S={S} />
      <Floor U={U} S={S} lite={LITE} />
      <CameraRig S={S} node={T.nodes[0]} />
    </>
  )
}

export default function TreeScene({ A, progress, onNavigate, onReady }) {
  return (
    <Canvas
      shadows={!LITE}
      dpr={[1, LITE ? 1.2 : 1.6]}
      camera={{ position: [0, 4, 20], fov: LITE ? 62 : 45, near: 0.1, far: 300 }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      <Universe A={A} progress={progress} onNavigate={onNavigate} onReady={onReady} />
      {!LITE && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.7} luminanceSmoothing={0.25} intensity={1.15} radius={0.7} />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
