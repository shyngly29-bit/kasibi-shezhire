// REAL TREE → DIGITAL UNIVERSE — «Кәсіби шежіре» кіріспе сахнасы (бір үздіксіз 3D-сахна)
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Tree } from '@dgreenheck/ez-tree'
import {
  NOISE, FOG, SkyDome, Hills, Meadow, Grass, RisingParticles,
  Panels, Architecture, Arches, DataStreams, DataRain, DataNodes, Beams, EnergyRings, TechFloor,
} from './environment'
import { platformTexture, labelTexture, glowTexture } from './textures'
import { BRANCHES, ORDER } from '../branches'

const H = 16
const GROUND = 0.84 // шалғын деңгейі
export const LITE = typeof window !== 'undefined' && (window.innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4)
const MOBILE = typeof window !== 'undefined' && window.innerWidth < 760
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)
const SECTIONS = ORDER.slice(1)
const C = (h) => new THREE.Color(h)

// Еріту функциясы: табиғи және голографиялық қабаттар бір шуды пайдаланады (түбінен жоғары қарай)
const DN = `float dN(vec3 wp){ return n3(wp*0.9)*0.6 + clamp((wp.y - ${GROUND.toFixed(2)})/16.5, 0.0, 1.0)*0.4; }`

// ---------------------------------------------------------------------------
class SkTree extends Tree {
  generate() { this.skeleton = []; this.leafPts = []; super.generate() }
  generateBranchIndices(off, b) {
    super.generateBranchIndices(off, b)
    const v = this.branches.verts
    const N = b.segmentCount + 1
    const pts = [], radii = []
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

// Табиғи PBR-материалды кеңейту: жел, еріту (табиғи қабат жоғалады), қабықтағы энергия тамырлары, суық реңк
function patchNature(mat, key, U, vein) {
  mat.userData.u = U
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U)
    sh.vertexShader = 'uniform float uTime; varying vec3 vWP2;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${key === 'leaf' ? 'vec4 wq = modelMatrix*vec4(transformed,1.0); transformed.x += sin(uTime*1.3 + wq.y*0.5 + wq.z*0.3)*0.09;' : ''}`)
      .replace('#include <project_vertex>', '#include <project_vertex>\n vWP2 = (modelMatrix*vec4(transformed,1.0)).xyz;')
    sh.fragmentShader = `uniform float uTime; uniform float uDis; uniform float uEnergy; uniform float uCool; varying vec3 vWP2; ${NOISE} ${DN}\n` + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float dd = dN(vWP2); if (uDis > 0.001 && dd < uDis) discard;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float edge = uDis > 0.001 ? smoothstep(uDis + 0.07, uDis, dd) : 0.0;
        float front = uEnergy * ${(H * 1.12).toFixed(2)};
        float below = 1.0 - smoothstep(front - 1.0, front + 0.3, vWP2.y);
        float v1 = smoothstep(0.03, 0.0, abs(n3(vWP2*vec3(2.4, 0.6, 2.4) + vec3(0.0, -uTime*0.35, 0.0)) - 0.5));
        float v2 = step(0.986, n3(vWP2*3.2 + vec3(0.0, -uTime*0.6, 0.0)));
        vec3 glow = (vec3(0.0, 0.85, 1.0)*v1*2.0 + vec3(1.0, 0.78, 0.42)*v2*2.2) * below * ${vein.toFixed(2)};
        glow += vec3(0.0, 0.9, 1.0) * smoothstep(0.8, 0.0, abs(vWP2.y - front)) * 0.9 * step(0.01, uEnergy) * (1.0 - step(0.999, uEnergy)) * ${vein.toFixed(2)};
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb*vec3(0.5, 0.72, 1.0), uCool) + glow + vec3(0.0, 0.9, 1.0)*edge*2.5;`)
  }
  mat.customProgramCacheKey = () => 'nature-' + key
  mat.needsUpdate = true
}

function useTrees(U) {
  return useMemo(() => {
    const t = new SkTree()
    t.loadPreset('Oak Large')
    t.options.seed = 2040
    t.generate()
    const box = new THREE.Box3().setFromObject(t)
    const s = H / (box.max.y - box.min.y)
    const dy = -box.min.y
    t.scale.setScalar(s)
    t.position.y = dy * s + GROUND
    const toW = (p) => p.clone().add(new THREE.Vector3(0, dy, 0)).multiplyScalar(s).add(new THREE.Vector3(0, GROUND, 0))
    const skeleton = t.skeleton.map((b) => ({ level: b.level, pts: b.pts.map(toW), radii: b.radii.map((r) => r * s) }))
    const leaves = t.leafPts.map(toW)

    // 1) Табиғи ағаш: PBR қабық (түс, нормаль, AO, кедір-бұдырлық) + жапырақтар
    const ob = t.branchesMesh.material
    const bark = new THREE.MeshStandardMaterial({ map: ob.map, normalMap: ob.normalMap, aoMap: ob.aoMap, roughnessMap: ob.roughnessMap, color: ob.color, roughness: 0.95, metalness: 0, normalScale: new THREE.Vector2(1.4, 1.4) })
    patchNature(bark, 'bark', U, 1)
    t.branchesMesh.material = bark
    const ol = t.leavesMesh.material
    const leafN = new THREE.MeshStandardMaterial({ map: ol.map, color: ol.color, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75, metalness: 0 })
    patchNature(leafN, 'leaf', U, 0.35)
    t.leavesMesh.material = leafN
    t.branchesMesh.castShadow = t.leavesMesh.castShadow = !LITE
    t.branchesMesh.receiveShadow = !LITE

    // 2) Голографиялық ағаш — сол геометрия, табиғи қабат еріген жерде пайда болады
    const holoBark = new THREE.ShaderMaterial({
      uniforms: { ...U },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vWP;
        void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform float uTime; uniform float uDis; varying vec2 vUv; varying vec3 vN; varying vec3 vWP; ${NOISE} ${DN} ${FOG}
        void main(){
          float dd = dN(vWP); if (dd >= uDis) discard;
          vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vWP);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);
          float dif = 0.4 + 0.6*max(dot(N, normalize(vec3(0.2, 1.0, 0.35))), 0.0);
          float lane = floor(vUv.x*10.0);
          float fib = smoothstep(0.78, 1.0, abs(sin(vUv.x*6.2831*10.0 + vWP.y*0.45)));
          float mesh = smoothstep(0.92, 1.0, abs(sin(vWP.y*5.0))) * 0.6;
          float flow = pow(fract(vWP.y*0.22 - uTime*0.55 + h1(lane)*0.8), 7.0);
          float gold = step(0.95, h1(lane*7.0 + floor(vWP.y*0.4))) * flow;
          vec3 col = vec3(0.02, 0.07, 0.12)*dif + vec3(0.0, 0.85, 1.0)*(0.25 + flow*2.6)*(fib + mesh) + vec3(0.1, 0.9, 0.82)*fres*1.5 + vec3(1.0,0.78,0.42)*gold*3.0;
          col += vec3(0.0, 0.95, 1.0) * smoothstep(uDis - 0.06, uDis, dd) * 2.5;
          gl_FragColor = vec4(applyFog(col, vWP), 1.0);
        }`,
    })
    const holoLeaf = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { ...U, uMap: { value: ol.map } },
      vertexShader: `uniform float uTime; varying vec2 vUv; varying vec3 vWP;
        void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); wp.x += sin(uTime*1.3 + wp.y*0.5 + wp.z*0.3)*0.05; vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform sampler2D uMap; uniform float uTime; uniform float uDis; varying vec2 vUv; varying vec3 vWP; ${NOISE} ${DN} ${FOG}
        void main(){
          vec4 t = texture2D(uMap, vUv); if (t.a < 0.45) discard;
          float dd = dN(vWP); if (dd >= uDis) discard;
          float r = h3(floor(vWP*2.2));
          float edge = smoothstep(0.2, 0.0, abs(t.a - 0.55));
          vec3 c = mix(vec3(0.03,0.32,0.38), vec3(0.0,0.45,0.68), r) * (0.5 + 0.55*t.g) + vec3(0.2,0.95,1.0)*edge*0.6;
          float tw = step(0.975, r) * (0.55 + 0.45*sin(uTime*3.0 + r*40.0));
          c = mix(c, vec3(1.0,0.78,0.42)*2.4, tw);
          c += vec3(0.0,0.95,1.0) * smoothstep(uDis - 0.06, uDis, dd) * 2.0;
          gl_FragColor = vec4(applyFog(c, vWP), 0.92);
        }`,
    })
    const hb = new THREE.Mesh(t.branchesMesh.geometry, holoBark)
    const hl = new THREE.Mesh(t.leavesMesh.geometry, holoLeaf)
    t.add(hb, hl)

    // Бөлім түйіндері — тәждегі 1-деңгей бұтақ ұштары
    const tips = skeleton.filter((b) => b.level === 1).map((b) => b.pts[b.pts.length - 1]).filter((p) => p.y > H * 0.55)
    tips.sort((a, b) => Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z))
    const nodes = SECTIONS.map((_, i) => tips[Math.floor(((i + 0.5) / SECTIONS.length) * tips.length)] || new THREE.Vector3(Math.sin(i) * 5, H * 0.8, Math.cos(i) * 5))
    return { tree: t, skeleton, leaves, nodes }
  }, [U])
}

