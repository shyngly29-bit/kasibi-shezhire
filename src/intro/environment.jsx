// Табиғат → цифрлық әлем: аспан, төбелер, шалғын, шөп; цифрлық сәулет, анимациялы панельдер, ағындар, еден
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { panelTexture, ringTexture } from './textures'

export const NOISE = `
  float h1(float n){ return fract(sin(n)*43758.5453); }
  float h3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
`
export const FOG = `
  uniform vec3 uFogC; uniform float uFogD;
  vec3 applyFog(vec3 c, vec3 wp){ float d = length(wp - cameraPosition); return mix(c, uFogC, 1.0 - exp(-uFogD*uFogD*d*d)); }
  float fogK(vec3 wp){ float d = length(wp - cameraPosition); return exp(-uFogD*uFogD*d*d); }
`
const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }
const VS = 'varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }'

// ---------------------------------------------------------------- АСПАН
// табиғат: жылы таңғы аспан + күн; цифрлық: көк-бірюза көкжиек жарығы, жұлдыз-деректер
export function SkyDome({ U }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: { ...U, uSun: { value: new THREE.Vector3(-0.55, 0.16, -0.82).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uSun; uniform float uDig; uniform float uTime; varying vec3 vD; ${NOISE}
      void main(){
        float y = vD.y;
        // табиғи аспан
        vec3 top = vec3(0.30, 0.52, 0.82), hor = vec3(1.0, 0.86, 0.66), low = vec3(0.86, 0.80, 0.70);
        vec3 nat = mix(hor, top, smoothstep(0.0, 0.55, y));
        nat = mix(low, nat, smoothstep(-0.2, 0.02, y));
        float s = max(dot(vD, uSun), 0.0);
        nat += vec3(1.0, 0.82, 0.5) * (pow(s, 600.0)*6.0 + pow(s, 12.0)*0.55);
        float cl = n3(vD*vec3(6.0, 14.0, 6.0) + vec3(uTime*0.01, 0.0, 0.0));
        nat = mix(nat, vec3(1.0, 0.97, 0.93), smoothstep(0.55, 0.85, cl) * smoothstep(0.05, 0.3, y) * 0.55);
        // цифрлық аспан — қара емес: терең көк + бірюза көкжиек жарығы
        vec3 dtop = vec3(0.012, 0.05, 0.11), dhor = vec3(0.02, 0.2, 0.32);
        vec3 dig = mix(dhor, dtop, smoothstep(-0.05, 0.6, y));
        float grid = smoothstep(0.985, 1.0, abs(sin(atan(vD.z, vD.x)*48.0))) * smoothstep(0.5, 0.0, abs(y - 0.08));
        float star = step(0.9975, h3(floor(vD*260.0))) * (0.5 + 0.5*sin(uTime*2.0 + h3(floor(vD*260.0))*30.0));
        dig += vec3(0.0, 0.7, 1.0) * (grid*0.25 + star*0.8);
        gl_FragColor = vec4(mix(nat, dig, uDig), 1.0);
      }`,
  }), [U])
  return <mesh material={mat} frustumCulled={false}><sphereGeometry args={[400, 48, 24]} /></mesh>
}

// ---------------------------------------------------------------- ТАБИҒАТ (цифрға ериді)
const DISSOLVE_FRAG = `
  float dz = n3(vWP*0.18) * 0.75 + h3(floor(vWP*1.5)) * 0.25;
  if (dz < uDig*1.15 - 0.05) discard;
  float edge = smoothstep(uDig*1.15 + 0.08, uDig*1.15 - 0.05, dz) * step(0.001, uDig);
`
// Алыстағы төбелер
export function Hills({ U }) {
  const { geo, mat } = useMemo(() => {
    const g = new THREE.RingGeometry(70, 260, 160, 24)
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i)
      const d = Math.hypot(x, z)
      const a = Math.atan2(z, x)
      const h = (Math.sin(a * 5) * 0.5 + 0.5) * 14 + (Math.sin(a * 13 + 1) * 0.5 + 0.5) * 7 + (Math.sin(a * 29) * 0.5 + 0.5) * 3
      p.setY(i, h * THREE.MathUtils.smoothstep(d, 70, 120) * (1 + (d - 120) / 160))
    }
    g.computeVertexNormals()
    const m = new THREE.ShaderMaterial({
      uniforms: { ...U },
      vertexShader: 'varying vec3 vWP; varying vec3 vN; void main(){ vN = normal; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }',
      fragmentShader: `uniform float uDig; varying vec3 vWP; varying vec3 vN; ${NOISE} ${FOG}
        void main(){
          ${DISSOLVE_FRAG}
          float lit = 0.55 + 0.45*max(dot(normalize(vN), normalize(vec3(-0.5, 0.6, -0.6))), 0.0);
          vec3 c = mix(vec3(0.24, 0.36, 0.22), vec3(0.42, 0.52, 0.36), n3(vWP*0.05)) * lit;
          c = mix(c, vec3(0.62, 0.70, 0.78), smoothstep(80.0, 220.0, length(vWP.xz))); // атмосфералық перспектива
          c += vec3(0.0, 0.85, 1.0) * edge * 3.0;
          gl_FragColor = vec4(applyFog(c, vWP), 1.0);
        }`,
    })
    return { geo: g, mat: m }
  }, [U])
  return <mesh geometry={geo} material={mat} />
}

// Шалғын — ағаш тұрған жер
export function Meadow({ U, y }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { ...U },
    vertexShader: VS,
    fragmentShader: `uniform float uDig; varying vec2 vUv; varying vec3 vWP; ${NOISE} ${FOG}
      void main(){
        ${DISSOLVE_FRAG}
        float n = n3(vWP*0.35) * 0.6 + n3(vWP*2.2) * 0.4;
        vec3 c = mix(vec3(0.20, 0.32, 0.12), vec3(0.42, 0.52, 0.20), n);
        c = mix(c, vec3(0.55, 0.45, 0.28), smoothstep(0.62, 0.8, n3(vWP*0.12 + 3.0)) * 0.5);
        float shade = smoothstep(2.0, 9.0, length(vWP.xz)); // ағаш астындағы көлеңке
        c *= 0.55 + 0.45 * shade;
        c += vec3(0.0, 0.85, 1.0) * edge * 3.0;
        gl_FragColor = vec4(applyFog(c, vWP), 1.0);
      }`,
  }), [U])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={mat} receiveShadow>
      <circleGeometry args={[90, 96]} />
    </mesh>
  )
}

// Шөп — инстанс жапырақшалар, жел, біртіндеп цифрлық бөлшектерге ериді
export function Grass({ U, count, y }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...U },
    vertexShader: `uniform float uTime; varying vec3 vWP; varying float vH; varying vec3 vC;
      void main(){
        vH = position.y + 0.45;
        vec4 o = instanceMatrix*vec4(0.0,0.0,0.0,1.0);
        float hh = fract(sin(dot(o.xz, vec2(12.9898,78.233)))*43758.5453);
        vC = mix(vec3(0.16,0.30,0.08), vec3(0.42,0.50,0.18), hh);
        vec4 wp = modelMatrix*instanceMatrix*vec4(position,1.0);
        wp.x += sin(uTime*1.5 + wp.x*0.4 + wp.z*0.3) * 0.16 * vH;
        vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader: `uniform float uDig; varying vec3 vWP; varying float vH; varying vec3 vC; ${NOISE} ${FOG}
      void main(){
        ${DISSOLVE_FRAG}
        vec3 c = vC * (0.45 + 0.75*vH) + vec3(0.0, 0.85, 1.0)*edge*3.0;
        gl_FragColor = vec4(applyFog(c, vWP), 1.0);
      }`,
  }), [U])
  useMemo(() => { mat.userData.count = count }, [mat, count])
  useFrame(() => {
    const g = ref.current
    if (!g || g.userData.done) return
    const d = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.pow(Math.random(), 1.3) * 45
      const a = Math.random() * Math.PI * 2
      d.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
      d.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4)
      const s = 0.7 + Math.random() * 0.9
      d.scale.set(s * 1.4, s * (0.5 + Math.random() * 0.7), s * 1.4)
      d.updateMatrix()
      g.setMatrixAt(i, d.matrix)
    }
    g.instanceMatrix.needsUpdate = true
    g.userData.done = true
  })
  return (
    <instancedMesh ref={ref} args={[null, mat, count]} frustumCulled={false}>
      <coneGeometry args={[0.05, 0.9, 3, 1]} />
    </instancedMesh>
  )
}

