<script setup>
import { ref } from 'vue'
import FortuneArt from './FortuneArt.vue'
import BioChart from './BioChart.vue'
import Icon from '../Icon.vue'
import { shareText } from '../../utils/share'

/** 운세 결과 공통 화면 (src/fortune/menus.js 의 결과 데이터를 그대로 그림) */
const props = defineProps({
  result: { type: Object, required: true },
  menuName: { type: String, required: true },
  againLabel: { type: String, default: '' }, // 비우면 '다시 보기' 버튼 숨김
})
const emit = defineEmits(['again'])
const notice = ref('')

async function share() {
  const r = props.result
  const line = r.summary || r.big || r.title || ''
  const msg = await shareText(`[겜돌이 월드 · ${props.menuName}] ${line}`)
  if (!msg) return
  notice.value = msg
  setTimeout(() => (notice.value = ''), 2500)
}
</script>

<template>
  <section class="res" aria-live="polite">
    <h3 v-if="result.title" class="title">{{ result.title }}</h3>

    <div v-if="result.cards?.length" class="cards" :class="`n${result.cards.length}`">
      <figure v-for="(c, i) in result.cards" :key="i">
        <figcaption>{{ c.label }}</figcaption>
        <FortuneArt :svg="c.art" :reversed="c.reversed" :label="c.title || c.label" />
        <b v-if="c.title">{{ c.title }}</b>
        <small v-if="c.desc">{{ c.desc }}</small>
      </figure>
    </div>

    <div v-if="result.arts?.length" class="arts">
      <FortuneArt v-for="(a, i) in result.arts" :key="i" :svg="a" />
    </div>

    <p v-if="result.big" class="big">{{ result.big }}</p>

    <div v-if="result.headline" class="headline">
      <span class="score num">{{ result.headline.score }}</span>
      <span class="tier">{{ result.headline.text }}</span>
    </div>

    <div v-if="result.bars?.length" class="bars">
      <div v-for="[k, v] in result.bars" :key="k" class="bar-row">
        <span class="k">{{ k }}</span>
        <div class="bar"><i :style="{ width: v + '%' }"></i></div>
        <b class="num">{{ v }}</b>
      </div>
    </div>

    <BioChart v-if="result.chart" :days="result.chart.days" />

    <div v-if="result.numbers?.length" class="nums">
      <span v-for="n in result.numbers" :key="n" class="ball num">{{ n }}</span>
    </div>

    <table v-if="result.table?.length" class="tbl">
      <tbody>
        <tr v-for="[k, v] in result.table" :key="k"><th scope="row">{{ k }}</th><td>{{ v }}</td></tr>
      </tbody>
    </table>

    <p v-for="(t, i) in result.texts || []" :key="i" class="text" :class="{ tip: i === (result.texts.length - 1) && result.texts.length > 1 }">{{ t }}</p>

    <div class="actions">
      <button v-if="againLabel" type="button" class="btn" @click="emit('again')"><Icon name="rotate" />{{ againLabel }}</button>
      <button type="button" class="btn btn-primary" @click="share"><Icon name="share" />결과 공유</button>
    </div>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  </section>
</template>

<style scoped>
.res { display: flex; flex-direction: column; gap: 12px; }
.title { margin: 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 18px; text-align: center; }
.cards { display: grid; gap: 10px; justify-items: center; }
.cards.n1 { grid-template-columns: 1fr; } .cards.n2 { grid-template-columns: repeat(2, 1fr); } .cards.n3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; min-width: 0; }
figcaption { font-size: 11px; font-weight: 700; color: var(--accent); }
figure b { font-size: 14px; }
figure small { font-size: 11px; color: var(--muted); line-height: 1.4; }
.arts { display: flex; justify-content: center; align-items: flex-end; gap: 12px; }
.big { margin: 4px 0; text-align: center; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 22px; line-height: 1.5; color: var(--accent); }
.headline { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: var(--r-md); background: var(--surface-2); border: var(--bw) solid var(--bc); }
.score { font-size: 42px; line-height: 1; color: var(--accent); }
.tier { font-size: 14px; line-height: 1.5; }
.bars { display: flex; flex-direction: column; gap: 6px; }
.bar-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.bar-row .k { width: 64px; flex: none; color: var(--muted); }
.bar-row b { width: 28px; text-align: right; }
.bar { flex: 1; height: 10px; border-radius: 999px; background: var(--surface-2); border: var(--bw) solid var(--bc); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 999px; background: var(--accent); }
.nums { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
.ball { width: 42px; height: 42px; border-radius: 999px; display: grid; place-items: center; font-size: 16px; background: var(--accent); color: var(--accent-text); border: var(--bw) solid var(--bc); }
.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl th, .tbl td { padding: 8px 10px; border-bottom: 1px solid var(--line-soft); text-align: left; vertical-align: top; }
.tbl th { width: 34%; color: var(--muted); font-weight: 700; }
.text { margin: 0; font-size: 14px; line-height: 1.6; }
.text.tip { padding: 10px 12px; border-radius: var(--r-btn2); background: var(--surface-2); }
.actions { display: flex; gap: 10px; }
.actions .btn { flex: 1; height: 48px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.actions :deep(svg) { width: 18px; height: 18px; }
.notice { margin: 0; text-align: center; font-size: 13px; font-weight: 700; color: var(--accent); }
</style>
