/* ============================================================
   12 — Turn your onboarding into an adventure
   A corridor instead of a slide deck. The learner walks a pawn along
   it, and the four things a new starter would normally be *told* are
   objects they have to go and find. The exit is padlocked until all
   four are collected, so finishing requires exploring.

   The camera only slides along x — no orbit — so the whole thing
   reads as a side-on world rather than a 3D model to be inspected.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, stations, bonus, door, results } from './content.js';

const bridge = createBridge('onboarding-adventure');

const COLORS = {
  dim:   0x9aa1ab,
  found: 0x5fe0b0,
  blue:  0x2757e2,
  wood:  0xc9b391,
  wall:  0xeef1f6,
  floor: 0xdcd6cc,
  skin:  0xcfd6e0,
  metal: 0xb8bec8,
};

const STATION_X = [-9, -3.5, 2, 7.5];
const DOOR_X = 13;
const START_X = -13.4;
const NEAR = 2.3;           // how close counts as "standing at" something
const SPEED = 3.6;          // world units per second

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 38,
  cameraPos: [START_X, 3.0, 13.5],
  lookAt: [START_X, 1.5, 0],
  background: 0xe7edf5,
  fog: [26, 70],
  shadows: true,
  orbit: false,             // side-on world; the camera pans, never turns
  fit: { width: 13.5, height: 7.4 },
});

const rig = addLightRig(stage.scene, {
  sky: 0xf2f7ff, ground: 0x9a927f, hemi: 1.05,
  keyColor: 0xfff6e8, keyIntensity: 1.9, keyPos: [5, 11, 7],
  shadowSize: 9, fillColor: 0x7d9bc4, fillIntensity: 0.55,
});
// The shadow box is small so it stays sharp, which means it has to travel
// with the learner instead of sitting over the middle of a 30-unit corridor.
rig.key.target.position.set(0, 0, 0);
stage.scene.add(rig.key.target);

/* ---------------- The corridor ---------------- */
{
  const floor = box(40, 0.3, 9, COLORS.floor, { roughness: 1 });
  floor.position.set(0, -0.15, 0);

  const wall = box(40, 9, 0.4, COLORS.wall, { roughness: 0.95 });
  wall.position.set(0, 4.5, -3.4);

  const skirting = box(40, 0.3, 0.1, 0xc3c9d2, { roughness: 1 });
  skirting.position.set(0, 0.15, -3.18);

  stage.scene.add(floor, wall, skirting);

  // A line on the floor, so walking feels like following something
  const guide = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.1), mat(0xc2bab0));
  guide.rotation.x = -Math.PI / 2;
  guide.position.set(0, 0.01, 1.3);
  stage.scene.add(guide);

  // Window strip up high: cheap depth cue that the corridor keeps going
  for (let i = -4; i <= 4; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), mat(0xbcd6ef, { roughness: 0.3 }));
    win.position.set(i * 4.2, 4.2, -3.18);
    stage.scene.add(win);
  }
}

/* ---------------- Stations ---------------- */
const nodes = stations.map((s, i) => {
  const g = new THREE.Group();
  g.position.set(STATION_X[i], 0, -1.5);

  const plinth = new THREE.Mesh(roundedBox(1.9, 1.05, 1.1, 0.06), mat(COLORS.dim, { roughness: 0.85 }));
  plinth.position.y = 0.52;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const post = box(0.12, 1.3, 0.12, 0xaeb5bf, { roughness: 0.7 });
  post.position.y = 1.7;

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.54),
    new THREE.MeshBasicMaterial({ map: signTexture(s.name), transparent: true, depthWrite: false }),
  );
  sign.position.y = 2.6;

  // The lamp is the "is this done" tell: grey and flat, then mint and lit
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), mat(COLORS.dim, { roughness: 0.4, emissive: 0x000000 }));
  lamp.position.y = 2.28;

  const tick = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshBasicMaterial({ map: tickTexture(), transparent: true, depthWrite: false }),
  );
  tick.position.set(0, 1.45, 0.58);
  tick.visible = false;

  // Pulses on the floor only while the learner is standing here
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.12, 36),
    new THREE.MeshBasicMaterial({ color: COLORS.blue, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.03, 1.5);
  ring.visible = false;

  g.add(plinth, post, sign, lamp, tick, ring);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'station', index: i });
  return { g, plinth, lamp, tick, ring, sign };
});

