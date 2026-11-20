<script setup>
import { computed } from 'vue'
import { categoryLabel } from '../games/registry'
import PixelIcon from './PixelIcon.vue'

const props = defineProps({
  game: { type: Object, required: true },
  index: { type: Number, default: 0 }, // 캔디 팝 타일 색 순환용
  best: { type: Number, default: null },
})
const sub = computed(() => `${categoryLabel(props.game.category)} · ${props.best ? `최고 ${props.best.toLocaleString()}` : '기록 없음'}`)
</script>

<template>
  <RouterLink :to="`/game/${game.id}`" class="tile" :class="`c${(index % 6) + 1}`" draggable="false" @contextmenu.prevent>
    <span class="top">
      <span class="badge"><PixelIcon :name="game.id" :size="36" /></span>
      <span v-if="game.isNew" class="new">NEW</span>
    </span>
    <span class="info">
      <span class="nm">{{ game.title }}</span>
      <span class="sub">{{ sub }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.tile {
  height: 124px; min-width: 0;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 12px 14px; border-radius: var(--r-md);
  border: var(--bw) solid var(--tile-bc); box-shadow: var(--sh-sm); color: var(--tile-ink);
  transition: transform 0.1s;
}
.tile:active { transform: scale(0.97); }
.c1 { background: var(--g1); } .c2 { background: var(--g2); } .c3 { background: var(--g3); }
.c4 { background: var(--g4); } .c5 { background: var(--g5); } .c6 { background: var(--g6); }
.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; }
.badge {
  width: 48px; height: 48px; display: grid; place-items: center;
  border-radius: 12px; background: var(--px-bg); border: var(--bw) solid var(--px-bc);
}
.new {
  font-family: var(--font-num); font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  padding: 2px 6px; border-radius: 999px; background: var(--tile-ink); color: var(--surface);
}
.info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.nm, .sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nm { font-size: 15px; font-weight: 700; }
.sub { font-size: 12px; color: var(--tile-sub); }
</style>
