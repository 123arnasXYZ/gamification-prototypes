/* ============================================================
   01 — Investigator Desk
   One desk, two training topics.

   Medical:    four dispensed bottles. Pick one up, spin it, zoom in,
               read the label, and sticker it approved or rejected.
   Compliance: four printed emails. Pick one up, read it in the side
               panel, and stamp it approved or rejected.

   Both modes share the desk, the flow and the scoring; only the
   props and the content differ.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar, createReader, rows } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { modes, defaultMode } from './content.js';

const bridge = createBridge('investigator-desk');

/* ---------------- Layout constants ---------------- */
const SLOT_X = [-3.75, -1.25, 1.25, 3.75];
const SLOT_Z = 0.3;

const PAPER_W = 2.2, PAPER_H = 3.05, PAPER_Y = 0.09;

const BOTTLE_R = 0.46, BODY_H = 1.55, CAP_H = 0.34, LABEL_H = 1.02;

const HOME_CAM = new THREE.Vector3(0, 8.2, 7.2);
const HOME_TARGET = new THREE.Vector3(0, 0, 0.3);

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 42,
  cameraPos: HOME_CAM.toArray(),
  lookAt: HOME_TARGET.toArray(),
  background: 0x0b0e13,
  fog: [16, 40],
  // Always show the full row of four, whatever shape the frame is
  fit: { width: 10.4, height: 8.2 },
  orbitLimits: {
    minPolarAngle: 0.35,
    maxPolarAngle: 1.15,
    minAzimuthAngle: -0.55,
    maxAzimuthAngle: 0.55,
    minDistance: 8,
    maxDistance: 15,
  },
});

addLightRig(stage.scene, {
  hemi: 0.35,
  keyColor: 0xffe9c4,
  keyIntensity: 1.5,
  keyPos: [-5, 11, 5],
  shadowSize: 11,
  fillIntensity: 0.35,
});

/* ---------------- Desk ---------------- */
const WOOD = 0x4a3728, BLOTTER = 0x1f3b3a;

const deskTop = box(17, 0.6, 10, WOOD, { roughness: 0.85 });
deskTop.position.y = -0.3;
stage.scene.add(deskTop);

const blotter = box(12.6, 0.06, 6.6, BLOTTER, { roughness: 0.95 });
blotter.position.set(0, 0.03, 0.2);
stage.scene.add(blotter);

const lampLight = new THREE.SpotLight(0xffd9a0, 90, 22, 0.62, 0.45, 1.6);
lampLight.position.set(-5.4, 6.2, -1.6);
lampLight.target.position.set(-0.6, 0, 0.4);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(1024, 1024);
lampLight.shadow.bias = -0.001;
stage.scene.add(lampLight, lampLight.target);

/* ---------------- Stamp (compliance) ---------------- */
const stamp = new THREE.Group();
{
  const base = box(0.85, 0.3, 0.85, 0x2a2f3a, { roughness: 0.6 });
  base.position.y = 0.15;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.42, 16), mat(0x8a5a3b));
  neck.castShadow = true;
  neck.position.y = 0.52;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16), mat(0x9c6642, { roughness: 0.55 }));
  knob.castShadow = true;
  knob.position.y = 0.95;
  stamp.add(base, neck, knob);
}
const STAMP_HOME = new THREE.Vector3(5.2, 0.06, 2.4);
stamp.position.copy(STAMP_HOME);
stage.scene.add(stamp);

/* ---------------- Sticker sheet (medical) ---------------- */
const stickerSheet = new THREE.Group();
{
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.4), mat(0xf2eee5, { roughness: 1 }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.receiveShadow = true;
  stickerSheet.add(sheet);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.2, 24),
        mat(r === 0 ? 0x3f9b63 : 0xc8443f, { roughness: 0.75 }),
      );
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(-0.6 + c * 0.6, 0.004, -0.33 + r * 0.66);
      stickerSheet.add(dot);
    }
  }
  stickerSheet.position.set(5.3, 0.07, 2.4);
  stickerSheet.rotation.y = -0.18;
}
stage.scene.add(stickerSheet);

buildProps();

/* ---------------- UI ---------------- */
const eyebrowEl = document.getElementById('eyebrow');
const titleEl = document.getElementById('title');
const hint = document.getElementById('hint');
const reader = createReader();

