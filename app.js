/* =========================================================
   Foco · registro de horas, monedas y objetivos
   Todo se guarda en local (localStorage) en este dispositivo.
   ========================================================= */
'use strict';

const KEY = 'foco.v1';
const COLORS = ['#FF6B5E', '#FF9447', '#FFD25A', '#D4EE6A', '#8BD46E', '#2EC4A6', '#7CC4F8', '#6E8EF7', '#8E6CF0', '#B9A4F7', '#F58FC6', '#7D8BB2'];
const SHAPES = ['circle', 'square', 'triangle', 'x', 'hexagon', 'pentagon', 'blob', 'cloud'];
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAYS_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTHS_S = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const COIN_NAME = { oro: 'oro', plata: 'plata' };

const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
const r2 = n => Math.round(n * 100) / 100;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, el = document) => el.querySelector(s);

/* ---------------- Estado ---------------- */
function defaultState() {
  const S = (name, color, shape, coinType, rate, cats = []) => ({ id: uid(), name, color, shape, coinType, rate, categories: cats.map(n => ({ id: uid(), name: n })) });
  const subjects = [
    S('Mecánica de Fluidos', '#7CC4F8', 'blob', 'oro', 2),
    S('Motores de Combustión Interna', '#FF9447', 'hexagon', 'oro', 2),
    S('Estructuras', '#6E8EF7', 'square', 'oro', 2),
    S('Construcciones Industriales', '#FFD25A', 'pentagon', 'oro', 2),
    S('Advanced Tech', '#8E6CF0', 'x', 'oro', 2),
    S('Entrepreneurship', '#F58FC6', 'circle', 'oro', 2),
    S('Lab de Materiales', '#7D8BB2', 'square', 'oro', 2),
    S('Cálculo', '#D4EE6A', 'triangle', 'oro', 2),
    S('TOEFL', '#FF6B5E', 'cloud', 'oro', 2),
    S('TFG', '#B9A4F7', 'circle', 'oro', 2),
    S('WOLLY-Z', '#2EC4A6', 'triangle', 'oro', 2, ['Desarrollo', 'Marketing']),
    S('Nartex', '#8BD46E', 'hexagon', 'plata', 2),
    S('Iglesia', '#FFD25A', 'cloud', 'plata', 2),
  ];
  const wolly = subjects.find(s => s.name === 'WOLLY-Z');
  const today = dayKey(new Date());
  return {
    version: 1,
    setupDone: false,
    userName: 'Alicia',
    subjects,
    sessions: [],
    rewards: [
      { id: uid(), name: 'Ir al cine', emoji: '🎬', price: 20, coinType: 'oro' },
      { id: uid(), name: 'Tocar el piano 1 h', emoji: '🎹', price: 10, coinType: 'oro' },
      { id: uid(), name: 'Pintar 1 h', emoji: '🎨', price: 10, coinType: 'oro' },
    ],
    purchases: [],
    exchanges: [],
    goals: [
      { id: uid(), subjectId: wolly.id, categoryId: wolly.categories[0].id, kind: 'weekly', minutes: 60, days: [0, 1, 2, 3, 4, 5, 6], deadline: '', startDate: today, bonus: 0, bonusType: 'oro', createdAt: Date.now() },
      { id: uid(), subjectId: wolly.id, categoryId: wolly.categories[1].id, kind: 'weekly', minutes: 180, days: [0, 1, 2, 3, 4, 5, 6], deadline: '', startDate: today, bonus: 0, bonusType: 'oro', createdAt: Date.now() },
    ],
    awards: [],
    penalties: [],
    active: null,
    lastSubjectId: null,
    settings: { strict: true, grace: 20, penalty: 1, penaltyType: 'plata' },
  };
}

let state = load();
const ui = { setupStep: 0, expanded: null, focusSubject: null, focusCategory: null, statsRange: 'week', draft: null, modalRender: null };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const d = defaultState();
      return { ...d, ...s, penalties: s.penalties || [], settings: { ...d.settings, ...(s.settings || {}) } };
    }
  } catch (e) { console.warn(e); }
  return defaultState();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast('⚠️ No se ha podido guardar. Exporta una copia en Ajustes.'); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------------- Fechas ---------------- */
