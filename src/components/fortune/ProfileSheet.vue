<script setup>
import { ref, watch } from 'vue'
import { useFortuneStore } from '../../stores/fortune'
import { animal } from '../../fortune/art'
import FortuneArt from './FortuneArt.vue'

/** 운세 '내 정보' 입력 창 (아래에서 올라옴) */
const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])
const fortune = useFortuneStore()
const name = ref('')
const birth = ref('')
const gender = ref('')
const error = ref('')
const today = new Date().toISOString().slice(0, 10)

watch(() => props.open, (on) => {
  if (!on) return
  name.value = fortune.profile.name
  birth.value = fortune.profile.birth
  gender.value = fortune.profile.gender || ''
  error.value = ''
}, { immediate: true })

function save() {
  if (!birth.value) return (error.value = '생년월일을 입력해 주세요.')
  if (birth.value > today) return (error.value = '생년월일을 확인해 주세요.')
  fortune.saveProfile({ name: name.value.trim().slice(0, 10), birth: birth.value, gender: gender.value })
  emit('close')
}
const GENDERS = [['', '선택 안 함'], ['m', '남'], ['f', '여']]
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @click.self="fortune.hasProfile && emit('close')">
      <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="fp-title" @submit.prevent="save">
        <span class="grab" aria-hidden="true"></span>
        <div class="head">
          <FortuneArt :svg="animal(3, 48)" />
          <div class="col">
            <h2 id="fp-title">내 정보를 알려 주세요</h2>
            <span class="muted sm">운세 계산에만 쓰고, 이 기기에만 저장돼요</span>
          </div>
        </div>
        <label>이름 (선택)<input v-model="name" maxlength="10" autocomplete="given-name" placeholder="이름" /></label>
        <label>생년월일<input v-model="birth" type="date" :max="today" /></label>
        <div class="lbl">성별 (선택)
          <div class="seg">
            <button v-for="[v, l] in GENDERS" :key="v" type="button" :class="{ on: gender === v }" @click="gender = v">{{ l }}</button>
          </div>
        </div>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <button class="btn btn-primary go">운세 보러 가기</button>
        <button v-if="fortune.hasProfile" type="button" class="btn btn-sm cancel" @click="emit('close')">닫기</button>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 55; display: flex; align-items: flex-end; justify-content: center; background: var(--scrim); }
.sheet {
  width: min(430px, 100%); display: flex; flex-direction: column; gap: 12px;
  padding: 12px 20px calc(24px + env(safe-area-inset-bottom));
  border-radius: 24px 24px 0 0; background: var(--surface); color: var(--text);
  border: var(--bw) solid var(--bc); border-bottom: 0; font-family: var(--font-body);
}
.grab { align-self: center; width: 44px; height: 5px; border-radius: 9px; background: var(--bc); }
.head { display: flex; align-items: center; gap: 12px; }
.col { display: flex; flex-direction: column; }
h2 { margin: 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 18px; }
.sm { font-size: 12px; }
label, .lbl { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: var(--muted); }
input {
  height: 48px; padding: 0 14px; border-radius: var(--r-btn2); border: var(--bw) solid var(--bc);
  background: var(--bg); color: var(--text); font-size: 16px;
}
input:focus { border-color: var(--accent); outline: none; }
.err { margin: 0; color: var(--danger); font-size: 13px; }
.go { height: 52px; font-size: 16px; }
.cancel { align-self: center; }
</style>
