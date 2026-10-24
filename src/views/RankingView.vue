<script setup>
import { ref } from 'vue'
import { rankedGames } from '../games/registry'
import Leaderboard from '../components/Leaderboard.vue'

const gameId = ref(rankedGames[0]?.id)
const mode = ref('competitive')
</script>

<template>
  <h1 class="title">랭킹</h1>
  <div class="controls">
    <div class="seg">
      <button v-for="g in rankedGames" :key="g.id" :class="{ on: gameId === g.id }" @click="gameId = g.id">{{ g.emoji }} {{ g.title }}</button>
    </div>
    <div class="seg">
      <button :class="{ on: mode === 'competitive' }" @click="mode = 'competitive'">경쟁</button>
      <button :class="{ on: mode === 'casual' }" @click="mode = 'casual'">캐주얼</button>
    </div>
  </div>
  <div class="card panel"><Leaderboard :game-id="gameId" :mode="mode" :limit="50" /></div>
  <p class="muted note">랭킹은 유저별 최고 점수 기준이에요. 이전이 끝난 게임부터 순서대로 추가됩니다.</p>
</template>

<style scoped>
.title { margin: 0 0 16px; }
.controls { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.seg { display: flex; gap: 4px; background: var(--surface); padding: 4px; border-radius: 999px; box-shadow: var(--shadow); }
.seg button { border: 0; background: none; padding: 8px 16px; border-radius: 999px; font-weight: 700; }
.seg button.on { background: var(--accent); color: var(--accent-text); }
.panel { padding: 16px; max-width: 640px; }
.note { font-size: 13px; }
</style>
