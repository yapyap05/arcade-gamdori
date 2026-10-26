// 이어줘! 색줄이 — 순수 로직 (화면과 분리해서 테스트 가능)

export const rowCol = (n, idx) => [Math.floor(idx / n), idx % n]

export function neighbors(n, idx) {
  const [r, c] = rowCol(n, idx)
  const out = []
  if (r > 0) out.push(idx - n)
  if (r < n - 1) out.push(idx + n)
  if (c > 0) out.push(idx - 1)
  if (c < n - 1) out.push(idx + 1)
  return out
}

// 뱀 모양 경로에서 시작해 "backbite" 로 무작위로 섞은 해밀턴 경로 (모든 칸을 한 번씩 지나는 경로)
function randomHamiltonian(n) {
  const N = n * n
  let p = []
  for (let r = 0; r < n; r++) for (let i = 0; i < n; i++) p.push(r * n + (r % 2 === 0 ? i : n - 1 - i))
  for (let it = 0; it < N * 30; it++) {
    if (Math.random() < 0.5) p.reverse()
    const last = p[N - 1]
    const prev = p[N - 2]
    const cand = neighbors(n, last).filter((x) => x !== prev)
    const q = cand[Math.floor(Math.random() * cand.length)]
    const j = p.indexOf(q)
    p = [...p.slice(0, j + 1), ...p.slice(j + 1).reverse()]
  }
  return p
}

/** 반드시 풀 수 있는 레벨: 해밀턴 경로를 k조각으로 잘라 양 끝을 점으로 만든다 */
export function generateLevel(n, k) {
  const N = n * n
  const path = randomHamiltonian(n)
  const minLen = N >= k * 3 ? 3 : 2
  const lens = Array(k).fill(minLen)
  let rest = N - minLen * k
  while (rest-- > 0) lens[Math.floor(Math.random() * k)]++
  let pos = 0
  const pairs = lens.map((len, i) => {
    const seg = path.slice(pos, pos + len)
    pos += len
    return { k: i, a: seg[0], b: seg[len - 1], solution: seg }
  })
  return { n, pairs }
}

export function createState(level) {
  const { n, pairs } = level
  const dotColor = Array(n * n).fill(-1)
  const paths = {}
  pairs.forEach((p) => { dotColor[p.a] = p.k; dotColor[p.b] = p.k; paths[p.k] = [] })
  return { n, dotColor, paths, colors: pairs.length }
}

export function ownerMap(s) {
  const o = Array(s.n * s.n).fill(-1)
  for (const k in s.paths) s.paths[k].forEach((i) => (o[i] = Number(k)))
  return o
}

export function isComplete(s, k) {
  const p = s.paths[k]
  return p.length >= 2 && s.dotColor[p[p.length - 1]] === k && p[p.length - 1] !== p[0]
}

/** 손가락을 댄 칸에서 선 시작. 점이면 그 점에서 새로 시작, 선 위면 거기까지 남기고 이어 그리기. 색 번호(없으면 -1) */
export function startPath(s, idx) {
  if (s.dotColor[idx] >= 0) {
    const k = s.dotColor[idx]
    s.paths[k] = [idx]
    return k
  }
  const k = ownerMap(s)[idx]
  if (k < 0) return -1
  s.paths[k] = s.paths[k].slice(0, s.paths[k].indexOf(idx) + 1)
  return k
}

/** k번 선을 인접한 칸 next 로 한 칸 확장(또는 되돌리기). 성공 여부 */
export function stepInto(s, k, next) {
  const p = s.paths[k]
  if (!p.length) return false
  if (p.length >= 2 && p[p.length - 2] === next) { p.pop(); return true } // 되돌리기
  if (isComplete(s, k)) return false // 완성된 선은 더 못 뻗음
  const dc = s.dotColor[next]
  if (dc >= 0 && dc !== k) return false // 다른 색 점은 통과 불가
  const i = p.indexOf(next)
  if (i >= 0) { s.paths[k] = p.slice(0, i + 1); return true } // 자기 선을 밟으면 거기까지 잘라냄
  for (const o in s.paths) { // 다른 색 선은 끊고 지나감
    if (Number(o) === k) continue
    const j = s.paths[o].indexOf(next)
    if (j > 0) s.paths[o] = s.paths[o].slice(0, j)
  }
  p.push(next)
  return true
}

export function isSolved(s) {
  const ks = Object.keys(s.paths)
  if (!ks.every((k) => isComplete(s, Number(k)))) return false
  const covered = new Set()
  ks.forEach((k) => s.paths[k].forEach((i) => covered.add(i)))
  return covered.size === s.n * s.n
}
