/* ============================================================
   18 — Add side quests

   A new handheld scanner on a shop counter. The main path is
   three acts — battery in, pair it to the till, scan something —
   and the shift starts the moment they are done. That is the
   whole required experience and it takes about twenty seconds.

   Four optional discoveries sit around it, none of them
   mentioned anywhere: hold the power button instead of pressing
   it, wipe the lens, put the scanner back in its cradle while it
   is paired, keep trying a barcode that will not read. Each one
   is something you DO to the thing in front of you, and two of
   them change the main path while you are still on it.

   The collection panel shows four empty slots from the start, so
   the learner knows there is something to find without being
   told what — which is as much pressure as an optional thing is
   allowed to apply.

   No Three.js and no WebGL: one <canvas>, one 2D context. The
   counter is composed in the fixed design space given by
   view.board and scaled as a single piece into whatever room the
   overlay leaves it. Every wait rides the animation loop.
   ============================================================ */

import { el, toast, showResult, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, steps, quests, lines, stock, rules, result,
  palette as P, view, timing,
} from './content.js';

const bridge = createBridge('side-quests');
const TAU = Math.PI * 2;

/* Hoisted on purpose: used while the module is still starting up. */
function font(weight, size, style = '') {
  return `${style} ${weight} ${size}px ${view.fontFamily}`.trim();
}
function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function questById(id) { return quests.find((q) => q.id === id); }

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
   ============================================================ */
const state = {
  powered: false,
  paired: false,
  scanned: false,
  docked: false,
  lensClean: false,
  wipeUsed: false,
  keypad: false,          // the manual-entry keypad has been offered
  crushedTries: 0,
  dirtyFails: 0,
  tillItems: [],
  found: new Set(),
  menuUntil: 0,
  holdFrom: 0,            // when the power button went down
  phase: 'counter',       // counter | done
  run: 0,
};

const fx = {
  beam: null,             // { from, to, ok, p }
  pair: 0,                // 0..1 pulse
  seat: 0,                // battery seating
  wipe: 0,
};

function stepDone(id) {
  if (id === 'battery') return state.powered;
  if (id === 'pair') return state.paired;
  return state.scanned;
}
function allDone() { return steps.every((s) => stepDone(s.id)); }
function nextStep() { return steps.find((s) => !stepDone(s.id)); }

/** A discovery, once. Everything optional comes through here. */
function discover(id) {
  const q = questById(id);
  if (!q || state.found.has(id)) return;
  state.found.add(id);
  toast(q.toast, 'good');
  bridge.progress(state.found.size / quests.length, { found: [...state.found] });
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
function disc(x, y, r, colour) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
  ctx.fillStyle = colour;
  ctx.fill();
}
function ring(x, y, r, from, to, colour, width) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), from, to);
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

/* ============================================================
   Where everything is

   One place for the geometry, so the hit regions and the drawing
   can never drift apart.
   ============================================================ */
const BENCH_Y = 358;
const RACK = { x: 296, y: 78, boxW: 92, boxH: 76, step: 104, shelfY: 158 };
const TILL = { x: 792, y: 176, w: 180, h: 136 };
const CRADLE = { x: 636, y: 300, w: 112 };
const TRAY = { x: 272, y: 296, w: 104, h: 62 };
const SC = { x: 404, y: 172, w: 100, h: 138, gripW: 62, gripH: 48 };

function scannerOrigin() {
  return state.docked ? { x: CRADLE.x + 6, y: 166 } : { x: SC.x, y: SC.y };
}
function boxAt(i) {
  return { x: RACK.x + i * RACK.step, y: RACK.shelfY - RACK.boxH, w: RACK.boxW, h: RACK.boxH };
}
function lensPoint() {
  const o = scannerOrigin();
  return { x: o.x + SC.w / 2, y: o.y - 8 };
}

