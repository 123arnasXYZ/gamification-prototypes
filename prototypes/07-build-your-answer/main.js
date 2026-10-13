/* ============================================================
   07 — Let learners build their answer

   A customer at the returns desk, drawn flat in 2D. Instead of
   picking a finished reply, the learner builds one out of a Tone
   and an Action, and the two halves are scored separately.

   The customer reacts in two stages, because the answer has two
   parts: the tone arrives first and her face moves, then the
   action arrives and it moves again. A warm apology followed by
   "five working days" visibly loses her in the middle of your own
   sentence, which is the thing a four-option multiple choice can
   never show.

   No Three.js and no WebGL: one <canvas>, one 2D context. The
   desk and the exchange are composed in the fixed design space
   given by view.board and scaled as a single piece into whatever
   room the overlay leaves. Every wait rides the animation loop,
   so a throttled tab cannot strand her mid-sentence.
   ============================================================ */

import { el, showResult, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, startFace, parts, faceWeights, verdict, reply, midRead, ui,
  palette as P, view, timing,
} from './content.js';

const bridge = createBridge('build-your-answer');
const TAU = Math.PI * 2;
const COMBOS = parts.reduce((n, p) => n * p.options.length, 1);

/* Hoisted on purpose: used while the module is still starting up. */
function font(weight, size, style = '') {
  return `${style} ${weight} ${size}px ${view.fontFamily}`.trim();
}
function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function lerp(a, b, t) { return a + (b - a) * t; }
function partOf(id) { return parts.find((p) => p.id === id); }
function option(partId, optionId) {
  return partOf(partId).options.find((o) => o.id === optionId);
}

/* ============================================================
   Canvas
   ============================================================ */
const stageEl = document.getElementById('stage');
const canvas = document.createElement('canvas');
stageEl.append(canvas);
const ctx = canvas.getContext('2d');

let dpr = 1;
let cssW = 1;
let cssH = 1;

function resizeCanvas() {
  const r = stageEl.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  cssW = Math.max(1, r.width);
  cssH = Math.max(1, r.height);
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  regionDirty = true;
}

const uiEl = document.getElementById('ui');
const topbarEl = document.getElementById('topbar');
const bottomEl = document.getElementById('bottom');

let region = { x: 0, y: 0, w: view.board.w, h: view.board.h };
let regionDirty = true;
let placed = { s: 1, ox: 0, oy: 0 };

function measureRegion() {
  regionDirty = false;
  const pad = 12;
  const top = topbarEl.getBoundingClientRect();
  const bot = bottomEl.getBoundingClientRect();
  const y = top.bottom + pad;
  region = {
    x: 16, y,
    w: Math.max(view.minRegion.w, cssW - 32),
    h: Math.max(view.minRegion.h, bot.top - pad - y),
  };
}

function place() {
  if (regionDirty) measureRegion();
  const s = Math.min(region.w / view.board.w, region.h / view.board.h, view.maxScale);
  placed = {
    s,
    ox: region.x + (region.w - view.board.w * s) / 2,
    oy: region.y + (region.h - view.board.h * s) / 2,
  };
  return placed;
}

new ResizeObserver(() => resizeCanvas()).observe(stageEl);
new ResizeObserver(() => { regionDirty = true; }).observe(bottomEl);
window.addEventListener('resize', resizeCanvas);
document.fonts?.ready?.then(() => { regionDirty = true; });

/* ============================================================
   State

   `face` is where she is now; `faceTo` is where she is heading.
   Everything else on the canvas is the exchange itself.
   ============================================================ */
const state = {
  choice: {},
  phase: 'build',          // build | sending | sent
  stage: 'none',           // none | tone | full — how much of your reply has landed
  you: { full: '', shown: 0, typing: false },
  her: { full: '', shown: 0, typing: false },
  tried: new Set(),
  run: 0,
};

const face = { mood: startFace.mood, heat: startFace.heat };
let faceFrom = { ...startFace };
let faceTo = { ...startFace };
let faceAt = 0;

