# 겜돌이 월드 Firebase 설정 안내

로그인(구글)과 랭킹(Firestore)을 켜는 방법이에요. **무료 요금제(Spark)** 로 충분해요.

| 모드 | 실행 | 데이터 |
|---|---|---|
| 더미 | `npm run dev` (설정값 없음) | 이 브라우저 localStorage |
| 에뮬레이터 | `npm run emulators` + `npm run dev:emu` | 내 PC (끄면 초기화) |
| 실제 Firebase | `.env.local` 작성 후 `npm run dev` | Firebase 클라우드 |

---

## 0. 준비

```powershell
npm install -g firebase-tools
firebase --version
```
Firestore 에뮬레이터는 Java가 필요해요 (`java -version` 으로 확인).

## 1. 에뮬레이터로 연습 (계정 없이)

터미널 2개를 열어요.

```powershell
npm run emulators
```
```powershell
npm run dev:emu
```

- 앱: 터미널에 나오는 주소 (보통 http://localhost:5173)
- 에뮬레이터 관리 화면: http://localhost:4000 — Authentication / Firestore 탭에서 가입자·랭킹 데이터를 직접 볼 수 있어요
- 구글 로그인은 가짜 계정 선택 창이 떠요. **Add new account** → **Auto-generate user information** 으로 연습 계정을 만들 수 있어요
- 보안 규칙(`firestore.rules`)이 그대로 적용돼요. 규칙을 고치면 에뮬레이터를 다시 켜세요
- 휴대폰으로 시험할 때: `npm run dev:emu -- --host` 후 터미널의 Network 주소로 접속 (에뮬레이터는 같은 PC 주소로 자동 연결)

## 2. 실제 Firebase 프로젝트 만들기

1. https://console.firebase.google.com → **프로젝트 추가** (Google 애널리틱스는 꺼도 됨)
2. 프로젝트 개요의 **웹(`</>`) 앱 추가** → 앱 닉네임 입력 → 나오는 `firebaseConfig` 값을 메모
3. **빌드 → Authentication → 시작하기 → 로그인 방법 → Google → 사용 설정** (지원 이메일 선택)
4. **Authentication → 설정 → 승인된 도메인** 에 추가
   - `gamdori.onrender.com`
   - (`localhost` 는 기본으로 들어 있음)
5. **빌드 → Firestore Database → 데이터베이스 만들기**
   - 위치: `asia-northeast3 (서울)` (한 번 정하면 못 바꿔요)
   - 모드: 프로덕션 모드
6. 보안 규칙 배포 (프로젝트 ID 는 콘솔 **프로젝트 설정** 에 있어요)
   ```powershell
   firebase login
   ```
   ```powershell
   firebase deploy --only firestore:rules --project <프로젝트ID>
   ```
   또는 콘솔 **Firestore → 규칙** 탭에 `firestore.rules` 내용을 붙여넣고 **게시**

## 3. 앱에 설정값 넣기

프로젝트 루트에 `.env.local` 파일을 만들어요 (git 에 올라가지 않아요).

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`npm run dev` 를 다시 켜면 실제 Firebase 로 연결돼요. (웹 설정값은 비밀번호가 아니라 브라우저에 공개되는 값이에요. 데이터 보호는 보안 규칙이 담당해요.)

## 4. Render 배포에 연결

Render 대시보드 → 서비스 → **Environment** 에 위 6개 값을 같은 이름으로 추가 → **다시 배포**.
(Vite 는 빌드할 때 값을 넣기 때문에 값을 바꾸면 꼭 다시 배포해야 해요.)

## 5. 사용량 확인

- 콘솔 **Firestore → 사용량** 에서 하루 읽기/쓰기 횟수 확인
- 무료 한도: 하루 읽기 5만 · 쓰기 2만 · 저장 1GB. 넘으면 요금 대신 그날만 요청이 막혀요
- 앱은 랭킹을 1분 동안 캐시하고, 랭킹 화면은 TOP 20부터 보여 줘서 읽기를 아껴요

## 6. 규칙·상한을 바꿀 때 함께 고칠 곳

| 무엇 | 파일 1 | 파일 2 |
|---|---|---|
| 닉네임 규칙 | `src/services/nickname.js` | `firestore.rules` 의 `validNick` |
| 게임별 점수 상한 | `src/games/scoreLimits.js` | `firestore.rules` 의 `maxScores` |
| 게임 추가 | 위 두 상한 표에 `{게임ID}_casual`, `{게임ID}_competitive` 추가 | |

## 다음 단계 (선택)

- **App Check**: 앱 밖에서 보내는 점수 요청 차단 (reCAPTCHA, 무료 사용량 있음)
- **Cloud Functions 점수 검증**: 가장 강력하지만 Blaze(종량제) 요금제 필요
