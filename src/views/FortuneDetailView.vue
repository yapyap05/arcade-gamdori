<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFortuneStore } from '../stores/fortune'
import { getMenu, menuArt, profileTags } from '../fortune/menus'
import { rng, shuffleWith } from '../fortune/seed'
import FortuneArt from '../components/fortune/FortuneArt.vue'
import FortuneResult from '../components/fortune/FortuneResult.vue'
import CardDeck from '../components/fortune/CardDeck.vue'
import AnimalPicker from '../components/fortune/AnimalPicker.vue'
import Icon from '../components/Icon.vue'

const props = defineProps({ id: String })
const router = useRouter()
const fortune = useFortuneStore()
const menu = computed(() => getMenu(props.id))
if (!menu.value) router.replace('/fortune')

const values = reactive(fortune.defaultsFor(menu.value?.fields))
const result = ref(null)
const error = ref('')
const ctx = { seed: (...a) => fortune.seed(...a), today: new Date() }

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/fortune')
}

function done(res) {
  if (res.error) { error.value = res.error; result.value = null; return }
  error.value = ''
  result.value = res
  fortune.addHistory(menu.value.name, res.summary)
}

/* ───── 바로 계산하는 메뉴 ───── */
function run() {
  fortune.rememberInputs({ ...values })
  if (menu.value.type === 'deck') return startDeck()
  done(menu.value.run({ ...values }, ctx))
}

/* ───── 카드 고르기 ───── */
const deck = ref(null) // { def, order, selected, done }
let deckRng = null
let nonce = 0
function startDeck() {
  nonce = 0
  shuffle()
}
function shuffle() {
  const def = menu.value.deck({ ...values })
  deckRng = rng(fortune.seed(def.key, nonce))
  deck.value = { def, order: shuffleWith(deckRng, def.n), selected: [], done: false }
  result.value = null
}
function pickCard(pos) {
  const d = deck.value
  if (d.done || d.selected.includes(pos) || d.selected.length >= d.def.cnt) return
  d.selected.push(pos)
  if (d.selected.length < d.def.cnt) return
  d.done = true
  done(d.def.fn(d.selected.map((p) => d.order[p]), deckRng))
}
function reshuffle() {
  nonce++
  shuffle()
}

/* ───── 띠 고르기 ───── */
const ddi = ref(fortune.profile.ddi ?? profileTags(fortune.profile.birth)?.animal ?? 0)
function pickAnimal(i) {
  ddi.value = i
  fortune.saveProfile({ ddi: i })
  done(menu.value.run({ ddi: i }, ctx))
}

const hasFields = computed(() => !!menu.value?.fields?.length)
onMounted(() => {
  const m = menu.value
  if (!m) return
  if (m.type === 'animal') pickAnimal(ddi.value)
  else if (m.type === 'deck' && !hasFields.value) startDeck()
  else if (m.type === 'run' && !hasFields.value) run()
})
</script>

<template>
  <div v-if="menu" class="screen">
    <header class="screen-head">
      <button class="icon-btn" aria-label="뒤로" @click="goBack"><Icon name="back" /></button>
      <h1 class="title">{{ menu.name }}</h1>
      <span class="pxb" aria-hidden="true"><FortuneArt :svg="menuArt(menu, 26)" /></span>
    </header>

    <!-- 입력 -->
    <form v-if="hasFields" class="panel form" @submit.prevent="run">
      <label v-for="f in menu.fields" :key="f.name">
        <span>{{ f.label }}</span>
        <select v-if="f.type === 'select'" v-model="values[f.name]">
          <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
        </select>
        <input v-else v-model.trim="values[f.name]" :type="f.type" :maxlength="f.type === 'text' ? 10 : undefined" />
      </label>
      <button class="btn btn-primary go">{{ menu.type === 'deck' ? '카드 펼치기' : '결과 보기' }}</button>
    </form>

    <p v-if="error" class="err" role="alert">{{ error }}</p>

    <!-- 띠 고르기 -->
    <section v-if="menu.type === 'animal'" class="panel pad">
      <AnimalPicker :model-value="ddi" @update:model-value="pickAnimal" />
    </section>

    <!-- 카드 고르기 -->
    <section v-if="menu.type === 'deck' && deck" class="panel pad">
      <CardDeck
        :n="deck.def.n" :cnt="deck.def.cnt" :back="deck.def.back()"
        :front="(p) => deck.def.front(deck.order[p])" :selected="deck.selected" :done="deck.done"
        @pick="pickCard"
      />
      <button v-if="!deck.done" type="button" class="btn ghost shuffle" @click="reshuffle"><Icon name="rotate" />다시 섞기</button>
    </section>

    <!-- 지난 운세 -->
    <section v-if="menu.type === 'history'" class="panel pad">
      <ul v-if="fortune.history.length" class="hist">
        <li v-for="(h, i) in [...fortune.history].reverse()" :key="i">
          <span class="d num">{{ h.d.slice(5).replace('-', '.') }}</span>
          <span class="col"><b>{{ h.m }}</b><span class="muted">{{ h.s }}</span></span>
        </li>
      </ul>
      <p v-else class="muted empty">아직 저장된 운세가 없어요.</p>
      <button v-if="fortune.history.length" type="button" class="btn btn-sm clear" @click="fortune.clearHistory()">기록 지우기</button>
    </section>

    <!-- 결과 -->
    <section v-if="result" class="panel pad">
      <FortuneResult :result="result" :menu-name="menu.name" :again-label="menu.type === 'deck' ? '다시 뽑기' : ''" @again="reshuffle" />
    </section>

    <p class="disc">운세는 재미로 보는 콘텐츠예요.<template v-if="menu.type !== 'history'"> 결과는 지난 운세에 저장돼요.</template></p>
  </div>
</template>

<style scoped>
.title { margin: 0; flex: 1; min-width: 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pxb { width: 44px; height: 44px; flex: none; display: grid; place-items: center; border-radius: 12px; background: var(--px-bg); border: var(--bw) solid var(--px-bc); }
.pad { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.form { padding: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.form label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: var(--muted); min-width: 0; }
.form label:only-of-type { grid-column: 1 / -1; }
.form input, .form select {
  width: 100%; min-width: 0; height: 46px; padding: 0 12px; border-radius: var(--r-btn2);
  border: var(--bw) solid var(--bc); background: var(--bg); color: var(--text); font-size: 15px;
}
.form input:focus, .form select:focus { border-color: var(--accent); outline: none; }
.go { grid-column: 1 / -1; height: 50px; font-size: 16px; }
.err { margin: 0; text-align: center; color: var(--danger); font-size: 14px; font-weight: 600; }
.shuffle { height: 44px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.shuffle :deep(svg) { width: 18px; height: 18px; }
.hist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.hist li { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
.hist li:last-child { border-bottom: 0; }
.hist .d { flex: none; width: 44px; color: var(--muted); }
.hist .col { display: flex; flex-direction: column; min-width: 0; }
.hist .col .muted { overflow-wrap: anywhere; }
.empty { margin: 8px 0; text-align: center; font-size: 14px; }
.clear { align-self: center; }
.disc { margin: 0; text-align: center; font-size: 11px; color: var(--muted); }
</style>
