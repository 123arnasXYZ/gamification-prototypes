/* ============================================================
   10 — Bring Hot and Cold into quizzes
   One thing on a desk breaks the clear desk rule. Every click leaves
   a marker and answers with a temperature word instead of "wrong",
   so a near miss reads as progress. The attempt count is the score,
   and what is hiding moves on every run.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, slots, findable, clutter, bands, reveal, results, counter, summaryLine, lesson } from './content.js';

const bridge = createBridge('hot-cold');

/* Desk top in its own units: -3..3 across, -2..2 back. The group is
   laid flat, so a child's local +z is "up off the desk". */
const FACE_W = 6;
const FACE_H = 4;
const FACE_Z = 0.02;          // just above the top, where markers sit
const MAX_SPAN = Math.hypot(FACE_W / 2, FACE_H / 2);
const DESK_Y = 0.95;

/* Markers read instantly as a temperature, so they are unlit basic
   colours rather than anything the light rig can mute. */
const MARKER_COLOUR = { freezing: 0x7f9ad4, cold: 0x4a7fe0, warm: 0xe0b02a, hot: 0xe8702a, found: 0x5fe0b0 };
const WORD_COLOUR = { freezing: '#4E6FB8', cold: '#2757E2', warm: '#B07A08', hot: '#D1551A', found: '#12A177' };

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [0, 7.4, 6.4],
  lookAt: [0, 0.9, 0.1],
  background: 0x161b22,
  fog: [22, 50],
  fit: { width: 8.4, height: 6.4 },
  orbitLimits: {
    minPolarAngle: 0.45, maxPolarAngle: 1.05,
    minAzimuthAngle: -0.34, maxAzimuthAngle: 0.34,
    minDistance: 7, maxDistance: 13,
  },
});

addLightRig(stage.scene, {
  sky: 0xe4ebf4, ground: 0x2a3038, hemi: 0.95,
  keyColor: 0xfff2e0, keyIntensity: 1.5, keyPos: [4, 12, 8],
  shadowSize: 11, fillColor: 0x4a6f9c, fillIntensity: 0.55,
});

/* ---------------- Office ---------------- */
{
  const floor = box(30, 0.2, 20, 0x6c737d, { roughness: 1 });
  floor.position.set(0, -0.1, 0);
  const wall = box(30, 10, 0.3, 0xcbd2db, { roughness: 0.95 });
  wall.position.set(0, 5, -4.2);
  stage.scene.add(floor, wall);

  const top = new THREE.Mesh(roundedBox(FACE_W + 0.7, 0.16, FACE_H + 0.7, 0.05), mat(0xd9cdb8, { roughness: 0.8 }));
  top.position.y = DESK_Y - 0.08;
  top.castShadow = true;
  top.receiveShadow = true;
  stage.scene.add(top);

  for (const x of [-(FACE_W / 2 - 0.1), FACE_W / 2 - 0.1]) {
    for (const z of [-(FACE_H / 2 - 0.1), FACE_H / 2 - 0.1]) {
      const leg = box(0.12, DESK_Y - 0.16, 0.12, 0x5b6573, { roughness: 0.6 });
      leg.position.set(x, (DESK_Y - 0.16) / 2, z);
      stage.scene.add(leg);
    }
  }
}

/* ---------------- Desk clutter ---------------- */
/* Every piece sits in the desk's own frame, where local +z is up off
   the top, so a model only has to be built lying down once. */
function place(group, item, lift = 0.012) {
  group.rotation.z = item.spin ?? ((item.u * 1.7 + item.v * 2.3) % 0.6) - 0.3;
  group.position.set(item.u, item.v, FACE_Z + lift);
  panel.add(group);
  return group;
}

function printedLines(host, w, rows, colour = 0xb9bec8) {
  rows.forEach((dy, i) => {
    const line = box(w * (i % 2 ? 0.78 : 1), 0.035, 0.004, colour, { roughness: 1, cast: false });
    line.position.set(0, dy, 0.016);
    host.add(line);
  });
}

