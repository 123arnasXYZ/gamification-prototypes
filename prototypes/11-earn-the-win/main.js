/* ============================================================
   11 — Make learners earn the win

   Two decisions at a desk, drawn flat in 2D. A wrong choice plays
   out on the canvas — the list leaving the building, the fake login
   page arriving, the stick going into the port — says something
   useful, and then hands back the same decision with a little more
   support. Nothing is removed and nothing is revealed, so the right
   answer has to be chosen rather than arrived at.

   What is on the canvas is the thing being judged:

     step 1   the email itself, laid out like a mail client: the
              display name that does not match the address, the
              EXTERNAL flag, the subject, the body, the link whose
              host matches neither, the sign-off
     step 2   the USB stick as a drawn object on the desk, with the
              logo that is all that is written on it, the note about
              where it came from, the laptop port and the kitchen

   No Three.js and no WebGL: one <canvas>, one 2D context. The board
   is composed in the fixed design space given by view.board and
   scaled as a single piece into whatever room the overlay leaves
   it, so the proportions hold at any window size. Every wait rides
   the animation loop, so a throttled tab cannot strand a step.
   ============================================================ */

import { el, toast, showResult, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, steps, doneScreen, result, labels, palette as P, view, timing,
} from './content.js';

const bridge = createBridge('earn-the-win');

const TAU = Math.PI * 2;

/* Hoisted declarations on purpose: these are used while the module
   is still starting up, and a const arrow would not exist yet. */
function font(weight, size, style = '') {
  return `${style} ${weight} ${size}px ${view.fontFamily}`.trim();
}
function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

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

