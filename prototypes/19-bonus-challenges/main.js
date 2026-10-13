/* ============================================================
   19 — Add bonus challenges

   The base activity is a planning puzzle: tomorrow, three meetings
   that cannot move, and seven jobs that add up to exactly the time
   left between them. Place them and run the day. That is all it is,
   and it is over in a minute.

   Six challenges run over the top of it at the same time. They are
   judged against the plan itself, live, so the board on the right
   shows you trading one for another while you build — and because
   the free time is exactly as long as the list, some of them cannot
   both be true. The same day, the same list, a different thing to
   chase.

   No Three.js and no WebGL: one <canvas>, one 2D context. The board
   is composed in the fixed design space given by view.board and
   scaled as a single piece into whatever room the overlay leaves
   it. Every wait rides the animation loop, so a throttled tab
   cannot strand the day halfway through.
   ============================================================ */

import { el, toast, showResult, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, day, meetings, tasks, baseline, challenges, ui, beats, result,
  palette as P, view, timing,
} from './content.js';

const bridge = createBridge('bonus-challenges');

/* Hoisted on purpose: these run while the module is still starting
   up, and a const arrow would not exist yet. */
function font(weight, size, style = '') {
  return `${style} ${weight} ${size}px ${view.fontFamily}`.trim();
}
function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function taskById(id) { return tasks.find((t) => t.id === id); }
function slotLabel(s) {
  const mins = day.startHour * 60 + s * day.slotMinutes;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
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
  const side = getComputedStyle(uiEl).flexDirection === 'row';
  region = side
    ? { x: 16, y, w: Math.max(view.minRegion.w, bot.left - pad - 16), h: Math.max(view.minRegion.h, cssH - 16 - y) }
    : { x: 16, y, w: Math.max(view.minRegion.w, cssW - 32), h: Math.max(view.minRegion.h, bot.top - pad - y) };
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

   `plan` is the whole thing being judged: a start slot per task.
   Everything else on screen is derived from it.
   ============================================================ */
const state = {
  plan: {},          // taskId -> start slot
  picked: null,      // task currently in hand
  phase: 'build',    // build | running | done
  clock: 0,          // slots elapsed while the day runs
  beat: null,
  revealed: new Set(),
  met: new Set(),
  banked: new Set(),   // caught on an earlier plan — these do not reset
  runs: 0,             // plans run so far
  run: 0,
};

/* ---------- the plan, as the challenges read it ---------- */
function planView() {
  const busy = new Array(day.slots).fill(null);
  for (const m of meetings) for (let i = 0; i < m.slots; i++) busy[m.from + i] = m.id;
  for (const [id, from] of Object.entries(state.plan)) {
    const t = taskById(id);
    for (let i = 0; i < t.slots; i++) busy[from + i] = id;
  }
  const placedIds = Object.keys(state.plan);
  return {
    busy,
    placed: (id) => state.plan[id] !== undefined,
    start: (id) => state.plan[id],
    end: (id) => (state.plan[id] === undefined ? Infinity : state.plan[id] + taskById(id).slots),
    isFree: (s) => busy[s] === null,
    placedCount: placedIds.length,
    unplaced: tasks.filter((t) => state.plan[t.id] === undefined),
  };
}

/** Every challenge, with where it has got to. Recomputed on every
    change, which is the point: the board is live. */
function scoreboard() {
  const p = planView();
  /* A challenge can only hold on a day that actually runs. Without
     this an empty plan would start with half the board green — every
     gap is free when nothing has been placed yet. */
  const runnable = runnablePlan(p);
  const started = p.placedCount > 0;    // an untouched board shows nothing
  const rows = challenges.map((c) => {
    const would = started && c.test(p); // the plan as it stands would earn it
    const met = runnable && would;      // ...and the day can actually be run
    /* On an untouched board nothing has been worked towards yet —
       counting free gaps as progress would show a full bar before a
       single job had been placed. */
    const [done, need] = c.progress ? c.progress(p) : [would ? 1 : 0, 1];
    const shownDone = started ? done : 0;
    const banked = state.banked.has(c.id);
    return { c, met, would, banked, done: shownDone, raw: done, need };
  });

  /* A hidden challenge shows itself when the plan gets close to it —
     and, however the plans have gone, once it is the last one on the
     board. Nothing stays hidden after everything else is caught. */
  const caught = (r) => r.met || r.banked;
  return rows.map((r, i) => {
    const onlyLeft = !caught(r) && rows.every((o, j) => j === i || caught(o));
    const shown = !r.c.hidden || caught(r) || onlyLeft
      || (runnable && r.raw >= (r.c.revealAt ?? r.need));
    return { ...r, onlyLeft, shown };
  });
}

/** Can the plan be run at all? The plain activity, nothing more. */
function runnablePlan(p) {
  return tasks.every((t) => !t.must || p.placed(t.id));
}

/* The proposal deadline is deliberately not a gate. A day with the
   proposal still half-written at 14:00 runs perfectly well — it just
   runs badly, and the learner watches that happen. */
function readiness() {
  const p = planView();
  const missing = tasks.filter((t) => t.must && !p.placed(t.id));
  if (missing.length) return { ok: false, why: baseline.missingMusts(missing.map((t) => t.short)) };
  if (p.end('proposal') > baseline.proposalBy) return { ok: true, warn: true, why: baseline.proposalLate };
  return { ok: true, why: baseline.ready };
}

/* ============================================================
   Placing things
   ============================================================ */
function fits(id, from) {
  const t = taskById(id);
  if (from < 0 || from + t.slots > day.slots) return 'past';
  const p = planView();
  for (let i = 0; i < t.slots; i++) if (!p.isFree(from + i)) return 'busy';
  return 'ok';
}

function pick(id) {
  if (state.phase !== 'build') return;
  if (state.plan[id] !== undefined) delete state.plan[id];
  state.picked = state.picked === id ? null : id;
  changed();
}

function drop(from) {
  const id = state.picked;
  if (!id || state.phase !== 'build') return;
  const verdict = fits(id, from);
  if (verdict === 'past') { toast(ui.pastEnd, 'warn'); return; }
  if (verdict === 'busy') { toast(ui.noRoom, 'warn'); return; }
  state.plan[id] = from;
  state.picked = null;
  state.dropped = { id, at: performance.now() };
  changed();
}

/** Anything that moves the plan comes through here, so the live
    board and the nudges stay in step with it. */
function changed() {
  const board = scoreboard();
  for (const row of board) {
    if (row.shown && row.c.hidden && !state.revealed.has(row.c.id)) {
      state.revealed.add(row.c.id);
      if (row.onlyLeft) toast(ui.lastLeft(row.c.name), 'good');
      else if (!row.met && !row.banked && row.c.nudge) toast(row.c.nudge, 'good');
    }
    if (row.met && !state.met.has(row.c.id)) {
      state.met.add(row.c.id);
      toast(`${row.c.name} — ${ui.onTrack.toLowerCase()}.`, 'good');
    }
    if (!row.met) state.met.delete(row.c.id);
  }
  bridge.progress(planView().placedCount / tasks.length, { earned: board.filter((r) => r.met).length });
  render();
}

/* ============================================================
   Shape and text primitives
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
function strokeRounded(x, y, w, h, r, colour, width = 1.5) {
  if (w <= 0 || h <= 0) return;
  rounded(x, y, w, h, r);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}
function write(str, x, y, { size = 13, weight = 700, colour = P.ink, align = 'left', style = '' } = {}) {
  ctx.font = font(weight, size, style);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colour;
  ctx.fillText(str, x, y);
}
function widthOf(str, size, weight, style = '') {
  ctx.font = font(weight, size, style);
  return ctx.measureText(str).width;
}
/** The same, clipped to a width with an ellipsis rather than squashed. */
function writeFit(str, x, y, max, opts = {}) {
  ctx.font = font(opts.weight ?? 700, opts.size ?? 13, opts.style ?? '');
  let s = String(str);
  if (ctx.measureText(s).width > max) {
    while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
    s = `${s}…`;
  }
  write(s, x, y, opts);
}
function tick(cx, cy, size, colour, width) {
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.52, cy + size * 0.04);
  ctx.lineTo(cx - size * 0.14, cy + size * 0.42);
  ctx.lineTo(cx + size * 0.54, cy - size * 0.38);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
}
function panel(x, y, w, h, r = 14) {
  fillRounded(x, y, w, h, r, P.paper);
  strokeRounded(x, y, w, h, r, P.line, 1.5);
}
function colourOf(t) {
  if (t.deep) return [P.deep, P.deepInk];
  if (t.waiting) return [P.wait, P.waitInk];
  return [P.plain, P.plainInk];
}

