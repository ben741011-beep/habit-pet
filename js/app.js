/* ===================================================================
   習慣寵物 — 用養寵物的方式培養好習慣
   Data in localStorage · Offline-ready PWA
   =================================================================== */

const APP_VERSION = 'v1.5.0 (2026-03-19)';

// ====== Audio System (Web Audio API) ======
let audioCtx = null;
let bgmGain = null;
let sfxEnabled = true;
let bgmEnabled = true;
let bgmInterval = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// --- Sound Effects ---
function playSfx(type) {
  if (!sfxEnabled) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  if (type === 'ding') {
    // Cheerful "ding" for completing a habit
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, now);
    o.frequency.setValueAtTime(1175, now + 0.08);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start(now); o.stop(now + 0.4);
  } else if (type === 'pop') {
    // Cute "pop" for pet tap
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(600, now);
    o.frequency.exponentialRampToValueAtTime(900, now + 0.06);
    o.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(now); o.stop(now + 0.25);
  } else if (type === 'levelup') {
    // Triumphant ascending notes
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, now + i * 0.15);
      g.gain.setValueAtTime(0, now + i * 0.15);
      g.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.4);
    });
  }
}

// --- Background Music (gentle loop) ---
const BGM_MELODY = [
  // [freq, duration(s)]
  [523,0.4],[587,0.4],[659,0.4],[523,0.4],
  [659,0.4],[698,0.4],[784,0.8],
  [784,0.3],[880,0.3],[784,0.3],[698,0.3],[659,0.4],[523,0.4],
  [523,0.4],[392,0.4],[523,0.8],
  [0, 0.8],  // rest
];

function startBgm() {
  if (bgmInterval) return;
  const ctx = getAudioCtx();
  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.06; // very soft
  bgmGain.connect(ctx.destination);
  let noteIdx = 0;
  function playNote() {
    if (!bgmEnabled) return;
    const [freq, dur] = BGM_MELODY[noteIdx % BGM_MELODY.length];
    if (freq > 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur * 0.9);
      o.connect(g).connect(bgmGain);
      o.start(); o.stop(ctx.currentTime + dur);
    }
    noteIdx++;
    bgmInterval = setTimeout(playNote, dur * 1000);
  }
  playNote();
}

function stopBgm() {
  if (bgmInterval) { clearTimeout(bgmInterval); bgmInterval = null; }
}

function toggleSound() {
  sfxEnabled = !sfxEnabled;
  bgmEnabled = sfxEnabled;
  if (bgmEnabled) { startBgm(); } else { stopBgm(); }
  localStorage.setItem('habit-pet-sound', sfxEnabled ? 'on' : 'off');
  updateSoundBtn();
}

function updateSoundBtn() {
  const btn = document.getElementById('btn-sound');
  if (btn) btn.textContent = sfxEnabled ? '🔊' : '🔇';
}

function initSound() {
  const saved = localStorage.getItem('habit-pet-sound');
  sfxEnabled = saved !== 'off';
  bgmEnabled = sfxEnabled;
  updateSoundBtn();
}

// ====== Pet Species Config ======
const SPECIES = {
  rabbit: { name: '兔兔', icon: '🐰',
    stages: ['miffy-head','miffy-orange','miffy-blue','miffy-yellow','miffy-pink','miffy-green','miffy-purple','miffy-rainbow'],
    stageLv: [1,2,3,4,5,6,7,8],
    stageLabels: ['小臉','橘衣米菲','藍衣米菲','黃衣米菲','粉衣米菲','綠衣米菲','紫衣米菲','彩虹米菲'],
    images: {
      'miffy-head':    'icons/miffy-head.svg',
      'miffy-orange':  'icons/miffy-orange.svg',
      'miffy-blue':    'icons/miffy-blue.svg',
      'miffy-yellow':  'icons/miffy-yellow.svg',
      'miffy-pink':    'icons/miffy-pink.svg',
      'miffy-green':   'icons/miffy-green.svg',
      'miffy-purple':  'icons/miffy-purple.svg',
      'miffy-rainbow': 'icons/miffy-rainbow.svg',
    }
  },
};

// Render rabbit image for a stage
function renderMiffy(stage) {
  const sp = SPECIES.rabbit;
  const src = (sp.images && sp.images[stage]) || 'icons/miffy-head.png';
  return `<img class="miffy-img ${stage}" src="${src}" alt="${stage}" draggable="false">`;
}

const HABIT_EMOJIS = ['💪','📖','🦷','🧹','🏃','💤','🥗','🧘','✏️','🎹','🚿','🌅','💊','🚶','🧠','🎯','💧','🍎','📵','🙏','🍼','pacifier'];

// Companion rabbit layout per level (left-to-right order, stage indices)
// Lv.2: [2]           → center
// Lv.3: [2,3]         → left, right
// Lv.4: [2,4,3]       → left, center, right
// Lv.5: [2,4,5,3]     → ...expanding outward
// Lv.6: [2,4,6,5,3]
// Lv.7: [2,4,6,7,5,3]
// Lv.8: [2,4,6,8,7,5,3]
const COMPANION_LAYOUTS = {
  2: [1],
  3: [1, 2],
  4: [1, 3, 2],
  5: [1, 3, 4, 2],
  6: [1, 3, 5, 4, 2],
  7: [1, 3, 5, 6, 4, 2],
  8: [1, 3, 5, 7, 6, 4, 2],
};

