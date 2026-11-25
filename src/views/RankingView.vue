<script setup>
import { ref } from 'vue'
import { rankedGames } from '../games/registry'
import Leaderboard from '../components/Leaderboard.vue'
import Icon from '../components/Icon.vue'

const gameId = ref(rankedGames[0]?.id)
const mode = ref('competitive')
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <h1 class="brand">랭킹</h1>
      <label class="select">
        <span class="sr-only">게임 선택</span>
        <select v-model="gameId">
          <option v-for="g in rankedGames" :key="g.id" :value="g.id">{{ g.title }}</option>
        </select>
        <Icon name="down" />
      </label>
    </header>

    <div class="seg" role="tablist" aria-label="랭킹 종류">
      <button role="tab" :aria-selected="mode === 'casual'" :class="{ on: mode === 'casual' }" @click="mode = 'casual'">캐주얼</button>
      <button role="tab" :aria-selected="mode === 'competitive'" :class="{ on: mode === 'competitive' }" @click="mode = 'competitive'">경쟁</button>
    </div>

    <Leaderboard :game-id="gameId" :mode="mode" :limit="20" :max="100" variant="podium" />
  </div>
</template>

<style scoped>
.select {
  position: relative; display: inline-flex; align-items: center; height: 40px; max-width: 60%;
  border-radius: 999px; border: var(--bw) solid var(--bc); background: var(--select-bg); box-shadow: var(--sh-sm);
}
.select select {
  appearance: none; -webkit-appearance: none; border: 0; background: transparent; cursor: pointer;
  height: 100%; padding: 0 36px 0 16px; font-size: 14px; font-weight: 700; max-width: 100%;
  text-overflow: ellipsis;
}
.select select option { color: initial; background: initial; }
.select :deep(svg) { position: absolute; right: 10px; width: 18px; height: 18px; pointer-events: none; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
