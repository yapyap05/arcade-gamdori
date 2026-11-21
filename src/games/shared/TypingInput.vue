<script setup>
import { ref } from 'vue'
import { useGameCtx } from './context'

/**
 * 타자 게임 공통 입력창 (한글 조합 입력 · 모바일 키보드 대응)
 *  - 조합 중인 글자까지 실시간 전달: @change({ value, composing })
 *  - 조합 중 Enter 는 무시, 조합이 끝난 Enter 만 @submit(value)
 *  - Backspace 를 누를 때마다 @erase  (조합 중 자모를 지운 것도 포함)
 *  - 비활성화(disabled) 대신 읽기 전용 → 단계가 바뀌어도 키보드가 닫히지 않음
 *  - 붙여넣기·끌어 놓기 막기, 일시정지 중 입력 막기
 * 부모에서 ref 로 clear(), focus() 사용
 */
defineProps({
  locked: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
})
const emit = defineEmits(['change', 'submit', 'erase'])
const ctx = useGameCtx()
const el = ref(null)
let composing = false
let clearedText = ''
let clearedAt = 0

function report() {
  emit('change', { value: el.value.value, composing })
}

function onInput(e) {
  // 비운 직후 브라우저가 남아 있던 조합 글자를 다시 넣는 경우 제거
  if (clearedText && performance.now() - clearedAt < 200 && el.value.value && clearedText.endsWith(el.value.value)) {
    el.value.value = ''
  }
  composing = e.isComposing || composing
  report()
}
function onCompStart() { composing = true }
function onCompEnd() {
  composing = false
  onInput({ isComposing: false })
}
function onKeydown(e) {
  if (e.key === 'Backspace') emit('erase')
  if (e.key !== 'Enter') return
  e.preventDefault()
  if (e.isComposing || e.keyCode === 229 || composing) return // 조합 중 Enter 무시
  emit('submit', el.value.value)
}

// 키보드가 올라온 뒤 입력창과 문제가 보이도록
function onFocus() {
  setTimeout(() => el.value?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
}

function clear() {
  if (!el.value) return
  clearedText = el.value.value
  clearedAt = performance.now()
  composing = false
  el.value.value = ''
  report()
}
// 클릭 핸들러 안에서 바로 호출해야 iOS 에서도 키보드가 열림
function focus() {
  if (!el.value) return
  el.value.readOnly = false
  el.value.focus()
}
defineExpose({ clear, focus })
</script>

<template>
  <input
    ref="el"
    class="typing-in"
    type="text"
    :readonly="locked || ctx.paused"
    :placeholder="placeholder"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    enterkeyhint="done"
    aria-label="입력"
    @input="onInput"
    @compositionstart="onCompStart"
    @compositionend="onCompEnd"
    @keydown="onKeydown"
    @focus="onFocus"
    @paste.prevent
    @drop.prevent
  />
</template>

<style scoped>
.typing-in {
  width: 100%; height: 56px; padding: 0 16px; font-size: 20px;
  border-radius: var(--r-btn2); border: var(--bw) solid var(--bc); background: var(--surface); color: var(--text);
  box-shadow: var(--sh-sm);
}
.typing-in:focus { border-color: var(--accent); outline: none; }
.typing-in[readonly] { opacity: 0.7; }
</style>