// Діңді орайтын энергия талшықтары (оптоволокно) — энергия тамырдан жоғары көтеріледі
function TrunkFibers({ U, skeleton }) {
  const { geo, mat } = useMemo(() => {
    const trunk = skeleton.find((b) => b.level === 0)
    const lvl1 = skeleton.filter((b) => b.level === 1).slice(0, 12)
    const geos = []
    const make = (b, count, twist) => {
      for (let k = 0; k < count; k++) {
        const a0 = (k / count) * Math.PI * 2
        const pts = b.pts.map((p, i) => {
          const a = a0 + i * twist
          const r = (b.radii[i] || 0.3) * 1.04
          return new THREE.Vector3(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r)
        })
        if (pts.length > 2) geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.03, 4, false))
      }
    }
    if (trunk) make(trunk, LITE ? 8 : 16, 0.32)
    lvl1.forEach((b) => make(b, LITE ? 2 : 3, 0.5))
    let total = 0, idx = 0
    geos.forEach((g) => { total += g.attributes.position.count; idx += g.index.count })
    const pos = new Float32Array(total * 3), uv = new Float32Array(total * 2), ind = new Uint32Array(idx), seed = new Float32Array(total)
    let vo = 0, io = 0
    geos.forEach((g, gi) => {
      pos.set(g.attributes.position.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2)
      seed.fill((gi * 0.37) % 1, vo, vo + g.attributes.position.count)
      for (let i = 0; i < g.index.count; i++) ind[io + i] = g.index.array[i] + vo
      vo += g.attributes.position.count; io += g.index.count; g.dispose()
    })
    const merged = new THREE.BufferGeometry()
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    merged.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    merged.setIndex(new THREE.BufferAttribute(ind, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { ...U },
      vertexShader: `attribute float aSeed; varying vec2 vUv; varying float vS; varying vec3 vWP;
        void main(){ vUv = uv; vS = aSeed; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform float uTime; uniform float uEnergy; varying vec2 vUv; varying float vS; varying vec3 vWP; ${FOG}
        void main(){
          float front = uEnergy*${(H * 1.12).toFixed(2)};
          float on = 1.0 - smoothstep(front - 0.8, front + 0.2, vWP.y);
          float pulse = pow(fract(vUv.x*2.5 - uTime*0.7 + vS), 10.0);
          vec3 c = mix(vec3(0.0,0.6,1.0), vec3(0.0,0.95,1.0), pulse) * (0.5 + pulse*3.0);
          c = mix(c, vec3(1.0,0.78,0.42)*3.0, step(0.93, vS) * pulse);
          gl_FragColor = vec4(applyFog(c, vWP) * on, 1.0);
        }`,
    })
    return { geo: merged, mat: m }
  }, [U, skeleton])
  return <mesh geometry={geo} material={mat} />
}

