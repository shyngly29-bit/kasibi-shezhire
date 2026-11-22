import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Tree } from '@dgreenheck/ez-tree'

const H = 14 // ағаш биіктігі
const MOBILE = typeof window !== 'undefined' && window.innerWidth < 700
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const CYAN = new THREE.Color('#00d9ff')
const BLUE = new THREE.Color('#247bff')
const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)

// ---------------------------------------------------------------------------
// EZ-Tree + бұтақ қаңқасы (сақиналардың центрлері) және жапырақ нүктелері
class SkTree extends Tree {
  generate() {
    this.skeleton = []
    this.leafPts = []
    super.generate()
  }
  generateBranchIndices(off, b) {
    super.generateBranchIndices(off, b)
    const v = this.branches.verts
    const N = b.segmentCount + 1
    const pts = []
    for (let r = 0; r <= b.sectionCount; r++) {
      let x = 0, y = 0, z = 0
      for (let k = 0; k < b.segmentCount; k++) {
        const i = (off + r * N + k) * 3
        x += v[i]; y += v[i + 1]; z += v[i + 2]
      }
      pts.push(new THREE.Vector3(x, y, z).divideScalar(b.segmentCount))
    }
    this.skeleton.push({ level: b.level, pts })
  }
  generateLeaf(origin, orientation) {
    this.leafPts?.push(origin.clone())
    super.generateLeaf(origin, orientation)
  }
}

