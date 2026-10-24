<script setup>
/**
 * 게임 공통 틀: 대기/종료 오버레이 + 시작 단계 선택(캐주얼 전용)
 * <GameScreen v-model:stage="stage" :status :title :desc :score :mode :stages @start>
 */
const props = defineProps({
  status: { type: String, default: 'idle' }, // idle | playing | over
  title: String,
  desc: String,
  score: { type: Number, default: 0 },
  summary: String,
  mode: { type: String, default: 'casual' },
  stages: { type: Array, default: null }, // 시작 단계/난이도 선택지 라벨
  stage: { type: Number, default: 0 },
  freeStage: { type: Boolean, default: false }, // true면 경쟁 모드에서도 선택 가능(예: 스도쿠 난이도)
  stageLabel: { type: String, default: '시작 단계' },
})
const emit = defineEmits(['start', 'update:stage'])
const showStage = () => props.stages && (props.mode === 'casual' || props.freeStage)
</script>

<template>
  <div class="screen">
    <slot />
    <div v-if="status !== 'playing'" class="overlay">
      <h2>{{ status === 'over' ? '게임 종료' : title }}</h2>
      <template v-if="status === 'over'">
        <p class="big">{{ score.toLocaleString() }}점</p>
        <p v-if="summary" class="sub">{{ summary }}</p>
      </template>
      <p v-else class="sub">{{ desc }}</p>

      <label v-if="showStage()" class="opt">
        {{ stageLabel }}
        <select :value="stage" @change="emit('update:stage', Number($event.target.value))">
          <option v-for="(s, i) in stages" :key="i" :value="i">{{ s }}</option>
        </select>
      </label>
      <slot name="options" />

      <button class="btn btn-cta start" @click="emit('start')">{{ status === 'over' ? '다시 하기' : '시작' }}</button>
      <p class="mode">{{ mode === 'competitive' ? '경쟁 모드 · 랭킹에 기록돼요' : '캐주얼 모드' }}</p>
    </div>
  </div>
</template>

<style scoped>
.screen { position: relative; width: 100%; max-width: 720px; margin: 0 auto; min-height: 420px; }
.overlay {
  position: absolute; inset: -4px; z-index: 5; border-radius: 16px;
  background: rgba(12, 14, 34, 0.84); color: #fff;
  display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; padding: 20px;
}
h2 { margin: 0; font-size: 28px; }
.big { margin: 0; font-size: 40px; font-weight: 800; }
.sub { margin: 0; opacity: 0.85; max-width: 360px; }
.opt { display: grid; gap: 6px; font-size: 13px; font-weight: 700; opacity: 0.95; }
select { padding: 8px 12px; border-radius: 10px; border: 0; background: #fff; color: #1a1d3a; font-weight: 600; }
.start { padding: 12px 36px; font-size: 17px; margin-top: 4px; }
.mode { margin: 0; font-size: 12px; opacity: 0.6; }
</style>
