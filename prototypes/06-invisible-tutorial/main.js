/* ============================================================
   06 — Make the tutorial invisible
   A sorting station. Parcels arrive one at a time; click the bin
   they belong in. Each step adds one new thing, and the coach that
   explains it shows up less often each time until it is gone.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, bins, stages, results } from './content.js';

const bridge = createBridge('invisible-tutorial');

const PICK = new THREE.Vector3(0, 1.5, -0.6);       // where a parcel waits
const CHUTE_START = new THREE.Vector3(-5.5, 2.6, -0.6);
const BIN_Z = 2.2;

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 42,
  cameraPos: [0, 5.6, 9.2],
  lookAt: [0, 1.1, 0.6],
  background: 0x11161d,
  fog: [18, 40],
  fit: { width: 10, height: 6.5 },
  orbitLimits: {
    minPolarAngle: 0.8, maxPolarAngle: 1.3,
    minAzimuthAngle: -0.4, maxAzimuthAngle: 0.4,
    minDistance: 8, maxDistance: 14,
  },
});

addLightRig(stage.scene, {
  sky: 0xc9d6e6, ground: 0x2a3038, hemi: 0.85,
  keyColor: 0xfff1dc, keyIntensity: 1.8, keyPos: [5, 12, 9],
  shadowSize: 12, fillColor: 0x4a6f9c, fillIntensity: 0.55,
});

const floor = box(30, 0.4, 22, 0x3a414b, { roughness: 1 });
floor.position.y = -0.2;
stage.scene.add(floor);

const wall = box(30, 8, 0.4, 0x4a525e, { roughness: 0.95 });
wall.position.set(0, 4, -4);
stage.scene.add(wall);

// Chute delivering parcels from the left, and the table they land on
{
  const chute = box(5.2, 0.14, 1.3, 0x5b6573, { roughness: 0.6 });
  chute.position.set(-3.1, 2.05, -0.6);
  chute.rotation.z = -0.22;
  const table = box(1.9, 1.0, 1.6, 0x5b6573, { roughness: 0.6 });
  table.position.set(0, 0.5, -0.6);
  const top = box(1.9, 0.08, 1.6, 0x2b313c, { roughness: 0.9 });
  top.position.set(0, 1.04, -0.6);
  stage.scene.add(chute, table, top);
}

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const hint = document.getElementById('hint');
const stepsHost = document.getElementById('steps');
const stats = statBar(document.getElementById('stats'), [
  { id: 'sorted', label: 'Sorted', value: 0 },
  { id: 'mistakes', label: 'Mistakes', value: 0 },
]);
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
const state = {
  stage: 0, index: 0, parcel: null, binNodes: [],
  sorted: 0, mistakes: 0, perStage: [], coachShownFor: null,
  busy: false, over: false,
};

let coach = null;
let pulse = null;

stage.onPick((obj, data) => {
  if (state.busy || state.over || !state.parcel || data?.kind !== 'bin') return;
  sortInto(data.type);
});

// Keep the coach bubble pinned to its bin, and pulse the target ring
stage.onFrame((dt, t) => {
  if (coach) placeCoach();
  if (pulse) {
    pulse.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    pulse.material.opacity = 0.55 + Math.sin(t * 4) * 0.3;
  }
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__tut = { stage, state, sortInto, restart, correctBin };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Flow
   ============================================================ */
async function beginStage(i) {
  state.stage = i;
  state.index = 0;
  state.perStage[i] = 0;
  renderSteps();
  hideCoach();
  await buildBins(stages[i].bins);
  nextParcel();
}

async function nextParcel() {
  const s = stages[state.stage];
  if (state.index >= s.parcels.length) return finishStage();

  const code = s.parcels[state.index];
  const parcel = makeParcel(code);
  parcel.position.copy(CHUTE_START);
  stage.scene.add(parcel);
  state.parcel = { code, mesh: parcel };
  state.busy = true;

  await tween({
    ms: 650, easing: ease.outCubic,
    onUpdate: (_, e) => {
      parcel.position.lerpVectors(CHUTE_START, PICK, e);
      parcel.rotation.z = -0.22 * (1 - e);
    },
  });
  state.busy = false;
  applyGuidance(false);
}

