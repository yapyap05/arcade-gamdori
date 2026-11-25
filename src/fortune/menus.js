/**
 * 운세 메뉴 19개 정의 (원본 today_fortune 의 계산을 그대로 옮기고, 결과를 화면용 데이터로 반환)
 *
 * 메뉴 = { id, name, group, icon, fields?, type, run? | deck? }
 *   type  'run'    : 입력값 → 결과 (fields 가 없으면 바로 결과)
 *         'deck'   : 카드 고르기 → 결과  (deck(values) = { key, n, cnt, front(i), back(), fn(ix, r) })
 *         'animal' : 띠 캐릭터 고르기 → 결과
 *         'history': 지난 운세
 *   fields: [{ name, label, type: 'text'|'date'|'select', options? }]
 *   ctx   : { seed(...parts) → 오늘·사용자 기준 시드 문자열, today: Date }
 *
 * 결과 = {
 *   title, cards: [{ label, art, title, desc, reversed }], headline: { score, text },
 *   bars: [[이름, 값]], texts: [], big, table: [[항목, 내용]], numbers: [], arts: [svg], chart: { days },
 *   summary  ← 지난 운세에 남길 한 줄
 * }
 * 오류는 { error: '안내 문구' }
 */
import { rng, pick, ymd, parseDate } from './seed'
import {
  TIPS, QUOTES, LUCKY, ZODIAC, ZODIAC_ELEMENT, ZODIAC_ART, ANIMALS, NAME_ELEMENT, TAROT, HWATU_MONTH, HWATU_KINDS,
  KIND_NAME, KIND_POINT, KIND_MEANING, HWATU_READING, OMIKUJI_GRADE, OMIKUJI_LINES, TEN_GOD_MONEY, TEN_GOD_LOVE,
  SON_DIR, WEEKDAYS, LOVE_ADVICE, BLOOD_TRAIT, TYPE_LIST, TYPE_TRAIT,
} from './data'
import {
  scoreSet, tierText, zodiacIndex, zodiacName, animalOf, stroke, isGoodNumber, dayFortune, lunarDay, daysSince,
} from './calc'
import { hash } from './seed'
import { hwatu, hwatuBack, tarot, tarotBack, omiFace, omiBack, omiTong, omiPaper, animal, pixel } from './art'

export const GROUPS = [
  { id: 'card', label: '카드 점' },
  { id: 'mine', label: '나의 운세' },
  { id: 'fun', label: '재미로 보기' },
  { id: 'period', label: '기간 운세' },
]

const NO_BIRTH = '생년월일을 입력해 주세요.'
const BIRTH = { name: 'birth', label: '생년월일', type: 'date' }
const tipOf = (r) => pick(r, TIPS)
const clamp = (v, lo = 25, hi = 99) => Math.max(lo, Math.min(hi, v))
const barsOf = (s, skip = ['종합']) => Object.entries(s).filter(([k]) => !skip.includes(k))
/** 기본 결과: 점수 4종 + 문구 */
const general = (title, r, extra = []) => {
  const s = scoreSet(r)
  const texts = typeof extra === 'function' ? extra(r) : extra
  return { title, headline: { score: s.종합, text: tierText(s.종합) }, bars: barsOf(s), texts, summary: `${title} 종합 ${s.종합}` }
}
const zodiacArt = (i, z) => (typeof ZODIAC_ART[i] === 'number' ? animal(ZODIAC_ART[i], z) : pixel(ZODIAC_ART[i], z))
const monthDay = (birth) => birth.split('-').map(Number).slice(1)