function dayKey(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }
function parseDay(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function wd(d) { return (new Date(d).getDay() + 6) % 7; } // 0 = lunes
function startOfWeek(d) { const x = startOfDay(d); return addDays(x, -wd(x)); }
function startOfMonth(d) { const x = startOfDay(d); x.setDate(1); return x; }
function longDate(d) { const x = new Date(d); return `${DAYS_LONG[wd(x)][0].toUpperCase() + DAYS_LONG[wd(x)].slice(1)}, ${x.getDate()} de ${MONTHS[x.getMonth()]}`; }
function shortDate(d) { const x = new Date(d); return `${x.getDate()} ${MONTHS_S[x.getMonth()]}`; }

/* ---------------- Formato ---------------- */
function fmtDur(min) {
  min = Math.round(min);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
function fmtH(min) { // compacto: 2,5 h
  const h = min / 60;
  if (h === 0) return '0 h';
  if (h < 1) return `${Math.round(min)} min`;
  return `${(Math.round(h * 10) / 10).toString().replace('.', ',')} h`;
}
function fmtN(n) { n = r2(n); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace('.', ','); }
function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
function tint(hex, amt = .55) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const m = c => Math.round(c + (255 - c) * amt);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/* ---------------- Datos derivados ---------------- */
const subj = id => state.subjects.find(s => s.id === id);
const catName = (s, cid) => s?.categories.find(c => c.id === cid)?.name || '';
const subjName = id => subj(id)?.name || 'Borrada';

function sessionsIn(from, to) { return state.sessions.filter(s => s.start >= +from && s.start < +to); }
function minutesFor(subjectId, categoryId, from, to) {
  return sessionsIn(from, to).filter(s => s.subjectId === subjectId && (!categoryId || s.categoryId === categoryId)).reduce((a, s) => a + s.minutes, 0);
}
function totalMinutes(from, to) { return sessionsIn(from, to).reduce((a, s) => a + s.minutes, 0); }

function wallet() {
  let oro = 0, plata = 0;
  for (const s of state.sessions) s.coinType === 'oro' ? oro += s.coins : plata += s.coins;
  for (const a of state.awards) a.coinType === 'oro' ? oro += a.amount : plata += a.amount;
  for (const p of state.purchases) { oro -= p.paid.oro; plata -= p.paid.plata; }
  for (const p of state.penalties || []) p.coinType === 'oro' ? oro -= p.amount : plata -= p.amount;
  for (const e of state.exchanges) { oro += e.oro; plata -= e.oro * 2; }
  return { oro: r2(oro), plata: r2(plata) };
}
function coinsEarned(from, to) {
  const out = { oro: 0, plata: 0 };
  for (const s of sessionsIn(from, to)) out[s.coinType] += s.coins;
  for (const a of state.awards) if (a.date >= +from && a.date < +to) out[a.coinType] += a.amount;
  return { oro: r2(out.oro), plata: r2(out.plata) };
}
function streak() {
  const days = new Set(state.sessions.map(s => dayKey(s.start)));
  let d = startOfDay(new Date());
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------------- Objetivos ---------------- */
function goalPeriod(g, date = new Date()) {
  if (g.kind === 'daily') { const f = startOfDay(date); return { from: f, to: addDays(f, 1), key: dayKey(f) }; }
  if (g.kind === 'weekly') { const f = startOfWeek(date); return { from: f, to: addDays(f, 7), key: 'w' + dayKey(f) }; }
  const f = parseDay(g.startDate || dayKey(g.createdAt));
  return { from: f, to: addDays(parseDay(g.deadline), 1), key: 'deadline' };
}
function goalProgress(g, date = new Date()) {
  const p = goalPeriod(g, date);
  const done = minutesFor(g.subjectId, g.categoryId, p.from, p.to);
  return { done, target: g.minutes, pct: Math.min(1, g.minutes ? done / g.minutes : 0), period: p, complete: done >= g.minutes };
}
function goalApplies(g, date = new Date()) {
  if (g.kind === 'daily') return (g.days || []).includes(wd(date));
  if (g.kind === 'weekly') return true;
  return dayKey(date) <= g.deadline && dayKey(date) >= (g.startDate || '');
}
function goalTitle(g) {
  const s = subj(g.subjectId);
  const c = catName(s, g.categoryId);
  return `${fmtDur(g.minutes)} de ${s ? s.name : '—'}${c ? ' · ' + c : ''}`;
}
function goalTag(g) {
  if (g.kind === 'daily') return (g.days || []).length === 7 ? 'Cada día' : 'Diario · ' + (g.days || []).map(i => DAYS[i]).join(' ');
  if (g.kind === 'weekly') return 'Semanal';
  return 'Antes del ' + shortDate(parseDay(g.deadline));
}

/* ---------------- Rachas, pases y penalizaciones ---------------- */
function monthKey(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; }
function monthsBetween(a, b) { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 * 12 + m2) - (y1 * 12 + m1); }
function periodStart(g, d) { return g.kind === 'weekly' ? startOfWeek(d) : startOfDay(d); }
// Prepara un objetivo para llevar su racha (al crearlo, al cambiarle el tipo o en datos antiguos)
function initTracking(g, keepPasses = false) {
  const now = new Date();
  g.streak = 0; g.best = g.best || 0;
  if (!keepPasses) g.passes = g.kind === 'deadline' ? 0 : 1;
  g.passMonth = monthKey(now);
  g.evalFrom = g.kind === 'deadline' ? '' : dayKey(periodStart(g, now));
  g.graceKey = g.kind === 'weekly' ? 'w' + g.evalFrom : g.evalFrom; // el primer periodo no penaliza
  g.settled = false;
}
function currentStreak(g) {
  if (g.kind === 'deadline') return 0;
  const now = new Date();
  const live = (g.kind === 'weekly' || goalApplies(g, now)) && goalProgress(g, now).complete ? 1 : 0;
  return (g.streak || 0) + live;
}
function penalize(g, key, why, events) {
  const amount = Number(state.settings.penalty) || 0; if (!amount) return;
  const p = { id: uid(), goalId: g.id, key, amount, coinType: state.settings.penaltyType || 'plata', date: Date.now(), name: `${why}: ${goalTitle(g)}` };
  const ev = { t: 'penalty', g, p }; state.penalties.push(p); events.push(ev); return ev;
}
function evalPeriod(g, date, key, events) {
  const pr = goalProgress(g, date);
  if (pr.complete) { g.streak = (g.streak || 0) + 1; g.best = Math.max(g.best || 0, g.streak); return; }
  if (key === g.graceKey) return; // periodo en el que se creó: ni suma ni penaliza
  if ((g.passes || 0) > 0) { g.passes--; events.push({ t: 'pass', g, date, left: g.passes }); return; }
  const lost = g.streak || 0; g.streak = 0;
  const ev = penalize(g, key, 'Racha perdida', events); if (ev) ev.lost = lost;
}
function settle() {
  if (!state.setupDone) return [];
  const now = new Date(), mk = monthKey(now), events = [];
  let newPasses = 0;
  for (const g of state.goals) {
    if (g.evalFrom === undefined) initTracking(g);
    if (g.kind !== 'deadline' && g.passMonth !== mk) {
      const n = Math.max(0, monthsBetween(g.passMonth, mk));
      g.passes = (g.passes || 0) + n; g.passMonth = mk; newPasses += n;
    }
    if (g.kind === 'daily') {
      const today = startOfDay(now);
      for (let d = parseDay(g.evalFrom); d < today; d = addDays(d, 1)) if (goalApplies(g, d)) evalPeriod(g, d, dayKey(d), events);
      g.evalFrom = dayKey(today);
    } else if (g.kind === 'weekly') {
      const ws = startOfWeek(now);
      for (let d = parseDay(g.evalFrom); d < ws; d = addDays(d, 7)) evalPeriod(g, d, 'w' + dayKey(d), events);
      g.evalFrom = dayKey(ws);
    } else if (!g.settled && g.deadline && dayKey(now) > g.deadline) {
      g.settled = true;
      if (!goalProgress(g, now).complete) penalize(g, 'deadline', 'Objetivo no cumplido', events);
    }
  }
  if (newPasses) events.unshift({ t: 'newmonth', n: newPasses });
  return events;
}
function runSettle() {
  const ev = settle();
  save();
  if (!ev.length) return;
  const line = e => {
    if (e.t === 'newmonth') return `🎟️ <b>¡Nuevo mes!</b> Cada objetivo diario y semanal tiene un pase más.`;
    if (e.t === 'pass') return `🎟️ Se usó un pase en <b>${esc(goalTitle(e.g))}</b>${e.g.kind === 'daily' ? ' (' + DAYS_LONG[wd(e.date)] + ' ' + e.date.getDate() + ')' : ''}. Racha a salvo · te quedan ${e.left}.`;
    return `💔 <b>${esc(goalTitle(e.g))}</b>: ${e.lost ? `perdiste una racha de ${e.lost}` : e.g.kind === 'deadline' ? 'no llegaste a la fecha' : 'no se cumplió'} · −${fmtN(e.p.amount)} ${coin(e.p.coinType, 16)}`;
  };
  const bad = ev.some(e => e.t === 'penalty');
  const show = () => openModal(() => `<div class="sheet"><h2>${bad ? 'Ay… cuentas pendientes' : 'Novedades de tus rachas'}</h2>
    <div class="stack" style="gap:10px">${ev.map(e => `<div class="info-box" style="${e.t === 'penalty' ? 'background:#FFE3DF' : ''}"><div>${line(e)}</div></div>`).join('')}</div>
    <div class="acts"><button class="btn dark" data-act="closeModal">${bad ? 'Vale, hoy lo hago mejor' : '¡Genial!'}</button></div></div>`);
  if ($('#modal').hidden) show(); else setTimeout(() => $('#modal').hidden && show(), 1500);
}

function checkAwards() {
  const now = new Date();
  let got = [];
  for (const g of state.goals) {
    if (!g.bonus || g.bonus <= 0) continue;
    if (g.kind === 'daily' && !goalApplies(g, now)) continue;
    const pr = goalProgress(g, now);
    if (!pr.complete) continue;
    if (state.awards.some(a => a.goalId === g.id && a.key === pr.period.key)) continue;
    state.awards.push({ id: uid(), goalId: g.id, key: pr.period.key, amount: g.bonus, coinType: g.bonusType || 'oro', date: Date.now() });
    got.push(g);
  }
  if (got.length) {
    save();
    setTimeout(() => { confetti(); toast(`🎉 ¡Objetivo cumplido! +${fmtN(got.reduce((a, g) => a + g.bonus, 0))} de bonus`); }, 600);
  }
}

/* ---------------- Personajes (SVG) ---------------- */
function shapeSvg(shape, c) {
  switch (shape) {
    case 'square': return `<rect x="16" y="16" width="88" height="90" rx="20" fill="${c}"/>`;
    case 'triangle': return `<path d="M60 18 L104 100 L16 100 Z" fill="${c}" stroke="${c}" stroke-width="16" stroke-linejoin="round"/>`;
    case 'x': return `<g fill="${c}" transform="rotate(45 60 62)"><rect x="42" y="8" width="36" height="108" rx="18"/><rect x="6" y="44" width="108" height="36" rx="18"/></g>`;
    case 'hexagon': return `<path d="M60 16 L100 39 L100 85 L60 108 L20 85 L20 39 Z" fill="${c}" stroke="${c}" stroke-width="12" stroke-linejoin="round"/>`;
    case 'pentagon': return `<path d="M60 16 L104 48 L88 102 L32 102 L16 48 Z" fill="${c}" stroke="${c}" stroke-width="12" stroke-linejoin="round"/>`;
    case 'blob': return `<path d="M64 10 C98 12 114 40 107 70 C100 100 72 114 46 106 C18 98 4 70 13 43 C21 21 40 8 64 10 Z" fill="${c}"/>`;
    case 'cloud': return `<g fill="${c}"><circle cx="36" cy="68" r="26"/><circle cx="62" cy="46" r="32"/><circle cx="88" cy="68" r="24"/><rect x="26" y="58" width="72" height="44" rx="22"/></g>`;
    default: return `<circle cx="60" cy="62" r="46" fill="${c}"/>`;
  }
}
const FACE_Y = { triangle: 74, cloud: 68, pentagon: 64, x: 62 };
function faceSvg(mood, cy = 62) {
  const ey = cy - 6, my = cy + 9;
  const st = 'stroke="#17171A" stroke-width="3.8" stroke-linecap="round" fill="none"';
  switch (mood) {
    case 'focus':
      return `<path d="M40 ${ey} q6 6 12 0" ${st}/><path d="M68 ${ey} q6 6 12 0" ${st}/><path d="M54 ${my} q6 5 12 0" ${st}/>`;
    case 'happy':
      return `<path d="M40 ${ey + 3} q6 -8 12 0" ${st}/><path d="M68 ${ey + 3} q6 -8 12 0" ${st}/>
        <path d="M47 ${my - 3} h26 q0 15 -13 15 q-13 0 -13 -15 z" fill="#17171A"/><ellipse cx="60" cy="${my + 8}" rx="6" ry="3.5" fill="#FF8FA3"/>`;
    case 'sleep':
      return `<path d="M40 ${ey} h12" ${st}/><path d="M68 ${ey} h12" ${st}/><circle cx="60" cy="${my + 2}" r="4" ${st}/>
        <text class="zzz" x="86" y="${ey - 14}">z</text>`;
    case 'sad':
      return `<circle cx="46" cy="${ey}" r="4.6" fill="#17171A"/><circle cx="74" cy="${ey}" r="4.6" fill="#17171A"/>
        <path d="M51 ${my + 5} q9 -8 18 0" ${st}/><path d="M80 ${ey + 7} q-3 6 0 8 q3 -2 0 -8z" fill="#6EB8FF"/>`;
    case 'googly':
      return `<circle cx="45" cy="${ey}" r="10.5" fill="#fff"/><circle cx="75" cy="${ey}" r="10.5" fill="#fff"/>
        <g class="pupil"><circle cx="47" cy="${ey + 1}" r="5.6" fill="#17171A"/><circle cx="77" cy="${ey + 1}" r="5.6" fill="#17171A"/></g>
        <path d="M52 ${my + 3} q8 7 16 0" ${st}/>`;
    default:
      return `<g class="blink"><circle cx="46" cy="${ey}" r="4.8" fill="#17171A"/><circle cx="74" cy="${ey}" r="4.8" fill="#17171A"/></g>
        <path d="M51 ${my} q9 8 18 0" ${st}/>`;
  }
}
function buddy(shape, color, mood = 'idle', cls = '') {
  return `<svg class="buddy ${cls}" viewBox="0 0 120 120" aria-hidden="true"><g class="body">${shapeSvg(shape, color)}${faceSvg(mood, FACE_Y[shape] || 62)}</g></svg>`;
}
// Personaje completo con brazos y piernas. pose: study | wave | cheer | sleep | sad
function buddyFull(shape, color, pose = 'wave') {
  const mood = { study: 'focus', wave: 'googly', cheer: 'happy', sleep: 'sleep', sad: 'sad' }[pose];
  const L = 'stroke="#17171A" stroke-width="6" stroke-linecap="round" fill="none"';
  let arms = '';
  if (pose === 'study') arms = `<path d="M46 80 Q36 116 78 114" ${L}/><path d="M154 80 Q164 116 122 114" ${L}/>`;
  else if (pose === 'wave') arms = `<path d="M48 76 Q26 92 22 118" ${L}/><g class="arm-wave"><path d="M152 74 Q178 62 184 34" ${L}/><circle cx="184" cy="30" r="7" fill="#17171A"/></g>`;
  else if (pose === 'cheer') arms = `<g class="arm-l"><path d="M48 74 Q24 56 18 28" ${L}/><circle cx="18" cy="24" r="7" fill="#17171A"/></g><g class="arm-r"><path d="M152 74 Q176 56 182 28" ${L}/><circle cx="182" cy="24" r="7" fill="#17171A"/></g>`;
  else arms = `<path d="M48 78 Q30 98 34 122" ${L}/><path d="M152 78 Q170 98 166 122" ${L}/>`;
  const book = pose === 'study' ? `<g><path d="M100 100 L74 95 L74 124 L100 129 Z" fill="#fff" stroke="#17171A" stroke-width="4" stroke-linejoin="round"/>
    <path class="page" d="M100 100 L126 95 L126 124 L100 129 Z" fill="#fff" stroke="#17171A" stroke-width="4" stroke-linejoin="round"/>
    <path d="M80 104 l14 3 M80 111 l14 3 M106 107 l14 -3 M106 114 l14 -3" stroke="#17171A" stroke-width="2" stroke-linecap="round"/></g>` : '';
  const legs = `<path d="M84 108 L82 182 L66 182" ${L} stroke-linejoin="round"/><path d="M116 108 L118 182 L134 182" ${L} stroke-linejoin="round"/>`;
  return `<svg class="buddy buddy-full ${pose}" viewBox="0 0 200 190" aria-hidden="true"><g class="whole">
    ${legs}${arms}<g transform="translate(40 2)">${shapeSvg(shape, color)}${faceSvg(mood, FACE_Y[shape] || 62)}</g>${book}</g></svg>`;
}
function coin(type, size = 20) {
  const g = type === 'oro';
  const f = g ? '#FFCB3D' : '#DCE1EA', r = g ? '#D99A00' : '#9AA4B8';
  return `<svg class="coin" viewBox="0 0 24 24" width="${size}" height="${size}" aria-label="${type}"><circle cx="12" cy="12" r="10.4" fill="${f}" stroke="#17171A" stroke-width="1.7"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="${r}" stroke-width="1.6"/><path d="M12 8.6v6.8" stroke="${r}" stroke-width="1.9" stroke-linecap="round"/></svg>`;
}
const star = c => `<svg viewBox="0 0 24 24"><path d="M12 2 L14.2 9.3 L22 12 L14.2 14.7 L12 22 L9.8 14.7 L2 12 L9.8 9.3 Z" fill="${c}" stroke="#17171A" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  goals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M5 20V11M12 20V4M19 20v-6"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
};

/* ---------------- Router ---------------- */
function route() { return (location.hash.replace('#/', '') || 'home').split('/')[0]; }
function go(to) { if (location.hash !== '#/' + to) location.hash = '#/' + to; else render(); }
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

function render() {
  const app = $('#app');
  if (!state.setupDone) { app.innerHTML = renderSetup(); return; }
  const r = route();
  const views = { home: renderHome, focus: renderFocus, goals: renderGoals, stats: renderStats, shop: renderShop, settings: renderSettings, subjects: renderSubjectsPage, rewards: renderRewardsPage };
  app.innerHTML = (views[r] || renderHome)() + renderNav(r);
  tick();
}

function renderNav(r) {
  const b = (id, icon, label) => `<button class="${r === id ? 'on' : ''}" data-act="go" data-to="${id}" aria-label="${label}">${icon}</button>`;
  const running = state.active && state.active.runningSince;
  return `<nav class="nav">
    ${b('home', ICON.home, 'Inicio')}${b('goals', ICON.goals, 'Objetivos')}
    <button class="focus-btn ${r === 'focus' ? 'on' : ''} ${running ? 'running' : ''}" data-act="go" data-to="focus" aria-label="Foco">${ICON.play}</button>
    ${b('stats', ICON.stats, 'Estadísticas')}${b('shop', ICON.shop, 'Tienda')}
  </nav>`;
}
function walletPill() {
  const w = wallet();
  return `<button class="wallet-pill" data-act="go" data-to="shop"><span>${coin('oro', 24)}${fmtN(w.oro)}</span><span>${coin('plata', 24)}${fmtN(w.plata)}</span></button>`;
}
function topBar(title, sub = '') {
  return `<header class="top"><div><div class="page-title">${title}</div>${sub ? `<div class="date">${sub}</div>` : ''}</div>
    <div class="top-r">${walletPill()}<button class="icon-btn" data-act="go" data-to="settings" aria-label="Ajustes">${ICON.gear}</button></div></header>`;
}

/* ---------------- Inicio ---------------- */
function renderHome() {
  const now = new Date();
  const t0 = startOfDay(now), t1 = addDays(t0, 1);
  const todayMin = totalMinutes(t0, t1);
  const todayCoins = coinsEarned(t0, t1);
  const ws = startOfWeek(now);
  const week = [...Array(7)].map((_, i) => {
    const d = addDays(ws, i), m = totalMinutes(d, addDays(d, 1));
    const isToday = dayKey(d) === dayKey(now), fut = d > now && !isToday;
    return `<div class="day-pill ${isToday ? 'today' : ''} ${m > 0 && !isToday ? 'has' : ''} ${fut ? 'future' : ''}">
      <div class="dn">${DAYS[i]}</div><div class="dd">${d.getDate()}</div><div class="dm">${m ? fmtH(m) : ''}</div></div>`;
  }).join('');

  const todays = state.goals.filter(g => goalApplies(g, now));
  const goalsHtml = todays.length ? todays.map(g => goalCard(g, false)).join('')
    : `<div class="card empty">${buddy('cloud', '#B9A4F7', 'googly')}No tienes objetivos para hoy.<br><button class="link" data-act="go" data-to="goals">Crear uno</button></div>`;

  const weekRows = subjectTotals(ws, addDays(ws, 7));
  const weekHtml = weekRows.length ? donut(weekRows)
    : `<div class="empty">Esta semana aún no hay horas registradas.<br>¡La primera sesión es la más difícil!</div>`;

  const a = state.active;
  const activeHtml = a ? `<div class="active-banner"><span class="dot"></span><div class="grow">Foco en marcha · ${esc(subjName(a.subjectId))}<br><b id="homeTimer">${fmtClock(elapsed())}</b></div><button class="btn sm lime" data-act="go" data-to="focus">Ver</button></div>` : '';

  const s3 = state.subjects.slice(0, 3);
  const st = streak();
  return `
  <header class="top"><div><div class="hello">Hola, ${esc(state.userName || '')} 👋</div><div class="date">${longDate(now)}</div></div>
    <div class="top-r">${walletPill()}<button class="icon-btn" data-act="go" data-to="settings" aria-label="Ajustes">${ICON.gear}</button></div></header>
  <section class="week-strip">${week}</section>
  <div class="home-grid">
    <div class="stack">
      ${activeHtml}
      <div class="hero">
        <div class="hl">
          <div><div class="label">Hoy llevas</div><div class="big">${fmtDur(todayMin)}</div>
          <div class="sub">${todayCoins.oro ? `<span>+${fmtN(todayCoins.oro)}</span>${coin('oro', 20)}` : ''}${todayCoins.plata ? `<span>+${fmtN(todayCoins.plata)}</span>${coin('plata', 20)}` : ''}${!todayCoins.oro && !todayCoins.plata ? 'Aún no has ganado monedas hoy' : ''}</div>
          ${st ? `<div class="sub" style="margin-top:6px">🔥 Racha de ${st} día${st > 1 ? 's' : ''}</div>` : ''}</div>
          <div style="margin-top:18px"><button class="btn dark big" data-act="go" data-to="focus">${ICON.play} ${a ? 'Volver al foco' : 'Empezar foco'}</button></div>
        </div>
        <div class="hr">
          ${s3[0] ? buddy(s3[0].shape, s3[0].color, 'googly', 'b1 float') : ''}
          ${s3[1] ? buddy(s3[1].shape, s3[1].color, 'idle', 'b2') : ''}
          ${s3[2] ? buddy(s3[2].shape, s3[2].color, 'focus', 'b3 float') : ''}
        </div>
      </div>
      <section><div class="section-h"><h2>Esta semana</h2><button class="link" data-act="go" data-to="stats">Ver todo</button></div>
        <div class="card">${weekHtml}</div></section>
    </div>
    <section><div class="section-h"><h2>Objetivos de hoy</h2><button class="link" data-act="go" data-to="goals">Gestionar</button></div>
      <div class="goal-list">${goalsHtml}</div></section>
  </div>`;
}

function goalCard(g, withActions, faded = false) {
  const s = subj(g.subjectId) || { color: '#ddd', shape: 'circle' };
  const pr = goalProgress(g);
  let sub = `${fmtDur(pr.done)} de ${fmtDur(pr.target)}`;
  if (g.kind === 'deadline') {
    const daysLeft = Math.max(0, Math.round((parseDay(g.deadline) - startOfDay(new Date())) / 864e5) + 1);
    const left = Math.max(0, pr.target - pr.done);
    sub += left > 0 ? ` · faltan ${daysLeft} día${daysLeft !== 1 ? 's' : ''} → ${fmtDur(Math.ceil(left / Math.max(1, daysLeft)))}/día` : ' · ¡conseguido!';
  } else if (g.kind === 'weekly') {
    sub += pr.complete ? ' · ¡conseguido!' : ` · faltan ${fmtDur(pr.target - pr.done)}`;
  }
  let dots = '';
  if (g.kind === 'daily' && withActions) {
    const ws = startOfWeek(new Date());
    dots = `<div class="dots7">${[...Array(7)].map((_, i) => {
      const d = addDays(ws, i);
      if (!goalApplies(g, d)) return `<i class="na">${DAYS[i]}</i>`;
      const ok = goalProgress(g, d).complete;
      return `<i class="${ok ? 'ok' : ''}">${DAYS[i]}</i>`;
    }).join('')}</div>`;
  }
  const bonus = g.bonus > 0 ? `<span class="tag">+${fmtN(g.bonus)} ${COIN_NAME[g.bonusType || 'oro']} bonus</span>` : '';
  const stk = g.kind !== 'deadline' ? `<span class="tag dark">🔥 ${currentStreak(g)}</span><span class="tag">🎟️ ${g.passes || 0} pase${(g.passes || 0) === 1 ? '' : 's'}</span>` : '';
  return `<div class="goal-card ${pr.complete ? 'done' : ''}" style="background:${tint(s.color, .35)}${faded ? ';opacity:.55' : ''}">
    <div class="gm"><div class="tags"><span class="tag">${goalTag(g)}</span>${stk}${bonus}</div>
      <div class="gt">${esc(goalTitle(g))}</div><div class="gs">${sub}</div>
      <div class="bar"><i style="width:${Math.round(pr.pct * 100)}%"></i></div>${dots}</div>
    <div class="gb">${buddy(s.shape, s.color, pr.complete ? 'happy' : pr.done > 0 ? 'focus' : 'idle')}</div>
    ${withActions ? `<div class="gx"><button class="mini-btn" data-act="editGoal" data-id="${g.id}" aria-label="Editar">${ICON.edit}</button><button class="mini-btn" data-act="delGoal" data-id="${g.id}" aria-label="Borrar">${ICON.trash}</button></div>` : ''}
  </div>`;
}

function subjectTotals(from, to) {
  const map = new Map();
  for (const s of sessionsIn(from, to)) {
    if (!map.has(s.subjectId)) map.set(s.subjectId, { id: s.subjectId, min: 0, cats: new Map() });
    const r = map.get(s.subjectId); r.min += s.minutes;
    if (s.categoryId) r.cats.set(s.categoryId, (r.cats.get(s.categoryId) || 0) + s.minutes);
  }
  return [...map.values()].sort((a, b) => b.min - a.min);
}
// Gráfico de quesitos (donut) con leyenda
function donut(rows) {
  const total = rows.reduce((a, r) => a + r.min, 0) || 1;
  const R = 70, C = 2 * Math.PI * R, gap = rows.length > 1 ? 3 : 0;
  let acc = 0;
  const segs = rows.map((r, i) => {
    const len = r.min / total * C;
    const seg = `<circle class="dseg" cx="90" cy="90" r="${R}" fill="none" stroke="${subj(r.id)?.color || '#ccc'}" stroke-width="30"
      stroke-dasharray="${Math.max(0.5, len - gap)} ${C}" stroke-dashoffset="${-acc}" style="--c:${C};animation-delay:${i * 0.08}s"/>`;
    acc += len; return seg;
  }).join('');
  const legend = rows.slice(0, 8).map(r => { const s = subj(r.id) || { name: 'Borrada', color: '#ccc' };
    return `<div class="lg"><i style="background:${s.color}"></i><span class="ln">${esc(s.name)}</span><b>${fmtH(r.min)}</b><span class="lp">${Math.round(r.min / total * 100)}%</span></div>`; }).join('')
    + (rows.length > 8 ? `<div class="lg muted small">+${rows.length - 8} más</div>` : '');
  return `<div class="donut-wrap"><div class="donut"><svg viewBox="0 0 180 180" width="180" height="180"><circle cx="90" cy="90" r="${R}" fill="none" stroke="#F1ECE2" stroke-width="30"/><g transform="rotate(-90 90 90)">${segs}</g></svg>
    <div class="dc"><b>${fmtH(total)}</b><span>en total</span></div></div><div class="legend">${legend}</div></div>`;
}
function sbarRow(r, max, showCats) {
  const s = subj(r.id) || { name: 'Borrada', color: '#ccc', shape: 'circle', categories: [] };
  const cats = showCats && r.cats.size ? `<div class="cats">${[...r.cats].map(([cid, m]) => `<span>${esc(catName(s, cid))} · ${fmtH(m)}</span>`).join('')}</div>` : '';
  return `<div class="sbar">${buddy(s.shape, s.color, 'idle')}<div><div class="nm">${esc(s.name)}</div><div class="tr"><i style="width:${Math.max(3, r.min / max * 100)}%;background:${s.color}"></i></div></div><div class="val">${fmtH(r.min)}</div>${cats}</div>`;
}

/* ---------------- Foco ---------------- */
function elapsed() {
  const a = state.active; if (!a) return 0;
  return a.accumulatedMs + (a.runningSince ? Date.now() - a.runningSince : 0);
}
function renderFocus() {
  const a = state.active;
  if (!a) {
    if (!ui.focusSubject || !subj(ui.focusSubject)) ui.focusSubject = (subj(state.lastSubjectId) || state.subjects[0] || {}).id;
    const s = subj(ui.focusSubject);
    const cats = s && s.categories.length ? `<div style="margin-top:22px"><div class="section-h"><h2>¿Qué parte?</h2></div><div class="chips">
      <button class="chip ${!ui.focusCategory ? 'on' : ''}" data-act="pickCat" data-id="">General</button>
      ${s.categories.map(c => `<button class="chip ${ui.focusCategory === c.id ? 'on' : ''}" data-act="pickCat" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div></div>` : '';
    return `${topBar('Foco', '¿En qué te vas a concentrar ahora?')}
    <div class="focus-setup">
      <div class="subject-grid">${state.subjects.map(x => `<button class="subj-chip ${x.id === ui.focusSubject ? 'on' : ''}" data-act="pickSubj" data-id="${x.id}">
        ${buddy(x.shape, x.color, x.id === ui.focusSubject ? 'googly' : 'idle')}<span>${esc(x.name)}</span><span class="rate">${fmtN(x.rate)} ${coin(x.coinType, 14)} / h</span></button>`).join('')}</div>
      ${cats}
      <div class="focus-start">
        <div class="switch-row"><div class="t"><b>Modo estricto</b><span class="muted small">Si sales de la web más de ${state.settings.grace} s, el foco se pausa solo.</span></div>
          <button class="switch ${state.settings.strict ? 'on' : ''}" data-act="toggleStrict" aria-label="Modo estricto"></button></div>
        <button class="btn dark big" data-act="startFocus" ${s ? '' : 'disabled'}>${ICON.play} Empezar foco</button>
        <button class="link" data-act="manual">o añadir tiempo a mano</button>
      </div>
    </div>`;
  }
  const s = subj(a.subjectId) || { name: '—', color: '#ccc', shape: 'circle', coinType: 'oro', rate: 0 };
  const running = !!a.runningSince;
  const c = catName(s, a.categoryId);
  return `<div class="focus-run ${running ? 'running' : ''}" style="background:${tint(s.color, .3)}">
    <div class="sparkle" style="top:8%;left:10%;width:38px;height:38px">${star('#fff')}</div>
    <div class="sparkle" style="top:16%;right:12%;width:28px;height:28px;animation-delay:1s">${star('#FFD25A')}</div>
    <div class="sparkle" style="bottom:22%;left:8%;width:24px;height:24px;animation-delay:2s">${star('#fff')}</div>
    <div class="fr-subject">${esc(s.name)}${c ? ' · ' + esc(c) : ''}</div>
    <div class="fr-buddy">${buddyFull(s.shape, s.color, running ? 'study' : 'sleep')}</div>
    <div class="timer" id="timer">${fmtClock(elapsed())}</div>
    <div class="live-coins">+<span id="liveCoins">${fmtN(elapsed() / 36e5 * s.rate)}</span>${coin(s.coinType, 26)}</div>
    <div class="fr-actions">
      ${running ? `<button class="btn big" data-act="pause">${ICON.pause} Pausar</button>` : `<button class="btn big lime" data-act="resume">${ICON.play} Continuar</button>`}
      <button class="btn dark big" data-act="stop">${ICON.stop} Terminar</button>
    </div>
    <div class="fr-state">${running ? (a.strict ? '🔒 Modo estricto activado: quédate en esta pantalla' : 'Modo libre: el tiempo sigue aunque salgas') : '😴 En pausa'}</div>
  </div>`;
}

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { /* no soportado */ }
}
function startFocus() {
  const s = subj(ui.focusSubject); if (!s) return;
  state.active = { subjectId: s.id, categoryId: ui.focusCategory || null, startedAt: Date.now(), accumulatedMs: 0, runningSince: Date.now(), strict: state.settings.strict, breaks: 0, hiddenAt: null };
  state.lastSubjectId = s.id;
  save(); keepAwake(true); render();
}
function pauseFocus(at = Date.now()) {
  const a = state.active; if (!a || !a.runningSince) return;
  a.accumulatedMs += Math.max(0, at - a.runningSince); a.runningSince = null; save(); keepAwake(false);
}
function resumeFocus() { const a = state.active; if (!a || a.runningSince) return; a.runningSince = Date.now(); a.hiddenAt = null; save(); keepAwake(true); }

function openStopModal() {
  pauseFocus(); render();
  const a = state.active; const s = subj(a.subjectId);
  ui.draft = { minutes: Math.max(0, Math.round(elapsed() / 60000)), note: '' };
  openModal(() => {
    const d = ui.draft; const coins = r2(d.minutes / 60 * s.rate);
    return `<div class="sheet" style="text-align:center">
      ${buddyFull(s.shape, s.color, d.minutes >= 1 ? 'cheer' : 'sad').replace('class="buddy', 'class="summary-buddy buddy')}
      <h2>${d.minutes >= 1 ? '¡Bien hecho!' : 'Sesión muy cortita'}</h2>
      <p class="muted">${esc(s.name)}${a.categoryId ? ' · ' + esc(catName(s, a.categoryId)) : ''}</p>
      <div class="summary-coins">+${fmtN(coins)} ${coin(s.coinType, 36)}</div>
      <div class="row2" style="text-align:left">
        <div class="field"><label>Minutos</label><input class="inp" type="number" min="0" inputmode="numeric" value="${d.minutes}" data-d="minutes" data-rr></div>
        <div class="field"><label>Nota (opcional)</label><input class="inp" value="${esc(d.note)}" data-d="note" placeholder="Tema 3, problemas…"></div>
      </div>
      <p class="muted small" style="text-align:left">Puedes corregir los minutos si se te olvidó pararlo.</p>
      <div class="acts" style="justify-content:space-between">
        <button class="btn ghost" data-act="discardFocus">Descartar</button>
        <div style="display:flex;gap:10px"><button class="btn" data-act="closeModal">Seguir</button><button class="btn dark" data-act="saveFocus" ${d.minutes >= 1 ? '' : 'disabled'}>Guardar</button></div>
      </div></div>`;
  });
}
function saveFocus() {
  const a = state.active; const s = subj(a.subjectId); const d = ui.draft;
  const minutes = Math.max(0, Number(d.minutes) || 0);
  const coins = r2(minutes / 60 * s.rate);
  state.sessions.push({ id: uid(), subjectId: s.id, categoryId: a.categoryId, start: a.startedAt, end: Date.now(), minutes, coins, coinType: s.coinType, note: d.note || '', manual: false, breaks: a.breaks || 0 });
  state.active = null; save(); closeModal(); keepAwake(false);
  confetti(); toast(`+${fmtN(coins)} ${COIN_NAME[s.coinType]} · ${fmtDur(minutes)} de ${s.name}`);
  checkAwards(); render();
}

// Modo estricto: detectar que sales de la web
document.addEventListener('visibilitychange', () => {
  const a = state.active;
  if (document.hidden) {
    if (a && a.runningSince) { a.hiddenAt = Date.now(); save(); }
  } else {
    checkReturn();
    if (state.active && state.active.runningSince) keepAwake(true);
  }
});
function checkReturn() {
  const a = state.active;
  if (!a || !a.runningSince || !a.hiddenAt) return;
  const away = Date.now() - a.hiddenAt;
  if (a.strict && away > state.settings.grace * 1000) {
    pauseFocus(a.hiddenAt); a.breaks = (a.breaks || 0) + 1; a.hiddenAt = null; save();
    const s = subj(a.subjectId);
    go('focus');
    openModal(() => `<div class="sheet" style="text-align:center">${buddyFull(s.shape, s.color, 'sad').replace('class="buddy', 'class="summary-buddy buddy')}
      <h2>¡Te has ido ${fmtDur(Math.max(1, Math.round(away / 60000)))}!</h2>
      <p class="muted">He pausado el foco justo cuando saliste, así que ese rato no cuenta. ¿Seguimos?</p>
      <div class="acts" style="justify-content:center"><button class="btn" data-act="closeModal">Ahora no</button><button class="btn dark" data-act="resumeClose">${ICON.play} Seguir</button></div></div>`);
  } else { a.hiddenAt = null; save(); }
}

/* ---------------- Añadir a mano ---------------- */
function openManual() {
  const s0 = subj(ui.focusSubject) || state.subjects[0];
  ui.draft = { subjectId: s0?.id, categoryId: '', date: dayKey(new Date()), h: 1, m: 0, note: '' };
  openModal(() => {
    const d = ui.draft; const s = subj(d.subjectId);
    const min = (Number(d.h) || 0) * 60 + (Number(d.m) || 0);
    return `<div class="sheet"><h2>Añadir tiempo a mano</h2>
      <div class="field"><label>Asignatura / proyecto</label><select class="inp" data-d="subjectId" data-rr>${state.subjects.map(x => `<option value="${x.id}" ${x.id === d.subjectId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      ${s && s.categories.length ? `<div class="field"><label>Categoría</label><select class="inp" data-d="categoryId"><option value="">General</option>${s.categories.map(c => `<option value="${c.id}" ${c.id === d.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>Día</label><input class="inp" type="date" value="${d.date}" max="${dayKey(new Date())}" data-d="date"></div>
      <div class="row2"><div class="field"><label>Horas</label><input class="inp" type="number" min="0" inputmode="numeric" value="${d.h}" data-d="h" data-rr></div>
        <div class="field"><label>Minutos</label><input class="inp" type="number" min="0" max="59" inputmode="numeric" value="${d.m}" data-d="m" data-rr></div></div>
      <div class="field"><label>Nota (opcional)</label><input class="inp" value="${esc(d.note)}" data-d="note"></div>
      ${s ? `<div class="info-box">${coin(s.coinType, 28)} Ganarás ${fmtN(r2(min / 60 * s.rate))} de ${COIN_NAME[s.coinType]}</div>` : ''}
      <div class="acts"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn dark" data-act="saveManual" ${min > 0 ? '' : 'disabled'}>Guardar</button></div></div>`;
  });
}
function saveManual() {
  const d = ui.draft; const s = subj(d.subjectId); if (!s) return;
  const minutes = (Number(d.h) || 0) * 60 + (Number(d.m) || 0); if (minutes <= 0) return;
  const day = parseDay(d.date || dayKey(new Date()));
  const isToday = dayKey(day) === dayKey(new Date());
  const start = isToday ? Date.now() - minutes * 60000 : +day + 12 * 36e5;
  const coins = r2(minutes / 60 * s.rate);
  state.sessions.push({ id: uid(), subjectId: s.id, categoryId: d.categoryId || null, start: Math.max(+startOfDay(day), start), end: start + minutes * 60000, minutes, coins, coinType: s.coinType, note: d.note || '', manual: true, breaks: 0 });
  save(); closeModal(); toast(`Guardado · +${fmtN(coins)} ${COIN_NAME[s.coinType]}`); checkAwards(); render();
}

/* ---------------- Objetivos ---------------- */
function renderGoals() {
  const groups = [['daily', 'Diarios'], ['weekly', 'Semanales'], ['deadline', 'Con fecha límite']];
  const today = dayKey(new Date());
  const html = groups.map(([k, t]) => {
    let list = state.goals.filter(g => g.kind === k);
    if (k === 'deadline') list = list.sort((a, b) => a.deadline.localeCompare(b.deadline));
    if (!list.length) return '';
    return `<section style="margin-bottom:24px"><div class="section-h"><h2>${t}</h2></div><div class="goal-list" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">
      ${list.map(g => goalCard(g, true, k === 'deadline' && g.deadline < today)).join('')}</div></section>`;
  }).join('');
  return `${topBar('Objetivos', 'Diarios, semanales o antes de una fecha')}
    <div style="margin-bottom:20px"><button class="btn dark" data-act="newGoal">${ICON.plus} Nuevo objetivo</button></div>
    <div class="info-box" style="margin-bottom:22px;align-items:flex-start"><span style="font-size:26px">🔥</span><div><b>Cómo funcionan las rachas</b><br>
      Cada objetivo cumplido suma 1 a su racha. Si un día (o una semana, que se cierra el domingo a las 24:00) no lo cumples, se usa un <b>pase 🎟️</b> automáticamente y la racha se salva.
      Si no te quedan pases, pierdes la racha y ${fmtN(state.settings.penalty)} ${coin(state.settings.penaltyType, 16)} de ${state.settings.penaltyType}.
      El día 1 de cada mes cada objetivo diario y semanal gana 1 pase (se acumulan). Los objetivos con fecha no tienen pases: si llega la fecha sin cumplirlo, también penaliza.</div></div>
    ${html || `<div class="card empty">${buddy('triangle', '#2EC4A6', 'googly')}Aún no tienes objetivos.<br>Por ejemplo: <b>10 h de Fluidos antes del examen</b> o <b>1 h al día de lectura</b>.</div>`}`;
}
function openGoal(id) {
  const g = id ? state.goals.find(x => x.id === id) : null;
  const def = state.subjects[0];
  ui.draft = g ? { ...g, days: [...(g.days || [])], h: Math.floor(g.minutes / 60), m: g.minutes % 60 }
    : { id: null, subjectId: def?.id, categoryId: '', kind: 'daily', h: 1, m: 0, days: [0, 1, 2, 3, 4, 5, 6], deadline: dayKey(addDays(new Date(), 14)), startDate: dayKey(new Date()), bonus: 0, bonusType: 'oro' };
  openModal(() => {
    const d = ui.draft; const s = subj(d.subjectId);
    const kinds = [['daily', 'Diario'], ['weekly', 'Semanal'], ['deadline', 'Antes de una fecha']];
    return `<div class="sheet"><h2>${d.id ? 'Editar objetivo' : 'Nuevo objetivo'}</h2>
      <div class="field"><label>Tipo</label><div class="seg">${kinds.map(([k, t]) => `<button class="${d.kind === k ? 'on' : ''}" data-act="draftSet" data-k="kind" data-v="${k}">${t}</button>`).join('')}</div></div>
      <div class="field"><label>Asignatura / proyecto</label><select class="inp" data-d="subjectId" data-rr>${state.subjects.map(x => `<option value="${x.id}" ${x.id === d.subjectId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      ${s && s.categories.length ? `<div class="field"><label>Categoría</label><select class="inp" data-d="categoryId"><option value="">Todas</option>${s.categories.map(c => `<option value="${c.id}" ${c.id === d.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>` : ''}
      <div class="row2"><div class="field"><label>Horas</label><input class="inp" type="number" min="0" inputmode="numeric" value="${d.h}" data-d="h"></div>
        <div class="field"><label>Minutos</label><input class="inp" type="number" min="0" max="59" inputmode="numeric" value="${d.m}" data-d="m"></div></div>
      ${d.kind === 'daily' ? `<div class="field"><label>¿Qué días?</label><div class="daychips">${DAYS.map((x, i) => `<button class="${d.days.includes(i) ? 'on' : ''}" data-act="toggleDay" data-i="${i}">${x}</button>`).join('')}</div>
        <span class="muted small">¿Quieres distinto tiempo según el día? Crea otro objetivo con esos días.</span></div>` : ''}
      ${d.kind === 'deadline' ? `<div class="row2"><div class="field"><label>Contar desde</label><input class="inp" type="date" value="${d.startDate}" data-d="startDate"></div>
        <div class="field"><label>Fecha límite (ej. examen)</label><input class="inp" type="date" value="${d.deadline}" data-d="deadline"></div></div>` : ''}
      <div class="field"><label>Bonus al cumplirlo (opcional)</label><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input class="inp" style="width:110px" type="number" min="0" step="0.5" inputmode="decimal" value="${d.bonus}" data-d="bonus">
        <div class="typetoggle">${['oro', 'plata'].map(t => `<button class="${d.bonusType === t ? 'on' : ''}" data-act="draftSet" data-k="bonusType" data-v="${t}">${coin(t, 18)} ${t}</button>`).join('')}</div></div></div>
      <div class="acts"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn dark" data-act="saveGoal">Guardar</button></div></div>`;
  });
}
function saveGoal() {
  const d = ui.draft;
  const minutes = (Number(d.h) || 0) * 60 + (Number(d.m) || 0);
  if (minutes <= 0) return toast('Pon cuánto tiempo quieres conseguir');
  if (d.kind === 'daily' && !d.days.length) return toast('Elige al menos un día');
  if (d.kind === 'deadline' && (!d.deadline || d.deadline < d.startDate)) return toast('Revisa las fechas');
  const g = { id: d.id || uid(), subjectId: d.subjectId, categoryId: d.categoryId || null, kind: d.kind, minutes, days: d.days.sort(), deadline: d.deadline, startDate: d.startDate || dayKey(new Date()), bonus: Math.max(0, Number(d.bonus) || 0), bonusType: d.bonusType || 'oro', createdAt: d.createdAt || Date.now() };
  const i = state.goals.findIndex(x => x.id === g.id);
  const old = i >= 0 ? state.goals[i] : null;
  if (old && old.kind === g.kind && (g.kind !== 'deadline' || old.deadline === g.deadline)) {
    for (const k of ['streak', 'best', 'passes', 'passMonth', 'evalFrom', 'graceKey', 'settled']) g[k] = old[k];
  } else initTracking(g, false);
  if (i >= 0) state.goals[i] = g; else state.goals.push(g);
  save(); closeModal(); checkAwards(); render(); toast('Objetivo guardado');
}

/* ---------------- Estadísticas ---------------- */
function rangeBounds(r) {
  const now = new Date();
  if (r === 'today') return [startOfDay(now), addDays(startOfDay(now), 1)];
  if (r === 'week') return [startOfWeek(now), addDays(startOfWeek(now), 7)];
  if (r === 'month') { const f = startOfMonth(now); const t = new Date(f); t.setMonth(t.getMonth() + 1); return [f, t]; }
  return [new Date(0), addDays(startOfDay(now), 1)];
}
function renderStats() {
  const r = ui.statsRange;
  const [from, to] = rangeBounds(r);
  const tot = totalMinutes(from, to);
  const coins = coinsEarned(from, to);
  const rows = subjectTotals(from, to);
  const max = Math.max(1, ...rows.map(x => x.min));
  const sessCount = sessionsIn(from, to).length;

  // columnas apiladas: últimos 14 días
  const days = [...Array(14)].map((_, i) => addDays(startOfDay(new Date()), i - 13));
  const dayData = days.map(d => { const ss = sessionsIn(d, addDays(d, 1)); const m = ss.reduce((a, s) => a + s.minutes, 0); return { d, ss, m }; });
  const maxD = Math.max(60, ...dayData.map(x => x.m));
  const cols = dayData.map(({ d, ss, m }) => {
    const bySub = new Map(); ss.forEach(s => bySub.set(s.subjectId, (bySub.get(s.subjectId) || 0) + s.minutes));
    const parts = [...bySub].map(([id, mm]) => `<i style="height:${mm / maxD * 150}px;background:${subj(id)?.color || '#ccc'}"></i>`).join('');
    const isT = dayKey(d) === dayKey(new Date());
    return `<div class="col ${isT ? 'today' : ''}"><div class="vv">${m ? fmtH(m) : ''}</div><div class="stack-col" style="height:${Math.max(4, m / maxD * 150)}px">${parts}</div><div class="lbl">${DAYS[wd(d)]}${d.getDate()}</div></div>`;
  }).join('');

  // historial
  const hist = sessionsIn(from, to).sort((a, b) => b.start - a.start);
  const byDay = new Map(); hist.forEach(s => { const k = dayKey(s.start); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(s); });
  const histHtml = [...byDay].slice(0, 40).map(([k, list]) => `<div class="hist-day"><h3>${longDate(parseDay(k))} · ${fmtDur(list.reduce((a, s) => a + s.minutes, 0))}</h3>
    ${list.map(s => { const x = subj(s.subjectId) || { shape: 'circle', color: '#ccc', name: 'Borrada', categories: [] }; const c = catName(x, s.categoryId);
      const t = new Date(s.start);
      return `<div class="hist-item">${buddy(x.shape, x.color)}<div class="hm"><b>${esc(x.name)}${c ? ' · ' + esc(c) : ''}</b><span>${s.manual ? 'A mano' : String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0')}${s.note ? ' · ' + esc(s.note) : ''}${s.breaks ? ' · ' + s.breaks + ' salida' + (s.breaks > 1 ? 's' : '') : ''}</span></div>
        <div class="hv">${fmtDur(s.minutes)}<small>+${fmtN(s.coins)} ${coin(s.coinType, 14)}</small></div><button class="mini-btn" data-act="delSession" data-id="${s.id}" aria-label="Borrar">${ICON.trash}</button></div>`; }).join('')}</div>`).join('');

  const tabs = [['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['all', 'Todo']];
  return `${topBar('Estadísticas', 'Cuánto le echas a cada cosa')}
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div class="seg">${tabs.map(([k, t]) => `<button class="${r === k ? 'on' : ''}" data-act="range" data-v="${k}">${t}</button>`).join('')}</div>
      <button class="btn sm" data-act="manual">${ICON.plus} Añadir a mano</button></div>
    <div class="stat-tiles">
      <div class="tile" style="background:var(--lilac)"><div class="k">Tiempo de foco</div><div class="v">${fmtH(tot)}</div></div>
      <div class="tile" style="background:#FFE69A"><div class="k">Oro ganado</div><div class="v">${coin('oro', 28)}${fmtN(coins.oro)}</div></div>
      <div class="tile" style="background:#E7EBF2"><div class="k">Plata ganada</div><div class="v">${coin('plata', 28)}${fmtN(coins.plata)}</div></div>
      <div class="tile" style="background:var(--lime)"><div class="k">Racha · sesiones</div><div class="v">🔥${streak()} · ${sessCount}</div></div>
    </div>
    <div class="home-grid">
      <section><div class="section-h"><h2>Por asignatura</h2></div><div class="card">${rows.length ? donut(rows) + `<div class="sbars" style="margin-top:22px">${rows.map(x => sbarRow(x, max, true)).join('')}</div>` : '<div class="empty">Sin horas en este periodo.</div>'}</div></section>
      <section><div class="section-h"><h2>Últimos 14 días</h2></div><div class="card"><div class="cols">${cols}</div></div></section>
    </div>
    <section style="margin-top:22px"><div class="section-h"><h2>Historial</h2></div>${histHtml || '<div class="card empty">Nada por aquí todavía.</div>'}</section>`;
}

/* ---------------- Tienda ---------------- */
function renderShop() {
  const w = wallet();
  const rewards = state.rewards.map(rw => {
    const can = canAfford(rw, w);
    const bg = rw.coinType === 'oro' ? '#FFF1C2' : '#EEF1F6';
    return `<div class="reward" style="background:${bg}">
      <div class="gx"><button class="mini-btn" data-act="editReward" data-id="${rw.id}" aria-label="Editar">${ICON.edit}</button></div>
      <div class="emo">${esc(rw.emoji || '🎁')}</div><div class="rn">${esc(rw.name)}</div>
      <div class="rp">${fmtN(rw.price)} ${coin(rw.coinType, 24)}</div>
      <button class="btn ${can ? 'dark' : ''} full" data-act="buy" data-id="${rw.id}" ${can ? '' : 'disabled'}>${can ? 'Canjear' : 'Te faltan ' + fmtN(missing(rw, w))}</button></div>`;
  }).join('');
  const moves = [...state.purchases.map(p => ({ ...p, kind: 'buy' })), ...(state.penalties || []).map(p => ({ ...p, kind: 'pen', emoji: '💔', price: p.amount }))];
  const hist = moves.sort((a, b) => b.date - a.date).slice(0, 20).map(p => `<div class="hist-item" ${p.kind === 'pen' ? 'style="background:#FFF1EF"' : ''}><div style="font-size:30px;width:38px;text-align:center">${esc(p.emoji || '🎁')}</div><div class="hm"><b>${esc(p.name)}</b><span>${p.real ? 'Gasto real · ' : p.kind === 'pen' ? 'Penalización · ' : ''}${longDate(p.date)}</span></div>
    <div class="hv">−${fmtN(p.price)} ${coin(p.coinType, 16)}</div><button class="mini-btn" data-act="${p.kind === 'pen' ? 'undoPenalty' : 'undoPurchase'}" data-id="${p.id}" aria-label="Deshacer">↩︎</button></div>`).join('');
  return `${topBar('Tienda', 'Gasta lo que te has ganado')}
    <div class="wallet-hero">
      <div class="w gold">${coin('oro', 56)}<div><div class="n">${fmtN(w.oro)}</div><div class="l">monedas de oro</div></div></div>
      <div class="w silver">${coin('plata', 56)}<div><div class="n">${fmtN(w.plata)}</div><div class="l">monedas de plata</div></div></div>
      <div class="ex"><div class="rule">2 ${coin('plata', 18)} = 1 ${coin('oro', 18)}</div>
        <button class="btn sm" data-act="exchange" data-n="1" ${w.plata >= 2 ? '' : 'disabled'}>Cambiar 2 → 1</button>
        <button class="btn sm ghost" data-act="exchange" data-n="all" ${w.plata >= 2 ? '' : 'disabled'}>Cambiar toda</button></div>
    </div>
    <button class="real-spend" data-act="realSpend"><span class="emo">💸</span><span class="t"><b>Gasto en la vida real</b><span>¿Te has gastado dinero? Descuéntalo de tus monedas (1 € = 1 moneda)</span></span><span class="btn sm dark">Descontar</span></button>
    <div class="section-h"><h2>Recompensas</h2></div>
    <div class="reward-grid">${rewards}<button class="reward add" data-act="newReward"><span>+</span>Nueva recompensa</button></div>
    ${hist ? `<section style="margin-top:26px"><div class="section-h"><h2>Movimientos</h2></div>${hist}</section>` : ''}`;
}
function totalUnits(w) { return w.plata + 2 * w.oro; } // en plata
function needUnits(rw) { return rw.coinType === 'oro' ? rw.price * 2 : rw.price; }
function canAfford(rw, w = wallet()) { return totalUnits(w) + 1e-9 >= needUnits(rw); }
function missing(rw, w) { const u = needUnits(rw) - totalUnits(w); return rw.coinType === 'oro' ? r2(u / 2) : r2(u); }
function payPlan(rw, w) {
  const P = rw.price;
  if (rw.coinType === 'oro') { const o = Math.min(Math.max(w.oro, 0), P); return { oro: r2(o), plata: r2((P - o) * 2) }; }
  const p = Math.min(Math.max(w.plata, 0), P); return { plata: r2(p), oro: r2((P - p) / 2) };
}
function openBuy(id) {
  const rw = state.rewards.find(x => x.id === id); const w = wallet(); if (!rw || !canAfford(rw, w)) return;
  const plan = payPlan(rw, w);
  const parts = []; if (plan.oro) parts.push(`${fmtN(plan.oro)} ${coin('oro', 18)}`); if (plan.plata) parts.push(`${fmtN(plan.plata)} ${coin('plata', 18)}`);
  openModal(() => `<div class="sheet" style="text-align:center"><div style="font-size:70px">${esc(rw.emoji || '🎁')}</div><h2>¿Canjear «${esc(rw.name)}»?</h2>
    <p class="muted" style="display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap">Pagarás ${parts.join(' + ')}</p>
    <div class="acts" style="justify-content:center"><button class="btn" data-act="closeModal">Todavía no</button><button class="btn dark" data-act="confirmBuy" data-id="${rw.id}">¡Me lo he ganado!</button></div></div>`);
}
function confirmBuy(id) {
  const rw = state.rewards.find(x => x.id === id); const w = wallet(); if (!rw || !canAfford(rw, w)) return closeModal();
  state.purchases.push({ id: uid(), rewardId: rw.id, name: rw.name, emoji: rw.emoji, price: rw.price, coinType: rw.coinType, paid: payPlan(rw, w), date: Date.now() });
  save(); closeModal(); confetti(); toast(`¡A disfrutar! ${rw.emoji || ''}`); render();
}
function openRealSpend() {
  ui.draft = { name: '', amount: 10, coinType: 'oro' };
  openModal(() => {
    const d = ui.draft; const w = wallet(); const amt = Math.max(0, Number(d.amount) || 0);
    const rw = { price: amt, coinType: d.coinType }; const ok = canAfford(rw, w);
    const plan = ok ? payPlan(rw, w) : null;
    const parts = []; if (plan && plan.oro) parts.push(`${fmtN(plan.oro)} ${coin('oro', 16)}`); if (plan && plan.plata) parts.push(`${fmtN(plan.plata)} ${coin('plata', 16)}`);
    return `<div class="sheet"><h2>💸 Gasto en la vida real</h2>
      <div class="field"><label>¿En qué?</label><input class="inp" value="${esc(d.name)}" data-d="name" placeholder="Compras, cena, ropa…"></div>
      <div class="field"><label>¿Cuánto? (1 € = 1 moneda)</label><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input class="inp" style="width:120px" type="number" min="0" step="0.5" inputmode="decimal" value="${d.amount}" data-d="amount" data-rr>
        <div class="typetoggle">${['oro', 'plata'].map(t => `<button class="${d.coinType === t ? 'on' : ''}" data-act="draftSet" data-k="coinType" data-v="${t}">${coin(t, 18)} ${t}</button>`).join('')}</div></div></div>
      ${amt > 0 ? (ok ? `<div class="info-box">Se descontarán ${parts.join(' + ')}</div>`
        : `<div class="info-box" style="background:#FFE3DF">⚠️ No te llega: te quedarás en negativo y tendrás que recuperarlo estudiando.</div>`) : ''}
      <div class="acts"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn dark" data-act="saveRealSpend" ${amt > 0 ? '' : 'disabled'}>Descontar</button></div></div>`;
  });
}
function saveRealSpend() {
  const d = ui.draft; const amt = Math.max(0, Number(d.amount) || 0); if (!amt) return;
  const w = wallet(); const rw = { price: amt, coinType: d.coinType };
  const paid = canAfford(rw, w) ? payPlan(rw, w) : (d.coinType === 'oro' ? { oro: amt, plata: 0 } : { oro: 0, plata: amt });
  state.purchases.push({ id: uid(), rewardId: null, name: d.name.trim() || 'Gasto', emoji: '💸', price: amt, coinType: d.coinType, paid, date: Date.now(), real: true });
  save(); closeModal(); toast(`Descontadas ${fmtN(amt)} de ${d.coinType}`); render();
}
function openReward(id) {
  const rw = id ? state.rewards.find(x => x.id === id) : null;
  ui.draft = rw ? { ...rw } : { id: null, name: '', emoji: '🎁', price: 10, coinType: 'oro' };
  openModal(() => { const d = ui.draft; return `<div class="sheet"><h2>${d.id ? 'Editar recompensa' : 'Nueva recompensa'}</h2>
    <div style="display:flex;gap:12px;align-items:flex-end"><div class="field"><label>Emoji</label><input class="emoji-inp" value="${esc(d.emoji)}" data-d="emoji" maxlength="4"></div>
      <div class="field" style="flex:1"><label>¿Qué es?</label><input class="inp" value="${esc(d.name)}" data-d="name" placeholder="Ir al cine, cena fuera…"></div></div>
    <div class="field"><label>Precio</label><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input class="inp" style="width:110px" type="number" min="0" step="0.5" inputmode="decimal" value="${d.price}" data-d="price">
      <div class="typetoggle">${['oro', 'plata'].map(t => `<button class="${d.coinType === t ? 'on' : ''}" data-act="draftSet" data-k="coinType" data-v="${t}">${coin(t, 18)} ${t}</button>`).join('')}</div></div></div>
    <div class="acts" style="justify-content:space-between">${d.id ? `<button class="btn danger" data-act="delReward" data-id="${d.id}">Borrar</button>` : '<span></span>'}
      <div style="display:flex;gap:10px"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn dark" data-act="saveReward">Guardar</button></div></div></div>`; });
}
function saveReward() {
  const d = ui.draft; if (!d.name.trim()) return toast('Ponle un nombre');
  const rw = { id: d.id || uid(), name: d.name.trim(), emoji: d.emoji || '🎁', price: Math.max(0, Number(d.price) || 0), coinType: d.coinType };
  const i = state.rewards.findIndex(x => x.id === rw.id); if (i >= 0) state.rewards[i] = rw; else state.rewards.push(rw);
  save(); closeModal(); render();
}

/* ---------------- Editores (preparación y ajustes) ---------------- */
function subjectsEditor() {
  return `<div class="ed-list">${state.subjects.map(s => {
    const open = ui.expanded === s.id;
    return `<div class="ed-card">
      <div class="ed-row">${buddy(s.shape, s.color, open ? 'googly' : 'idle')}
        <div class="grow"><input class="ed-name" value="${esc(s.name)}" data-sf="name" data-id="${s.id}" aria-label="Nombre"></div>
        <div class="ed-sum">1 h =</div>
        <div class="stepper"><button data-act="rateStep" data-id="${s.id}" data-v="-0.5">−</button><input type="number" step="0.5" min="0" inputmode="decimal" value="${s.rate}" data-sf="rate" data-id="${s.id}"><button data-act="rateStep" data-id="${s.id}" data-v="0.5">+</button></div>
        <div class="typetoggle">${['oro', 'plata'].map(t => `<button class="${s.coinType === t ? 'on' : ''}" data-act="subjType" data-id="${s.id}" data-v="${t}">${coin(t, 18)} ${t}</button>`).join('')}</div>
        <button class="mini-btn" style="background:#F1ECE2" data-act="expand" data-id="${s.id}" aria-label="Más opciones">${open ? '▴' : '▾'}</button>
      </div>
      ${open ? `<div class="ed-more">
        <div><div class="flabel" style="margin-bottom:6px">Color</div><div class="swatches">${COLORS.map(c => `<button class="${s.color === c ? 'on' : ''}" style="background:${c}" data-act="subjColor" data-id="${s.id}" data-v="${c}" aria-label="${c}"></button>`).join('')}</div></div>
        <div><div class="flabel" style="margin-bottom:6px">Personaje</div><div class="shapes">${SHAPES.map(sh => `<button class="${s.shape === sh ? 'on' : ''}" data-act="subjShape" data-id="${s.id}" data-v="${sh}">${buddy(sh, s.color)}</button>`).join('')}</div></div>
        <div><div class="flabel" style="margin-bottom:6px">Categorías (opcional, ej. Desarrollo, Marketing)</div><div class="catchips">
          ${s.categories.map(c => `<span>${esc(c.name)}<button data-act="delCat" data-id="${s.id}" data-c="${c.id}" aria-label="Quitar">✕</button></span>`).join('')}
          <input placeholder="+ Añadir y pulsa Intro" data-newcat="${s.id}"></div></div>
        <div><button class="btn sm danger" data-act="delSubj" data-id="${s.id}">${ICON.trash} Borrar asignatura</button></div>
      </div>` : ''}
    </div>`;
  }).join('')}<button class="add-row" data-act="addSubj">+ Añadir asignatura o proyecto</button></div>`;
}
function rewardsEditor() {
  return `<div class="ed-list">${state.rewards.map(r => `<div class="ed-card"><div class="ed-row">
    <input class="emoji-inp" value="${esc(r.emoji)}" data-rf="emoji" data-id="${r.id}" maxlength="4">
    <div class="grow"><input class="ed-name" value="${esc(r.name)}" data-rf="name" data-id="${r.id}" placeholder="Nombre"></div>
    <input class="inp price-inp" type="number" min="0" step="0.5" inputmode="decimal" value="${r.price}" data-rf="price" data-id="${r.id}">
    <div class="typetoggle">${['oro', 'plata'].map(t => `<button class="${r.coinType === t ? 'on' : ''}" data-act="rewType" data-id="${r.id}" data-v="${t}">${coin(t, 18)} ${t}</button>`).join('')}</div>
    <button class="mini-btn" style="background:#F1ECE2" data-act="delRewardInline" data-id="${r.id}" aria-label="Borrar">${ICON.trash}</button>
  </div></div>`).join('')}<button class="add-row" data-act="addReward">+ Añadir recompensa</button></div>`;
}

function renderSetup() {
  const st = ui.setupStep;
  const dots = `<div class="steps-dots">${[0, 1, 2, 3].map(i => `<i class="${i === st ? 'on' : ''}"></i>`).join('')}</div>`;
  const foot = (back, next, label = 'Siguiente') => `<div class="setup-foot">${back ? `<button class="btn" data-act="setupStep" data-v="${st - 1}">${ICON.back} Atrás</button>` : '<span></span>'}<button class="btn dark" data-act="${next}">${label}</button></div>`;
  if (st === 0) {
    const pick = state.subjects.slice(0, 6);
    return `<div class="setup">${dots}<div class="welcome-buddies">${pick.map((s, i) => buddy(s.shape, s.color, i % 2 ? 'idle' : 'googly', 'float')).join('')}</div>
      <div class="setup-head"><h1>Tu tiempo de foco<br>vale oro 🪙</h1><p>Concéntrate, gana monedas y gástalas en cosas que te apetecen.<br>Antes de empezar, vamos a preparar tu app.</p></div>
      <div class="card" style="max-width:520px;margin:0 auto"><div class="field"><label>¿Cómo te llamas?</label><input class="inp" value="${esc(state.userName)}" data-setname></div></div>
      ${foot(false, 'setupNext', 'Empezar la preparación')}</div>`;
  }
  if (st === 1) {
    return `<div class="setup">${dots}<div class="setup-head"><h1>Asignaturas y proyectos</h1><p>Decide cuántas monedas te da <b>1 hora</b> de cada cosa y de qué tipo.<br>Lo importante da <b>oro</b>, lo menos importante da <b>plata</b>.</p></div>
      <div class="info-box" style="margin-bottom:16px">${coin('plata', 30)} 2 de plata = 1 de oro. Toca ▾ para cambiar el color, el personaje o añadir categorías.</div>
      ${subjectsEditor()}${foot(true, 'setupNext')}</div>`;
  }
  if (st === 2) {
    return `<div class="setup">${dots}<div class="setup-head"><h1>Tus recompensas</h1><p>¿Qué cosas te quieres ganar y cuánto cuestan?<br>Por ejemplo, el cine son 20 de oro.</p></div>
      ${rewardsEditor()}${foot(true, 'setupNext')}</div>`;
  }
  return `<div class="setup">${dots}<div class="welcome-buddies">${state.subjects.slice(0, 4).map(s => buddyFull(s.shape, s.color, 'cheer')).join('')}</div>
    <div class="setup-head"><h1>¡Todo listo, ${esc(state.userName)}!</h1><p>Dos consejos antes de empezar:</p></div>
    <div class="stack" style="max-width:620px;margin:0 auto">
      <div class="info-box"><span style="font-size:28px">📲</span><div><b>Añádela a la pantalla de inicio del iPad</b><br>En Safari: botón Compartir → «Añadir a pantalla de inicio». Así se abre como una app y tus datos están más seguros.</div></div>
      <div class="info-box"><span style="font-size:28px">💾</span><div><b>Haz copias de vez en cuando</b><br>Todo se guarda solo en este dispositivo. En Ajustes → «Exportar copia» guardas un archivo con todo.</div></div>
    </div>${foot(true, 'finishSetup', '¡Empezar! 🚀')}</div>`;
}
function renderSubjectsPage() {
  return `<header class="top"><div style="display:flex;align-items:center;gap:12px"><button class="icon-btn" data-act="go" data-to="settings">${ICON.back}</button><div class="page-title">Asignaturas y monedas</div></div>${walletPill()}</header>
    <div class="setup" style="margin:0"><div class="info-box" style="margin-bottom:16px">${coin('plata', 30)} Cambiar lo que da una hora solo afecta a las sesiones nuevas, no a las ya guardadas.</div>${subjectsEditor()}</div>`;
}
function renderRewardsPage() {
  return `<header class="top"><div style="display:flex;align-items:center;gap:12px"><button class="icon-btn" data-act="go" data-to="shop">${ICON.back}</button><div class="page-title">Editar recompensas</div></div>${walletPill()}</header>
    <div class="setup" style="margin:0">${rewardsEditor()}</div>`;
}

/* ---------------- Ajustes ---------------- */
function renderSettings() {
  const n = state.sessions.length;
  const item = (act, ic, bg, t, s) => `<button class="set-item" data-act="${act}"><div class="ic" style="background:${bg}">${ic}</div><div class="t"><b>${t}</b><span>${s}</span></div><span>›</span></button>`;
  return `${topBar('Ajustes')}
  <div class="set-list">
    <div class="set-item"><div class="ic" style="background:var(--lilac)">🙂</div><div class="t"><b>Tu nombre</b><input class="inp" style="margin-top:6px" value="${esc(state.userName)}" data-setname></div></div>
    ${item('goSubjects', '🪙', '#FFE69A', 'Asignaturas y monedas', 'Cuánto da cada hora, oro o plata, colores y categorías')}
    ${item('goRewards', '🎁', '#F7A8D4', 'Recompensas', 'Edita la tienda')}
    <div class="set-item"><div class="ic" style="background:var(--lime)">🔒</div><div class="t"><b>Modo estricto por defecto</b><span>Segundos de margen si sales de la web:</span>
      <div class="stepper" style="margin-top:6px"><button data-act="graceStep" data-v="-5">−</button><input type="number" value="${state.settings.grace}" data-grace><button data-act="graceStep" data-v="5">+</button></div></div>
      <button class="switch ${state.settings.strict ? 'on' : ''}" data-act="toggleStrict"></button></div>
    ${item('export', '💾', '#7CC4F8', 'Exportar copia', `Descarga un archivo con todo (${n} sesiones)`)}
    ${item('import', '📂', '#B9A4F7', 'Importar copia', 'Restaura desde un archivo (por ejemplo, para pasarlo al Mac)')}
    ${item('redoSetup', '✨', '#D4EE6A', 'Volver a la preparación', 'Repasar asignaturas y recompensas paso a paso')}
    ${item('reset', '🗑️', '#FFD5CF', 'Borrar todo', 'Empieza de cero (no se puede deshacer)')}
    <input type="file" id="importFile" accept="application/json,.json" hidden>
    <p class="muted small" style="margin:10px 4px">Tus datos se guardan solo en este dispositivo y navegador. Nadie más puede verlos.</p>
  </div>`;
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `foco-copia-${dayKey(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Copia descargada 💾');
}
function importData(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const s = JSON.parse(fr.result);
      if (!Array.isArray(s.subjects) || !Array.isArray(s.sessions)) throw new Error('formato');
      confirmModal('¿Reemplazar tus datos?', `La copia tiene ${s.sessions.length} sesiones y ${s.subjects.length} asignaturas. Lo que hay ahora en este dispositivo se sustituirá.`, 'Reemplazar', () => {
        const d = defaultState();
        state = { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, setupDone: true };
        save(); go('home'); toast('Copia restaurada ✅');
      });
    } catch (e) { toast('Ese archivo no parece una copia de Foco'); }
  };
  fr.readAsText(file);
}

/* ---------------- Modal / toast / confeti ---------------- */
function openModal(fn) { ui.modalRender = fn; const m = $('#modal'); m.innerHTML = fn(); m.hidden = false; }
function rerenderModal() { if (!ui.modalRender) return; const m = $('#modal'); const ae = document.activeElement; const key = ae && ae.dataset && ae.dataset.d; const pos = ae && ae.selectionStart; m.innerHTML = ui.modalRender(); if (key) { const el = m.querySelector(`[data-d="${key}"]`); if (el) { el.focus(); try { if (pos != null) el.setSelectionRange(pos, pos); } catch (e) {} } } }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; ui.modalRender = null; }
function confirmModal(title, text, okLabel, onOk) {
  ui.confirmOk = onOk;
  openModal(() => `<div class="sheet"><h2>${title}</h2><p class="muted">${text}</p><div class="acts"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="confirmOk">${okLabel}</button></div></div>`);
}
let toastT;
function toast(msg) { const t = $('#toast'); t.innerHTML = esc(msg); t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = $('#confetti'); const cols = ['#FF6B5E', '#FFD25A', '#2EC4A6', '#8E6CF0', '#F58FC6', '#7CC4F8', '#D4EE6A'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw'; p.style.background = cols[i % cols.length];
    p.style.animationDuration = 1.6 + Math.random() * 1.6 + 's'; p.style.animationDelay = Math.random() * .4 + 's';
    if (i % 3 === 0) p.style.borderRadius = '50%';
    box.appendChild(p); setTimeout(() => p.remove(), 3800);
  }
}

/* ---------------- Eventos ---------------- */
document.addEventListener('click', e => {
  const m = $('#modal');
  if (e.target === m) { closeModal(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const { act, id, v } = el.dataset;
  const S = id ? subj(id) : null;
  switch (act) {
    case 'go': go(el.dataset.to); break;
    case 'closeModal': closeModal(); break;
    case 'confirmOk': { const f = ui.confirmOk; closeModal(); f && f(); break; }
    // setup
    case 'setupStep': ui.setupStep = Number(v); render(); scrollTo(0, 0); break;
    case 'setupNext': ui.setupStep++; render(); scrollTo(0, 0); break;
    case 'finishSetup': state.setupDone = true; state.goals.forEach(g => initTracking(g)); save(); ui.setupStep = 0; location.hash = '#/home'; render(); confetti(); break;
    case 'redoSetup': state.setupDone = false; ui.setupStep = 0; save(); render(); scrollTo(0, 0); break;
    case 'goSubjects': go('subjects'); break;
    case 'goRewards': go('rewards'); break;
    // subjects editor
    case 'expand': ui.expanded = ui.expanded === id ? null : id; render(); break;
    case 'rateStep': S.rate = Math.max(0, r2((Number(S.rate) || 0) + Number(v))); save(); render(); break;
    case 'subjType': S.coinType = v; save(); render(); break;
    case 'subjColor': S.color = v; save(); render(); break;
    case 'subjShape': S.shape = v; save(); render(); break;
    case 'delCat': S.categories = S.categories.filter(c => c.id !== el.dataset.c); save(); render(); break;
    case 'addSubj': { const s = { id: uid(), name: 'Nueva asignatura', color: COLORS[state.subjects.length % COLORS.length], shape: SHAPES[state.subjects.length % SHAPES.length], coinType: 'oro', rate: 2, categories: [] }; state.subjects.push(s); ui.expanded = s.id; save(); render(); setTimeout(() => { const i = document.querySelector(`[data-sf="name"][data-id="${s.id}"]`); i && (i.focus(), i.select()); }, 50); break; }
    case 'delSubj': confirmModal('¿Borrar asignatura?', `«${esc(S.name)}» desaparecerá de la lista. Las horas ya registradas se mantienen en el historial.`, 'Borrar', () => { state.subjects = state.subjects.filter(x => x.id !== id); state.goals = state.goals.filter(g => g.subjectId !== id); save(); render(); }); break;
    // rewards editor
    case 'rewType': { const r = state.rewards.find(x => x.id === id); r.coinType = v; save(); render(); break; }
    case 'delRewardInline': state.rewards = state.rewards.filter(x => x.id !== id); save(); render(); break;
    case 'addReward': state.rewards.push({ id: uid(), name: '', emoji: '🎁', price: 10, coinType: 'oro' }); save(); render(); setTimeout(() => { const l = document.querySelectorAll('[data-rf="name"]'); l[l.length - 1]?.focus(); }, 50); break;
    // focus
    case 'pickSubj': ui.focusSubject = id; ui.focusCategory = null; render(); break;
    case 'pickCat': ui.focusCategory = id || null; render(); break;
    case 'toggleStrict': state.settings.strict = !state.settings.strict; save(); render(); break;
    case 'startFocus': startFocus(); break;
    case 'pause': pauseFocus(); render(); break;
    case 'resume': resumeFocus(); render(); break;
    case 'resumeClose': closeModal(); resumeFocus(); render(); break;
    case 'stop': openStopModal(); break;
    case 'saveFocus': saveFocus(); break;
    case 'discardFocus': confirmModal('¿Descartar esta sesión?', 'No se guardará el tiempo ni las monedas.', 'Descartar', () => { state.active = null; save(); keepAwake(false); render(); }); break;
    case 'manual': openManual(); break;
    case 'saveManual': saveManual(); break;
    // goals
    case 'newGoal': openGoal(null); break;
    case 'editGoal': openGoal(id); break;
    case 'delGoal': confirmModal('¿Borrar objetivo?', esc(goalTitle(state.goals.find(g => g.id === id))), 'Borrar', () => { state.goals = state.goals.filter(g => g.id !== id); save(); render(); }); break;
    case 'saveGoal': saveGoal(); break;
    case 'draftSet': ui.draft[el.dataset.k] = v; rerenderModal(); break;
    case 'toggleDay': { const i = Number(el.dataset.i); const d = ui.draft.days; ui.draft.days = d.includes(i) ? d.filter(x => x !== i) : [...d, i]; rerenderModal(); break; }
    // stats
    case 'range': ui.statsRange = v; render(); break;
    case 'delSession': { const s = state.sessions.find(x => x.id === id); confirmModal('¿Borrar sesión?', `${fmtDur(s.minutes)} de ${esc(subjName(s.subjectId))}. También se restarán sus ${fmtN(s.coins)} monedas.`, 'Borrar', () => { state.sessions = state.sessions.filter(x => x.id !== id); save(); render(); }); break; }
    // shop
    case 'buy': openBuy(id); break;
    case 'confirmBuy': confirmBuy(id); break;
    case 'undoPurchase': { const p = state.purchases.find(x => x.id === id); confirmModal('¿Deshacer canje?', `Te devuelvo las monedas de «${esc(p.name)}».`, 'Deshacer', () => { state.purchases = state.purchases.filter(x => x.id !== id); save(); render(); }); break; }
    case 'exchange': { const w = wallet(); const n = el.dataset.n === 'all' ? Math.floor(w.plata / 2) : 1; if (n >= 1 && w.plata >= 2 * n) { state.exchanges.push({ id: uid(), oro: n, date: Date.now() }); save(); render(); toast(`Cambiadas ${n * 2} de plata por ${n} de oro`); } break; }
    case 'newReward': openReward(null); break;
    case 'realSpend': openRealSpend(); break;
    case 'saveRealSpend': saveRealSpend(); break;
    case 'undoPenalty': { const p = state.penalties.find(x => x.id === id); confirmModal('¿Perdonar esta penalización?', `Te devuelvo ${fmtN(p.amount)} de ${p.coinType}. (La racha no vuelve.)`, 'Perdonar', () => { state.penalties = state.penalties.filter(x => x.id !== id); save(); render(); }); break; }
    case 'editReward': openReward(id); break;
    case 'saveReward': saveReward(); break;
    case 'delReward': state.rewards = state.rewards.filter(x => x.id !== id); save(); closeModal(); render(); break;
    // settings
    case 'graceStep': state.settings.grace = Math.max(0, Math.min(600, state.settings.grace + Number(v))); save(); render(); break;
    case 'export': exportData(); break;
    case 'import': $('#importFile').click(); break;
    case 'reset': confirmModal('¿Borrar todo?', 'Se borrarán todas tus sesiones, monedas, objetivos y recompensas de este dispositivo. Te recomiendo exportar una copia antes.', 'Borrar todo', () => { localStorage.removeItem(KEY); state = defaultState(); ui.setupStep = 0; render(); }); break;
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.d !== undefined && ui.draft) { ui.draft[el.dataset.d] = el.value; if (el.dataset.rr !== undefined && el.tagName !== 'SELECT') rerenderModal(); return; }
  if (el.dataset.sf) { const s = subj(el.dataset.id); if (!s) return; if (el.dataset.sf === 'rate') s.rate = Math.max(0, Number(el.value) || 0); else s[el.dataset.sf] = el.value; save(); return; }
  if (el.dataset.rf) { const r = state.rewards.find(x => x.id === el.dataset.id); if (!r) return; r[el.dataset.rf] = el.dataset.rf === 'price' ? Math.max(0, Number(el.value) || 0) : el.value; save(); return; }
  if (el.dataset.setname !== undefined) { state.userName = el.value; save(); return; }
  if (el.dataset.grace !== undefined) { state.settings.grace = Math.max(0, Number(el.value) || 0); save(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.d !== undefined && ui.draft) { ui.draft[el.dataset.d] = el.value; if (el.dataset.d === 'subjectId') ui.draft.categoryId = ''; if (el.dataset.rr !== undefined && el.tagName === 'SELECT') rerenderModal(); return; }
  if (el.id === 'importFile' && el.files[0]) { importData(el.files[0]); el.value = ''; }
  if (el.dataset.sf === 'name' || el.dataset.rf) render();
});
document.addEventListener('keydown', e => {
  const el = e.target;
  if (e.key === 'Enter' && el.dataset.newcat) {
    const s = subj(el.dataset.newcat); const v = el.value.trim();
    if (s && v) { el.value = ''; s.categories.push({ id: uid(), name: v }); save(); render(); setTimeout(() => document.querySelector(`[data-newcat="${s.id}"]`)?.focus(), 30); }
  }
  if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
});
document.addEventListener('focusout', e => {
  const el = e.target;
  if (el.dataset && el.dataset.newcat && el.value.trim()) { const s = subj(el.dataset.newcat); s.categories.push({ id: uid(), name: el.value.trim() }); save(); setTimeout(render, 0); }
});

/* ---------------- Reloj ---------------- */
function tick() {
  if (!state.active) return;
  const ms = elapsed();
  const t = $('#timer'); if (t) t.textContent = fmtClock(ms);
  const h = $('#homeTimer'); if (h) h.textContent = fmtClock(ms);
  const c = $('#liveCoins'); if (c) { const s = subj(state.active.subjectId); c.textContent = fmtN(ms / 36e5 * (s ? s.rate : 0)); }
}
setInterval(tick, 1000);
let lastSettleDay = dayKey(new Date());
setInterval(() => { const k = dayKey(new Date()); if (k !== lastSettleDay) { lastSettleDay = k; runSettle(); render(); } }, 60000);

/* ---------------- Arranque ---------------- */
checkReturn();
if (state.active && state.active.runningSince) keepAwake(true);
runSettle();
render();
checkAwards();