/** Decide whether this parcel gets help, based on how far along we are. */
function applyGuidance(afterMistake) {
  const s = stages[state.stage];
  const code = state.parcel.code;
  let show = false;

  if (s.guide === 'always') show = true;
  else if (s.guide === 'once') show = state.index === 0 || afterMistake;
  else if (s.guide === 'when-new') {
    const firstNew = code.startsWith('fragile') && state.coachShownFor !== state.stage;
    show = firstNew || afterMistake;
  }

  if (show) {
    if (code.startsWith('fragile')) state.coachShownFor = state.stage;
    showCoach(correctBin(code), s.coach, s.guide === 'always');
    hint.textContent = s.coach;
  } else {
    hideCoach();
    hint.textContent = s.guide === 'none' ? 'On your own now.' : 'Keep going.';
  }
}

async function sortInto(type) {
  const { code, mesh } = state.parcel;
  const target = state.binNodes.find((b) => b.type === type);
  const right = correctBin(code) === type;
  state.busy = true;
  hideCoach();

  const from = mesh.position.clone();
  const into = new THREE.Vector3(target.group.position.x, 0.7, BIN_Z);

  if (right) {
    await tween({
      ms: 520, easing: ease.inOutCubic,
      onUpdate: (_, e) => {
        mesh.position.lerpVectors(from, into, e);
        mesh.position.y += Math.sin(e * Math.PI) * 1.6;
        mesh.rotation.y = e * 1.2;
      },
    });
    stage.scene.remove(mesh);
    state.sorted += 1;
    stats.set('sorted', state.sorted);
    state.index += 1;
    state.parcel = null;
    state.busy = false;
    nextParcel();
  } else {
    // Hop toward the wrong bin, bounce back to the table
    const peak = from.clone().lerp(into, 0.55);
    await tween({
      ms: 380, easing: ease.outCubic,
      onUpdate: (_, e) => { mesh.position.lerpVectors(from, peak, e); mesh.position.y += Math.sin(e * Math.PI) * 1.2; },
    });
    shake(target.group);
    await tween({ ms: 340, easing: ease.inOutCubic, onUpdate: (_, e) => mesh.position.lerpVectors(peak, from, e) });
    mesh.position.copy(from);

    state.mistakes += 1;
    state.perStage[state.stage] += 1;
    stats.set('mistakes', state.mistakes);
    state.busy = false;

    if (stages[state.stage].guide === 'none') {
      toast('Not that one', 'bad', 1400);
      hint.textContent = 'On your own now.';
    } else {
      applyGuidance(true);
    }
  }
}

async function finishStage() {
  hideCoach();
  const next = state.stage + 1;
  if (next >= stages.length) return finish();
  toast(`Step ${next} done — ${stages[next].name.toLowerCase()} next`, 'good', 2000);
  bridge.progress(next / stages.length);
  await wait(500);
  beginStage(next);
}