// Evenly spaced positions for N companions (left-to-right %)
const COMPANION_SPREADS = {
  1: [50],
  2: [28, 72],
  3: [18, 50, 82],
  4: [12, 36, 64, 88],
  5: [8, 28, 50, 72, 92],
  6: [6, 22, 40, 60, 78, 94],
  7: [4, 18, 34, 50, 66, 82, 96],
};

function renderCompanions(level) {
  document.querySelectorAll('.pet-companion').forEach(el => el.remove());
  if (level <= 1 || !state.pet) return;
  const sp = SPECIES[state.pet.species];
  if (!sp) return;
  const scene = $('#pet-scene');
  const layout = COMPANION_LAYOUTS[Math.min(level, 8)];
  if (!layout) return;
  const positions = COMPANION_SPREADS[layout.length];
  for (let i = 0; i < layout.length; i++) {
    const stageIdx = layout[i];
    const stage = sp.stages[stageIdx] || sp.stages[sp.stages.length - 1];
    const el = document.createElement('div');
    el.className = 'pet-companion';
    el.innerHTML = renderMiffy(stage);
    el.style.left = positions[i] + '%';
    el.style.bottom = '38px';
    el.style.animationDelay = (i * 0.3) + 's';
    scene.appendChild(el);
  }
}

// Custom icon mapping (non-emoji icons)
const CUSTOM_ICONS = {
  pacifier: { src: 'icons/pacifier.svg', label: '奶嘴' },
};

// Render an emoji or custom icon as HTML
function renderIcon(icon, size) {
  size = size || 'inherit';
  if (CUSTOM_ICONS[icon]) {
    return `<img src="${CUSTOM_ICONS[icon].src}" alt="${CUSTOM_ICONS[icon].label}" style="width:${size};height:${size};vertical-align:middle;display:inline-block">`;
  }
  return icon;
}

const XP_TABLE = [0]; // xp needed for each level
for (let i = 1; i <= 200; i++) XP_TABLE[i] = Math.floor(30 * i + 10 * Math.pow(i, 1.3));

// ====== Persistence ======
const STORE_KEY = 'habit-pet-data';

const DEFAULTS = {
  pet: null,           // { name, species, xp, createdAt }
  habits: [],          // [{ id, emoji, name }]
  dailyLog: {},        // { "2026-03-18": ["habit-id", ...] }
  streak: 0,
  lastActiveDate: null,
  plan: null,          // { startDate, completedDays: ["2026-03-18",...] }
  plansCompleted: 0,   // number of 7-day plans completed
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function saveData() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

let state = loadData();

// ====== Utility ======
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

// ====== Pet Calculations ======
function petLevel(xp) {
  // Level = 1 + number of completed 7-day plans
  return 1 + (state.plansCompleted || 0);
}

function petStage(species, level) {
  const sp = SPECIES[species];
  if (!sp) return '🥚';
  for (let i = sp.stageLv.length - 1; i >= 0; i--) {
    if (level >= sp.stageLv[i]) return sp.stages[i];
  }
  return sp.stages[0];
}

function xpForNextLevel(level) {
  // Next level = complete a 7-day plan
  return 7;
}

function xpProgress(xp, level) {
  // Progress = how many days completed in current plan (0-7)
  if (!state.plan) return 0;
  const days = state.plan.completedDays ? state.plan.completedDays.length : 0;
  return Math.min(100, Math.round((days / 7) * 100));
}

// ====== Daily Decay ======
function processDayChange() {
  const today = todayStr();
  if (!state.pet) return;
  if (state.lastActiveDate && state.lastActiveDate !== today) {
    const last = new Date(state.lastActiveDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / 86400000);

    // Decay per missed day
    // Check if yesterday had all habits done → streak
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const yLog = state.dailyLog[yStr] || [];
    if (yLog.length >= state.habits.length && state.habits.length > 0) {
      state.streak++;
    } else if (diffDays === 1) {
      state.streak = 0;
    } else {
      state.streak = 0;
    }
  }
  state.lastActiveDate = today;
  saveData();
}

// ====== Render: Onboarding ======
function renderOnboarding() {
  const el = $('#onboarding');
  if (state.pet) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');

  const picker = $('#species-picker');
  picker.innerHTML = '';
  let selected = 'rabbit';

  Object.entries(SPECIES).forEach(([key, sp]) => {
    const btn = document.createElement('div');
    btn.className = 'species-option' + (key === selected ? ' selected' : '');
    btn.dataset.species = key;
    btn.innerHTML = `<span class="species-option-emoji">${sp.icon}</span><span class="species-option-name">${sp.name}</span>`;
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.species-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selected = key;
    });
    picker.appendChild(btn);
  });

  $('#btn-start').onclick = () => {
    const name = $('#pet-name-input').value.trim() || '小寶';
    state.pet = {
      name,
      species: selected,
      xp: 0,
      createdAt: todayStr(),
    };
    state.lastActiveDate = todayStr();
    saveData();
    el.classList.add('hidden');
    renderAll();
  };
}

