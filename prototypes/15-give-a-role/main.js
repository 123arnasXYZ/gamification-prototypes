/* ============================================================
   15 — Give learners a role

   The same spill at the same arena door, three times over. The only
   thing that changes is the job the learner is holding, and that
   changes both the briefing and what counts as the right call.

   Roles tried is kept across replays on purpose: the point only
   lands once you have stood in the incident as somebody else.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, incident, roles, result } from './content.js';

const bridge = createBridge('give-a-role');

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [0, 6.6, 9.4],
  lookAt: [0, 0.6, -0.2],
  background: 0x141a22,
  fog: [20, 42],
  fit: { width: 12, height: 6.6 },
  orbitLimits: {
    minPolarAngle: 0.7, maxPolarAngle: 1.2,
    minAzimuthAngle: -0.4, maxAzimuthAngle: 0.4,
    minDistance: 8, maxDistance: 15,
  },
});

addLightRig(stage.scene, {
  sky: 0xe6edf5, ground: 0x2a3038, hemi: 0.95,
  keyColor: 0xfff1dc, keyIntensity: 1.6, keyPos: [4, 12, 8],
  shadowSize: 11, fillColor: 0x4a6f9c, fillIntensity: 0.5,
});

/* ---------------- The venue ---------------- */
{
  const floor = box(30, 0.2, 20, 0xc7ccd4, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(30, 5, 0.3, 0xe9edf2, { roughness: 0.95 });
  wall.position.set(0, 2.5, -3.6);
  stage.scene.add(floor, wall);

  // Doors behind the queue, so "the main doors" is a place you can see
  for (const x of [-1.1, 1.1]) {
    const door = box(1.9, 3.1, 0.12, 0x9dc0ef, { roughness: 0.4 });
    door.position.set(x, 1.55, -3.4);
    stage.scene.add(door);
  }
}

// The counter, stage left
const COUNTER = new THREE.Vector3(-3.6, 0, -1.1);
{
  const top = new THREE.Mesh(roundedBox(3.2, 0.12, 0.9, 0.04), mat(0xe3d7c3, { roughness: 0.7 }));
  top.position.set(COUNTER.x, 1.05, COUNTER.z);
  top.castShadow = true;
  const front = box(3.2, 1.0, 0.1, 0xf2f4f8, { roughness: 0.9 });
  front.position.set(COUNTER.x, 0.5, COUNTER.z + 0.4);
  stage.scene.add(top, front);
  for (const dx of [-1.0, 0.1, 1.0]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.17, 14), mat(0xffffff, { roughness: 0.6 }));
    cup.position.set(COUNTER.x + dx, 1.19, COUNTER.z - 0.1);
    stage.scene.add(cup);
  }
}

// The queue, waiting
const QUEUE_FRONT = new THREE.Vector3(1.4, 0, -0.4);
const queue = [0x8fa3bf, 0x9bb59b, 0xc4a3c9, 0xb9b08a, 0x8f9ab5].map((c, i) => {
  const p = pawn(c);
  p.position.set(QUEUE_FRONT.x + (i % 2) * 0.55, 0, QUEUE_FRONT.z - i * 0.95);
  stage.scene.add(p);
  return p;
});

// The incident: a tipped tray and a wet patch, right inside the doors
const SPILL = new THREE.Vector3(-0.2, 0, 0.1);
{
  const wet = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), mat(0x6f8aa8, { roughness: 0.25, transparent: true, opacity: 0.75 }));
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(SPILL.x, 0.02, SPILL.z);
  const tray = new THREE.Mesh(roundedBox(0.7, 0.05, 0.5, 0.02), mat(0x3a3f47, { roughness: 0.8 }));
  tray.position.set(SPILL.x - 0.3, 0.06, SPILL.z + 0.2);
  tray.rotation.z = 0.5;
  stage.scene.add(wet, tray);
  for (const [dx, dz] of [[0.25, -0.2], [0.5, 0.25], [-0.05, 0.4]]) {
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.2, 12), mat(0xf4a93a, { roughness: 0.3 }));
    glass.position.set(SPILL.x + dx, 0.09, SPILL.z + dz);
    glass.rotation.z = Math.PI / 2;
    stage.scene.add(glass);
  }
}

// The duty manager, who delivers the brief and otherwise stays put
const duty = pawn(0x5b6573);
duty.position.set(-2.1, 0, 0.9);
duty.add(tagAt(labelSprite('Duty manager', '#4B5162', 0.68), 1.78));
stage.scene.add(duty);

