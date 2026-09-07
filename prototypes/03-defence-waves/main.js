/* ============================================================
   03 — Defence Waves
   Something valuable at one end, a lane of incoming threats at the
   other, and four pads where controls can be placed.

   Click a pad and pick a control for it. Each wave sends one kind
   of threat, and a control only stops its own kind.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, tween, ease } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, asset, budget, controls, threatTypes, waves, results } from './content.js';

const bridge = createBridge('defence-waves');

const LANE_HALF = 2.2;
const SPAWN_Z = -17;
const CORE_Z = 7;
const THREAT_SPEED = 3.4;

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 45,
  cameraPos: [0, 11.5, 19],
  lookAt: [0, 0, -3.5],
  background: 0x080b11,
  fog: [22, 52],
  // Keep both columns of pads and the core in frame
  fit: { width: 11, height: 16 },
  orbitLimits: {
    minPolarAngle: 0.25, maxPolarAngle: 1.2,
    minAzimuthAngle: -0.5, maxAzimuthAngle: 0.5,
    minDistance: 15, maxDistance: 32,
  },
});

addLightRig(stage.scene, {
  hemi: 0.35,
  keyColor: 0xd7e6ff,
  keyIntensity: 1.4,
  keyPos: [6, 14, 8],
  shadowSize: 18,
  fillColor: 0x2f4f8a,
  fillIntensity: 0.5,
});

// Ground and lane
const ground = box(60, 0.6, 60, 0x10151d, { roughness: 1 });
ground.position.y = -0.3;
stage.scene.add(ground);

const grid = new THREE.GridHelper(60, 40, 0x1e2a3a, 0x161e2a);
grid.position.y = 0.005;
stage.scene.add(grid);

const lane = box(LANE_HALF * 2, 0.05, 28, 0x16222f, { roughness: 0.95 });
lane.position.set(0, 0.02, -4);
stage.scene.add(lane);

[-LANE_HALF, LANE_HALF].forEach((x) => {
  const edge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 28),
    new THREE.MeshBasicMaterial({ color: 0x33556b, transparent: true, opacity: 0.75 }),
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(x, 0.055, -4);
  stage.scene.add(edge);
});

/* ---------------- The thing being protected ---------------- */
const core = new THREE.Group();
{
  const plinth = box(4.4, 0.5, 4.4, 0x1b2634, { roughness: 0.7 });
  plinth.position.y = 0.25;
  const shell = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.35, 0),
    mat(0x2ad0c0, { emissive: 0x11635c, emissiveIntensity: 1.4, roughness: 0.3, flat: true }),
  );
  shell.position.y = 1.9;
  shell.castShadow = true;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.0, 0.05, 8, 60),
    new THREE.MeshBasicMaterial({ color: 0x2ad0c0, transparent: true, opacity: 0.55 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.9;
  core.add(plinth, shell, halo);
  core.userData.shell = shell;
  core.userData.halo = halo;
}
core.position.set(0, 0, CORE_Z);
stage.scene.add(core);

stage.onFrame((dt, t) => {
  core.userData.shell.rotation.y += dt * 0.55;
  core.userData.halo.rotation.z += dt * 0.3;
  core.userData.halo.scale.setScalar(1 + Math.sin(t * 1.6) * 0.03);
});

/* ---------------- Pads ---------------- */
const PAD_SPOTS = [
  [-3.6, -8], [3.6, -8],
  [-3.6, -1], [3.6, -1],
];

const PAD_IDLE = 0x3d566d, PAD_HOVER = 0x2757e2;

const pads = PAD_SPOTS.map(([x, z], i) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const plate = box(2.3, 0.16, 2.3, 0x1c2735, { roughness: 0.8 });
  plate.position.y = 0.08;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 0.98, 32),
    new THREE.MeshBasicMaterial({ color: PAD_IDLE, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.17;
  group.add(plate, ring);

  stage.scene.add(group);
  stage.pickable(group, { kind: 'pad', index: i });
  return { group, ring, x, z, index: i, control: null, tower: null, head: null };
});

// Empty pads pulse while there is budget left, so it is obvious where to click
stage.onFrame((dt, t) => {
  const inviting = state.phase === 'build' && state.left > 0;
  for (const pad of pads) {
    if (pad.control) continue;
    pad.ring.material.opacity = inviting ? 0.55 + Math.sin(t * 3 + pad.index) * 0.3 : 0.25;
  }
});

stage.onHover((next, prev) => {
  for (const [obj, on] of [[prev, false], [next, true]]) {
    const pad = pads.find((p) => p.group === obj);
    if (!pad || pad.control) continue;
    pad.ring.material.color.setHex(on ? PAD_HOVER : PAD_IDLE);
  }
});

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
const intelEl = document.getElementById('intel');
const chipEl = document.getElementById('threatChip');
const hint = document.getElementById('hint');
const goBtn = document.getElementById('go');
const stats = statBar(document.getElementById('stats'), [
  { id: 'integrity', label: 'Integrity', value: asset.integrity, max: asset.integrity, color: '#12A177' },
  { id: 'left', label: 'Controls', value: budget, max: budget },
  { id: 'stopped', label: 'Stopped', value: 0 },
]);

goBtn.addEventListener('click', startWave);
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
const state = {
  phase: 'build',      // build | wave | done
  wave: 0,
  integrity: asset.integrity,
  left: budget,
  stopped: 0,
  leaked: [],          // threat types that reached the core
  active: [],          // live threat objects
  queue: [],
  spawnTimer: 0,
};

stage.onPick((obj, data) => {
  if (state.phase !== 'build') return;
  if (data?.kind === 'pad') openPicker(pads[data.index]);
  else closePicker();
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__def = { stage, state, pads, controls, place, startWave, updateWave, restart };
}

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
beginBuild();

/* ============================================================
   Build phase — click a pad, choose a control
   ============================================================ */
function beginBuild() {
  state.phase = 'build';
  const wave = waves[state.wave];
  const threat = threatTypes[wave.threat];

  intelEl.textContent = wave.intel;
  chipEl.style.color = threat.css;
  chipEl.querySelector('span').textContent = `Incoming: ${threat.label}`;
  document.getElementById('eyebrow').textContent =
    `Wave ${state.wave + 1} of ${waves.length} — place your control`;
  goBtn.textContent = `Start wave ${state.wave + 1}`;
  goBtn.disabled = false;
  hint.textContent = meta.instructions;
}

let picker = null;

function openPicker(pad) {
  closePicker();

  if (pad.control) {
    picker = { pad, node: buildMenu(pad, [
      menuButton(pad.control.css, pad.control.label, pad.control.blurb, null),
      { label: 'Remove this control', cancel: true, onClick: () => { removeControl(pad); closePicker(); } },
    ], 'On this pad') };
  } else if (state.left <= 0) {
    toast('No controls left — start the wave', '', 2200);
    return;
  } else {
    picker = { pad, node: buildMenu(pad, [
      ...controls.map((c) => menuButton(c.css, c.label, c.blurb, () => { place(pad, c.id); closePicker(); })),
      { label: 'Cancel', cancel: true, onClick: closePicker },
    ], 'Put here') };
  }

  positionPicker();
}

function menuButton(css, name, sub, onClick) {
  return { css, name, sub, onClick };
}

function buildMenu(pad, items, heading) {
  const node = el('div.pad-menu.clickable', {},
    [el('div.head', {}, heading)].concat(items.map((it) => {
      if (it.cancel) {
        return el('button.cancel', { type: 'button', onclick: it.onClick || (() => {}) }, it.label);
      }
      return el('button', {
        type: 'button',
        style: `color:${it.css}`,
        disabled: it.onClick ? null : true,
        onclick: it.onClick || (() => {}),
      }, [
        el('span.dot'),
        el('span', {}, [
          el('div.name', {}, it.name),
          el('div.sub', {}, it.sub),
        ]),
      ]);
    })));
  document.body.append(node);
  return node;
}

/** Keep the menu glued to its pad, even while the camera moves, without
    ever letting it run off the edge of an embed frame. */
const MENU_GAP = 14, EDGE = 10;
function positionPicker() {
  if (!picker) return;
  const anchor = picker.pad.group.position.clone();
  anchor.y = 0.5;
  const v = anchor.project(stage.camera);
  const ax = (v.x * 0.5 + 0.5) * window.innerWidth;
  const ay = (-v.y * 0.5 + 0.5) * window.innerHeight;

  const { width: w, height: h } = picker.node.getBoundingClientRect();
  const left = Math.max(EDGE + w / 2, Math.min(ax, window.innerWidth - EDGE - w / 2));
  const top = Math.max(EDGE, Math.min(ay + MENU_GAP, window.innerHeight - EDGE - h));

  picker.node.style.left = `${left}px`;
  picker.node.style.top = `${top}px`;
  // Keep the arrow over the pad even when the menu has been nudged sideways
  picker.node.style.setProperty('--arrow', `${Math.max(16, Math.min(ax - (left - w / 2), w - 16))}px`);
}
stage.onFrame(positionPicker);

function closePicker() {
  picker?.node.remove();
  picker = null;
}

function place(pad, controlId) {
  if (pad.control || state.left <= 0) return;
  const c = controls.find((x) => x.id === controlId);
  pad.control = c;
  state.left -= 1;
  stats.set('left', state.left);
  buildTower(pad, c);
  pad.ring.material.color.setHex(c.color);
  pad.ring.material.opacity = 0.9;
  toast(`${c.label} placed`, 'good', 1800);
}

function removeControl(pad) {
  if (!pad.control) return;
  const label = pad.control.label;
  pad.control = null;
  state.left += 1;
  stats.set('left', state.left);
  if (pad.tower) stage.scene.remove(pad.tower);
  pad.tower = null;
  pad.head = null;
  pad.ring.material.color.setHex(PAD_IDLE);
  toast(`${label} removed`, '', 1600);
}

function buildTower(pad, c) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 0.5, 6), mat(0x27394d, { flat: true }));
  base.position.y = 0.4;
  base.castShadow = true;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 8), mat(0x35485e));
  post.position.y = 1.1;
  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 0),
    mat(c.color, { emissive: c.color, emissiveIntensity: 0.55, flat: true, roughness: 0.35 }),
  );
  head.position.y = 1.9;
  head.castShadow = true;
  g.add(base, post, head);
  g.position.copy(pad.group.position);
  g.scale.setScalar(0.01);
  stage.scene.add(g);
  pad.tower = g;
  pad.head = head;

  tween({ ms: 320, easing: ease.outBack, onUpdate: (_, e) => g.scale.setScalar(Math.max(0.01, e)) });
}