const stats = statBar(document.getElementById('stats'), [
  { id: 'done', label: 'Reviewed', value: 0, max: 4 },
]);

const modeButtons = new Map();
const modesHost = document.getElementById('modes');
for (const m of modes) {
  const b = el('button', {
    type: 'button',
    'aria-pressed': 'false',
    onclick: () => setMode(m.id),
  }, m.label);
  modeButtons.set(m.id, b);
  modesHost.append(b);
}

document.getElementById('restart').addEventListener('click', () => restart());

/* ---------------- State ---------------- */
const state = {
  mode: null,       // the active mode object from content.js
  items: [],        // { def, group, home, homeRotY, kind, mark }
  decisions: {},
  selected: null,
  busy: false,
};

const INSPECT_OFFSET_X = 0.85;
const INSPECT_DIST = 3.9;
const inspect = { item: null, dist: INSPECT_DIST, target: new THREE.Vector3() };

stage.onPick((obj, data) => {
  if (state.busy) return;
  if (data?.kind === 'item') selectItem(data.index);
  else deselect();
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__desk = { stage, state, inspect, setMode, selectItem, decide, restart };
}

setMode(defaultMode);

requestAnimationFrame(() => {
  hideLoading();
  bridge.ready();
});

/* ============================================================
   Modes
   ============================================================ */
function setMode(id) {
  const mode = modes.find((m) => m.id === id);
  if (!mode || state.mode === mode) return;

  clearItems();
  state.mode = mode;

  for (const [key, btn] of modeButtons) btn.setAttribute('aria-pressed', String(key === id));

  eyebrowEl.textContent = mode.eyebrow;
  titleEl.textContent = mode.title;
  stamp.visible = mode.kind === 'paper';
  stickerSheet.visible = mode.kind === 'bottle';

  state.items = mode.items.map((def, i) =>
    (mode.kind === 'bottle' ? buildBottle(def, i) : buildPaper(def, i)));

  restart({ keepMode: true });
  toast(`${mode.label} loaded`, '', 1800);
}

function clearItems() {
  exitInspect(true);
  for (const item of state.items) {
    stage.unpickable(item.group);
    stage.scene.remove(item.group);
    item.group.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      for (const m of [].concat(o.material)) { m.map?.dispose(); m.dispose(); }
    });
  }
  state.items = [];
  state.selected = null;
}

/* ============================================================
   Item construction
   ============================================================ */
function buildPaper(def, i) {
  const group = new THREE.Group();
  group.position.set(SLOT_X[i], PAPER_Y, SLOT_Z);
  const homeRotY = (i % 2 ? 1 : -1) * (0.03 + (i * 0.017) % 0.04);
  group.rotation.y = homeRotY;

  for (let s = 0; s < 2; s++) {
    const under = new THREE.Mesh(
      new THREE.PlaneGeometry(PAPER_W, PAPER_H),
      mat(0xdcd5c7, { roughness: 1 }),
    );
    under.rotation.x = -Math.PI / 2;
    under.rotation.z = (s + 1) * 0.02;
    under.position.y = -0.012 * (s + 1);
    under.receiveShadow = true;
    group.add(under);
  }

  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(PAPER_W, PAPER_H),
    new THREE.MeshStandardMaterial({ map: emailTexture(def), roughness: 0.92, metalness: 0 }),
  );
  sheet.rotation.x = -Math.PI / 2;
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  group.add(sheet);

  stage.scene.add(group);
  stage.pickable(group, { kind: 'item', index: i });

  return {
    def, group, kind: 'paper',
    home: group.position.clone(),
    homeRotY,
    mark: null,
    token: 0,
  };
}

