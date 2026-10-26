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
 *  1) src/games/<name>/XxxGame.vue 작성
 *       props : { mode: 'casual' | 'competitive' }
 *       emits : gameover({ score, meta? })   // 점수는 높을수록 좋게
 *  2) 아래 배열에 한 줄 등록 → 홈 목록 / 랭킹 / 점수 저장이 자동으로 연결됩니다.
 */
const game = (o) => ({ ranked: true, ...o, component: defineAsyncComponent(o.load) })

export const games = [
  game({ id: 'tetris', title: '테트리스', desc: '블록을 쌓아 줄을 지우세요', category: 'puzzle', emoji: '🧩', colors: ['#7c3aed', '#22d3ee'], isNew: true, load: () => import('./tetris/TetrisGame.vue') }),
  game({ id: 'multi-calc', title: '계산x계산해', desc: '빛보다 빠른 사칙연산', category: 'brain', emoji: '🧮', colors: ['#2563eb', '#38bdf8'], load: () => import('./multicalc/MultiCalcGame.vue') }),
  game({ id: 'word-memory', title: '기억x기억해', desc: '단기 기억의 한계에 도전', category: 'brain', emoji: '🧠', colors: ['#0891b2', '#34d399'], load: () => import('./memory/MemoryGame.vue') }),
  game({ id: 'speed-typing', title: '키보드워리어', desc: '누구보다 빠르게 타이핑', category: 'typing', emoji: '⌨️', colors: ['#e11d48', '#fb923c'], load: () => import('./typing/SpeedTypingGame.vue') }),
  game({ id: 'sudoku', title: '스도쿠', desc: '난이도별 클래식 퍼즐', category: 'puzzle', emoji: '🔢', colors: ['#16a34a', '#a3e635'], load: () => import('./sudoku/SudokuGame.vue') }),
  game({ id: '2048', title: '2048', desc: '숫자를 합쳐 2048 만들기', category: 'puzzle', emoji: '🚀', colors: ['#f59e0b', '#f97316'], load: () => import('./g2048/Game2048.vue') }),
  game({ id: 'weight-compare', title: "I'm솔로몬", desc: '지혜로운 무게 비교', category: 'brain', emoji: '⚖️', colors: ['#ca8a04', '#fde047'], load: () => import('./solomon/SolomonGame.vue') }),
  game({ id: 'stroop', title: '색깔능력자', desc: '글자와 색의 함정 탈출', category: 'brain', emoji: '🎨', colors: ['#db2777', '#a855f7'], load: () => import('./stroop/StroopGame.vue') }),
  game({ id: 'pipe', title: '파이프정비기사', desc: '끊어진 길을 연결하세요', category: 'puzzle', emoji: '🔧', colors: ['#0284c7', '#22d3ee'], load: () => import('./pipe/PipeGame.vue') }),
  game({ id: 'block-breaker', title: '벽돌 철거맨', desc: '모든 벽돌을 철거하세요', category: 'arcade', emoji: '🧱', colors: ['#dc2626', '#f472b6'], load: () => import('./breaker/BreakerGame.vue') }),
  game({ id: 'color-link', title: '이어줘! 색줄이', desc: '같은 색 점을 이어 판을 가득 채워요', category: 'puzzle', emoji: '🔗', colors: ['#ec4899', '#6366f1'], isNew: true, load: () => import('./flow/FlowGame.vue') }),
  game({ id: 'three-merge', title: '쓰리쓰리 합체', desc: '1·2·3 타일로 큰 수 만들기', category: 'puzzle', emoji: '3️⃣', colors: ['#06b6d4', '#f43f5e'], isNew: true, load: () => import('./threes/ThreesGame.vue') }),
  game({ id: 'doodle-physics', title: '낙서 물리학자', desc: '그림을 그려 물리 퍼즐을 풀어요', category: 'brain', emoji: '✏️', colors: ['#8b5cf6', '#f59e0b'], isNew: true, load: () => import('./doodle/DoodleGame.vue') }),
  game({ id: 'snake', title: '스네이크 러시', desc: '먹을수록 길어지고 빨라져요', category: 'arcade', emoji: '🐍', colors: ['#059669', '#bef264'], isNew: true, load: () => import('./snake/SnakeGame.vue') }),
  game({ id: 'whack-mole', title: '두더지 소탕작전', desc: '폭탄은 피하고 두더지만 쾅!', category: 'arcade', emoji: '🔨', colors: ['#92400e', '#fb923c'], isNew: true, load: () => import('./mole/MoleGame.vue') }),
  game({ id: 'novel-typing', title: '나는야 타자왕', desc: '단편 문학 타자 연습', category: 'typing', emoji: '📙', colors: ['#b45309', '#fbbf24'], load: () => import('./novel/NovelTypingGame.vue') }),
]

export const getGame = (id) => games.find((g) => g.id === id)
export const rankedGames = games.filter((g) => g.ranked)
