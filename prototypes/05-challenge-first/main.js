/* ============================================================
   05 — Start with the challenge
   Sam has missed a deadline again. Three places to deal with it:
   the team meeting, an email, or a one-to-one. No instructions.
   The learner has a go; a wrong choice plays out and reveals a
   hint. Hints get more specific each time.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, options, hints, results, lesson } from './content.js';

const bridge = createBridge('challenge-first');

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [0, 7.5, 11],
  lookAt: [0, 0.6, -0.3],
  background: 0x11161d,
  fog: [20, 44],
  fit: { width: 13.5, height: 7 },
  orbitLimits: {
    minPolarAngle: 0.7, maxPolarAngle: 1.2,
    minAzimuthAngle: -0.45, maxAzimuthAngle: 0.45,
    minDistance: 10, maxDistance: 17,
  },
});

addLightRig(stage.scene, {
  sky: 0xe6edf5, ground: 0x2a3038, hemi: 0.95,
  keyColor: 0xfff1dc, keyIntensity: 1.6, keyPos: [4, 14, 9],
  shadowSize: 12, fillColor: 0x4a6f9c, fillIntensity: 0.5,
});

/* ---------------- Office ---------------- */
{
  const floor = box(34, 0.2, 22, 0xc9ced6, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(34, 5, 0.3, 0xe9edf2, { roughness: 0.95 });
  wall.position.set(0, 2.5, -3.4);
  stage.scene.add(floor, wall);
}

const ZONE_X = { meeting: -4.4, email: 0, oneToOne: 4.4 };
const zones = {};
for (const o of options) {
  const g = new THREE.Group();
  g.position.x = ZONE_X[o.id];
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), mat(0xdfe5ee, { roughness: 1 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.01;
  g.add(pad);
  const tag = labelSprite(o.label);
  tag.position.set(0, 3.1, -0.4);
  g.add(tag);
  g.userData.pad = pad;
  stage.scene.add(g);
  stage.pickable(g, { kind: 'zone', id: o.id });
  zones[o.id] = g;
}

// Team meeting: a round table with the team around it
const TEAM_CENTRE = new THREE.Vector3(ZONE_X.meeting, 0, -0.3);
{
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.08, 32), mat(0xf4f4f1, { roughness: 0.6 }));
  top.position.set(0, 0.8, -0.3);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 12), mat(0x5b6573));
  leg.position.set(0, 0.4, -0.3);
  zones.meeting.add(top, leg);
}
const SEATS = [-2.4, -1.4, -0.35, 0.7, 1.7].map((a) => new THREE.Vector3(
  TEAM_CENTRE.x + Math.cos(a) * 1.45, 0, TEAM_CENTRE.z + Math.sin(a) * 1.45));
const team = [0x8fa3bf, 0x9bb59b, 0xc4a3c9, 0xb9b08a].map((c, i) => {
  const p = pawn(c);
  p.position.copy(SEATS[i]);
  stage.scene.add(p);
  return p;
});
const SAM_SEAT = SEATS[4];
const sam = pawn(0xf08a3a);
const samTag = labelSprite('Sam', '#f08a3a', 0.75);
samTag.position.y = 1.75;
sam.add(samTag);
stage.scene.add(sam);

// Email: a desk with a laptop
const LAPTOP = new THREE.Vector3(ZONE_X.email, 1.05, -0.5);
{
  const desk = box(2.2, 0.08, 1.1, 0xf4f4f1, { roughness: 0.6 });
  desk.position.set(0, 0.85, -0.5);
  zones.email.add(desk);
  for (const x of [-1, 1]) {
    const leg = box(0.08, 0.85, 1.0, 0x5b6573);
    leg.position.set(x, 0.42, -0.5);
    zones.email.add(leg);
  }
  const base = box(0.8, 0.04, 0.55, 0x3a3f47);
  base.position.set(0, 0.91, -0.4);
  const screen = box(0.8, 0.52, 0.04, 0x3a3f47);
  screen.position.set(0, 1.18, -0.68);
  screen.rotation.x = -0.2;
  const glowPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.44), new THREE.MeshBasicMaterial({ color: 0x9cc2ff }));
  glowPanel.position.set(0, 1.18, -0.655);
  glowPanel.rotation.x = -0.2;
  zones.email.add(base, screen, glowPanel);
}

