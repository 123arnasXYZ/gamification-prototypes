/* ============================================================
   08 — Make progress impossible to miss
   A level map. Every stage is visible up front: cleared ones carry a
   flag, the current one glows, locked ones show a padlock and their
   name. A stage only clears when its challenge is answered correctly,
   and clearing it lights the path to the next.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, stages, results } from './content.js';

const bridge = createBridge('progress-map');

const NODE_POS = [
  [-3.6, 3.2],
  [1.4, 1.7],
  [-2.4, -1.3],
  [2.6, -4.1],
];

const COLORS = { locked: 0x6b7280, current: 0x2757e2, done: 0x12a177 };

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [0, 11, 11.5],
  lookAt: [-0.2, 0, -0.3],
  background: 0x9cc7e8,
  fog: [26, 60],
  fit: { width: 10.5, height: 10.5 },
  orbitLimits: {
    minPolarAngle: 0.45, maxPolarAngle: 1.0,
    minAzimuthAngle: -0.5, maxAzimuthAngle: 0.5,
    minDistance: 12, maxDistance: 20,
  },
});

addLightRig(stage.scene, {
  sky: 0xdff0ff, ground: 0x3b5e3a, hemi: 1.0,
  keyColor: 0xfff4e0, keyIntensity: 2.0, keyPos: [6, 14, 8],
  shadowSize: 12, fillColor: 0x6d93c7, fillIntensity: 0.5,
});

/* ---------------- The island ---------------- */
{
  const water = new THREE.Mesh(new THREE.CircleGeometry(40, 48), mat(0x5aa9d6, { roughness: 0.35 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.6;
  stage.scene.add(water);

  const island = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.8, 1.0, 40), mat(0x7cbf6a, { roughness: 1, flat: true }));
  island.position.y = -0.5;
  island.receiveShadow = true;
  stage.scene.add(island);

  // A few trees so it reads as a place, not a diagram
  for (const [x, z, s] of [[-5.4, -1.5, 1], [4.8, 2.2, 0.9], [-4.6, -4.2, 0.8], [5.2, -2.3, 1.1], [0.2, 4.8, 0.85], [-2.1, 5.2, 0.7]]) {
    const trunk = box(0.18 * s, 0.6 * s, 0.18 * s, 0x7a5436);
    trunk.position.set(x, 0.3 * s, z);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.6 * s, 1.3 * s, 7), mat(0x3f8f4e, { flat: true }));
    crown.position.set(x, 0.6 * s + 0.6 * s, z);
    crown.castShadow = true;
    stage.scene.add(trunk, crown);
  }
}

/* ---------------- Path stones between stages ---------------- */
const STONES_PER_LEG = 5;
const legs = NODE_POS.slice(1).map((to, i) => {
  const from = NODE_POS[i];
  return Array.from({ length: STONES_PER_LEG }, (_, k) => {
    const t = (k + 1) / (STONES_PER_LEG + 1);
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 14), mat(0xd9dde3, { roughness: 0.8 }));
    stone.position.set(from[0] + (to[0] - from[0]) * t, 0.04, from[1] + (to[1] - from[1]) * t);
    stone.receiveShadow = true;
    stage.scene.add(stone);
    return stone;
  });
});

/* ---------------- Stage nodes ---------------- */
const nodes = stages.map((s, i) => {
  const g = new THREE.Group();
  g.position.set(NODE_POS[i][0], 0, NODE_POS[i][1]);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.34, 32), mat(COLORS.locked, { roughness: 0.6 }));
  base.position.y = 0.17;
  base.castShadow = true;
  base.receiveShadow = true;

  const number = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 28),
    new THREE.MeshBasicMaterial({ map: numberTexture(i + 1), transparent: true }),
  );
  number.rotation.x = -Math.PI / 2;
  number.position.y = 0.35;

  // Padlock for locked stages
  const lock = new THREE.Group();
  {
    const body = box(0.46, 0.4, 0.2, 0x3a414b, { roughness: 0.5 });
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 8, 18, Math.PI), mat(0xb8bec8, { metalness: 0.5, roughness: 0.3 }));
    shackle.position.y = 0.2;
    lock.add(body, shackle);
    lock.position.y = 1.0;
    lock.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  // Flag for cleared stages
  const flag = new THREE.Group();
  {
    const pole = box(0.05, 1.3, 0.05, 0xf1f1ee);
    pole.position.y = 0.65;
    const cloth = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.28, 0), new THREE.Vector3(0.6, 1.1, 0), new THREE.Vector3(0, 0.92, 0),
    ]), new THREE.MeshStandardMaterial({ color: COLORS.done, side: THREE.DoubleSide }));
    cloth.geometry.computeVertexNormals();
    flag.add(pole, cloth);
    flag.position.set(0.55, 0.34, -0.2);
    flag.visible = false;
  }

  // Ring that pulses around the stage you are on
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.36, 40),
    new THREE.MeshBasicMaterial({ color: COLORS.current, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;

  // Stage name, always visible — locked stages tease what is coming
  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.49),
    new THREE.MeshBasicMaterial({ map: tagTexture(s.title), transparent: true, depthWrite: false }),
  );
  tag.position.set(0, 1.6, 0);

  g.add(base, number, lock, flag, ring, tag);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'node', index: i });
  return { g, base, lock, flag, ring, tag };
});

