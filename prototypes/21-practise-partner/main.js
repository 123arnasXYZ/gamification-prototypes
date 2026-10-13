/* ============================================================
   21 — Give learners someone to practise with

   An office one-to-one, drawn flat in 2D. Two circular avatars face
   each other across the frame: yours on the left in the house blue,
   Rae's on the right in a warm clay. Rae talks — her words arrive a
   few at a time in a bubble beside her — and the learner has exactly
   one control at a time. The whole decision is *when* they use it.
   There is no list of replies anywhere, because the skill being
   practised is listening and timing, not sentence picking.

   A ring around Rae's avatar fills while she is still talking, turns
   mint through the pause she leaves, then goes amber once the silence
   has outstayed its welcome. Pressing "Your turn":

     while the ring is filling     -> she is cut off and closes up
     while the ring is mint        -> she feels heard and goes further
     after the ring has gone amber -> she fills the silence defensively

   "Let her keep going" is the second control, and it is the right
   call on some turns and a dead silence on others — content.js
   decides which per turn.

   Posture is the feedback. The avatars lean in, sit back, fold their
   shoulders in and dim slightly as she closes up, and both of them
   breathe so neither looks switched off. Yours leans in for a beat
   whenever you take your turn.

   Which moment you are in is also said in words, not left to the
   ring: a live status line sits directly above the two buttons, and
   the "Your turn" button is dressed inert / live / running-out-of-room
   with a sub-label to match. Neither button is ever disabled and
   nothing is marked right while the turn is running — a press at the
   wrong moment has to stay possible, because feeling that is the
   point of having someone to practise with.

   Three turns, then a description of how it went. Nothing is scored
   and nothing is marked right. "Run that moment again" replays the
   same three turns and keeps what happened last time, because a
   practice partner is the thing you can get wrong twice.

   No Three.js and no WebGL: one <canvas>, one 2D context. The scene
   is composed in the fixed design space given by view.board and
   scaled as a single piece into whatever room the overlay leaves it,
   so the proportions hold at any window size.
   ============================================================ */

import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, palette as P, looks, view, timing, turns, endings, ending,
} from './content.js';

const bridge = createBridge('practise-partner');

const TAU = Math.PI * 2;
const font = (weight, size, style = '') => `${style} ${weight} ${size}px ${view.fontFamily}`.trim();
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/* ============================================================
   Canvas

   One canvas, sized in device pixels for the screen it is on and
   re-measured whenever the frame changes shape.
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

/* ---------- where the scene goes ----------
   The overlay owns the edges of the frame: the topbar above, the talk
   panel below. The scene takes what is left between them, and the
   whole composition scales to fit it. */
const topbarEl = document.getElementById('topbar');
const talkEl = document.getElementById('talk');

let region = { x: 0, y: 0, w: view.board.w, h: view.board.h };
let regionDirty = true;
let placed = { s: 1, ox: 0, oy: 0 };

