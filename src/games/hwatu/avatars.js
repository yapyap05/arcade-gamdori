import { ref, watch } from 'vue'

/**
 * 화투 게임 AI 캐릭터 (이름 → 도트 아이콘 · 배경색)
 * 아이콘은 games/pixelIcons.js 의 이름
 */
export const AVATARS = {
  얍얍돌이: { icon: 'lion', bg: '#B79BFF' },
  펭귄돌이: { icon: 'penguin', bg: '#FF9EC4' },
  겜돌이: { icon: 'bear', bg: '#FFD54A' },
}

export const avatarOf = (name) => AVATARS[name] ?? AVATARS.겜돌이

/** 내 차례 제한 시간 (초): 로비에서 고름, 화투 게임 공통으로 기억 */
export const TURN_OPTIONS = [7, 15]
const KEY = 'gamdori:turn-sec'
function readSec() {
  try { const v = Number(localStorage.getItem(KEY)); return TURN_OPTIONS.includes(v) ? v : TURN_OPTIONS[0] } catch { return TURN_OPTIONS[0] }
}
export const turnSec = ref(readSec())
watch(turnSec, (v) => { try { localStorage.setItem(KEY, String(v)) } catch {} })