/* ---------- where the board goes ----------
   The overlay owns the edges of the frame: the topbar above, the
   decision panel below. The board takes what is left between them,
   and the whole composition scales to fit it. */
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
  /* A short, wide frame puts the decision panel down the right
     instead of across the bottom, so the board keeps its height. */
  const side = getComputedStyle(uiEl).flexDirection === 'row';
  region = side
    ? {
      x: 16,
      y,
      w: Math.max(view.minRegion.w, bot.left - pad - 16),
      h: Math.max(view.minRegion.h, cssH - 16 - y),
    }
    : {
      x: 16,
      y,
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
   What is on the board right now

   `scene` is the screen being judged, `fx` is the consequence
   playing out over it, `banner` is the strip along the bottom.
   The animation writes into these; the drawing below reads them
   and knows nothing about the decision.
   ============================================================ */
let scene = steps[0].screen;
const fx = { kind: null, p: 0 };
const banner = { text: '', tone: '', p: 0 };

function setScene(spec) { scene = spec; }
function clearFx() {
  fx.kind = null;
  fx.p = 0;
  banner.text = '';
  banner.tone = '';
  banner.p = 0;
}

/* ============================================================
   Shape and text primitives

   Flat only: solid fills, thin lines, no gradients and no fake
   lighting. Everything below the transform works in the board's
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

function ellipse(x, y, rx, ry, colour) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
  ctx.fillStyle = colour;
  ctx.fill();
}

function hline(x1, x2, y, colour = P.line, width = 1.25) {
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}

function write(str, x, y, { size = 13, weight = 700, colour = P.ink, align = 'left', style = '', max = 0 } = {}) {
  ctx.font = font(weight, size, style);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colour;
  if (max > 0) ctx.fillText(str, x, y, max);
  else ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

function widthOf(str, size, weight, style = '') {
  ctx.font = font(weight, size, style);
  return ctx.measureText(str).width;
}

/** A white card with a thin border — the shape everything sits in. */
function card(x, y, w, h, r = 14) {
  fillRounded(x, y, w, h, r, P.paper);
  strokeRounded(x, y, w, h, r, P.line, 1.5);
}

/** A tick, drawn as two strokes rather than a glyph. */
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

/* The sender's display name and the address it is nothing to do
   with, taken apart from the one string content.js holds. */
function splitFrom(str) {
  const m = String(str).match(/^(.*?)\s*<([^>]*)>\s*$/);
  return m ? { name: m[1], address: m[2] } : { name: String(str), address: '' };
}

/* ============================================================
   Step 1 — the email, laid out like a mail client
   ============================================================ */
const MAIL = { x: 36, y: 6, w: view.board.w - 72, h: 452 };

function drawEmail(spec, t) {
  const { x, y, w, h } = MAIL;
  const { name, address } = splitFrom(spec.from);
  const body = spec.lines.slice(0, -1);
  const signature = spec.lines[spec.lines.length - 1];

  ctx.save();
  rounded(x, y, w, h, 16);
  ctx.fillStyle = P.paper;
  ctx.fill();
  ctx.clip();

  /* ---- client chrome ---- */
  ctx.fillStyle = P.soft;
  ctx.fillRect(x, y, w, 46);
  hline(x, x + w, y + 46);
  write(labels.mailbox, x + 22, y + 29, { size: 13, weight: 800, colour: P.dim });
  for (let i = 0; i < 3; i++) {
    disc(x + w - 26 - i * 17, y + 23, 4.5, i === 0 ? P.line : P.metal);
  }

  /* ---- the flag that says this did not come from inside ---- */
  ctx.fillStyle = P.redTint;
  ctx.fillRect(x, y + 47, w, 44);
  ctx.fillStyle = P.red;
  ctx.fillRect(x, y + 47, 4, 44);
  const flag = labels.externalFlag;
  const fw = widthOf(flag, 11.5, 800) + 22;
  ctx.save();
  ctx.globalAlpha = 0.82 + Math.sin(t * 2.2) * 0.18;
  fillRounded(x + 22, y + 57, fw, 24, 12, P.red);
  ctx.restore();
  write(flag, x + 22 + fw / 2, y + 73, { size: 11.5, weight: 800, colour: P.paper, align: 'center' });
  write(labels.externalNote, x + 34 + fw, y + 73, { size: 13, weight: 600, colour: P.redInk });

  /* ---- who it says it is from, and the address it came from ---- */
  const fy = y + 91;
  disc(x + 52, fy + 34, 21, P.soft);
  write(name.charAt(0).toUpperCase(), x + 52, fy + 41, {
    size: 20, weight: 900, colour: P.blue, align: 'center',
  });
  write(labels.fromLabel.toUpperCase(), x + w - 22, fy + 26, {
    size: 10.5, weight: 800, colour: P.metal, align: 'right',
  });
  write(name, x + 86, fy + 30, { size: 17.5, weight: 800, colour: P.ink });
  write(address, x + 86, fy + 53, { size: 14, weight: 600, colour: P.dim });
  hline(x + 30, x + w - 30, fy + 70);

  /* ---- subject ---- */
  write(labels.subjectLabel.toUpperCase(), x + 30, y + 190, {
    size: 10.5, weight: 800, colour: P.metal,
  });
  write(spec.subject, x + 30, y + 220, { size: 25, weight: 900, colour: P.ink, max: w - 60 });

  /* ---- body ---- */
  body.forEach((line, i) => {
    write(line, x + 30, y + 264 + i * 29, { size: 16.5, weight: 600, colour: P.body, max: w - 60 });
  });

  /* ---- the link, drawn as a link ---- */
  if (spec.link) {
    const ly = y + 268 + body.length * 29;
    const lw = write(spec.link, x + 30, ly, { size: 15, weight: 700, colour: P.blue, max: w - 60 });
    ctx.fillStyle = P.blue;
    ctx.fillRect(x + 30, ly + 5, Math.min(lw, w - 60), 1.5);
  }

  /* ---- sign-off ---- */
  hline(x + 30, x + w - 30, y + 404);
  write(signature, x + 30, y + 432, { size: 15, weight: 600, colour: P.dim, style: 'italic' });

  /* ---- the consequence, over the top of it ---- */
  if (fx.kind === 'login') drawLoginPage(fx.p);
  if (fx.kind === 'reported') drawReportedStamp(fx.p);
  if (fx.kind === 'sent') {
    ctx.save();
    ctx.globalAlpha = 0.09 * fx.p;
    ctx.fillStyle = P.red;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  ctx.restore();   // clip

  strokeRounded(x, y, w, h, 16, P.line, 1.5);

  /* The attachment leaves the window, so it is drawn outside it. */
  if (fx.kind === 'sent') drawAttachmentLeaving(fx.p);
}

/** The page the link opens: your logo, somebody else's address. */
function drawLoginPage(p) {
  const { x, y, w, h } = MAIL;
  const top = y + 46;
  const py = top + (1 - easeOut(p)) * (h - 46);
  const cx = x + w / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, top, w, h - 46);
  ctx.clip();

  ctx.fillStyle = P.paper;
  ctx.fillRect(x, py, w, h - 46);

  /* address bar — the host nobody checked */
  fillRounded(x + 24, py + 16, w - 48, 34, 10, P.soft);
  strokeRounded(x + 24, py + 16, w - 48, 34, 10, P.line, 1.25);
  disc(x + 44, py + 33, 5.5, P.red);
  write(labels.loginUrl, x + 58, py + 38, { size: 13.5, weight: 700, colour: P.redInk });

  /* your logo, worn by someone else */
  fillRounded(cx - 17, py + 74, 34, 34, 9, P.blue);
  ctx.fillStyle = P.paper;
  ctx.fillRect(cx - 9, py + 82, 6, 18);
  ctx.fillRect(cx - 9, py + 94, 18, 6);

  write(labels.loginBrand, cx, py + 142, { size: 20, weight: 900, colour: P.ink, align: 'center' });

  fillRounded(cx - 170, py + 166, 340, 44, 10, P.paper);
  strokeRounded(cx - 170, py + 166, 340, 44, 10, P.line, 1.5);
  write(labels.loginUser, cx - 154, py + 194, { size: 14, weight: 600, colour: P.dim });

  write(labels.loginPassLabel.toUpperCase(), cx - 170, py + 220, {
    size: 10, weight: 800, colour: P.metal,
  });
  fillRounded(cx - 170, py + 228, 340, 44, 10, P.paper);
  strokeRounded(cx - 170, py + 228, 340, 44, 10, P.blue, 1.75);
  const dots = 9;
  for (let i = 0; i < dots; i++) disc(cx - 152 + i * 15, py + 250, 4.2, P.ink);

  fillRounded(cx - 170, py + 288, 340, 46, 10, P.blue);
  write(labels.loginButton, cx, py + 317, { size: 15, weight: 800, colour: P.paper, align: 'center' });

  ctx.restore();
}

/** The spreadsheet going out with the reply. */
function drawAttachmentLeaving(p) {
  const { x, y, w } = MAIL;
  const e = easeInOut(p);
  const cw = 184;
  const ch = 112;
  const cxA = x + w - 300 + e * 300;
  const cyA = y + 296 - e * 118;

  ctx.save();
  ctx.globalAlpha = clamp(1 - Math.max(0, (p - 0.55) / 0.45), 0, 1);
  ellipse(cxA + cw / 2, cyA + ch + 12, cw * 0.4, 8, P.shade);
  card(cxA, cyA, cw, ch, 12);
  ctx.fillStyle = P.red;
  ctx.fillRect(cxA, cyA + 10, 4, ch - 20);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 0 ? P.blue : P.line;
    ctx.fillRect(cxA + 18, cyA + 22 + i * 13, cw - 40, i === 0 ? 7 : 5);
  }
  write(labels.attachmentName, cxA + 18, cyA + 92, { size: 11.5, weight: 800, colour: P.ink, max: cw - 36 });
  write(labels.attachmentNote, cxA + 18, cyA + 106, { size: 10, weight: 600, colour: P.dim, max: cw - 36 });
  ctx.restore();
}

