// 낙서물리학자 스테이지 데이터 (월드 크기 360x540, y축은 아래 방향, 바닥 윗면 y=510)
export const W = 360
export const H = 540
export const BALL_R = 14

const FLOOR = { x: 180, y: 535, w: 420, h: 50, a: 0 }

/**
 * goal
 *   touch : 빨간 공과 파란 공이 닿으면 클리어
 *   star  : 빨간 공이 별(star)에 닿으면 클리어
 *   stars : 빨간 공이 별(stars) 을 모두 지나가면 클리어
 *   cup   : 빨간 공이 컵(cup) 안에 들어가면 클리어
 * 구성 요소 (모두 선택)
 *   statics : 고정 발판 {x,y,w,h,a(라디안, +는 시계방향)}
 *   pegs    : 고정 원형 기둥 {x,y,r}
 *   crates  : 밀리고 떨어지는 나무 상자 {x,y,w,h}
 *   seesaws : 가운데가 고정된 시소 {x,y,w}
 *   spikes  : 공이 닿으면 실패 {x,y,w,h}
 *   cup     : U자 컵 {x,y(중심),w,h}
 * ink : 사용할 수 있는 잉크 (고정 선은 1.5배 소모)
 *
 * 물리는 첫 선을 그린 순간부터 움직이므로, 공은 처음 위치에 멈춰 있다가 출발
 */