/* ============================================================
   Hit regions — rebuilt every frame, tested back to front
   ============================================================ */
let hits = [];
function hit(x, y, w, h, kind, id) { hits.push({ x, y, w, h, kind, id }); }

function boardPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left - placed.ox) / placed.s,
    y: (ev.clientY - r.top - placed.oy) / placed.s,
  };
}

canvas.addEventListener('pointerdown', (ev) => {
  if (state.phase !== 'build') return;
  const pt = boardPoint(ev);
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (pt.x < h.x || pt.x > h.x + h.w || pt.y < h.y || pt.y > h.y + h.h) continue;
    if (h.kind === 'task' || h.kind === 'block') pick(h.id);
    else if (h.kind === 'slot') drop(h.id);
    return;
  }
});
canvas.addEventListener('pointermove', (ev) => {
  const pt = boardPoint(ev);
  let over = null;
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (pt.x < h.x || pt.x > h.x + h.w || pt.y < h.y || pt.y > h.y + h.h) continue;
    over = h;
    break;
  }
  hover = over && state.phase === 'build' ? over : null;
  canvas.style.cursor = hover ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => { hover = null; });
let hover = null;

/* ============================================================
   Drawing
   ============================================================ */
function drawTray() {
  const T = view.tray;
  panel(T.x, T.y, T.w, view.board.h - T.y * 2);
  write(meta.trayLabel.toUpperCase(), T.x + 16, T.y + 27, { size: 10.5, weight: 800, colour: P.faint });

  tasks.forEach((t, i) => {
    const y = T.y + T.top + i * (T.cardH + T.gap);
    const x = T.x + 11;
    const w = T.w - 22;
    const isPlaced = state.plan[t.id] !== undefined;
    const isPicked = state.picked === t.id;
    const [tint, ink] = colourOf(t);

    fillRounded(x, y, w, T.cardH, 11, isPlaced ? P.soft : tint);
    if (isPicked) strokeRounded(x, y, w, T.cardH, 11, P.dropEdge, 2);
    else if (hover?.kind === 'task' && hover.id === t.id) strokeRounded(x, y, w, T.cardH, 11, P.line, 2);

    const dim = isPlaced ? P.faint : ink;
    writeFit(t.name, x + 12, y + 21, w - 24, { size: 12.5, weight: 800, colour: isPlaced ? P.faint : P.ink });
    write(ui.duration(t.slots), x + 12, y + 38, { size: 11, weight: 700, colour: dim });

    if (isPlaced) {
      write(slotLabel(state.plan[t.id]), x + w - 12, y + 38, { size: 11, weight: 800, colour: P.mintInk, align: 'right' });
    } else if (t.must) {
      write('MUST', x + w - 12, y + 38, { size: 9.5, weight: 800, colour: ink, align: 'right' });
    }

    hit(x, y, w, T.cardH, 'task', t.id);
  });
}