// Жер еріген кезде жоғары ұшатын цифрлық бөлшектер
export function RisingParticles({ U, S, lite }) {
  const n = lite ? 800 : 2500
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(n * 3), rnd = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const r = 2 + Math.pow(Math.random(), 0.8) * 40, a = Math.random() * Math.PI * 2
      pos.set([Math.cos(a) * r, 0.9, Math.sin(a) * r], i * 3)
      rnd[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aR', new THREE.BufferAttribute(rnd, 1))
    const m = new THREE.ShaderMaterial({
      ...ADD,
      uniforms: { ...U, uK: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `attribute float aR; uniform float uK; uniform float uTime; uniform float uPx; varying float vA; varying float vR;
        void main(){ vec3 p = position; float t = clamp(uK*1.4 - aR*0.4, 0.0, 1.0);
          p.y += t * (6.0 + aR*14.0); p.x += sin(uTime + aR*20.0)*t; vA = sin(t*3.14159); vR = aR;
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (2.0 + aR*3.0)*uPx*(20.0/-mv.z); }`,
      fragmentShader: `varying float vA; varying float vR; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*vA;
          vec3 c = vR > 0.92 ? vec3(1.0,0.78,0.42)*2.2 : vec3(0.2,0.9,1.0)*2.0; gl_FragColor = vec4(c*a, 1.0); }`,
    })
    return { geo: g, mat: m }
  }, [U, n])
  useFrame(() => { mat.uniforms.uK.value = S.current.envDig < 0.999 ? S.current.envDig : 0 })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// ---------------------------------------------------------------- ЦИФРЛЫҚ ӘЛЕМ
// Анимациялы голографиялық панельдер: бағандар, графиктер, радар, желі, ағын-кесте
export function Panels({ U, S, lite }) {
  const items = useMemo(() => {
    const n = lite ? 7 : 18
    const frame = panelTexture('frame', 1)
    return Array.from({ length: n }, (_, i) => {
      const side = i % 2 ? 1 : -1
      const a = Math.PI + side * (0.35 + ((i * 0.618) % 1) * 1.9)
      const R = 20 + (i % 5) * 6
      const y = 3 + ((i * 5) % 7) * 2.6
      const w = 5.5 + (i % 3) * 1.8
      const mat = new THREE.ShaderMaterial({
        ...ADD, side: THREE.DoubleSide,
        uniforms: { ...U, uFrame: { value: frame }, uOp: { value: 0 }, uSeed: { value: i * 1.37 }, uKind: { value: i % 5 } },
        vertexShader: VS,
        fragmentShader: `uniform sampler2D uFrame; uniform float uOp; uniform float uTime; uniform float uSeed; uniform float uKind; varying vec2 vUv; varying vec3 vWP; ${NOISE} ${FOG}
          void main(){
            vec2 uv = vUv; vec4 fr = texture2D(uFrame, uv);
            vec2 a = (uv - vec2(0.06, 0.1)) / vec2(0.88, 0.7);
            float inA = step(0.0,a.x)*step(a.x,1.0)*step(0.0,a.y)*step(a.y,1.0);
            vec3 cy = vec3(0.0,0.85,1.0), go = vec3(1.0,0.78,0.42), te = vec3(0.1,0.9,0.82);
            vec3 c = vec3(0.0);
            if (uKind < 0.5) {
              float n = 16.0; float i = floor(a.x*n); float fx = fract(a.x*n);
              float hg = 0.2 + 0.75*(0.5 + 0.5*sin(uTime*0.8 + i*1.7 + uSeed));
              float bar = step(0.15,fx)*step(fx,0.85)*step(a.y,hg);
              c += mix(cy*0.25, cy*1.3, a.y/hg) * bar + go*1.5*bar*step(hg-0.025, a.y);
            } else if (uKind < 1.5) {
              float x = a.x*6.0 + uTime*0.35 + uSeed;
              float y = 0.55 + 0.22*sin(x*1.3) + 0.1*sin(x*3.7 + 1.0) + 0.04*sin(x*9.0);
              c += cy*smoothstep(0.022,0.0,abs(a.y-y))*1.8 + cy*0.12*step(a.y,y);
              float y2 = 0.3 + 0.16*sin(x*0.9 + 2.0) + 0.06*sin(x*5.0);
              c += go*smoothstep(0.015,0.0,abs(a.y-y2))*1.4;
            } else if (uKind < 2.5) {
              vec2 p = a*2.0 - 1.0; float r = length(p); float an = atan(p.y,p.x);
              float rings = smoothstep(0.03,0.0,abs(fract(r*4.0)-0.5)-0.46)*step(r,1.0);
              float sw = mod(an - uTime*1.1, 6.2831); float sweep = smoothstep(1.4,0.0,sw)*step(r,1.0);
              c += te*(rings*0.55 + sweep*0.7);
              float blip = step(0.97, h3(vec3(floor(p*7.0), uSeed))) * step(r,1.0);
              c += go*blip*smoothstep(1.4,0.0,sw)*2.5;
            } else if (uKind < 3.5) {
              vec2 g = a*vec2(6.0,4.0); vec2 id = floor(g); vec2 f = fract(g) - 0.5;
              vec2 o = (vec2(h1(id.x + id.y*7.0 + uSeed), h1(id.x*3.0 + id.y + uSeed)) - 0.5)*0.5;
              float d = length(f - o); float pul = 0.5 + 0.5*sin(uTime*2.0 + h1(id.x + id.y*5.0)*6.28);
              c += cy*smoothstep(0.09,0.0,d)*(0.7 + pul*1.3);
              c += cy*0.22*smoothstep(0.025,0.0,min(abs(f.x-o.x),abs(f.y-o.y)));
            } else {
              vec2 g = vec2(a.x*4.0, a.y*14.0 + uTime*0.7); vec2 id = floor(g); float w = h1(id.x + id.y*11.0 + uSeed);
              c += cy * step(fract(g.x), w*0.9) * step(0.3,fract(g.y)) * step(fract(g.y),0.62) * (0.5 + 0.5*w);
            }
            c *= inA;
            float scan = 0.85 + 0.15*sin(uv.y*260.0 + uTime*4.0);
            float sweepY = smoothstep(0.05, 0.0, abs(fract(uTime*0.1 + uSeed) - uv.y)) * 0.35;
            vec3 col = (c + fr.rgb*fr.a*1.2 + cy*(0.045 + sweepY)) * scan;
            gl_FragColor = vec4(col * uOp * fogK(vWP), 1.0);
          }`,
      })
      return { pos: [Math.sin(a) * R, y, Math.cos(a) * R], w, mat, R, ph: i * 0.7 }
    })
  }, [U, lite])
  const refs = useRef([])
  useFrame(({ clock }) => {
    const k = S.current.world
    items.forEach((it, i) => {
      it.mat.uniforms.uOp.value = k * (it.R < 28 ? 1.0 : 0.7)
      const m = refs.current[i]
      if (m) m.position.y = it.pos[1] + Math.sin(clock.elapsedTime * 0.4 + it.ph) * 0.35 - (1 - k) * 3
    })
  })
  return items.map((it, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)} position={it.pos} material={it.mat} onUpdate={(m) => m.lookAt(0, it.pos[1], 0)}>
      <planeGeometry args={[it.w, it.w * 0.62]} />
    </mesh>
  ))
}