// Бұтақ осьтері бойымен жүгіретін импульстер (цифрлық фазада)
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
        void main(){ float on = smoothstep(vD, vD + 0.05, uReveal*1.1); float p = pow(fract(vD*5.0 - uTime*0.5), 12.0);
          gl_FragColor = vec4(applyFog(vec3(0.0,0.85,1.0)*(0.3 + p*3.0)*on, vWP), 1.0); }`,
    })
    return { geo: g, mat: m }
  }, [U, skeleton])
  useFrame(() => { mat.uniforms.uReveal.value = S.current.dis })
  return <lineSegments geometry={geo} material={mat} />
}

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
          vA = uOn*(0.4 + 0.6*sin(uTime*2.0 + aR*50.0)); gl_PointSize = (2.0 + aR*4.0)*uPx*(16.0/-mv.z); vR = aR; }`,
      fragmentShader: `varying float vR; varying float vA;
        void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*max(vA,0.0);
          vec3 c = vR > 0.9 ? vec3(1.0,0.78,0.42)*2.5 : vec3(0.3,0.95,1.0)*2.0; gl_FragColor = vec4(c*a, 1.0); }`,
    })
    return { geo: g, mat: m }
  }, [U, leaves])
  useFrame(() => { mat.uniforms.uOn.value = Math.max(S.current.energy * 0.45, S.current.dis) })
  return <points geometry={geo} material={mat} />
}