// One-to-one: two armchairs facing each other, a small table and a lamp
const CHAIR_YOU = new THREE.Vector3(ZONE_X.oneToOne - 0.85, 0, -0.2);
const CHAIR_SAM = new THREE.Vector3(ZONE_X.oneToOne + 0.85, 0, -0.2);
const lampLight = new THREE.PointLight(0xffd79a, 0, 5, 1.5);
{
  for (const [x, turn] of [[-0.85, Math.PI / 2], [0.85, -Math.PI / 2]]) {
    const chair = new THREE.Group();
    const seat = box(0.8, 0.35, 0.8, 0x2757e2, { roughness: 0.9 });
    seat.position.y = 0.3;
    const back = box(0.8, 0.7, 0.18, 0x2757e2, { roughness: 0.9 });
    back.position.set(0, 0.7, -0.35);
    chair.add(seat, back);
    chair.position.set(x * 1.45, 0, -0.2);
    chair.rotation.y = turn;
    zones.oneToOne.add(chair);
  }
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 20), mat(0xf4f4f1));
  table.position.set(0, 0.25, -0.2);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 12), mat(0xffffff));
  cup.position.set(0.05, 0.56, -0.2);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2, 8), mat(0x3a3f47));
  pole.position.set(0.2, 1, -1.5);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 20, 1, true), mat(0xfff4dc, { side: THREE.DoubleSide }));
  shade.position.set(0.2, 2.05, -1.5);
  lampLight.position.set(0.2, 1.8, -1.1);
  zones.oneToOne.add(table, cup, pole, shade, lampLight);
}

// You
const YOU_HOME = new THREE.Vector3(0, 0, 2.2);
const you = pawn(0x2757e2);
const youTag = labelSprite('You', '#2757E2', 0.75);
youTag.position.y = 1.75;
you.add(youTag);
stage.scene.add(you);

const envelope = box(0.34, 0.03, 0.22, 0xffffff, { roughness: 0.8 });
envelope.visible = false;
stage.scene.add(envelope);

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const hintEl = document.getElementById('hint');
const hintsHost = document.getElementById('hints');
const stats = statBar(document.getElementById('stats'), [
  { id: 'attempts', label: 'Attempts', value: 0 },
]);
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
const state = { attempts: 0, shown: 0, busy: false, done: false, run: 0 };

stage.onPick((obj, data) => {
  if (!data || data.kind !== 'zone' || state.busy || state.done) return;
  choose(data.id);
});

