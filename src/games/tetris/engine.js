/**
 * 테트리스 순수 로직 엔진 (Vue/DOM 의존성 없음 → 단위 테스트 가능)
 * - 7-bag 랜덤, 벽 차기(wall kick), 고스트, 홀드, 레벨/점수
 */
export const COLS = 10
export const ROWS = 20

const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
}
export const TYPES = Object.keys(SHAPES)
export const shapeOf = (type) => SHAPES[type].map((r) => [...r])

const LINE_SCORE = [0, 100, 300, 500, 800]
const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]]

const rotateCW = (m) => m[0].map((_, c) => m.map((row) => row[c]).reverse())

function newBag(rng) {
  const bag = [...TYPES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

export function collides(board, m, x, y) {
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue
      const nx = x + c
      const ny = y + r
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true
      if (ny >= 0 && board[ny][nx]) return true
    }
  }
  return false
}

export function levelInterval(level) {
  return Math.max(90, 800 - (level - 1) * 70)
}

export function createGame(rng = Math.random) {
  const state = {
    rng,
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    piece: null,
    queue: [],
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    over: false
  }
  refill(state)
  spawn(state, nextType(state))
  return state
}

function refill(state) {
  while (state.queue.length < 7) state.queue.push(...newBag(state.rng))
}
function nextType(state) {
  const t = state.queue.shift()
  refill(state)
  return t
}

function spawn(state, type) {
  const m = shapeOf(type)
  const piece = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 }
  state.piece = piece
  if (collides(state.board, piece.m, piece.x, piece.y)) {
    state.over = true
  }
}

export function move(state, dx, dy) {
  if (state.over) return false
  const p = state.piece
  if (collides(state.board, p.m, p.x + dx, p.y + dy)) return false
  p.x += dx
  p.y += dy
  return true
}

export function rotate(state, dir = 1) {
  if (state.over) return false
  const p = state.piece
  let m = p.m
  for (let i = 0; i < (dir > 0 ? 1 : 3); i++) m = rotateCW(m)
  for (const [kx, ky] of KICKS) {
    if (!collides(state.board, m, p.x + kx, p.y + ky)) {
      p.m = m
      p.x += kx
      p.y += ky
      return true
    }
  }
  return false
}

function lock(state) {
  const { board, piece } = state
  for (let r = 0; r < piece.m.length; r++) {
    for (let c = 0; c < piece.m[r].length; c++) {
      if (!piece.m[r][c]) continue
      const y = piece.y + r
      if (y < 0) {
        state.over = true
        return 0
      }
      board[y][piece.x + c] = piece.type
    }
  }
  // 줄 삭제
  let cleared = 0
  for (let r = ROWS - 1; r >= 0; ) {
    if (board[r].every(Boolean)) {
      board.splice(r, 1)
      board.unshift(Array(COLS).fill(0))
      cleared++
    } else r--
  }
  if (cleared) {
    state.score += LINE_SCORE[cleared] * state.level
    state.lines += cleared
    state.level = Math.floor(state.lines / 10) + 1
  }
  state.canHold = true
  spawn(state, nextType(state))
  return cleared
}

/** 중력 1칸. 바닥이면 고정하고 지운 줄 수를 반환 */
export function tick(state) {
  if (state.over) return 0
  if (move(state, 0, 1)) return 0
  return lock(state)
}

export function softDrop(state) {
  if (state.over) return
  if (move(state, 0, 1)) state.score += 1
  else lock(state)
}

export function hardDrop(state) {
  if (state.over) return 0
  let n = 0
  while (move(state, 0, 1)) n++
  state.score += n * 2
  return lock(state)
}

export function holdPiece(state) {
  if (state.over || !state.canHold) return false
  const cur = state.piece.type
  if (state.hold) {
    const swap = state.hold
    state.hold = cur
    spawn(state, swap)
  } else {
    state.hold = cur
    spawn(state, nextType(state))
  }
  state.canHold = false
  return true
}

export function ghostY(state) {
  const p = state.piece
  let y = p.y
  while (!collides(state.board, p.m, p.x, y + 1)) y++
  return y
}

export function previewTypes(state, n = 3) {
  return state.queue.slice(0, n)
}