// ====== Render: Pet Page ======
function renderPetPage() {
  if (!state.pet) return;
  const p = state.pet;
  const lv = petLevel(p.xp);
  const emoji = petStage(p.species, lv);
  const xpProg = xpProgress(p.xp, lv);

  const sp = SPECIES[p.species];
  const petEl = $('#pet-emoji');
  petEl.textContent = '';
  petEl.innerHTML = renderMiffy(emoji);
  $('#pet-name-display').textContent = p.name;
  $('#pet-level-badge').textContent = `Lv.${lv}`;

  // Render companion rabbits
  renderCompanions(lv);

  // Stats bars
  $('#bar-xp').style.width = xpProg + '%';
  const planDays = state.plan ? state.plan.completedDays.length : 0;
  $('#val-xp').textContent = `${planDays}/7 天`;

  // Status icon
  const statusEl = $('#pet-status-icon');
  statusEl.classList.add('hidden');

  renderTodayHabits();
  render7DayPlan();
}

// ====== 7-Day Plan ======
function ensure7DayPlan() {
  if (!state.plan) {
    state.plan = { startDate: todayStr(), completedDays: [] };
    saveData();
  }
}

function render7DayPlan() {
  const section = $('#plan-section');
  if (!state.pet || state.habits.length === 0) {
    section.classList.add('hidden');
    return;
  }
  ensure7DayPlan();
  section.classList.remove('hidden');

  const plan = state.plan;
  const startDate = new Date(plan.startDate + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  const daysContainer = $('#plan-days');
  const label = $('#plan-day-label');
  const reward = $('#plan-reward');
  daysContainer.innerHTML = '';

  const completedCount = plan.completedDays.length;
  const isFinished = completedCount >= 7;
  label.textContent = isFinished ? '🎉 完成！' : `第 ${completedCount}/7 天`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dStr = d.toISOString().slice(0, 10);
    const isToday = dStr === todayStr();
    const isCompleted = plan.completedDays.includes(dStr);
    const isPast = d < today && !isToday;
    const isMissed = isPast && !isCompleted;

    const div = document.createElement('div');
    div.className = 'plan-day';
    if (isCompleted) div.classList.add('completed');
    else if (isToday) div.classList.add('today');
    else if (isMissed) div.classList.add('missed');

    div.innerHTML = `
      <div class="plan-day-num">Day ${i + 1}</div>
      <div class="plan-day-icon"></div>
    `;
    daysContainer.appendChild(div);
  }

  reward.classList.toggle('hidden', !isFinished);
}

function checkAndMarkPlanDay() {
  if (!state.plan || !state.pet) return;
  const today = todayStr();
  const todayLog = state.dailyLog[today] || [];

  // All habits done today?
  if (todayLog.length >= state.habits.length && state.habits.length > 0) {
    if (!state.plan.completedDays.includes(today)) {
      state.plan.completedDays.push(today);
      saveData();
      render7DayPlan();

      if (state.plan.completedDays.length >= 7) {
        // Big celebration for completing 7-day plan!
        state.plansCompleted = (state.plansCompleted || 0) + 1;
        state.pet.xp += 100;
        saveData();
        setTimeout(() => { showLevelUpCelebration(1 + state.plansCompleted); playSfx('levelup'); }, 500);
      }
    }
  }
}

// ====== Debug: Simulate a day ======
let debugDayOffset = 0;

function debugSimulateDay() {
  if (!state.pet || state.habits.length === 0) {
    alert('請先建立寵物並新增至少一個習慣！');
    return;
  }
  ensure7DayPlan();

  // Find the next incomplete day in the plan
  const startDate = new Date(state.plan.startDate + 'T00:00:00');
  let targetDate = null;

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dStr = d.toISOString().slice(0, 10);
    if (!state.plan.completedDays.includes(dStr)) {
      targetDate = dStr;
      break;
    }
  }

  if (!targetDate) {
    alert('7 天計畫已全部完成！請重置計畫再試。');
    return;
  }

  // Simulate completing all habits for that day
  if (!state.dailyLog[targetDate]) state.dailyLog[targetDate] = [];
  state.habits.forEach(h => {
    if (!state.dailyLog[targetDate].includes(h.id)) {
      state.dailyLog[targetDate].push(h.id);
    }
  });
  state.streak++;

  // Mark plan day
  if (!state.plan.completedDays.includes(targetDate)) {
    state.plan.completedDays.push(targetDate);
  }

  // Check 7-day reward
  if (state.plan.completedDays.length >= 7) {
    state.plansCompleted = (state.plansCompleted || 0) + 1;
  }

  state.lastActiveDate = targetDate;
  saveData();

  showFeedAnimation('⏩', `模擬 ${targetDate} 完成！(${state.plan.completedDays.length}/7)`);
  setTimeout(() => {
    renderPetPage();
    if (state.plan.completedDays.length >= 7) {
      setTimeout(() => showFeedAnimation('🏆', '7天計畫達成！'), 800);
    }
  }, 300);
}

function debugResetPlan() {
  state.plan = { startDate: todayStr(), completedDays: [] };
  saveData();
  renderPetPage();
  alert('7 天計畫已重置！');
}

