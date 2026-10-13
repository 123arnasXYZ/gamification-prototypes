/* ============================================================
   15 — Give learners a role

   A major incident with six things happening at once, drawn flat
   in 2D. You choose who you are before anything else, and the
   role does not decide which answer is right — it decides which
   two of the six are yours, and how many minutes of your own
   hands you have to spend on them.

   Hold your own and hand the rest to the person who can actually
   do them, and the incident gets through it. Take somebody
   else's work and you spend minutes you have not got, they sit
   idle, and something of yours never gets held at all. The
   lesson is in the arithmetic rather than in a paragraph at the
   end.

   No Three.js and no WebGL: one <canvas>, one 2D context. The
   board is composed in the fixed design space given by
   view.board and scaled as a single piece into whatever room the
   overlay leaves it.
   ============================================================ */

import { el, toast, showResult, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, incident, roles, events, ui, result,
  palette as P, view, timing,
} from './content.js';

const bridge = createBridge('give-a-role');
const TAU = Math.PI * 2;

/* Hoisted on purpose: used while the module is still starting up. */
function font(weight, size, style = '') {
  return `${style} ${weight} ${size}px ${view.fontFamily}`.trim();
}
function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function roleById(id) { return roles.find((r) => r.id === id); }
function eventById(id) { return events.find((e) => e.id === id); }

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

   `calls` is the whole decision: for each event, either 'mine' or
   the id of the role it was handed to. Everything else is read
   off that.
   ============================================================ */
const state = {
  phase: 'pick',          // pick | board | done
  role: null,
  calls: {},              // eventId -> 'mine' | roleId
  picked: null,           // the card being decided
  order: [],              // the order jobs were taken, which is what runs out of minutes
  playedAs: new Set(),
  run: 0,
};

function me() { return roleById(state.role); }
function minutesUsed() {
  return state.order.reduce((n, id) => n + eventById(id).minutes, 0);
}
function decidedCount() { return Object.keys(state.calls).length; }

/** Which taken jobs actually got done, in the order they were taken. */
function heldAndDropped() {
  const cap = me().minutes;
  let used = 0;
  const held = [];
  const dropped = [];
  for (const id of state.order) {
    const e = eventById(id);
    if (used + e.minutes <= cap) { used += e.minutes; held.push(id); }
    else dropped.push(id);
  }
  return { held, dropped, used };
}

function take(eventId) {
  if (state.phase !== 'board') return;
  if (state.calls[eventId] !== 'mine') state.order.push(eventId);
  state.calls[eventId] = 'mine';
  state.picked = null;
  flip(eventId);
  render();
}

function pass(eventId, roleId) {
  if (state.phase !== 'board') return;
  state.calls[eventId] = roleId;
  state.order = state.order.filter((id) => id !== eventId);
  state.picked = null;
  flip(eventId);
  render();
}

function undo(eventId) {
  delete state.calls[eventId];
  state.order = state.order.filter((id) => id !== eventId);
  state.picked = eventId;
  render();
}

const flips = {};
function flip(id) { flips[id] = performance.now(); }

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
function disc(x, y, r, colour) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
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
function widthOf(str, size, weight, style = '') {
  ctx.font = font(weight, size, style);
  return ctx.measureText(str).width;
}
function writeFit(str, x, y, max, opts = {}) {
  ctx.font = font(opts.weight ?? 700, opts.size ?? 13, opts.style ?? '');
  let s = String(str);
  if (ctx.measureText(s).width > max) {
    while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
    s = `${s}…`;
  }
  write(s, x, y, opts);
}
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
function pillWidth(text, size = 9.5) { return widthOf(text, size, 800) + 18; }
function pill(x, y, text, { size = 9.5, colour = P.dim, fill = P.soft, edge = null } = {}) {
  const w = pillWidth(text, size);
  fillRounded(x, y, w, 17, 8.5, fill);
  if (edge) strokeRounded(x, y, w, 17, 8.5, edge, 1);
  write(text, x + 9, y + 12, { size, weight: 800, colour });
  return w;
}

