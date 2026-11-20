import { provide, inject, reactive } from 'vue'

/**
 * 게임 공통 상태 (GameView 가 제공, 게임 공통 부품이 사용)
 *  game     : registry 의 게임 정보
 *  playing  : 게임이 진행 중인지 (GameScreen 이 갱신)
 *  paused   : 일시정지 중인지 (GameView 가 갱신) → 타이머·지연 실행·키 입력이 자동으로 멈춤
 *  quitting : '그만하기'로 끝났는지 → 이번 판 점수는 기록하지 않음
 */
const KEY = Symbol('game-ctx')

const blank = () => reactive({ game: null, playing: false, paused: false, quitting: false })

export function provideGameCtx(game) {
  const ctx = blank()
  ctx.game = game
  provide(KEY, ctx)
  return ctx
}

export function useGameCtx() {
  return inject(KEY, null) ?? blank()
}