function buildBottle(def, i) {
  const group = new THREE.Group();
  group.position.set(SLOT_X[i], 0, SLOT_Z);
  // Labels start turned away by different amounts, so the learner has
  // to actually pick each bottle up and turn it rather than reading
  // every label from the desk view.
  const homeRotY = [-2.3, 1.9, -1.1, 2.7][i];
  group.rotation.y = homeRotY;

  const bodyMat = mat(0xb9762c, { roughness: 0.34, metalness: 0.02 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(BOTTLE_R, BOTTLE_R * 0.96, BODY_H, 32), bodyMat);
  body.position.y = BODY_H / 2;
  body.castShadow = true;
  body.receiveShadow = true;

  const shoulder = new THREE.Mesh(
    new THREE.CylinderGeometry(BOTTLE_R * 0.62, BOTTLE_R, 0.2, 32),
    bodyMat,
  );
  shoulder.position.y = BODY_H + 0.1;
  shoulder.castShadow = true;

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(BOTTLE_R * 0.66, BOTTLE_R * 0.66, CAP_H, 32),
    mat(0xe9e6df, { roughness: 0.55 }),
  );
  cap.position.y = BODY_H + 0.2 + CAP_H / 2;
  cap.castShadow = true;

  // Label wraps the whole bottle. thetaStart -PI puts the middle of
  // the texture on +Z, so the artwork faces the camera at rotation 0.
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(BOTTLE_R + 0.004, BOTTLE_R + 0.004, LABEL_H, 48, 1, true, -Math.PI, Math.PI * 2),
    new THREE.MeshStandardMaterial({ map: bottleLabelTexture(def), roughness: 0.85, side: THREE.DoubleSide }),
  );
  label.position.y = 0.62;

  group.add(body, shoulder, cap, label);
  stage.scene.add(group);
  stage.pickable(group, { kind: 'item', index: i });

  return {
    def, group, kind: 'bottle',
    home: group.position.clone(),
    homeRotY,
    mark: null,
    token: 0,
  };
}

/* ============================================================
   Selection
   ============================================================ */
let animToken = 0;

function selectItem(index) {
  const item = state.items[index];
  if (!item || state.selected === item) return;

  const prev = state.selected;
  state.selected = item;
  if (prev) putDown(prev);

  if (item.kind === 'bottle') enterInspect(item);
  else liftPaper(item);

  openReader(item);
  hint.textContent = item.kind === 'bottle'
    ? `${item.def.id} — drag to turn it, scroll to zoom, or click the desk to put it back`
    : `${item.def.id} — decide with the stamp, or click the desk to put it back`;
}

function deselect() {
  const item = state.selected;
  state.selected = null;
  reader.close();
  hint.textContent = state.mode?.instructions ?? '';
  if (!item) return;
  putDown(item);
}

function putDown(item) {
  if (item.kind === 'bottle') exitInspect();
  else lowerPaper(item);
}

function liftPaper(item) {
  const token = ++animToken;
  item.token = token;
  tween({
    ms: 380,
    easing: ease.outCubic,
    onUpdate: (_, e) => {
      if (item.token !== token) return;
      item.group.position.set(item.home.x, item.home.y + 0.6 * e, item.home.z + 0.12 * e);
      item.group.rotation.y = item.homeRotY * (1 - e);
      item.group.rotation.x = -0.13 * e;
    },
  });
}

function lowerPaper(item) {
  const token = ++animToken;
  item.token = token;
  const from = item.group.position.clone();
  const fromRotX = item.group.rotation.x;
  tween({
    ms: 280,
    onUpdate: (_, e) => {
      if (item.token !== token) return;
      item.group.position.lerpVectors(from, item.home, e);
      item.group.rotation.x = fromRotX * (1 - e);
      item.group.rotation.y = item.homeRotY * e;
    },
  });
}

/* ---------------- Bottle inspection: spin and zoom, in place ----------
   The bottle never moves. The camera comes to it, and dragging turns it
   about its own axis, so it behaves like an object you are turning on the
   desk rather than one you are waving around.
   ------------------------------------------------------------------ */
/* The camera is one shared thing, so it gets one token of its own. Using the
   per-item tokens here meant that picking up bottle B while bottle A was
   still in hand left two camera tweens running at once — one pulling home,
   one pulling to B — and A's tween handed control back to OrbitControls
   halfway through B's. Now the newest move always wins outright. */
let cameraToken = 0;

function enterInspect(item) {
  inspect.item = item;
  inspect.dist = INSPECT_DIST;
  // Aim to the right of the bottle so it sits in the strip of screen the
  // reader panel does not cover, rather than behind it.
  inspect.target.set(item.home.x + INSPECT_OFFSET_X, item.home.y + 1.05, item.home.z);
  stage.controls.enabled = false;

  const token = ++cameraToken;
  const fromPos = stage.camera.position.clone();
  const toPos = inspectCameraPos();

  tween({
    ms: 520,
    easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      if (cameraToken !== token) return;
      stage.camera.position.lerpVectors(fromPos, toPos, e);
      stage.camera.lookAt(inspect.target);
    },
  });
}