function measureRegion() {
  regionDirty = false;
  const pad = 12;
  const top = topbarEl.getBoundingClientRect();
  const talk = talkEl.getBoundingClientRect();
  const y = top.bottom + pad;
  region = {
    x: 16,
    y,
    w: Math.max(view.minRegion.w, cssW - 32),
    h: Math.max(view.minRegion.h, talk.top - pad - y),
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
new ResizeObserver(() => { regionDirty = true; }).observe(talkEl);
window.addEventListener('resize', resizeCanvas);
document.fonts?.ready?.then(() => { regionDirty = true; });

/* ============================================================
   What is on the canvas right now

   The animation writes into these; nothing in the draw code has to
   know about the conversation being played out.
   ============================================================ */
const speech = { full: '', text: '', kind: 'line', cut: false, shown: 0, typing: false };
const ring = { frac: 0, shownFrac: 0, colour: P.warm, on: false };

/* Posture: `now` eases toward `want` every frame. */
const pose = {
  them: { now: { ...view.postures.listening }, want: { ...view.postures.listening }, seed: 0.0, nod: 0 },
  you: { now: { ...view.postures.listening }, want: { ...view.postures.listening }, seed: 2.1, nod: 0 },
};
const POSE_FIELDS = ['lean', 'rise', 'tuck', 'tilt', 'dim'];

function setPosture(who, name) {
  Object.assign(pose[who].want, view.postures[name] ?? view.postures.listening);
}

let nodUntil = 0;

/* ============================================================
   Drawing

   Flat shapes only: solid fills, thin lines, no gradients and no
   fake lighting. Everything below the transform works in the board's
   own coordinate space.
   ============================================================ */
function rounded(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

function fillRounded(x, y, w, h, r, colour) {
  if (w <= 0 || h <= 0) return;
  rounded(x, y, w, h, r);
  ctx.fillStyle = colour;
  ctx.fill();
}

function disc(x, y, r, colour) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = colour;
  ctx.fill();
}

function ellipse(x, y, rx, ry, colour) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
  ctx.fillStyle = colour;
  ctx.fill();
}

function write(str, x, y, { size = 13, weight = 700, colour = P.ink, align = 'left', style = '' } = {}) {
  ctx.font = font(weight, size, style);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colour;
  ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

/** Break a string onto at most `max` lines that each fit `width`. */
function wrapLines(str, width, size, weight, style, max) {
  ctx.font = font(weight, size, style);
  const words = String(str).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
      if (lines.length === max) { line = ''; break; }
    } else {
      line = next;
    }
  }
  if (line && lines.length < max) lines.push(line);
  return lines;
}

/** A small white pill with a label, used for the two names and the ring's tag. */
function pill(cx, cy, text, colour, { size = 12.5, dot = null } = {}) {
  ctx.font = font(800, size);
  const tw = ctx.measureText(text).width;
  const extra = dot ? 18 : 0;
  const w = tw + 26 + extra;
  const h = size + 13;
  rounded(cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = P.paper;
  ctx.fill();
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  if (dot) {
    disc(cx - w / 2 + 14, cy, 5, dot);
    write(text, cx - w / 2 + 25, cy + size * 0.36, { size, weight: 800, colour });
  } else {
    write(text, cx, cy + size * 0.36, { size, weight: 800, colour, align: 'center' });
  }
}

/* ---------- the room ---------- */
function drawRoom(s, oy) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = P.wall;
  ctx.fillRect(0, 0, cssW, cssH);
  const floorTop = oy + view.floorY * s;
  if (floorTop < cssH) {
    ctx.fillStyle = P.floor;
    ctx.fillRect(0, floorTop, cssW, cssH - floorTop);
  }
}

/* ---------- one avatar ----------
   A circular tint with a faceless flat figure inside it: shoulders,
   neck, head and a hair shape, clipped to the circle, with a thin
   ring border around the outside. `face` is +1 for the figure on the
   left and -1 for the one on the right, so "lean" is always toward
   the other person. */
function drawAvatar({ cx, cy, r, pillY, shadeY, pillSize }, look, p, name, face, t, talking) {
  const b = view.breath;
  const breath = Math.sin(t * (talking ? b.talkRate : b.rate) + p.seed);
  const now = p.now;

  // A soft contact shadow, so the avatar sits on the floor
  ellipse(cx, shadeY, r * 1.08, r * 0.14, P.shade);

  ctx.save();
  ctx.globalAlpha = 1 - now.dim;

  disc(cx, cy, r, look.disc);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();

  ctx.translate(
    cx + (now.lean + p.nod) * r * face,
    cy + now.rise * r + breath * b.rise * (r / b.refR),
  );

  // Everything above the hips swings about a low pivot, so a lean
  // tips the body and leaves the seated half planted.
  ctx.translate(0, r * 0.9);
  ctx.rotate(now.tilt * face);
  ctx.translate(0, -r * 0.9);

  const widthK = (1 - now.tuck * 0.22) * (1 + breath * b.width);
  const hunch = now.tuck * r * 0.07;

  // shoulders
  ellipse(0, r * 0.94 + hunch, r * 0.98 * widthK, r * 0.66, look.top);
  // a darker seam where the arms fold in, which is what makes a
  // closed posture read from across the room
  if (now.tuck > 0.02) {
    ctx.globalAlpha = (1 - now.dim) * Math.min(1, now.tuck);
    ellipse(0, r * 1.18 + hunch, r * 0.74 * widthK, r * 0.3, look.topDark);
    ctx.globalAlpha = 1 - now.dim;
  }

  // neck
  fillRounded(-r * 0.17, r * 0.16 + hunch * 0.5, r * 0.34, r * 0.42, r * 0.1, look.skin);

  // hair behind the head
  if (look.hairStyle === 'bob') {
    ellipse(0, -r * 0.06 + hunch * 0.4, r * 0.52, r * 0.56, look.hair);
  } else {
    ellipse(0, -r * 0.12 + hunch * 0.4, r * 0.44, r * 0.45, look.hair);
  }

  // head
  const hy = -r * 0.2 + hunch * 0.4;
  disc(0, hy, r * 0.42, look.skin);

  // hair on top: the upper half of a slightly larger disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, hy, r * 0.445, Math.PI, TAU);
  ctx.closePath();
  ctx.fillStyle = look.hair;
  ctx.fill();
  ctx.restore();

  ctx.restore();   // clip

  // the avatar's own border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore();   // alpha

  pill(cx, pillY, name, look.pill, { size: pillSize });
}