const BUILD = {
  paper(item) {
    const g = new THREE.Group();
    const page = box(0.95, 0.7, 0.025, 0xf6f3ec, { roughness: 0.95 });
    page.castShadow = true;
    g.add(page);
    printedLines(g, 0.62, [0.2, 0.06, -0.08]);
    return place(g, item);
  },

  note(item) {
    const g = new THREE.Group();
    const square = box(0.46, 0.46, 0.02, 0xf2d85c, { roughness: 0.95 });
    square.castShadow = true;
    g.add(square);
    printedLines(g, 0.3, [0.1, -0.02, -0.13], 0x8d8464);
    return place(g, item, 0.02);
  },

  folder(item) {
    const g = new THREE.Group();
    const sheet = box(0.92, 0.66, 0.02, 0xfaf8f2, { roughness: 0.95 });
    sheet.position.set(0.06, -0.04, 0.02);
    printedLines(g, 0.5, [0.12, 0.0, -0.12]);
    const cover = box(1.02, 0.74, 0.04, 0xd8a94e, { roughness: 0.9 });
    cover.castShadow = true;
    const tab = box(0.3, 0.12, 0.04, 0xd8a94e, { roughness: 0.9 });
    tab.position.set(-0.3, 0.42, 0);
    g.add(cover, tab, sheet);
    return place(g, item, 0.015);
  },

  badge(item) {
    const g = new THREE.Group();
    const card = box(0.34, 0.46, 0.02, 0xfbfbf8, { roughness: 0.9 });
    card.castShadow = true;
    const strip = box(0.34, 0.12, 0.022, 0x2757e2, { roughness: 0.8 });
    strip.position.set(0, 0.15, 0.004);
    const photo = box(0.14, 0.16, 0.022, 0xb9bec8, { roughness: 1, cast: false });
    photo.position.set(-0.07, -0.03, 0.004);
    // The lanyard, coiled next to it rather than modelled properly
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 20), mat(0x2757e2, { roughness: 0.8 }));
    loop.position.set(0.2, -0.3, 0.02);
    loop.scale.set(1, 0.6, 1);
    g.add(card, strip, photo, loop);
    return place(g, item, 0.015);
  },

  usb(item) {
    const g = new THREE.Group();
    const body = box(0.34, 0.15, 0.08, 0x3a3f47, { roughness: 0.6 });
    body.position.z = 0.04;
    body.castShadow = true;
    const tip = box(0.14, 0.11, 0.05, 0xb6bcc6, { roughness: 0.4, metalness: 0.5 });
    tip.position.set(0.23, 0, 0.035);
    g.add(body, tip);
    return place(g, item, 0.012);
  },

  tray(item) {
    const g = new THREE.Group();
    const floor = box(1.2, 0.9, 0.04, 0x5b6573, { roughness: 0.6 });
    floor.position.z = 0.02;
    const lip = box(1.2, 0.06, 0.16, 0x5b6573, { roughness: 0.6 });
    lip.position.set(0, -0.42, 0.08);
    const stack = box(1.0, 0.72, 0.09, 0xfaf8f2, { roughness: 0.95 });
    stack.position.z = 0.08;
    stack.castShadow = true;
    g.add(floor, lip, stack);
    printedLines(g, 0.52, [0.16, 0.02], 0xb9bec8);
    g.children.slice(-2).forEach((l) => { l.position.z = 0.13; });
    return place(g, item, 0.012);
  },
  notebook(item) {
    const g = new THREE.Group();
    const cover = box(0.8, 1.05, 0.09, 0x2757e2, { roughness: 0.85 });
    cover.position.z = 0.045;
    cover.castShadow = true;
    const band = box(0.06, 1.05, 0.095, 0x1b2e5e, { roughness: 0.8 });
    band.position.set(0.3, 0, 0.045);
    g.add(cover, band);
    return place(g, item, 0.012);
  },

  phone(item) {
    const g = new THREE.Group();
    const body = box(0.42, 0.78, 0.05, 0x10131a, { roughness: 0.5 });
    body.position.z = 0.025;
    body.castShadow = true;
    const screen = box(0.34, 0.66, 0.052, 0x3b4252, { roughness: 0.3, cast: false });
    screen.position.z = 0.027;
    g.add(body, screen);
    return place(g, item, 0.012);
  },

  stapler(item) {
    const g = new THREE.Group();
    const base = box(0.62, 0.2, 0.09, 0x4b515c, { roughness: 0.6 });
    base.position.z = 0.045;
    const arm = box(0.56, 0.17, 0.08, 0xe0234e, { roughness: 0.5 });
    arm.position.set(-0.02, 0.01, 0.12);
    arm.rotation.y = 0.05;
    arm.castShadow = true;
    g.add(base, arm);
    return place(g, item, 0.012);
  },

  calculator(item) {
    const g = new THREE.Group();
    const body = box(0.48, 0.7, 0.06, 0x8e97a4, { roughness: 0.7 });
    body.position.z = 0.03;
    body.castShadow = true;
    const display = box(0.36, 0.16, 0.062, 0xcfe0d4, { roughness: 0.4, cast: false });
    display.position.set(0, 0.22, 0.032);
    g.add(body, display);
    for (let r = 0; r < 3; r++) {
      const row = box(0.36, 0.05, 0.062, 0x5b6573, { roughness: 0.8, cast: false });
      row.position.set(0, -0.02 - r * 0.12, 0.032);
      g.add(row);
    }
    return place(g, item, 0.012);
  },

  /** What was buried: printed, stamped, and never collected. */
  printout(item) {
    const g = new THREE.Group();
    const page = box(0.95, 0.7, 0.025, 0xfbfbf8, { roughness: 0.95 });
    page.castShadow = true;
    g.add(page);
    printedLines(g, 0.62, [0.22, 0.09, -0.04, -0.17]);
    const stamp = box(0.34, 0.12, 0.004, 0xe0234e, { roughness: 1, cast: false });
    stamp.position.set(0.22, 0.26, 0.016);
    g.add(stamp);
    return place(g, item, 0.012);
  },
  laptop(item) {
    const g = new THREE.Group();
    const base = box(1.12, 0.78, 0.06, 0x3a3f47, { roughness: 0.5 });
    base.position.z = 0.03;
    base.castShadow = true;
    const pad = box(0.78, 0.46, 0.065, 0x4b515c, { roughness: 0.6, cast: false });
    pad.position.set(0, -0.12, 0.033);
    // The lid stands up out of the desk, leaning back a little
    const lid = box(1.12, 0.06, 0.72, 0x3a3f47, { roughness: 0.5 });
    lid.position.set(0, 0.36, 0.38);
    lid.rotation.x = 0.26;
    lid.castShadow = true;
    const screen = box(0.96, 0.02, 0.58, 0xcfe0f5, { roughness: 0.3, cast: false });
    screen.position.set(0, 0.33, 0.38);
    screen.rotation.x = 0.26;
    g.add(base, pad, lid, screen);
    return place(g, item, 0.012);
  },

  mug(item) {
    const g = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.32, 16), mat(0x2757e2, { roughness: 0.7 }));
    cup.rotation.x = Math.PI / 2;          // stand it up out of the desk
    cup.position.z = 0.16;
    cup.castShadow = true;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 6, 14), mat(0x2757e2, { roughness: 0.7 }));
    handle.position.set(0.22, 0, 0.17);
    handle.rotation.y = Math.PI / 2;
    g.add(cup, handle);
    return place(g, item, 0.012);
  },

  pens(item) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.36, 14), mat(0x8e97a4, { roughness: 0.7 }));
    pot.rotation.x = Math.PI / 2;
    pot.position.z = 0.18;
    pot.castShadow = true;
    g.add(pot);
    [[0.05, 0x10131a, 0.1], [-0.05, 0xe0234e, -0.12]].forEach(([dx, colour, lean]) => {
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.58, 8), mat(colour, { roughness: 0.7 }));
      pen.rotation.x = Math.PI / 2;
      pen.rotation.z = lean;
      pen.position.set(dx, dx, 0.42);
      g.add(pen);
    });
    return place(g, item, 0.012);
  },
};