stage.onFrame(() => {
  const t = performance.now() / 1000;
  // A little idle breathing so the office feels alive
  [...team, sam, you].forEach((p, i) => { p.userData.body.scale.y = 1 + Math.sin(t * 2 + i) * 0.015; });
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__ch = { state, choose, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   The choice
   ============================================================ */
async function choose(id) {
  const option = options.find((o) => o.id === id);
  if (!option || state.busy || state.done) return;
  state.attempts += 1;
  stats.set('attempts', state.attempts);
  state.busy = true;
  const run = state.run;

  if (option.correct) return oneToOne();

  if (id === 'meeting') await calledOut();
  if (id === 'email') await emailed();
  if (run !== state.run) return;

  toast(option.consequence, 'bad', 4200);
  await wait(1600);
  if (run !== state.run) return;
  await resetScene();

  state.busy = false;
  if (state.shown < hints.length) state.shown += 1;
  renderHints();
  hintEl.textContent = 'Hint unlocked — have another go.';
}

/** Raised in front of the whole team: the room cools, Sam shrinks. */
async function calledOut() {
  await walk(you, new THREE.Vector3(TEAM_CENTRE.x + 1.9, 0, TEAM_CENTRE.z + 1.4));
  team.forEach((p) => p.userData.body.material.color.multiplyScalar(0.7));
  await tween({
    ms: 600, easing: ease.outCubic,
    onUpdate: (_, e) => {
      sam.scale.setScalar(1 - 0.2 * e);
      sam.rotation.x = 0.25 * e;
    },
  });
}

/** Sent from the laptop: an envelope lands on Sam, and that's it. */
async function emailed() {
  await walk(you, new THREE.Vector3(ZONE_X.email, 0, 0.5));
  envelope.visible = true;
  const to = SAM_SEAT.clone().setY(1.5);
  await tween({
    ms: 900, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      envelope.position.lerpVectors(LAPTOP, to, e);
      envelope.position.y += Math.sin(e * Math.PI) * 1.6;
      envelope.rotation.y = e * Math.PI * 2;
    },
  });
  envelope.visible = false;
  await tween({ ms: 400, onUpdate: (_, e) => { sam.rotation.y = Math.sin(e * Math.PI) * 0.6; } });
}

/** The right call: both of you sit down somewhere private. */
async function oneToOne() {
  state.done = true;
  lampLight.intensity = 0;
  await Promise.all([
    walk(you, CHAIR_YOU.clone().add(new THREE.Vector3(-0.35, 0, 0))),
    walk(sam, CHAIR_SAM.clone().add(new THREE.Vector3(0.35, 0, 0)), 1400),
  ]);
  await tween({ ms: 500, onUpdate: (_, e) => { lampLight.intensity = 5 * e; } });
  state.busy = false;

  const firstTime = state.shown === 0;
  const r = firstTime ? results.firstTime : results.withHints;
  bridge.complete({ passed: true, score: firstTime ? 1 : Math.max(0.5, 1 - state.shown * 0.25), detail: { hints: state.shown } });

  showResult({
    passed: true,
    title: r.title,
    summary: r.summary,
    points: [
      `<b>${state.attempts} attempt${state.attempts === 1 ? '' : 's'}, ${state.shown} hint${state.shown === 1 ? '' : 's'}.</b>`,
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
  Object.assign(state, { attempts: 0, shown: 0, busy: false, done: false });
  stats.set('attempts', 0);
  placeEveryone();
  renderHints();
  hintEl.textContent = meta.instructions;
  bridge.restart();
}

/* ---------------- Helpers ---------------- */
function renderHints() {
  hintsHost.replaceChildren(...hints.slice(0, state.shown).map((h, i) =>
    el('div.hint-card.open', { style: i < state.shown - 1 ? 'animation:none' : null }, [
      el('span.n', {}, String(i + 1)),
      el('div', {}, [el('b', {}, h.title), el('span', {}, h.text)]),
    ])));
}

function placeEveryone() {
  you.position.copy(YOU_HOME);
  sam.position.copy(SAM_SEAT);
  for (const p of [you, sam]) { p.rotation.set(0, 0, 0); p.scale.setScalar(1); }
  team.forEach((p) => p.userData.body.material.color.setHex(p.userData.colour));
  envelope.visible = false;
  lampLight.intensity = 0;
}

async function resetScene() {
  team.forEach((p) => p.userData.body.material.color.setHex(p.userData.colour));
  await Promise.all([
    walk(you, YOU_HOME),
    tween({ ms: 400, onUpdate: (_, e) => { sam.scale.setScalar(sam.scale.x + (1 - sam.scale.x) * e); sam.rotation.set(sam.rotation.x * (1 - e), 0, 0); } }),
  ]);
}

function walk(p, to, ms = 900) {
  const from = p.position.clone();
  return tween({
    ms: Math.max(ms, from.distanceTo(to) * 160), easing: ease.inOutCubic,
    onUpdate: (_, e, t) => {
      p.position.lerpVectors(from, to, e);
      p.position.y = Math.abs(Math.sin(t * Math.PI * 6)) * 0.08;
    },
    onDone: () => { p.position.y = 0; },
  });
}

/** A simple rounded figure — deliberately faceless, the situation is the point. */
function pawn(colour) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 6, 16), mat(colour, { roughness: 0.7 }));
  body.position.y = 0.56;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 14), mat(colour, { roughness: 0.7 }));
  head.position.y = 1.28;
  head.castShadow = true;
  g.add(body, head);
  g.userData = { body, colour };
  // Share one material so tinting the body tints the head too
  head.material = body.material;
  return g;
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
