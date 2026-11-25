<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFortuneStore } from '../stores/fortune'
import { useAuthStore } from '../stores/auth'
import { MENUS, GROUPS, menuArt, todaySummary, profileTags } from '../fortune/menus'
import { ANIMALS, QUOTES } from '../fortune/data'
import { rng, pick } from '../fortune/seed'
import { animal } from '../fortune/art'
import FortuneArt from '../components/fortune/FortuneArt.vue'
import ProfileSheet from '../components/fortune/ProfileSheet.vue'
import Icon from '../components/Icon.vue'

const fortune = useFortuneStore()
const auth = useAuthStore()
const sheetOpen = ref(false)
const group = ref('all')

const today = new Date()
const dateText = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
const tags = computed(() => profileTags(fortune.profile.birth))
const summary = computed(() => todaySummary(fortune.profile.birth, today))
const quote = computed(() => pick(rng(fortune.seed('q')), QUOTES))
const displayName = computed(() => fortune.profile.name || auth.user?.nickname || '나')
const shown = computed(() => GROUPS.filter((g) => group.value === 'all' || g.id === group.value)
  .map((g) => ({ ...g, menus: MENUS.filter((m) => m.group === g.id) })))

// 처음 들어오면 내 정보 입력 창
onMounted(() => { if (!fortune.hasProfile) sheetOpen.value = true })
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <div class="col">
        <span class="en">TODAY'S FORTUNE</span>
        <h1 class="brand">오늘의 운세</h1>
      </div>
      <span class="date">{{ dateText }}</span>
    </header>

    <section class="me">
      <span class="badge"><FortuneArt :svg="animal(tags ? tags.animal : 3, 40)" /></span>
      <div class="col grow">
        <b>{{ displayName }} 님</b>
        <span v-if="tags" class="muted sm">{{ ANIMALS[tags.animal] }}띠 · {{ tags.zodiac }} · {{ fortune.profile.birth.replaceAll('-', '.') }}</span>
        <span v-else class="muted sm">생년월일을 알려 주면 운세가 더 정확해져요</span>
      </div>
      <button class="icon-btn sm" aria-label="내 정보 수정" @click="sheetOpen = true"><Icon name="edit" /></button>
    </section>

    <section class="hero" aria-label="오늘의 종합 운세">
      <div class="row">
        <span class="kicker">오늘의 종합 운세</span>
        <span v-if="summary" class="kicker dim">{{ summary.ganji }} · {{ summary.tenGod }}</span>
      </div>
      <template v-if="summary">
        <div class="score-row"><span class="score num">{{ summary.score }}</span><span class="tier">{{ summary.text }}</span></div>
        <div v-for="[k, v] in summary.bars" :key="k" class="bar-row">
          <span>{{ k }}</span><div class="bar"><i :style="{ width: v + '%' }"></i></div><b class="num">{{ v }}</b>
        </div>
      </template>
      <button v-else type="button" class="set-birth" @click="sheetOpen = true">생년월일 입력하고 오늘 운세 보기</button>
      <p class="quote">"{{ quote }}"</p>
    </section>

    <div class="chips" role="tablist" aria-label="운세 묶음">
      <button class="chip" :class="{ on: group === 'all' }" role="tab" :aria-selected="group === 'all'" @click="group = 'all'">전체</button>
      <button v-for="g in GROUPS" :key="g.id" class="chip" :class="{ on: group === g.id }" role="tab" :aria-selected="group === g.id" @click="group = g.id">{{ g.label }}</button>
    </div>

    <template v-for="g in shown" :key="g.id">
      <h2 class="section-label">{{ g.label }}</h2>
      <div class="grid">
        <RouterLink v-for="m in g.menus" :key="m.id" :to="`/fortune/${m.id}`" class="tile">
          <span class="pxb"><FortuneArt :svg="menuArt(m, 30)" /></span>
          <span class="nm">{{ m.name }}</span>
        </RouterLink>
      </div>
    </template>

    <p class="disc">운세는 재미로 보는 콘텐츠예요.</p>
    <ProfileSheet :open="sheetOpen" @close="sheetOpen = false" />
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; min-width: 0; }
.grow { flex: 1; }
.en { font-family: var(--font-num); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: var(--muted); }
.date { font-size: 12px; color: var(--muted); }
.sm { font-size: 12px; }
.me {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm);
}
.badge, .pxb { display: grid; place-items: center; border-radius: 12px; background: var(--px-bg); border: var(--bw) solid var(--px-bc); }
.badge { width: 52px; height: 52px; flex: none; }
.icon-btn.sm { width: 36px; height: 36px; }
.icon-btn.sm :deep(svg) { width: 18px; height: 18px; }
.hero {
  display: flex; flex-direction: column; gap: 8px; padding: 16px 18px;
  border-radius: var(--r-lg); background: var(--hero-bg); color: var(--hero-ink);
  border: var(--bw) solid var(--hero-bc); box-shadow: var(--sh);
}
.row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.kicker { font-family: var(--font-num); font-size: 12px; font-weight: 700; letter-spacing: 0.06em; color: var(--hero-kicker); }
.kicker.dim { color: var(--hero-sub); letter-spacing: 0; }
.score-row { display: flex; align-items: center; gap: 14px; }
.score { font-size: 46px; line-height: 1; }
.tier { font-size: 13px; line-height: 1.5; color: var(--hero-sub); }
.bar-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.bar-row span { width: 30px; opacity: 0.85; }
.bar-row b { width: 24px; text-align: right; font-size: 12px; }
.bar { flex: 1; height: 10px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--hero-ink) 18%, transparent); }
.bar i { display: block; height: 100%; border-radius: 999px; background: var(--go-bg); }
.set-birth { height: 44px; border-radius: 999px; border: 0; background: var(--go-bg); color: var(--go-ink); font-weight: 700; }
.quote { margin: 4px 0 0; font-size: 13px; color: var(--hero-sub); }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.tile {
  display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px;
  border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--tile-bc); box-shadow: var(--sh-sm); color: var(--text);
}
.tile:active { transform: scale(0.97); }
.pxb { width: 44px; height: 44px; }
.nm { font-size: 12px; font-weight: 700; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.disc { margin: 4px 0 0; text-align: center; font-size: 11px; color: var(--muted); }
</style>
