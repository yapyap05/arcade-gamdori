import { defineAsyncComponent } from 'vue'

export const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'puzzle', label: '퍼즐' },
  { id: 'brain', label: '두뇌' },
  { id: 'arcade', label: '아케이드' },
  { id: 'typing', label: '타자' },
]

/**
 * 게임 추가 방법
 *  1) src/games/<name>/XxxGame.vue 작성 — 공통 레이아웃 GameScreen 사용
 *       props : { mode: 'casual' | 'competitive' }
 *       emits : gameover({ score, meta? })   // 점수는 높을수록 좋게
 *  2) 아래 배열에 한 줄 등록 → 홈 목록 / 랭킹 / 점수 저장이 자동으로 연결됩니다.
 *  3) 도트 아이콘: games/pixelIcons.js 에 id 와 같은 이름으로 추가
 *     튜토리얼: games/tutorials.js 에 id 로 추가
 *  pausable : 공통 타이머(kit) 기반이라 일시정지가 동작하는 게임
 */
const game = (o) => ({ ranked: true, pausable: false, ...o, component: defineAsyncComponent(o.load) })

export const games = [
  game({ id: 'tetris', title: '테트리스', desc: '블록을 쌓아 줄을 지우세요', category: 'puzzle', isNew: true, load: () => import('./tetris/TetrisGame.vue') }),
  game({ id: 'multi-calc', title: '계산x계산해', desc: '빛보다 빠른 사칙연산', category: 'brain', pausable: true, load: () => import('./multicalc/MultiCalcGame.vue') }),
  game({ id: 'word-memory', title: '기억x기억해', desc: '단기 기억의 한계에 도전', category: 'brain', pausable: true, load: () => import('./memory/MemoryGame.vue') }),
  game({ id: 'speed-typing', title: '키보드워리어', desc: '누구보다 빠르게 타이핑', category: 'typing', load: () => import('./typing/SpeedTypingGame.vue') }),
  game({ id: 'sudoku', title: '스도쿠', desc: '난이도별 클래식 퍼즐', category: 'puzzle', pausable: true, load: () => import('./sudoku/SudokuGame.vue') }),
  game({ id: '2048', title: '2048', desc: '숫자를 합쳐 2048 만들기', category: 'puzzle', pausable: true, load: () => import('./g2048/Game2048.vue') }),
  game({ id: 'weight-compare', title: "I'm솔로몬", desc: '지혜로운 무게 비교', category: 'brain', pausable: true, load: () => import('./solomon/SolomonGame.vue') }),
  game({ id: 'stroop', title: '색깔능력자', desc: '글자와 색의 함정 탈출', category: 'brain', pausable: true, load: () => import('./stroop/StroopGame.vue') }),
  game({ id: 'pipe', title: '파이프정비기사', desc: '끊어진 길을 연결하세요', category: 'puzzle', pausable: true, load: () => import('./pipe/PipeGame.vue') }),
  game({ id: 'block-breaker', title: '벽돌 철거맨', desc: '모든 벽돌을 철거하세요', category: 'arcade', load: () => import('./breaker/BreakerGame.vue') }),
  game({ id: 'color-link', title: '이어줘! 색줄이', desc: '같은 색 점을 이어 판을 가득 채워요', category: 'puzzle', isNew: true, pausable: true, load: () => import('./flow/FlowGame.vue') }),
  game({ id: 'doodle-physics', title: '낙서 물리학자', desc: '그림을 그려 물리 퍼즐을 풀어요', category: 'brain', isNew: true, load: () => import('./doodle/DoodleGame.vue') }),
  game({ id: 'snake', title: '스네이크 러시', desc: '먹을수록 길어지고 빨라져요', category: 'arcade', isNew: true, load: () => import('./snake/SnakeGame.vue') }),
  game({ id: 'whack-mole', title: '두더지 소탕작전', desc: '폭탄은 피하고 두더지만 쾅!', category: 'arcade', isNew: true, load: () => import('./mole/MoleGame.vue') }),
  game({ id: 'novel-typing', title: '나는야 타자왕', desc: '단편 문학 타자 연습', category: 'typing', load: () => import('./novel/NovelTypingGame.vue') }),
]

export const getGame = (id) => games.find((g) => g.id === id)
export const rankedGames = games.filter((g) => g.ranked)
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? ''