// ====== Render: Today's Habit Checklist ======
function renderTodayHabits() {
  const list = $('#today-habit-list');
  const hint = $('#no-habits-hint');
  const progress = $('#today-progress');
  list.innerHTML = '';

  if (state.habits.length === 0) {
    hint.classList.remove('hidden');
    progress.textContent = '';
    return;
  }
  hint.classList.add('hidden');

  const today = todayStr();
  const todayLog = state.dailyLog[today] || [];
  const done = todayLog.length;
  progress.textContent = `${done}/${state.habits.length}`;

  state.habits.forEach(h => {
    const isDone = todayLog.includes(h.id);
    const item = document.createElement('div');
    item.className = 'habit-check-item' + (isDone ? ' done' : '');
    item.innerHTML = `
      <div class="habit-checkbox">${isDone ? '✓' : ''}</div>
      <div class="habit-check-emoji">${renderIcon(h.emoji, '28px')}</div>
      <div class="habit-check-info">
        <div class="habit-check-name">${esc(h.name)}</div>
        <div class="habit-check-xp">✅</div>
      </div>
    `;
    if (!isDone) {
      item.addEventListener('click', () => completeHabit(h));
    }
    list.appendChild(item);
  });
}

// ====== Complete Habit (Feed Pet) ======
function completeHabit(habit) {
  const today = todayStr();
  if (!state.dailyLog[today]) state.dailyLog[today] = [];
  if (state.dailyLog[today].includes(habit.id)) return;

  state.dailyLog[today].push(habit.id);

  // Feed the pet
  const p = state.pet;
  const prevLv = petLevel(p.xp);
  const newLv = petLevel(p.xp);

  saveData();

  // Animations
  showFeedAnimation(habit.emoji, '✅');
  playSfx('ding');

  // Level up?
  if (newLv > prevLv) {
    setTimeout(() => { showLevelUpCelebration(newLv); playSfx('levelup'); }, 800);
  }

  // Check 7-day plan
  checkAndMarkPlanDay();

  setTimeout(() => {
    renderPetPage();
  }, 400);
}

// ====== Feed Animation (Star Explosion) ======
function showFeedAnimation(emoji, text) {
  const el = $('#feed-animation');
  const textEl = $('#feed-text');
  const particles = $('#feed-particles');

  textEl.innerHTML = typeof text === 'number' ? `${renderIcon(emoji, '28px')} +${text}` : `${renderIcon(emoji, '28px')} ${text}`;
  el.classList.remove('hidden');

  // Star explosion particles ⭐✨🌟💫
  particles.innerHTML = '';
  const stars = ['⭐','✨','🌟','💫','⭐','✨','🌟','💫','⭐','✨','🌟','💫'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'feed-particle';
    p.textContent = stars[i];
    const angle = (i / 12) * Math.PI * 2;
    const dist = 70 + Math.random() * 50;
    p.style.left = '50%';
    p.style.top = '50%';
    p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    p.style.animationDelay = (i * 0.04) + 's';
    p.style.fontSize = (18 + Math.random() * 16) + 'px';
    particles.appendChild(p);
  }

  // Pet bounce
  $('#pet-scene').classList.add('pet-feeding');
  setTimeout(() => $('#pet-scene').classList.remove('pet-feeding'), 700);

  setTimeout(() => el.classList.add('hidden'), 1200);
}

// ====== Level Up Celebration ======
function showLevelUpCelebration(newLv) {
  // Create full-screen celebration overlay
  let overlay = document.getElementById('levelup-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'levelup-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="levelup-content">
      <div class="levelup-stars"></div>
      <div class="levelup-badge">🎉</div>
      <div class="levelup-text">升級啦！</div>
      <div class="levelup-level">Lv.${newLv}</div>
      <div class="levelup-sub">繼續加油！</div>
    </div>
  `;
  overlay.classList.add('active');

  // Firework particles
  const starsEl = overlay.querySelector('.levelup-stars');
  const emojis = ['⭐','✨','🌟','🌈','🎉','🎊','💫','❤️','💖','✨'];
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('div');
    s.className = 'levelup-star';
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 0.8) + 's';
    s.style.animationDuration = (1.5 + Math.random()) + 's';
    s.style.fontSize = (16 + Math.random() * 20) + 'px';
    starsEl.appendChild(s);
  }

  setTimeout(() => {
    overlay.classList.remove('active');
    setTimeout(() => { overlay.innerHTML = ''; }, 500);
  }, 2800);
}

// ====== Pet Interaction (Click to react) ======
const PET_MESSAGES = [
  '你好棒！👍', '我愛你！❤️', '繼續加油！💪',
  '今天也要努力喔！', '摸摸頭~🥰', '嘿嘿！😄',
  '我好開心！😊', '你是最棒的！✨', '謝謝你陵我！',
  '再多做一個習慣吧！', '感覺好溫暖喔~', '🌸好美的一天！',
];
let lastPetTap = 0;

function initPetInteraction() {
  const petEl = $('#pet-container');
  if (!petEl) return;
  petEl.style.cursor = 'pointer';
  petEl.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastPetTap < 800) return; // debounce
    lastPetTap = now;

    // Jump animation
    petEl.classList.add('pet-jump');
    setTimeout(() => petEl.classList.remove('pet-jump'), 600);
    playSfx('pop');

    // Speech bubble
    let bubble = document.getElementById('pet-speech');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.id = 'pet-speech';
      $('#pet-scene').appendChild(bubble);
    }
    const msg = PET_MESSAGES[Math.floor(Math.random() * PET_MESSAGES.length)];
    bubble.textContent = msg;
    bubble.classList.remove('show');
    void bubble.offsetWidth; // reflow
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 2000);

    // Mini hearts float up
    for (let i = 0; i < 4; i++) {
      const heart = document.createElement('div');
      heart.className = 'pet-tap-heart';
      heart.textContent = ['❤️','🧡','💛','💜'][i];
      heart.style.left = (40 + Math.random() * 20) + '%';
      heart.style.animationDelay = (i * 0.15) + 's';
      $('#pet-scene').appendChild(heart);
      setTimeout(() => heart.remove(), 1500);
    }
  });
}

// ====== Render: Habits Management ======
function renderHabitsPage() {
  const list = $('#habit-manage-list');
  const hint = $('#habit-empty-hint');
  list.innerHTML = '';

  if (state.habits.length === 0) {
    hint.classList.remove('hidden');
    return;
  }
  hint.classList.add('hidden');

  state.habits.forEach(h => {
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.innerHTML = `
      <div class="habit-card-emoji">${renderIcon(h.emoji, '36px')}</div>
      <div class="habit-card-info">
        <div class="habit-card-name">${esc(h.name)}</div>
        <div class="habit-card-meta">${esc(h.name)}</div>
      </div>
      <div class="habit-card-actions">
        <button class="habit-card-btn edit" data-id="${h.id}">✏️</button>
        <button class="habit-card-btn delete" data-id="${h.id}">🗑️</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('.habit-card-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => showEditHabitModal(btn.dataset.id));
  });
  list.querySelectorAll('.habit-card-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirm('確定要刪除這個習慣嗎？', () => {
        state.habits = state.habits.filter(h => h.id !== btn.dataset.id);
        saveData();
        renderHabitsPage();
        renderTodayHabits();
      });
    });
  });
}

