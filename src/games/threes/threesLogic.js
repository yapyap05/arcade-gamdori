// 쓰리쓰리 합체 — 순수 로직
export const N = 4
const DIRS = { L: [0, -1], R: [0, 1], U: [-1, 0], D: [1, 0] }

export const canMerge = (a, b) => (a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b)
// 1·2 는 0점, 3 이상은 3^(log2(v/3)+1) 점 (원작 Threes 방식)
export const tileScore = (v) => (v < 3 ? 0 : Math.round(3 ** (Math.log2(v / 3) + 1)))
export const boardScore = (grid) => grid.reduce((s, t) => s + (t ? tileScore(t.val) : 0), 0)

/**
 * 한 번 밀면 모든 타일이 "한 칸씩만" 움직인다. 빈칸이면 이동, 합쳐질 수 있으면 합체.
 * grid: 길이 16 배열(타일 {id,val} 또는 null) — 제자리에서 수정
 * 반환: { moved, lanes(움직인 줄 번호), absorbed:[{tile, r, c}] (합쳐져서 사라진 타일과 흡수된 위치) }
 */
export function move(grid, dir) {
  const [dr, dc] = DIRS[dir]
  const rows = [...Array(N).keys()]
  const cols = [...Array(N).keys()]
  const rOrder = dr > 0 ? rows.reverse() : rows
  const cOrder = dc > 0 ? cols.reverse() : cols
  const lanes = new Set()
  const absorbed = []
  const lockedIds = new Set() // 이번 이동에서 이미 합쳐진 타일은 또 합쳐지지 않음
  for (const r of rOrder) for (const c of cOrder) {
    const t = grid[r * N + c]
    if (!t) continue
    const nr = r + dr, nc = c + dc
    if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
    const target = grid[nr * N + nc]
    if (!target) {
      grid[nr * N + nc] = t; grid[r * N + c] = null
      lanes.add(dr === 0 ? r : c)
    } else if (!lockedIds.has(target.id) && canMerge(target.val, t.val)) {
      target.val += t.val
      lockedIds.add(target.id)
      grid[r * N + c] = null
      absorbed.push({ tile: t, r: nr, c: nc })
      lanes.add(dr === 0 ? r : c)
    }
  }
  return { moved: lanes.size > 0, lanes: [...lanes], absorbed }
}

export function canMoveDir(grid, dir) {
  const [dr, dc] = DIRS[dir]
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const t = grid[r * N + c]
    if (!t) continue
    const nr = r + dr, nc = c + dc
    if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
    const target = grid[nr * N + nc]
    if (!target || canMerge(target.val, t.val)) return true
  }
  return false
}
export const canMoveAny = (grid) => ['L', 'R', 'U', 'D'].some((d) => canMoveDir(grid, d))

/** 새 타일이 들어올 칸: 밀어낸 반대편 가장자리, 움직인 줄 중 빈 곳 */
export function entryCells(dir, lanes) {
  return lanes.map((l) => (dir === 'L' ? [l, N - 1] : dir === 'R' ? [l, 0] : dir === 'U' ? [N - 1, l] : [0, l]))
}

export function shuffle(a) {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]] }
  return x
}

/** 다음 타일 뽑기: 1·2·3 각 4장 덱. 48 이상이 나오면 1/21 확률로 보너스 타일(6 ~ 최대/8) */
export function makeDeck() {
  let deck = []
  return function draw(grid) {
    const maxV = Math.max(0, ...grid.filter(Boolean).map((t) => t.val))
    if (maxV >= 48 && Math.random() < 1 / 21) {
      const bonus = []
      for (let v = 6; v <= maxV / 8; v *= 2) bonus.push(v)
      if (bonus.length) return { val: bonus[Math.floor(Math.random() * bonus.length)], bonus: true }
    }
    if (!deck.length) deck = shuffle([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3])
    return { val: deck.pop(), bonus: false }
  }
}
