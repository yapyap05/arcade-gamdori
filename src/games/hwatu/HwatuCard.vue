<script setup>
import { computed } from 'vue'
import { SPRITE, SPRITE_SIZE, BACK, spritePos, cardLabel } from './cards'

/**
 * 화투패 한 장. 크기는 부모의 CSS 변수 --cw (카드 폭) 로 정함
 * id 가 없거나 back 이면 뒷면
 */
const props = defineProps({
  id: { type: Number, default: null },
  back: { type: Boolean, default: false },
})
const shown = computed(() => (props.back || props.id == null ? BACK : props.id))
const style = computed(() => ({
  backgroundImage: `url(${SPRITE})`,
  backgroundSize: SPRITE_SIZE,
  backgroundPosition: spritePos(shown.value),
}))
</script>

<template>
  <span class="hwatu" role="img" :aria-label="cardLabel(shown)" :style="style" />
</template>

<style scoped>
.hwatu {
  display: block; flex: none; width: var(--cw, 56px); aspect-ratio: 2 / 3;
  border-radius: calc(var(--cw, 56px) * 0.08); background-repeat: no-repeat;
}
</style>
