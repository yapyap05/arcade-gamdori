import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useGameCtx } from './context'

export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 일시정지 상태가 바뀔 때 호출 (컴포넌트 해제 시 자동 정리) */
function onPauseChange(fn) {
  const ctx = useGameCtx()
  const stop = watch(() => ctx.paused, fn)
  onBeforeUnmount(stop)
  return ctx
}

/** 카운트다운 타이머 (초 단위, 일시정지 자동 반영, 컴포넌트 해제 시 자동 정리) */
export function useTimer() {
  const remain = ref(0)
  const total = ref(1)
  let id = 0
  let end = 0
  let left = 0 // 일시정지 시 남은 ms
  let expire = null
  let running = false
  const pct = computed(() => Math.max(0, Math.min(100, (remain.value / total.value) * 100)))
  const text = computed(() => remain.value.toFixed(1))

  function tick() {
    remain.value = Math.max(0, (end - performance.now()) / 1000)
    if (remain.value <= 0) { stop(); expire?.() }
  }
  function run(ms) {
    clearInterval(id)
    end = performance.now() + ms
    id = setInterval(tick, 50)
  }
  function stop() { clearInterval(id); id = 0; running = false }
  function start(sec, onExpire) {
    stop()
    total.value = sec
    remain.value = sec
    expire = onExpire
    running = true
    if (ctx.paused) left = sec * 1000
    else run(sec * 1000)
  }
  const ctx = onPauseChange((paused) => {
    if (!running) return
    if (paused) { left = Math.max(0, end - performance.now()); clearInterval(id); id = 0 }
    else run(left)
  })
  onBeforeUnmount(stop)
  return { remain, total, pct, text, start, stop }
}

/** 경과 시간 (초 단위, 일시정지 자동 반영) */
export function useStopwatch() {
  const seconds = ref(0)
  let id = 0
  let acc = 0 // 누적 ms
  let since = 0
  let running = false
  const now = () => acc + (running && !ctx.paused ? performance.now() - since : 0)
  function tick() { seconds.value = Math.floor(now() / 1000) }
  function start() {
    stop(); acc = 0; seconds.value = 0; running = true; since = performance.now()
    id = setInterval(tick, 250)
  }
  function stop() {
    if (running) { acc = now(); running = false }
    clearInterval(id); id = 0
    seconds.value = Math.floor(acc / 1000)
  }
  const ctx = onPauseChange((paused) => {
    if (!running) return
    if (paused) acc += performance.now() - since
    else since = performance.now()
  })
  onBeforeUnmount(stop)
  return { seconds, start, stop }
}

/** setTimeout 모음 (일시정지 자동 반영, 해제 시 전부 취소) */
export function useLater() {
  const jobs = new Map() // id -> { fn, due, left, handle }
  let seq = 0
  const fire = (id) => { const j = jobs.get(id); jobs.delete(id); j?.fn() }
  const schedule = (id, j, ms) => { j.due = performance.now() + ms; j.handle = setTimeout(() => fire(id), ms) }
  const later = (fn, ms) => {
    const id = ++seq
    const j = { fn, left: ms, handle: 0, due: 0 }
    jobs.set(id, j)
    if (!ctx.paused) schedule(id, j, ms)
    return id
  }
  const clearAll = () => { jobs.forEach((j) => clearTimeout(j.handle)); jobs.clear() }
  const ctx = onPauseChange((paused) => {
    jobs.forEach((j, id) => {
      if (paused) { clearTimeout(j.handle); j.left = Math.max(0, j.due - performance.now()) }
      else schedule(id, j, j.left)
    })
  })
  onBeforeUnmount(clearAll)
  return { later, clearAll }
}

/**
 * 키 입력 (일시정지 중·입력창 입력 중에는 무시)
 * handler(e) 에서 e.code 사용 권장 → 한글 입력 상태에서도 WASD 동작
 */
export function useKeys(handler) {
  const ctx = useGameCtx()
  const onKey = (e) => {
    if (ctx.paused || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return
    handler(e)
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}

/** 방향키·WASD → 'U' | 'D' | 'L' | 'R' */
export const arrowDir = (code) =>
  ({ ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D', ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R' })[code]

/** 스와이프 → onSwipe('U' | 'D' | 'L' | 'R'). 반환값을 v-on 으로 연결 */
export function useSwipe(onSwipe, threshold = 30) {
  const ctx = useGameCtx()
  let sx = 0, sy = 0, down = false
  return {
    pointerdown(e) { down = true; sx = e.clientX; sy = e.clientY },
    pointerup(e) {
      if (!down) return
      down = false
      if (ctx.paused) return
      const dx = e.clientX - sx, dy = e.clientY - sy
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return
      onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U')
    },
    pointercancel() { down = false },
  }
}

/** 라이프 표시용 값 — GameHeader 가 도트 하트로 그림 */
export const hearts = (n, max = 3) => ({ lives: Math.max(0, n), max: Math.max(max, n) })

/**
 * 게임 루프 (requestAnimationFrame)
 * 플레이 중이고 일시정지가 아닐 때만 돌고, 멈추면 마지막 화면을 한 번 그려 둠
 *   update(dt ms) : 상태 갱신 / draw() : 그리기
 */
export function useLoop(update, draw) {
  const ctx = useGameCtx()
  let raf = 0
  let last = 0
  function frame(t) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(t - last, 100)
    last = t
    update?.(dt)
    draw?.()
  }
  function run() {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  function halt() {
    cancelAnimationFrame(raf)
    raf = 0
  }
  const stop = watch(() => ctx.playing && !ctx.paused, (on) => {
    if (on) run()
    else { halt(); draw?.() }
  })
  onBeforeUnmount(() => { stop(); halt() })
  return { redraw: () => draw?.() }
}