// One frame handler for every control head, rather than one per tower
// (those would pile up across restarts and keep disposed meshes alive).
stage.onFrame((dt) => {
  for (const pad of pads) if (pad.head) pad.head.rotation.y += dt * 0.9;
});

/* ============================================================
   Wave phase
   ============================================================ */
function startWave() {
  if (state.phase !== 'build') return;
  closePicker();
  state.phase = 'wave';
  goBtn.disabled = true;
  hint.textContent = 'Incoming — controls fire automatically';

  const wave = waves[state.wave];
  state.queue = Array.from({ length: wave.count }, (_, i) => ({ type: wave.threat, at: i * 0.75 }));
  state.spawnTimer = 0;
}

stage.onFrame(updateWave);

/** One step of the wave simulation. Split out so it can be stepped
    deterministically in tests instead of relying on wall-clock frames. */
function updateWave(dt) {
  if (state.phase !== 'wave') return;

  state.spawnTimer += dt;
  while (state.queue.length && state.queue[0].at <= state.spawnTimer) {
    spawnThreat(state.queue.shift().type);
  }

  for (const t of [...state.active]) {
    const prevZ = t.mesh.position.z;
    t.mesh.position.z += THREAT_SPEED * dt;
    t.mesh.rotation.x += dt * 2.2;
    t.mesh.rotation.y += dt * 1.4;

    const blocker = pads.find((p) =>
      p.control && p.control.stops === t.type && prevZ < p.z && t.mesh.position.z >= p.z);

    if (blocker) { blockThreat(t, blocker); continue; }
    if (t.mesh.position.z >= CORE_Z - 1.6) leakThreat(t);
  }

  if (!state.queue.length && !state.active.length) endWave();
}