/** The little person-shaped emblem that stands for a role. */
function emblem(cx, cy, r, tint, soft) {
  disc(cx, cy, r, soft);
  disc(cx, cy - r * 0.18, r * 0.34, tint);
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.62, r * 0.56, Math.PI, TAU);
  ctx.fillStyle = tint;
  ctx.fill();
}

/* ============================================================
   Hit regions
   ============================================================ */
let hits = [];
let hover = null;
function hit(x, y, w, h, kind, id) { hits.push({ x, y, w, h, kind, id }); }

function boardPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left - placed.ox) / placed.s,
    y: (ev.clientY - r.top - placed.oy) / placed.s,
  };
}
function hitAt(pt) {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (pt.x >= h.x && pt.x <= h.x + h.w && pt.y >= h.y && pt.y <= h.y + h.h) return h;
  }
  return null;
}

canvas.addEventListener('pointerdown', (ev) => {
  const h = hitAt(boardPoint(ev));
  if (!h) return;
  if (h.kind === 'role') { chooseRole(h.id); return; }
  if (h.kind === 'card') {
    if (state.calls[h.id]) undo(h.id);
    else { state.picked = state.picked === h.id ? null : h.id; render(); }
  }
});
canvas.addEventListener('pointermove', (ev) => {
  hover = hitAt(boardPoint(ev));
  canvas.style.cursor = hover ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => { hover = null; });

/* ============================================================
   Drawing — choosing who you are
   ============================================================ */
function drawPick() {
  write(meta.pickTitle, view.board.w / 2, 42, { size: 21, weight: 800, colour: P.ink, align: 'center' });
  write(meta.pickSub, view.board.w / 2, 64, { size: 13, weight: 600, colour: P.dim, align: 'center' });

  const K = view.pick;
  const total = roles.length * K.cardW + (roles.length - 1) * K.gap;
  const x0 = (view.board.w - total) / 2;

  roles.forEach((r, i) => {
    const x = x0 + i * (K.cardW + K.gap);
    const y = K.y;
    const on = hover?.kind === 'role' && hover.id === r.id;
    const been = state.playedAs.has(r.id);

    fillRounded(x, y, K.cardW, K.cardH, 16, P.card);
    strokeRounded(x, y, K.cardW, K.cardH, 16, on ? r.tint : P.cardEdge, on ? 2.5 : 1.5);

    fillRounded(x, y, K.cardW, 86, 16, r.soft);
    fillRounded(x, y + 60, K.cardW, 26, 0, r.soft);
    emblem(x + 54, y + 44, 28, r.tint, P.paper);
    write(r.name, x + 96, y + 40, { size: 17, weight: 800, colour: r.tint });
    write(meta.minutes(r.minutes), x + 96, y + 60, { size: 11.5, weight: 700, colour: P.dim });

    write(meta.ownsLabel.toUpperCase(), x + 22, y + 116, { size: 9.5, weight: 800, colour: P.faint });
    let py = y + 136;
    for (const power of r.can) {
      disc(x + 28, py - 4, 3.5, r.tint);
      wrap(power, K.cardW - 62, 13.5, 800).forEach((l, li) => {
        write(l, x + 40, py + li * 18, { size: 13.5, weight: 800, colour: P.ink });
      });
      py += 18 * wrap(power, K.cardW - 62, 13.5, 800).length + 10;
    }
    py += 6;
    wrap(r.brief, K.cardW - 44, 12.5, 600).forEach((l, li) => {
      write(l, x + 22, py + li * 17, { size: 12.5, weight: 600, colour: P.dim });
    });

    if (been) {
      pill(x + 22, y + K.cardH - 36, 'ALREADY PLAYED', { colour: P.mintInk, fill: P.mintTint, edge: P.mintInk });
    } else {
      write(ui.pickCta, x + 22, y + K.cardH - 22, { size: 12.5, weight: 800, colour: r.tint });
    }

    hit(x, y, K.cardW, K.cardH, 'role', r.id);
  });
}

/* ============================================================
   Drawing — the bridge
   ============================================================ */
function drawSide() {
  const S = view.side;
  const r = me();
  fillRounded(S.x, S.y, S.w, view.board.h - S.y * 2, 16, P.paper);
  strokeRounded(S.x, S.y, S.w, view.board.h - S.y * 2, 16, P.line, 1.5);

  write(meta.youLabel.toUpperCase(), S.x + 18, S.y + 26, { size: 9.5, weight: 800, colour: P.faint });
  fillRounded(S.x + 12, S.y + 36, S.w - 24, 70, 12, r.soft);
  emblem(S.x + 48, S.y + 71, 24, r.tint, P.paper);
  write(r.name, S.x + 84, S.y + 66, { size: 15.5, weight: 800, colour: r.tint });
  write(meta.minutes(r.minutes), S.x + 84, S.y + 84, { size: 11, weight: 700, colour: P.dim });

  write(meta.ownsLabel.toUpperCase(), S.x + 18, S.y + 130, { size: 9.5, weight: 800, colour: P.faint });
  let cy = S.y + 150;
  for (const power of r.can) {
    const lines = wrap(power, S.w - 54, 12.5, 800);
    disc(S.x + 23, cy - 4, 3.5, r.tint);
    lines.forEach((l, li) => {
      write(l, S.x + 34, cy + li * 16, { size: 12.5, weight: 800, colour: P.ink });
    });
    cy += 16 * lines.length + 8;
  }

  /* the minutes meter — the whole squeeze, drawn */
  const my = cy + 18;
  const used = minutesUsed();
  const over = used > r.minutes;
  write(meta.clockLabel.toUpperCase(), S.x + 18, my, { size: 9.5, weight: 800, colour: P.faint });
  write(`${used} / ${r.minutes}`, S.x + S.w - 18, my,
    { size: 11, weight: 800, colour: over ? P.redInk : P.dim, align: 'right' });
  const bw = S.w - 36;
  fillRounded(S.x + 18, my + 10, bw, 10, 5, P.meter);
  fillRounded(S.x + 18, my + 10, bw * clamp(used / r.minutes), 10, 5, over ? P.redInk : r.tint);
  if (over) {
    write(`${used - r.minutes} ${ui.clockOver}`, S.x + 18, my + 38, { size: 11, weight: 800, colour: P.redInk });
  }

  /* what the incident is, for anybody who joined late */
  let y = my + 72;
  write('THE INCIDENT', S.x + 18, y, { size: 9.5, weight: 800, colour: P.faint });
  y += 18;
  wrap(incident.what, S.w - 36, 12, 600).forEach((l) => {
    write(l, S.x + 18, y, { size: 12, weight: 600, colour: P.dim });
    y += 16;
  });
  y += 6;
  for (const f of incident.facts) {
    disc(S.x + 22, y - 4, 2.5, P.faint);
    wrap(f, S.w - 48, 11.5, 600).forEach((l, li) => {
      write(l, S.x + 32, y + li * 15, { size: 11.5, weight: 600, colour: P.faint });
    });
    y += 15 * wrap(f, S.w - 48, 11.5, 600).length + 4;
  }
}

function drawCards(now) {
  const G = view.grid;
  write(meta.boardLabel.toUpperCase(), G.x + 4, G.y + 24, { size: 9.5, weight: 800, colour: P.faint });
  const left = events.filter((e) => !state.calls[e.id]).length;
  write(left ? ui.leftPrompt.replace('{n}', String(left)) : meta.mineTag,
    G.x + G.w - 4, G.y + 24,
    { size: 10.5, weight: 800, colour: left ? P.faint : P.mintInk, align: 'right' });

  events.forEach((e, i) => {
    const col = i % G.cols;
    const row = Math.floor(i / G.cols);
    const x = G.x + col * (G.cardW + G.gapX);
    const y = G.y + G.top + row * (G.cardH + G.gapY);
    const call = state.calls[e.id];
    const mine = call === 'mine';
    const picked = state.picked === e.id;
    const on = hover?.kind === 'card' && hover.id === e.id;
    const r = me();
    const f = flips[e.id] ? clamp((now - flips[e.id]) / timing.flip) : 1;

    ctx.save();
    if (f < 1) {
      ctx.translate(x + G.cardW / 2, y + G.cardH / 2);
      ctx.scale(1, 0.94 + 0.06 * easeOut(f));
      ctx.translate(-(x + G.cardW / 2), -(y + G.cardH / 2));
    }

    fillRounded(x, y, G.cardW, G.cardH, 13, mine ? r.soft : call ? P.passedTint : P.card);
    strokeRounded(x, y, G.cardW, G.cardH, 13,
      picked ? P.cardPicked : mine ? r.tint : on ? P.faint : P.cardEdge,
      picked ? 2.5 : mine ? 1.8 : 1.4);

    /* minutes, right-aligned, with the title wrapping clear of it */
    const pw = pillWidth(meta.minutes(e.minutes));
    pill(x + G.cardW - 18 - pw, y + 14, meta.minutes(e.minutes),
      { colour: P.dim, fill: call === undefined ? P.soft : P.paper });

    const titleLines = wrap(e.title, G.cardW - 36 - pw - 10, 14, 800).slice(0, 2);
    titleLines.forEach((l, li) => {
      write(l, x + 18, y + 33 + li * 18, { size: 14, weight: 800, colour: P.ink });
    });
    const dy = y + 33 + (titleLines.length - 1) * 18 + 20;
    const detailLines = wrap(e.detail, G.cardW - 36, 12, 600).slice(0, 2);
    detailLines.forEach((l, li) => {
      write(l, x + 18, dy + li * 16, { size: 12, weight: 600, colour: P.dim });
    });

    /* What this one needs, in the same words the roles use for what
       they can do. Matching the two is the whole decision. */
    const ny = dy + detailLines.length * 16 + 4;
    const needLines = wrap(e.needs, G.cardW - 92, 11.5, 700);
    fillRounded(x + 14, ny - 12, G.cardW - 28, 14 + needLines.length * 15, 8,
      mine ? P.paper : call ? P.paper : P.soft);
    write(meta.needsLabel.toUpperCase(), x + 24, ny + 1, { size: 9, weight: 800, colour: P.faint });
    needLines.forEach((l, li) => {
      write(l, x + 24 + 44, ny + 1 + li * 15, { size: 11.5, weight: 700, colour: P.dim });
    });

    const tagY = y + G.cardH - 30;
    if (mine) {
      disc(x + 26, tagY + 8, 9, r.tint);
      tick(x + 26, tagY + 8, 6, '#fff', 2);
      write(meta.mineTag, x + 42, tagY + 13, { size: 11.5, weight: 800, colour: r.tint });
      write(ui.undo, x + G.cardW - 18, tagY + 13, { size: 10.5, weight: 700, colour: P.faint, align: 'right' });
    } else if (call) {
      const other = roleById(call);
      disc(x + 26, tagY + 8, 9, other.soft);
      disc(x + 26, tagY + 8, 4, other.tint);
      write(meta.takenBy(other.name), x + 42, tagY + 13, { size: 11.5, weight: 800, colour: other.tint });
      write(ui.undo, x + G.cardW - 18, tagY + 13, { size: 10.5, weight: 700, colour: P.faint, align: 'right' });
    } else {
      write(meta.openTag, x + 18, tagY + 13, { size: 11.5, weight: 700, colour: P.faint });
    }

    ctx.restore();
    hit(x, y, G.cardW, G.cardH, 'card', e.id);
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
  if (state.phase === 'pick') drawPick();
  else { drawSide(); drawCards(now); }
  ctx.restore();
}

function frame(nowMs) {
  draw(nowMs);
  requestAnimationFrame(frame);
}

/* ============================================================
   Playing it out
   ============================================================ */
function chooseRole(id) {
  state.role = id;
  state.phase = 'board';
  state.calls = {};
  state.order = [];
  state.picked = null;
  bridge.progress(0.1, { role: id });
  render();
}

function runIt() {
  if (state.phase !== 'board' || decidedCount() < events.length) return;
  const r = me();
  const { dropped } = heldAndDropped();
  state.phase = 'done';
  state.playedAs.add(r.id);

  const lines = [];
  let right = 0;

  for (const e of events) {
    const call = state.calls[e.id];
    const owner = roleById(e.owner);
    if (call === 'mine') {
      if (dropped.includes(e.id)) lines.push(`<b>${e.title}</b> — ${e.unheld}`);
      else if (e.owner === r.id) { right += 1; lines.push(`<b>${e.title}</b> — ${e.mine}`); }
      else lines.push(`<b>${e.title}</b> — ${e.others}`);
    } else if (call === e.owner) {
      right += 1;
      lines.push(`<b>${e.title}</b> — ${e.passed}`);
    } else {
      lines.push(`<b>${e.title}</b> — ${e.misPassed.replace('{who}', roleById(call).name)}`);
    }
  }

  const mineHeld = events.filter((e) => e.owner === r.id && state.calls[e.id] === 'mine' && !dropped.includes(e.id)).length;
  /* What you TOOK ON, not what fitted — otherwise the summary quietly
     hides the work you could never have got to. */
  const attempted = minutesUsed();
  const perfect = right === events.length && dropped.length === 0;
  const verdict = attempted > r.minutes ? result.minutesOver
    : attempted === r.minutes ? result.minutesTight : result.minutesOk;

  const notPlayed = roles.filter((o) => !state.playedAs.has(o.id));

  bridge.complete({
    passed: mineHeld === 2,
    score: right / events.length,
    detail: { role: r.id, right, used: attempted, dropped },
  });

  showResult({
    passed: perfect,
    title: perfect ? result.titlePerfect
      : right >= 5 && dropped.length === 0 ? result.titleGood : result.titleRough,
    summary: result.summary,
    points: [
      result.minutesLine.replace('{used}', String(attempted)).replace('{total}', String(r.minutes)).replace('{verdict}', verdict),
      ...lines,
      notPlayed.length ? result.tryOther.replace('{name}', notPlayed[0].name) : null,
      result.lesson,
    ].filter(Boolean),
    actions: [
      { label: result.close ?? ui.closeCta, kind: 'ghost' },
      { label: ui.againCta, kind: 'primary', onClick: () => backToPick() },
    ],
  });
  render();
}

function backToPick() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  state.phase = 'pick';
  state.role = null;
  state.calls = {};
  state.order = [];
  state.picked = null;
  render();
}

function restart() {
  state.playedAs = new Set();
  backToPick();
  bridge.restart();
}

/* ============================================================
   The bar along the bottom
   ============================================================ */
function render() {
  if (state.phase === 'pick') {
    bottomEl.replaceChildren(el('div.bar', {}, [
      el('div.say', {}, [
        el('div.lead', {}, meta.pickSub),
        el('div.sub', {}, incident.what),
      ]),
    ]));
    regionDirty = true;
    return;
  }

  const r = me();
  const picked = state.picked && eventById(state.picked);
  const left = events.filter((e) => !state.calls[e.id]).length;
  const used = minutesUsed();
  const over = used > r.minutes;

  const acts = [];
  if (picked) {
    acts.push(el('button.btn.primary', {
      type: 'button', onClick: () => take(picked.id),
    }, `${ui.takeCta} · ${meta.minutes(picked.minutes)}`));
    for (const other of roles.filter((o) => o.id !== r.id)) {
      acts.push(el('button.btn', {
        type: 'button', onClick: () => pass(picked.id, other.id),
      }, ui.passCta.replace('{name}', other.short)));
    }
  } else {
    acts.push(el('button.btn.primary', {
      type: 'button',
      disabled: left ? true : null,
      onClick: () => runIt(),
    }, ui.runCta));
  }

  bottomEl.replaceChildren(el('div.bar', {}, [
    el('div.say', {}, [
      el('div.lead', {}, picked
        ? ui.pickedPrompt.replace('{title}', picked.title).replace('{min}', meta.minutes(picked.minutes))
        : left ? ui.openPrompt : ui.readyPrompt),
      el(`div.sub${over ? '.warn' : ''}`, {}, over
        ? ui.overPrompt
        : picked
          ? ui.matchLine
            .replace('{needs}', picked.needs.replace(/^Someone who /, '').replace(/^answers/, 'answer'))
            .replace('{can}', r.can.map((x) => x.toLowerCase()).join(', '))
          : `${r.name} · ${r.brief}`),
    ]),
    el('div.acts', {}, acts),
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
render();

window.__role = { state, chooseRole, take, pass, undo, runIt, backToPick, restart, heldAndDropped };

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