export const MENUS = [
  /* ───────── 카드 점 ───────── */
  {
    id: 'tarot', name: '타로 운세', group: 'card', icon: 'star', type: 'deck',
    fields: [{ name: 'n', label: '뽑을 장수', type: 'select', options: ['1장', '3장'] }],
    deck: (v) => {
      const n = parseInt(v.n) || 1
      return {
        key: 'tr' + n, n: 22, cnt: n, front: (i) => tarot(i, 3), back: () => tarotBack(2),
        fn: (ix, r) => {
          const L = n > 1 ? ['과거', '현재', '미래'] : ['오늘']
          let up = 0
          const cards = ix.map((i, j) => {
            const rv = r() < 0.3
            up += !rv
            return { label: L[j], art: tarot(i, 3), title: TAROT[i][0], desc: `${rv ? '역방향' : '정방향'} · ${TAROT[i][rv ? 2 : 1]}`, reversed: rv }
          })
          const s = scoreSet(r)
          s.종합 = Math.min(99, 35 + up * (n > 1 ? 20 : 50) + ((r() * 10) | 0))
          return { title: `타로 ${n}장`, cards, headline: { score: s.종합, text: tierText(s.종합) }, bars: barsOf(s), summary: `타로 ${ix.map((i) => TAROT[i][0]).join(' ')} 종합 ${s.종합}` }
        },
      }
    },
  },
  {
    id: 'hwatu', name: '화투 점', group: 'card', icon: 'flower', type: 'deck',
    deck: () => ({
      key: 'ht', n: 12, cnt: 3, front: (i) => hwatu(i, 3), back: () => hwatuBack(2),
      fn: (ix, r) => {
        const L = ['현재', '가까운 미래', '결과']
        const s = scoreSet(r)
        const a = ix.reduce((x, i) => x + HWATU_READING[i][0], 0) / 3
        s.종합 = clamp(Math.round(30 + (a - 2) * 8), 30)
        return {
          title: '화투 점',
          cards: ix.map((i, j) => ({ label: L[j], art: hwatu(i, 3), title: HWATU_MONTH[i], desc: HWATU_READING[i][1] })),
          headline: { score: s.종합, text: tierText(s.종합) }, bars: barsOf(s),
          summary: `화투점 ${ix.map((i) => HWATU_MONTH[i]).join(' ')} 종합 ${s.종합}`,
        }
      },
    }),
  },
  {
    id: 'gostop', name: '고스톱 운세', group: 'card', icon: 'pine', type: 'deck',
    deck: () => ({
      key: 'gs', n: 12, cnt: 3, front: (i) => hwatu(i, 3), back: () => hwatuBack(2),
      fn: (ix, r) => {
        const c = ix.map((i) => ({ i, m: HWATU_MONTH[i], k: HWATU_KINDS[i][(r() * 4) | 0] }))
        const s = scoreSet(r)
        s.종합 = 40 + (c.reduce((a, x) => a + KIND_POINT[x.k], 0) - 3) * 6
        return {
          title: '내가 고른 패',
          cards: c.map((x) => ({ label: x.m, art: hwatu(x.i, 3), title: KIND_NAME[x.k], desc: KIND_MEANING[x.k] })),
          headline: { score: s.종합, text: tierText(s.종합) }, bars: barsOf(s),
          summary: `패 ${c.map((x) => x.m + KIND_NAME[x.k]).join(' ')} 종합 ${s.종합}`,
        }
      },
    }),
  },
  {
    id: 'omikuji', name: '오미쿠지', group: 'card', icon: 'stick', type: 'deck',
    deck: () => ({
      key: 'om', n: 12, cnt: 1, front: () => omiFace(3), back: () => omiBack(2),
      fn: (ix, r) => {
        let x = r() * 100
        let g = 0
        for (; g < 6 && x >= OMIKUJI_GRADE[g][1]; g++) x -= OMIKUJI_GRADE[g][1]
        const t = g < 2 ? 0 : g < 5 ? 1 : 2
        const no = (1 + r() * 99) | 0
        return {
          title: `제 ${no}번`, arts: [omiTong(3), omiPaper(t, 3)], big: OMIKUJI_GRADE[g][0],
          table: OMIKUJI_LINES.map(([k, a]) => [k, a[t]]),
          texts: g > 4 ? ['흉이 나온 신수는 나뭇가지에 묶어 두고 오는 것이 전통이에요.'] : [],
          summary: `오미쿠지 ${OMIKUJI_GRADE[g][0]} 제 ${no}번`,
        }
      },
    }),
  },

  /* ───────── 나의 운세 ───────── */
  {
    id: 'ddi', name: '띠 운세', group: 'mine', icon: 'ANIMAL3', type: 'animal',
    run: (v, ctx) => {
      const t = +v.ddi
      const res = general(`${ANIMALS[t]}띠 오늘의 운세`, rng(ctx.seed('d', t)), (r) => [tipOf(r)])
      return { ...res, cards: [{ label: '나의 캐릭터', art: animal(t, 72) }] }
    },
  },
  {
    id: 'zodiac', name: '별자리 운세', group: 'mine', icon: 'moon', fields: [BIRTH], type: 'run',
    run: (v, ctx) => {
      if (!v.birth) return { error: NO_BIRTH }
      const [m, d] = monthDay(v.birth)
      const z = zodiacName(m, d)
      const res = general(`${z} 오늘의 운세`, rng(ctx.seed('z', z)), (r) => [tipOf(r)])
      return { ...res, cards: [{ label: z, art: zodiacArt(zodiacIndex(m, d), 80) }] }
    },
  },
  {
    id: 'bio', name: '바이오리듬', group: 'mine', icon: 'wave', fields: [BIRTH], type: 'run',
    run: (v) => {
      if (!v.birth) return { error: NO_BIRTH }
      const days = daysSince(v.birth)
      if (days < 0) return { error: '생년월일을 확인해 주세요.' }
      const f = [['신체', 23], ['감성', 28], ['지성', 33]].map(([k, p]) => [k, Math.sin((2 * Math.PI * days) / p)])
      const total = Math.round(50 + (f.reduce((a, x) => a + x[1], 0) / 3) * 50)
      const state = (q) => (q > 0.5 ? '상승기' : q < -0.5 ? '하강기' : Math.abs(q) < 0.1 ? '전환점' : '보통')
      return {
        title: `생후 ${days}일째`, headline: { score: total, text: f.map(([k, q]) => `${k} ${state(q)}`).join(' · ') },
        bars: f.map(([k, q]) => [k, Math.round(50 + 50 * q)]), chart: { days },
        texts: ['세로선이 오늘이에요. 지난 10일부터 앞으로 20일까지 보여 줘요.'],
        summary: `생후 ${days}일 종합 ${total}`,
      }
    },
  },
  {
    id: 'money', name: '재물운', group: 'mine', icon: 'coin', fields: [BIRTH], type: 'run',
    run: (v, ctx) => {
      if (!v.birth) return { error: NO_BIRTH }
      const d = dayFortune(v.birth, ctx.today)
      return {
        title: `오늘은 ${d.ganji}`, headline: { score: d.금전, text: `일진과 나의 관계는 ${d.tenGod}예요.` },
        bars: [['재물운', d.금전], ['직장', d.직장]], texts: [TEN_GOD_MONEY[d.r], tipOf(rng(ctx.seed('mn')))],
        summary: `재물운 ${d.금전} ${d.tenGod}`,
      }
    },
  },
  {
    id: 'love', name: '연애운', group: 'mine', icon: 'heart', type: 'run',
    fields: [BIRTH, { name: 'st', label: '현재 상태', type: 'select', options: ['솔로', '썸', '연애중'] }],
    run: (v, ctx) => {
      if (!v.birth) return { error: NO_BIRTH }
      const d = dayFortune(v.birth, ctx.today)
      return {
        title: '연애운', headline: { score: d.연애, text: TEN_GOD_LOVE[d.r] },
        bars: [['연애운', d.연애], ['종합', d.종합]],
        texts: [`오늘의 달은 ${ZODIAC[d.moon][2]}에 머물러 ${ZODIAC_ELEMENT[d.moon]} 기운이 강해요.`, LOVE_ADVICE[v.st] ?? LOVE_ADVICE.솔로],
        summary: `연애운 ${d.연애} ${d.tenGod}`,
      }
    },
  },
  {
    id: 'move', name: '이사운', group: 'mine', icon: 'house', type: 'run',
    fields: [BIRTH, { name: 'dir', label: '이사 방향', type: 'select', options: ['미정', '동', '서', '남', '북'] }],
    run: (v, ctx) => {
      if (!v.birth) return { error: NO_BIRTH }
      const t = ctx.today
      const ld = lunarDay(t)
      if (isNaN(ld)) return { error: '이 브라우저는 음력 계산을 지원하지 않아요.' }
      const d = dayFortune(v.birth, t)
      const ok = ld % 10 === 9 || ld % 10 === 0
      const hand = SON_DIR[ld % 10] || '없음'
      const bad = v.dir === hand
      const sc = clamp(Math.round((d.종합 + (ok ? 95 : 60)) / 2) - (bad ? 30 : 0))
      const next = []
      for (let i = 1; next.length < 3 && i <= 45; i++) {
        const x = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i)
        const l = lunarDay(x)
        if (l % 10 === 9 || l % 10 === 0) next.push(`${ymd(x)} (${WEEKDAYS[x.getDay()]})`)
      }
      return {
        title: `음력 ${ld}일 · ${ok ? '손 없는 날' : '손이 있는 날'}`, headline: { score: sc, text: `오늘의 손 방향은 ${hand}쪽이에요.${bad ? ' 선택한 방향과 겹치니 피하는 게 좋아요.' : ''}` },
        bars: [['이사운', sc]], texts: [`일진 ${d.ganji}, 나와의 관계 ${d.tenGod}`],
        table: next.map((x, i) => [`다가오는 손 없는 날 ${i + 1}`, x]),
        summary: `이사운 ${sc}${ok ? ' 손없는날' : ''}`,
      }
    },
  },

  /* ───────── 재미로 보기 ───────── */
  {
    id: 'quote', name: '오늘의 한마디', group: 'fun', icon: 'bubble', type: 'run',
    run: (v, ctx) => {
      const q = pick(rng(ctx.seed('q')), QUOTES)
      return { big: q, summary: q }
    },
  },
  {
    id: 'lucky', name: '행운 번호', group: 'fun', icon: 'clover', type: 'run',
    run: (v, ctx) => {
      const r = rng(ctx.seed('lk'))
      const set = new Set()
      while (set.size < 6) set.add((1 + r() * 45) | 0)
      const nums = [...set].sort((a, b) => a - b)
      const color = pick(r, LUCKY.color), dir = pick(r, LUCKY.dir), hour = (r() * 24) | 0
      const item = pick(r, LUCKY.item), food = pick(r, LUCKY.food)
      return {
        title: '행운의 번호', numbers: nums,
        table: [['색', color], ['방향', dir], ['시간', `${hour}시`], ['물건', item], ['음식', food]],
        summary: '행운번호 ' + nums.join(' '),
      }
    },
  },
  {
    id: 'name', name: '이름 풀이', group: 'fun', icon: 'pen', type: 'run',
    fields: [{ name: 'name', label: '이름 (한글 2~4자)', type: 'text' }],
    run: (v) => {
      const n = v.name
      if (!/^[가-힣]{2,4}$/.test(n)) return { error: '한글 이름 2~4자를 입력해 주세요.' }
      const s = [...n].map(stroke)
      const a = s[0], g = s.slice(1), gs = g.reduce((x, y) => x + y, 0)
      const grades = [['천격', a + 1], ['인격', a + g[0]], ['지격', gs + (g.length < 2 ? 1 : 0)], ['총격', a + gs]]
      const sc = Math.min(99, 40 + grades.filter(([, x]) => isGoodNumber(x)).length * 15)
      const el = ['수', '목', '목', '화', '화', '토', '토', '금', '금', '수'][(a + gs) % 10]
      const msg = sc >= 90 ? '획수 구성이 매우 안정적인 이름이에요.' : sc >= 70 ? '전반적으로 균형이 좋은 이름이에요.'
        : sc >= 55 ? '무난하며 노력으로 채워 가는 이름이에요.' : '획수 해석은 참고만 하세요. 이름의 힘은 쓰는 사람이 만들어요.'
      return {
        title: `${n} 이름 풀이`, headline: { score: sc, text: msg },
        table: grades.map(([k, x]) => [k, `${x}획 · ${isGoodNumber(x) ? '길수' : '보통수'}`]),
        texts: [`이름의 중심 기운은 ${el}이며 ${NAME_ELEMENT[el]}을 상징해요.`],
        summary: `${n} 이름 풀이 ${sc}`,
      }
    },
  },
  {
    id: 'match', name: '궁합 보기', group: 'fun', icon: 'heart', type: 'run',
    fields: [
      { name: 'n1', label: '나의 이름', type: 'text' }, { name: 'b1', label: '나의 생년월일', type: 'date' },
      { name: 'n2', label: '상대 이름', type: 'text' }, { name: 'b2', label: '상대 생년월일', type: 'date' },
    ],
    run: (v) => {
      if (!v.n1 || !v.n2 || !v.b1 || !v.b2) return { error: '이름과 생년월일을 모두 입력해 주세요.' }
      const a = animalOf(+v.b1.split('-')[0]), b = animalOf(+v.b2.split('-')[0]), d = (a - b + 12) % 12
      const rel = d === 4 || d === 8 ? ['삼합', 30] : (a + b) % 12 === 1 ? ['육합', 25] : d === 6 ? ['상충', -20] : ['무난', 0]
      const ns = [...(v.n1 + v.n2)].reduce((x, c) => x + stroke(c), 0) || hash(v.n1 + v.n2) % 60
      const r = rng(v.n1 + v.n2 + v.b1 + v.b2)
      const sc = clamp(50 + rel[1] + (isGoodNumber(ns) ? 10 : 0) + ((r() * 20) | 0), 20)
      const s = { 성격: (30 + r() * 70) | 0, 애정: (30 + r() * 70) | 0, 대화: (30 + r() * 70) | 0 }
      const msg = sc >= 85 ? '천생연분에 가까운 궁합이에요.' : sc >= 70 ? '서로를 보완하는 좋은 궁합이에요.'
        : sc >= 55 ? '노력하면 충분히 좋아지는 궁합이에요.' : '서로 다름을 인정할수록 좋아지는 궁합이에요.'
      return {
        title: `${ANIMALS[a]}띠와 ${ANIMALS[b]}띠 · ${rel[0]}`, headline: { score: sc, text: msg },
        cards: [{ label: v.n1, art: animal(a, 56) }, { label: v.n2, art: animal(b, 56) }],
        bars: Object.entries(s), summary: `${ANIMALS[a]}띠와 ${ANIMALS[b]}띠 ${rel[0]} 궁합 ${sc}`,
      }
    },
  },
  {
    id: 'blood', name: '혈액형 운세', group: 'fun', icon: 'drop', type: 'run',
    fields: [{ name: 'bt', label: '혈액형', type: 'select', options: ['A', 'B', 'O', 'AB'] }],
    run: (v, ctx) => general(`${v.bt}형 오늘의 운세`, rng(ctx.seed('bt', v.bt)), (r) => [`${BLOOD_TRAIT[v.bt]} 성향이 오늘 운에 영향을 줘요.`, tipOf(r)]),
  },
  {
    id: 'type', name: '성격유형 운세', group: 'fun', icon: 'eye', type: 'run',
    fields: [{ name: 't', label: '성격 유형', type: 'select', options: TYPE_LIST }],
    run: (v, ctx) => general(`${v.t} 오늘의 운세`, rng(ctx.seed('mb', v.t)), (r) => [[...v.t].map((c) => TYPE_TRAIT[c]).join('. ') + '.', tipOf(r)]),
  },

  /* ───────── 기간 운세 ───────── */
  {
    id: 'week', name: '주간 운세', group: 'period', icon: 'cal', fields: [BIRTH], type: 'run',
    run: (v, ctx) => {
      if (!v.birth) return { error: NO_BIRTH }
      const n = ctx.today
      const mon = new Date(n.getFullYear(), n.getMonth(), n.getDate() - ((n.getDay() + 6) % 7))
      const ds = [...Array(7)].map((_, i) => {
        const x = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)
        return { x, d: dayFortune(v.birth, x) }
      })
      const avg = (k) => Math.round(ds.reduce((a, y) => a + y.d[k], 0) / 7)
      const best = ds.reduce((p, y) => (y.d.종합 > p.d.종합 ? y : p))
      const worst = ds.reduce((p, y) => (y.d.종합 < p.d.종합 ? y : p))
      return {
        title: '이번 주 흐름',
        bars: ds.map((y) => [`${WEEKDAYS[y.x.getDay()]} ${y.x.getDate()}일`, y.d.종합]),
        table: [['주간 연애', avg('연애')], ['주간 금전', avg('금전')], ['주간 직장', avg('직장')]],
        texts: [`가장 좋은 날은 ${WEEKDAYS[best.x.getDay()]}요일, 조심할 날은 ${WEEKDAYS[worst.x.getDay()]}요일이에요.`],
        summary: `주간운세 최고 ${WEEKDAYS[best.x.getDay()]} 주의 ${WEEKDAYS[worst.x.getDay()]}`,
      }
    },
  },
  {
    id: 'month', name: '월간 운세', group: 'period', icon: 'cal', fields: [BIRTH], type: 'run',
    run: (v, ctx) => {
      if (!v.birth) return { error: NO_BIRTH }
      const n = ctx.today, y = n.getFullYear(), m = n.getMonth(), len = new Date(y, m + 1, 0).getDate()
      const ds = [...Array(len)].map((_, i) => ({ i: i + 1, d: dayFortune(v.birth, new Date(y, m, i + 1)) }))
      const weeks = [...Array(Math.ceil(len / 7))].map((_, w) => {
        const a = ds.slice(w * 7, w * 7 + 7)
        return Math.round(a.reduce((s, q) => s + q.d.종합, 0) / a.length)
      })
      const sorted = [...ds].sort((p, q) => q.d.종합 - p.d.종합)
      const f = (a) => a.map((q) => `${m + 1}월 ${q.i}일`).join(', ')
      return {
        title: `${m + 1}월 주차별 흐름`, bars: weeks.map((s, w) => [`${w + 1}주`, s]),
        table: [['좋은 날', f(sorted.slice(0, 3))], ['조심할 날', f(sorted.slice(-2))]],
        summary: `${m + 1}월운세 좋은날 ${f(sorted.slice(0, 1))}`,
      }
    },
  },
  { id: 'hist', name: '지난 운세', group: 'period', icon: 'clock', type: 'history' },
]

export const getMenu = (id) => MENUS.find((m) => m.id === id)

/** 메뉴 아이콘 그림 */
export const menuArt = (m, z = 30) => (m.icon === 'ANIMAL3' ? animal(3, z) : pixel(m.icon, z))

/** 홈 화면 '오늘의 종합 운세' (생일 기준 일진) */
export function todaySummary(birth, today = new Date()) {
  if (!birth) return null
  const d = dayFortune(birth, today)
  return { score: d.종합, text: tierText(d.종합), bars: [['연애', d.연애], ['금전', d.금전], ['직장', d.직장]], ganji: d.ganji, tenGod: d.tenGod }
}

/** 생일 → { animal: 띠 번호, zodiac: 별자리 이름 } */
export function profileTags(birth) {
  if (!birth) return null
  const d = parseDate(birth)
  return { animal: animalOf(d.getFullYear()), zodiac: zodiacName(d.getMonth() + 1, d.getDate()) }
}
