/**
 * 테트리스 순수 로직 엔진 (Vue/DOM 의존성 없음 → 단위 테스트 가능)
 * - 7-bag 랜덤, 벽 차기(wall kick), 고스트, 홀드, 레벨/점수
 * - 바닥 유예(lock delay): 바닥에 닿아도 0.5초 동안 움직이거나 돌릴 수 있음 (최대 15번 연장)
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
export const LOCK_DELAY = 500
const MAX_RESETS = 15

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
    over: false,
    lockMs: 0, // 바닥에 닿은 뒤 지난 시간
    resets: 0, // 유예 연장 횟수
    dropAcc: 0 // 중력 누적 시간
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
  state.lockMs = 0
  state.resets = 0
  state.dropAcc = 0
  if (collides(state.board, piece.m, piece.x, piece.y)) {
    state.over = true
  }
}

export const grounded = (state) => collides(state.board, state.piece.m, state.piece.x, state.piece.y + 1)

// 바닥에 닿은 상태에서 움직이거나 돌리면 유예 시간을 다시 채움
function extendLock(state) {
  if (state.resets < MAX_RESETS && grounded(state)) {
    state.lockMs = 0
    state.resets++
  }
}

export function move(state, dx, dy) {
  if (state.over) return false
  const p = state.piece
  if (collides(state.board, p.m, p.x + dx, p.y + dy)) return false
  p.x += dx
  p.y += dy
  if (dx) extendLock(state)
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
      extendLock(state)
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

/**
 * 시간 진행 (dt ms). 중력으로 내리고, 바닥 유예가 끝나면 고정
 * 반환: 고정됐으면 지운 줄 수(0 이상), 고정되지 않았으면 -1
 */
export function update(state, dt) {
  if (state.over) return -1
  if (grounded(state)) {
    state.dropAcc = 0
    state.lockMs += dt
    return state.lockMs >= LOCK_DELAY ? lock(state) : -1
  }
  state.lockMs = 0
  state.dropAcc += dt
  const iv = levelInterval(state.level)
  while (state.dropAcc >= iv) {
    state.dropAcc -= iv
    if (!move(state, 0, 1)) { state.dropAcc = 0; break }
  }
  return -1
}

/** 한 칸 내리기 (+1점). 바닥이면 아무것도 안 함 — 고정은 유예 후 */
export function softDrop(state) {
  if (state.over) return false
  if (!move(state, 0, 1)) return false
  state.score += 1
  state.dropAcc = 0
  return true
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