function drawGrid(now) {
  const G = view.grid;
  panel(G.x, G.y, G.w, view.board.h - G.y * 2);
  write(meta.dayLabel.toUpperCase(), G.x + 16, G.y + 27, { size: 10.5, weight: 800, colour: P.faint });

  const colX = G.x + G.labelW;
  const colW = G.w - G.labelW - 14;
  const topY = G.y + G.top;
  const p = planView();
  const canDrop = state.picked && state.phase === 'build';

  /* empty slots, hour labels, and the places the held job would go */
  for (let s = 0; s < day.slots; s++) {
    const y = topY + s * G.slotH;
    const free = p.isFree(s);
    const ok = canDrop && fits(state.picked, s) === 'ok';
    fillRounded(colX, y + 1, colW, G.slotH - 2, 5, ok ? P.drop : free ? P.slotFree : P.slot);
    if (ok) strokeRounded(colX, y + 1, colW, G.slotH - 2, 5, P.dropEdge, 1);
    else if (free) strokeRounded(colX, y + 1, colW, G.slotH - 2, 5, P.line, 1);

    if (s % 2 === 0) write(slotLabel(s), G.x + 14, y + 15, { size: 10.5, weight: 800, colour: P.faint });
    if (free) hit(colX, y, colW, G.slotH, 'slot', s);
  }

  if (canDrop && hover?.kind === 'slot' && fits(state.picked, hover.id) === 'ok') {
    const t = taskById(state.picked);
    const y = topY + hover.id * G.slotH;
    const [tint, ink] = colourOf(t);
    ctx.save();
    ctx.globalAlpha = 0.55;
    fillRounded(colX + 2, y + 2, colW - 4, t.slots * G.slotH - 3, 7, tint);
    strokeRounded(colX + 2, y + 2, colW - 4, t.slots * G.slotH - 3, 7, ink, 1.5);
    writeFit(`${t.short}  ${slotLabel(hover.id)}–${slotLabel(hover.id + t.slots)}`,
      colX + 13, y + (t.slots > 1 ? 18 : 15), colW - 26, { size: 11, weight: 800, colour: ink });
    ctx.restore();
  }

  /* the three meetings */
  for (const m of meetings) {
    const y = topY + m.from * G.slotH;
    const h = m.slots * G.slotH - 3;
    fillRounded(colX + 2, y + 2, colW - 4, h, 7, P.meeting);
    ctx.save();
    ctx.beginPath();
    ctx.rect(colX + 2, y + 2, 3.5, h);
    ctx.fillStyle = m.client ? P.blue : P.meetingInk;
    ctx.fill();
    ctx.restore();
    writeFit(m.name, colX + 14, y + (m.slots > 1 ? 18 : 15), colW - 28, { size: 11.5, weight: 800, colour: P.meetingInk });
    if (m.slots > 1) {
      write(`${slotLabel(m.from)}–${slotLabel(m.from + m.slots)}`, colX + 14, y + 32,
        { size: 10, weight: 700, colour: P.faint });
    }
  }

  /* the jobs that have been placed */
  for (const [id, from] of Object.entries(state.plan)) {
    const t = taskById(id);
    const y = topY + from * G.slotH;
    const h = t.slots * G.slotH - 3;
    const [tint, ink] = colourOf(t);
    const landing = state.dropped?.id === id
      ? clamp((now - state.dropped.at) / timing.place) : 1;
    const doneNow = state.phase !== 'build' && state.clock >= from + t.slots;

    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * easeOut(landing);
    fillRounded(colX + 2, y + 2, colW - 4, h, 7, tint);
    strokeRounded(colX + 2, y + 2, colW - 4, h, 7, doneNow ? P.mintInk : ink, doneNow ? 1.6 : 1);
    writeFit(t.short, colX + 13, y + (t.slots > 1 ? 18 : 15), colW - 40, { size: 11.5, weight: 800, colour: ink });
    if (t.slots > 1) {
      write(`${slotLabel(from)}–${slotLabel(from + t.slots)}`, colX + 13, y + 32,
        { size: 10, weight: 700, colour: ink });
    }
    if (doneNow) tick(colX + colW - 16, y + 15, 7, P.mintInk, 2);
    ctx.restore();

    if (state.phase === 'build') hit(colX + 2, y + 2, colW - 4, h, 'block', id);
  }

  /* the clock sweeping the day while it runs */
  if (state.phase !== 'build') {
    const y = topY + clamp(state.clock, 0, day.slots) * G.slotH;
    ctx.beginPath();
    ctx.moveTo(colX - 6, y);
    ctx.lineTo(colX + colW + 4, y);
    ctx.strokeStyle = P.clock;
    ctx.lineWidth = 2;
    ctx.stroke();
    fillRounded(G.x + 10, y - 9, 34, 18, 5, P.clock);
    write(slotLabel(Math.min(day.slots, Math.floor(state.clock))), G.x + 27, y + 4,
      { size: 10, weight: 800, colour: '#fff', align: 'center' });
  }
}