/** The mint stamp the right call leaves on the message. */
function drawReportedStamp(p) {
  const { x, y, w } = MAIL;
  const e = easeOut(p);
  const sw = 232;
  const sh = 66;
  ctx.save();
  ctx.globalAlpha = e;
  ctx.translate(x + w - 56 - sw / 2, y + 362);
  ctx.rotate(-0.07);
  ctx.scale(0.9 + e * 0.1, 0.9 + e * 0.1);
  fillRounded(-sw / 2, -sh / 2, sw, sh, 12, P.mintTint);
  strokeRounded(-sw / 2, -sh / 2, sw, sh, 12, P.mint, 3);
  tick(-sw / 2 + 34, 0, 26, P.mintInk, 5);
  write(labels.reportedStamp, -sw / 2 + 60, 7, { size: 14.5, weight: 900, colour: P.mintInk });
  ctx.restore();
}

/* ============================================================
   Step 2 — the stick on the desk
   ============================================================ */
const DESK = { top: 318, bottom: 458 };
const PORT = { x: 574, y: 339 };
const STICK_HOME = { cx: 330, cy: 378 };
const STICK_KITCHEN = { cx: 215, cy: 390 };

function drawUsb(spec, t) {
  const W = view.board.w;

  /* ---- the room ---- */
  ctx.fillStyle = P.wall;
  ctx.fillRect(0, 0, W, DESK.top);
  ctx.fillStyle = P.desk;
  ctx.fillRect(0, DESK.top, W, DESK.bottom - DESK.top);
  ctx.fillStyle = P.deskEdge;
  ctx.fillRect(0, DESK.top, W, 3);
  write(labels.deskLabel.toUpperCase(), W - 24, DESK.bottom - 14, {
    size: 10.5, weight: 800, colour: P.metal, align: 'right',
  });

  /* ---- where it came from, on a note on the wall ---- */
  card(150, 24, 380, 208, 14);
  write(spec.from.toUpperCase(), 176, 60, { size: 11, weight: 800, colour: P.dim, max: 328 });
  write(spec.subject, 176, 96, { size: 21, weight: 900, colour: P.ink, max: 328 });
  spec.lines.forEach((line, i) => {
    write(line, 176, 134 + i * 27, { size: 15, weight: 600, colour: P.body, max: 328 });
  });

  /* ---- the kitchen end of the desk ---- */
  drawKettle(30, DESK.top);

  /* ---- the laptop, with the port the stick would go into ---- */
  drawLaptop(fx.kind === 'plugged' ? clamp((fx.p - 0.5) / 0.5) : 0);

  /* ---- the stick ----
     It travels to whichever place the choice sends it: into the
     port, or along the desk to the kitchen end. */
  const travelling = fx.kind === 'plugged' || fx.kind === 'kitchen';
  const target = fx.kind === 'plugged'
    ? { cx: PORT.x - 120, cy: PORT.y }   // connector tip inside the port
    : STICK_KITCHEN;
  const e = travelling ? easeInOut(fx.p) : 0;
  const cx = STICK_HOME.cx + (target.cx - STICK_HOME.cx) * e;
  const cy = STICK_HOME.cy + (target.cy - STICK_HOME.cy) * e;
  const rot = fx.kind === 'kitchen' ? e * 0.16 : 0;

  const bagged = fx.kind === 'handed';
  if (bagged) drawEvidenceBag(STICK_HOME.cx, STICK_HOME.cy, fx.p);
  else ellipse(cx, cy + 46, 96, 10, P.shade);
  drawStick(cx, cy, rot, t, fx.kind === 'plugged' && fx.p > 0.55);

  if (fx.kind === 'handed') drawBagSeal(STICK_HOME.cx, STICK_HOME.cy, fx.p);
}

