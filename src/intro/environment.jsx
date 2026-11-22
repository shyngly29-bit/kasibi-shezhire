// Цифрлық камера ортасы: панельдер, сәулет, деректер жаңбыры, жарық сәулелері, энергия сақиналары, еден
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { panelTexture, ringTexture } from './textures'

const FOG = `
  uniform vec3 uFogC; uniform float uFogD;
  vec3 applyFog(vec3 c, vec3 wp){ float d = length(wp - cameraPosition); return mix(c, uFogC, 1.0 - exp(-uFogD*uFogD*d*d)); }
  float fogK(vec3 wp){ float d = length(wp - cameraPosition); return exp(-uFogD*uFogD*d*d); }
`

// 2.2 Голографиялық панельдер — бірнеше қашықтықта, ағаштың артында және бүйірінде
export function Panels({ U, S, lite }) {
  const items = useMemo(() => {
    const kinds = ['bars', 'line', 'net', 'globe', 'radar', 'table']
    const n = lite ? 6 : 14
    return Array.from({ length: n }, (_, i) => {
      const side = i % 2 ? 1 : -1
      const a = (side * (0.55 + (i / n) * 1.6)) + Math.PI // артқы жарты шеңбер
      const R = 24 + (i % 4) * 6
      const y = 4 + ((i * 7) % 5) * 3.2
      const w = 6 + (i % 3) * 1.6
      const map = panelTexture(kinds[i % kinds.length], i + 1)
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
        uniforms: { ...U, uMap: { value: map }, uOp: { value: 0 }, uSeed: { value: i * 1.7 } },
        vertexShader: 'varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }',
        fragmentShader: `uniform sampler2D uMap; uniform float uOp; uniform float uTime; uniform float uSeed; varying vec2 vUv; varying vec3 vWP; ${FOG}
          void main(){
            vec4 t = texture2D(uMap, vUv);
            float scan = 0.82 + 0.18*sin(vUv.y*220.0 + uTime*3.0);
            float flick = 0.9 + 0.1*sin(uTime*2.3 + uSeed*3.0);
            float sweep = smoothstep(0.06, 0.0, abs(fract(uTime*0.12 + uSeed) - vUv.y)) * 0.6;
            vec3 c = t.rgb * (1.3 + sweep) * scan * flick;
            gl_FragColor = vec4(c * t.a * uOp * fogK(vWP), 1.0);
          }`,
      })
      return { pos: [Math.sin(a) * R, y, Math.cos(a) * R], w, mat, depth: R }
    })
  }, [U, lite])
  useFrame(() => {
    const k = S.current.world * (1 - S.current.light)
    items.forEach((it) => { it.mat.uniforms.uOp.value = k * (it.depth < 30 ? 0.75 : 0.5) })
  })
  return items.map((it, i) => (
    <mesh key={i} position={it.pos} material={it.mat} onUpdate={(m) => m.lookAt(0, it.pos[1], 0)}>
      <planeGeometry args={[it.w, it.w * 0.625]} />
    </mesh>
  ))
}

// 2.1 Көп деңгейлі цифрлық сәулет — алыстағы мұнаралар
export function Architecture({ U, S, lite }) {
  const ref = useRef()
  const n = lite ? 28 : 64
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { ...U, uOp: { value: 0 } },
    vertexShader: 'varying vec3 vWP; varying vec3 vL; void main(){ vL = position; vec4 wp = modelMatrix*instanceMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }',
    fragmentShader: `uniform float uTime; uniform float uOp; varying vec3 vWP; varying vec3 vL; ${FOG}
      void main(){
        vec3 base = vec3(0.012, 0.045, 0.085);
        float stripes = step(0.9, fract(vWP.y*0.5)) * 0.35 + step(0.985, fract(vWP.y*0.12 - uTime*0.05)) * 1.2;
        float edge = step(0.46, abs(vL.x)) + step(0.46, abs(vL.z));
        vec3 c = base + vec3(0.0, 0.85, 1.0) * (stripes*0.35 + edge*0.25) * uOp;
        gl_FragColor = vec4(applyFog(c, vWP), 1.0);
      }`,
  }), [U])
  useMemo(() => {
    // матрицалар useFrame алдында бір рет орнатылады
  }, [])
  useFrame(() => {
    mat.uniforms.uOp.value = S.current.world
    if (ref.current && !ref.current.userData.done) {
      const d = new THREE.Object3D()
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (i % 3) * 0.05
        const R = 52 + (i % 5) * 7
        const h = 18 + ((i * 37) % 50)
        d.position.set(Math.sin(a) * R, h / 2 - 2, Math.cos(a) * R)
        d.scale.set(2 + (i % 4), h, 2 + ((i * 3) % 4))
        d.lookAt(0, h / 2, 0)
        d.updateMatrix()
        ref.current.setMatrixAt(i, d.matrix)
      }
      ref.current.instanceMatrix.needsUpdate = true
      ref.current.userData.done = true
    }
  })
  return (
    <instancedMesh ref={ref} args={[null, mat, n]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

// 2.3 Деректер жаңбыры — GPU бөлшектері, жоғарыдан төмен
export function DataRain({ U, S, lite }) {
  const count = lite ? 700 : 2600
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const R = 11 + Math.pow(Math.random(), 0.7) * 38
      pos.set([Math.sin(a) * R, Math.random() * 40, Math.cos(a) * R], i * 3)
      spd[i] = 0.6 + Math.random() * 2.2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { ...U, uOp: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `attribute float aSpd; uniform float uTime; uniform float uPx; varying float vF; varying vec3 vWP;
        void main(){
          vec3 p = position; p.y = mod(p.y - uTime*aSpd, 40.0) - 2.0;
          vec4 wp = modelMatrix*vec4(p,1.0); vWP = wp.xyz;
          vec4 mv = viewMatrix*wp; gl_Position = projectionMatrix*mv;
          gl_PointSize = (10.0 + aSpd*6.0) * uPx * (14.0 / -mv.z);
          vF = aSpd;
        }`,
      fragmentShader: `uniform float uOp; varying float vF; varying vec3 vWP; ${FOG}
        void main(){
          vec2 pc = gl_PointCoord;
          float a = smoothstep(0.08, 0.0, abs(pc.x - 0.5)) * pc.y * pc.y;
          vec3 c = mix(vec3(0.0,0.85,1.0), vec3(0.1,0.9,0.82), fract(vF*3.1)) * 1.6;
          gl_FragColor = vec4(c * a * uOp * fogK(vWP) * 0.55, 1.0);
        }`,
    })
    return { geo: g, mat: m }
  }, [U, count])
  useFrame(() => { mat.uniforms.uOp.value = S.current.world * (1 - S.current.light) })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// Жоғарыдан түсетін жарық сәулелері