/** Turn a bottle back to rest. Per-item, so it keeps running even when the
    camera has already moved on to another bottle. */
function turnHome(item) {
  const token = ++animToken;
  item.token = token;
  const fromRotY = item.group.rotation.y;
  // Leave a decided bottle facing forward so its sticker stays visible
  const toRotY = item.mark ? 0 : item.homeRotY;
  tween({
    ms: 460,
    easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      if (item.token !== token) return;
      item.group.rotation.y = fromRotY + (toRotY - fromRotY) * e;
    },
  });
}

function exitInspect(immediate = false) {
  const item = inspect.item;
  inspect.item = null;
  if (!item) return;

  turnHome(item);

  const token = ++cameraToken;
  const finish = () => {
    if (cameraToken !== token) return;   // another bottle took the camera
    stage.controls.target.copy(HOME_TARGET);
    stage.controls.enabled = true;
    stage.controls.update();
  };

  if (immediate) {
    stage.camera.position.copy(HOME_CAM);
    stage.camera.lookAt(HOME_TARGET);
    finish();
    return;
  }

  const fromPos = stage.camera.position.clone();

  tween({
    ms: 460,
    easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      if (cameraToken !== token) return;
      stage.camera.position.lerpVectors(fromPos, HOME_CAM, e);
      stage.camera.lookAt(HOME_TARGET);
    },
    onDone: finish,
  });
}

function inspectCameraPos() {
  return new THREE.Vector3(
    inspect.target.x,
    inspect.target.y + inspect.dist * 0.10,
    inspect.target.z + inspect.dist,
  );
}

// Drag to spin the bottle, wheel to zoom. Only active while inspecting;
// the rest of the time OrbitControls owns the pointer.
{
  const canvas = stage.renderer.domElement;
  let dragging = false, lastX = 0, lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    if (!inspect.item) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    // Capture keeps the spin going if the pointer leaves the canvas.
    // It throws for pointers the browser no longer tracks, which is not
    // worth failing the handler over.
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !inspect.item) return;
    // Yaw only. Tilting as well pivoted the bottle about its base, so it
    // rocked around instead of turning on the spot. A bottle standing on a
    // desk turns about its own vertical axis and nothing else.
    inspect.item.group.rotation.y -= (e.clientX - lastX) * 0.011;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  const stop = () => { dragging = false; };
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);

  canvas.addEventListener('wheel', (e) => {
    if (!inspect.item) return;
    e.preventDefault();
    inspect.dist = Math.max(2.0, Math.min(6.0, inspect.dist + e.deltaY * 0.0022));
    stage.camera.position.copy(inspectCameraPos());
    stage.camera.lookAt(inspect.target);
  }, { passive: false });
}

/* ============================================================
   Reader panel
   ============================================================ */
function openReader(item) {
  const def = item.def;
  const decided = state.decisions[def.id];
  const isBottle = item.kind === 'bottle';

  const body = isBottle
    ? [
      rows([
        ['Patient', def.patient],
        ['Drug', def.drug],
        ['Strength', def.strength],
        ['Form', def.form],
        ['Quantity', def.quantity],
        ['Directions', def.directions],
        ['Batch', def.batch],
        ['Expiry', def.expiry],
      ]),
      el('p', { style: noteStyle() }, def.note),
    ]
    : [
      rows([
        ['From', def.from],
        ['To', def.to],
        ['Date', def.date],
        ['Subject', def.subject],
        ['Marked', def.classification],
      ]),
      el('div', { style: 'margin-top:16px;border-top:1px solid var(--line);padding-top:14px' },
        def.body.map((line) => el('p', {
          style: 'margin:0 0 8px;font-size:13.5px;color:var(--ink)',
        }, line))),
    ];

  if (decided) {
    body.push(el('p', {
      style: `margin:16px 0 0;font-weight:600;color:${decided === 'approve' ? 'var(--good)' : 'var(--danger)'}`,
    }, decided === 'approve' ? 'Marked: APPROVED' : 'Marked: REJECTED'));
  }

  reader.open({
    eyebrow: def.id,
    title: isBottle ? `${def.drug} ${def.strength}` : def.subject,
    bodyNodes: body,
    actions: decided
      ? [{ label: 'Close', kind: 'ghost', grow: true, onClick: () => deselect() }]
      : [
        { label: 'Approve', kind: 'confirm', grow: true, onClick: () => decide(item, 'approve') },
        { label: 'Reject', kind: 'reject', grow: true, onClick: () => decide(item, 'reject') },
      ],
  });
}