/* ---------------- The desk top ---------------- */
const panel = new THREE.Group();
panel.position.set(0, DESK_Y, 0);
panel.rotation.x = -Math.PI / 2;      // lie the quiz surface flat
stage.scene.add(panel);

// The top is its own plane: it is the only pickable thing, so the
// clutter sitting on it can never swallow a click.
const face = new THREE.Mesh(new THREE.PlaneGeometry(FACE_W, FACE_H), mat(0xe3d7c2, { roughness: 0.9 }));
face.receiveShadow = true;
panel.add(face);
stage.pickable(face, { kind: 'face' });

/* Everything dealt out this run lives here, so a restart can clear
   the desk and lay it out again from scratch. */
const desk = new THREE.Group();
panel.add(desk);

/* Markers, and the reveal that only appears once it is found. */
const markers = new THREE.Group();
panel.add(markers);

const spot = new THREE.Group();
spot.visible = false;
panel.add(spot);
const spotRing = new THREE.Mesh(
  new THREE.RingGeometry(0.42, 0.52, 32),
  new THREE.MeshBasicMaterial({ color: 0x5fe0b0, transparent: true, side: THREE.DoubleSide, depthTest: false }),
);
spotRing.renderOrder = 12;
spotRing.position.z = FACE_Z + 0.22;   // clears the tallest thing on the desk
const spotTag = labelSprite(reveal.ring, '#12A177', 0.62);
spotTag.material.depthTest = false;
spotTag.renderOrder = 13;
spotTag.position.set(0, 0, FACE_Z + 0.75);
spot.add(spotRing, spotTag);