/* ============================================================
   Hit regions — rebuilt every frame, tested back to front
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
  if (state.phase !== 'counter') return;
  const h = hitAt(boardPoint(ev));
  if (!h) return;
  /* The power button is the one thing that cares how long you hold
     it, so it resolves on release rather than on press. */
  if (h.kind === 'power') { state.holdFrom = performance.now(); canvas.setPointerCapture?.(ev.pointerId); return; }
  act(h);
});
canvas.addEventListener('pointerup', () => {
  if (!state.holdFrom) return;
  const held = performance.now() - state.holdFrom;
  state.holdFrom = 0;
  if (held >= rules.holdMs) return;   // the hold already opened the menu
  pressPower();
});
canvas.addEventListener('pointercancel', () => { state.holdFrom = 0; });
canvas.addEventListener('pointermove', (ev) => {
  hover = state.phase === 'counter' ? hitAt(boardPoint(ev)) : null;
  canvas.style.cursor = hover ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => { hover = null; });

/* ============================================================
   What each thing does when you click it
   ============================================================ */
function act(h) {
  if (h.kind === 'battery') return fitBattery();
  if (h.kind === 'wipe') return useWipe();
  if (h.kind === 'keypad') return useKeypad();
  if (h.kind === 'cradle' || h.kind === 'scanner') return toggleDock(h.kind);
  if (h.kind === 'till') return pair();
  if (h.kind === 'box') return scan(h.id);
  return undefined;
}

function fitBattery() {
  if (state.powered) return;
  state.powered = true;
  fx.seat = performance.now();
  toast(lines.batteryIn, 'good');
  after();
}

function useWipe() {
  if (state.wipeUsed) { toast(lines.wipeGone); return; }
  state.wipeUsed = true;
  state.lensClean = true;
  fx.wipe = performance.now();
  discover('lens');
  toast(lines.wipeUsed);
  after();
}

function pressPower() {
  if (!state.powered) { toast(lines.needBattery, 'warn'); return; }
  toast(lines.alreadyOn);
}

function holdPower() {
  state.holdFrom = 0;
  if (!state.powered) { toast(lines.needBattery, 'warn'); return; }
  state.menuUntil = performance.now() + rules.menuMs;
  discover('menu');
}

function toggleDock(kind) {
  if (!state.docked) {
    if (kind === 'cradle') {
      state.docked = true;
      if (state.paired) {
        state.paired = false;
        discover('dock');
        toast(lines.dockedUnpaired, 'warn');
      } else {
        toast(lines.docked);
      }
      after();
    }
    return;
  }
  state.docked = false;
  toast(lines.undocked);
  after();
}

function pair() {
  if (!state.powered) { toast(lines.pairNeedsPower, 'warn'); return; }
  if (state.paired) { toast(lines.alreadyPaired); return; }
  if (state.docked) { state.docked = false; toast(lines.undocked); }
  const again = state.scanned || state.found.has('dock');
  state.paired = true;
  fx.pair = performance.now();
  toast(again ? lines.repaired : lines.paired, 'good');
  after();
}

function scan(id) {
  const item = stock.find((s) => s.id === id);
  if (!state.powered) { toast(lines.needBattery, 'warn'); return; }
  if (state.docked) { state.docked = false; toast(lines.undocked); }
  if (!state.paired) { shoot(id, false); toast(lines.scanNeedsPair, 'warn'); return; }

  if (item.damaged) {
    shoot(id, false);
    state.crushedTries += 1;
    if (state.crushedTries >= rules.crushedTries && !state.keypad) {
      state.keypad = true;
      toast(lines.keypadReady, 'good');
    } else {
      toast(state.crushedTries > 1 ? lines.crushedAgain : lines.crushedFail, 'warn');
    }
    after();
    return;
  }

  /* A lens nobody wiped: the first good scan simply does not take. */
  if (!state.lensClean && state.dirtyFails < rules.dirtyScansFail) {
    state.dirtyFails += 1;
    shoot(id, false);
    toast(lines.scanDirty, 'warn');
    after();
    return;
  }

  shoot(id, true);
  const seen = state.tillItems.includes(item.name);
  if (!seen) state.tillItems.push(item.name);
  state.scanned = true;
  toast((seen ? lines.scanAgain : lines.scanOk).replace('{name}', item.name), 'good');
  after();
}

function useKeypad() {
  if (!state.keypad) return;
  const item = stock.find((s) => s.damaged);
  if (!state.tillItems.includes(item.name)) state.tillItems.push(item.name);
  discover('manual');
  after();
}

/** The beam, drawn from the lens to whatever was aimed at. */
function shoot(id, ok) {
  const i = stock.findIndex((s) => s.id === id);
  const b = boxAt(i);
  fx.beam = { from: lensPoint(), to: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, ok, at: performance.now() };
}

function after() {
  bridge.progress(steps.filter((s) => stepDone(s.id)).length / steps.length, { found: [...state.found] });
  render();
}

/* ============================================================
   Drawing
   ============================================================ */
function drawSide() {
  const S = view.side;
  panel(S.x, S.y, S.w, view.board.h - S.y * 2);
  write(meta.mainLabel.toUpperCase(), S.x + 16, S.y + 26, { size: 10.5, weight: 800, colour: P.faint });

  steps.forEach((s, i) => {
    const y = S.y + S.top + i * (S.rowH + S.gap);
    const done = stepDone(s.id);
    const x = S.x + 11;
    const w = S.w - 22;
    fillRounded(x, y, w, S.rowH, 10, done ? P.mintTint : P.soft);
    if (done) strokeRounded(x, y, w, S.rowH, 10, P.mintInk, 1.4);
    if (done) {
      disc(x + 24, y + S.rowH / 2, 11, P.mintInk);
      tick(x + 24, y + S.rowH / 2, 7, '#fff', 2);
    } else {
      ring(x + 24, y + S.rowH / 2, 11, 0, TAU, P.line, 1.6);
    }
    writeFit(s.label, x + 44, y + S.rowH / 2 + 4, w - 56,
      { size: 12, weight: 800, colour: done ? P.mintInk : P.ink });
  });

  /* The collection: four slots, visible and empty from the start.
     Nothing says what goes in them. */
  const fy = S.y + S.findsTop;
  write(meta.findsLabel.toUpperCase(), S.x + 16, fy, { size: 10.5, weight: 800, colour: P.faint });
  write(`${state.found.size}/${quests.length}`, S.x + S.w - 16, fy,
    { size: 10.5, weight: 800, colour: state.found.size ? P.mintInk : P.faint, align: 'right' });

  quests.forEach((q, i) => {
    const y = fy + 14 + i * (S.slotH + S.slotGap);
    const x = S.x + 11;
    const w = S.w - 22;
    const got = state.found.has(q.id);

    fillRounded(x, y, w, S.slotH, 10, got ? P.mintTint : P.soft);
    if (got) strokeRounded(x, y, w, S.slotH, 10, P.mintInk, 1.4);
    else {
      ctx.save();
      ctx.setLineDash([4, 4]);
      strokeRounded(x, y, w, S.slotH, 10, P.line, 1.4);
      ctx.restore();
    }

    if (!got) {
      disc(x + 24, y + S.slotH / 2, 12, P.line);
      write(meta.slotEmpty, x + 24, y + S.slotH / 2 + 5, { size: 13, weight: 800, colour: P.faint, align: 'center' });
      write(meta.slotWaiting, x + 46, y + S.slotH / 2 + 4, { size: 11.5, weight: 700, colour: P.faint });
      return;
    }

    disc(x + 24, y + S.slotH / 2, 12, P.mintInk);
    tick(x + 24, y + S.slotH / 2, 7, '#fff', 2);
    writeFit(q.name, x + 46, y + 23, w - 58, { size: 12, weight: 800, colour: P.ink });
    const cw = widthOf(q.card, 9, 800) + 14;
    fillRounded(x + 46, y + 30, cw, 15, 7, P.paper);
    strokeRounded(x + 46, y + 30, cw, 15, 7, P.mintInk, 1);
    write(q.card, x + 53, y + 41, { size: 9, weight: 800, colour: P.mintInk });
  });
}

function drawCounter(now) {
  /* bench */
  fillRounded(view.scene.x + 4, BENCH_Y, view.board.w - view.scene.x - 8, 18, 5, P.benchEdge);
  fillRounded(view.scene.x + 4, BENCH_Y - 4, view.board.w - view.scene.x - 8, 16, 5, P.bench);

  /* rack */
  const shelfW = RACK.step * stock.length - (RACK.step - RACK.boxW) + 24;
  fillRounded(RACK.x - 12, RACK.shelfY, shelfW, 9, 3, P.benchEdge);
  stock.forEach((item, i) => {
    const b = boxAt(i);
    const hovering = hover?.kind === 'box' && hover.id === item.id;
    ctx.save();
    if (item.damaged) {
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.rotate(-0.045);
      ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
    }
    fillRounded(b.x, b.y, b.w, b.h, 4, P.box[item.colour]);
    strokeRounded(b.x, b.y, b.w, b.h, 4, hovering ? P.blue : P.boxEdge, hovering ? 2 : 1.2);

    /* the label, and the barcode that is the whole point of it */
    const lx = b.x + 12;
    const ly = b.y + 14;
    fillRounded(lx, ly, b.w - 24, 34, 3, P.label);
    for (let k = 0; k < 13; k++) {
      const bw = (k % 3 === 0 ? 2.4 : 1.2);
      const bx = lx + 6 + k * ((b.w - 36) / 13);
      ctx.fillStyle = P.bar;
      if (item.damaged && k > 4 && k < 10) {
        ctx.globalAlpha = 0.25;
        ctx.fillRect(bx, ly + 6 + (k % 2 ? 3 : 0), bw, 14);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillRect(bx, ly + 6, bw, 20);
      }
    }
    if (item.damaged) {
      // the crease across the label
      ctx.beginPath();
      ctx.moveTo(lx + 2, ly + 30);
      ctx.lineTo(lx + b.w - 26, ly + 4);
      ctx.strokeStyle = P.boxEdge;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    writeFit(item.name, b.x + b.w / 2, b.y + b.h - 10, b.w - 14,
      { size: 9.5, weight: 800, colour: P.dim, align: 'center' });
    ctx.restore();

    hit(b.x, b.y, b.w, b.h, 'box', item.id);
  });

  /* till */
  fillRounded(TILL.x - 22, BENCH_Y - 46, TILL.w + 44, 50, 6, P.tillDark);
  fillRounded(TILL.x, TILL.y, TILL.w, TILL.h, 8, P.till);
  strokeRounded(TILL.x, TILL.y, TILL.w, TILL.h, 8, P.tillDark, 1.5);
  fillRounded(TILL.x + 12, TILL.y + 12, TILL.w - 24, TILL.h - 44, 5, P.tillScreen);
  write('TILL 2', TILL.x + 22, TILL.y + 32, { size: 10, weight: 800, colour: P.tillInk });
  if (state.paired) {
    const pw = widthOf('PAIRED', 9, 800) + 14;
    fillRounded(TILL.x + TILL.w - 22 - pw, TILL.y + 21, pw, 14, 7, P.mintInk);
    write('PAIRED', TILL.x + TILL.w - 15 - pw, TILL.y + 31, { size: 9, weight: 800, colour: '#0C1A16' });
  }
  state.tillItems.slice(-3).forEach((name, i) => {
    write(name, TILL.x + 22, TILL.y + 54 + i * 16, { size: 10.5, weight: 700, colour: '#CFE6F5' });
  });
  if (!state.tillItems.length) {
    write(state.paired ? 'WAITING FOR A SCAN' : 'NO SCANNER', TILL.x + 22, TILL.y + 58,
      { size: 9.5, weight: 700, colour: '#5C6B82' });
  }
  /* the pairing pulse, out of the till towards the scanner */
  if (fx.pair) {
    const p = clamp((now - fx.pair) / timing.pair);
    if (p < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.8;
      ring(TILL.x + 8, TILL.y + TILL.h / 2, 18 + p * 120, Math.PI * 0.62, Math.PI * 1.38, P.mintInk, 2);
      ctx.restore();
    } else fx.pair = 0;
  }
  hit(TILL.x - 10, TILL.y, TILL.w + 20, TILL.h + 46, 'till');

  /* cradle — a base and two prongs, so a docked scanner sits IN it */
  const cy = BENCH_Y - 4;
  fillRounded(CRADLE.x, cy - 22, CRADLE.w, 24, 6, P.tillDark);
  fillRounded(CRADLE.x + 4, cy - 64, 14, 48, 5, P.till);
  fillRounded(CRADLE.x + CRADLE.w - 18, cy - 64, 14, 48, 5, P.till);
  strokeRounded(CRADLE.x + 4, cy - 64, 14, 48, 5, P.tillDark, 1.2);
  strokeRounded(CRADLE.x + CRADLE.w - 18, cy - 64, 14, 48, 5, P.tillDark, 1.2);
  write('CRADLE', CRADLE.x + CRADLE.w / 2, cy - 6, { size: 9, weight: 800, colour: P.dim, align: 'center' });
  if (state.paired && !state.docked) {
    // a live pairing is the thing the cradle quietly takes away
    disc(CRADLE.x + CRADLE.w / 2, cy - 72, 3.5, P.faint);
  }
  if (hover?.kind === 'cradle') strokeRounded(CRADLE.x - 2, cy - 66, CRADLE.w + 4, 70, 8, P.blue, 2);
  hit(CRADLE.x - 2, cy - 66, CRADLE.w + 4, 70, 'cradle');

  /* tray, with the two things in it */
  fillRounded(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 7, P.soft);
  strokeRounded(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 7, P.line, 1.4);
  write('TRAY', TRAY.x + 8, TRAY.y + 15, { size: 8.5, weight: 800, colour: P.faint });

  if (!state.powered) {
    const bx = TRAY.x + 10;
    const by = TRAY.y + 24;
    fillRounded(bx, by, 38, 24, 4, P.shell);
    fillRounded(bx + 4, by + 6, 22, 12, 2, P.cell);
    fillRounded(bx + 30, by + 8, 5, 8, 2, P.cell);
    if (hover?.kind === 'battery') strokeRounded(bx - 2, by - 2, 42, 28, 5, P.blue, 2);
    hit(bx - 4, by - 4, 46, 32, 'battery');
  }
  if (!state.wipeUsed) {
    const wx = TRAY.x + 58;
    const wy = TRAY.y + 24;
    fillRounded(wx, wy, 34, 24, 6, '#D7EEF8');
    strokeRounded(wx, wy, 34, 24, 6, '#9CC8DC', 1.4);
    fillRounded(wx + 5, wy + 6, 24, 12, 3, P.paper);
    write('WIPE', wx + 17, wy + 15, { size: 7.5, weight: 800, colour: '#4D7F97', align: 'center' });
    if (hover?.kind === 'wipe') strokeRounded(wx - 2, wy - 2, 38, 28, 7, P.blue, 2);
    hit(wx - 4, wy - 4, 42, 32, 'wipe');
  }
  if (fx.wipe) {
    const p = clamp((now - fx.wipe) / timing.wipe);
    if (p < 1) {
      const l = lensPoint();
      ctx.save();
      ctx.globalAlpha = 1 - p;
      fillRounded(l.x - 26 + p * 52, l.y - 16, 22, 16, 4, P.paper);
      ctx.restore();
    } else fx.wipe = 0;
  }

  drawScanner(now);
  drawBeam(now);
}

function drawScanner(now) {
  const o = scannerOrigin();
  const w = SC.w;
  const h = SC.h;

  /* lens window on the top edge — where the beam comes out */
  fillRounded(o.x + 8, o.y - 12, w - 16, 14, 4, P.shellDark);
  fillRounded(o.x + 16, o.y - 9, w - 32, 8, 3, state.lensClean ? '#8FD9FF' : '#7E8B96');

  /* body */
  fillRounded(o.x, o.y, w, h, 12, P.shell);
  strokeRounded(o.x, o.y, w, h, 12, P.shellDark, 1.5);

  /* grip */
  const gx = o.x + (w - SC.gripW) / 2;
  const gy = o.y + h - 4;
  fillRounded(gx, gy, SC.gripW, SC.gripH, 8, P.grip);

  /* battery bay in the grip */
  const bx = gx + 8;
  const by = gy + 14;
  fillRounded(bx, by, SC.gripW - 16, 22, 4, P.bay);
  if (state.powered) {
    const seat = fx.seat ? clamp((now - fx.seat) / timing.seat) : 1;
    ctx.save();
    ctx.globalAlpha = easeOut(seat);
    fillRounded(bx + 3, by + 4, SC.gripW - 22, 14, 3, P.cell);
    ctx.restore();
    if (seat >= 1) fx.seat = 0;
  }

  /* screen */
  const sx = o.x + 10;
  const sy = o.y + 12;
  const sw = w - 20;
  const sh = 50;
  fillRounded(sx, sy, sw, sh, 5, state.powered ? P.screenOn : P.screenOff);
  if (state.powered) {
    const menu = now < state.menuUntil;
    if (menu) {
      write('ENGINEER', sx + 8, sy + 16, { size: 8.5, weight: 800, colour: P.screenInk });
      write('BATTERY', sx + 8, sy + 30, { size: 8.5, weight: 700, colour: P.screenInk });
      write('HEALTH 71%', sx + 8, sy + 42, { size: 9.5, weight: 800, colour: '#FFD66E' });
    } else if (state.keypad && !state.found.has('manual')) {
      write('ENTER CODE', sx + 8, sy + 20, { size: 9, weight: 800, colour: P.screenInk });
      write('_ _ _ _ _', sx + 8, sy + 36, { size: 11, weight: 800, colour: P.screenInk });
    } else {
      write(state.paired ? 'READY' : 'NOT PAIRED', sx + 8, sy + 20,
        { size: 9.5, weight: 800, colour: state.paired ? P.screenInk : '#F0A87A' });
      write(state.tillItems.length ? `${state.tillItems.length} SCANNED` : 'TILL 2',
        sx + 8, sy + 36, { size: 9, weight: 700, colour: '#4FBF93' });
    }
  }

  /* the keypad, which only exists after a barcode refuses to read */
  if (state.keypad) {
    const kx = o.x + 14;
    const ky = o.y + 70;
    const kw = w - 28;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const bxx = kx + c * (kw / 3);
        const byy = ky + r * 17;
        fillRounded(bxx + 1, byy, kw / 3 - 3, 14, 3, P.trigger);
      }
    }
    if (hover?.kind === 'keypad') strokeRounded(kx - 2, ky - 2, kw + 4, 37, 5, P.blue, 2);
    hit(kx - 4, ky - 4, kw + 8, 42, 'keypad');
  }

  /* power button, with the ring that fills while it is held */
  const px = o.x + w / 2;
  const py = o.y + h - 20;
  disc(px, py, 12, P.trigger);
  ring(px, py, 6, 0.6, TAU - 0.6, state.powered ? P.cell : P.faint, 2);
  ctx.beginPath();
  ctx.moveTo(px, py - 8);
  ctx.lineTo(px, py - 2);
  ctx.strokeStyle = state.powered ? P.cell : P.faint;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (state.holdFrom) {
    const p = clamp((now - state.holdFrom) / rules.holdMs);
    ring(px, py, 17, -Math.PI / 2, -Math.PI / 2 + TAU * p, P.mint, 3);
    if (p >= 1) holdPower();
  } else if (hover?.kind === 'power') {
    ring(px, py, 17, 0, TAU, P.blue, 2);
  }
  hit(px - 18, py - 18, 36, 36, 'power');

  /* the body itself is a handle: click it to take it out of the cradle */
  if (state.docked) hit(o.x, o.y, w, h, 'scanner');
}