const noteStyle = () =>
  'margin:18px 0 0;color:var(--ink-dim);font-size:13.5px;border-top:1px solid var(--line);padding-top:14px';

/* ============================================================
   Decisions
   ============================================================ */
async function decide(item, choice) {
  if (state.busy || state.decisions[item.def.id]) return;
  state.busy = true;
  state.decisions[item.def.id] = choice;
  reader.close();

  if (item.kind === 'bottle') await applySticker(item, choice);
  else await stampOnto(item, choice);

  stats.set('done', Object.keys(state.decisions).length);
  bridge.progress(Object.keys(state.decisions).length / state.mode.items.length);
  toast(`${item.def.id} ${choice === 'approve' ? 'approved' : 'rejected'}`,
    choice === 'approve' ? 'good' : 'bad', 1800);

  deselect();
  state.busy = false;

  if (Object.keys(state.decisions).length === state.mode.items.length) {
    await wait(600);
    evaluate();
  }
}

/** Compliance: the stamp flies over the lifted sheet and presses. */
async function stampOnto(item, choice) {
  const target = item.group.position.clone();
  const start = stamp.position.clone();
  const high = new THREE.Vector3(target.x, target.y + 2.1, target.z + 0.1);

  await tween({ ms: 320, easing: ease.outCubic, onUpdate: (_, e) => stamp.position.lerpVectors(start, high, e) });
  await tween({ ms: 130, easing: ease.outCubic, onUpdate: (_, e) => { stamp.position.y = high.y - e * 1.55; } });

  addImprint(item, choice);

  await tween({ ms: 260, easing: ease.outCubic, onUpdate: (_, e) => { stamp.position.y = (high.y - 1.55) + e * 1.55; } });
  await tween({ ms: 320, easing: ease.inOutCubic, onUpdate: (_, e) => stamp.position.lerpVectors(high, STAMP_HOME, e) });
}