function showAddHabitModal() {
  showHabitModal(null);
}

function showEditHabitModal(habitId) {
  const h = state.habits.find(x => x.id === habitId);
  if (h) showHabitModal(h);
}

function showHabitModal(existingHabit) {
  const isEdit = !!existingHabit;
  let selectedEmoji = isEdit ? existingHabit.emoji : HABIT_EMOJIS[0];

  $('#modal-title').textContent = isEdit ? '編輯習慣' : '新增習慣';
  $('#modal-body').innerHTML = `
    <div class="form-group">
      <label>選擇圖示</label>
      <div class="emoji-picker">
        ${HABIT_EMOJIS.map(e =>
          `<button class="emoji-option${e === selectedEmoji ? ' selected' : ''}" data-emoji="${e}">${renderIcon(e, '24px')}</button>`
        ).join('')}
      </div>
    </div>
    <div class="form-group">
      <label>習慣名稱</label>
      <input id="habit-name" type="text" placeholder="例：早起運動 30 分鐘" maxlength="20" value="${isEdit ? esc(existingHabit.name) : ''}">
    </div>
    <button class="btn-primary" id="habit-save">${isEdit ? '儲存' : '新增'}</button>
  `;
  openModal();

  $('#modal-body').querySelectorAll('.emoji-option').forEach(btn => {
    btn.addEventListener('click', () => {
      $('#modal-body').querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = btn.dataset.emoji;
    });
  });

  $('#habit-save').addEventListener('click', () => {
    const name = $('#habit-name').value.trim();
    if (!name) return $('#habit-name').focus();

    if (isEdit) {
      existingHabit.emoji = selectedEmoji;
      existingHabit.name = name;
    } else {
      state.habits.push({
        id: uid(),
        emoji: selectedEmoji,
        name,
      });
    }
    saveData();
    closeModal();
    renderHabitsPage();
    renderTodayHabits();
  });
}

// ====== Render: Stats Page ======
function renderStatsPage() {
  if (!state.pet) return;
  const lv = petLevel(state.pet.xp);

  // Summary cards
  $('#stat-streak').textContent = state.streak;
  $('#stat-total-days').textContent = Object.keys(state.dailyLog).length;
  const totalFeeds = Object.values(state.dailyLog).reduce((sum, arr) => sum + arr.length, 0);
  $('#stat-total-feeds').textContent = totalFeeds;
  $('#stat-pet-level').textContent = lv;

  // Week calendar
  renderWeekCalendar();

  // Evolution timeline
  renderEvolutionTimeline(lv);
}

function renderWeekCalendar() {
  const cal = $('#week-calendar');
  cal.innerHTML = '';
  const dayNames = ['日','一','二','三','四','五','六'];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    const log = state.dailyLog[dStr] || [];
    const isToday = i === 0;
    const allDone = log.length >= state.habits.length && state.habits.length > 0;
    const hasSome = log.length > 0;

    const div = document.createElement('div');
    div.className = 'week-day';
    if (isToday) div.classList.add('today');
    if (allDone) div.classList.add('completed');
    else if (!isToday && !hasSome && state.habits.length > 0) div.classList.add('missed');

    div.innerHTML = `
      <div class="week-day-label">${dayNames[d.getDay()]}</div>
      <div class="week-day-num">${allDone ? '✅' : (hasSome ? '🔶' : d.getDate())}</div>
    `;
    cal.appendChild(div);
  }
}