/* ---------------- The optional extra ---------------- */
// Deliberately small and unannounced. Nothing gates on it.
const mug = new THREE.Group();
{
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.22, 14), mat(0xf2f0eb, { roughness: 0.5 }));
  cup.castShadow = true;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 6, 14), mat(0xf2f0eb, { roughness: 0.5 }));
  handle.position.set(0.15, 0, 0);
  handle.rotation.y = Math.PI / 2;
  mug.add(cup, handle);
  mug.position.set(STATION_X[0] + 0.62, 1.16, -1.1);
  stage.scene.add(mug);
  stage.pickable(mug, { kind: 'bonus' });
}

/* ---------------- The locked door ---------------- */
const doorParts = {};
{
  const g = new THREE.Group();
  g.position.set(DOOR_X, 0, -3.1);

  const frame = box(3.2, 3.6, 0.34, 0x8c939d, { roughness: 0.8 });
  frame.position.y = 1.8;

  const leafL = new THREE.Group();
  const leafR = new THREE.Group();
  for (const [leaf, sign] of [[leafL, -1], [leafR, 1]]) {
    const slab = new THREE.Mesh(roundedBox(1.35, 3.1, 0.16, 0.04), mat(COLORS.wood, { roughness: 0.9 }));
    slab.position.x = sign * 0.7;       // offset so the group rotates on its hinge
    slab.castShadow = true;
    leaf.add(slab);
    leaf.position.set(sign * 0.72, 1.65, 0.16);
  }

  const padlock = new THREE.Group();
  {
    const body = new THREE.Mesh(roundedBox(0.5, 0.44, 0.22, 0.05), mat(0x3a414b, { roughness: 0.5 }));
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 18, Math.PI), mat(COLORS.metal, { metalness: 0.5, roughness: 0.3 }));
    shackle.position.y = 0.22;
    padlock.add(body, shackle);
    padlock.position.set(0, 1.65, 0.42);
    padlock.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  const exitSign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 0.48),
    new THREE.MeshBasicMaterial({ map: signTexture(door.label), transparent: true, depthWrite: false }),
  );
  exitSign.position.set(0, 3.95, 0.2);

  g.add(frame, leafL, leafR, padlock, exitSign);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'door' });
  Object.assign(doorParts, { g, leafL, leafR, padlock });
}

/* ---------------- The learner ---------------- */
const avatar = pawn(COLORS.blue);
avatar.position.set(START_X, 0, 1.3);
stage.scene.add(avatar);

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const hint = document.getElementById('hint');
const card = document.getElementById('card');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const restartBtn = document.getElementById('restart');
leftBtn.textContent = meta.walkLeft;
rightBtn.textContent = meta.walkRight;
restartBtn.textContent = meta.restart;
restartBtn.addEventListener('click', restart);

const stats = statBar(document.getElementById('stats'), [
  { id: 'found', label: meta.counter, value: 0, max: stations.length, color: '#12A177' },
]);

/* ---------------- State ---------------- */
const state = {
  x: START_X,
  dir: 0,                  // -1, 0, 1 while a walk button or arrow key is held
  facing: 1,
  found: [],               // station indexes, in the order they were found
  bonus: false,
  doorOpen: false,
  busy: false,
  walking: false,          // true while a scripted walk is running
  over: false,
};

/* Walk controls: held buttons and arrow keys both just set state.dir, and
   the frame loop does the moving. */