// Name tags turn to face the camera
stage.onFrame((dt, t) => {
  for (const n of nodes) n.tag.quaternion.copy(stage.camera.quaternion);
  const cur = nodes[state.current];
  if (cur && !state.over) {
    cur.ring.scale.setScalar(1 + Math.sin(t * 3.2) * 0.06);
    cur.ring.material.opacity = 0.5 + Math.sin(t * 3.2) * 0.3;
    // Bob the whole stage, so the number rides with the platform instead
    // of the platform rising up through it
    cur.g.position.y = Math.abs(Math.sin(t * 2)) * 0.08;
  }
});

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const hint = document.getElementById('hint');
const challenge = document.getElementById('challenge');
const stats = statBar(document.getElementById('stats'), [
  { id: 'cleared', label: 'Stages cleared', value: 0, max: stages.length, color: '#12A177' },
]);
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
const state = { current: 0, cleared: 0, tries: [], busy: false, over: false, open: false };

stage.onPick((obj, data) => {
  if (state.busy || data?.kind !== 'node') return;
  const i = data.index;
  if (i < state.cleared) { toast(`✓ ${stages[i].title} — already cleared`, 'good', 1600); return; }
  if (i > state.current) {
    shake(nodes[i].lock);
    toast(`Locked — clear “${stages[state.current].title}” first`, '', 2200);
    return;
  }
  if (!state.over) openChallenge(i);
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__map = { stage, state, openChallenge, answer, restart, nodes };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Challenges
   ============================================================ */
function openChallenge(i) {
  state.open = true;
  const s = stages[i];
  challenge.hidden = false;
  challenge.replaceChildren(
    el('div.eyebrow', {}, `Stage ${i + 1} of ${stages.length}`),
    el('h2', {}, s.title),
    el('p.q', {}, s.question),
    el('div.options', {}, s.options.map((o, k) =>
      el('button.opt', { type: 'button', 'data-k': k, onclick: () => answer(k) }, o.text))),
    el('div.feedback', { id: 'fb' }),
    el('div.row-end', {}, [
      el('span', { style: 'font-size:12.5px;color:var(--ink-dim)' }, 'Get it right to unlock the next stage.'),
      el('button.btn.ghost', { type: 'button', onclick: closeChallenge }, 'Close'),
    ]),
  );
  hint.textContent = 'Answer to clear the stage.';
}

function closeChallenge() {
  challenge.hidden = true;
  state.open = false;
  hint.textContent = state.over ? 'Journey complete.' : `Click stage ${state.current + 1} to continue.`;
}

async function answer(k) {
  const i = state.current;
  const s = stages[i];
  const btn = challenge.querySelector(`.opt[data-k="${k}"]`);
  state.tries[i] = (state.tries[i] || 0) + 1;

  if (!s.options[k].correct) {
    btn.classList.add('wrong');
    btn.disabled = true;
    challenge.querySelector('#fb').replaceChildren(
      el('b', {}, 'Not quite — no progress yet. '), s.why);
    return;
  }

  btn.classList.add('right');
  challenge.querySelectorAll('.opt').forEach((b) => { b.disabled = true; });
  await wait(450);
  closeChallenge();
  await clearStage(i);
}

/* ---------------- Unlocking ---------------- */
async function clearStage(i) {
  state.busy = true;
  state.cleared = i + 1;
  stats.set('cleared', state.cleared);
  bridge.progress(state.cleared / stages.length);

  const n = nodes[i];
  n.ring.visible = false;
  n.g.position.y = 0;
  n.base.material.color.setHex(COLORS.done);
  n.flag.visible = true;
  n.flag.scale.set(1, 0.01, 1);
  await tween({ ms: 420, easing: ease.outBack, onUpdate: (_, e) => n.flag.scale.set(1, Math.max(0.01, e), 1) });

  if (i + 1 >= stages.length) {
    state.busy = false;
    return finish();
  }

  // Light the path stone by stone, then open the next padlock
  for (const stone of legs[i]) {
    stone.material.color.setHex(COLORS.current);
    await tween({ ms: 120, easing: ease.outBack, onUpdate: (_, e) => { stone.position.y = 0.04 + Math.sin(e * Math.PI) * 0.18; } });
  }

  const next = nodes[i + 1];
  await tween({
    ms: 520, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      next.lock.position.y = 1.0 + e * 1.4;
      next.lock.rotation.y = e * Math.PI;
      next.lock.scale.setScalar(Math.max(0.01, 1 - e));
    },
  });
  next.lock.visible = false;

  state.current = i + 1;
  paint();
  toast(`Unlocked: ${stages[i + 1].title}`, 'good', 2200);
  hint.textContent = `Click stage ${state.current + 1} to continue.`;
  state.busy = false;
}

function finish() {
  state.over = true;
  hint.textContent = 'Journey complete.';
  const points = stages.map((s, i) => {
    const t = state.tries[i] || 1;
    return `<b style="color:var(--good)">✓ ${s.title}</b> — ${t === 1 ? 'cleared first time' : `cleared on try ${t}`}`;
  });
  const firstTime = stages.every((_, i) => (state.tries[i] || 1) === 1);
  bridge.complete({ passed: true, score: firstTime ? 1 : 0.8 });
  showResult({
    passed: true,
    title: results.title,
    summary: results.summary,
    points,
    actions: [
      { label: 'Close', kind: 'ghost' },
      { label: 'Start again', kind: 'primary', onClick: restart },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  Object.assign(state, { current: 0, cleared: 0, tries: [], busy: false, over: false, open: false });
  stats.set('cleared', 0);
  for (const leg of legs) for (const s of leg) { s.material.color.setHex(0xd9dde3); s.position.y = 0.04; }
  nodes.forEach((n) => {
    n.flag.visible = false;
    n.lock.visible = true;
    n.lock.position.y = 1.0;
    n.lock.rotation.y = 0;
    n.lock.scale.setScalar(1);
  });
  challenge.hidden = true;
  paint();
  hint.textContent = 'Click stage 1 to begin.';
  bridge.restart();
}

/** Colour every node for its state: done, current or locked. */
function paint() {
  nodes.forEach((n, i) => {
    const kind = i < state.cleared ? 'done' : i === state.current ? 'current' : 'locked';
    n.base.material.color.setHex(COLORS[kind]);
    n.g.position.y = 0;
    n.ring.visible = kind === 'current';
    n.lock.visible = kind === 'locked';
    n.flag.visible = kind === 'done';
    n.tag.material.opacity = kind === 'locked' ? 0.75 : 1;
  });
}

/* ---------------- Helpers ---------------- */
function shake(obj) {
  const x = obj.position.x;
  return tween({
    ms: 380,
    onUpdate: (_, e, p) => { obj.position.x = x + Math.sin(p * Math.PI * 9) * 0.1 * (1 - p); },
    onDone: () => { obj.position.x = x; },
  });
}

function numberTexture(n) {
  return canvasTexture(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(w / 2, h / 2, 60, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#10131A';
    c.font = '800 70px Helvetica, Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(n), w / 2, h / 2 + 4);
  });
}

function tagTexture(text) {
  return canvasTexture(620, 130, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    const r = 50;
    c.beginPath();
    c.moveTo(r, 10); c.arcTo(w - 10, 10, w - 10, h - 10, r); c.arcTo(w - 10, h - 10, 10, h - 10, r);
    c.arcTo(10, h - 10, 10, 10, r); c.arcTo(10, 10, w - 10, 10, r); c.closePath();
    c.fill();
    c.fillStyle = '#2757E2';
    c.font = '800 54px Helvetica, Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 3);
  });
}