function renderEvolutionTimeline(currentLevel) {
  const tl = $('#evolution-timeline');
  tl.innerHTML = '';
  if (!state.pet) return;
  const sp = SPECIES[state.pet.species];
  if (!sp) return;

  sp.stages.forEach((emoji, i) => {
    if (i > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'evo-arrow';
      arrow.textContent = '→';
      tl.appendChild(arrow);
    }
    const stage = document.createElement('div');
    const reached = currentLevel >= sp.stageLv[i];
    const isCurrent = reached && (i === sp.stages.length - 1 || currentLevel < sp.stageLv[i + 1]);
    stage.className = 'evo-stage' + (!reached ? ' locked' : '') + (isCurrent ? ' current' : '');

    let emojiHtml;
    if (sp.images && sp.images[emoji]) {
      emojiHtml = `<div class="evo-emoji evo-miffy">${renderMiffy(emoji)}</div>`;
    } else {
      emojiHtml = `<div class="evo-emoji">${emoji}</div>`;
    }
    const label = sp.stageLabels ? sp.stageLabels[i] : '';
    stage.innerHTML = `
      ${emojiHtml}
      <div class="evo-level">Lv.${sp.stageLv[i]}</div>
      ${label ? `<div class="evo-label">${label}</div>` : ''}
    `;
    tl.appendChild(stage);
  });
}

// ====== Render: Settings ======
function renderSettingsPage() {
  if (!state.pet) return;
  $('#edit-pet-name').value = state.pet.name;
  const sp = SPECIES[state.pet.species];
  $('#edit-pet-species').textContent = sp ? sp.name + ' ' + sp.icon : '';
  // Version info
  const verEl = $('#app-version');
  if (verEl) verEl.textContent = APP_VERSION;
  const swEl = $('#sw-version');
  if (swEl && navigator.serviceWorker && navigator.serviceWorker.controller) {
    // Fetch SW cache name
    caches.keys().then(keys => { swEl.textContent = keys.filter(k => k.startsWith('habit-pet')).join(', ') || 'N/A'; });
  } else if (swEl) {
    swEl.textContent = 'N/A';
  }
}

// ====== Modal / Confirm ======
function openModal() { $('#modal-overlay').classList.remove('hidden'); }
function closeModal() { $('#modal-overlay').classList.add('hidden'); }

let confirmCb = null;
function showConfirm(msg, cb) {
  $('#confirm-msg').textContent = msg;
  confirmCb = cb;
  $('#confirm-overlay').classList.remove('hidden');
}
function closeConfirm() {
  $('#confirm-overlay').classList.add('hidden');
  confirmCb = null;
}

// ====== Export / Import ======
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `習慣寵物_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData() {
  $('#file-import').click();
}

// ====== Navigation ======
function initNav() {
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const page = btn.dataset.page;
      $$('.page').forEach(p => p.classList.remove('active'));
      $(`#page-${page}`).classList.add('active');
      renderPage(page);
    });
  });
}

function renderPage(page) {
  if (page === 'pet') renderPetPage();
  else if (page === 'habits') renderHabitsPage();
  else if (page === 'stats') renderStatsPage();
  else if (page === 'settings') renderSettingsPage();
}

function renderAll() {
  renderPetPage();
  renderOnboarding();
  initPetInteraction();
  initSound();
}

// Start BGM on first user interaction
document.addEventListener('click', function _startBgm() {
  if (bgmEnabled) startBgm();
  document.removeEventListener('click', _startBgm);
}, { once: true });

// ====== QR Code Transfer ======
function compressData() {
  const json = JSON.stringify(state);
  // Use base64 encoding (works without extra libs)
  return btoa(unescape(encodeURIComponent(json)));
}

function decompressData(encoded) {
  return JSON.parse(decodeURIComponent(escape(atob(encoded))));
}

function chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