function drawChallenges() {
  const C = view.chal;
  panel(C.x, C.y, C.w, view.board.h - C.y * 2);
  write(meta.chalLabel.toUpperCase(), C.x + 16, C.y + 23, { size: 10.5, weight: 800, colour: P.faint });
  const board = scoreboard();
  const caught = board.filter((r) => r.met || r.banked).length;
  write(caught ? ui.collected(caught, challenges.length) : meta.chalSub,
    C.x + C.w - 16, C.y + 23,
    { size: 10.5, weight: 700, colour: caught ? P.mintInk : P.faint, align: 'right' });

  board.forEach((row, i) => {
    const y = C.y + C.top + i * (C.chipH + C.gap);
    const x = C.x + 11;
    const w = C.w - 22;
    const { c, met, would, banked, done, need, shown } = row;
    const holding = would && !met;      // true on the plan, waiting on a runnable day

    fillRounded(x, y, w, C.chipH, 11, met ? P.mintTint : shown ? P.soft : P.wall);
    strokeRounded(x, y, w, C.chipH, 11, met || holding ? P.mintInk : P.line, met ? 1.6 : 1);

    /* the marker: a tick once it holds, a number while it is being
       worked towards, a question mark while it is still hidden */
    const mx = x + 26;
    const my = y + 26;
    if (met) {
      fillRounded(mx - 13, my - 13, 26, 26, 13, P.mintInk);
      tick(mx, my, 8, '#fff', 2.2);
    } else if (holding) {
      strokeRounded(mx - 13, my - 13, 26, 26, 13, P.mintInk, 1.8);
      tick(mx, my, 8, P.mintInk, 2.2);
    } else if (!shown) {
      fillRounded(mx - 13, my - 13, 26, 26, 13, P.line);
      write(ui.lockedMark, mx, my + 5, { size: 14, weight: 800, colour: P.faint, align: 'center' });
    } else {
      strokeRounded(mx - 13, my - 13, 26, 26, 13, P.line, 1.5);
      if (need > 1) write(`${done}/${need}`, mx, my + 4, { size: 10.5, weight: 800, colour: P.dim, align: 'center' });
    }

    if (!shown) {
      write(ui.hiddenGoal, x + 50, y + 24, { size: 12, weight: 800, colour: P.faint });
      write('Keep going and it will show itself.', x + 50, y + 40, { size: 11, weight: 600, colour: P.faint });
      return;
    }

    write(c.name, x + 50, y + 23, { size: 12.5, weight: 800, colour: met || holding ? P.mintInk : P.ink });

    /* Caught on an earlier plan: said in the corner, so this plan's
       own marker still only ever describes this plan. */
    if (banked) {
      const bw = widthOf(ui.bankedBadge, 8.5, 800) + 24;
      const bx = x + w - 10 - bw;
      fillRounded(bx, y + 11, bw, 16, 8, P.mintTint);
      strokeRounded(bx, y + 11, bw, 16, 8, P.mintInk, 1);
      tick(bx + 10, y + 19, 5, P.mintInk, 1.6);
      write(ui.bankedBadge, bx + 17, y + 23, { size: 8.5, weight: 800, colour: P.mintInk });
    }
    writeFit(c.goal, x + 50, y + 39, w - 62, { size: 11, weight: 600, colour: P.dim });

    /* a bar for the ones with something to count towards */
    if (need > 1) {
      const bx = x + 50;
      const bw = w - 64;
      fillRounded(bx, y + C.chipH - 13, bw, 4, 2, P.line);
      fillRounded(bx, y + C.chipH - 13, bw * clamp(done / need), 4, 2, met ? P.mintInk : P.blue);
    }
  });
}