/* ---------- the "still talking" ring ----------
   It is in the scene rather than in the panel on purpose: the learner
   should be watching her, not reading a meter. It is hers, and it is
   tagged as hers — the words for which moment you are in live in the
   status line above the buttons, where they cannot be missed. */
function drawRing(t) {
  const { cx, cy } = view.them;
  const { r, width, tagY, tagSize } = view.ring;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.strokeStyle = P.line;
  ctx.lineWidth = width;
  ctx.stroke();

  const f = ring.shownFrac;
  if (f > 0.004) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, f));
    ctx.strokeStyle = ring.colour;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  pill(cx, tagY, meta.ringLabel, P.warmInk, {
    size: tagSize, dot: ring.on ? ring.colour : P.line2,
  });
}

/** Types the current line out over `ms`, on the frame clock so a
    throttled tab cannot leave her halfway through a sentence. */
function type(ms, run) {
  const total = speech.full.length;
  const t0 = performance.now();
  return new Promise((resolve) => {
    const step = () => {
      if (run !== state.run) return resolve();
      const e = performance.now() - t0;
      revealTo((e / ms) * total);
      if (e >= ms) { revealTo(total); return resolve(); }
      requestAnimationFrame(step);
    };
    step();
  });
}

/* ---------- her speech bubble ---------- */
function drawBubble() {
  if (!speech.text && !speech.cut) return;
  const b = view.bubble;

  // tail, pointing at her
  ctx.beginPath();
  ctx.moveTo(b.x + b.w - 2, b.tailY - b.tailH / 2);
  ctx.lineTo(b.x + b.w - 2, b.tailY + b.tailH / 2);
  ctx.lineTo(b.x + b.w + b.tailW, b.tailY);
  ctx.closePath();
  ctx.fillStyle = P.paper;
  ctx.fill();

  rounded(b.x, b.y, b.w, b.h, b.radius);
  ctx.fillStyle = P.paper;
  ctx.fill();
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Her own words upright; what she says back to you in italics.
  const italic = speech.kind === 'reply' ? 'italic' : '';
  const weight = 600;
  const inner = b.w - b.pad * 2;
  const lines = wrapLines(shownText(), inner, b.size, weight, italic, b.maxLines);

  let lastX = b.x + b.pad;
  let lastY = b.y + b.pad + b.size;
  lines.forEach((line, i) => {
    const y = b.y + b.pad + b.size + i * b.lineHeight;
    const w = write(line, b.x + b.pad, y, {
      size: b.size, weight, colour: P.ink, style: italic,
    });
    lastX = b.x + b.pad + w;
    lastY = y;
  });

  // The caret sits at the end of what has been typed so far, blinking
  // only once she has stopped, so a still frame never looks frozen.
  if (speech.typing && !speech.cut) {
    const blink = speech.shown >= speech.full.length
      ? Math.sin((performance.now() / timing.caretBlinkMs) * Math.PI) > 0
      : true;
    if (blink) {
      ctx.fillStyle = P.ink;
      ctx.fillRect(lastX + 2, lastY - b.size * view.caretHeight + 2, view.caretWidth, b.size * view.caretHeight);
    }
  }

  // Cut off mid-sentence: the line stops where you stopped it.
  if (speech.cut) {
    write(meta.cutMark, lastX + 4, lastY, { size: b.size + 2, weight: 900, colour: P.danger });
  }
}