function drawStick(cx, cy, rot, t, hot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  /* connector, pointing at the port */
  fillRounded(70, -22, 60, 44, 4, P.metal);
  ctx.fillStyle = P.soft;
  ctx.fillRect(84, -12, 32, 8);
  ctx.fillRect(84, 4, 32, 8);

  /* body */
  fillRounded(-90, -36, 160, 72, 10, P.shell);
  fillRounded(44, -36, 12, 72, 3, P.screenOff);

  /* the logo, which is all that is written on it */
  fillRounded(-74, -20, 40, 40, 10, P.blue);
  ctx.fillStyle = P.paper;
  ctx.fillRect(-66, -12, 6, 24);
  ctx.fillRect(-66, 6, 18, 6);

  /* the light, so a still frame never looks switched off */
  const pulse = 0.55 + Math.abs(Math.sin(t * (hot ? 6 : 1.6))) * 0.45;
  ctx.save();
  ctx.globalAlpha = pulse;
  disc(22, 0, 6, hot ? P.red : P.mint);
  ctx.restore();

  ctx.restore();
}

function drawKettle(x, baseY) {
  const w = 86;
  const h = 86;
  const y = baseY - h;
  fillRounded(x, y, w, h, 16, P.metal);
  fillRounded(x + 10, y + 14, w - 20, 26, 8, P.soft);
  /* handle */
  strokeRounded(x + w - 6, y + 16, 26, 44, 13, P.shell, 7);
  /* spout */
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 18);
  ctx.lineTo(x - 18, y + 2);
  ctx.lineTo(x - 10, y + 26);
  ctx.closePath();
  ctx.fillStyle = P.metal;
  ctx.fill();
  write(labels.kettleLabel.toUpperCase(), x + w / 2, baseY + 24, {
    size: 10.5, weight: 800, colour: P.dim, align: 'center',
  });
}