function showQRExport() {
  const overlay = $('#qr-overlay');
  const wrap = $('#qr-canvas-wrap');
  const hint = $('#qr-hint');
  const body = $('#qr-body');
  const video = $('#qr-video');
  video.classList.add('hidden');
  wrap.innerHTML = '';

  const encoded = compressData();
  // Build a URL with data in hash so scanning QR = open page + auto-import
  const baseUrl = location.href.split('#')[0].split('?')[0];
  const fullUrl = `${baseUrl}#import=${encoded}`;

  // QR code max is ~2953 bytes for alphanumeric. Split into chunks if large.
  const CHUNK_SIZE = 1500;
  // If URL fits in one QR, use URL mode; otherwise fall back to chunked raw data
  const useUrlMode = fullUrl.length <= 2000;
  const dataForChunks = useUrlMode ? fullUrl : encoded;
  const chunks = useUrlMode ? [fullUrl] : chunkString(encoded, CHUNK_SIZE);
  const totalPages = chunks.length;
  let currentPage = 0;

  function renderQRPage(page) {
    wrap.innerHTML = '';
    let payload;
    if (useUrlMode) {
      payload = fullUrl;
    } else {
      // Format: PAGE/TOTAL:data
      payload = `${page + 1}/${totalPages}:${chunks[page]}`;
    }

    new QRCode(wrap, {
      text: payload,
      width: 256,
      height: 256,
      colorDark: '#2D3436',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.L,
    });

    if (useUrlMode) {
      hint.innerHTML = '📱 掃描後會自動開啟頁面並載入資料<br><small>直接用手機相機掃描即可</small>';
    } else if (totalPages === 1) {
      hint.innerHTML = '用另一台設備掃描此 QR Code 即可匯入資料';
    } else {
      hint.innerHTML = `第 ${page + 1} / ${totalPages} 頁<br>資料較大，需逐頁掃描`;
    }

    // Navigation buttons
    let navHtml = '';
    if (totalPages > 1) {
      navHtml += '<div class="qr-nav-row">';
      navHtml += `<button class="qr-nav-btn" id="qr-prev" ${page === 0 ? 'disabled' : ''}>◀ 上一頁</button>`;
      navHtml += `<button class="qr-nav-btn" id="qr-next" ${page === totalPages - 1 ? 'disabled' : ''}>下一頁 ▶</button>`;
      navHtml += '</div>';
      navHtml += '<div class="qr-pages">';
      for (let i = 0; i < totalPages; i++) {
        navHtml += `<div class="qr-page-dot${i === page ? ' active' : ''}" data-page="${i}"></div>`;
      }
      navHtml += '</div>';
    }

    // Remove old nav
    const oldNav = body.querySelector('.qr-nav-row');
    const oldDots = body.querySelector('.qr-pages');
    if (oldNav) oldNav.remove();
    if (oldDots) oldDots.remove();

    hint.insertAdjacentHTML('afterend', navHtml);

    if (totalPages > 1) {
      const prev = $('#qr-prev');
      const next = $('#qr-next');
      if (prev) prev.onclick = () => { currentPage--; renderQRPage(currentPage); };
      if (next) next.onclick = () => { currentPage++; renderQRPage(currentPage); };
      body.querySelectorAll('.qr-page-dot').forEach(dot => {
        dot.onclick = () => { currentPage = parseInt(dot.dataset.page); renderQRPage(currentPage); };
      });
    }
  }

  renderQRPage(0);
  $('#qr-title').textContent = '📱 QR Code 匯出';
  overlay.classList.remove('hidden');
}

// QR scanning using camera
let scanStream = null;
let scanChunks = {};
let scanTotal = 0;

function showQRImport() {
  const overlay = $('#qr-overlay');
  const wrap = $('#qr-canvas-wrap');
  const hint = $('#qr-hint');
  const video = $('#qr-video');

  wrap.innerHTML = '';
  hint.innerHTML = '將相機對準 QR Code 掃描…<br><small>若無法開啟相機，請改用「匯入檔案」</small>';
  $('#qr-title').textContent = '📷 掃描 QR Code';

  // Remove old nav
  const oldNav = document.querySelector('#qr-body .qr-nav-row');
  const oldDots = document.querySelector('#qr-body .qr-pages');
  if (oldNav) oldNav.remove();
  if (oldDots) oldDots.remove();

  scanChunks = {};
  scanTotal = 0;

  // Provide file-based fallback too
  wrap.innerHTML = `
    <div style="text-align:center">
      <p style="font-size:14px;color:#666;margin-bottom:12px">方法一：用相機掃描</p>
      <button class="btn-primary btn-sm" id="btn-start-cam" style="width:auto;margin-bottom:16px">📷 開啟相機</button>
      <p style="font-size:14px;color:#666;margin:12px 0">方法二：上傳 QR Code 圖片</p>
      <input type="file" id="qr-file-input" accept="image/*" style="margin:0 auto;display:block;max-width:200px">
    </div>
  `;

  video.classList.add('hidden');
  overlay.classList.remove('hidden');

  $('#btn-start-cam').onclick = () => startCameraScan();

  $('#qr-file-input').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Use a canvas to read the image, then try to decode
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // Try to use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        detector.detect(canvas).then(codes => {
          if (codes.length > 0) {
            processScannedQR(codes[0].rawValue);
          } else {
            hint.innerHTML = '❌ 無法辨識 QR Code，請確認圖片清晰';
          }
        }).catch(() => {
          hint.innerHTML = '❌ 辨識失敗，請嘗試其他方法';
        });
      } else {
        hint.innerHTML = '此瀏覽器不支援圖片辨識，請改用相機掃描或檔案匯入';
      }
    };
    img.src = URL.createObjectURL(file);
  };
}

async function startCameraScan() {
  const video = $('#qr-video');
  const hint = $('#qr-hint');
  const wrap = $('#qr-canvas-wrap');

  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    video.srcObject = scanStream;
    video.classList.remove('hidden');
    wrap.innerHTML = '';
    await video.play();
    hint.innerHTML = '📷 掃描中…將 QR Code 放入畫面中';
    scanQRFromVideo();
  } catch (err) {
    hint.innerHTML = `❌ 無法開啟相機：${err.message}<br>請改用「匯入檔案」功能`;
  }
}

function scanQRFromVideo() {
  const video = $('#qr-video');
  if (!scanStream || video.classList.contains('hidden')) return;

  if ('BarcodeDetector' in window) {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    function tick() {
      if (!scanStream || video.classList.contains('hidden')) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      detector.detect(canvas).then(codes => {
        if (codes.length > 0) {
          processScannedQR(codes[0].rawValue);
        } else {
          requestAnimationFrame(tick);
        }
      }).catch(() => requestAnimationFrame(tick));
    }
    requestAnimationFrame(tick);
  } else {
    $('#qr-hint').innerHTML = '此瀏覽器不支援 BarcodeDetector API<br>請改用 Chrome 或上傳 QR Code 圖片';
    stopCamera();
  }
}