/** Her words, as far as they have been typed. */
function shownText() {
  return speech.full.slice(0, Math.max(0, speech.shown));
}

/* ---------- the frame ---------- */
function draw(t) {
  const { s, ox, oy } = place();
  drawRoom(s, oy);
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);

  drawRing(t);
  drawBubble();
  drawAvatar(view.you, looks.you, pose.you, meta.youName, +1, t, false);
  drawAvatar(view.them, looks.them, pose.them, meta.themName, -1, t, state.phase === 'speaking');
}

/* ============================================================
   The clock

   Everything is driven off one requestAnimationFrame loop and
   performance.now(), including the waits between turns, so nothing
   depends on a setTimeout being delivered on schedule.
   ============================================================ */
let lastT = performance.now();

function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - lastT) / 1000);
  lastT = nowMs;
  const t = nowMs / 1000;

  // posture easing
  for (const key of ['them', 'you']) {
    const p = pose[key];
    const k = Math.min(1, dt * view.poseEase);
    for (const f of POSE_FIELDS) p.now[f] += (p.want[f] - p.now[f]) * k;
  }
  /* You lean in for a beat after taking your turn. Kept out of `now`
     so the easing above never accumulates it. */
  pose.you.nod = nowMs < nodUntil
    ? 0.075 * Math.sin(((nodUntil - nowMs) / timing.nodMs) * Math.PI)
    : 0;

  // the ring, and the phase it implies
  if (live && !live.settled) {
    const e = nowMs - live.t0;
    const d = live.turn;
    ring.on = true;
    revealTo((e / d.speakMs) * speech.full.length);

    if (e < d.speakMs) {
      setPhase('speaking');
      ring.frac = Math.min(1, e / d.speakMs);
      ring.colour = P.warm;
    } else if (e < d.speakMs + d.pauseMs) {
      setPhase('window');
      ring.frac = 1 - (e - d.speakMs) / d.pauseMs;
      ring.colour = P.mint;
    } else {
      setPhase('overrun');
      ring.frac = 0.06 + Math.abs(Math.sin(t * 5.5)) * 0.08;
      ring.colour = P.amber;
      if (e >= d.speakMs + d.pauseMs + d.lateMs) settle('late');
    }
  } else {
    ring.on = false;
    ring.frac = 0;
    ring.colour = P.warm;
  }
  ring.shownFrac += (ring.frac - ring.shownFrac) * Math.min(1, dt * timing.ringEase);

  pumpWaits(nowMs);
  draw(t);
  requestAnimationFrame(frame);
}

/* Waits ride the animation loop rather than setTimeout. */
const pending = [];
function wait(ms) {
  return new Promise((resolve) => {
    pending.push({ at: performance.now() + ms, resolve });
  });
}
function pumpWaits(nowMs) {
  for (let i = pending.length - 1; i >= 0; i--) {
    if (nowMs >= pending[i].at) pending.splice(i, 1)[0].resolve();
  }
}

/* ============================================================
   UI
   ============================================================ */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
document.getElementById('foot').textContent = meta.hint;

const howtoEl = document.getElementById('howto');
const cueEl = document.getElementById('cue');
const cueTextEl = document.getElementById('cueText');
const speakBtn = document.getElementById('speak');
const speakSubEl = document.getElementById('speakSub');
const quietBtn = document.getElementById('quiet');
const restartBtn = document.getElementById('restart');

speakBtn.textContent = meta.speakLabel;
quietBtn.textContent = meta.quietLabel;
restartBtn.textContent = meta.restartLabel;
howtoEl.append(el('b', {}, meta.howToTitle), document.createTextNode(meta.howTo));
document.getElementById('quietSub').textContent = meta.quietSub;