// Жарық терезелері, жолақтары, сканер толқыны бар мұнаралар (жерден көтеріледі)
export function Architecture({ U, S, lite }) {
  const ref = useRef()
  const n = lite ? 30 : 72
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { ...U, uRise: { value: 0 } },
    vertexShader: `uniform float uRise; varying vec3 vWP; varying vec3 vL;
      void main(){ vL = position; vec4 wp = modelMatrix*instanceMatrix*vec4(position,1.0); wp.y *= uRise; vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform float uTime; uniform float uRise; varying vec3 vWP; varying vec3 vL; ${NOISE} ${FOG}
      void main(){
        vec3 base = vec3(0.02, 0.08, 0.14);
        vec2 cell = vec2((vWP.x + vWP.z)*0.9, vWP.y*1.3);
        vec2 id = floor(cell); vec2 f = fract(cell);
        float win = step(0.18,f.x)*step(f.x,0.82)*step(0.25,f.y)*step(f.y,0.7);
        float on = step(0.55, h3(vec3(id, floor(uTime*0.4 + h3(vec3(id,1.0))*8.0))));
        float edge = smoothstep(0.47, 0.5, max(abs(vL.x), abs(vL.z)));
        float scan = smoothstep(0.6, 0.0, abs(fract(vWP.y*0.025 - uTime*0.08) - 0.5) * 8.0 - 3.6);
        float top = smoothstep(0.46, 0.5, vL.y);
        vec3 c = base + vec3(0.0,0.75,1.0)*win*on*0.32 + vec3(0.1,0.9,0.85)*edge*0.6 + vec3(0.0,0.85,1.0)*scan*0.35 + vec3(1.0,0.78,0.42)*top*1.5;
        gl_FragColor = vec4(applyFog(c*uRise + base*(1.0-uRise), vWP), 1.0);
      }`,
  }), [U])
  useFrame(() => {
    mat.uniforms.uRise.value = Math.max(0.001, S.current.world)
    const g = ref.current
    if (!g || g.userData.done) return
    const d = new THREE.Object3D()
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.04
      const R = 46 + (i % 6) * 8
      const h = 14 + ((i * 37) % 46)
      d.position.set(Math.sin(a) * R, h / 2, Math.cos(a) * R)
      d.scale.set(2.5 + (i % 4) * 1.2, h, 2.5 + ((i * 3) % 4) * 1.2)
      d.rotation.y = a
      d.updateMatrix()
      g.setMatrixAt(i, d.matrix)
    }
    g.instanceMatrix.needsUpdate = true
    g.userData.done = true
  })
  return (
    <instancedMesh ref={ref} args={[null, mat, n]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

// Үлкен жарық доғалар (артқы план) — бойымен жарық жолақтары жүгіреді
export function Arches({ U, S }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { ...U, uOp: { value: 0 } },
    vertexShader: VS,
    fragmentShader: `uniform float uOp; uniform float uTime; varying vec2 vUv; varying vec3 vWP; ${FOG}
      void main(){
        float dash = step(0.5, fract(vUv.x*60.0 - uTime*0.6));
        float pulse = pow(fract(vUv.x*2.0 - uTime*0.15), 18.0);
        vec3 c = vec3(0.0,0.75,1.0)*(0.35 + dash*0.35) + vec3(1.0,0.8,0.45)*pulse*3.0;
        gl_FragColor = vec4(c*uOp*fogK(vWP), 1.0);
      }`,
  }), [U])
  useFrame(() => { mat.uniforms.uOp.value = S.current.world })
  return [[-38, 0.25, 30], [0, 0, 40], [36, -0.25, 33]].map(([x, ry, r], i) => (
    <mesh key={i} position={[x * 0.5, 0, -42 - i * 4]} rotation={[0, ry, 0]} material={mat}>
      <torusGeometry args={[r, 0.22, 8, 160, Math.PI]} />
    </mesh>
  ))
}