// Табиғи материалды «цифрлық еріту» шейдерімен кеңейту
function patchDigital(mat, key) {
  const prev = mat.onBeforeCompile
  const u = { uDis: { value: 0 }, uPat: { value: 0 }, uEdge: { value: CYAN.clone().multiplyScalar(2.2) }, uTime: { value: 0 } }
  mat.userData.dig = u
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r)
    Object.assign(sh.uniforms, u)
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )
    sh.fragmentShader = `uniform float uDis; uniform float uPat; uniform vec3 uEdge; uniform float uTime; varying vec3 vWP;
      float h3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
      ` + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float dN = n3(vWP*1.4)*0.65 + (1.0 - vWP.y/${H.toFixed(1)})*0.35;
        if (uDis > 0.001 && dN < uDis) discard;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float edge = (uDis > 0.001) ? smoothstep(uDis + 0.07, uDis, dN) : 0.0;
        float lines = step(0.94, fract(vWP.y*2.2 - uTime*0.35)) + step(0.97, fract((vWP.x+vWP.z)*3.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdge, clamp(edge + lines*uPat*0.55, 0.0, 1.0));`)
  }
  mat.customProgramCacheKey = () => 'digital-' + key
  mat.needsUpdate = true
}

// ---------------------------------------------------------------------------
function useTree() {
  return useMemo(() => {
    const t = new SkTree()
    t.loadPreset('Oak Large')
    t.options.seed = 2026
    t.generate()
    const box = new THREE.Box3().setFromObject(t)
    const s = H / (box.max.y - box.min.y)
    const dy = -box.min.y
    t.scale.setScalar(s)
    t.position.y = dy * s
    t.traverse((o) => { if (o.isMesh) { o.castShadow = !MOBILE; o.receiveShadow = !MOBILE } })
    patchDigital(t.branchesMesh.material, 'bark')
    patchDigital(t.leavesMesh.material, 'leaf')
    // қаңқа мен жапырақтарды әлем координатасына ауыстырамыз
    const toW = (p) => p.clone().add(new THREE.Vector3(0, dy, 0)).multiplyScalar(s)
    const skeleton = t.skeleton.map((b) => ({ level: b.level, pts: b.pts.map(toW) }))
    const leaves = t.leafPts.map(toW)
    return { tree: t, skeleton, leaves, levels: t.options.branch.levels }
  }, [])
}

// Бұтақтар бойымен жүгіретін нейрон-импульстер
function NeuralLines({ skeleton, levels, state }) {
  const { geo, mat } = useMemo(() => {
    const pos = []
    const along = []
    const depth = []
    skeleton.forEach((b) => {
      const n = b.pts.length - 1
      for (let i = 0; i < n; i++) {
        pos.push(...b.pts[i].toArray(), ...b.pts[i + 1].toArray())
        along.push(i / n, (i + 1) / n)
        const d0 = (b.level + i / n) / (levels + 1)
        const d1 = (b.level + (i + 1) / n) / (levels + 1)
        depth.push(d0, d1)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1))
    g.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uFade: { value: 1 }, uA: { value: CYAN.clone().multiplyScalar(2.4) }, uB: { value: BLUE.clone().multiplyScalar(1.6) } },
      vertexShader: `attribute float aAlong; attribute float aDepth; varying float vA; varying float vD;
        void main(){ vA = aAlong; vD = aDepth; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; uniform float uReveal; uniform float uFade; uniform vec3 uA; uniform vec3 uB; varying float vA; varying float vD;
        void main(){
          float on = smoothstep(vD, vD + 0.06, uReveal * 1.15);
          float pulse = smoothstep(0.08, 0.0, abs(fract(vD*4.0 - uTime*0.45) - 0.5) - 0.42);
          vec3 c = mix(uB, uA, pulse);
          float a = on * (0.35 + pulse * 0.65) * uFade;
          if (a < 0.01) discard;
          gl_FragColor = vec4(c, a);
        }`,
    })
    return { geo: g, mat: m }
  }, [skeleton, levels])
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uReveal.value = state.current.reveal
    mat.uniforms.uFade.value = 1 - state.current.spread
  })
  return <lineSegments geometry={geo} material={mat} />
}

// Бұтақ түйіндеріндегі жарық нүктелер
function Nodes({ skeleton, state }) {
  const ref = useRef()
  const pts = useMemo(() => skeleton.filter((b) => b.level <= 2).map((b) => b.pts[0]), [skeleton])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const k = state.current.nodes * (1 - state.current.spread)
    pts.forEach((p, i) => {
      dummy.position.copy(p)
      dummy.scale.setScalar(0.0001 + k * (0.09 + Math.sin(clock.elapsedTime * 3 + i) * 0.025))
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, pts.length]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color={CYAN.clone().multiplyScalar(2.5)} toneMapped={false} />
    </instancedMesh>
  )
}

// Жапырақтар → жарқыраған бөлшектер → жан-жаққа тарайды
function LeafParticles({ leaves, state }) {
  const { geo, mat } = useMemo(() => {
    const max = MOBILE ? 1400 : 4500
    const step = Math.max(1, Math.ceil(leaves.length / max))
    const pos = []
    const dir = []
    const rnd = []
    for (let i = 0; i < leaves.length; i += step) {
      const p = leaves[i]
      pos.push(p.x, p.y, p.z)
      const d = new THREE.Vector3(p.x, p.y - H * 0.6, p.z).normalize()
      d.x += (Math.random() - 0.5) * 0.6; d.y += Math.random() * 0.5; d.z += (Math.random() - 0.5) * 0.6
      dir.push(d.x, d.y, d.z)
      rnd.push(Math.random())
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3))
    g.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uSpread: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) }, uA: { value: CYAN.clone().multiplyScalar(2.0) }, uB: { value: BLUE.clone().multiplyScalar(1.4) } },
      vertexShader: `attribute vec3 aDir; attribute float aRnd; uniform float uTime; uniform float uSpread; uniform float uPx; uniform float uOn; varying float vR; varying float vOn;
        void main(){
          vec3 p = position + aDir * uSpread * (14.0 + aRnd * 18.0);
          p.y += sin(uTime*1.3 + aRnd*20.0) * 0.06;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vOn = smoothstep(aRnd*0.6, aRnd*0.6 + 0.4, uOn);
          gl_PointSize = (2.0 + aRnd*3.5) * uPx * (18.0 / -mv.z) * vOn;
          vR = aRnd;
        }`,
      fragmentShader: `uniform vec3 uA; uniform vec3 uB; uniform float uSpread; varying float vR; varying float vOn;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vOn * (1.0 - uSpread*0.85);
          if (a < 0.02) discard;
          gl_FragColor = vec4(mix(uB, uA, vR), a);
        }`,
    })
    return { geo: g, mat: m }
  }, [leaves])
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uOn.value = state.current.particles
    mat.uniforms.uSpread.value = state.current.spread
  })
  return <points geometry={geo} material={mat} />
}

// Жерде — жұмсақ цифрлық тор
function Floor({ state }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uK: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uK; varying vec2 vP;
      void main(){
        float r = length(vP);
        vec2 g = abs(fract(vP*0.5) - 0.5) / fwidth(vP*0.5);
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        float ring = 1.0 - min(abs(fract(r*0.25) - 0.5) / fwidth(r*0.25), 1.0);
        float fade = smoothstep(42.0, 6.0, r);
        vec3 c = mix(vec3(0.66,0.78,0.84), vec3(0.0,0.72,0.9), uK);
        gl_FragColor = vec4(c, (line*0.35 + ring*0.25*uK) * fade * (0.35 + uK*0.65));
      }`,
  }), [])
  useFrame(() => { mat.uniforms.uK.value = Math.max(state.current.reveal * 0.6, state.current.dark) })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={mat}>
      <planeGeometry args={[100, 100]} />
    </mesh>
  )
}

// Фон: жарық → терең көк (цифрлық фаза, мысалдағыдай) → қайта жарық (сайт ашылады)
const LIGHT = new THREE.Color('#eef5f9')
const NAVY = new THREE.Color('#071826')
function Env({ state }) {
  useFrame(({ scene }) => {
    const k = state.current.dark
    scene.background.copy(LIGHT).lerp(NAVY, k)
    scene.fog.color.copy(scene.background)
  })
  return null
}