// Технологиялық платформа — табиғат еріген кезде жерден көтеріледі
function Platform({ U, S }) {
  const g = useRef()
  const engr = useMemo(() => platformTexture(), [])
  const wave = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { ...U, uMap: { value: engr }, uP: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec2 vP; void main(){ vUv = uv; vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D uMap; uniform float uP; uniform float uTime; varying vec2 vUv; varying vec2 vP;
      void main(){ float r = length(vP); vec4 t = texture2D(uMap, vUv);
        float flow = pow(fract(r*0.35 - uTime*0.45), 14.0);
        float core = pow(fract(-r*0.2 + uTime*0.6), 20.0) * smoothstep(9.0, 1.0, r);
        vec3 c = t.rgb*t.a*(0.9 + flow*2.5)*uP + vec3(0.2,0.9,1.0)*core*2.0*uP;
        gl_FragColor = vec4(c, 1.0); }`,
  }), [U, engr])
  const glow = useMemo(() => glowTexture(), [])
  const core = useRef()
  const light = useRef()
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 2.2, 2.8), toneMapped: false, transparent: true, opacity: 0 }), [])
  const goldMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.1), toneMapped: false, transparent: true, opacity: 0 }), [])
  useFrame(({ clock }) => {
    const r = S.current.rise
    g.current.position.y = -1.8 * (1 - r)
    g.current.visible = r > 0.01
    const p = S.current.world
    wave.uniforms.uP.value = p
    lineMat.opacity = p
    goldMat.opacity = p
    const k = 0.8 + Math.sin(clock.elapsedTime * 2.2) * 0.2
    if (core.current) core.current.material.opacity = p * k
    if (light.current) light.current.intensity = p * 6 * k
  })
  const metal = <meshStandardMaterial color="#0b1d30" metalness={0.92} roughness={0.22} />
  return (
    <group ref={g}>
      <mesh position={[0, 0.3, 0]} receiveShadow><cylinderGeometry args={[8.6, 9.1, 0.6, 96]} />{metal}</mesh>
      <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[6.2, 6.6, 0.36, 96]} />{metal}</mesh>
      <mesh position={[0, 1.04, 0]}><cylinderGeometry args={[4.2, 4.4, 0.2, 96]} /><meshStandardMaterial color="#0e2740" metalness={0.6} roughness={0.08} /></mesh>
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
      <pointLight ref={light} position={[0, 2, 0]} color="#19e6d2" intensity={0} distance={14} decay={1.8} />
    </group>
  )
}

// Бөлім түйіндері: басқанда бұтақ жанады, камера түйінге жақындайды, бөлім ашылады
function SectionNodes({ nodes, S, onNavigate }) {
  const glow = useMemo(() => glowTexture(), [])
  const items = useMemo(() => SECTIONS.map((id, i) => {
    const b = BRANCHES[id]
    return { id, b, pos: nodes[i], label: labelTexture(b.label, b.c1), col: new THREE.Color(b.c1).multiplyScalar(2.4) }
  }), [nodes])
  const refs = useRef([])
  const [hover, setHover] = useState(-1)
  useFrame(({ clock }) => {
    items.forEach((it, i) => {
      const g = refs.current[i]
      if (!g) return
      const f = S.current.focus
      const k = Math.min(1.6, Math.max(S.current.nodes[i], hover === i ? 1 : 0) + (f && f.i === i ? 0.6 : 0))
      const pulse = 1 + Math.sin(clock.elapsedTime * 3 + i) * 0.12
      g.children[0].material.opacity = Math.min(1, k)
      g.children[0].scale.setScalar((1.6 + k * 1.4) * pulse)
      g.children[1].material.opacity = Math.min(1, k)
      g.children[2].material.opacity = Math.min(1, k * 1.2)
    })
  })
  return items.map((it, i) => (
    <group key={it.id} ref={(el) => (refs.current[i] = el)} position={it.pos}>
      <sprite renderOrder={9}><spriteMaterial map={glow} color={it.col} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} /></sprite>
      <mesh><sphereGeometry args={[0.22, 16, 16]} /><meshBasicMaterial color={it.col} toneMapped={false} transparent opacity={0} /></mesh>
      <sprite position={[0, 1.1, 0]} scale={[3.2, 0.8, 1]} renderOrder={10}><spriteMaterial map={it.label} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} /></sprite>
      <mesh
        visible={false}
        onClick={(e) => {
          e.stopPropagation()
          if (S.current.nodes[i] < 0.3 || S.current.focus) return
          S.current.focus = { i, pos: it.pos.clone(), t: performance.now() }
          setTimeout(() => { S.current.focus = null; onNavigate?.(i + 1) }, REDUCED ? 0 : 1000)
        }}
        onPointerOver={(e) => { if (S.current.nodes[i] < 0.3) return; e.stopPropagation(); setHover(i); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(-1); document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[1.1, 8, 8]} />
      </mesh>
    </group>
  ))
}

// Камера: табиғат (алдынан, төменгі ракурс) → дің → тәж → әлем → соңғы кадр (ағаш сол жақта)
function CameraRig({ S }) {
  const { camera, size } = useThree()
  const keys = useMemo(() => {
    const m = size.width < 760
    const V = (x, y, z) => new THREE.Vector3(x, y, z)
    return [
      { t: 0.0, pos: V(0, 3.2, m ? 40 : 33), look: V(0, 8.2, 0) },
      { t: 0.2, pos: V(2.5, 3.0, m ? 32 : 25), look: V(0, 7.5, 0) },
      { t: 0.32, pos: V(5, 2.6, 11.5), look: V(0, 5, 0) },
      { t: 0.42, pos: V(6.5, 9, 10.5), look: V(0, 11.5, 0) },
      { t: 0.56, pos: V(10, 13, 17), look: V(0, 10, 0) },
      { t: 0.72, pos: V(-15, 10, 27), look: V(0, 8.5, 0) },
      { t: 0.86, pos: V(-5, 7.5, 36), look: V(0, 8, 0) },
      { t: 1.0, pos: m ? V(0, 10, 44) : V(-11, 8, 35), look: m ? V(0, 4.2, 0) : V(11, 8.5, 0) },
    ]
  }, [size.width])
  const curves = useMemo(() => ({ pos: new THREE.CatmullRomCurve3(keys.map((k) => k.pos)), look: new THREE.CatmullRomCurve3(keys.map((k) => k.look)) }), [keys])
  const P = useMemo(() => new THREE.Vector3(), [])
  const L = useMemo(() => new THREE.Vector3(), [])
  const F = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() }), [])
  useFrame(() => {
    const p = THREE.MathUtils.clamp(S.current.p, 0, 1)
    let i = 0
    while (i < keys.length - 2 && p > keys[i + 1].t) i++
    const u = THREE.MathUtils.clamp((i + (p - keys[i].t) / (keys[i + 1].t - keys[i].t)) / (keys.length - 1), 0, 1)
    curves.pos.getPoint(u, P)
    curves.look.getPoint(u, L)
    if (REDUCED) { P.copy(keys[0].pos); L.copy(keys[0].look) }
    // ояну: камера жақыннан шегінеді
    const intro = S.current.intro
    if (intro < 1) P.add(new THREE.Vector3(0, 0, -(1 - intro) * 8))
    // түйінге жақындау
    const f = S.current.focus
    if (f) {
      const k = THREE.MathUtils.smoothstep(Math.min(1, (performance.now() - f.t) / 900), 0, 1)
      const dir = P.clone().sub(f.pos).normalize()
      F.pos.copy(f.pos).addScaledVector(dir, 3.2)
      P.lerp(F.pos, k)
      L.lerp(f.pos, k)
    }
    camera.position.copy(P)
    camera.lookAt(L)
    if (import.meta.env.DEV) window.__intro = { p }
  })
  return null
}

// Барлық фазаларды айналдыруға байланыстыратын «режиссер»: жарық, тұман, материалдар
function Director({ U, S, A, progress, trees, lights }) {
  const { scene, gl } = useThree()
  const tmp = useMemo(() => ({ warm: C('#ffd9a0'), cold: C('#7fc4ff'), fogN: C('#d9dde0'), fogD: C('#06263d'), hemN: C('#cfe6ff'), hemD: C('#0a3550'), grN: C('#5b6b3a'), grD: C('#04121f') }), [])
  useFrame(({ clock }) => {
    const s = S.current
    const p = progress.get()
    s.p = p
    s.intro = A.current.intro
    s.energy = ss(0.18, 0.4, p)
    s.cool = ss(0.22, 0.58, p)
    s.dis = ss(0.4, 0.62, p) * 1.05
    s.envDig = ss(0.42, 0.64, p)
    s.rise = ss(0.46, 0.64, p)
    s.world = ss(0.5, 0.7, p)
    s.nodes = SECTIONS.map((_, i) => ss(0.6 + i * 0.02, 0.64 + i * 0.02, p))
    U.uTime.value = clock.elapsedTime
    U.uEnergy.value = s.energy
    U.uCool.value = s.cool
    U.uDis.value = s.dis
    U.uDig.value = s.envDig
    U.uFogC.value.copy(tmp.fogN).lerp(tmp.fogD, s.envDig)
    U.uFogD.value = THREE.MathUtils.lerp(0.009, 0.012, s.envDig)
    scene.fog.color.copy(U.uFogC.value)
    scene.fog.density = U.uFogD.value
    gl.toneMappingExposure = (0.05 + 0.95 * s.intro) * THREE.MathUtils.lerp(1.0, 1.1, s.envDig)
    // жарық: жылы күн → суық негізгі жарық + бірюза контур
    lights.sun.current.intensity = THREE.MathUtils.lerp(3.2, 0.35, s.cool)
    lights.sun.current.color.copy(tmp.warm).lerp(tmp.cold, s.cool)
    lights.fill.current.intensity = THREE.MathUtils.lerp(1.9, 0.25, s.envDig)
    lights.hemi.current.color.copy(tmp.hemN).lerp(tmp.hemD, s.envDig)
    lights.hemi.current.groundColor.copy(tmp.grN).lerp(tmp.grD, s.envDig)
    lights.hemi.current.intensity = THREE.MathUtils.lerp(1.5, 0.7, s.envDig)
    lights.key.current.intensity = s.cool * 1.6
    lights.rim.current.intensity = s.envDig * 2.2
    trees.tree.update(clock.elapsedTime)
  })
  return null
}

function Universe({ A, progress, onNavigate, onReady }) {
  const U = useMemo(() => ({
    uTime: { value: 0 }, uFogC: { value: C('#d9dde0') }, uFogD: { value: 0.009 },
    uEnergy: { value: 0 }, uCool: { value: 0 }, uDis: { value: 0 }, uDig: { value: 0 },
  }), [])
  const S = useRef({ p: 0, intro: 0, energy: 0, cool: 0, dis: 0, envDig: 0, rise: 0, world: 0, focus: null, nodes: SECTIONS.map(() => 0) })
  const T = useTrees(U)
  const lights = { sun: useRef(), fill: useRef(), hemi: useRef(), key: useRef(), rim: useRef() }
  useEffect(() => { onReady?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <fogExp2 attach="fog" args={['#d9dde0', 0.009]} />
      <hemisphereLight ref={lights.hemi} args={['#cfe6ff', '#5b6b3a', 1.1]} />
      <directionalLight
        ref={lights.sun} position={[-30, 22, -42]} intensity={3.2} color="#ffd9a0" castShadow={!LITE}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={22} shadow-camera-bottom={-6} shadow-camera-far={120} shadow-bias={-0.0005}
      />
      <directionalLight ref={lights.fill} position={[14, 10, 30]} intensity={0.9} color="#ffe9cf" />
      <directionalLight ref={lights.key} position={[2, 30, 8]} intensity={0} color="#7fc4ff" />
      <directionalLight ref={lights.rim} position={[-8, 12, -20]} intensity={0} color="#19e6d2" />
      <Director U={U} S={S} A={A} progress={progress} trees={T} lights={lights} />
      <SkyDome U={U} />
      <Hills U={U} />
      <Meadow U={U} y={GROUND} />
      <Grass U={U} count={LITE ? 3500 : 14000} y={GROUND} />
      <RisingParticles U={U} S={S} lite={LITE} />
      <TechFloor U={U} S={S} lite={LITE} />
      <primitive object={T.tree} />
      <TrunkFibers U={U} skeleton={T.skeleton} />
      <BranchPulses U={U} skeleton={T.skeleton} S={S} />
      <CrownSparks U={U} leaves={T.leaves} S={S} />
      <Platform U={U} S={S} />
      <SectionNodes nodes={T.nodes} S={S} onNavigate={onNavigate} />
      <EnergyRings S={S} />
      <Panels U={U} S={S} lite={LITE} />
      <Architecture U={U} S={S} lite={LITE} />
      <Arches U={U} S={S} />
      <DataStreams U={U} S={S} lite={LITE} />
      <DataRain U={U} S={S} lite={LITE} />
      <DataNodes U={U} S={S} lite={LITE} />
      <Beams U={U} S={S} />
      <CameraRig S={S} />
    </>
  )
}

export default function TreeScene({ A, progress, onNavigate, onReady }) {
  return (
    <Canvas
      shadows={!LITE}
      dpr={[1, LITE ? 1.2 : 1.6]}
      camera={{ position: [0, 3.2, 33], fov: MOBILE ? 62 : 45, near: 0.1, far: 900 }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.05 }}
    >
      <Universe A={A} progress={progress} onNavigate={onNavigate} onReady={onReady} />
      {!LITE && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={1.0} radius={0.7} />
          <Vignette eskil={false} offset={0.28} darkness={0.5} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
