// Процедуралық текстуралар: голографиялық панельдер, сақиналар, платформа оюы, жазулар
import * as THREE from 'three'

const CY = '0,217,255'
const TE = '25,230,210'
const GO = '255,199,106'

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  if (repeat) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(repeat, 1) }
  return t
}
function rnd(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Голографиялық аналитика панелі
export function panelTexture(kind, seed = 1) {
  const W = 512, H = 320
  const [c, g] = canvas(W, H)
  const r = rnd(seed * 97 + 3)
  // рамка
  g.strokeStyle = `rgba(${CY},0.75)`
  g.lineWidth = 2
  g.strokeRect(4, 4, W - 8, H - 8)
  g.fillStyle = `rgba(${CY},0.06)`
  g.fillRect(4, 4, W - 8, H - 8)
  // бұрыштар
  g.lineWidth = 5
  ;[[4, 4, 1, 1], [W - 4, 4, -1, 1], [4, H - 4, 1, -1], [W - 4, H - 4, -1, -1]].forEach(([x, y, sx, sy]) => {
    g.beginPath(); g.moveTo(x + sx * 30, y); g.lineTo(x, y); g.lineTo(x, y + sy * 30); g.stroke()
  })
  // тақырып сызықтары
  g.fillStyle = `rgba(${CY},0.8)`
  g.fillRect(20, 20, 140, 8)
  g.fillStyle = `rgba(${CY},0.35)`
  g.fillRect(20, 34, 90, 5)
  g.fillRect(W - 120, 20, 100, 5)
  const x0 = 24, y0 = 60, w = W - 48, h = H - 90
  g.lineWidth = 2
  if (kind === 'bars') {
    const n = 14
    for (let i = 0; i < n; i++) {
      const bh = (0.2 + r() * 0.8) * h
      const grd = g.createLinearGradient(0, y0 + h - bh, 0, y0 + h)
      grd.addColorStop(0, `rgba(${CY},0.95)`)
      grd.addColorStop(1, `rgba(${CY},0.15)`)
      g.fillStyle = grd
      g.fillRect(x0 + (i * w) / n + 4, y0 + h - bh, w / n - 10, bh)
    }
  } else if (kind === 'line') {
    for (let k = 0; k < 2; k++) {
      g.strokeStyle = k ? `rgba(${GO},0.85)` : `rgba(${CY},0.95)`
      g.beginPath()
      let y = y0 + h * (0.3 + r() * 0.4)
      for (let i = 0; i <= 24; i++) {
        y = Math.min(y0 + h, Math.max(y0, y + (r() - 0.5) * h * 0.25))
        const x = x0 + (i / 24) * w
        i ? g.lineTo(x, y) : g.moveTo(x, y)
      }
      g.stroke()
    }
    g.strokeStyle = `rgba(${CY},0.15)`
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x0, y0 + (i * h) / 5); g.lineTo(x0 + w, y0 + (i * h) / 5); g.stroke() }
  } else if (kind === 'net') {
    const pts = Array.from({ length: 16 }, () => [x0 + r() * w, y0 + r() * h])
    g.strokeStyle = `rgba(${CY},0.45)`
    pts.forEach((a, i) => pts.forEach((b, j) => {
      if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 150) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke() }
    }))
    pts.forEach(([x, y], i) => {
      g.fillStyle = i % 5 === 0 ? `rgba(${GO},1)` : `rgba(${CY},1)`
      g.beginPath(); g.arc(x, y, i % 5 === 0 ? 6 : 4, 0, Math.PI * 2); g.fill()
    })
  } else if (kind === 'globe') {
    const cx = W / 2, cy = y0 + h / 2, R = h / 2 - 4
    g.strokeStyle = `rgba(${CY},0.8)`
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke()
    g.strokeStyle = `rgba(${CY},0.4)`
    for (let i = 1; i < 6; i++) { g.beginPath(); g.ellipse(cx, cy, R * Math.sin((i * Math.PI) / 6), R, 0, 0, Math.PI * 2); g.stroke() }
    for (let i = 1; i < 6; i++) { const yy = cy - R + (i * 2 * R) / 6; const rr = Math.sqrt(R * R - (yy - cy) ** 2); g.beginPath(); g.moveTo(cx - rr, yy); g.lineTo(cx + rr, yy); g.stroke() }
  } else if (kind === 'radar') {
    const cx = W / 2, cy = y0 + h / 2
    g.strokeStyle = `rgba(${TE},0.6)`
    for (let i = 1; i <= 4; i++) { g.beginPath(); g.arc(cx, cy, (i * h) / 9, 0, Math.PI * 2); g.stroke() }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * h * 0.45, cy + Math.sin(a) * h * 0.45); g.stroke() }
    g.fillStyle = `rgba(${CY},0.25)`
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, h * 0.45, -0.3, 0.6); g.fill()
  } else {
    // кесте
    g.fillStyle = `rgba(${CY},0.6)`
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
      g.globalAlpha = 0.3 + r() * 0.7
      g.fillRect(x0 + j * (w / 4), y0 + i * (h / 9), (w / 4 - 14) * (0.3 + r() * 0.7), 6)
    }
    g.globalAlpha = 1
  }
  return tex(c)
}