function drawLaptop(hot) {
  const lx = 596;
  const ly = 150;
  const lw = 250;
  const lh = 180;

  fillRounded(lx, ly, lw, lh, 12, P.shell);
  const sx = lx + 14;
  const sy = ly + 16;
  const sw = lw - 28;
  const sh = lh - 32;
  fillRounded(sx, sy, sw, sh, 6, P.screenOff);

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = P.dim;
    ctx.fillRect(sx + 18, sy + 24 + i * 22, sw - 36 - i * 30, 9);
  }

  if (hot > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55 * hot;
    ctx.fillStyle = P.red;
    fillRounded(sx, sy, sw, sh, 6, P.red);
    ctx.restore();
    const tw = sw - 40;
    fillRounded(sx + 20, sy + sh - 36, tw, 16, 8, P.screenOff);
    fillRounded(sx + 20, sy + sh - 36, tw * hot, 16, 8, P.red);
  }

  /* base and the port on its left face */
  fillRounded(lx - 16, DESK.top + 12, lw + 36, 18, 7, P.shell);
  fillRounded(lx - 16, DESK.top + 12, lw + 36, 6, 3, P.metal);
  fillRounded(PORT.x - 2, PORT.y - 7, 14, 14, 2, P.ink);
  write(labels.portLabel, PORT.x + 5, PORT.y - 14, {
    size: 9.5, weight: 800, colour: P.dim, align: 'center',
  });
}

function drawEvidenceBag(cx, cy, p) {
  const e = easeOut(p);
  ctx.save();
  ctx.globalAlpha = e;
  fillRounded(cx - 136, cy - 62, 272, 124, 16, P.mintTint);
  strokeRounded(cx - 136, cy - 62, 272, 124, 16, P.mint, 3);
  ctx.restore();
}

function drawBagSeal(cx, cy, p) {
  const e = easeOut(p);
  ctx.save();
  ctx.globalAlpha = e;
  fillRounded(cx - 136, cy - 62, 272, 22, 11, P.mint);
  write(labels.bagLabel, cx, cy + 50, {
    size: 12, weight: 900, colour: P.mintInk, align: 'center',
  });
  disc(cx + 112, cy - 52, 19, P.mint);
  tick(cx + 112, cy - 52, 21, P.paper, 4.5);
  ctx.restore();
}

