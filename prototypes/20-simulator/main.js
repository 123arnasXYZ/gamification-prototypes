/* ============================================================
   20 — Let learners experiment with a simulator

   A service desk week, modelled properly enough to be worth poking.
   Three dials sit on the desk as − / + blocks: how many people are
   on, how many minutes they spend per ticket, how many overtime
   hours get booked. Four outputs move while the week runs: the queue
   of ticket blocks, the "came back" pile, the cost meter with the
   budget line on it and the staff strain bar.

   Nothing is multiple choice. The learner sets the dials, presses
   "Run the week", and five simulated days play out in a few seconds.
   Cause and effect is visible but not instant: rushed work generates
   returns that land two days later, so Monday's shortcut shows up on
   Wednesday's queue.

   Three goals in order — clear the week, clear it without overtime,
   clear it with the rework pile under ten on the same budget. Each
   one is won by experimenting. Nothing is ever marked wrong; the
   desk just does what the dials tell it to.

   Drawn flat, in 2D: one <canvas>, one 2D context, no WebGL. The
   board is composed in the fixed design space given by view.board
   and scaled as a single piece into whatever room the overlay leaves
   it, so the proportions hold at any window size.
   ============================================================ */

import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, days, controls, outputs, budgetLine, challenges, report, runToast, ending,
  model, view, bands, timing,
} from './content.js';

const bridge = createBridge('simulator');

/* The shared palette. Fills are the brand colours; the -ink pair are
   the darker versions that survive as text on white. */
const C = {
  blue: '#2757e2',
  mint: '#5fe0b0',
  amber: '#e0a32a',
  red: '#e0234e',
  ink: '#10131A',
  dim: '#4B5162',
  line: '#E4E7EF',
  paper: '#FFFFFF',
  board: '#E7EBF1',
  soft: '#F4F6FA',
  off: '#9AA3B0',
  mintInk: '#12A177',
  amberInk: '#A8761A',
};

const FAMILY = 'Urbanist, "Segoe UI", system-ui, -apple-system, sans-serif';
const font = (weight, size) => `${weight} ${size}px ${FAMILY}`;

const COST_REF = Math.round(model.budget * view.costHeadroom);

/* ============================================================
   The model
   ============================================================ */
const returnRate = (minutes) => minutes >= model.thoroughAt
  ? model.returnFloor
  : model.returnFloor + (model.thoroughAt - minutes) * model.returnSlope;

/**
 * Run the whole week for a set of dials and return every frame of it.
 * Pure: no drawing, no state, so the debug hook and the animation read
 * the same numbers.
 */
function simulate({ people, minutes, overtime }) {
  const perDayMinutes = people * (model.dayMinutes + (overtime * 60) / model.days);
  const capacity = Math.floor(perDayMinutes / minutes);
  const rate = returnRate(minutes);
  const costPerDay = people * model.dayRate + (people * overtime * model.otRate) / model.days;

  // Returns are posted into the day they come back on, which can be
  // after Friday — those land on the pile but never reach the queue.
  const landing = new Array(model.days + model.returnDelay + 1).fill(0);
  const frames = [];
  let queue = 0;
  let returnsLanded = 0;
  let peakStrain = 0;
  let peakQueue = 0;

  for (let d = 0; d < model.days; d++) {
    const back = landing[d];
    returnsLanded += back;
    queue += model.arrivals[d] + back;
    const queuePeak = queue;

    const closed = Math.min(queue, capacity);
    queue -= closed;
    landing[d + model.returnDelay] += Math.round(closed * rate);

    // Load is measured against a normal day, so booked overtime pushes
    // it past 1 — which is exactly what strain should notice.
    const load = (closed * minutes) / (people * model.dayMinutes);
    const backlog = Math.min(1, queue / (people * 12));
    const strain = clamp(100 * (load * 0.72 + backlog * 0.2 + (overtime / 10) * 0.22), 0, 100);

    peakStrain = Math.max(peakStrain, strain);
    peakQueue = Math.max(peakQueue, queuePeak);

    frames.push({
      day: d, arrived: model.arrivals[d], back, queuePeak, closed,
      queueEnd: queue, returnsLanded, strain,
      cost: Math.round(costPerDay * (d + 1)),
    });
  }

  const tail = landing.slice(model.days).reduce((a, b) => a + b, 0);
  return {
    controls: { people, minutes, overtime },
    frames,
    capacity,
    cleared: queue === 0,
    leftOver: queue,
    returnsTotal: returnsLanded + tail,
    tail,
    peakStrain: Math.round(peakStrain),
    peakQueue,
    cost: people * model.days * model.dayRate + people * overtime * model.otRate,
  };
}

