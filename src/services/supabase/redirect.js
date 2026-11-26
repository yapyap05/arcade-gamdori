/**
 * 구글 로그인에서 돌아오면 주소가 https://.../?code=xxx 형태가 된다.
 * 해시 라우터가 첫 화면을 정하기 전에(main.js 맨 처음 import) code 를 꺼내 두고,
 * 주소창을 로그인 전에 보던 화면(#/...)으로 되돌린다.
 */
const RETURN_KEY = 'gamdori:auth-return'
let pendingCode = null

try {
  const url = new URL(location.href)
  const code = url.searchParams.get('code')
  const failed = url.searchParams.has('error')
  if (code || failed) {
    pendingCode = code
    const back = sessionStorage.getItem(RETURN_KEY) || '#/'
    sessionStorage.removeItem(RETURN_KEY)
    history.replaceState(null, '', url.pathname + back)
  }
} catch {}

/** 로그인 버튼을 누를 때: 돌아올 화면 기억 */
export function rememberReturn() {
  try { sessionStorage.setItem(RETURN_KEY, location.hash || '#/') } catch {}
}

/** 한 번만 꺼내 쓰는 로그인 코드 */
export function takePendingCode() {
  const c = pendingCode
  pendingCode = null
  return c
}