// Энергия сақинасы: жіңішке сызық + цифрлық бөліктер
export function ringTexture(seed = 1) {
  const W = 2048, H = 64
  const [c, g] = canvas(W, H)
  const r = rnd(seed)
  const grd = g.createLinearGradient(0, 0, 0, H)
  grd.addColorStop(0, `rgba(${CY},0)`)
  grd.addColorStop(0.5, `rgba(${CY},0.35)`)
  grd.addColorStop(1, `rgba(${CY},0)`)
  g.fillStyle = grd
  g.fillRect(0, 0, W, H)
  g.fillStyle = `rgba(${CY},0.95)`
  g.fillRect(0, H / 2 - 1.5, W, 3)
  for (let x = 0; x < W; x += 16) {
    const big = x % 128 === 0
    g.fillStyle = `rgba(${CY},${big ? 0.9 : 0.45})`
    g.fillRect(x, big ? 8 : 20, 2, big ? H - 16 : H - 40)
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `rgba(${GO},0.95)`
    g.fillRect(r() * W, H / 2 - 3, 40 + r() * 80, 6)
  }
  return tex(c, 1)
}

// Платформаның гравировкасы: шеңберлер, радиалды сызықтар, қошқар мүйіз элементтері
export function platformTexture() {
  const S = 1024
  const [c, g] = canvas(S, S)
  const m = S / 2
  g.translate(m, m)
  g.strokeStyle = `rgba(${CY},0.55)`
  g.lineWidth = 2
  ;[0.98, 0.9, 0.72, 0.7, 0.5, 0.48, 0.3].forEach((k) => { g.beginPath(); g.arc(0, 0, m * k, 0, Math.PI * 2); g.stroke() })
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2
    const k1 = i % 6 === 0 ? 0.72 : 0.9
    g.beginPath(); g.moveTo(Math.cos(a) * m * k1, Math.sin(a) * m * k1); g.lineTo(Math.cos(a) * m * 0.98, Math.sin(a) * m * 0.98); g.stroke()
  }
  // қошқар мүйіз — 12 рет қайталанатын спираль
  g.strokeStyle = `rgba(${TE},0.6)`
  g.lineWidth = 3
  for (let i = 0; i < 12; i++) {
    g.save()
    g.rotate((i / 12) * Math.PI * 2)
    g.translate(0, -m * 0.6)
    g.beginPath()
    for (let s = -1; s <= 1; s += 2) {
      g.moveTo(0, 18)
      g.bezierCurveTo(s * 10, -10, s * 40, -20, s * 34, 4)
      g.bezierCurveTo(s * 30, 18, s * 16, 10, s * 20, 0)
    }
    g.stroke()
    g.restore()
  }
  g.strokeStyle = `rgba(${GO},0.7)`
  g.lineWidth = 3
  g.beginPath(); g.arc(0, 0, m * 0.3, 0, Math.PI * 2); g.stroke()
  return tex(c)
}

// 3D-жазу (бұтақ түйіндері үшін)
export function labelTexture(text, color) {
  const [c, g] = canvas(512, 128)
  g.font = '700 54px Inter, "Segoe UI", Roboto, Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.shadowColor = color
  g.shadowBlur = 24
  g.fillStyle = '#ffffff'
  g.fillText(text, 256, 64)
  g.shadowBlur = 0
  g.strokeStyle = color
  g.lineWidth = 2
  g.strokeRect(40, 18, 432, 92)
  return tex(c)
}

// Жұмсақ дөңгелек жарқыл
export function glowTexture() {
  const [c, g] = canvas(128, 128)
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return tex(c)
}