for (const [node, dir] of [[leftBtn, -1], [rightBtn, 1]]) {
  node.addEventListener('pointerdown', () => { state.dir = dir; });
  node.addEventListener('pointerup', () => { if (state.dir === dir) state.dir = 0; });
  node.addEventListener('pointerleave', () => { if (state.dir === dir) state.dir = 0; });
  node.addEventListener('pointercancel', () => { if (state.dir === dir) state.dir = 0; });
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') state.dir = -1;
  else if (e.key === 'ArrowRight') state.dir = 1;
});
window.addEventListener('keyup', (e) => {
  if ((e.key === 'ArrowLeft' && state.dir === -1) || (e.key === 'ArrowRight' && state.dir === 1)) state.dir = 0;
});

stage.onPick((obj, data) => {
  if (!data || state.busy || state.over) return;
  if (data.kind === 'station') open(data.index);
  else if (data.kind === 'bonus') takeBonus();
  else if (data.kind === 'door') enterDoor();
});

/* ---------------- Frame loop ---------------- */
stage.onFrame((dt, t) => {
  if (state.dir && !state.busy && !state.over) {
    state.x = clampWalk(state.x + state.dir * SPEED * dt);
    state.facing = state.dir;
    // Reaching an open door is the ending; no extra button needed
    if (state.doorOpen && state.x >= DOOR_X - 1.2) { enterDoor(); }
  }

  const walking = (!!state.dir || state.walking) && !state.over;
  avatar.position.x = state.x;
  avatar.position.y = walking ? Math.abs(Math.sin(t * 9)) * 0.09 : 0;
  avatar.rotation.z = walking ? Math.sin(t * 9) * 0.05 : 0;
  avatar.rotation.y = state.facing > 0 ? 0.4 : -0.4;

  // Camera trails the learner instead of snapping, which keeps the pan calm
  stage.camera.position.x += (state.x - stage.camera.position.x) * Math.min(1, dt * 4);
  stage.camera.lookAt(stage.camera.position.x, 1.5, 0);
  rig.key.position.x = stage.camera.position.x + 5;
  rig.key.target.position.x = stage.camera.position.x;
  rig.key.target.updateMatrixWorld();

  // Only the thing you are standing next to invites a click
  nodes.forEach((n, i) => {
    const near = !state.found.includes(i) && Math.abs(state.x - STATION_X[i]) < NEAR;
    n.ring.visible = near;
    if (near) {
      n.ring.scale.setScalar(1 + Math.sin(t * 3.4) * 0.07);
      n.ring.material.opacity = 0.45 + Math.sin(t * 3.4) * 0.3;
    }
  });

  if (!state.bonus) mug.rotation.y = Math.sin(t * 0.8) * 0.3;
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__adv = { state, walkTo, open, takeBonus, enterDoor, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Actions — every one async so the console can drive them
   ============================================================ */

/** Walk to a station (0-3). Pass 'door' to walk to the exit. */
async function walkTo(target) {
  if (state.over) return;
  const to = clampWalk(target === 'door' ? DOOR_X - 1.3 : STATION_X[target] ?? state.x);
  const from = state.x;
  if (Math.abs(to - from) < 0.05) return;
  state.facing = to > from ? 1 : -1;
  state.busy = true;
  state.walking = true;
  const ms = Math.min(2200, Math.abs(to - from) / SPEED * 1000);
  await tween({
    ms, easing: ease.inOutCubic,
    onUpdate: (_, e) => { state.x = from + (to - from) * e; },
  });
  state.x = to;
  state.walking = false;
  state.busy = false;
  paintHint();
}

/** Open a station's card. Collecting happens on opening — looking is finding. */
async function open(i) {
  if (state.over || state.busy) return;
  if (Math.abs(state.x - STATION_X[i]) > NEAR) await walkTo(i);

  const s = stations[i];
  const fresh = !state.found.includes(i);
  if (fresh) {
    state.found.push(i);
    stats.set('found', state.found.length);
    bridge.progress(state.found.length / stations.length, { found: state.found.length });
    await light(nodes[i]);
    toast(s.found, 'good', 2000);
  }

  showCard(s.name, s.lines);
  if (fresh && state.found.length === stations.length) await openDoor();
  paintHint();
}

/** The extra nobody asked for. */
async function takeBonus() {
  if (state.over || state.bonus || state.busy) return;
  if (Math.abs(state.x - mug.position.x) > NEAR) await walkTo(0);
  state.bonus = true;
  state.busy = true;
  await tween({
    ms: 420, easing: ease.outCubic,
    onUpdate: (_, e) => {
      mug.position.y = 1.16 + e * 0.7;
      mug.scale.setScalar(Math.max(0.01, 1 - e));
    },
  });
  mug.visible = false;
  stage.setPickEnabled(mug, false);
  state.busy = false;
  toast(bonus.found, 'good', 2600);
  showCard(bonus.label, bonus.lines);
}

/** Try the exit. Shut and rattling until all four stops are found. */
async function enterDoor() {
  if (state.over) return;
  if (!state.doorOpen) {
    if (state.busy) return;
    state.busy = true;
    await shake(doorParts.padlock);
    state.busy = false;
    toast(door.locked, '', 2400);
    return;
  }
  if (state.busy) return;
  state.busy = true;
  state.walking = true;
  state.dir = 0;
  hideCard();
  const from = state.x;
  await tween({
    ms: 1100, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      state.x = from + (DOOR_X - from) * e;
      avatar.position.z = 1.3 - e * 4.0;
      avatar.scale.setScalar(1 - e * 0.25);
    },
  });
  state.walking = false;
  state.busy = false;
  finish();
}

function restart() {
  document.querySelector('.scrim')?.remove();
  Object.assign(state, {
    x: START_X, dir: 0, facing: 1, found: [], bonus: false,
    doorOpen: false, busy: false, walking: false, over: false,
  });
  avatar.position.set(START_X, 0, 1.3);
  avatar.scale.setScalar(1);
  stage.camera.position.x = START_X;

  nodes.forEach((n) => {
    n.plinth.material.color.setHex(COLORS.dim);
    n.lamp.material.color.setHex(COLORS.dim);
    n.lamp.material.emissive.setHex(0x000000);
    n.tick.visible = false;
    n.ring.visible = false;
  });

  mug.visible = true;
  mug.position.y = 1.16;
  mug.scale.setScalar(1);
  stage.setPickEnabled(mug, true);

  doorParts.padlock.visible = true;
  doorParts.padlock.position.y = 1.65;
  doorParts.padlock.rotation.z = 0;
  doorParts.padlock.scale.setScalar(1);
  doorParts.leafL.rotation.y = 0;
  doorParts.leafR.rotation.y = 0;

  stats.set('found', 0);
  hideCard();
  paintHint();
  bridge.restart();
}

/* ============================================================
   Scene reactions
   ============================================================ */

/** A found station stops being grey. This is the only progress display
    that matters — the counter just repeats it in words. */
async function light(n) {
  n.tick.visible = true;
  n.tick.scale.setScalar(0.01);
  n.plinth.material.color.setHex(COLORS.found);
  n.lamp.material.color.setHex(COLORS.found);
  n.lamp.material.emissive.setHex(0x1b5a44);
  await tween({ ms: 420, easing: ease.outBack, onUpdate: (_, e) => n.tick.scale.setScalar(Math.max(0.01, e)) });
}

async function openDoor() {
  state.busy = true;
  toast(door.opening, 'good', 2600);
  await tween({
    ms: 520, easing: ease.outCubic,
    onUpdate: (_, e) => {
      doorParts.padlock.position.y = 1.65 - e * 1.5;
      doorParts.padlock.rotation.z = e * 2.4;
      doorParts.padlock.scale.setScalar(Math.max(0.01, 1 - e * 0.6));
    },
  });
  doorParts.padlock.visible = false;
  await tween({
    ms: 700, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      doorParts.leafL.rotation.y = e * 1.15;
      doorParts.leafR.rotation.y = -e * 1.15;
    },
  });
  state.doorOpen = true;
  state.busy = false;
  paintHint();
}

function finish() {
  state.over = true;
  const points = state.found.map((i) => `<b style="color:var(--good)">✓ ${stations[i].name}</b> — ${stations[i].lines[0]}`);
  points.push(state.bonus ? results.bonusPoint : results.noBonusPoint);
  points.push(results.closing);

  bridge.complete({
    passed: true,
    score: state.bonus ? 1 : 0.9,
    detail: { order: state.found.map((i) => stations[i].name), bonus: state.bonus },
  });

  showResult({
    passed: true,
    title: results.title,
    summary: results.summary,
    points,
    actions: [
      { label: results.close, kind: 'ghost' },
      { label: results.again, kind: 'primary', onClick: restart },
    ],
  });
}

/* ============================================================
   Panels
   ============================================================ */
function showCard(title, lines) {
  card.hidden = false;
  card.replaceChildren(
    el('div.eyebrow', {}, `${state.found.length} / ${stations.length}`),
    el('h2', {}, title),
    ...lines.map((l) => el('p', {}, l)),
    el('div.actions', {}, [
      el('button.btn.primary', { type: 'button', onclick: hideCard }, meta.collect),
    ]),
  );
}

function hideCard() {
  card.hidden = true;
  card.replaceChildren();
}

function paintHint() {
  if (state.over) { hint.textContent = results.title; return; }
  const nearStation = nodes.findIndex((_, i) =>
    !state.found.includes(i) && Math.abs(state.x - STATION_X[i]) < NEAR);
  if (nearStation >= 0) hint.textContent = meta.hintNear;
  else if (state.doorOpen) hint.textContent = meta.hintDoorOpen;
  else if (state.found.length === 0) hint.textContent = meta.hintStart;
  else if (Math.abs(state.x - DOOR_X) < 3) hint.textContent = meta.hintDoorLocked;
  else hint.textContent = meta.hintWalking;
}

/* ============================================================
   Helpers
   ============================================================ */
/** The door is a wall until it is open, so the walk clamps short of it. */
function clampWalk(x) {
  const max = state.doorOpen ? DOOR_X : DOOR_X - 1.3;
  return Math.max(START_X - 1.5, Math.min(max, x));
}

/** Faceless capsule-and-sphere figure. No face, so it can be anyone. */
function pawn(colour) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.62, 6, 14), mat(colour, { roughness: 0.7 }));
  body.position.y = 0.62;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 14), mat(COLORS.skin, { roughness: 0.75 }));
  head.position.y = 1.32;
  head.castShadow = true;
  g.add(body, head);
  return g;
}

function shake(obj) {
  const x = obj.position.x;
  return tween({
    ms: 360,
    onUpdate: (_, e, p) => { obj.position.x = x + Math.sin(p * Math.PI * 9) * 0.07 * (1 - p); },
    onDone: () => { obj.position.x = x; },
  });
}

function signTexture(text) {
  return canvasTexture(620, 140, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    const r = 54;
    c.beginPath();
    c.moveTo(r, 8); c.arcTo(w - 8, 8, w - 8, h - 8, r); c.arcTo(w - 8, h - 8, 8, h - 8, r);
    c.arcTo(8, h - 8, 8, 8, r); c.arcTo(8, 8, w - 8, 8, r); c.closePath();
    c.fill();
    c.fillStyle = '#2757E2';
    c.font = '800 56px Urbanist, Helvetica, Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 3);
  });
}

function tickTexture() {
  return canvasTexture(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#12A177';
    c.beginPath(); c.arc(w / 2, h / 2, 56, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 13;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(38, 66); c.lineTo(56, 86); c.lineTo(92, 44);
    c.stroke();
  });
}
