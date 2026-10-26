// 낙서 물리학자 레벨 데이터 (월드 크기 360x540, y축은 아래 방향)
export const W = 360
export const H = 540
export const BALL_R = 14

const FLOOR = { x: 180, y: 535, w: 420, h: 50, a: 0 } // 윗면 y=510

/**
 * goal: 'touch' = 빨간 공과 파란 공이 닿으면 클리어 / 'star' = 빨간 공이 별에 닿으면 클리어
 * statics: 고정 구조물 {x,y,w,h,a(라디안, +는 시계방향)}
 * ink: 사용할 수 있는 잉크 (고정 선은 1.5배 소모)
 */
export const LEVELS = [
  {
    name: '다리 놓기',
    hint: '두 공이 서로 굴러와 만나게 구멍을 메워 보세요',
    ink: 450, goal: 'touch',
    statics: [{ x: 65, y: 300, w: 130, h: 14, a: 0.14 }, { x: 295, y: 300, w: 130, h: 14, a: -0.14 }, FLOOR],
    balls: [{ id: 'red', x: 50, y: 274 }, { id: 'blue', x: 310, y: 274 }],
  },
  {
    name: '내리막 연결',
    hint: '높이가 다른 두 발판 사이를 이어 보세요',
    ink: 520, goal: 'touch',
    statics: [{ x: 60, y: 250, w: 120, h: 14, a: 0.12 }, { x: 300, y: 380, w: 140, h: 14, a: -0.1 }, FLOOR],
    balls: [{ id: 'red', x: 40, y: 226 }, { id: 'blue', x: 290, y: 360 }],
  },
  {
    name: '기둥 위의 파랑이',
    hint: '떨어지는 빨간 공을 파란 공 쪽으로 보내 보세요',
    ink: 480, goal: 'touch',
    statics: [{ x: 110, y: 420, w: 24, h: 180, a: 0 }, FLOOR],
    balls: [{ id: 'red', x: 260, y: 80 }, { id: 'blue', x: 110, y: 316 }],
  },
  {
    name: '지붕 아래 별',
    hint: '빨간 공을 지붕 아래의 별까지 굴려 보내세요',
    ink: 520, goal: 'star',
    statics: [{ x: 300, y: 432, w: 110, h: 14, a: 0 }, FLOOR],
    balls: [{ id: 'red', x: 60, y: 60 }],
    star: { x: 300, y: 488 },
  },
  {
    name: '먼 기둥',
    hint: '멀리 있는 기둥 위의 파란 공까지 닿게 하세요',
    ink: 560, goal: 'touch',
    statics: [{ x: 300, y: 420, w: 24, h: 180, a: 0 }, FLOOR],
    balls: [{ id: 'red', x: 60, y: 60 }, { id: 'blue', x: 300, y: 316 }],
  },
]