// Blurred after a press, or the button keeps the focus and the space
// bar would belong to it rather than to the page for the rest of the run.
speakBtn.addEventListener('click', () => { speakBtn.blur(); takeTurn(); });
quietBtn.addEventListener('click', () => { quietBtn.blur(); stayQuiet(); });
restartBtn.addEventListener('click', () => { restart(); });

// The space bar is the same control. Ignored while a button has focus,
// or the button would fire as well and take the turn twice.
window.addEventListener('keydown', (ev) => {
  if (ev.code !== 'Space' && ev.key !== ' ') return;
  if (ev.target instanceof HTMLButtonElement) return;
  ev.preventDefault();
  takeTurn();
});

const stats = statBar(document.getElementById('stats'), [
  { id: 'turn', label: meta.turnLabel, value: 1, max: turns.length },
  { id: 'attempt', label: meta.attemptLabel, value: 1 },
]);

/* ============================================================
   State
   ============================================================ */
const state = {
  turn: 0,
  attempt: 1,
  phase: 'idle',       // idle | intro | speaking | window | overrun | reacting | done
  openness: 50,        // 0..100, never shown as a number
  outcome: null,       // the kind the last settled turn produced
  turns: [],           // { turn, kind, ms, open } per turn taken
  history: [],         // one entry per finished attempt
  run: 0,
};

/* `live` exists only while she is talking or the pause is running:
   the one window in which either control does anything. `live_ms` is
   how far into her line the window was closed, kept for the record.
   `cycle` is the current turn, so the two controls can be awaited. */
let live = null;
let live_ms = 0;
let cycle = Promise.resolve(null);

resizeCanvas();
requestAnimationFrame(frame);

window.__practise = { state, speakAt, stayQuiet, again, restart };

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart(true);

/* ============================================================
   The conversation
   ============================================================ */
async function play() {
  const run = state.run;
  state.phase = 'idle';          // so the intro dressing re-applies
  setPhase('intro');
  speech.text = '';
  speech.cut = false;
  setPosture('them', 'listening');
  setPosture('you', 'listening');
  await wait(timing.introMs);
  if (run !== state.run) return;

  for (const turn of turns) {
    state.turn = turn.n;
    stats.set('turn', turn.n);
    cycle = oneTurn(turn, run);
    const kind = await cycle;
    if (run !== state.run || kind === null) return;
  }
  finish();
}

/** One turn: she speaks, you decide when, she reacts. */
async function oneTurn(turn, run) {
  const kind = await listen(turn);
  if (run !== state.run || !kind) return null;

  const o = turn.outcomes[kind];
  state.outcome = kind;
  state.openness = clamp(state.openness + o.open);
  state.turns.push({ turn: turn.n, kind, ms: Math.round(live_ms), open: o.open });
  bridge.progress(turn.n / turns.length, { kind, openness: state.openness });

  setPosture('them', o.posture);
  setPhase('reacting');
  await wait(timing.reactMs);
  if (run !== state.run) return null;

  speech.kind = 'reply';
  speech.cut = false;
  speech.full = o.reply;
  speech.shown = -1;
  revealTo(0);
  await type(o.reply.length * timing.replyPerCharMs, run);
  if (run !== state.run) return null;
  await wait(Math.min(timing.replyMaxMs, timing.replyBaseMs + o.reply.length * timing.replyPerChar));
  if (run !== state.run) return null;

  return kind;
}

/** Opens the window. Resolves with the timing the learner chose. */
function listen(turn) {
  return new Promise((resolve) => {
    speech.kind = 'line';
    speech.cut = false;
    speech.full = turn.line;
    speech.shown = -1;
    revealTo(0);
    setPosture('them', 'listening');
    setPosture('you', 'listening');
    live = { turn, t0: performance.now(), settled: false, resolve };
    setControls(true);
    setPhase('speaking');
  });
}

/* Dropped mid-turn by a restart. The run counter has already moved on,
   so the turn that was waiting resolves and then bails out instead of
   hanging on a promise nobody will ever settle. */
function cancelLive() {
  if (live && !live.settled) {
    live.settled = true;
    const resolve = live.resolve;
    live = null;
    resolve(null);
  }
  live = null;
  setControls(false);
}