/** Which of the challenge's conditions this run did not meet. */
function judge(sim, challenge) {
  const misses = [];
  if (!sim.cleared) misses.push('notCleared');
  if (challenge.rules.noOvertime && sim.controls.overtime > 0) misses.push('overtimeUsed');
  if (challenge.rules.maxReturns != null && sim.returnsTotal >= challenge.rules.maxReturns) misses.push('tooManyReturns');
  if (sim.cost > model.budget) misses.push('overBudget');
  return { ok: misses.length === 0, misses };
}

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
  invalidate();
}

/* ============================================================
   Where the board goes

   The overlay owns the edges of the frame: the topbar above, the
   hint below, the challenge rail down the right. The board takes
   what is left, and the whole composition scales to fit it.
   ============================================================ */
const colEl = document.getElementById('col');
const topbarEl = document.getElementById('topbar');
const dockEl = document.getElementById('dock');
const briefPanel = document.getElementById('brief');

let region = { x: 0, y: 0, w: view.board.w, h: view.board.h };
let regionDirty = true;
let placed = { s: 1, ox: 0, oy: 0 };

const railHidden = () => briefPanel.style.visibility === 'hidden';

function measureRegion() {
  regionDirty = false;
  const pad = 12;
  const col = colEl.getBoundingClientRect();
  const top = topbarEl.getBoundingClientRect();
  const dock = dockEl.getBoundingClientRect();
  const y = top.bottom + pad;
  region = {
    x: col.left,
    y,
    w: Math.max(160, railHidden() ? cssW - 16 - col.left : col.width),
    h: Math.max(160, dock.top - pad - y),
  };
}

function place() {
  if (regionDirty) measureRegion();
  const s = Math.min(region.w / view.board.w, region.h / view.board.h, 1.3);
  placed = {
    s,
    ox: region.x + (region.w - view.board.w * s) / 2,
    oy: region.y + (region.h - view.board.h * s) / 2,
  };
  return placed;
}

new ResizeObserver(() => resizeCanvas()).observe(stageEl);
new ResizeObserver(() => { regionDirty = true; invalidate(); }).observe(colEl);
window.addEventListener('resize', resizeCanvas);
document.fonts?.ready?.then(() => invalidate());

/* ============================================================
   What is on the board right now

   `shown` is what the drawing reads: the animation writes into it
   frame by frame, so nothing in the draw code has to know about the
   week being played out.
   ============================================================ */
const shown = {
  queue: 0,
  returns: 0,
  cost: 0,
  strain: 0,
  day: meta.idleDay,
  dayColour: C.dim,
};

const press = new Map();   // 'people:-1' -> 0..1, how far that block is pushed
const hits = [];           // rebuilt every draw, in board coordinates

let frameQueued = false;
function invalidate() {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(draw);
}

/* ============================================================
   Drawing

   Flat shapes only: solid fills, 1px lines, no gradients and no
   fake lighting. Everything below works in the board's own
   coordinate space.
   ============================================================ */
function draw() {
  frameQueued = false;
  const { s, ox, oy } = place();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.board;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  hits.length = 0;

  const W = view.board.w;
  drawDayPill(W / 2, 0);

  const gap = 16;
  const colW = (W - gap) / 2;
  const tileH = 172;
  drawQueueTile(0, 62, colW, tileH);
  drawReturnsTile(colW + gap, 62, colW, tileH);
  drawCostTile(0, 250, colW, tileH);
  drawStrainTile(colW + gap, 250, colW, tileH);

  const dialGap = 14;
  const dialW = (W - dialGap * 2) / 3;
  controls.forEach((def, i) => drawDial(def, i * (dialW + dialGap), 440, dialW, 120));
}

/* ---------- shape and text primitives ---------- */
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

function cardShape(x, y, w, h, r = 14) {
  rounded(x, y, w, h, r);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.25;
  ctx.stroke();
}

function write(str, x, y, { size = 13, weight = 700, colour = C.ink, align = 'left' } = {}) {
  ctx.font = font(weight, size);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colour;
  ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

/** Break a string onto at most `max` lines that each fit `width`. */
function wrap(str, width, size, max = 2) {
  ctx.font = font(600, size);
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
      if (lines.length === max) break;
    } else {
      line = next;
    }
  }
  if (lines.length < max && line) lines.push(line);
  return lines;
}

