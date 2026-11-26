/**
 * 닉네임 규칙 (supabase/schema.sql 의 profiles.nickname check 와 같게 유지)
 * 2~12자, 한글·영문·숫자·_
 */
export const NICK_RULE = /^[가-힣a-zA-Z0-9_]{2,12}$/

/** 중복 확인용 키 (대소문자 구분 없이 같은 닉네임으로 취급) */
export const nickKey = (nick) => nick.trim().toLowerCase()