// Голограмма тұғыры (мысалдағы дөңгелек постамент)
function Pedestal({ state }) {
  const g = useRef()
  const glow = useRef()
  useFrame(({ clock }) => {
    const k = state.current.dark
    g.current.scale.setScalar(0.0001 + k)
    g.current.visible = k > 0.01
    glow.current.material.opacity = k * (0.8 + Math.sin(clock.elapsedTime * 2) * 0.15)
  })
  return (
    <group ref={g}>
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[3.1, 0.62, 24, 72]} />
        <meshStandardMaterial color="#0b1622" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh ref={glow} position={[0, 1.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 3.35, 96]} />
        <meshBasicMaterial color={CYAN.clone().multiplyScalar(2.6)} toneMapped={false} transparent opacity={0} />
      </mesh>
    </group>
  )
}

function DigitalTree({ progress }) {
  const { tree, skeleton, leaves, levels } = useTree()
  const state = useRef({ reveal: 0, particles: 0, nodes: 0, spread: 0, dark: 0 })
  const wire = useMemo(() => new THREE.MeshBasicMaterial({ color: CYAN.clone().multiplyScalar(1.6), wireframe: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [])
  const smooth = useRef(0)

  useFrame(({ clock }, dt) => {
    smooth.current += (progress.get() - smooth.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 5))
    const p = smooth.current
    const t = clock.elapsedTime
    tree.update(t)
    const s = state.current
    s.reveal = ss(0.16, 0.42, p)
    s.particles = ss(0.22, 0.45, p)
    s.nodes = ss(0.42, 0.58, p)
    s.spread = ss(0.8, 1.0, p)
    s.dark = ss(0.3, 0.5, p) * (1 - ss(0.86, 1.0, p))
    const bark = tree.branchesMesh.material.userData.dig
    const leaf = tree.leavesMesh.material.userData.dig
    bark.uPat.value = ss(0.24, 0.42, p) * (1 - s.spread)
    bark.uDis.value = ss(0.42, 0.64, p) * 0.72 + s.spread * 0.3
    leaf.uDis.value = Math.min(1, ss(0.24, 0.5, p) * 0.85 + s.spread)
    bark.uTime.value = t
    wire.opacity = ss(0.4, 0.6, p) * 0.55 * (1 - s.spread)
  })

  return (
    <group>
      <primitive object={tree}>
        <mesh geometry={tree.branchesMesh.geometry} material={wire} />
      </primitive>
      <NeuralLines skeleton={skeleton} levels={levels} state={state} />
      <Nodes skeleton={skeleton} state={state} />
      <LeafParticles leaves={leaves} state={state} />
      <Floor state={state} />
      <Pedestal state={state} />
      <Env state={state} />
    </group>
  )
}

// Камера: жоғарыдан → тәжге түсу → бүйірден айналу → бұтақтар арасынан өту → шығу
const CAM = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 34, 13),
  new THREE.Vector3(3, 27, 13),
  new THREE.Vector3(7, 20, 12.5),
  new THREE.Vector3(10.5, 13.5, 9),
  new THREE.Vector3(11, 7.5, 1),
  new THREE.Vector3(5, 5.5, -9.5),
  new THREE.Vector3(-2.5, 9.5, -3.5),
  new THREE.Vector3(-1, 10.5, 15),
])
const LOOK = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 9, 0),
  new THREE.Vector3(0, 10, 0),
  new THREE.Vector3(0, 10.5, 0),
  new THREE.Vector3(0, 9.5, 0),
  new THREE.Vector3(0, 7, 0),
  new THREE.Vector3(0, 6.5, 0),
  new THREE.Vector3(1.5, 10, 8),
  new THREE.Vector3(0, 9.5, 34),
])

function CameraRig({ progress }) {
  const cur = useRef(0)
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, dt) => {
    cur.current += (progress.get() - cur.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 4))
    const t = THREE.MathUtils.clamp(cur.current, 0, 1)
    if (REDUCED) {
      camera.position.set(14, 15, 18)
      camera.lookAt(0, 8, 0)
    } else {
      camera.position.copy(CAM.getPoint(t))
      camera.lookAt(LOOK.getPoint(t, look))
    }
    if (import.meta.env.DEV) window.__intro = { t, p: progress.get() }
  })
  return null
}

export default function TreeScene({ progress }) {
  return (
    <Canvas
      shadows={!MOBILE}
      dpr={[1, MOBILE ? 1.25 : 1.75]}
      camera={{ position: [0, 34, 13], fov: MOBILE ? 64 : 48, near: 0.1, far: 400 }}
      gl={{ antialias: !MOBILE, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
    >
      <color attach="background" args={['#eef5f9']} />
      <fog attach="fog" args={['#eef5f9', 30, 95]} />
      <hemisphereLight args={['#ffffff', '#9fb7a8', 1.15]} />
      <directionalLight
        position={[12, 26, 10]} intensity={2.2} color="#fff6e8" castShadow={!MOBILE}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14}
        shadow-camera-top={20} shadow-camera-bottom={-6} shadow-bias={-0.0004}
      />
      <directionalLight position={[-14, 8, -10]} intensity={0.7} color="#bfefff" />
      {!MOBILE && <ContactShadows position={[0, 0.02, 0]} scale={30} blur={2.6} opacity={0.45} far={12} color="#1d3b46" />}
      <DigitalTree progress={progress} />
      <CameraRig progress={progress} />
      {!MOBILE && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={0.9} radius={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
