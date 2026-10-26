// 낙서 박사용 초경량 2D 물리 엔진 (외부 패키지 없음)
//  - 동적 물체: 공(원 1개) / 그린 도형(작은 원 여러 개를 이어 붙인 강체)
//  - 정적 물체: 회전 가능한 직사각형(바닥, 경사면, 벽, 용암)
//  - 충돌 처리: 순차 충격량(sequential impulse) + 마찰 + 위치 보정, 서브스텝으로 터널링 방지

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
let SEQ = 1

export class World {
  constructor({ gravity = 900 } = {}) {
    this.g = gravity
    this.bodies = []
    this.statics = []
    this.time = 0
  }

  addStatic(rect) {
    this.statics.push({ a: 0, ...rect })
  }

  addBall({ x, y, r = 14, tag = '', color = '#4ab3f4', density = 1 }) {
    const m = density * (r / 5) ** 2
    const b = { id: SEQ++, kind: 'ball', tag, color, x, y, a: 0, vx: 0, vy: 0, w: 0, invM: 1 / m, invI: 1 / (0.5 * m * r * r), circles: [{ x: 0, y: 0, r }] }
    this.bodies.push(b)
    return b
  }

  /** 점들의 경로를 작은 원으로 채워 하나의 강체로 만든다 */
  addStroke(points, { r = 5, density = 0.55, color = '#a78bfa' } = {}) {
    const pts = resample(points, r * 1.1)
    const n = pts.length
    const cx = pts.reduce((s, p) => s + p.x, 0) / n
    const cy = pts.reduce((s, p) => s + p.y, 0) / n
    const mc = density
    const m = mc * n
    let I = 0
    pts.forEach((p) => { I += mc * ((p.x - cx) ** 2 + (p.y - cy) ** 2 + 0.5 * r * r) })
    const b = {
      id: SEQ++, kind: 'draw', tag: 'draw', color, x: cx, y: cy, a: 0, vx: 0, vy: 0, w: 0,
      invM: 1 / m, invI: 1 / I, circles: pts.map((p) => ({ x: p.x - cx, y: p.y - cy, r })),
    }
    this.bodies.push(b)
    return b
  }

  step(dt, sub = 6) {
    const h = dt / sub
    for (let s = 0; s < sub; s++) this._sub(h)
    this.time += dt
  }

  _sub(h) {
    const bodies = this.bodies
    for (const b of bodies) {
      b.vy += this.g * h
      b.vx *= 0.9998
      b.w *= 0.9985
    }
    const contacts = this._detect()
    for (let it = 0; it < 10; it++) for (const c of contacts) solve(c)
    for (const b of bodies) {
      b.x += b.vx * h
      b.y += b.vy * h
      b.a += b.w * h
    }
    for (const c of contacts) {
      const { A, B, nx, ny } = c
      const corr = (Math.max(c.pen - 0.02, 0) * 0.5) / (A.invM + (B ? B.invM : 0))
      A.x += nx * corr * A.invM
      A.y += ny * corr * A.invM
      if (B) { B.x -= nx * corr * B.invM; B.y -= ny * corr * B.invM }
    }
  }

  worldCircles(b) {
    const ca = Math.cos(b.a), sa = Math.sin(b.a)
    return b.circles.map((c) => ({ x: b.x + c.x * ca - c.y * sa, y: b.y + c.x * sa + c.y * ca, r: c.r }))
  }

  _detect() {
    const out = []
    const wc = this.bodies.map((b) => this.worldCircles(b))
    this.bodies.forEach((A, i) => {
      wc[i].forEach((c) => {
        for (const rect of this.statics) {
          const hit = circleRect(c.x, c.y, c.r, rect)
          if (hit) out.push({ A, B: null, nx: hit.nx, ny: hit.ny, pen: hit.pen, px: c.x - hit.nx * c.r, py: c.y - hit.ny * c.r })
        }
      })
      for (let j = i + 1; j < this.bodies.length; j++) {
        const B = this.bodies[j]
        for (const c of wc[i]) for (const d of wc[j]) {
          const dx = c.x - d.x, dy = c.y - d.y
          const rr = c.r + d.r
          const d2 = dx * dx + dy * dy
          if (d2 >= rr * rr) continue
          const dist = Math.sqrt(d2) || 1e-6
          const nx = d2 ? dx / dist : 0, ny = d2 ? dy / dist : 1
          out.push({ A, B, nx, ny, pen: rr - dist, px: c.x - nx * c.r, py: c.y - ny * c.r })
        }
      }
    })
    return out
  }