// Тік деректер ағындары (жарық бағаналар) + деректер жаңбыры
export function DataStreams({ U, S, lite }) {
  const n = lite ? 8 : 18
  const mat = useMemo(() => new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { ...U, uOp: { value: 0 } },
    vertexShader: VS,
    fragmentShader: `uniform float uOp; uniform float uTime; varying vec2 vUv; varying vec3 vWP; ${NOISE} ${FOG}
      void main(){
        float lane = floor(vUv.x*4.0);
        float d = step(0.75, fract(vUv.y*30.0 + uTime*(0.6 + h1(lane)*0.8) + h1(lane*3.0)));
        float fade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        vec3 c = vec3(0.0,0.85,1.0) * (0.15 + d*0.9) * fade;
        gl_FragColor = vec4(c*uOp*fogK(vWP), 1.0);
      }`,
  }), [U])
  useFrame(() => { mat.uniforms.uOp.value = S.current.world })
  const cols = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = Math.PI + (i % 2 ? 1 : -1) * (0.2 + ((i * 0.37) % 1) * 2.4)
    const R = 16 + ((i * 7) % 20)
    return [Math.sin(a) * R, 18, Math.cos(a) * R]
  }), [n])
  return cols.map((p, i) => (
    <mesh key={i} position={p} material={mat}><cylinderGeometry args={[0.12, 0.12, 36, 6, 1, true]} /></mesh>
  ))
}