function draw(now) {
  const { s, ox, oy } = place();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = P.wall;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  hits = [];
  drawTray();
  drawGrid(now);
  drawChallenges();
  ctx.restore();
}

function frame(nowMs) {
  pumpWaits(nowMs);
  draw(nowMs);
  requestAnimationFrame(frame);
}

/* ============================================================
   The clock — waits ride the animation loop, never setTimeout
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
function tween(ms, onUpdate) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const stepFrame = (now) => {
      const p = ms > 0 ? Math.min(1, (now - t0) / ms) : 1;
      onUpdate(p);
      if (p < 1) requestAnimationFrame(stepFrame);
      else resolve();
    };
    requestAnimationFrame(stepFrame);
  });
}

/* ============================================================
   Running the day
   ============================================================ */
async function runDay() {
  if (state.phase !== 'build') return;
  const ready = readiness();
  if (!ready.ok) { toast(ready.why, 'warn'); return; }

  const run = state.run;
  const p = planView();
  state.picked = null;
  state.phase = 'running';
  state.clock = 0;
  state.beat = null;
  render();

  const story = beats
    .filter((b) => b.when(p))
    .map((b) => ({ at: b.at(p), text: b.text, tone: b.tone }))
    .sort((a, b) => a.at - b.at);
  let next = 0;

  await tween(timing.runMs, (t) => {
    state.clock = t * day.slots;
    while (next < story.length && state.clock >= story[next].at) {
      state.beat = story[next];
      next += 1;
      render();
    }
  });
  if (run !== state.run) return;

  state.clock = day.slots;
  state.phase = 'done';
  render();
  await wait(timing.endHold);
  if (run !== state.run) return;
  finish();
}