  /** hero가 원/사각형과 닿았는지 */
  touchesCircle(body, cx, cy, r) {
    return this.worldCircles(body).some((c) => (c.x - cx) ** 2 + (c.y - cy) ** 2 <= (c.r + r + 0.5) ** 2)
  }
  touchesBody(a, b) {
    const wa = this.worldCircles(a), wb = this.worldCircles(b)
    return wa.some((c) => wb.some((d) => (c.x - d.x) ** 2 + (c.y - d.y) ** 2 <= (c.r + d.r + 0.5) ** 2))
  }
  touchesRect(body, rect) {
    return this.worldCircles(body).some((c) => circleRect(c.x, c.y, c.r + 0.5, rect))
  }
}

function circleRect(cx, cy, r, rect) {
  const ca = Math.cos(rect.a), sa = Math.sin(rect.a)
  const dx = cx - rect.x, dy = cy - rect.y
  const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca
  const hx = rect.w / 2, hy = rect.h / 2
  const qx = clamp(lx, -hx, hx), qy = clamp(ly, -hy, hy)
  const ex = lx - qx, ey = ly - qy
  const d2 = ex * ex + ey * ey
  if (d2 > r * r) return null
  let nxL, nyL, pen
  if (d2 > 1e-9) { const d = Math.sqrt(d2); nxL = ex / d; nyL = ey / d; pen = r - d }
  else {
    const px = hx - Math.abs(lx), py = hy - Math.abs(ly)
    if (px < py) { nxL = Math.sign(lx) || 1; nyL = 0; pen = r + px } else { nxL = 0; nyL = Math.sign(ly) || 1; pen = r + py }
  }
  return { nx: nxL * ca - nyL * sa, ny: nxL * sa + nyL * ca, pen }
}
export const pointInRect = (x, y, rect, pad = 0) => !!circleRect(x, y, pad, rect) || insideRect(x, y, rect, pad)
function insideRect(x, y, rect, pad) {
  const ca = Math.cos(rect.a), sa = Math.sin(rect.a)
  const dx = x - rect.x, dy = y - rect.y
  const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca
  return Math.abs(lx) <= rect.w / 2 + pad && Math.abs(ly) <= rect.h / 2 + pad
}

function solve({ A, B, nx, ny, px, py }) {
  const raX = px - A.x, raY = py - A.y
  const rbX = B ? px - B.x : 0, rbY = B ? py - B.y : 0
  const rel = () => {
    const ax = A.vx - A.w * raY, ay = A.vy + A.w * raX
    const bx = B ? B.vx - B.w * rbY : 0, by = B ? B.vy + B.w * rbX : 0
    return [ax - bx, ay - by]
  }
  let [rvx, rvy] = rel()
  const vn = rvx * nx + rvy * ny
  if (vn > 0) return
  const raN = raX * ny - raY * nx
  const rbN = B ? rbX * ny - rbY * nx : 0
  const denom = A.invM + raN * raN * A.invI + (B ? B.invM + rbN * rbN * B.invI : 0)
  const e = vn < -60 ? 0.25 : 0
  const j = (-(1 + e) * vn) / denom
  apply(A, B, nx * j, ny * j, raX, raY, rbX, rbY)

  ;[rvx, rvy] = rel()
  const vn2 = rvx * nx + rvy * ny
  let tx = rvx - vn2 * nx, ty = rvy - vn2 * ny
  const tl = Math.hypot(tx, ty)
  if (tl < 1e-6) return
  tx /= tl; ty /= tl
  const raT = raX * ty - raY * tx
  const rbT = B ? rbX * ty - rbY * tx : 0
  const denomT = A.invM + raT * raT * A.invI + (B ? B.invM + rbT * rbT * B.invI : 0)
  const jt = clamp(-(rvx * tx + rvy * ty) / denomT, -0.6 * j, 0.6 * j)
  apply(A, B, tx * jt, ty * jt, raX, raY, rbX, rbY)
}

function apply(A, B, jx, jy, raX, raY, rbX, rbY) {
  A.vx += jx * A.invM; A.vy += jy * A.invM; A.w += (raX * jy - raY * jx) * A.invI
  if (B) { B.vx -= jx * B.invM; B.vy -= jy * B.invM; B.w -= (rbX * jy - rbY * jx) * B.invI }
}

/** 점 경로를 일정 간격으로 촘촘히 채움 */
export function resample(points, gap) {
  if (points.length === 1) return [{ ...points[0] }]
  const out = [{ ...points[0] }]
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1], q = points[i]
    const d = Math.hypot(q.x - p.x, q.y - p.y)
    const n = Math.max(1, Math.ceil(d / gap))
    for (let k = 1; k <= n; k++) out.push({ x: p.x + ((q.x - p.x) * k) / n, y: p.y + ((q.y - p.y) * k) / n })
  }
  return out
}

export const pathLength = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0)
