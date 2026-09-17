/* ============================================================
   09 — Use immediate consequences as feedback
   Stack three boxes on a pallet and send it. No feedback box and no
   right/wrong: a box that carries too much is crushed the moment it
   happens, the damage stays, and a bad stack sways or sheds a box on
   the way out. The end summary describes what arrived.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, canvasTexture, tween, ease } from '../../shared/engine.js';
import { el, toast, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, items, fellOff, arrivals, question } from './content.js';

const bridge = createBridge('consequences');

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [-0.6, 4.2, 10.5],
  lookAt: [-0.6, 1.4, 0],
  background: 0x151b23,
  fog: [18, 40],
  fit: { width: 11, height: 6.2 },
  orbitLimits: {
    minPolarAngle: 1.0, maxPolarAngle: 1.45,
    minAzimuthAngle: -0.45, maxAzimuthAngle: 0.45,
    minDistance: 8, maxDistance: 14,
  },
});

addLightRig(stage.scene, {
  sky: 0xdfe8f3, ground: 0x2a3038, hemi: 0.9,
  keyColor: 0xfff1dc, keyIntensity: 1.7, keyPos: [-4, 12, 8],
  shadowSize: 12, fillColor: 0x4a6f9c, fillIntensity: 0.5,
});

/* ---------------- The bay ---------------- */
const PALLET_X = 2;
const PALLET_TOP = 0.32;
{
  const floor = box(40, 0.2, 24, 0x5b626c, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(40, 8, 0.3, 0xcfd6de, { roughness: 0.95 });
  wall.position.set(0, 4, -3);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(20, 0.14), mat(0xe0b02a));
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(8, 0.01, 1.4);
  const bench = box(4.4, 0.9, 1.4, 0x7d8794, { roughness: 0.7 });
  bench.position.set(-3.7, 0.45, 0);
  stage.scene.add(floor, wall, lane, bench);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: labelTexture('DISPATCH →', '#2757E2'), transparent: true }));
  sign.position.set(5.2, 3.6, -2.83);
  stage.scene.add(sign);
}

const pallet = new THREE.Group();
{
  const deck = box(1.9, 0.08, 1.5, 0xb88a52, { roughness: 1 });
  deck.position.y = PALLET_TOP - 0.04;
  pallet.add(deck);
  for (const z of [-0.6, 0, 0.6]) {
    const runner = box(1.9, 0.24, 0.18, 0x9c7443, { roughness: 1 });
    runner.position.set(0, 0.12, z);
    pallet.add(runner);
  }
}
pallet.position.x = PALLET_X;
stage.scene.add(pallet);

/* ---------------- Boxes ---------------- */
const BENCH_TOP = 0.9;
const boxes = items.map((item, i) => {
  const g = new THREE.Group();
  const body = box(1.2, item.height, 1.0, item.colour, { roughness: 1 });
  body.position.y = item.height / 2;
  const tape = box(1.22, 0.06, 0.18, 0xd9cfb8, { roughness: 1 });
  tape.position.y = item.height - 0.02;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.44),
    new THREE.MeshBasicMaterial({ map: labelTexture(`${item.name.toUpperCase()}\n${item.weight} kg${item.fragile ? ' · FRAGILE' : ''}`, '#1a1d24'), transparent: true }),
  );
  face.position.set(0, item.height / 2, 0.505);
  g.add(body, tape, face);
  g.userData = { item, body, home: new THREE.Vector3(-5.1 + i * 1.4, BENCH_TOP, 0) };
  g.position.copy(g.userData.home);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'box', id: item.id });
  return g;
});
const byId = Object.fromEntries(boxes.map((b) => [b.userData.item.id, b]));

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const bottom = document.getElementById('bottom');
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
// stack: item ids bottom → top. crushed: ids damaged so far (damage stays).
const state = { stack: [], crushed: new Set(), fell: null, busy: false, sent: false };