function drawBeam(now) {
  if (!fx.beam) return;
  const p = clamp((now - fx.beam.at) / timing.beam);
  if (p >= 1) { fx.beam = null; return; }
  const { from, to, ok } = fx.beam;
  ctx.save();
  ctx.globalAlpha = (1 - p) * (ok ? 1 : 0.5 + 0.5 * Math.sin(p * 40));
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = ok ? P.beamOk : P.beam;
  ctx.lineWidth = 3;
  ctx.stroke();
  if (ok) {
    ring(to.x, to.y, 10 + p * 26, 0, TAU, P.mintInk, 2);
  }
  ctx.restore();
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
  drawSide();
  drawCounter(now);
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

/* ============================================================
   Finishing
   ============================================================ */
async function startShift() {
  if (!allDone() || state.phase !== 'counter') return;
  const run = state.run;
  state.phase = 'done';
  render();
  await wait(360);
  if (run !== state.run) return;

  const found = quests.filter((q) => state.found.has(q.id));
  const missed = quests.filter((q) => !state.found.has(q.id));

  bridge.complete({
    passed: true,
    score: found.length / quests.length,
    detail: { found: found.map((q) => q.id) },
  });

  showResult({
    passed: true,
    title: missed.length ? result.title : result.titleAll,
    summary: result.summary,
    points: [
      ...found.map((q) => q.found),
      ...(found.length ? [] : [result.none]),
      ...missed.map((q) => q.missed),
      result.point,
    ],
    actions: [
      { label: result.close, kind: 'ghost' },
      { label: result.again, kind: 'primary', onClick: () => restart() },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, {
    powered: false, paired: false, scanned: false, docked: false,
    lensClean: false, wipeUsed: false, keypad: false,
    crushedTries: 0, dirtyFails: 0, tillItems: [], found: new Set(),
    menuUntil: 0, holdFrom: 0, phase: 'counter',
  });
  fx.beam = null;
  fx.pair = 0;
  fx.seat = 0;
  fx.wipe = 0;
  render();
  bridge.restart();
}

/* ============================================================
   The bar along the bottom
   ============================================================ */
function render() {
  const next = nextStep();
  const ready = allDone();

  bottomEl.replaceChildren(el('div.bar', {}, [
    el('div.say', {}, [
      el('div.lead', {}, ready ? lines.ready : next.hint),
      el('div.sub', {}, lines.start),
    ]),
    el('div.acts', {}, [
      el('button.btn.primary', {
        type: 'button',
        disabled: ready && state.phase === 'counter' ? null : true,
        onClick: () => startShift(),
      }, lines.startBtn),
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
render();

window.__quests = {
  state, act, pair, scan, fitBattery, useWipe, holdPower, toggleDock, useKeypad, startShift, restart,
  probe: (cx, cy) => hitAt(boardPoint({ clientX: cx, clientY: cy })),
  at: (kind) => hits.find((h) => h.kind === kind),
  screenOf: (h) => ({ x: placed.ox + (h.x + h.w / 2) * placed.s, y: placed.oy + (h.y + h.h / 2) * placed.s }),
};

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