/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const hintEl = document.getElementById('hint');
const readingEl = document.getElementById('reading');
const wordEl = document.getElementById('word');
const noteEl = document.getElementById('note');
const stats = statBar(document.getElementById('stats'), [
  { id: 'attempts', label: counter.label, value: 0 },
]);
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
const state = { attempts: 0, target: null, lastAnswer: null, best: MAX_SPAN, busy: false, done: false, run: 0 };

stage.onPick((obj, data, hit) => {
  if (!data || data.kind !== 'face' || !hit) return;
  // hit.point is world space; the desk's own frame is the quiz's coordinates.
  const local = panel.worldToLocal(hit.point.clone());
  guess(local.x, local.y);
});

stage.onFrame((dt, t) => {
  if (!state.done) return;
  spotRing.scale.setScalar(1 + Math.sin(t * 3) * 0.07);
  spotRing.material.opacity = 0.75 + Math.sin(t * 3) * 0.2;
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__hc = { state, guessAt: guess, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   The guess
   ============================================================ */
/** u, v are desk-local: -3..3 across the top, -2..2 back across it. */
async function guess(u, v) {
  if (state.busy || state.done) return;
  state.busy = true;
  const run = state.run;

  state.attempts += 1;
  stats.set('attempts', state.attempts);

  const d = Math.hypot(u - state.target.u, v - state.target.v);
  const band = bands.find((b) => d <= b.max) ?? bands[bands.length - 1];
  state.best = Math.min(state.best, d);

  await dropMarker(u, v, band.id);
  if (run !== state.run) return;

  setReading(band);
  bridge.progress(1 - state.best / MAX_SPAN, { attempts: state.attempts });

  if (band.id !== 'found') {
    state.busy = false;
    hintEl.textContent = meta.retryHint;
    return;
  }

  await found();
}

/** The payoff: a ring on the spot, and a result that describes the search. */
async function found() {
  const run = state.run;
  state.done = true;
  spot.position.set(state.target.u, state.target.v, 0);
  spot.visible = true;
  spotRing.scale.setScalar(0.2);
  await tween({ ms: 420, easing: ease.outBack, onUpdate: (_, e) => spotRing.scale.setScalar(0.2 + 0.8 * e) });
  if (run !== state.run) return;

  toast(reveal.toast.replace('{where}', state.target.where), 'good', 4200);
  hintEl.textContent = meta.doneHint;
  await wait(1500);
  if (run !== state.run) return;

  state.busy = false;
  const r = results.find((x) => state.attempts <= x.maxAttempts) ?? results[results.length - 1];
  // Always passed — the attempt count is the grade, not a pass mark.
  bridge.complete({
    passed: true,
    score: Math.max(0.2, 1 - (state.attempts - 1) * 0.12),
    detail: { attempts: state.attempts, found: state.target.id },
  });

  showResult({
    passed: true,
    title: r.title,
    summary: r.summary,
    points: [
      summaryLine.replace('{n}', attemptsText(state.attempts)),
      lesson,
    ],
    actions: [
      { label: 'Close', kind: 'ghost' },
      { label: 'Try again', kind: 'primary', onClick: restart },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, {
    attempts: 0,
    // dealDesk reads and updates state.lastAnswer, so it runs first
    // A fresh deal: everything moves, and a different object is the
    // problem, so a remembered answer is worth nothing.
    target: dealDesk(),
    best: MAX_SPAN,
    busy: false,
    done: false,
  });
  stats.set('attempts', 0);
  markers.clear();
  spot.visible = false;
  readingEl.classList.remove('on');
  hintEl.textContent = meta.instructions;
  bridge.restart();
}

/* ---------------- Helpers ---------------- */
function setReading(band) {
  wordEl.textContent = band.word;
  wordEl.style.color = WORD_COLOUR[band.id];
  noteEl.textContent = band.line;
  readingEl.classList.add('on');
}

/** A disc left where they looked, coloured by how close it was. */
function dropMarker(u, v, bandId) {
  const g = new THREE.Group();
  // depthTest off: a marker that lands on the notebook or the tray
  // must still be visible, not buried inside whatever it hit.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 24),
    new THREE.MeshBasicMaterial({ color: MARKER_COLOUR[bandId], transparent: true, depthTest: false }),
  );
  const edge = new THREE.Mesh(
    new THREE.RingGeometry(0.17, 0.215, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false }),
  );
  edge.position.z = 0.001;
  disc.renderOrder = 10;
  edge.renderOrder = 11;
  g.add(disc, edge);
  g.position.set(u, v, FACE_Z + 0.05);
  markers.add(g);
  return tween({ ms: 240, easing: ease.outBack, onUpdate: (_, e) => g.scale.setScalar(0.3 + 0.7 * e) });
}

/**
 * Clear the desk and lay it out again: every object gets a different
 * slot, and one of the findable ones becomes this run's answer.
 * Returns that answer, with the place it landed.
 */
function dealDesk() {
  desk.clear();

  const open = slots.slice();
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [open[i], open[j]] = [open[j], open[i]];
  }

  // Only one findable thing is ever on the desk: the one being looked
  // for. The other four are not hiding elsewhere — they are not here
  // at all, so nothing on the desk can contradict the answer.
  const choices = findable.filter((f) => f.id !== state.lastAnswer);
  const answer = choices[Math.floor(Math.random() * choices.length)];
  state.lastAnswer = answer.id;

  // One object per slot and no more objects than slots, so nothing is
  // ever dealt on top of anything else.
  let at = null;
  [answer, ...clutter].slice(0, open.length).forEach((item, i) => {
    desk.add(BUILD[item.kind]({ ...item, ...open[i] }));
    if (i === 0) at = open[i];
  });

  return { ...answer, u: at.u, v: at.v };
}

function attemptsText(n) {
  return n === 1 ? counter.one : counter.many.replace('{n}', String(n));
}

function labelSprite(text, colour = '#10131A', scale = 1) {
  const tex = canvasTexture(512, 128, (c, cw, ch) => {
    c.clearRect(0, 0, cw, ch);
    c.font = '800 58px Urbanist, Helvetica, Arial, sans-serif';
    const w = Math.min(cw - 8, c.measureText(text).width + 70);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect((cw - w) / 2, 14, w, ch - 28, 50);
    c.fill();
    c.fillStyle = colour;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch / 2 + 3);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(2.4 * scale, 0.6 * scale, 1);
  return s;
}
