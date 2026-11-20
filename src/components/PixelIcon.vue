<script setup>
import { computed } from 'vue'
import { ICONS, PALETTE } from '../games/pixelIcons'

/** 도트 아이콘. 같은 색이 이어지는 가로 픽셀은 사각형 하나로 합쳐서 그림 */
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 36 },
  label: { type: String, default: '' }, // 비어 있으면 장식용(스크린리더 무시)
})

const grid = computed(() => ICONS[props.name] ?? [])
const w = computed(() => Math.max(1, ...grid.value.map((r) => r.length)))
const h = computed(() => Math.max(1, grid.value.length))
const rects = computed(() => {
  const out = []
  grid.value.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let len = 1
      while (row[x + len] === ch) len++
      if (PALETTE[ch]) out.push({ x, y, w: len, fill: PALETTE[ch] })
      x += len
    }
  })
  return out
})
</script>

<template>
  <svg
    class="pixel"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${w} ${h}`"
    shape-rendering="crispEdges"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <rect v-for="(r, i) in rects" :key="i" :x="r.x" :y="r.y" :width="r.w" height="1" :fill="r.fill" />
  </svg>
</template>

<style scoped>
.pixel { display: block; flex: none; image-rendering: pixelated; }
</style>