export const LEVELS = [
  // ───── 기본 ─────
  {
    name: '다리 놓기', hint: '두 공이 서로 굴러와 만나게 구멍을 메워 보세요',
    ink: 450, goal: 'touch',
    statics: [{ x: 65, y: 300, w: 130, h: 14, a: 0.14 }, { x: 295, y: 300, w: 130, h: 14, a: -0.14 }, FLOOR],
    balls: [{ id: 'red', x: 50, y: 274 }, { id: 'blue', x: 310, y: 274 }],
  },
  {
    name: '내리막 연결', hint: '높이가 다른 두 발판 사이를 이어 보세요',
    ink: 520, goal: 'touch',
    statics: [{ x: 60, y: 250, w: 120, h: 14, a: 0.12 }, { x: 300, y: 380, w: 140, h: 14, a: -0.1 }, FLOOR],
    balls: [{ id: 'red', x: 40, y: 226 }, { id: 'blue', x: 290, y: 360 }],
  },
  {
    name: '기둥 위의 파랑이', hint: '떨어지는 빨간 공을 파란 공 쪽으로 보내 보세요',
    ink: 520, goal: 'touch',
    statics: [{ x: 110, y: 420, w: 24, h: 180, a: 0 }, FLOOR],
    balls: [{ id: 'red', x: 260, y: 80 }, { id: 'blue', x: 110, y: 316 }],
  },
  {
    name: '지붕 아래 별', hint: '빨간 공을 지붕 아래의 별까지 굴려 보내세요',
    ink: 540, goal: 'star',
    statics: [{ x: 300, y: 432, w: 110, h: 14, a: 0 }, FLOOR],
    balls: [{ id: 'red', x: 60, y: 60 }],
    star: { x: 300, y: 488 },
  },
  {
    name: '먼 기둥', hint: '멀리 있는 기둥 위의 파란 공까지 닿게 하세요',
    ink: 580, goal: 'touch',
    statics: [{ x: 300, y: 420, w: 24, h: 180, a: 0 }, FLOOR],
    balls: [{ id: 'red', x: 60, y: 60 }, { id: 'blue', x: 300, y: 316 }],
  },

  // ───── 컵 넣기 ─────
  {
    name: '컵으로 골인', hint: '빨간 공을 오른쪽 컵 안에 넣어 보세요',
    ink: 500, goal: 'cup',
    statics: [{ x: 75, y: 170, w: 150, h: 14, a: 0.18 }, FLOOR],
    balls: [{ id: 'red', x: 30, y: 138 }],
    cup: { x: 285, y: 477, w: 90, h: 56 },
  },
  {
    name: '벽 너머 컵', hint: '가운데 벽을 넘어서 컵에 넣어 보세요',
    ink: 560, goal: 'cup',
    statics: [{ x: 70, y: 140, w: 140, h: 14, a: 0.12 }, { x: 190, y: 420, w: 20, h: 180, a: 0 }, FLOOR],
    balls: [{ id: 'red', x: 30, y: 112 }],
    cup: { x: 290, y: 477, w: 90, h: 56 },
  },
  {
    name: '기둥 숲', hint: '기둥 사이로 떨어지는 공을 왼쪽 컵에 모아 보세요',
    ink: 560, goal: 'cup',
    statics: [{ x: 300, y: 92, w: 70, h: 12, a: -0.2 }, FLOOR],
    pegs: [{ x: 120, y: 200, r: 14 }, { x: 240, y: 200, r: 14 }, { x: 180, y: 280, r: 14 }, { x: 80, y: 340, r: 14 }, { x: 280, y: 340, r: 14 }],
    balls: [{ id: 'red', x: 310, y: 66 }],
    cup: { x: 80, y: 477, w: 90, h: 56 },
  },
  {
    name: '높은 컵', hint: '받침대 위에 놓인 컵까지 보내 보세요',
    ink: 580, goal: 'cup',
    statics: [{ x: 70, y: 110, w: 140, h: 14, a: 0.12 }, { x: 290, y: 340, w: 140, h: 14, a: 0 }, FLOOR],
    balls: [{ id: 'red', x: 30, y: 82 }],
    cup: { x: 290, y: 305, w: 90, h: 56 },
  },

  // ───── 별 모으기 ─────
  {
    name: '별 두 개', hint: '빨간 공이 별 두 개를 모두 지나가게 하세요',
    ink: 560, goal: 'stars',
    statics: [{ x: 60, y: 120, w: 120, h: 14, a: 0.15 }, FLOOR],
    balls: [{ id: 'red', x: 25, y: 92 }],
    stars: [{ x: 190, y: 260 }, { x: 300, y: 420 }],
  },
  {
    name: '지그재그 별', hint: '좌우로 꺾이는 길을 그려 별 세 개를 모으세요',
    ink: 660, goal: 'stars',
    statics: [{ x: 180, y: 90, w: 90, h: 12, a: 0.2 }, FLOOR],
    balls: [{ id: 'red', x: 160, y: 62 }],
    stars: [{ x: 90, y: 240 }, { x: 270, y: 330 }, { x: 110, y: 440 }],
  },
  {
    name: '높이 차 별', hint: '오른쪽 위 별을 먼저, 왼쪽 아래 별을 나중에',
    ink: 600, goal: 'stars',
    statics: [{ x: 300, y: 110, w: 120, h: 14, a: -0.15 }, FLOOR],
    balls: [{ id: 'red', x: 335, y: 80 }],
    stars: [{ x: 290, y: 200 }, { x: 70, y: 430 }],
  },

  // ───── 장애물 ─────
  {
    name: '핀볼', hint: '기둥에 튕기는 공을 바닥의 파란 공까지 보내세요',
    ink: 540, goal: 'touch',
    statics: [{ x: 60, y: 100, w: 120, h: 14, a: 0.2 }, FLOOR],
    pegs: [{ x: 150, y: 220, r: 12 }, { x: 230, y: 260, r: 12 }, { x: 110, y: 320, r: 12 }, { x: 200, y: 360, r: 12 }, { x: 290, y: 330, r: 12 }],
    balls: [{ id: 'red', x: 25, y: 72 }, { id: 'blue', x: 310, y: 496 }],
  },
  {
    name: '상자 치우기', hint: '길을 막은 상자를 넘거나 밀어내세요',
    ink: 560, goal: 'touch',
    statics: [{ x: 70, y: 300, w: 140, h: 14, a: 0.12 }, FLOOR],
    crates: [{ x: 200, y: 482, w: 56, h: 56 }],
    balls: [{ id: 'red', x: 30, y: 272 }, { id: 'blue', x: 310, y: 496 }],
  },
  {
    name: '가시 다리', hint: '바닥은 가시! 떨어지지 않게 다리를 놓으세요',
    ink: 480, goal: 'touch',
    statics: [{ x: 65, y: 300, w: 130, h: 14, a: 0.14 }, { x: 295, y: 300, w: 130, h: 14, a: -0.14 }, FLOOR],
    spikes: [{ x: 180, y: 495, w: 360, h: 30 }],
    balls: [{ id: 'red', x: 50, y: 274 }, { id: 'blue', x: 310, y: 274 }],
  },
  {
    name: '가시밭 컵', hint: '가시를 피해서 오른쪽 컵에 넣어 보세요',
    ink: 560, goal: 'cup',
    statics: [{ x: 60, y: 120, w: 120, h: 14, a: 0.15 }, FLOOR],
    spikes: [{ x: 120, y: 495, w: 240, h: 30 }],
    balls: [{ id: 'red', x: 25, y: 92 }],
    cup: { x: 300, y: 477, w: 90, h: 56 },
  },

  // ───── 장치 ─────
  {
    name: '시소 점프', hint: '시소 반대편에 무거운 낙서를 떨어뜨려 공을 띄우세요',
    ink: 540, goal: 'star',
    statics: [FLOOR],
    seesaws: [{ x: 180, y: 470, w: 240 }],
    balls: [{ id: 'red', x: 78, y: 448 }],
    star: { x: 80, y: 300 },
  },
  {
    name: '더 높이', hint: '시소로 공을 더 높이 띄워 별에 닿게 하세요',
    ink: 640, goal: 'star',
    statics: [FLOOR],
    seesaws: [{ x: 200, y: 470, w: 220 }],
    balls: [{ id: 'red', x: 108, y: 448 }],
    star: { x: 110, y: 240 },
  },
  {
    name: '상자 다리', hint: '가시 위로 다리를 놓아 상자 너머 파란 공에게',
    ink: 580, goal: 'touch',
    statics: [{ x: 60, y: 260, w: 120, h: 14, a: 0.1 }, { x: 300, y: 420, w: 120, h: 14, a: 0 }, FLOOR],
    spikes: [{ x: 180, y: 495, w: 200, h: 30 }],
    crates: [{ x: 270, y: 395, w: 36, h: 36 }],
    balls: [{ id: 'red', x: 25, y: 232 }, { id: 'blue', x: 320, y: 399 }],
  },
  {
    name: '종합 시험', hint: '기둥과 가시를 지나 컵에 골인!',
    ink: 640, goal: 'cup',
    statics: [{ x: 60, y: 90, w: 120, h: 14, a: 0.15 }, FLOOR],
    pegs: [{ x: 180, y: 220, r: 14 }, { x: 120, y: 330, r: 14 }, { x: 250, y: 330, r: 14 }],
    spikes: [{ x: 90, y: 495, w: 180, h: 30 }],
    balls: [{ id: 'red', x: 25, y: 62 }],
    cup: { x: 290, y: 477, w: 90, h: 56 },
  },
]
