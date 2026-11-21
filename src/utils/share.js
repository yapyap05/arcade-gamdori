/**
 * 게임 공유 — 주소·문구는 여기 한 곳에서만 관리 (도메인이 바뀌면 SHARE_URL 만 수정)
 * 사용자 정보는 보내지 않고, 게임 주소와 홍보 문구만 전달
 */
export const SHARE_URL = 'https://gamdori.onrender.com/'
export const SHARE_TITLE = '겜돌이 월드'
export const SHARE_TEXT = '겜돌이 월드에서 미니게임 15종 같이 해요! 테트리스, 스도쿠, 2048…'
const MAIL_SUBJECT = '겜돌이 월드에서 같이 놀아요'

const enc = encodeURIComponent
const openTab = (url) => window.open(url, '_blank', 'noopener,noreferrer')

/** 클립보드 복사 (지원하지 않는 환경은 임시 입력창으로 대체) */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

const FAIL = '복사하지 못했어요. 주소를 직접 복사해 주세요: ' + SHARE_URL

/** 공유 실행. 화면에 보여 줄 안내 문구를 반환 (없으면 '') */
export async function shareTo(kind) {
  switch (kind) {
    case 'copy':
      return (await copyText(SHARE_URL)) ? '주소를 복사했어요' : FAIL

    case 'telegram':
      openTab(`https://t.me/share/url?url=${enc(SHARE_URL)}&text=${enc(SHARE_TEXT)}`)
      return ''

    case 'email':
      window.location.href = `mailto:?subject=${enc(MAIL_SUBJECT)}&body=${enc(`${SHARE_TEXT}\n${SHARE_URL}`)}`
      return ''

    case 'kakao':
      // 모바일: 폰 공유창에서 카카오톡 선택 / 공유창이 없는 PC: 주소 복사 후 안내
      if (navigator.share) {
        try {
          await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL })
        } catch {}
        return ''
      }
      return (await copyText(SHARE_URL)) ? '주소를 복사했어요. 카카오톡 대화창에 붙여넣어 주세요' : FAIL

    case 'line':
      openTab(`https://social-plugins.line.me/lineit/share?url=${enc(SHARE_URL)}`)
      return ''

    case 'discord': {
      // 디스코드는 외부 공유 링크가 없어서 문구 복사 후 디스코드 열기
      const ok = await copyText(`${SHARE_TEXT}\n${SHARE_URL}`)
      openTab('https://discord.com/app')
      return ok ? '문구를 복사했어요. 디스코드 채팅창에 붙여넣어 주세요' : FAIL
    }

    default:
      return ''
  }
}