stage.onPick((obj, data) => {
  if (!data || data.kind !== 'box' || state.busy || state.sent) return;
  if (!state.stack.includes(data.id)) place(data.id);
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__stack = { state, place, liftTop, send, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Actions
   ============================================================ */
async function place(id) {
  if (state.stack.length >= items.length || state.stack.includes(id)) return;
  state.busy = true;
  renderControls();

  const g = byId[id];
  const from = g.position.clone();
  const to = new THREE.Vector3(PALLET_X, stackHeight(), 0);
  await tween({
    ms: 650, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      g.position.lerpVectors(from, to, e);
      g.position.y += Math.sin(e * Math.PI) * 1.2;
    },
  });
  state.stack.push(id);

  // The consequence, straight away: anything carrying too much gives way
  for (let i = 0; i < state.stack.length; i++) {
    const below = byId[state.stack[i]].userData.item;
    const load = state.stack.slice(i + 1).reduce((sum, k) => sum + byId[k].userData.item.weight, 0);
    if (load > below.holds && !state.crushed.has(below.id)) {
      state.crushed.add(below.id);
      toast(below.crushed, '', 3000);
      await crush(byId[below.id]);
    }
  }

  bridge.progress(state.stack.length / items.length, { damaged: state.crushed.size });
  state.busy = false;
  renderControls();
}

async function liftTop() {
  if (!state.stack.length || state.busy || state.sent) return;
  state.busy = true;
  renderControls();
  const g = byId[state.stack.pop()];
  const from = g.position.clone(), to = g.userData.home;
  await tween({
    ms: 600, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      g.position.lerpVectors(from, to, e);
      g.position.y += Math.sin(e * Math.PI) * 1.2;
    },
  });
  state.busy = false;
  renderControls();
}

async function send() {
  if (state.stack.length < items.length || state.busy || state.sent) return;
  state.busy = true;
  state.sent = true;
  renderControls();

  const load = state.stack.map((id) => byId[id]);
  const start = load.map((g) => g.position.clone());
  const top = load[load.length - 1];
  const damage = state.crushed.size;
  const DIST = 13;
  let dropped = false;

  await tween({
    ms: 2600, easing: ease.inOutCubic,
    onUpdate: (_, e, p) => {
      const x = PALLET_X + DIST * e;
      pallet.position.x = x;
      const sway = damage ? Math.sin(p * Math.PI * 7) * 0.05 * damage : 0;
      load.forEach((g, i) => {
        if (dropped && g === top) return;
        g.position.x = start[i].x + DIST * e + sway * i * 0.6;
        g.rotation.z = -sway * 0.5;
      });
      // A badly crushed stack sheds its top box on the way out
      if (damage >= 2 && !dropped && p > 0.3) {
        dropped = true;
        state.fell = top.userData.item.id;
        topple(top);
      }
    },
  });
  await tween({ ms: 400 });

  state.busy = false;
  showRecap();
}

function restart() {
  Object.assign(state, { stack: [], crushed: new Set(), fell: null, busy: false, sent: false });
  pallet.position.x = PALLET_X;
  for (const g of boxes) {
    g.position.copy(g.userData.home);
    g.rotation.set(0, 0, 0);
    g.scale.set(1, 1, 1);
    g.userData.body.material.color.setHex(g.userData.item.colour);
  }
  renderControls();
  bridge.restart();
}

/* ---------------- Panels ---------------- */
function renderControls() {
  const full = state.stack.length === items.length;
  const hint = state.stack.length === 0
    ? meta.instructions
    : full ? 'All three are on. Send it when you’re happy.' : `${state.stack.length} of ${items.length} on the pallet.`;

  bottom.replaceChildren(el('div.row', {}, [
    el('div.grow', { style: 'font-size:13.5px;font-weight:600;color:var(--ink-dim)' }, hint),
    el('button.btn.ghost', { type: 'button', disabled: !state.stack.length || state.busy || state.sent, onClick: liftTop }, 'Lift top box off'),
    el('button.btn.primary', { type: 'button', disabled: !full || state.busy || state.sent, onClick: send }, 'Send the pallet'),
  ]));
}

function showRecap() {
  const damaged = new Set([...state.crushed, ...(state.fell ? [state.fell] : [])]).size;
  const a = arrivals[Math.min(damaged, arrivals.length - 1)];
  bridge.complete({ passed: true, score: 1 - damaged / items.length, detail: { damaged, order: [...state.stack] } });

  bottom.replaceChildren(el('div.recap', {}, [
    el('div.eyebrow', {}, 'At the other end'),
    el('h2', {}, a.title),
    el('p.driver', {}, `The driver: ${a.line}`),
    ...[...state.stack].reverse().map((id) => {
      const item = byId[id].userData.item;
      const what = state.fell === id ? fellOff : state.crushed.has(id) ? item.arrivedBad : item.arrivedOk;
      return el('div.beat', { html: `<b>${item.name}</b> — ${what}` });
    }),
    el('p.q', {}, question),
    el('button.btn.primary', { type: 'button', onClick: restart }, 'Try again'),
  ]));
}

/* ---------------- Helpers ---------------- */
function stackHeight() {
  return PALLET_TOP + state.stack.reduce((h, id) => h + byId[id].userData.item.height * byId[id].scale.y, 0);
}

/** Squash a box and settle everything above it down onto it. */
async function crush(g) {
  const idx = state.stack.indexOf(g.userData.item.id);
  const above = state.stack.slice(idx + 1).map((id) => byId[id]);
  const lost = g.userData.item.height * 0.45;
  const starts = above.map((b) => b.position.y);
  g.userData.body.material.color.multiplyScalar(0.6);
  await tween({
    ms: 260, easing: ease.outCubic,
    onUpdate: (_, e) => {
      g.scale.set(1 + 0.08 * e, 1 - 0.45 * e, 1 + 0.04 * e);
      g.rotation.z = 0.07 * e;
      above.forEach((b, i) => { b.position.y = starts[i] - lost * e; b.rotation.z = 0.12 * e; });
    },
  });
}

function topple(g) {
  const from = g.position.clone();
  tween({
    ms: 700, easing: ease.outCubic,
    onUpdate: (_, e) => {
      g.position.set(from.x - 0.9 * e, from.y - (from.y - 0.5) * e * e, from.z + 1.2 * e);
      g.rotation.set(0.3 * e, 0, 1.4 * e);
    },
  });
}

function labelTexture(text, colour) {
  const lines = text.split('\n');
  return canvasTexture(512, 200, (c, cw, ch) => {
    c.clearRect(0, 0, cw, ch);
    c.fillStyle = colour;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach((l, i) => {
      c.font = i === 0 ? '800 64px Helvetica, Arial, sans-serif' : '700 50px Helvetica, Arial, sans-serif';
      c.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * 76);
    });
  });
}