function finish() {
  state.over = true;
  renderSteps();
  const soloClean = state.perStage[stages.length - 1] === 0;
  const r = state.mistakes === 0 ? results.clean : results.some;

  const points = stages.map((s, i) =>
    `<b>Step ${i + 1} · ${s.name}</b> <span style="color:var(--ink-dim)">(${s.help.toLowerCase()})</span> — ` +
    (state.perStage[i] ? `${state.perStage[i]} mistake${state.perStage[i] === 1 ? '' : 's'}` : 'no mistakes'));
  points.push(soloClean
    ? '<b>The last round had no help at all</b>, and you still sorted every parcel correctly.'
    : '<b>The last round had no help at all.</b> Mistakes there show which rule hasn’t stuck yet.');

  bridge.complete({ passed: soloClean, score: Math.max(0, 1 - state.mistakes * 0.1) });
  showResult({
    passed: soloClean,
    title: r.title,
    summary: r.summary,
    points,
    actions: [
      { label: 'Close', kind: 'ghost' },
      { label: 'Play again', kind: 'primary', onClick: restart },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  if (state.parcel) stage.scene.remove(state.parcel.mesh);
  Object.assign(state, {
    stage: 0, index: 0, parcel: null, sorted: 0, mistakes: 0,
    perStage: [], coachShownFor: null, busy: false, over: false,
  });
  stats.set('sorted', 0);
  stats.set('mistakes', 0);
  hint.textContent = 'No instructions — just start.';
  bridge.restart();
  beginStage(0);
}

/* ============================================================
   Bins and parcels
   ============================================================ */
function correctBin(code) {
  return code.startsWith('fragile') ? 'fragile' : code;
}

async function buildBins(types) {
  for (const b of state.binNodes) { stage.unpickable(b.group); stage.scene.remove(b.group); }
  const spacing = 2.3;
  state.binNodes = types.map((type, i) => {
    const def = bins[type];
    const g = new THREE.Group();
    const W = 1.8, H = 1.0, D = 1.5, T = 0.1;
    const m = { roughness: 0.7 };
    const base = box(W, T, D, def.color, m); base.position.y = T / 2;
    const front = box(W, H, T, def.color, m); front.position.set(0, H / 2, D / 2);
    const back = box(W, H, T, def.color, m); back.position.set(0, H / 2, -D / 2);
    const left = box(T, H, D, def.color, m); left.position.set(-W / 2, H / 2, 0);
    const right = box(T, H, D, def.color, m); right.position.set(W / 2, H / 2, 0);
    const inner = box(W - 0.2, 0.02, D - 0.2, type === 'fragile' ? 0xf3d7b0 : 0x1c2027, { roughness: 1 });
    inner.position.y = T + 0.01;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.42),
      new THREE.MeshBasicMaterial({ map: signTexture(def.label), transparent: true }),
    );
    sign.position.set(0, H * 0.55, D / 2 + 0.06);
    g.add(base, front, back, left, right, inner, sign);
    g.position.set((i - (types.length - 1) / 2) * spacing, 0, BIN_Z);
    g.scale.setScalar(0.01);
    stage.scene.add(g);
    stage.pickable(g, { kind: 'bin', type });
    return { type, group: g };
  });

  await tween({
    ms: 380, easing: ease.outBack,
    onUpdate: (_, e) => state.binNodes.forEach((b) => b.group.scale.setScalar(Math.max(0.01, e))),
  });
}

function makeParcel(code) {
  const colour = code.replace('fragile-', '');
  const fragile = code.startsWith('fragile');
  const g = new THREE.Group();
  const body = box(0.95, 0.7, 0.95, 0xb08a58, { roughness: 1 });
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.4),
    new THREE.MeshBasicMaterial({ map: parcelLabel(bins[colour].css, fragile) }),
  );
  label.position.set(0, 0.05, 0.48);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), mat(bins[colour].color, { roughness: 0.8 }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.356;
  g.add(body, label, top);
  return g;
}

/* ---------------- Coach ---------------- */
function showCoach(binType, text, withRing) {
  hideCoach();
  const target = state.binNodes.find((b) => b.type === binType);
  coach = { node: el('div.coach', {}, text), target };
  document.body.append(coach.node);
  placeCoach();

  if (withRing) {
    pulse = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 1.42, 40),
      new THREE.MeshBasicMaterial({ color: 0x2757e2, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.set(target.group.position.x, 0.02, BIN_Z);
    stage.scene.add(pulse);
  }
}

function placeCoach() {
  const p = coach.target.group.position.clone();
  p.y = 1.2;
  const v = p.project(stage.camera);
  coach.node.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
  coach.node.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
}

function hideCoach() {
  coach?.node.remove();
  coach = null;
  if (pulse) { stage.scene.remove(pulse); pulse = null; }
}

/* ---------------- Step strip ---------------- */
function renderSteps() {
  stepsHost.replaceChildren(...stages.map((s, i) => {
    const cls = state.over || i < state.stage ? '.done' : i === state.stage ? '.now' : '';
    return el('div.step' + cls, {}, [
      el('div.k', {}, `Step ${i + 1}`),
      el('div.v', {}, s.name),
      el('div.h', {}, s.help),
    ]);
  }));
}

/* ---------------- Helpers ---------------- */
function shake(obj) {
  const x = obj.position.x;
  return tween({
    ms: 380,
    onUpdate: (_, e, p) => { obj.position.x = x + Math.sin(p * Math.PI * 9) * 0.08 * (1 - p); },
    onDone: () => { obj.position.x = x; },
  });
}

function signTexture(text) {
  return canvasTexture(420, 120, (c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 6, 6, w - 12, h - 12, 18);
    c.fill();
    c.fillStyle = '#10131A';
    c.font = '800 58px Helvetica, Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 3);
  });
}

function parcelLabel(css, fragile) {
  return canvasTexture(310, 200, (c, w, h) => {
    c.fillStyle = '#f7f3ea';
    c.fillRect(0, 0, w, h);
    c.fillStyle = css;
    c.fillRect(0, 0, w, fragile ? 110 : h);
    if (fragile) {
      c.fillStyle = '#c8443f';
      c.fillRect(0, 110, w, 90);
      c.fillStyle = '#ffffff';
      c.font = '800 46px Helvetica, Arial, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('FRAGILE', w / 2, 157);
    }
  });
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