/* ============================================================
   The finished screen
   ============================================================ */
function drawDone(spec) {
  const { x, y, w, h } = MAIL;
  ctx.save();
  rounded(x, y, w, h, 16);
  ctx.fillStyle = P.paper;
  ctx.fill();
  ctx.clip();

  ctx.fillStyle = P.mintTint;
  ctx.fillRect(x, y, w, 46);
  hline(x, x + w, y + 46, P.mint, 2);
  write(spec.from, x + 22, y + 29, { size: 13, weight: 800, colour: P.mintInk });

  const cx = x + w / 2;
  disc(cx, y + 180, 54, P.mintTint);
  tick(cx, y + 180, 54, P.mintInk, 9);
  write(spec.subject, cx, y + 282, { size: 27, weight: 900, colour: P.ink, align: 'center', max: w - 80 });
  spec.lines.forEach((line, i) => {
    write(line, cx, y + 324 + i * 30, {
      size: 16.5, weight: 600, colour: P.dim, align: 'center', max: w - 80,
    });
  });

  ctx.restore();
  strokeRounded(x, y, w, h, 16, P.line, 1.5);
}

/* ============================================================
   The consequence banner along the bottom
   ============================================================ */
function drawBanner() {
  if (!banner.text || banner.p <= 0.001) return;
  const x = MAIL.x;
  const w = MAIL.w;
  const hh = 54;
  const e = easeOut(banner.p);
  const y = 478 + (1 - e) * 24;
  const good = banner.tone === 'good';

  ctx.save();
  ctx.globalAlpha = e;
  fillRounded(x, y, w, hh, 14, good ? P.mint : P.red);
  write(banner.text, x + w / 2, y + hh / 2 + 7, {
    size: 18, weight: 900, colour: good ? P.ink : P.paper, align: 'center', max: w - 48,
  });
  ctx.restore();
}

/* ============================================================
   The frame
   ============================================================ */
function draw(t) {
  const { s, ox, oy } = place();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = P.wall;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);

  if (scene.kind === 'usb') drawUsb(scene, t);
  else if (scene.kind === 'done') drawDone(scene);
  else drawEmail(scene, t);

  drawBanner();
}

function frame(nowMs) {
  pumpWaits(nowMs);
  draw(nowMs / 1000);
  requestAnimationFrame(frame);
}

/* ============================================================
   The clock

   Waits and tweens ride the animation loop rather than setTimeout,
   so a throttled tab cannot strand a step mid-consequence.
   ============================================================ */
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

/** Drive a value from 0 to 1 over `ms`, one step per animation frame. */
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
   UI
   ============================================================ */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const stepsHost = document.getElementById('steps');
const bottom = bottomEl;
document.getElementById('restart').addEventListener('click', () => { restart(); });

/* ============================================================
   State

   attempts counts every try on each step; support is how many hint
   cards that step has earned (0, 1 or 2).
   ============================================================ */
const state = { step: 0, attempts: [0, 0], support: [0, 0], feedback: null, busy: false, done: false, run: 0 };

resizeCanvas();
requestAnimationFrame(frame);

window.__win = { state, choose, restart };

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   The decision
   ============================================================ */
async function choose(stepIndex, optionIndex) {
  // Step 2 is genuinely shut until step 1 is right, console included.
  if (state.busy || state.done || stepIndex !== state.step) return;
  const step = steps[stepIndex];
  const option = step.options[optionIndex];
  if (!option) return;

  const run = state.run;
  state.busy = true;
  state.attempts[stepIndex] += 1;
  render();

  if (option.correct) {
    toast(option.consequence, 'good', 4600);
    await playOut(option, 'good', timing.right);
    if (run !== state.run) return;
    return advance(stepIndex);
  }

  toast(option.consequence, 'bad', 4600);
  await playOut(option, 'bad', timing.wrong);
  if (run !== state.run) return;

  // The screen goes back to how it was, and so does the decision:
  // same three options, nothing disabled, nothing revealed.
  clearFx();
  await wait(timing.handBack);
  if (run !== state.run) return;

  state.feedback = option.feedback;
  state.support[stepIndex] = state.attempts[stepIndex] >= 3 ? 2 : state.attempts[stepIndex] >= 2 ? 1 : 0;
  state.busy = false;
  render();
}