function addImprint(item, choice) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.85, 0.92),
    new THREE.MeshBasicMaterial({ map: imprintTexture(choice), transparent: true, opacity: 0.9, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = -0.22;
  m.position.set(0, 0.012, 0.55);
  m.scale.setScalar(1.5);
  item.group.add(m);
  item.mark = m;
  tween({ ms: 220, easing: ease.outBack, onUpdate: (_, e) => m.scale.setScalar(1.5 - 0.5 * e) });
}

/** Medical: turn the bottle face-on, then press a sticker onto the label. */
async function applySticker(item, choice) {
  const g = item.group;
  const fromY = g.rotation.y;
  // Shortest way round to facing the camera
  const toY = fromY - Math.atan2(Math.sin(fromY), Math.cos(fromY));

  await tween({
    ms: 380,
    easing: ease.inOutCubic,
    onUpdate: (_, e) => { g.rotation.y = fromY + (toY - fromY) * e; },
  });

  const sticker = new THREE.Mesh(
    new THREE.CylinderGeometry(BOTTLE_R + 0.014, BOTTLE_R + 0.014, 0.52, 32, 1, true, -0.68, 1.36),
    new THREE.MeshBasicMaterial({
      map: stickerTexture(choice),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  sticker.position.y = 0.5;
  sticker.scale.setScalar(0.01);
  g.add(sticker);
  item.mark = sticker;

  // Press it on. The push is expressed entirely in the sticker so the
  // bottle stays planted on the desk.
  await tween({
    ms: 380,
    easing: ease.outBack,
    onUpdate: (_, e) => { sticker.scale.set(1, Math.max(0.01, e), 1); },
  });
  sticker.scale.set(1, 1, 1);
}

/* ============================================================
   Scoring
   ============================================================ */
function evaluate() {
  const items = state.mode.items;
  const faulty = items.find((r) => r.faulty);
  const caught = state.decisions[faulty.id] === 'reject';
  const falseRejects = items.filter((r) => !r.faulty && state.decisions[r.id] === 'reject');
  const passed = caught && falseRejects.length === 0;

  const R = state.mode.results;
  const outcome = !caught ? R.missed : (falseRejects.length ? R.overcautious : R.perfect);
  const score = (caught ? 0.6 : 0) + (1 - falseRejects.length / 3) * 0.4;

  const points = items.map((r) => {
    const d = state.decisions[r.id];
    const right = r.faulty ? d === 'reject' : d === 'approve';
    const color = right ? 'var(--good)' : 'var(--danger)';
    const name = state.mode.kind === 'bottle'
      ? `${r.id} · ${r.drug} ${r.strength}`
      : `${r.id} · ${r.subject}`;
    return `<b style="color:${color}">${right ? '✓' : '✕'} ${name}</b> — ${r.verdict}`;
  });

  bridge.complete({ passed, score: Math.max(0, score), mode: state.mode.id });

  showResult({
    passed,
    title: outcome.title,
    summary: outcome.summary,
    points,
    actions: [
      { label: 'Review the desk', kind: 'ghost' },
      { label: 'Try again', kind: 'primary', onClick: () => restart() },
    ],
  });
}

function restart({ keepMode = false } = {}) {
  document.querySelector('.scrim')?.remove();
  deselect();
  state.decisions = {};
  state.busy = false;

  for (const item of state.items) {
    if (item.mark) {
      item.group.remove(item.mark);
      item.mark.geometry.dispose();
      item.mark.material.map?.dispose();
      item.mark.material.dispose();
      item.mark = null;
    }
    item.group.position.copy(item.home);
    item.group.rotation.set(0, item.homeRotY, 0);
  }

  stats.set('done', 0);
  hint.textContent = state.mode.instructions;
  if (!keepMode) bridge.restart();
}

/* ============================================================
   Canvas artwork
   ============================================================ */

/** Wrap-around bottle label. The middle of the canvas lands on +Z. */
function bottleLabelTexture(def) {
  const markColor = def.faulty ? '#c8443f' : '#2f6ba8';
  return canvasTexture(1400, 480, (c, w, h) => {
    c.fillStyle = '#f6f3ec';
    c.fillRect(0, 0, w, h);

    // Bands run the whole way round the bottle
    c.fillStyle = markColor;
    c.fillRect(0, 0, w, 54);
    c.fillRect(0, h - 26, w, 26);

    c.fillStyle = 'rgba(120,105,80,0.05)';
    for (let i = 0; i < 500; i++) c.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);

    c.fillStyle = '#f6f3ec';
    c.font = '700 24px Helvetica, Arial, sans-serif';
    c.textAlign = 'center';
    c.letterSpacing = '4px';
    c.fillText('CENTRAL DISTRICT PHARMACY', w / 2, 36);
    c.letterSpacing = '0px';

    // Everything below is centred so it faces the camera at rotation 0
    const cx = w / 2;

    c.fillStyle = '#8d8474';
    c.font = '600 15px Helvetica, Arial, sans-serif';
    c.letterSpacing = '2px';
    c.fillText(`${def.id}   ·   ${def.patient.toUpperCase()}`, cx, 92);
    c.letterSpacing = '0px';

    c.fillStyle = '#1d2733';
    c.font = '700 62px Georgia, serif';
    c.fillText(def.drug, cx, 160);

    // The dose box: printed in the flag colour by the checking system
    c.strokeStyle = markColor;
    c.lineWidth = 4;
    roundRect(c, cx - 210, 186, 420, 88, 10);
    c.stroke();
    c.fillStyle = markColor;
    c.font = '700 54px Consolas, monospace';
    c.fillText(def.strength, cx, 250);

    c.fillStyle = '#3c4552';
    c.font = '600 26px Helvetica, Arial, sans-serif';
    c.fillText(def.directions.toUpperCase(), cx, 316);

    c.fillStyle = '#7d7466';
    c.font = '400 20px Helvetica, Arial, sans-serif';
    c.fillText(`${def.form}   ·   ${def.quantity}`, cx, 356);
    c.fillText(`BATCH ${def.batch}   ·   EXP ${def.expiry}`, cx, 388);

    // Barcode blocks to either side, so the wrap looks like a real label
    c.fillStyle = '#2b3242';
    for (const startX of [90, w - 330]) {
      let x = startX;
      for (let i = 0; i < 40; i++) {
        const bw = 1 + Math.round(Math.random() * 4);
        c.fillRect(x, 150, bw, 130);
        x += bw + 3 + Math.round(Math.random() * 3);
      }
    }
    c.textAlign = 'left';
  });
}

/** Green APPROVED / red REJECTED sticker, curved onto the bottle. */
function stickerTexture(choice) {
  const approve = choice === 'approve';
  const color = approve ? '#2f8f57' : '#bd3b36';
  return canvasTexture(760, 300, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const pad = 40;
    c.fillStyle = color;
    roundRect(c, pad, 40, w - pad * 2, h - 80, 26);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 5;
    roundRect(c, pad + 16, 56, w - pad * 2 - 32, h - 112, 18);
    c.stroke();

    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '800 74px Helvetica, Arial, sans-serif';
    c.fillText(approve ? 'APPROVED' : 'REJECTED', w / 2, h / 2 - 6);
    c.font = '600 22px Helvetica, Arial, sans-serif';
    c.letterSpacing = '5px';
    c.fillText(approve ? 'CHECKED — SAFE TO DISPENSE' : 'DO NOT DISPENSE', w / 2, h / 2 + 46);
    c.letterSpacing = '0px';
  });
}

/** Printed email, laid out for the flat sheet on the desk. */
function emailTexture(def) {
  const classColor = {
    'Internal': '#5b6a7d',
    'External': '#c78d0f',
    'Confidential — NDA': '#1f8f87',
    'Public': '#3f9b63',
  }[def.classification] || '#5b6a7d';

  return canvasTexture(620, 860, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f7f2e7');
    g.addColorStop(1, '#ebe3d3');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    c.fillStyle = 'rgba(120,105,80,0.05)';
    for (let i = 0; i < 900; i++) c.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);

    // Header
    c.fillStyle = '#1d2733';
    c.fillRect(0, 0, w, 104);
    c.fillStyle = '#f0b429';
    c.font = '700 21px Georgia, serif';
    c.fillText('NORTHBRIDGE — OUTBOUND MAIL', 34, 46);
    c.fillStyle = '#8fa0b5';
    c.font = '500 15px Helvetica, Arial, sans-serif';
    c.fillText('Printed copy for review', 34, 74);
    c.fillStyle = '#f4eee2';
    c.font = '700 24px Consolas, monospace';
    c.textAlign = 'right';
    c.fillText(def.id, w - 34, 62);
    c.textAlign = 'left';

    // Classification chip
    c.fillStyle = classColor;
    const chipW = c.measureText(def.classification).width;
    roundRect(c, 34, 128, Math.max(150, chipW + 90), 40, 20);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = '700 15px Helvetica, Arial, sans-serif';
    c.letterSpacing = '1.5px';
    c.fillText(def.classification.toUpperCase(), 54, 154);
    c.letterSpacing = '0px';

    // Envelope block
    let y = 208;
    for (const [k, v] of [['FROM', def.from], ['TO', def.to], ['DATE', def.date]]) {
      label(c, k, 34, y);
      c.fillStyle = '#1d2733';
      c.font = '500 19px Consolas, monospace';
      c.fillText(v, 116, y + 2);
      y += 40;
    }

    rule(c, 34, y + 6, w - 68);

    // Subject
    y += 48;
    label(c, 'SUBJECT', 34, y);
    c.fillStyle = '#16202a';
    c.font = '700 30px Georgia, serif';
    y = wrap(c, def.subject, 34, y + 40, w - 68, 36, 2);

    // Body
    y += 46;
    c.fillStyle = '#3a4250';
    c.font = '400 18px Georgia, serif';
    for (const line of def.body) {
      y = wrap(c, line, 34, y, w - 68, 27, 2) + 27;
    }

    // Footer
    rule(c, 34, 764, w - 68);
    c.fillStyle = '#7d7466';
    c.font = 'italic 400 15px Georgia, serif';
    wrap(c, 'Reviewed under the outbound information policy. Approve only if this may lawfully leave the company.',
      34, 792, w - 68, 22, 3);

    c.fillStyle = '#2b3242';
    for (let i = 0, x = 34; i < 34; i++) {
      const bw = 1 + Math.round(Math.random() * 3);
      c.fillRect(x, 826, bw, 22);
      x += bw + 2 + Math.round(Math.random() * 2);
    }
  });
}