function processScannedQR(rawValue) {
  const hint = $('#qr-hint');

  // Parse format: PAGE/TOTAL:data
  const match = rawValue.match(/^(\d+)\/(\d+):(.+)$/s);
  if (!match) {
    // Try as plain base64 (single page)
    try {
      const data = decompressData(rawValue);
      applyImportedData(data);
      return;
    } catch {
      hint.innerHTML = '❌ 無法辨識此 QR Code 格式';
      setTimeout(() => scanQRFromVideo(), 1500);
      return;
    }
  }

  const page = parseInt(match[1]);
  const total = parseInt(match[2]);
  const chunk = match[3];

  scanTotal = total;
  scanChunks[page] = chunk;
  const received = Object.keys(scanChunks).length;

  if (received < total) {
    hint.innerHTML = `✅ 已掃描 ${received}/${total} 頁<br>請掃描下一頁的 QR Code`;
    // Continue scanning
    setTimeout(() => scanQRFromVideo(), 500);
  } else {
    // All chunks received, reassemble
    let fullData = '';
    for (let i = 1; i <= total; i++) {
      fullData += scanChunks[i];
    }
    try {
      const data = decompressData(fullData);
      applyImportedData(data);
    } catch {
      hint.innerHTML = '❌ 資料解碼失敗，請重新掃描';
      scanChunks = {};
    }
  }
}

function applyImportedData(data) {
  state = { ...DEFAULTS, ...data };
  saveData();
  stopCamera();
  closeQR();
  renderAll();
  alert('✅ QR Code 匯入成功！');
}

function stopCamera() {
  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
  const video = $('#qr-video');
  video.classList.add('hidden');
  video.srcObject = null;
}

function closeQR() {
  stopCamera();
  $('#qr-overlay').classList.add('hidden');
}

// ====== Auto-import from URL hash ======
function checkUrlImport() {
  const hash = location.hash;
  if (!hash.startsWith('#import=')) return;

  const encoded = hash.slice('#import='.length);
  if (!encoded) return;

  // Clear the hash so refreshing won't re-import
  history.replaceState(null, '', location.pathname + location.search);

  try {
    const data = decompressData(encoded);
    // Show confirmation before overwriting
    const petName = data.pet ? data.pet.name : '未知';
    const petSpecies = data.pet ? (SPECIES[data.pet.species]?.name || data.pet.species) : '未知';
    const habitCount = (data.habits || []).length;
    const msg = `發現 QR Code 資料！\n\n🐾 寵物：${petName}（${petSpecies}）\n📋 習慣：${habitCount} 個\n\n要載入這份資料嗎？（會覆蓋目前資料）`;
    if (confirm(msg)) {
      state = { ...DEFAULTS, ...data };
      saveData();
      // Re-render after import
      renderOnboarding();
      if (state.pet) renderAll();
      showToast('✅ QR Code 資料載入成功！');
    }
  } catch (e) {
    alert('❌ QR Code 資料格式錯誤，無法載入');
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#2D3436;color:#fff;padding:12px 24px;border-radius:12px;z-index:9999;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:opacity 0.3s';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
}

// ====== Init ======
function init() {
  // Check for QR import data in URL before anything else
  checkUrlImport();

  processDayChange();
  initNav();
  renderOnboarding();

  if (state.pet) {
    renderPetPage();
  }

  // Event bindings
  $('#btn-add-habit').addEventListener('click', showAddHabitModal);
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', e => { if (e.target === $('#modal-overlay')) closeModal(); });

  $('#confirm-yes').addEventListener('click', () => { if (confirmCb) confirmCb(); closeConfirm(); });
  $('#confirm-no').addEventListener('click', closeConfirm);
  $('#confirm-overlay').addEventListener('click', e => { if (e.target === $('#confirm-overlay')) closeConfirm(); });

  // Settings events
  $('#btn-rename-pet').addEventListener('click', () => {
    const name = $('#edit-pet-name').value.trim();
    if (name && state.pet) {
      state.pet.name = name;
      saveData();
      renderPetPage();
    }
  });

  $('#btn-export').addEventListener('click', exportData);
  $('#btn-import').addEventListener('click', importData);
  $('#btn-qr-export').addEventListener('click', showQRExport);
  $('#btn-qr-import').addEventListener('click', showQRImport);
  $('#qr-close').addEventListener('click', closeQR);
  $('#qr-overlay').addEventListener('click', e => { if (e.target === $('#qr-overlay')) closeQR(); });
  $('#file-import').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state = { ...DEFAULTS, ...data };
        saveData();
        renderAll();
        alert('匯入成功！');
      } catch { alert('匯入失敗，檔案格式不正確'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#btn-reset').addEventListener('click', () => {
    showConfirm('確定要重新開始嗎？所有資料將被清除！', () => {
      localStorage.removeItem(STORE_KEY);
      state = { ...DEFAULTS };
      renderOnboarding();
    });
  });

  // Debug buttons
  $('#btn-debug-day').addEventListener('click', debugSimulateDay);
  $('#btn-debug-reset-plan').addEventListener('click', debugResetPlan);

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
