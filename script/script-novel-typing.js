// --------------------------------------------
// State
// --------------------------------------------
const state = {
  novels: [],
  currentNovel: null,
  currentSentenceIdx: 0,
  isPlaying: false,

  startTime: null,
  sentenceStartTime: null,
  totalMatchedCharCount: 0,

  logs: [],
  timerInterval: null,
};

// --------------------------------------------
// DOM
// --------------------------------------------
const el = {
  btnStart: document.getElementById('btnStart'),
  btnRestartAll: document.getElementById('btnRestartAll'),
  btnGotoIndex: document.getElementById('btnGotoIndex'),
  novelSelect: document.getElementById('novelSelect'),

  wordDisplay: document.getElementById('wordDisplay'),
  inputField: document.getElementById('inputField'),

  logBody: document.getElementById('logBody'),

  hudWpm: document.getElementById('hudWpm'),
  hudAcc: document.getElementById('hudAcc'),
  hudTimer: document.getElementById('hudTimer'),
  hudNovelTitle: document.getElementById('hudNovelTitle'),
  progressInfo: document.getElementById('progressInfo'),

  toast: new bootstrap.Toast(document.getElementById('toast')),
  toastBody: document.getElementById('toastBody'),
};

// --------------------------------------------
// Utils
// --------------------------------------------
function now() {
  return new Date().getTime();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function showToast(msg, type = 'dark') {
  const toastEl = document.getElementById('toast');
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  el.toastBody.textContent = msg;
  el.toast.show();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// --------------------------------------------
// Init / Load
// --------------------------------------------
async function init() {
  try {
    const res = await fetch('../assets/data/text-data-novel.json');
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();

    state.novels = data.novels ?? [];
    if (state.novels.length === 0) throw new Error('No novels');

    el.novelSelect.innerHTML = state.novels
      .map((n, i) => `<option value="${i}">${escapeHtml(n.title)}</option>`)
      .join('');

    showToast('문학 데이터 로드 완료', 'success');
  } catch (e) {
    console.error(e);
    el.novelSelect.innerHTML = `<option>데이터 로드 실패</option>`;
    showToast('데이터를 불러오지 못했습니다. 경로를 확인하세요.', 'danger');
  }

  resetGame(false);
}

// --------------------------------------------
// Game Flow
// --------------------------------------------
function startGame() {
  if (state.novels.length === 0) return;

  state.currentNovel = state.novels[Number(el.novelSelect.value)];
  state.currentSentenceIdx = 0;
  state.totalMatchedCharCount = 0;
  state.logs = [];

  state.isPlaying = true;
  state.startTime = now();
  state.sentenceStartTime = now();

  el.inputField.disabled = false;
  el.inputField.value = '';
  el.inputField.focus();

  el.btnStart.disabled = true;
  el.novelSelect.disabled = true;

  el.hudNovelTitle.textContent = state.currentNovel.title;

  renderLog();
  renderSentence();

  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(updateGlobalStats, 100);

  showToast('타이핑 시작!', 'primary');
}

function resetGame(showMsg = true) {
  state.isPlaying = false;
  clearInterval(state.timerInterval);

  el.inputField.disabled = true;
  el.inputField.value = '';
  el.wordDisplay.innerHTML = `준비되셨나요? <span class="text-neon">시작</span> 버튼을 눌러주세요.`;

  el.btnStart.disabled = false;
  el.novelSelect.disabled = false;

  el.hudWpm.textContent = '0';
  el.hudAcc.textContent = '100%';
  el.hudAcc.className = 'h4 mb-0 mono text-good';
  el.hudTimer.textContent = '0s';
  el.progressInfo.textContent = '0 / 0';

  renderLog();

  if (showMsg) showToast('게임이 리셋되었습니다.', 'secondary');
}

function finishGame() {
  state.isPlaying = false;
  clearInterval(state.timerInterval);

  el.inputField.disabled = true;
  el.wordDisplay.innerHTML = `
    <div class="text-center text-neon py-2 fs-4">
      🎉 전 문장 타이핑 완료!
    </div>
    <div class="text-center text-white-50 small mt-1">
      고생하셨습니다 ✨
    </div>
  `;

  el.btnStart.disabled = false;
  el.novelSelect.disabled = false;

  showToast('완독을 축하합니다!', 'success');
}

// --------------------------------------------
// Rendering
// --------------------------------------------
function renderSentence() {
  const sentences = state.currentNovel.sentences;
  const current = sentences[state.currentSentenceIdx];

  if (!current) {
    finishGame();
    return;
  }

  el.progressInfo.textContent = `${state.currentSentenceIdx + 1} / ${sentences.length}`;

  el.wordDisplay.innerHTML = current
    .split('')
    .map(ch => `<span class="char">${escapeHtml(ch)}</span>`)
    .join('');

  updateCharStatus();
}

function renderLog() {
  if (state.logs.length === 0) {
    el.logBody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center py-4 text-white-50">기록이 없습니다.</td>
      </tr>
    `;
    return;
  }

  el.logBody.innerHTML = state.logs
    .map(log => `
      <tr>
        <td class="text-start text-truncate" style="max-width: 220px;">
          ${escapeHtml(log.content)}
        </td>
        <td class="mono">
          <span class="text-neon">${log.wpm}</span>
          <span class="mx-1 text-white-25">|</span>
          <span class="${log.acc < 90 ? 'text-bad' : 'text-good'}">${log.acc}%</span>
        </td>
      </tr>
    `)
    .join('');
}

// --------------------------------------------
// Typing Logic
// --------------------------------------------
function updateCharStatus() {
  const sentence = state.currentNovel.sentences[state.currentSentenceIdx];
  const inputVal = el.inputField.value;
  const charSpans = el.wordDisplay.querySelectorAll('.char');

  let correctCount = 0;

  charSpans.forEach((span, i) => {
    if (i < inputVal.length) {
      if (inputVal[i] === sentence[i]) {
        span.className = 'char correct';
        correctCount++;
      } else {
        span.className = 'char wrong';
      }
    } else if (i === inputVal.length) {
      span.className = 'char current';
    } else {
      span.className = 'char';
    }
  });

  const acc = inputVal.length > 0
    ? Math.floor((correctCount / inputVal.length) * 100)
    : 100;

  el.hudAcc.textContent = acc + '%';
  el.hudAcc.className = `h4 mb-0 mono ${acc < 90 ? 'text-bad' : 'text-white-50'}`;

  // Sentence completed
  if (inputVal === sentence) {
    addLog(sentence, acc);

    state.totalMatchedCharCount += sentence.length;
    state.currentSentenceIdx++;
    state.sentenceStartTime = now();

    el.inputField.value = '';
    renderSentence();
  }
}

// --------------------------------------------
// Stats / HUD
// --------------------------------------------
function updateGlobalStats() {
  const diffSec = (now() - state.startTime) / 1000;
  el.hudTimer.textContent = Math.floor(diffSec) + 's';

  const currentLen = el.inputField.value.length;

  // 한글 타수 보정 계수 2.8
  const speed = diffSec > 0
    ? Math.floor(((state.totalMatchedCharCount + currentLen) * 60 * 2.8) / diffSec)
    : 0;

  el.hudWpm.textContent = speed;
}

function addLog(content, acc) {
  const durationSec = (now() - state.sentenceStartTime) / 1000;
  const wpm = Math.floor((content.length * 60 * 2.8) / clamp(durationSec, 0.5, 9999));

  state.logs.unshift({ content, wpm, acc });
  renderLog();
}

// --------------------------------------------
// Events
// --------------------------------------------
el.btnStart.addEventListener('click', startGame);
el.btnRestartAll.addEventListener('click', () => resetGame(true));
el.btnGotoIndex.addEventListener('click', () => { location.href = "../index.html"; });
el.inputField.addEventListener('input', () => {
  if (state.isPlaying) updateCharStatus();
});

// --------------------------------------------
// Boot
// --------------------------------------------
init();
