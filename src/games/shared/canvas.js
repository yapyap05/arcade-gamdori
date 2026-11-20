import { watch, nextTick, onBeforeUnmount } from 'vue'
import { useThemeStore } from '../../stores/theme'
import { ICONS, PALETTE } from '../pixelIcons'

/** 캔버스를 논리 크기(w x h)로 쓰면서 고해상도 화면에서도 선명하게 */
export function setupCanvas(canvas, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const c = canvas.getContext('2d')
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.imageSmoothingEnabled = false
  return c
}

/**
 * 테마 색 캐시 — 매 프레임 getComputedStyle 를 읽지 않도록
 * names: ['board-bg', 'accent', ...] (앞의 -- 제외)
 * onChange: 테마가 바뀐 뒤 호출 (다시 그리기 등)
 */
export function useThemeColors(names, onChange) {
  const theme = useThemeStore()
  const colors = {}
  const read = () => {
    const cs = getComputedStyle(document.documentElement)
    names.forEach((n) => (colors[n] = cs.getPropertyValue(`--${n}`).trim()))
  }
  read()
  const stop = watch(() => theme.resolved, () => nextTick(() => { read(); onChange?.() }))
  onBeforeUnmount(stop)
  return colors
}

/** 도트 아이콘을 캔버스에 그림 (cx, cy 중심 / size 한 변 길이) */
export function drawPixel(c, name, cx, cy, size) {
  const grid = ICONS[name]
  if (!grid) return
  const w = Math.max(...grid.map((r) => r.length))
  const h = grid.length
  const px = size / Math.max(w, h)
  const ox = cx - (w * px) / 2
  const oy = cy - (h * px) / 2
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = PALETTE[row[x]]
      if (!fill) continue
      c.fillStyle = fill
      c.fillRect(ox + x * px, oy + y * px, Math.ceil(px), Math.ceil(px))
    }
  })
}