/* ---------- the day the week is on ---------- */
function drawDayPill(cx, y) {
  const h = 46;
  ctx.font = font(800, 22);
  const w = Math.max(240, ctx.measureText(shown.day).width + 64);
  cardShape(cx - w / 2, y, w, h, h / 2);
  write(shown.day, cx, y + h / 2 + 8, { size: 22, weight: 800, colour: shown.dayColour, align: 'center' });
}

/* ---------- tile chrome ---------- */
/**
 * A white card with the output's name on the left and its current
 * number on the right. Returns the rectangle the drawing goes in.
 */
function tile(x, y, w, h, { label, value, colour, tail = '' }) {
  cardShape(x, y, w, h);
  write(label.toUpperCase(), x + 16, y + 27, { size: 11.5, weight: 700, colour: C.dim });

  let right = x + w - 16;
  if (tail) {
    const tw = write(tail, right, y + 34, { size: 14, weight: 700, colour: C.dim, align: 'right' });
    right -= tw + 5;
  }
  write(value, right, y + 34, { size: 30, weight: 900, colour, align: 'right' });

  return { x: x + 16, y: y + 48, w: w - 32, h: h - 62 };
}

/* ---------- the queue ---------- */
function drawQueueTile(x, y, w, h) {
  const n = Math.round(shown.queue);
  const a = tile(x, y, w, h, {
    label: outputs.queue.name,
    value: String(n),
    colour: n === 0 ? C.mintInk : n > bands.queueHigh ? C.red : C.amberInk,
  });

  const { cols, rows, perBlock } = view.queue;
  const gap = 5;
  const cw = (a.w - gap * (cols - 1)) / cols;
  const ch = (a.h - gap * (rows - 1)) / rows;
  const lit = n <= 0 ? 0 : Math.min(cols * rows, Math.ceil(n / perBlock));

  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols;
    const row = rows - 1 - Math.floor(i / cols);   // fills from the bottom up
    const bx = a.x + col * (cw + gap);
    const by = a.y + row * (ch + gap);
    if (i < lit) {
      fillRounded(bx, by, cw, ch, 4, C.blue);
    } else {
      fillRounded(bx, by, cw, ch, 4, C.soft);
      rounded(bx, by, cw, ch, 4);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

/* ---------- the "came back" pile ---------- */
function drawReturnsTile(x, y, w, h) {
  const n = Math.round(shown.returns);
  const a = tile(x, y, w, h, {
    label: outputs.returns.name,
    value: String(n),
    colour: n === 0 ? C.mintInk : n < bands.returnsWarn ? C.amberInk : C.red,
  });

  const { cols, levels, perBlock } = view.returns;
  const gx = 10;
  const gy = 5;
  const cw = (a.w - gx * (cols - 1)) / cols;
  const ch = (a.h - gy * (levels - 1)) / levels;
  const lit = n <= 0 ? 0 : Math.min(cols * levels, Math.ceil(n / perBlock));

  for (let i = 0; i < cols * levels; i++) {
    const col = i % cols;
    const level = levels - 1 - Math.floor(i / cols);   // stacks upward
    const bx = a.x + col * (cw + gx);
    const by = a.y + level * (ch + gy);
    if (i < lit) {
      fillRounded(bx, by, cw, ch, 4, C.amber);
    } else {
      fillRounded(bx, by, cw, ch, 4, C.soft);
      rounded(bx, by, cw, ch, 4);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

/* ---------- the two meters ---------- */
/** The empty track both meters are drawn in. */
function track(a) {
  const t = { x: a.x, y: a.y + 18, w: a.w, h: 30 };
  fillRounded(t.x, t.y, t.w, t.h, 8, C.soft);
  rounded(t.x, t.y, t.w, t.h, 8);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  return t;
}

function drawCostTile(x, y, w, h) {
  const c = Math.round(shown.cost);
  const over = c > model.budget;
  const a = tile(x, y, w, h, {
    label: outputs.cost.name,
    value: money(c),
    colour: over ? C.red : C.blue,
  });

  const t = track(a);
  fillRounded(t.x, t.y, t.w * clamp(c / COST_REF, 0, 1), t.h, 8, over ? C.red : C.blue);

  // The budget line, marked on the meter the way the limit lines are
  // marked everywhere else in this set.
  const bx = t.x + t.w * clamp(model.budget / COST_REF, 0, 1);
  ctx.fillStyle = C.amber;
  ctx.fillRect(bx - 1.5, t.y - 9, 3, t.h + 18);
  const label = `${budgetLine} ${money(model.budget)}`;
  ctx.font = font(700, 12);
  const half = ctx.measureText(label).width / 2;
  const lx = clamp(bx, t.x + half, t.x + t.w - half);
  write(label, lx, t.y + t.h + 30, { size: 12, weight: 700, colour: C.amberInk, align: 'center' });
}

function drawStrainTile(x, y, w, h) {
  const s = Math.round(shown.strain);
  const colour = s < bands.strainCalm ? C.mint : s < bands.strainHot ? C.amber : C.red;
  const a = tile(x, y, w, h, {
    label: outputs.strain.name,
    value: String(s),
    tail: outputs.strain.unit,
    colour: s < bands.strainCalm ? C.mintInk : s < bands.strainHot ? C.amberInk : C.red,
  });

  const t = track(a);

  // The bands sit behind the bar, so the thresholds are visible long
  // before the bar reaches them.
  ctx.save();
  rounded(t.x, t.y, t.w, t.h, 8);
  ctx.clip();
  const segs = [
    [0, bands.strainCalm, C.mint],
    [bands.strainCalm, bands.strainHot, C.amber],
    [bands.strainHot, 100, C.red],
  ];
  ctx.globalAlpha = 0.22;
  for (const [from, to, fill] of segs) {
    ctx.fillStyle = fill;
    ctx.fillRect(t.x + t.w * (from / 100), t.y, t.w * ((to - from) / 100), t.h);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.paper;
  for (const edge of [bands.strainCalm, bands.strainHot]) {
    ctx.fillRect(t.x + t.w * (edge / 100) - 1, t.y, 2, t.h);
  }
  ctx.restore();

  fillRounded(t.x, t.y, t.w * clamp(s / 100, 0, 1), t.h, 8, colour);
}

/* ---------- the three dials ---------- */
function drawDial(def, x, y, w, h) {
  cardShape(x, y, w, h);
  write(def.name.toUpperCase(), x + 14, y + 23, { size: 11.5, weight: 700, colour: C.dim });

  const v = state.controls[def.id];
  const size = 44;
  const by = y + 32;
  button(def, -1, x + 14, by, size, v > def.min);
  button(def, +1, x + w - 14 - size, by, size, v < def.max);

  const unit = def.unit ? ` ${def.unit}` : '';
  write(`${v}${unit}`, x + w / 2, by + size / 2 + 10, {
    size: 26, weight: 900, colour: C.blue, align: 'center',
  });

  wrap(def.note, w - 28, 10.5).forEach((line, i) => {
    write(line, x + 14, y + 94 + i * 13, { size: 10.5, weight: 600, colour: C.dim });
  });
}

/** One − or + block, with a generous hit area around it. */
function button(def, dir, x, y, size, enabled) {
  const key = `${def.id}:${dir}`;
  const push = press.get(key) || 0;
  const inset = push * 2.5;
  const bx = x + inset;
  const by = y + inset;
  const bs = size - inset * 2;

  fillRounded(bx, by, bs, bs, 11, enabled ? C.blue : C.off);

  const bar = bs * 0.42;
  const thick = Math.max(2.5, bs * 0.1);
  ctx.fillStyle = C.paper;
  ctx.fillRect(bx + (bs - bar) / 2, by + (bs - thick) / 2, bar, thick);
  if (dir > 0) ctx.fillRect(bx + (bs - thick) / 2, by + (bs - bar) / 2, thick, bar);

  hits.push({
    x: x - 6, y: y - 6, w: size + 12, h: size + 12,
    control: def.id, dir, enabled,
  });
}

/* ---------- pointer ---------- */
function toBoard(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left - placed.ox) / placed.s,
    y: (ev.clientY - r.top - placed.oy) / placed.s,
  };
}

function hitAt(p) {
  return hits.find((t) => p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h) || null;
}

canvas.addEventListener('pointerdown', (ev) => {
  const t = hitAt(toBoard(ev));
  if (!t || !t.enabled) return;
  step(t.control, t.dir);
});

canvas.addEventListener('pointermove', (ev) => {
  const t = hitAt(toBoard(ev));
  const want = t && t.enabled && !state.busy && !state.over ? 'pointer' : 'default';
  if (canvas.style.cursor !== want) canvas.style.cursor = want;
});

/* ============================================================
   UI
   ============================================================ */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const hintNode = document.getElementById('hint');
const stats = statBar(document.getElementById('stats'), [
  { id: 'challenge', label: meta.challengeLabel, value: 1, max: challenges.length },
  { id: 'runs', label: meta.runsLabel, value: 0 },
]);
document.getElementById('restart').addEventListener('click', () => { restart(); });

/* ============================================================
   State

   `controls` is what the dials read now. `last` is the summary of the
   most recent run, `runs` counts runs per challenge, `cleared` marks
   which goals have been met. `token` invalidates an animation that is
   still in flight when the learner restarts.
   ============================================================ */
const state = {
  controls: Object.fromEntries(controls.map((c) => [c.id, c.start])),
  challenge: 0,
  runs: challenges.map(() => 0),
  cleared: challenges.map(() => false),
  last: null,
  busy: false,
  over: false,
  token: 0,
};

resizeCanvas();
if (new URLSearchParams(location.search).has('debug')) {
  window.__sim = { state, set, run, next, finish, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Actions
   ============================================================ */

/** Nudge one dial by one step. Driven by the − / + blocks on the desk. */
function step(id, dir) {
  const def = controls.find((c) => c.id === id);
  if (!def) return;
  return set(id, state.controls[id] + def.step * dir);
}

/** Set a dial. Clamped to its range and snapped to its step. */
async function set(id, value) {
  const def = controls.find((c) => c.id === id);
  if (!def || state.busy || state.over) return;
  const steps = Math.round((Number(value) - def.min) / def.step);
  const target = clamp(def.min + steps * def.step, def.min, def.max);
  const dir = Math.sign(Number(value) - state.controls[id]) || 1;
  if (target !== state.controls[id]) {
    state.controls[id] = target;
    invalidate();
    renderBrief();
  }
  await nudge(id, dir);
}

/** Press the block that was just clicked, so the click feels physical. */
async function nudge(id, dir) {
  const key = `${id}:${dir < 0 ? -1 : 1}`;
  await tween({
    ms: timing.press, easing: ease.outCubic,
    onUpdate: (_, e) => { press.set(key, Math.sin(e * Math.PI)); invalidate(); },
  });
  press.set(key, 0);
  invalidate();
}

/** Run five days and watch them land. Resolves when the week is over. */
async function run() {
  if (state.busy || state.over) return;
  const token = state.token;
  const challenge = challenges[state.challenge];

  state.busy = true;
  state.runs[state.challenge] += 1;
  stats.set('runs', state.runs[state.challenge]);
  hintNode.textContent = meta.hintRunning;
  renderBrief();

  const sim = simulate(state.controls);
  await playWeek(sim, token);
  if (token !== state.token) return;

  const verdict = judge(sim, challenge);
  state.last = { sim, verdict };
  if (verdict.ok) state.cleared[state.challenge] = true;
  state.busy = false;
  hintNode.textContent = meta.hint;

  toast(
    verdict.ok ? runToast.challengeMet : firstMissToast(verdict.misses, sim),
    verdict.ok ? 'good' : '',
    3400,
  );
  renderBrief();
  bridge.progress(state.cleared.filter(Boolean).length / challenges.length, {
    challenge: challenge.id,
    runs: state.runs[state.challenge],
    cleared: verdict.ok,
    controls: { ...state.controls },
  });
}

/** Move on to the next goal, or wrap up if that was the last one. */
async function next() {
  if (state.busy || state.over) return;
  if (state.challenge >= challenges.length - 1) return finish();
  state.challenge += 1;
  state.last = null;
  stats.set('challenge', state.challenge + 1);
  stats.set('runs', state.runs[state.challenge]);
  resetOutputs();
  renderBrief();
}

async function restart() {
  document.querySelector('.scrim')?.remove();
  state.token += 1;
  state.controls = Object.fromEntries(controls.map((c) => [c.id, c.start]));
  state.challenge = 0;
  state.runs = challenges.map(() => 0);
  state.cleared = challenges.map(() => false);
  state.last = null;
  state.busy = false;
  state.over = false;

  stats.set('challenge', 1);
  stats.set('runs', 0);
  hintNode.textContent = meta.hint;
  briefPanel.style.visibility = '';
  regionDirty = true;
  resetOutputs();
  renderBrief();
  bridge.restart();
}

function resetOutputs() {
  shown.queue = 0;
  shown.returns = 0;
  shown.cost = 0;
  shown.strain = 0;
  shown.day = meta.idleDay;
  shown.dayColour = C.dim;
  invalidate();
}

/* ============================================================
   Playing the week out
   ============================================================ */
function setDay(text, colour = C.blue) {
  shown.day = text;
  shown.dayColour = colour;
  invalidate();
}

async function playWeek(sim, token) {
  resetOutputs();

  for (const f of sim.frames) {
    setDay(days[f.day]);

    // Morning: the day's post arrives, and so does anything that came
    // back from a rushed day earlier in the week.
    const qFrom = shown.queue;
    const rFrom = shown.returns;
    await tween({
      ms: timing.arrive, easing: ease.outCubic,
      onUpdate: (_, e) => {
        if (token !== state.token) return;   // restarted mid-week
        shown.queue = qFrom + (f.queuePeak - qFrom) * e;
        shown.returns = rFrom + (f.returnsLanded - rFrom) * e;
        invalidate();
      },
    });
    if (token !== state.token) return;
    shown.queue = f.queuePeak;
    shown.returns = f.returnsLanded;

    // The rest of the day: the desk works through what it can, and the
    // money and the people both move while it does.
    const cFrom = shown.cost;
    const sFrom = shown.strain;
    await tween({
      ms: timing.work, easing: ease.inOutCubic,
      onUpdate: (_, e) => {
        if (token !== state.token) return;
        shown.queue = f.queuePeak + (f.queueEnd - f.queuePeak) * e;
        shown.cost = cFrom + (f.cost - cFrom) * e;
        shown.strain = sFrom + (f.strain - sFrom) * e;
        invalidate();
      },
    });
    if (token !== state.token) return;
    shown.queue = f.queueEnd;
    shown.cost = f.cost;
    shown.strain = f.strain;
    invalidate();

    await wait(timing.settle);
    if (token !== state.token) return;
  }

  // The tail: work closed on Thursday and Friday comes back after the
  // week is over. It never reaches this queue, but it is still rework.
  if (sim.tail > 0) {
    const rFrom = shown.returns;
    await tween({
      ms: timing.tail, easing: ease.outCubic,
      onUpdate: (_, e) => {
        if (token !== state.token) return;
        shown.returns = rFrom + (sim.returnsTotal - rFrom) * e;
        invalidate();
      },
    });
    if (token !== state.token) return;
    shown.returns = sim.returnsTotal;
  }

  setDay(meta.weekDone, sim.cleared ? C.mintInk : C.amberInk);
  shown.queue = sim.leftOver;
  invalidate();
  await wait(timing.hold);
}

/* ============================================================
   Panels
   ============================================================ */
function renderBrief() {
  if (state.over) return;
  const ch = challenges[state.challenge];
  const met = state.cleared[state.challenge];
  const runs = state.runs[state.challenge];

  briefPanel.replaceChildren(el('div.brief', {}, [
    el('div.eyebrow', {}, fill(meta.challengeCounter, { n: state.challenge + 1, total: challenges.length })),
    el('h2', {}, fill(ch.title, { maxReturns: ch.rules.maxReturns, budget: money(model.budget) })),
    el('p.line', {}, fill(ch.line, { maxReturns: ch.rules.maxReturns, budget: money(model.budget) })),
    el('ul.goals', {}, ch.goals.map((g) => el('li', {}, fill(g, {
      maxReturns: ch.rules.maxReturns, budget: money(model.budget),
    })))),
    state.last ? el('div.said' + (state.last.verdict.ok ? '.met' : ''), {}, [
      el('div.eyebrow', {}, fill(meta.runCounter, { n: runs })),
      el('p', { html: runLines(state.last).join(' ') }),
    ]) : null,
    el('div.row', {}, [
      el('div.grow', {}, runs === 0 ? meta.firstRun : fill(meta.runCounter, { n: runs })),
      el('button.btn.ghost', { type: 'button', disabled: state.busy || null, onClick: () => finish() }, meta.finishButton),
      met ? el('button.btn.primary', {
        type: 'button',
        disabled: state.busy || null,
        onClick: () => next(),
      }, state.challenge === challenges.length - 1 ? meta.lastChallengeButton : meta.nextButton) : null,
      el('button.btn' + (met ? '' : '.primary'), {
        type: 'button',
        disabled: state.busy || null,
        onClick: () => run(),
      }, state.busy ? meta.runningButton : runs === 0 ? meta.runButton : meta.runAgainButton),
    ]),
  ]));
}

/** The facts of the last run, in order, as neutral sentences. */
function runLines({ sim }) {
  const lines = [];
  lines.push(sim.cleared ? report.cleared
    : sim.leftOver === 1 ? report.leftOverOne
    : fill(report.leftOver, { n: sim.leftOver }));

  lines.push(sim.returnsTotal === 0 ? report.returnsNone
    : sim.returnsTotal === 1 ? report.returnsOne
    : fill(report.returnsSome, { n: sim.returnsTotal }));
  if (sim.tail > 0) lines.push(fill(report.tail, { n: sim.tail }));

  lines.push(fill(report.cost, { cost: `<b>${money(sim.cost)}</b>` }));
  lines.push(sim.cost > model.budget
    ? fill(report.overBudget, { over: money(sim.cost - model.budget) })
    : fill(report.underBudget, { under: money(model.budget - sim.cost) }));

  lines.push(fill(report.strain, { n: sim.peakStrain }));
  lines.push(sim.controls.overtime > 0
    ? fill(report.overtimeBooked, { n: sim.controls.overtime })
    : report.overtimeNone);
  return lines;
}

/** One line for the toast: the first condition the week did not meet. */
function firstMissToast(misses, sim) {
  const first = misses[0];
  if (first === 'notCleared') return runToast.notCleared;
  if (first === 'overtimeUsed') return runToast.overtimeUsed;
  if (first === 'tooManyReturns') return fill(runToast.tooManyReturns, { n: sim.returnsTotal });
  if (first === 'overBudget') return runToast.overBudget;
  return runToast.cleared;
}

/* ============================================================
   Ending
   ============================================================ */
async function finish() {
  if (state.over) return;
  state.over = true;
  state.busy = false;
  const clearedCount = state.cleared.filter(Boolean).length;
  const all = clearedCount === challenges.length;

  bridge.complete({
    passed: all,
    score: clearedCount / challenges.length,
    detail: {
      cleared: [...state.cleared],
      runs: [...state.runs],
      totalRuns: state.runs.reduce((a, b) => a + b, 0),
      controls: { ...state.controls },
    },
  });

  const points = [];
  for (let i = 0; i < challenges.length; i++) {
    const n = state.runs[i];
    const word = n === 1 ? ending.run : ending.runs;
    const tail = state.cleared[i] ? fill(ending.runsCleared, { n, word })
      : n === 0 ? ending.runsNone
      : fill(ending.runsOpen, { n, word });
    points.push(fill(ending.runsLine, {
      title: fill(challenges[i].title, { maxReturns: challenges[i].rules.maxReturns, budget: money(model.budget) }),
      runs: tail,
    }));
  }
  points.push(fill(ending.settled, {
    people: state.controls.people,
    minutes: state.controls.minutes,
    overtime: state.controls.overtime,
  }));
  points.push(...ending.found);
  points.push(ending.point);

  briefPanel.replaceChildren();
  briefPanel.style.visibility = 'hidden';
  regionDirty = true;
  invalidate();
  showResult({
    passed: all,
    title: all ? ending.title : ending.titlePartial,
    summary: all ? ending.summaryAll
      : fill(ending.summarySome, { n: clearedCount, total: challenges.length }),
    points,
    actions: [
      { label: ending.close, kind: 'ghost' },
      { label: ending.again, kind: 'primary', onClick: () => restart() },
    ],
  });
}

/* ============================================================
   Helpers
   ============================================================ */
function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }

const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/** Drive a value from 0 to 1 over `ms`, one step per animation frame. */
function tween({ ms, easing = ease.outCubic, onUpdate }) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const stepFrame = (now) => {
      const p = ms > 0 ? Math.min(1, (now - t0) / ms) : 1;
      onUpdate(p, easing(p));
      if (p < 1) requestAnimationFrame(stepFrame);
      else resolve();
    };
    requestAnimationFrame(stepFrame);
  });
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (values[k] != null ? String(values[k]) : m));
}

function money(n) {
  return fill(meta.money, { n: Math.round(n).toLocaleString('en-GB') });
}