/** Close the window with a given timing and let the turn run on. */
function settle(kind) {
  if (!live || live.settled) return null;
  live.settled = true;
  live_ms = performance.now() - live.t0;
  const resolve = live.resolve;
  const cut = kind === 'early';
  live = null;
  setControls(false);
  if (cut) speech.cut = true;
  resolve(kind);
  return kind;
}

/* ---------------- The two controls ---------------- */
/** Press it now. Where "now" falls is the whole decision. */
function takeTurn() {
  if (!live || live.settled) return cycle;
  const e = performance.now() - live.t0;
  const d = live.turn;
  const kind = e < d.speakMs ? 'early' : e < d.speakMs + d.pauseMs ? 'heard' : 'late';
  nodUntil = performance.now() + timing.nodMs;
  setPosture('you', 'in');
  settle(kind);
  return cycle;
}

/** Say nothing and let her carry on. Sometimes that is the move. */
function stayQuiet() {
  if (!live || live.settled) return cycle;
  setPosture('you', 'listening');
  settle('quiet');
  return cycle;
}

/**
 * Debug: take your turn a given number of milliseconds into her line.
 * Waits for that point in the clock, then presses — a target already
 * gone by presses straight away, so speakAt(0) is simply "now".
 * Awaitable: it resolves once she has reacted and the next line runs.
 */
async function speakAt(ms = 0) {
  if (!live || live.settled) return cycle;
  const target = live.t0 + ms;
  while (live && !live.settled && performance.now() < target) {
    await wait(Math.min(30, Math.max(4, target - performance.now())));
  }
  if (!live || live.settled) return cycle;
  return takeTurn();
}

/* ============================================================
   The ending — a description, never a mark
   ============================================================ */
function finish() {
  setPhase('done');
  setControls(false);
  setPosture('them', 'listening');
  setPosture('you', 'listening');

  const taken = state.turns.map((r) => ({ ...r, spec: turns[r.turn - 1].outcomes[r.kind] }));
  const gained = taken.filter((r) => r.spec.gained).map((r) => r.spec.gained);
  const unsaid = taken.filter((r) => r.spec.unsaid).map((r) => r.spec.unsaid);

  // The turn that moved her the furthest, either way
  const pivot = taken.reduce((best, r) => (Math.abs(r.open) > Math.abs(best.open) ? r : best), taken[0]);
  const band = endings.find((b) => state.openness >= b.min) ?? endings[endings.length - 1];
  const prev = state.history[state.history.length - 1];

  bridge.complete({
    passed: true,
    score: state.openness / 100,
    detail: {
      attempt: state.attempt,
      openness: state.openness,
      turns: state.turns.map((r) => ({ turn: r.turn, kind: r.kind, ms: r.ms })),
    },
  });

  const points = [
    `<b>${ending.recapTitle}</b>`,
    ...taken.map((r) => `<b class="${r.open > 0 ? 'ok' : 'no'}">${meta.turnLabel} ${r.turn}</b> — ${r.spec.recap}`),
    gained.length ? ending.heardSome.replace('{list}', list(gained)) : ending.heardNone,
    unsaid.length ? ending.unsaidSome.replace('{list}', list(unsaid)) : ending.unsaidNone,
    (pivot.open > 0 ? ending.turningGood : ending.turningCost).replace('{n}', String(pivot.turn)),
    attemptLine(prev),
    ending.point,
  ];

  state.history.push({ attempt: state.attempt, openness: state.openness, turns: [...state.turns] });

  showResult({
    passed: true,
    title: band.title,
    summary: band.summary,
    points,
    actions: [
      { label: meta.closeLabel, kind: 'ghost' },
      { label: meta.againLabel, kind: 'primary', onClick: () => again() },
    ],
  });
}

function attemptLine(prev) {
  if (!prev) return ending.attemptFirst;
  const line = state.openness > prev.openness + 6 ? ending.attemptBetter
    : state.openness < prev.openness - 6 ? ending.attemptWorse
      : ending.attemptSame;
  return line.replace('{prev}', String(prev.attempt));
}