export function DataRain({ U, S, lite }) {
  const count = lite ? 700 : 2400
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3), spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, R = 11 + Math.pow(Math.random(), 0.7) * 38
      pos.set([Math.sin(a) * R, Math.random() * 40, Math.cos(a) * R], i * 3)
      spd[i] = 0.6 + Math.random() * 2.2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1))
    const m = new THREE.ShaderMaterial({
      ...ADD,
      uniforms: { ...U, uOp: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `attribute float aSpd; uniform float uTime; uniform float uPx; varying float vF; varying vec3 vWP;
        void main(){ vec3 p = position; p.y = mod(p.y - uTime*aSpd, 40.0) - 2.0; vec4 wp = modelMatrix*vec4(p,1.0); vWP = wp.xyz;
          vec4 mv = viewMatrix*wp; gl_Position = projectionMatrix*mv; gl_PointSize = (10.0 + aSpd*6.0)*uPx*(14.0/-mv.z); vF = aSpd; }`,
      fragmentShader: `uniform float uOp; varying float vF; varying vec3 vWP; ${FOG}
        void main(){ vec2 pc = gl_PointCoord; float a = smoothstep(0.08,0.0,abs(pc.x-0.5))*pc.y*pc.y;
          vec3 c = mix(vec3(0.0,0.85,1.0), vec3(0.1,0.9,0.82), fract(vF*3.1))*1.6; gl_FragColor = vec4(c*a*uOp*fogK(vWP)*0.6, 1.0); }`,
    })
    return { geo: g, mat: m }
  }, [U, count])
  useFrame(() => { mat.uniforms.uOp.value = S.current.world })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// Ауада қалқып, соғып тұратын деректер түйіндері