function setFace(target) {
  faceFrom = { ...face };
  faceTo = { mood: clamp(target.mood, -1, 1), heat: clamp(target.heat, 0, 1) };
  faceAt = performance.now();
}

function tickFace(now) {
  const p = faceAt ? easeOut(clamp((now - faceAt) / timing.faceMs)) : 1;
  face.mood = lerp(faceFrom.mood, faceTo.mood, p);
  face.heat = lerp(faceFrom.heat, faceTo.heat, p);
}

/** Where her face lands once both halves have arrived. */
function blendFace(tone, action) {
  const w = faceWeights;
  return {
    mood: tone.face.mood * w.tone + action.face.mood * w.action,
    heat: Math.max(tone.face.heat * 0.85, action.face.heat),
  };
}

/* ============================================================
   Shape and text primitives
   ============================================================ */
function rounded(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}
function fillCorners(x, y, w, h, radii, colour) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radii);
  ctx.fillStyle = colour;
  ctx.fill();
}
function fillRounded(x, y, w, h, r, colour) {
  if (w <= 0 || h <= 0) return;
  rounded(x, y, w, h, r);
  ctx.fillStyle = colour;
  ctx.fill();
}
function strokeRounded(x, y, w, h, r, colour, width = 1.5) {
  if (w <= 0 || h <= 0) return;
  rounded(x, y, w, h, r);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}
function disc(x, y, r, colour) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
  ctx.fillStyle = colour;
  ctx.fill();
}
function oval(x, y, rx, ry, colour, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  ctx.fillStyle = colour;
  ctx.fill();
}
function write(str, x, y, { size = 13, weight = 700, colour = P.ink, align = 'left', style = '' } = {}) {
  ctx.font = font(weight, size, style);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colour;
  ctx.fillText(str, x, y);
}
/** Words wrapped into `max`. */
function wrap(str, max, size, weight) {
  ctx.font = font(weight, size);
  const out = [];
  let line = '';
  for (const word of String(str).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) { out.push(line); line = word; }
    else line = next;
  }
  if (line) out.push(line);
  return out;
}

/* ============================================================
   The customer

   One function, driven entirely by `face`. Nothing below knows
   what was chosen — it only knows mood and heat, which is what
   makes the two-stage reaction possible.
   ============================================================ */
let blinkAt = 0;

