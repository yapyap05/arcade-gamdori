/**
 * 게임별 점수 상한 (랭킹에 저장할 수 있는 최대 점수)
 * ⚠ firestore.rules 의 maxScores() 와 반드시 같은 값으로 유지하세요.
 * 정상 플레이가 거부되지 않도록 이론상 최고점보다 넉넉하게 잡은 값이에요.
 */
export const SCORE_LIMITS = {
  tetris: 9999999,
  'multi-calc': 20000,
  'word-memory': 20000,
  'speed-typing': 20000,
  sudoku: 3000,
  2048: 5000000,
  'weight-compare': 10000,
  stroop: 200000,
  pipe: 2000000,
  'block-breaker': 5000000,
  'color-link': 2000000,
  'doodle-physics': 20000,
  snake: 200000,
  'whack-mole': 2000000,
  'novel-typing': 200000,
}

export const MODES = ['casual', 'competitive']
