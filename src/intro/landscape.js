// «Шежіре» пейзажы (three.js-сіз таза canvas — бөлім бетінде де, порталда да қолданылады)
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')] }
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
let _land = null
export function landscapeCanvas() {
  if (_land) return _land
  const W = 1024, Hh = 1024
  const [c, g] = canvas(W, Hh)
  const sky = g.createLinearGradient(0, 0, 0, Hh * 0.55)
  sky.addColorStop(0, '#9cc9ec'); sky.addColorStop(0.6, '#f3e6c8'); sky.addColorStop(1, '#fbeed2')
  g.fillStyle = sky; g.fillRect(0, 0, W, Hh)
  const sun = g.createRadialGradient(W * 0.62, Hh * 0.34, 0, W * 0.62, Hh * 0.34, 260)
  sun.addColorStop(0, 'rgba(255,248,220,1)'); sun.addColorStop(0.25, 'rgba(255,230,170,0.6)'); sun.addColorStop(1, 'rgba(255,230,170,0)')
  g.fillStyle = sun; g.fillRect(0, 0, W, Hh)
  const r = rnd(42)
  const ridge = (y0, amp, col, snow) => {
    g.beginPath(); g.moveTo(0, Hh)
    const pts = []
    for (let x = 0; x <= W; x += 32) { const y = y0 - Math.abs(Math.sin(x * 0.006 + y0) * amp) - r() * amp * 0.35; pts.push([x, y]); g.lineTo(x, y) }
    g.lineTo(W, Hh); g.closePath(); g.fillStyle = col; g.fill()
    if (snow) {
      g.fillStyle = 'rgba(255,255,255,0.85)'
      pts.forEach(([x, y], i) => { if (i && y < y0 - amp * 0.75) { g.beginPath(); g.moveTo(x - 26, y + 34); g.lineTo(x, y); g.lineTo(x + 26, y + 34); g.closePath(); g.fill() } })
    }
  }
  ridge(Hh * 0.47, 150, '#a9bccd', true)
  ridge(Hh * 0.55, 90, '#8ea7b4', false)
  const hill = g.createLinearGradient(0, Hh * 0.55, 0, Hh)
  hill.addColorStop(0, '#9dbb6a'); hill.addColorStop(1, '#5f8a3a')
  g.fillStyle = hill
  g.beginPath(); g.moveTo(0, Hh * 0.62)
  for (let x = 0; x <= W; x += 16) g.lineTo(x, Hh * 0.6 + Math.sin(x * 0.008) * 18)
  g.lineTo(W, Hh); g.lineTo(0, Hh); g.closePath(); g.fill()
  // өзен
  g.strokeStyle = 'rgba(190,225,245,0.95)'; g.lineWidth = 26; g.lineCap = 'round'
  g.beginPath(); g.moveTo(W * 0.2, Hh); g.bezierCurveTo(W * 0.35, Hh * 0.82, W * 0.62, Hh * 0.78, W * 0.55, Hh * 0.64); g.stroke()
  // киіз үйлер
  const yurt = (x, y, s) => {
    g.fillStyle = '#f7f1e6'
    g.beginPath(); g.ellipse(x, y, 46 * s, 30 * s, 0, Math.PI, 0); g.fill()
    g.fillRect(x - 46 * s, y, 92 * s, 30 * s)
    g.strokeStyle = '#b5893f'; g.lineWidth = 3 * s
    g.beginPath(); g.moveTo(x - 46 * s, y + 8 * s); g.lineTo(x + 46 * s, y + 8 * s); g.stroke()
    g.fillStyle = '#8a5a2b'; g.fillRect(x - 8 * s, y + 8 * s, 16 * s, 22 * s)
  }
  yurt(W * 0.68, Hh * 0.7, 1.1); yurt(W * 0.8, Hh * 0.72, 0.8)
  // бәйтерек
  g.fillStyle = '#5b3d22'; g.fillRect(W * 0.24, Hh * 0.55, 14, 110)
  g.fillStyle = '#5d8a35'
  for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(W * 0.245 + (r() - 0.5) * 170, Hh * 0.5 + (r() - 0.5) * 80, 26 + r() * 20, 0, Math.PI * 2); g.fill() }
  _land = c
  return c
}
let _url = null
export function landscapeDataURL() { if (!_url) _url = landscapeCanvas().toDataURL('image/jpeg', 0.85); return _url }