export function DataNodes({ U, S, lite }) {
  const n = lite ? 60 : 160
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(n * 3), rnd = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, R = 12 + Math.random() * 30
      pos.set([Math.sin(a) * R, 2 + Math.random() * 24, Math.cos(a) * R], i * 3)
      rnd[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aR', new THREE.BufferAttribute(rnd, 1))
    const m = new THREE.ShaderMaterial({
      ...ADD,
      uniforms: { ...U, uOp: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `attribute float aR; uniform float uTime; uniform float uPx; varying float vP; varying float vR;
        void main(){ vec3 p = position; p.y += sin(uTime*0.5 + aR*20.0)*0.6; vP = 0.5 + 0.5*sin(uTime*(1.0 + aR*2.0) + aR*30.0); vR = aR;
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (6.0 + vP*10.0)*uPx*(18.0/-mv.z); }`,
      fragmentShader: `uniform float uOp; varying float vP; varying float vR;
        void main(){ float d = length(gl_PointCoord-0.5); float core = smoothstep(0.12,0.0,d); float halo = smoothstep(0.5,0.0,d)*0.35;
          vec3 c = vR > 0.85 ? vec3(1.0,0.78,0.42) : vec3(0.1,0.9,1.0); gl_FragColor = vec4(c*(core*2.5 + halo)*(0.4 + vP)*uOp, 1.0); }`,
    })
    return { geo: g, mat: m }
  }, [U, n])
  useFrame(() => { mat.uniforms.uOp.value = S.current.world })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// Көлемді жарық сәулелері: табиғатта — жылы күн сәулелері, цифрда — көгілдір прожекторлар
export function Beams({ U, S }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    ...ADD, side: THREE.DoubleSide,
    uniforms: { ...U, uOp: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uOp; uniform float uTime; uniform float uDig; varying vec2 vUv;
      void main(){
        float a = pow(vUv.y, 1.5) * (0.6 + 0.4*sin(vUv.x*40.0 + uTime*0.3));
        vec3 c = mix(vec3(1.0,0.85,0.55), vec3(0.3,0.8,1.0), uDig);
        gl_FragColor = vec4(c*a*uOp, 1.0);
      }`,
  }), [U])
  useFrame(() => { mat.uniforms.uOp.value = 0.07 + S.current.world * 0.12 })
  return [[-12, 0.42, -8, 8], [6, -0.3, -14, 9], [-2, 0.12, -22, 11], [16, -0.45, -4, 6]].map(([x, tilt, z, r], i) => (
    <mesh key={i} position={[x, 24, z]} rotation={[0, 0, tilt]} material={mat}>
      <coneGeometry args={[r, 50, 32, 1, true]} />
    </mesh>
  ))
}

// Энергия сақиналары: тәж үстінде, ортасында, түбінде
export function EnergyRings({ S }) {
  const rings = useMemo(() => [
    { r: 11.5, y: 17.4, tilt: 0.08, sp: 0.05, seed: 2 },
    { r: 9, y: 9.5, tilt: -0.12, sp: -0.07, seed: 5 },
    { r: 10.5, y: 2.2, tilt: 0.04, sp: 0.04, seed: 9 },
  ].map((o) => ({
    ...o,
    mat: new THREE.MeshBasicMaterial({ map: ringTexture(o.seed), transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(1.8, 1.8, 1.8) }),
  })), [])
  const refs = useRef([])
  useFrame((_, dt) => {
    rings.forEach((o, i) => {
      const m = refs.current[i]
      if (m) { m.rotation.y += o.sp * dt; m.scale.setScalar(0.6 + S.current.world * 0.4) }
      o.mat.opacity = S.current.world * 0.85
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

// Цифрлық еден: шағылысатын бет + тор, ортаға ағатын деректер, сыртқа тарайтын импульстер
export function TechFloor({ U, S, lite }) {
  const grid = useMemo(() => new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { ...U, uOp: { value: 0 } },
    vertexShader: 'varying vec2 vP; varying vec3 vWP; void main(){ vP = position.xy; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }',
    fragmentShader: `uniform float uOp; uniform float uTime; varying vec2 vP; varying vec3 vWP; ${NOISE} ${FOG}
      void main(){
        float r = length(vP); float an = atan(vP.y, vP.x);
        float ringsF = r*0.2; float rings = 1.0 - min(abs(fract(ringsF) - 0.5) / fwidth(ringsF), 1.0);
        float radF = an*12.0/3.14159; float rad = 1.0 - min(abs(fract(radF) - 0.5) / fwidth(radF), 1.0);
        float sq = 1.0 - min(min(abs(fract(vP.x*0.25)-0.5)/fwidth(vP.x*0.25), abs(fract(vP.y*0.25)-0.5)/fwidth(vP.y*0.25)), 1.0);
        float lane = floor(radF);
        float flow = step(0.85, fract(r*0.12 + uTime*(0.5 + h1(lane)*0.6) + h1(lane*7.0))) * rad;
        float pulse = smoothstep(1.4, 0.0, abs(r - mod(uTime*9.0, 80.0))) + smoothstep(1.0, 0.0, abs(r - mod(uTime*9.0 + 40.0, 80.0)))*0.6;
        float fade = smoothstep(70.0, 8.0, r);
        vec3 c = vec3(0.0,0.8,1.0)*(rings*0.55 + rad*0.2 + sq*0.12 + flow*1.4 + pulse*rings*1.5) + vec3(1.0,0.78,0.42)*flow*step(0.9,h1(lane*3.0))*1.5;
        gl_FragColor = vec4(c*fade*uOp*fogK(vWP), 1.0);
      }`,
  }), [U])
  useFrame(() => { grid.uniforms.uOp.value = S.current.world })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[300, 300]} />
        {lite ? (
          <meshStandardMaterial color="#071d33" metalness={0.6} roughness={0.35} />
        ) : (
          <MeshReflectorMaterial resolution={512} mixBlur={1} mixStrength={9} blur={[260, 90]} roughness={0.45} depthScale={0.8} minDepthThreshold={0.3} maxDepthThreshold={1.4} color="#061a2e" metalness={0.75} mirror={0.75} />
        )}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={grid}>
        <planeGeometry args={[160, 160]} />
      </mesh>
    </group>
  )
}