function spawnThreat(type) {
  const def = threatTypes[type];
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.44, 0),
    mat(def.color, { emissive: def.color, emissiveIntensity: 0.7, flat: true, roughness: 0.4 }),
  );
  mesh.castShadow = true;
  mesh.position.set((Math.random() - 0.5) * (LANE_HALF * 1.2), 0.75, SPAWN_Z);
  stage.scene.add(mesh);

  const trail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 2.4),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.18 }),
  );
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(0, -0.7, -1.5);
  mesh.add(trail);

  state.active.push({ type, mesh });
}

function removeThreat(t) {
  state.active.splice(state.active.indexOf(t), 1);
  stage.scene.remove(t.mesh);
  t.mesh.geometry.dispose();
  t.mesh.material.dispose();
}

function blockThreat(t, pad) {
  state.stopped += 1;
  stats.set('stopped', state.stopped);
  burst(t.mesh.position, threatTypes[t.type].color);
  removeThreat(t);

  if (pad.head) {
    tween({ ms: 260, easing: ease.outCubic, onUpdate: (_, e) => pad.head.scale.setScalar(1 + Math.sin(e * Math.PI) * 0.45) });
  }
}

function leakThreat(t) {
  state.leaked.push(t.type);
  state.integrity = Math.max(0, state.integrity - 1);
  stats.set('integrity', state.integrity);
  burst(t.mesh.position, 0xef5f5f);
  removeThreat(t);
  toast(`${threatTypes[t.type].label} reached the database`, 'bad', 2400);

  const shell = core.userData.shell;
  tween({
    ms: 420,
    onUpdate: (_, e) => {
      shell.material.emissive.setHex(e < 0.5 ? 0x8c1f1f : 0x11635c);
      core.position.x = Math.sin(e * Math.PI * 8) * 0.14 * (1 - e);
    },
    onDone: () => { shell.material.emissive.setHex(0x11635c); core.position.x = 0; },
  });
}