function imprintTexture(choice) {
  const approve = choice === 'approve';
  const color = approve ? '#3f9b63' : '#c8443f';
  return canvasTexture(600, 300, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h / 2);
    c.rotate(-0.06);
    c.strokeStyle = color;
    c.lineWidth = 10;
    roundRect(c, -252, -96, 504, 192, 14);
    c.stroke();
    c.lineWidth = 4;
    roundRect(c, -236, -80, 472, 160, 10);
    c.stroke();
    c.fillStyle = color;
    c.font = '800 78px Helvetica, Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(approve ? 'APPROVED' : 'REJECTED', 0, -4);
    c.restore();

    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(0,0,0,${0.25 + Math.random() * 0.5})`;
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, Math.random() * 3.2, 0, Math.PI * 2);
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  });
}

/* --- tiny 2D drawing utilities --- */
function label(c, text, x, y) {
  c.fillStyle = '#9a9081';
  c.font = '600 13px Helvetica, Arial, sans-serif';
  c.letterSpacing = '2px';
  c.fillText(text, x, y);
  c.letterSpacing = '0px';
}
function rule(c, x, y, w) {
  c.strokeStyle = '#cdc3ae';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke();
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
function wrap(c, text, x, y, maxW, lh, maxLines = 4) {
  const words = String(text).split(' ');
  let line = '', lines = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, x, y);
      y += lh; line = word;
      if (++lines >= maxLines - 1) break;
    } else line = test;
  }
  c.fillText(line, x, y);
  return y;
}

/* ============================================================
   Desk dressing
   ============================================================ */
function buildProps() {
  const g = new THREE.Group();

  const lamp = new THREE.Group();
  const lbase = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.16, 24), mat(0x2c3240, { roughness: 0.5 }));
  lbase.position.y = 0.08; lbase.castShadow = true;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 12), mat(0x39404f));
  pole.position.y = 1.78; pole.castShadow = true;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.5, 12), mat(0x39404f));
  arm.position.set(0.95, 3.35, 0.55); arm.rotation.z = Math.PI / 2 - 0.28; arm.rotation.y = -0.35;
  arm.castShadow = true;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.86, 24, 1, true), mat(0x2c3240, { side: THREE.DoubleSide, roughness: 0.45 }));
  shade.position.set(1.95, 3.0, 1.05); shade.rotation.x = 0.42; shade.rotation.z = 0.26;
  shade.castShadow = true;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe7bd }));
  bulb.position.set(1.99, 2.78, 1.14);
  lamp.add(lbase, pole, arm, shade, bulb);
  lamp.position.set(-6.4, 0, -2.2);
  g.add(lamp);

  const mug = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.6, 20), mat(0xd9dde3, { roughness: 0.35 }));
  cup.position.y = 0.3; cup.castShadow = true;
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 20), mat(0x3a2418));
  coffee.position.y = 0.55;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 10, 20, Math.PI * 1.3), mat(0xd9dde3, { roughness: 0.35 }));
  handle.position.set(0.38, 0.32, 0); handle.rotation.z = -0.35;
  mug.add(cup, coffee, handle);
  mug.position.set(5.9, 0.02, -1.9);
  g.add(mug);

  [[-5.3, 2.6, 0.18, 0xf5d94e], [-4.6, 3.05, -0.42, 0xf29b6b], [4.9, -3.2, 0.62, 0x8ed3a0]].forEach(([x, z, rot, col]) => {
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), mat(col, { roughness: 1 }));
    n.rotation.x = -Math.PI / 2; n.rotation.z = rot;
    n.position.set(x, 0.07, z);
    n.receiveShadow = true;
    g.add(n);
  });

  const photo = new THREE.Group();
  const border = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.4), mat(0xf1ece2, { roughness: 1 }));
  border.rotation.x = -Math.PI / 2;
  const img = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), mat(0x2f4257, { roughness: 0.9 }));
  img.rotation.x = -Math.PI / 2; img.position.y = 0.004; img.position.z = -0.1;
  photo.add(border, img);
  photo.position.set(-5.6, 0.07, 2.5);
  photo.rotation.y = 0.24;
  g.add(photo);

  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 1.5, 10), mat(0x1c2029, { roughness: 0.4, metalness: 0.3 }));
  pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.4;
  pen.position.set(3.6, 0.1, 3.1);
  pen.castShadow = true;
  g.add(pen);

  const pad = box(1.15, 0.16, 0.85, 0x232936, { roughness: 0.6 });
  pad.position.set(6.6, 0.09, 2.4);
  g.add(pad);

  stage.scene.add(g);
}
