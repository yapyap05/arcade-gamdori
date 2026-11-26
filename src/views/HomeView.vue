<script setup>
import { ref, computed, onMounted } from 'vue'
import { games, CATEGORIES, categoryLabel } from '../games/registry'
import { soundOn } from '../games/shared/sfx'
import { pickDaily } from '../utils/daily'
import { scoreService } from '../services/scoreService'
import GameTile from '../components/GameTile.vue'
import PixelIcon from '../components/PixelIcon.vue'
import Icon from '../components/Icon.vue'

const category = ref('all')
// 정렬: 랭킹 기록이 있는 게임 → 기록 수가 많은 게임 → 제목 가나다순 / 타일에는 경쟁 1위 점수
const stats = ref({})
onMounted(async () => { try { stats.value = await scoreService.stats() } catch { /* 실패하면 제목순 */ } })
const sorted = computed(() => games.slice().sort((a, b) => {
  const na = stats.value[a.id]?.n ?? 0
  const nb = stats.value[b.id]?.n ?? 0
  return (nb > 0) - (na > 0) || nb - na || a.title.localeCompare(b.title, 'ko')
}))
const filtered = computed(() => sorted.value.filter((g) => category.value === 'all' || g.category === category.value))

const logo = `${import.meta.env.BASE_URL}logo.png`
const pick = pickDaily(games)
const toggleSound = () => (soundOn.value = !soundOn.value)
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <div class="logo-row">
        <img :src="logo" alt="" class="logo" width="44" height="44" />
        <div class="col">
          <span class="en">Gamdori World</span>
          <h1 class="brand">겜돌이 월드</h1>
        </div>
      </div>
      <button class="icon-btn" :aria-pressed="soundOn" :aria-label="soundOn ? '효과음 끄기' : '효과음 켜기'" @click="toggleSound">
        <Icon :name="soundOn ? 'sound' : 'mute'" />
      </button>
    </header>

    <RouterLink v-if="pick" :to="`/game/${pick.id}`" class="hero" :aria-label="`오늘의 추천 ${pick.title} 바로 플레이`">
      <span class="kicker">오늘의 추천</span>
      <span class="hero-row">
        <span class="badge"><PixelIcon :name="pick.id" :size="40" /></span>
        <span class="col grow">
          <span class="hero-title">{{ pick.title }}</span>
          <span class="hero-sub">{{ categoryLabel(pick.category) }} · {{ pick.desc }}</span>
        </span>
        <span class="go" aria-hidden="true"><Icon name="arrow" /></span>
      </span>
    </RouterLink>

    <div class="chips" role="tablist" aria-label="카테고리">
      <button v-for="c in CATEGORIES" :key="c.id" class="chip" :class="{ on: category === c.id }" role="tab" :aria-selected="category === c.id" @click="category = c.id">
        {{ c.label }}
      </button>
    </div>

    <section class="grid" aria-label="게임 목록">
      <GameTile v-for="g in filtered" :key="g.id" :game="g" :index="games.indexOf(g)" :top="stats[g.id]?.top ?? null" />
    </section>
  </div>
</template>

<style scoped>
.logo-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
.logo { width: 44px; height: 44px; border-radius: 50%; flex: none; border: var(--bw) solid var(--bc); }
.col { display: flex; flex-direction: column; min-width: 0; }
.en { font-family: var(--font-num); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: var(--muted); }
.hero {
  display: flex; flex-direction: column; gap: 10px; padding: 16px 18px;
  border-radius: var(--r-lg); background: var(--hero-bg); color: var(--hero-ink);
  border: var(--bw) solid var(--hero-bc); box-shadow: var(--sh);
}
.kicker { font-family: var(--font-num); font-size: 12px; font-weight: 700; letter-spacing: 0.06em; color: var(--hero-kicker); }
.hero-row { display: flex; align-items: center; gap: 12px; }
.badge {
  width: 52px; height: 52px; flex: none; display: grid; place-items: center;
  border-radius: 14px; background: var(--px-bg); border: var(--bw) solid var(--px-bc);
}
.hero-title { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 20px; line-height: 1.25; }
.hero-sub { font-size: 13px; color: var(--hero-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.go {
  width: 44px; height: 44px; flex: none; border-radius: 999px;
  display: grid; place-items: center;
  background: var(--go-bg); color: var(--go-ink); border: var(--bw) solid var(--hero-bc);
}
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
</style>