function burst(at, color) {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    );
    p.position.copy(at);
    p.userData.v = new THREE.Vector3(
      (Math.random() - 0.5) * 4.5, Math.random() * 3.4, (Math.random() - 0.5) * 4.5);
    g.add(p);
  }
  stage.scene.add(g);
  tween({
    ms: 520,
    onUpdate: (_, e, raw) => {
      for (const p of g.children) {
        p.position.addScaledVector(p.userData.v, 0.016);
        p.userData.v.y -= 0.13;
        p.material.opacity = 1 - raw;
        p.rotation.x += 0.2;
      }
    },
    onDone: () => {
      stage.scene.remove(g);
      for (const p of g.children) { p.geometry.dispose(); p.material.dispose(); }
    },
  });
}

function endWave() {
  state.wave += 1;
  if (state.integrity <= 0 || state.wave >= waves.length) return finish();
  state.phase = 'build';
  beginBuild();
  toast(`Wave ${state.wave} held. ${state.left} control${state.left === 1 ? '' : 's'} left.`, 'good', 2800);
  bridge.progress(state.wave / waves.length);
}

/* ============================================================
   Debrief
   ============================================================ */
function finish() {
  state.phase = 'done';
  goBtn.disabled = true;
  closePicker();

  const lost = state.integrity <= 0;
  const clean = state.leaked.length === 0;
  const outcome = clean ? results.clean : lost ? results.lost : results.damaged;

  // Only report waves that actually ran — a run that ends early should not
  // claim the learner held a wave they never saw.
  const points = waves.slice(0, Math.max(1, state.wave)).map((w, i) => {
    const threat = threatTypes[w.threat];
    const control = controls.find((c) => c.stops === w.threat);
    const held = !state.leaked.includes(w.threat);
    return `<b style="color:${held ? 'var(--good)' : 'var(--danger)'}">${held ? '✓' : '✕'} ` +
      `Wave ${i + 1} · ${threat.label}</b> — ${held
        ? `stopped by <b>${control.label}</b>.`
        : `got through. <b>${control.label}</b> is the control that stops these.`}`;
  });

  const placed = pads.filter((p) => p.control);
  if (placed.length < budget) {
    points.push(`<b>You left ${budget - placed.length} control unplaced.</b> Every wave needs one on the lane.`);
  }

  bridge.complete({ passed: !lost, score: state.integrity / asset.integrity });

  showResult({
    passed: !lost,
    title: outcome.title,
    summary: outcome.summary,
    points,
    actions: [
      { label: 'Close', kind: 'ghost' },
      { label: 'Play again', kind: 'primary', onClick: restart },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  closePicker();
  for (const t of [...state.active]) removeThreat(t);
  for (const pad of pads) {
    if (pad.tower) stage.scene.remove(pad.tower);
    pad.tower = null;
    pad.head = null;
    pad.control = null;
    pad.ring.material.color.setHex(PAD_IDLE);
  }
  Object.assign(state, {
    phase: 'build', wave: 0, integrity: asset.integrity, left: budget,
    stopped: 0, leaked: [], active: [], queue: [], spawnTimer: 0,
  });
  stats.set('integrity', asset.integrity);
  stats.set('left', budget);
  stats.set('stopped', 0);
  bridge.restart();
  beginBuild();
}
