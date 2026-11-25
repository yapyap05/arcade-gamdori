<script setup>
import { ref, onMounted, watch } from 'vue'
import { setupCanvas, useThemeColors } from '../../games/shared/canvas'

/** 바이오리듬 그래프: 지난 10일 ~ 앞으로 20일, 세로선 = 오늘 */
const props = defineProps({ days: { type: Number, required: true } })
const canvas = ref(null)
const W = 330, H = 180
const LINES = [[23, '#E0455F', '신체'], [28, '#3B7DD0', '감성'], [33, '#2FA36B', '지성']]
const colors = useThemeColors(['board-bg', 'bc', 'accent'], () => draw())
let c2d = null

function draw() {
  if (!c2d) return
  c2d.fillStyle = colors['board-bg']
  c2d.fillRect(0, 0, W, H)
  c2d.lineWidth = 1.5
  c2d.strokeStyle = colors.bc
  c2d.beginPath(); c2d.moveTo(0, H / 2); c2d.lineTo(W, H / 2); c2d.stroke()
  c2d.lineWidth = 2.5
  LINES.forEach(([p, col]) => {
    c2d.strokeStyle = col
    c2d.beginPath()
    for (let i = 0; i <= 30; i++) {
      const y = H / 2 - Math.sin((2 * Math.PI * (props.days - 10 + i)) / p) * H * 0.4
      i ? c2d.lineTo((i * W) / 30, y) : c2d.moveTo(0, y)
    }
    c2d.stroke()
  })
  c2d.strokeStyle = colors.accent
  c2d.setLineDash([4, 4])
  c2d.beginPath(); c2d.moveTo(W / 3, 0); c2d.lineTo(W / 3, H); c2d.stroke()
  c2d.setLineDash([])
}
onMounted(() => { c2d = setupCanvas(canvas.value, W, H); draw() })
watch(() => props.days, draw)
</script>

<template>
  <figure class="bio">
    <canvas ref="canvas" role="img" aria-label="바이오리듬 그래프" />
    <figcaption>
      <span v-for="[, col, name] in LINES" :key="name"><i :style="{ background: col }"></i>{{ name }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.bio { margin: 0; display: flex; flex-direction: column; gap: 6px; }
canvas { width: 100%; height: auto; aspect-ratio: 330 / 180; border-radius: 12px; border: var(--bw) solid var(--bc); }
figcaption { display: flex; justify-content: center; gap: 14px; font-size: 12px; color: var(--muted); }
figcaption span { display: inline-flex; align-items: center; gap: 4px; }
figcaption i { width: 12px; height: 3px; border-radius: 2px; }
</style>