function list(items) {
  const parts = items.map((s) => `<b>${s}</b>`);
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/* ============================================================
   Running it again
   ============================================================ */
/** The same three turns, with the last run still on the record. */
function again() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  state.attempt += 1;
  state.turns = [];
  state.openness = 50;
  state.turn = 0;
  state.outcome = null;
  cancelLive();
  resetRing();
  stats.set('attempt', state.attempt);
  stats.set('turn', 1);
  toast(meta.againToast.replace('{n}', String(state.attempt)), '', 2800);
  bridge.restart();
  return play();
}

/** Back to the start, with nothing remembered. */
function restart(silent = false) {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, {
    turn: 0, attempt: 1, openness: 50, outcome: null, turns: [], history: [],
  });
  cancelLive();
  resetRing();
  pose.them.now = { ...view.postures.listening };
  pose.you.now = { ...view.postures.listening };
  stats.set('attempt', 1);
  stats.set('turn', 1);
  if (!silent) toast(meta.restartToast, '', 2600);
  bridge.restart();
  return play();
}

function resetRing() {
  ring.frac = 0;
  ring.shownFrac = 0;
  ring.on = false;
  speech.text = '';
  speech.cut = false;
}

/* ============================================================
   Panel plumbing
   ============================================================ */
/** Her words arrive a character at a time, and no further. */
function revealTo(n) {
  const capped = Math.max(0, Math.min(speech.full.length, Math.round(n)));
  if (capped === speech.shown) return;
  speech.shown = capped;
  speech.text = shownText();
  speech.typing = capped < speech.full.length;
}

/* The live status, and the dressing on the "Your turn" button, for
   each moment of a turn. `tone` is shared by the status line, the
   button and the button's sub-label, so all three say the same thing:

     wait  she is mid-sentence           inert
     open  the pause, she has stopped    live
     over  the silence has outstayed     running out of room

   A declaration, not a const: the first phase is set during module
   start-up, before this section of the file has been evaluated. */
function statusFor(phase) {
  /* Each turn carries its own read on how she is leaving the sentence —
     still building, or finished and handed over. That read is the thing
     the choice actually turns on, so it rides with the status line. */
  const turn = turns[state.turn - 1];
  const cue = (key) => (turn && turn[key] ? ` ${turn[key]}` : '');

  switch (phase) {
    case 'intro': return [meta.introStatus, '', meta.speakSubWaiting];
    case 'speaking': return [meta.speakingStatus + cue('cueSpeaking'), 'wait', meta.speakSubSpeaking];
    case 'window': return [meta.windowStatus + cue('cueWindow'), 'open', turn?.speakSubWindow ?? meta.speakSubWindow];
    case 'overrun': return [meta.overrunStatus, 'over', meta.speakSubOverrun];
    case 'reacting': return [meta.reactingStatus, '', meta.speakSubWaiting];
    case 'done': return [meta.doneStatus, '', meta.speakSubWaiting];
    default: return ['', '', meta.speakSubWaiting];
  }
}

function setPhase(phase) {
  if (state.phase === phase) return;
  state.phase = phase;

  const [text, tone, sub] = statusFor(phase);
  cueTextEl.textContent = text;
  cueEl.className = 'cue' + (tone ? ' ' + tone : '');

  /* Dressed, never disabled. A press at the wrong moment has to stay
     possible — that is the whole thing being practised. */
  speakBtn.className = 'btn primary big clickable' + (tone ? ' ' + tone : ' wait');
  speakSubEl.textContent = sub;
  speakSubEl.className = 'sub' + (tone === 'open' || tone === 'over' ? ' ' + tone : '');

  // The "how this works" note is for before the first word is spoken
  howtoEl.classList.toggle('gone', phase !== 'intro' && phase !== 'idle');
  regionDirty = true;
}

/* There is nothing to lock: the two controls do nothing outside the
   window by themselves. This only keeps the dressing honest between
   turns, when neither press would land anywhere. */
function setControls(on) {
  if (!on) {
    speakBtn.className = 'btn primary big clickable wait';
    speakSubEl.textContent = meta.speakSubWaiting;
    speakSubEl.className = 'sub';
  }
}