export function Beams({ U, S }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { ...U, uOp: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uOp; uniform float uTime; varying vec2 vUv;
      void main(){
        float a = pow(vUv.y, 1.6) * (0.6 + 0.4*sin(vUv.x*40.0 + uTime*0.4));
        gl_FragColor = vec4(vec3(0.35,0.8,1.0) * a * uOp * 0.16, 1.0);
      }`,
  }), [U])
  useFrame(() => { mat.uniforms.uOp.value = S.current.world * (1 - S.current.light) })
  return (
    <group>
      {[[-14, 0.32, -10], [10, -0.28, -16], [2, 0.08, -24]].map(([x, tilt, z], i) => (
        <mesh key={i} position={[x, 26, z]} rotation={[0, 0, tilt]} material={mat}>
          <coneGeometry args={[7 + i * 2, 52, 32, 1, true]} />
        </mesh>
      ))}
    </group>
  )
}

// 2.4 Энергия сақиналары: тәж үстінде, ортасында, түбінде
export function EnergyRings({ S }) {
  const rings = useMemo(() => [
    { r: 11.5, y: 17.2, tilt: 0.08, sp: 0.05, seed: 2 },
    { r: 9, y: 9.5, tilt: -0.12, sp: -0.07, seed: 5 },
    { r: 10.5, y: 2.0, tilt: 0.04, sp: 0.04, seed: 9 },
  ].map((o) => ({
    ...o,
    mat: new THREE.MeshBasicMaterial({ map: ringTexture(o.seed), transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }),
  })), [])
  const refs = useRef([])
  useFrame((_, dt) => {
    rings.forEach((o, i) => {
      const m = refs.current[i]
      if (m) m.rotation.y += o.sp * dt
      o.mat.opacity = S.current.world * (1 - S.current.light) * (i === 2 ? S.current.platform : 1) * 0.85
    })
  })
  return rings.map((o, i) => (
    <group key={i} position={[0, o.y, 0]} rotation={[o.tilt, 0, o.tilt * 0.5]}>
      <mesh ref={(el) => (refs.current[i] = el)} material={o.mat}>
        <cylinderGeometry args={[o.r, o.r, 0.42, 128, 1, true]} />
      </mesh>
    </group>
  ))
}

// Еден: шағылысатын қараңғы бет + цифрлық тор
export function Floor({ U, S, lite }) {
  const grid = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { ...U, uOp: { value: 0 } },
    vertexShader: 'varying vec2 vP; varying vec3 vWP; void main(){ vP = position.xy; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }',
    fragmentShader: `uniform float uOp; uniform float uTime; varying vec2 vP; varying vec3 vWP; ${FOG}
      void main(){
        float r = length(vP); float an = atan(vP.y, vP.x);
        float rings = 1.0 - min(abs(fract(r*0.18) - 0.5) / fwidth(r*0.18), 1.0);
        float rad = 1.0 - min(abs(fract(an*6.0/3.14159) - 0.5) / fwidth(an*6.0/3.14159), 1.0);
        float pulse = smoothstep(1.2, 0.0, abs(r - mod(uTime*7.0, 70.0)));
        float fade = smoothstep(60.0, 10.0, r);
        vec3 c = vec3(0.0,0.85,1.0) * (rings*0.5 + rad*0.18 + pulse*0.8*rings) * fade;
        gl_FragColor = vec4(c * uOp * fogK(vWP), 1.0);
      }`,
  }), [U])
  useFrame(() => { grid.uniforms.uOp.value = S.current.platform * (1 - S.current.light) })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[240, 240]} />
        {lite ? (
          <meshStandardMaterial color="#04111f" metalness={0.6} roughness={0.35} />
        ) : (
          <MeshReflectorMaterial resolution={512} mixBlur={1} mixStrength={6} blur={[220, 80]} roughness={0.55} depthScale={0.6} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#040f1c" metalness={0.7} mirror={0.6} />
        )}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={grid}>
        <planeGeometry args={[140, 140]} />
      </mesh>
    </group>
  )
}