function finish() {
  const board = scoreboard();
  const earned = board.filter((r) => r.met);
  const missed = board.filter((r) => !r.met);
  const alreadyHad = missed.filter((r) => r.banked);

  /* Everything this plan caught goes in the bag before the ending is
     written, so the next plan starts with it already marked. */
  state.runs += 1;
  for (const r of earned) state.banked.add(r.c.id);
  const openNow = challenges.filter((c) => !state.banked.has(c.id));

  bridge.complete({
    passed: true,
    score: earned.length / challenges.length,
    detail: { earned: earned.map((r) => r.c.id), plan: { ...state.plan } },
  });

  showResult({
    passed: true,
    title: earned.length === challenges.length ? result.titleAll
      : earned.length === 0 ? result.titleNone
        : result.title.replace('{n}', String(earned.length)),
    summary: result.summary,
    points: [
      planView().end('proposal') <= baseline.proposalBy ? result.onTime : result.late,
      ...earned.map((r) => result.earnedPoint.replace('{name}', r.c.name).replace('{earned}', r.c.earned)),
      ...alreadyHad.map((r) => result.bankedPoint.replace('{name}', r.c.name)),
      ...missed.filter((r) => !r.banked).map((r) => result.missedPoint.replace('{name}', r.c.name).replace('{missed}', r.c.missed)),
      state.runs > 1 ? result.collected
        .replace('{n}', String(challenges.length - openNow.length))
        .replace('{runs}', String(state.runs))
        .replace('{left}', openNow.length
          ? result.leftSome
            .replace('{k}', String(openNow.length))
            .replace('{them}', openNow.map((c) => c.name).join(' and '))
          : result.leftNone)
        : null,
      result.clashPoint,
      result.point,
    ].filter(Boolean),
    actions: [
      { label: ui.closeLabel, kind: 'ghost' },
      { label: ui.againLabel, kind: 'primary', onClick: () => restart(true) },
    ],
  });
}

/** `keep` is what "Plan it again" does: a new plan, the same bag of
    challenges already caught. The Restart button starts the whole
    thing over instead. */
function restart(keep = false) {
  document.querySelector('.scrim')?.remove();
  if (!keep) {
    state.banked = new Set();
    state.runs = 0;
  }
  state.run += 1;
  state.plan = {};
  state.picked = null;
  state.phase = 'build';
  state.clock = 0;
  state.beat = null;
  state.dropped = null;
  state.revealed = new Set();
  state.met = new Set();
  changed();
  bridge.restart();
}

function clearDay() {
  if (state.phase !== 'build') return;
  state.plan = {};
  state.picked = null;
  state.dropped = null;
  changed();
}

/* ============================================================
   The bar along the bottom
   ============================================================ */
function render() {
  if (state.phase !== 'build') {
    bottomEl.replaceChildren(el('div.bar', {}, [
      el('div.say', {}, [
        el('div.lead', {}, state.beat ? state.beat.text : ui.running),
        el('div.sub', {}, `${slotLabel(Math.min(day.slots, Math.floor(state.clock)))} — ${meta.dayLabel.toLowerCase()}`),
      ]),
    ]));
    regionDirty = true;
    return;
  }

  const ready = readiness();
  const picked = state.picked ? taskById(state.picked) : null;
  const lead = picked
    ? ui.pickedPrompt.replace('{name}', picked.name).replace('{len}', ui.duration(picked.slots))
    : ui.pickPrompt;

  bottomEl.replaceChildren(el('div.bar', {}, [
    el('div.say', {}, [
      el('div.lead', {}, lead),
      el(`div.sub${ready.ok && !ready.warn ? '' : '.warn'}`, {}, ready.why),
    ]),
    el('div.acts', {}, [
      el('button.btn.ghost', { type: 'button', onClick: () => clearDay() }, ui.clearLabel),
      el('button.btn.primary', { type: 'button', disabled: ready.ok ? null : true, onClick: () => runDay() }, ui.runLabel),
    ]),
  ]));
  regionDirty = true;
}

/* ============================================================
   Start
   ============================================================ */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
document.getElementById('restart').addEventListener('click', () => { restart(); });

resizeCanvas();
requestAnimationFrame(frame);
changed();

window.__bonus = { state, pick, drop, runDay, restart, scoreboard, planView, readiness, hoverNow: () => hover };

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