/** What happened, drawn on the canvas, then said on the banner. */
async function playOut(option, tone, ms) {
  fx.kind = option.fx;
  fx.p = 0;
  await tween(ms, (p) => { fx.p = p; });
  banner.text = option.banner;
  banner.tone = tone;
  banner.p = 0;
  await tween(timing.bannerIn, (p) => { banner.p = p; });
  await wait(timing.hold);
}

async function advance(stepIndex) {
  const run = state.run;
  state.feedback = null;
  bridge.progress((stepIndex + 1) / steps.length, { attempts: [...state.attempts] });

  if (stepIndex + 1 < steps.length) {
    state.step = stepIndex + 1;
    state.busy = false;
    clearFx();
    setScene(steps[state.step].screen);
    render();
    return;
  }

  state.step = steps.length;
  state.done = true;
  state.busy = false;
  clearFx();
  setScene(doneScreen);
  render();
  await wait(timing.doneHold);
  if (run !== state.run) return;
  finish();
}

function finish() {
  const total = state.attempts.reduce((a, b) => a + b, 0);
  bridge.complete({
    passed: true,
    score: Math.max(0.2, steps.length / total),
    detail: { attempts: [...state.attempts], support: [...state.support] },
  });

  showResult({
    passed: true,
    title: result.title,
    summary: result.summary,
    points: [
      ...steps.map((s, i) => result.perStep
        .replace('{name}', s.short)
        .replace('{n}', attemptsText(state.attempts[i]))),
      result.cycle,
      result.lesson,
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
  Object.assign(state, { step: 0, attempts: [0, 0], support: [0, 0], feedback: null, busy: false, done: false });
  clearFx();
  setScene(steps[0].screen);
  render();
  bridge.restart();
}

/* ---------------- Panels ---------------- */
function render() {
  stepsHost.replaceChildren(...steps.map((s, i) => {
    const done = i < state.step;
    const now = i === state.step && !state.done;
    const cls = done ? 'done' : now ? 'now' : 'locked';
    return el(`div.step.${cls}`, { title: done || now ? s.short : meta.lockedHint }, [
      el('span.n', {}, done ? labels.doneMark : String(i + 1)),
      el('span', {}, s.short),
    ]);
  }));

  if (state.done) {
    bottom.replaceChildren(el('div.deck', {}, [
      el('div.eyebrow', {}, result.title),
      el('div.note', {}, result.summary),
      el('div.opts', {}, [el('button.btn.primary', { type: 'button', onClick: () => restart() }, result.again)]),
    ]));
    regionDirty = true;
    return;
  }

  const step = steps[state.step];
  const support = step.support.slice(0, state.support[state.step]);

  bottom.replaceChildren(el('div.deck', {}, [
    el('div.eyebrow', {}, step.short),
    el('div.prompt', {}, step.prompt),
    el('div.note', {}, state.feedback ? `${state.feedback} ${meta.again}` : meta.instructions),
    ...support.map((s, i) => el('div.support' + (i === 1 ? '.firm' : ''), {}, [
      el('div', {}, [el('b', {}, s.title), el('span', {}, s.text)]),
    ])),
    // Wrong options stay live: they have to pick the right one, not the last one left.
    el('div.opts', {}, step.options.map((o, i) =>
      el('button.btn', { type: 'button', disabled: state.busy || null, onClick: () => choose(state.step, i) }, o.label))),
  ]));
  regionDirty = true;
}

function attemptsText(n) {
  return n === 1 ? result.one : result.many.replace('{n}', String(n));
}