function drawCustomer(now) {
  const A = view.avatar;
  const mood = face.mood;
  const heat = face.heat;

  /* she leans back when she bristles, forward a touch when relieved */
  const lean = -heat * 7 + Math.max(0, mood) * 3;
  const tilt = -heat * 0.05 + mood * 0.03;
  const sway = Math.sin(now / 1400) * 1.6;

  /* neck, then coat with sloped shoulders */
  ctx.save();
  ctx.translate(A.cx + lean * 0.5, A.cy + 118);
  fillRounded(-17, -46, 34, 56, 12, P.skinShade);
  fillCorners(-78, -6, 156, 126, [62, 62, 16, 16], P.coat);
  // collar, open at the throat
  ctx.beginPath();
  ctx.moveTo(-34, -4);
  ctx.lineTo(0, 38);
  ctx.lineTo(34, -4);
  ctx.quadraticCurveTo(0, 14, -34, -4);
  ctx.closePath();
  ctx.fillStyle = P.coatDark;
  ctx.fill();
  /* folded arms once she is properly bristling */
  if (heat > 0.42) {
    const a = clamp((heat - 0.42) / 0.3);
    ctx.save();
    ctx.globalAlpha = a;
    fillRounded(-62, 44, 124, 24, 12, P.coatDark);
    fillRounded(-54, 32, 108, 22, 11, P.coat);
    oval(-58, 44, 13, 11, P.skin);
    oval(58, 56, 13, 11, P.skin);
    ctx.restore();
  }
  ctx.restore();

  /* head */
  ctx.save();
  ctx.translate(A.cx + lean + sway, A.cy);
  ctx.rotate(tilt);

  // hair behind the head, and the two locks that frame the face
  oval(0, -2, A.r + 10, A.r + 14, P.hair);
  oval(-A.r + 2, 18, 14, 40, P.hair);
  oval(A.r - 2, 18, 14, 40, P.hair);
  // ears
  oval(-A.r + 6, 8, 9, 13, P.skinShade);
  oval(A.r - 6, 8, 9, 13, P.skinShade);
  // face
  oval(0, 2, A.r - 6, A.r + 2, P.skin);
  // fringe, swept across the forehead
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -A.r + 20, A.r - 4, 32, 0, Math.PI, TAU);
  ctx.fillStyle = P.hair;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-A.r + 8, -A.r + 22);
  ctx.quadraticCurveTo(-6, -A.r + 44, A.r - 10, -A.r + 16);
  ctx.quadraticCurveTo(0, -A.r + 8, -A.r + 8, -A.r + 22);
  ctx.fillStyle = P.hairLight;
  ctx.fill();
  ctx.restore();

  /* eyes — narrowed by heat, shut on a blink */
  const blinking = (now - blinkAt) % timing.blinkEveryMs < timing.blinkMs;
  const open = blinking ? 0.08 : clamp(1 - heat * 0.45 + Math.max(0, mood) * 0.1, 0.1, 1.1);
  for (const sx of [-1, 1]) {
    const ex = sx * 22;
    const ey = -4;
    oval(ex, ey, 11, 9 * open, '#FFFFFF');
    const look = mood < -0.3 ? 1.5 : 0;     // eyes drop when it goes badly
    disc(ex + sx * 1.2, ey + look, 5 * Math.min(1, open * 1.4), P.eye);
    if (open > 0.3) disc(ex + sx * 1.2 + 1.6, ey + look - 1.6, 1.6, '#FFFFFF');
    // lid
    ctx.beginPath();
    ctx.ellipse(ex, ey - 9 * open, 11, 6, 0, 0, Math.PI, true);
    ctx.fillStyle = P.skin;
    ctx.fill();
  }

  /* brows — the single clearest signal on the whole face */
  for (const sx of [-1, 1]) {
    const bx = sx * 22;
    const inner = -18 - mood * 3 + heat * 9;
    const outerY = -22 - mood * 2 - heat * 2;
    ctx.beginPath();
    ctx.moveTo(bx - sx * 13, outerY);
    ctx.quadraticCurveTo(bx, inner - 5, bx + sx * 12, inner);
    ctx.strokeStyle = P.hair;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  /* the furrow that appears when she is bristling */
  if (heat > 0.45) {
    ctx.save();
    ctx.globalAlpha = clamp((heat - 0.45) / 0.4) * 0.6;
    ctx.beginPath();
    ctx.moveTo(-3, -18);
    ctx.lineTo(-4, -8);
    ctx.moveTo(3, -18);
    ctx.lineTo(4, -8);
    ctx.strokeStyle = P.skinShade;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  /* mouth — curve from a flat tight line to a real smile */
  const my = 28;
  const curve = mood * 13;
  const width = 17 + Math.max(0, mood) * 5 - heat * 3;
  ctx.beginPath();
  ctx.moveTo(-width, my - curve * 0.25);
  ctx.quadraticCurveTo(0, my + curve, width, my - curve * 0.25);
  ctx.strokeStyle = P.mouth;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
  if (mood > 0.55) {
    // a little relief showing
    ctx.beginPath();
    ctx.moveTo(-width, my - curve * 0.25);
    ctx.quadraticCurveTo(0, my + curve, width, my - curve * 0.25);
    ctx.quadraticCurveTo(0, my + curve * 0.35, -width, my - curve * 0.25);
    ctx.fillStyle = P.mouth;
    ctx.fill();
  }
  if (heat > 0.6) {
    ctx.save();
    ctx.globalAlpha = clamp((heat - 0.6) / 0.4) * 0.9;
    oval(-38, 18, 12, 8, P.blush);
    oval(38, 18, 12, 8, P.blush);
    ctx.restore();
  }

  ctx.restore();

}

function drawShopBack() {
  const S = view.scene;
  fillRounded(S.x, S.y, S.w, view.board.h - S.y * 2, 16, P.shopWall);

  /* a shelf of stock behind her */
  fillRounded(S.x + 28, 96, 130, 8, 3, P.shelf);
  fillRounded(S.x + 236, 96, 130, 8, 3, P.shelf);
  for (let i = 0; i < 3; i++) {
    fillRounded(S.x + 36 + i * 42, 62, 32, 34, 4, P.stock[i % 3]);
    fillRounded(S.x + 244 + i * 42, 62, 32, 34, 4, P.stock[(i + 2) % 3]);
  }

}

/* Drawn after her, so she stands behind it. */
function drawCounter() {
  const S = view.scene;
  const cy = 404;
  fillRounded(S.x, cy, S.w, view.board.h - cy - 2, 12, P.counter);
  fillRounded(S.x, cy - 8, S.w, 16, 6, P.counterEdge);

  /* the kettle with the cracked lid, between you and her */
  const kx = S.x + 300;
  const ky = cy - 8;
  ctx.beginPath();
  ctx.moveTo(kx - 22, ky);
  ctx.lineTo(kx - 17, ky - 44);
  ctx.lineTo(kx + 17, ky - 44);
  ctx.lineTo(kx + 22, ky);
  ctx.closePath();
  ctx.fillStyle = P.kettle;
  ctx.fill();
  ctx.strokeStyle = P.kettleEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  fillRounded(kx - 20, ky - 54, 40, 10, 3, P.kettle);
  strokeRounded(kx - 20, ky - 54, 40, 10, 3, P.kettleEdge, 1.5);
  // the crack
  ctx.beginPath();
  ctx.moveTo(kx - 6, ky - 54);
  ctx.lineTo(kx - 1, ky - 48);
  ctx.lineTo(kx + 6, ky - 53);
  ctx.strokeStyle = P.crack;
  ctx.lineWidth = 2;
  ctx.stroke();
  // handle
  ctx.beginPath();
  ctx.arc(kx + 26, ky - 26, 12, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = P.crack;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  write(meta.counterNote, kx, ky + 22, { size: 10, weight: 800, colour: P.dim, align: 'center' });

  /* who she is, on the counter in front of her */
  write(meta.name, S.x + 28, cy + 34, { size: 13.5, weight: 800, colour: P.ink });
  write(meta.role, S.x + 28, cy + 52, { size: 10.5, weight: 700, colour: P.faint });
}

/* ============================================================
   The exchange, drawn as bubbles down the right
   ============================================================ */
function bubble(x, y, maxW, text, { mine = false, label = '', caret = false } = {}) {
  const pad = 14;
  const size = 14;
  const lines = wrap(text || ' ', maxW - pad * 2, size, mine ? 700 : 600);
  const lh = 20;
  const h = pad * 2 + lines.length * lh + (label ? 16 : 0);
  let w = pad * 2;
  ctx.font = font(mine ? 700 : 600, size);
  for (const l of lines) w = Math.max(w, ctx.measureText(l).width + pad * 2);
  w = Math.min(Math.max(w, 160), maxW);
  const bx = mine ? x + maxW - w : x;

  fillRounded(bx, y, w, h, 14, mine ? P.bubbleYou : P.bubbleThem);
  if (!mine) strokeRounded(bx, y, w, h, 14, P.line, 1.5);

  let ty = y + pad + 14;
  if (label) {
    write(label.toUpperCase(), bx + pad, ty - 2,
      { size: 9.5, weight: 800, colour: mine ? 'rgba(255,255,255,0.7)' : P.faint });
    ty += 16;
  }
  lines.forEach((l, i) => {
    write(l, bx + pad, ty + i * lh,
      { size, weight: mine ? 700 : 600, colour: mine ? P.bubbleYouInk : P.ink });
  });

  if (caret) {
    const last = lines[lines.length - 1] ?? '';
    ctx.font = font(mine ? 700 : 600, size);
    const cx = bx + pad + ctx.measureText(last).width + 3;
    const cy = ty + (lines.length - 1) * lh;
    ctx.fillStyle = mine ? P.bubbleYouInk : P.ink;
    ctx.fillRect(cx, cy - 12, 2, 15);
  }
  return h;
}

function drawChat() {
  const C = view.chat;
  fillRounded(C.x, C.y, C.w, view.board.h - C.y * 2, 16, P.paper);
  strokeRounded(C.x, C.y, C.w, view.board.h - C.y * 2, 16, P.line, 1.5);

  const x = C.x + C.pad;
  const maxW = C.w - C.pad * 2;
  let y = C.y + C.pad;

  y += bubble(x, y, maxW, meta.customer, { label: meta.name }) + C.gap;

  const youText = state.you.full.slice(0, state.you.shown);
  if (youText || state.phase !== 'build') {
    y += bubble(x, y, maxW, youText || ' ', {
      mine: true, label: meta.youLabel, caret: state.you.typing,
    }) + C.gap;
  } else {
    /* nothing sent yet: the reply as it is being assembled */
    const tone = state.choice.tone && option('tone', state.choice.tone);
    const action = state.choice.action && option('action', state.choice.action);
    const draft = `${tone ? tone.line : ui.emptyTone} ${action ? action.line : ui.emptyAction}`;
    ctx.save();
    ctx.globalAlpha = tone || action ? 0.78 : 0.5;
    y += bubble(x, y, maxW, draft, { mine: true, label: meta.draftLabel }) + C.gap;
    ctx.restore();
  }

  const herText = state.her.full.slice(0, state.her.shown);
  if (herText) {
    bubble(x, y, maxW, herText, { label: meta.name, caret: state.her.typing });
  }
}

function draw(now) {
  const { s, ox, oy } = place();
  tickFace(now);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = P.wall;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  drawShopBack();
  drawCustomer(now);
  drawCounter();
  drawChat();
  ctx.restore();
}

function frame(nowMs) {
  pumpWaits(nowMs);
  draw(nowMs);
  requestAnimationFrame(frame);
}

/* ============================================================
   The clock — waits and typing ride the animation loop
   ============================================================ */
const pending = [];
function wait(ms) {
  return new Promise((resolve) => { pending.push({ at: performance.now() + ms, resolve }); });
}
function pumpWaits(nowMs) {
  for (let i = pending.length - 1; i >= 0; i--) {
    if (nowMs >= pending[i].at) pending.splice(i, 1)[0].resolve();
  }
}

/** Types `speech` out to the end of its `full` text over `ms`. */
function type(speech, ms, run) {
  const from = speech.shown;
  const to = speech.full.length;
  const t0 = performance.now();
  speech.typing = true;
  return new Promise((resolve) => {
    const step = () => {
      if (run !== state.run) { speech.typing = false; return resolve(); }
      const p = ms > 0 ? clamp((performance.now() - t0) / ms) : 1;
      speech.shown = Math.round(lerp(from, to, p));
      if (p < 1) { requestAnimationFrame(step); return; }
      speech.shown = to;
      speech.typing = false;
      resolve();
    };
    step();
  });
}

/* ============================================================
   Building and sending
   ============================================================ */
function choose(partId, optionId) {
  if (state.phase !== 'build') return;
  state.choice[partId] = optionId;
  render();
}

async function send() {
  if (state.phase !== 'build') return;
  const tone = state.choice.tone && option('tone', state.choice.tone);
  const action = state.choice.action && option('action', state.choice.action);
  if (!tone || !action) return;

  const run = state.run;
  state.phase = 'sending';
  state.stage = 'none';
  state.you = { full: tone.line, shown: 0, typing: true };
  state.her = { full: '', shown: 0, typing: false };
  render();

  /* 1 — the tone lands on its own */
  await type(state.you, timing.typeToneMs, run);
  if (run !== state.run) return;
  setFace(tone.face);
  state.stage = 'tone';
  render();
  await wait(timing.readToneMs);
  if (run !== state.run) return;

  /* 2 — then she hears what you are actually going to do */
  state.you.full = `${tone.line} ${action.line}`;
  await type(state.you, timing.typeActionMs, run);
  if (run !== state.run) return;
  setFace(blendFace(tone, action));
  state.stage = 'full';
  render();
  await wait(timing.readActionMs);
  if (run !== state.run) return;

  /* 3 — and answers */
  state.her = { full: reply(tone.score, action.score), shown: 0, typing: true };
  await type(state.her, timing.replyTypeMs, run);
  if (run !== state.run) return;

  state.phase = 'sent';
  state.tried.add(`${tone.id}+${action.id}`);
  triedEl.textContent = `${ui.triedLabel}: ${state.tried.size}/${COMBOS}`;
  bridge.complete({
    passed: tone.score === 2 && action.score === 2,
    score: (tone.score + action.score) / 4,
    detail: { tone: tone.id, action: action.id, tried: state.tried.size },
  });
  render();
}

function again() {
  state.run += 1;
  state.phase = 'build';
  state.stage = 'none';
  state.you = { full: '', shown: 0, typing: false };
  state.her = { full: '', shown: 0, typing: false };
  setFace(startFace);
  render();
}

function restart() {
  document.querySelector('.scrim')?.remove();
  state.choice = {};
  state.tried = new Set();
  triedEl.textContent = `${ui.triedLabel}: 0/${COMBOS}`;
  again();
  bridge.restart();
}

/* ============================================================
   The builder along the bottom
   ============================================================ */
function markWord(score) {
  return score === 2 ? ui.markStrong : score === 1 ? ui.markPartly : ui.markMisses;
}

function render() {
  const tone = state.choice.tone && option('tone', state.choice.tone);
  const action = state.choice.action && option('action', state.choice.action);

  if (state.phase === 'sent') {
    bottomEl.replaceChildren(el('div.builder', {}, [
      el('div.verdict-line', {}, verdict(tone.score, action.score)),
      el('div.marks', {}, [
        el(`div.mark.s${tone.score}`, {}, [
          el('div.top', {}, [
            el('span.k', {}, `Tone: ${tone.label}`),
            el('span.m', {}, markWord(tone.score)),
          ]),
          el('p', {}, tone.feedback),
        ]),
        el(`div.mark.s${action.score}`, {}, [
          el('div.top', {}, [
            el('span.k', {}, `Action: ${action.label}`),
            el('span.m', {}, markWord(action.score)),
          ]),
          el('p', {}, action.feedback),
        ]),
      ]),
      el('div.foot', {}, [
        el('div.say', {}, tone.score === 2 && action.score === 2 ? ui.bestHint : ui.moreHint),
        el('button.btn.primary', { type: 'button', onClick: () => again() }, ui.againBtn),
      ]),
    ]));
    regionDirty = true;
    return;
  }

  const sending = state.phase === 'sending';
  const rows = parts.map((p) => el('div.row', {}, [
    el('div.name', {}, [el('span', { style: 'display:block;font-size:10.5px;letter-spacing:.08em' }, p.label), el('span', {}, p.prompt)]),
    el('div.chips', {}, p.options.map((o) => el('button.chip', {
      type: 'button',
      'aria-pressed': String(state.choice[p.id] === o.id),
      disabled: sending ? true : null,
      onClick: () => choose(p.id, o.id),
    }, o.label))),
  ]));

  const say = sending
    ? (state.stage === 'tone' ? midRead[tone.score] : ui.sending)
    : tone && action ? ui.ready : tone ? ui.pickAction : ui.pickBoth;

  bottomEl.replaceChildren(el('div.builder', {}, [
    ...rows,
    el('div.foot', {}, [
      el('div.say', {}, `${say}  ·  ${ui.combos(COMBOS)}`),
      el('button.btn.primary', {
        type: 'button',
        disabled: tone && action && !sending ? null : true,
        onClick: () => send(),
      }, ui.sendBtn),
    ]),
  ]));
  regionDirty = true;
}

/* ============================================================
   Start
   ============================================================ */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const triedEl = document.getElementById('tried');
triedEl.textContent = `${ui.triedLabel}: 0/${COMBOS}`;
document.getElementById('restart').addEventListener('click', () => { restart(); });

resizeCanvas();
requestAnimationFrame(frame);
render();

window.__build = { state, face, choose, send, again, restart, option };

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