/* The learner. Colour and badge are set by the role, because the
   role is the only thing that changes between runs. */
const YOU_HOME = new THREE.Vector3(1.1, 0, 2.4);
const you = pawn(0x8fa3bf);
let youBadge = null;
you.position.copy(YOU_HOME);
stage.scene.add(you);

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const bottom = document.getElementById('bottom');
const triedChip = document.getElementById('tried');
document.getElementById('restart').addEventListener('click', () => restart());

/* ---------------- State ---------------- */
// rolesTried survives a replay; phase and role do not.
const state = { phase: 'roles', role: null, choice: null, rolesTried: [], busy: false, run: 0 };

stage.onFrame((dt, t) => {
  [...queue, duty, you].forEach((p, i) => { p.userData.body.scale.y = 1 + Math.sin(t * 2 + i) * 0.015; });
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__role = { state, pickRole, decide, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Picking the job
   ============================================================ */
async function pickRole(index) {
  if (state.busy || state.phase !== 'roles') return;
  const role = roles[index];
  if (!role) return;

  state.busy = true;
  state.role = role;
  setBadge(role);
  render();

  // Walk over to the duty manager — the brief is delivered to you,
  // wearing the badge you just put on.
  await walk(you, new THREE.Vector3(-1.3, 0, 1.6));
  state.phase = 'brief';
  state.busy = false;
  render();
}

/* ============================================================
   The one decision
   ============================================================ */
async function toDecision() {
  if (state.busy || state.phase !== 'brief') return;
  state.busy = true;
  await walk(you, new THREE.Vector3(0.4, 0, 1.4));
  state.phase = 'decide';
  state.busy = false;
  render();
}

async function decide(optionIndex) {
  if (state.busy || state.phase !== 'decide' || !state.role) return;
  const option = state.role.options[optionIndex];
  if (!option) return;

  const run = state.run;
  state.busy = true;
  state.choice = option;
  render();

  await walk(you, destinationFor(option.goto));
  if (run !== state.run) return;

  toast(option.outcome, option.yours ? 'good' : 'bad', 5200);
  await turnTo(you, facingFor(option.goto));
  if (run !== state.run) return;

  // Remember the job, not the answer — the replay is about the job.
  if (!state.rolesTried.includes(state.role.id)) state.rolesTried.push(state.role.id);
  state.phase = 'outcome';
  state.busy = false;
  render();

  bridge.progress(state.rolesTried.length / roles.length, { role: state.role.id });
  await wait(900);
  if (run !== state.run) return;
  finish(option);
}

function finish(option) {
  const r = option.yours ? result.yours : option.elsewhere ? result.elsewhere : result.lane;
  bridge.complete({
    passed: !!option.yours,
    score: option.score,
    detail: { role: state.role.id, choice: option.id, rolesTried: [...state.rolesTried] },
  });

  showResult({
    passed: !!option.yours,
    title: r.title,
    summary: r.summary,
    points: [
      result.roleLine.replace('{role}', state.role.name).replace('{dut}', state.role.responsible),
      option.outcome,
      ...(option.elsewhere ? [result.elsewhereLine.replace('{other}', option.elsewhere)] : []),
      triedText(),
      result.lesson,
    ],
    actions: [
      { label: 'Close', kind: 'ghost' },
      { label: meta.againCta, kind: 'primary', onClick: () => restart({ keepTried: true }) },
    ],
  });
}

/* keepTried is what separates "try it as someone else" from the
   Restart button: one continues the exercise, the other wipes it. */
function restart({ keepTried = false } = {}) {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, {
    phase: 'roles',
    role: null,
    choice: null,
    rolesTried: keepTried ? state.rolesTried : [],
    busy: false,
  });
  you.position.copy(YOU_HOME);
  you.rotation.set(0, 0, 0);
  setBadge(null);
  render();
  bridge.restart();
}

/* ---------------- Panels ---------------- */
function render() {
  triedChip.textContent = state.rolesTried.length === roles.length ? meta.allTried : triedText();

  if (state.phase === 'roles') {
    bottom.replaceChildren(el('div.deck', {}, [
      el('div.eyebrow', {}, meta.pickPrompt),
      el('div.prompt', {}, incident.what),
      el('div.cards', {}, roles.map((r, i) => {
        const tried = state.rolesTried.includes(r.id);
        return el('button.card' + (tried ? '.tried' : ''), {
          type: 'button', disabled: state.busy || null,
          onClick: () => pickRole(i),
        }, [
          el('div.swatch', { style: `background:${r.badgeColour}` }),
          el('div.who', {}, r.name),
          el('div.dut', {}, r.responsible),
          tried ? el('div.done', {}, 'Tried') : null,
        ]);
      })),
    ]));
    return;
  }

  if (state.phase === 'brief') {
    bottom.replaceChildren(el('div.deck', {}, [
      el('div.eyebrow', {}, meta.briefEyebrow),
      el('div.brief', {}, state.role.brief),
      el('ul.facts', {}, incident.facts.map((f) => el('li', {}, f))),
      el('div.opts', {}, [
        el('button.btn.primary', { type: 'button', disabled: state.busy || null, onClick: toDecision }, meta.briefCta),
      ]),
    ]));
    return;
  }

  if (state.phase === 'decide') {
    bottom.replaceChildren(el('div.deck', {}, [
      el('div.eyebrow', {}, `${meta.decideEyebrow} — ${state.role.name}`),
      el('div.prompt', {}, incident.what),
      el('div.note', {}, state.role.responsible),
      el('div.opts', {}, state.role.options.map((o, i) =>
        el('button.btn', { type: 'button', disabled: state.busy || null, onClick: () => decide(i) }, o.label))),
    ]));
    return;
  }

  bottom.replaceChildren(el('div.deck', {}, [
    el('div.eyebrow', {}, meta.outcomeEyebrow),
    el('div.prompt', {}, state.choice.outcome),
    el('div.note', {}, triedText()),
    el('div.opts', {}, [
      el('button.btn.primary', { type: 'button', onClick: () => restart({ keepTried: true }) }, meta.againCta),
    ]),
  ]));
}

function triedText() {
  return meta.tried.replace('{n}', String(state.rolesTried.length)).replace('{m}', String(roles.length));
}

/* ---------------- Scene helpers ---------------- */
function destinationFor(where) {
  if (where === 'counter') return new THREE.Vector3(COUNTER.x + 0.6, 0, COUNTER.z + 1.2);
  if (where === 'spill') return new THREE.Vector3(SPILL.x + 0.1, 0, SPILL.z + 1.3);
  return new THREE.Vector3(QUEUE_FRONT.x + 1.4, 0, QUEUE_FRONT.z + 0.3);
}

/* Where you end up standing and what you end up looking at are two
   different things — otherwise the arrival turn has nothing to aim at. */
function facingFor(where) {
  if (where === 'counter') return COUNTER.clone();
  if (where === 'spill') return SPILL.clone();
  return QUEUE_FRONT.clone();
}

/** The badge is the whole point: the scene says which job you hold. */
function setBadge(role) {
  if (youBadge) { you.remove(youBadge); youBadge = null; }
  const colour = role ? role.colour : 0x8fa3bf;
  you.userData.body.material.color.setHex(colour);
  if (!role) return;
  youBadge = tagAt(labelSprite(role.name, role.badgeColour, 0.78), 1.82);
  you.add(youBadge);
}

function walk(p, to, ms = 850) {
  const from = p.position.clone();
  return tween({
    ms: Math.max(ms, from.distanceTo(to) * 170), easing: ease.inOutCubic,
    onUpdate: (_, e, t) => {
      p.position.lerpVectors(from, to, e);
      p.position.y = Math.abs(Math.sin(t * Math.PI * 6)) * 0.08;
    },
    onDone: () => { p.position.y = 0; },
  });
}

/** A small turn-and-settle, so the choice reads as an arrival. */
function turnTo(p, at) {
  const from = p.rotation.y;
  const to = Math.atan2(at.x - p.position.x, at.z - p.position.z);
  return tween({
    ms: 360, easing: ease.outCubic,
    onUpdate: (_, e) => { p.rotation.y = from + (to - from) * e; },
  });
}

/** Faceless on purpose — the badge, not the face, is the character. */
function pawn(colour) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 6, 16), mat(colour, { roughness: 0.7 }));
  body.position.y = 0.56;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 14), body.material);
  head.position.y = 1.28;
  head.castShadow = true;
  g.add(body, head);
  g.userData = { body, colour };
  return g;
}

function tagAt(sprite, y) {
  sprite.position.y = y;
  return sprite;
}

function labelSprite(text, colour = '#10131A', scale = 1) {
  const tex = canvasTexture(512, 128, (c, cw, ch) => {
    c.clearRect(0, 0, cw, ch);
    c.font = '800 54px Urbanist, Helvetica, Arial, sans-serif';
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
  s.scale.set(2.5 * scale, 0.62 * scale, 1);
  return s;
}
