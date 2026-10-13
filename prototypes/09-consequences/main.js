/* ============================================================
   09 — Use immediate consequences as feedback
   Goods-in, bay 3. Build a load on a pallet and the crane takes it up
   to the mezzanine exactly as it stands. No feedback box and no
   right/wrong: anything carrying more than it can take gives way on
   the spot, a bad centre of gravity shows as a lean while you build,
   a perched item sits visibly over nothing — and damage stays done.
   What happens in the air is the build. The ending describes what
   made it up there.

   Every learner-facing string and every tunable number is in
   content.js. Helpers used during start-up are hoisted `function`
   declarations on purpose.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, bay, items, rules, ui, cogReadings, building, air, arrivals } from './content.js';

const bridge = createBridge('consequences');

/* ---------------- Layout of the bay (scene metres) ---------------- */
const PALLET_X = 2.2;      // where the pallet stands while you build
const HOOK_Y = 6.0;        // where the hook waits
const BEAM_Y = 6.95;       // the gantry beam the trolley rides
const MEZZ_X = 7.6;        // where the load is set down
const MEZZ_TOP = 4.0;      // mezzanine deck height
const LIFT_H = 4.9;        // how far the load is hoisted
const DROP_H = LIFT_H - MEZZ_TOP;
const BENCH_TOP = 0.9;
const BENCH_Z = 0.3;
const HOOK_GAP = 0.45;     // hook block clearance above the load
const TMP = new THREE.Vector3();

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [0.6, 4.4, 14.5],
  lookAt: [0.8, 2.6, 0],
  background: 0x151b23,
  fog: [22, 52],
  fit: { width: 17.5, height: 9.0 },
  orbitLimits: {
    minPolarAngle: 1.0, maxPolarAngle: 1.46,
    minAzimuthAngle: -0.4, maxAzimuthAngle: 0.4,
    minDistance: 11, maxDistance: 18,
  },
});

addLightRig(stage.scene, {
  sky: 0xdfe8f3, ground: 0x2a3038, hemi: 0.9,
  keyColor: 0xfff1dc, keyIntensity: 1.7, keyPos: [-5, 15, 9],
  shadowSize: 16, fillColor: 0x4a6f9c, fillIntensity: 0.5,
});

/* ---------------- The bay ---------------- */
buildBay();

/* The lift rig: swinging about the hook point, so the whole load
   pendulums on the sling the way a real one does.
     sling (pivot at the hook)
       riser (goes up, carries the pallet and the hook block)
         pallet
         loadGroup (leans by the centre of gravity)
         hook + slings  */
const sling = new THREE.Group();
sling.position.set(PALLET_X, HOOK_Y, 0);
stage.scene.add(sling);

const riser = new THREE.Group();
riser.position.y = -HOOK_Y;
sling.add(riser);

const pallet = buildPallet();
riser.add(pallet);

const loadGroup = new THREE.Group();
loadGroup.position.y = bay.pallet.top;
riser.add(loadGroup);

const hook = buildHook();
hook.position.y = HOOK_Y;
riser.add(hook);

const slingLines = [buildSlingLine(), buildSlingLine()];
slingLines.forEach((s) => riser.add(s));

const trolley = box(0.86, 0.3, 0.66, 0x3c4654, { roughness: 0.6 });
trolley.position.set(PALLET_X, BEAM_Y - 0.3, 0);
const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), mat(0x20262f, { roughness: 0.5 }));
stage.scene.add(trolley, cable);

/* ---------------- The five things in the staging area ---------------- */
const boxes = items.map((item, i) => {
  const g = makeItem(item);
  g.userData.home = new THREE.Vector3(-6.0 + i * 1.45, BENCH_TOP, BENCH_Z);
  g.position.copy(g.userData.home);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'item', id: item.id });
  return g;
});
const byId = Object.fromEntries(boxes.map((b) => [b.userData.item.id, b]));

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const bottom = document.getElementById('bottom');
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ----------------
   stack:   item ids, bottom course → top
   crushed: ids that have given way (damage stays done)
   cog:     the live centre of gravity reading
   air:     what happened on the lift, once it has happened          */
const state = {
  stack: [],
  crushed: new Set(),
  warned: new Set(),
  cog: emptyCog(),
  air: null,
  hover: null,
  busy: false,
  lifted: false,
};

stage.onPick((obj, data) => {
  if (!data || data.kind !== 'item' || state.busy || state.lifted) return;
  if (!state.stack.includes(data.id)) place(data.id);
});

// Hovering something in the staging area reads out its character.
stage.onHover((next) => {
  if (state.lifted) return;
  const id = next?.userData?.item?.id ?? null;
  if (id === state.hover) return;
  state.hover = id;
  renderControls();
});

stage.onFrame((dt, t) => { updateRig(t); });

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__stack = { state, place, liftTop, lift, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Actions
   ============================================================ */
/** Put an item on the load. Consequences land before this resolves. */
async function place(id) {
  if (state.busy || state.lifted) return;
  if (!byId[id] || state.stack.includes(id)) return;
  state.busy = true;
  renderControls();

  const g = byId[id];
  const from = g.position.clone();
  const to = loadGroup.localToWorld(new THREE.Vector3(0, stackHeight(), 0));
  await tween({
    ms: 700, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      g.position.lerpVectors(from, to, e);
      g.position.y += Math.sin(e * Math.PI) * 1.3;
    },
  });

  loadGroup.add(g);
  g.rotation.set(0, 0, 0);
  state.stack.push(id);
  relayout();
  await evaluate();

  bridge.progress(state.stack.length / items.length, {
    courses: state.stack.length, damaged: state.crushed.size, lean: state.cog.lean,
  });
  state.busy = false;
  renderControls();
}

/** Take the top course back off. Whatever is damaged stays damaged. */
async function liftTop() {
  if (!state.stack.length || state.busy || state.lifted) return;
  state.busy = true;
  renderControls();

  const g = byId[state.stack.pop()];
  const item = g.userData.item;
  stage.scene.attach(g);
  const from = g.position.clone();
  const to = g.userData.home;
  await tween({
    ms: 640, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      g.position.lerpVectors(from, to, e);
      g.position.y += Math.sin(e * Math.PI) * 1.3;
      g.rotation.z *= 1 - e;
    },
  });
  g.rotation.set(0, 0, 0);
  if (state.crushed.has(item.id)) toast(building.damageStays(item.name.toLowerCase()), '', 3200);

  relayout();
  await evaluate({ announce: false });
  state.busy = false;
  renderControls();
}

/** The finale: hook on, up, across, down on the mezzanine deck. */
async function lift() {
  if (state.busy || state.lifted || state.stack.length < rules.minItems) return;
  state.busy = true;
  state.lifted = true;
  renderControls();

  const plan = readAir();
  state.air = plan;

  // 1. the hook comes down and takes the weight
  const restY = hook.position.y;
  const takeY = stackHeight() + bay.pallet.top + HOOK_GAP;
  await tween({
    ms: 1100, easing: ease.inOutCubic,
    onUpdate: (_, e) => { hook.position.y = restY + (takeY - restY) * e; },
  });
  toast(air.hookOn, '', 2400);
  await wait(500);

  // 2. the lift itself. Everything that happens up here is the build.
  const amp = plan.severity === 'bad' ? 0.085 : plan.severity === 'mild' ? 0.034 : 0.006;
  const SURGE_AT = 0.34;
  const fired = new Set();

  await tween({
    ms: 4400, easing: (t) => t,
    onUpdate: (_, __, p) => {
      const up = clamp01((p - 0.04) / 0.46);
      const across = clamp01((p - 0.42) / 0.40);
      const down = clamp01((p - 0.80) / 0.20);
      riser.position.y = -HOOK_Y + ease.inOutCubic(up) * LIFT_H - ease.inOutCubic(down) * DROP_H;
      sling.position.x = PALLET_X + (MEZZ_X - PALLET_X) * ease.inOutCubic(across);

      let z = Math.sin(p * Math.PI * 6) * amp * (1 - 0.6 * p);
      if (plan.surge && p > SURGE_AT) {
        const q = (p - SURGE_AT) / (1 - SURGE_AT);
        z += Math.sin(q * Math.PI * 4) * rules.liquid.surgeKick * 0.1 * (1 - q);
      }
      sling.rotation.z = z;
      loadGroup.rotation.z = state.cog.lean + z * 0.4;

      if (!fired.has('steady') && p > 0.12) {
        fired.add('steady');
        if (plan.severity === 'true' && !plan.surge && !plan.collapse && !plan.fell.length) toast(air.steady.toast, 'good', 3000);
        else if (plan.severity === 'bad') toast(air.swing.toast, 'bad', 3000);
        else if (plan.severity === 'mild') toast(air.sway.toast, '', 3000);
      }
      if (!fired.has('collapse') && plan.collapse && p > 0.18) {
        fired.add('collapse');
        toast(air.collapse.toast, 'bad', 3200);
        collapseCrushed();
      }
      if (!fired.has('surge') && plan.surge && p > SURGE_AT) {
        fired.add('surge');
        toast(air.surge.toast, 'bad', 3200);
      }
      if (!fired.has('fell') && plan.fell.length && p > 0.46) {
        fired.add('fell');
        toast(air.slide.toast, 'bad', 3200);
        plan.fell.forEach((id, i) => { dropItem(byId[id], i); });
      }
      if (!fired.has('tipped') && plan.tipped && p > 0.58) {
        fired.add('tipped');
        toast(air.tipped.toast, 'bad', 3200);
        tipItem(byId[plan.tipped]);
      }
    },
  });

  // let the last message clear before the panel grows into its space
  toast(air.landed, '', 1800);
  await wait(2100);
  state.busy = false;
  showRecap();
}

function restart() {
  state.stack = [];
  state.crushed = new Set();
  state.warned = new Set();
  state.cog = emptyCog();
  state.air = null;
  state.busy = false;
  state.lifted = false;

  sling.position.set(PALLET_X, HOOK_Y, 0);
  sling.rotation.z = 0;
  riser.position.y = -HOOK_Y;
  loadGroup.rotation.z = 0;
  hook.position.y = HOOK_Y;

  for (const g of boxes) {
    if (g.parent !== stage.scene) stage.scene.add(g);
    g.position.copy(g.userData.home);
    g.rotation.set(0, 0, 0);
    g.scale.set(1, 1, 1);
    g.userData.bodies.forEach((m, i) => m.material.color.setHex(g.userData.colours[i]));
  }
  renderControls();
  bridge.restart();
}

/* ============================================================
   The rules — every consequence comes out of content.rules
   ============================================================ */
/** Weight sitting on top of the course at `i`. */
function loadAbove(i) {
  return state.stack.slice(i + 1).reduce((sum, id) => sum + byId[id].userData.item.weight, 0);
}

/** How far, per side, the course at `i` hangs past whatever is under it. */
function overhangAt(i) {
  const size = byId[state.stack[i]].userData.item.size;
  const under = i === 0 ? null : byId[state.stack[i - 1]].userData.item.size;
  const w = under ? under[0] : bay.pallet.width;
  const d = under ? under[2] : bay.pallet.depth;
  return Math.max(0, (size[0] - w) / 2, (size[2] - d) / 2);
}

/** The live centre of gravity reading, measured from the deck. */
function readCog() {
  if (!state.stack.length) return emptyCog();
  const b = rules.balance;
  let y = 0, mass = 0, moment = 0, penalty = 0;

  state.stack.forEach((id, i) => {
    const g = byId[id];
    const item = g.userData.item;
    const h = item.size[1] * g.scale.y;
    moment += item.weight * (y + h / 2);
    mass += item.weight;
    const loaded = i < state.stack.length - 1;
    if (item.tall && loaded) penalty += b.tallLowPenalty;
    if (item.round && loaded) penalty += b.roundLowPenalty;
    if (i > 0 && item.weight >= b.heavyKg) penalty += b.heavyHighPenalty;
    y += h;
  });

  const height = moment / mass;
  const effective = height + penalty;
  const lean = Math.min(b.maxLean, Math.max(0, (effective - b.neutral) * b.leanPerMetre));
  const band = cogReadings.find((r) => lean < r.underLean) || cogReadings[cogReadings.length - 1];
  return { height: round3(height), penalty: round3(penalty), effective: round3(effective), lean: round3(lean), reading: band.text };
}

/** What the load will do in the air, read off the build as it stands. */
function readAir() {
  const b = rules.balance;
  const lean = state.cog.lean;
  const severity = lean > b.watch ? 'bad' : lean > b.steady ? 'mild' : 'true';
  const surge = state.stack.some((id, i) => byId[id].userData.item.liquid && i >= rules.liquid.surgeFromCourse);
  const collapse = state.stack.some((id) => state.crushed.has(id));
  const fell = [];

  state.stack.forEach((id, i) => {
    const item = byId[id].userData.item;
    const over = overhangAt(i);
    const unsecured = over > rules.hold.tolerance || (item.loose && i > 0);
    const onCrushed = i > 0 && state.crushed.has(state.stack[i - 1]);
    if (over >= rules.hold.catches) fell.push(id);
    else if (unsecured && (severity === 'bad' || surge)) fell.push(id);
    else if (onCrushed && (severity !== 'true' || surge)) fell.push(id);
  });

  const drumIdx = state.stack.findIndex((id) => byId[id].userData.item.upright);
  const drumId = drumIdx > 0 ? state.stack[drumIdx] : null;
  const tipped = drumId && !fell.includes(drumId) && (severity !== 'true' || surge) ? drumId : null;

  const events = [];
  if (collapse) events.push('collapse');
  if (surge) events.push('surge');
  if (severity === 'bad') events.push('swing');
  else if (severity === 'mild') events.push('sway');
  if (fell.length) events.push('slide');
  if (tipped) events.push('tipped');
  if (!events.length) events.push('steady');

  return { lean, cog: state.cog.effective, severity, surge, collapse, fell, tipped, events };
}

/** Run the rules after every change: crush, then perch, then lean. */
async function evaluate({ announce = true } = {}) {
  for (let i = 0; i < state.stack.length; i++) {
    const id = state.stack[i];
    const item = byId[id].userData.item;
    if (state.crushed.has(id)) continue;
    if (loadAbove(i) > item.holds) {
      state.crushed.add(id);
      if (announce && item.crushed) toast(item.crushed, 'bad', 3600);
      await crush(byId[id]);
    }
  }
  relayout();

  if (announce) {
    state.stack.forEach((id, i) => {
      const item = byId[id].userData.item;
      const name = item.name.toLowerCase();
      if (overhangAt(i) > rules.hold.tolerance) once('over:' + id, () => toast(building.overhang(name), 'bad', 3400));
      if (item.loose && i > 0) once('loose:' + id, () => toast(item.placedNote || building.looseHigh(name), 'bad', 3400));
      if (item.liquid && i >= rules.liquid.surgeFromCourse && item.placedNote) once('wet:' + id, () => toast(item.placedNote, 'bad', 3400));
    });
  }

  const from = state.cog.lean;
  state.cog = readCog();
  await tween({
    ms: 460, easing: ease.outCubic,
    onUpdate: (_, e) => { loadGroup.rotation.z = from + (state.cog.lean - from) * e; },
  });

  if (announce) {
    const b = rules.balance;
    if (state.cog.lean > b.watch) once('leanBad', () => toast(building.leanBad, 'bad', 3400));
    else if (state.cog.lean > b.steady) once('leanWatch', () => toast(building.leanWatch, '', 3400));
  }
}

function once(key, fn) {
  if (state.warned.has(key)) return;
  state.warned.add(key);
  fn();
}

/* ============================================================
   Panels
   ============================================================ */
function renderControls() {
  const n = state.stack.length;
  const ready = n >= rules.minItems;
  const hint = n === 0 ? ui.instructions
    : n === items.length ? ui.full
      : ready ? ui.onPallet(n) : ui.needMore(n);

  const hovered = state.hover ? byId[state.hover].userData.item : null;

  bottom.replaceChildren(
    el('div.note', { html: hovered ? `<b>${hovered.name}</b> — ${hovered.note}` : '' }),
    el('div.gauge', {}, [
      el('span.k', {}, ui.cogLabel),
      el('span.v', {}, state.cog.reading),
      el('div.bar', {}, el('i', {
        style: `width:${Math.round((state.cog.lean / rules.balance.maxLean) * 100)}%;` +
          `background:${state.cog.lean > rules.balance.watch ? 'var(--danger)' : state.cog.lean > rules.balance.steady ? '#E0B02A' : 'var(--good)'}`,
      })),
    ]),
    el('div.row', {}, [
      el('div.grow', { style: 'font-size:13.5px;font-weight:600;color:var(--ink-dim)' }, hint),
      el('button.btn.ghost', { type: 'button', disabled: !n || state.busy || state.lifted, onClick: liftTop }, ui.liftTopBtn),
      el('button.btn.primary', { type: 'button', disabled: !ready || state.busy || state.lifted, onClick: lift }, ui.liftBtn),
    ]),
  );
}

function showRecap() {
  const plan = state.air;
  const key = plan.fell.length ? 'dropped'
    : (plan.tipped || plan.severity === 'bad' || plan.surge) ? 'rough'
      : state.crushed.size ? 'scuffed' : 'clean';
  const a = arrivals[key];

  bridge.complete({
    passed: true,
    score: null,
    detail: { outcome: key, order: [...state.stack], damaged: [...state.crushed], fell: plan.fell, lean: plan.lean },
  });

  bottom.replaceChildren(el('div.recap', {}, [
    el('div.eyebrow', {}, ui.recapEyebrow),
    el('h2', {}, a.title),
    el('div.eyebrow', { style: 'margin-top:4px' }, ui.airEyebrow),
    ...plan.events.map((k) => el('div.beat.air', { html: air[k].beat })),
    el('div.eyebrow', { style: 'margin-top:10px' }, ui.loadEyebrow),
    ...[...state.stack].reverse().map((id) => {
      const item = byId[id].userData.item;
      const what = plan.fell.includes(id) ? item.arrivedFell
        : plan.tipped === id ? item.tipped
          : state.crushed.has(id) ? item.arrivedBad : item.arrivedOk;
      return el('div.beat', { html: `<b>${item.name}</b> — ${what}` });
    }),
    el('p.driver', {}, `${ui.banksmanLabel}: ${a.line}`),
    el('p.q', {}, ui.question),
    el('button.btn.primary', { type: 'button', onClick: restart }, ui.tryAgainBtn),
  ]));
}

/* ============================================================
   Load geometry and the consequences you can see
   ============================================================ */
/** Total height of the courses currently on the deck. */
function stackHeight() {
  return state.stack.reduce((h, id) => h + byId[id].userData.item.size[1] * byId[id].scale.y, 0);
}

/** Re-seat every course: height, perch offset and perch tilt. */
function relayout() {
  let y = 0;
  state.stack.forEach((id, i) => {
    const g = byId[id];
    if (g.parent !== loadGroup) return;      // this one went over the side
    const item = g.userData.item;
    const over = overhangAt(i);
    const perched = over > rules.hold.tolerance;
    g.position.set(perched ? Math.min(over, 0.4) * rules.hold.showOffset : 0, y, 0);
    g.rotation.z = perched ? -over * rules.hold.showTilt : 0;
    y += item.size[1] * g.scale.y;
  });
}

/** Something gave way. It squashes now and stays squashed. */
async function crush(g) {
  const squash = rules.crush.squash;
  g.userData.bodies.forEach((m) => m.material.color.multiplyScalar(rules.crush.darken));
  const idx = state.stack.indexOf(g.userData.item.id);
  const above = state.stack.slice(idx + 1).map((id) => byId[id]);
  const starts = above.map((b) => b.position.y);
  const lost = g.userData.item.size[1] * squash;
  await tween({
    ms: 300, easing: ease.outCubic,
    onUpdate: (_, e) => {
      g.scale.set(1 + 0.08 * e, 1 - squash * e, 1 + 0.05 * e);
      above.forEach((b, i) => { b.position.y = starts[i] - lost * e; b.rotation.z = -0.1 * e; });
    },
  });
}

/** In the air, what was crushed folds the rest of the way. */
function collapseCrushed() {
  for (const id of state.crushed) {
    const g = byId[id];
    if (g.parent !== loadGroup) continue;
    const from = g.scale.y;
    tween({
      ms: 500, easing: ease.outCubic,
      onUpdate: (_, e) => { g.scale.y = from * (1 - 0.55 * e); relayout(); },
    });
  }
}

/** Off the load and down onto the bay floor. */
function dropItem(g, order = 0) {
  if (!g || g.parent !== loadGroup) return;
  stage.scene.attach(g);
  const from = g.position.clone();
  const spin = 1.1 + order * 0.4;
  tween({
    ms: 1200, easing: (t) => t,
    onUpdate: (_, __, p) => {
      g.position.x = from.x + 1.3 * p;
      g.position.z = from.z + 0.9 * p;
      g.position.y = Math.max(0.12, from.y - (from.y - 0.12) * p * p);
      g.rotation.set(0.5 * p, 0.2 * p, spin * p);
    },
  });
  relayout();
}

/** The drum had nothing holding it upright. */
function tipItem(g) {
  if (!g) return;
  const from = g.rotation.z;
  const x0 = g.position.x;
  const y0 = g.position.y;
  const [w, h] = g.userData.item.size;
  tween({
    ms: 700, easing: ease.outCubic,
    onUpdate: (_, e) => {
      // it pivots on its own base rim, so it only needs lifting by its radius
      g.rotation.z = from - (Math.PI / 2) * e;
      g.position.x = x0;
      g.position.y = y0 + (w / 2) * e;
    },
  });
}

/* ============================================================
   Scene building
   ============================================================ */
function buildBay() {
  const floor = box(48, 0.2, 28, 0x5b626c, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(48, 14, 0.3, 0xcfd6de, { roughness: 0.95 });
  wall.position.set(0, 7, -3.4);
  const bench = box(7.4, BENCH_TOP, 1.4, 0x7d8794, { roughness: 0.7 });
  bench.position.set(-3.1, BENCH_TOP / 2, BENCH_Z);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.14), mat(0xe0b02a));
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(-1.6, 0.01, 1.9);
  stage.scene.add(floor, wall, bench, lane);

  // Mezzanine: deck, legs, and a rail along the back edge so the
  // landing stays in plain sight from the floor.
  const deck = box(7.0, 0.3, 4.4, 0x8d97a4, { roughness: 0.9 });
  deck.position.set(MEZZ_X, MEZZ_TOP - 0.15, -1.0);
  stage.scene.add(deck);
  for (const x of [MEZZ_X - 3.1, MEZZ_X + 3.1]) {
    const leg = box(0.3, MEZZ_TOP - 0.3, 0.3, 0x6c7684, { roughness: 0.9 });
    leg.position.set(x, (MEZZ_TOP - 0.3) / 2, -2.6);
    stage.scene.add(leg);
  }
  for (const y of [MEZZ_TOP + 0.5, MEZZ_TOP + 1.0]) {
    const rail = box(7.0, 0.07, 0.07, 0xe0b02a, { roughness: 0.6 });
    rail.position.set(MEZZ_X, y, -3.15);
    stage.scene.add(rail);
  }

  // Gantry beam with two brackets back to the wall
  const beam = box(15, 0.34, 0.5, 0x3c4654, { roughness: 0.65 });
  beam.position.set(4.4, BEAM_Y, 0);
  stage.scene.add(beam);
  for (const x of [-1.6, 10.4]) {
    const bracket = box(0.26, 0.26, 3.2, 0x3c4654, { roughness: 0.65 });
    bracket.position.set(x, BEAM_Y, -1.75);
    stage.scene.add(bracket);
  }

  stage.scene.add(signMesh(bay.signs.staging, '#2757E2', [-4.2, 2.4, -3.22], 2.6));
  stage.scene.add(signMesh(bay.signs.mezzanine, '#2757E2', [MEZZ_X, 5.6, -3.22], 3.6));
}

function signMesh(text, colour, pos, width) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * 0.35),
    new THREE.MeshBasicMaterial({ map: labelTexture(text, colour), transparent: true }),
  );
  m.position.set(...pos);
  return m;
}

function buildPallet() {
  const g = new THREE.Group();
  const { width, depth, top } = bay.pallet;
  const deck = box(width, 0.08, depth, 0xb88a52, { roughness: 1 });
  deck.position.y = top - 0.04;
  g.add(deck);
  for (const z of [-depth * 0.4, 0, depth * 0.4]) {
    const runner = box(width, 0.24, 0.16, 0x9c7443, { roughness: 1 });
    runner.position.set(0, 0.12, z);
    g.add(runner);
  }
  return g;
}

function buildHook() {
  const g = new THREE.Group();
  const block = box(0.5, 0.34, 0.42, 0x4a5563, { roughness: 0.55 });
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 8, 18), mat(0xd9dee6, { roughness: 0.45 }));
  eye.position.y = -0.3;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.02, 0.2, 8), mat(0xd9dee6, { roughness: 0.45 }));
  tip.position.set(0.12, -0.46, 0);
  tip.rotation.z = 0.5;
  g.add(block, eye, tip);
  return g;
}

function buildSlingLine() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 6), mat(0x2b313a, { roughness: 0.6 }));
  m.castShadow = false;
  return m;
}

/* ---------------- Items ---------------- */
function makeItem(item) {
  const g = new THREE.Group();
  const parts = { bodies: [], fill: null };
  const bodies = parts.bodies;
  const [w, h, d] = item.size;

  if (item.shape === 'tote') buildTote(g, parts, item);
  else if (item.shape === 'drum') buildDrum(g, bodies, item);
  else if (item.shape === 'crate') buildCrate(g, bodies, item);
  else if (item.shape === 'cartons') buildCartons(g, bodies, item);
  else buildBlocks(g, bodies, item);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(w * 0.94, 1.18), Math.min(w * 0.94, 1.18) * 0.34),
    new THREE.MeshBasicMaterial({ map: labelTexture(`${item.name.toUpperCase()}\n${item.tags}`, '#10131A'), transparent: true }),
  );
  face.position.set(0, Math.min(h * 0.5, h - 0.22), d / 2 + 0.03);
  g.add(face);

  g.userData = { item, bodies, fill: parts.fill, colours: bodies.map((m) => m.material.color.getHex()) };
  return g;
}

function buildBlocks(g, bodies, item) {
  const [w, h, d] = item.size;
  const body = box(w, h, d, item.colour, { roughness: 1 });
  body.position.y = h / 2;
  bodies.push(body);
  g.add(body);
  const seam = box(w * 1.002, 0.03, d * 1.002, 0x6f7781, { roughness: 1 });
  seam.position.y = h / 2;
  g.add(seam);
  for (const x of [-w * 0.26, w * 0.26]) {
    const band = box(0.05, h * 1.02, d * 1.02, 0x2b313a, { roughness: 0.6 });
    band.position.set(x, h / 2, 0);
    g.add(band);
  }
}

function buildTote(g, parts, item) {
  const bodies = parts.bodies;
  const [w, h, d] = item.size;
  const base = box(w, 0.14, d, 0x6c7684, { roughness: 0.9 });
  base.position.y = 0.07;
  g.add(base);

  const shellH = h - 0.18;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, shellH, d * 0.96), mat(item.colour, { roughness: 0.35, transparent: true, opacity: 0.5 }));
  shell.position.y = 0.14 + shellH / 2;
  bodies.push(shell);
  g.add(shell);

  const fillH = shellH * item.fillLevel;
  const fill = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, fillH, d * 0.9), mat(item.fill, { roughness: 0.2, transparent: true, opacity: 0.9 }));
  fill.position.y = 0.14 + fillH / 2;
  g.add(fill);
  parts.fill = fill;          // the surface that rocks every frame

  // cage
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) {
    for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) {
      const post = box(0.055, h, 0.055, 0x3c4654, { roughness: 0.6 });
      post.position.set(x, h / 2, z);
      g.add(post);
    }
  }
  for (const y of [h * 0.3, h * 0.62, h * 0.94]) {
    const ringA = box(w, 0.04, 0.04, 0x3c4654, { roughness: 0.6 });
    ringA.position.set(0, y, -d / 2 + 0.03);
    const ringB = ringA.clone();
    ringB.position.z = d / 2 - 0.03;
    g.add(ringA, ringB);
  }
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14), mat(0x3c4654, { roughness: 0.6 }));
  lid.position.set(0, h - 0.02, 0);
  lid.castShadow = true;
  g.add(lid);
}

function buildDrum(g, bodies, item) {
  const [w, h] = item.size;
  const r = w / 2;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 26), mat(item.colour, { roughness: 0.55 }));
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  bodies.push(body);
  g.add(body);
  for (const y of [h * 0.3, h * 0.7]) {
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.025, r + 0.025, 0.07, 26), mat(0x24568f, { roughness: 0.5 }));
    rib.position.y = y;
    g.add(rib);
  }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 0.05, 26), mat(0xcfd6de, { roughness: 0.4 }));
  top.position.y = h + 0.01;
  top.castShadow = true;
  g.add(top);
}

function buildCrate(g, bodies, item) {
  const [w, h, d] = item.size;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, h * 0.9, d * 0.42), mat(item.glass, { roughness: 0.12, transparent: true, opacity: 0.55 }));
  panel.position.y = h / 2;
  g.add(panel);

  for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) {
    for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) {
      const post = box(0.11, h, 0.1, item.colour, { roughness: 1 });
      post.position.set(x, h / 2, z);
      bodies.push(post);
      g.add(post);
    }
  }
  for (const y of [0.1, h * 0.52, h - 0.08]) {
    for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) {
      const rail = box(w, 0.1, 0.09, item.colour, { roughness: 1 });
      rail.position.set(0, y, z);
      bodies.push(rail);
      g.add(rail);
    }
  }
}

function buildCartons(g, bodies, item) {
  const [w, h, d] = item.size;
  for (let i = 0; i < 2; i++) {
    const layer = box(w, h / 2 - 0.02, d, item.colour, { roughness: 1 });
    layer.position.y = (h / 2) * i + (h / 2 - 0.02) / 2 + 0.01;
    bodies.push(layer);
    g.add(layer);
  }
  const wrap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 1.01, d * 1.02), mat(0xffffff, { roughness: 0.2, transparent: true, opacity: 0.16 }));
  wrap.position.y = h / 2;
  g.add(wrap);
  const tape = box(0.16, h * 1.03, d * 1.03, 0xe8dcc0, { roughness: 0.8 });
  tape.position.y = h / 2;
  g.add(tape);
}

/* ============================================================
   Per-frame: coolant slosh, sling lines, hoist cable
   ============================================================ */
function updateRig(t) {
  for (const g of boxes) {
    const fill = g.userData.fill;
    if (!fill) continue;
    const i = state.stack.indexOf(g.userData.item.id);
    const loose = (i >= rules.liquid.surgeFromCourse) || (state.lifted && i >= 0);
    const amp = loose ? rules.liquid.sloshTilt : 0.012;
    const s = rules.liquid.sloshSpeed;
    fill.rotation.z = Math.sin(t * s) * amp;
    fill.rotation.x = Math.cos(t * s * 0.8) * amp * 0.5;
  }

  // Slings from the hook block down to the deck edges, clear of the
  // widest course. They only exist once the hook is on the load.
  const hx = 0, hy = hook.position.y - 0.42;
  let half = bay.pallet.width / 2;
  for (const id of state.stack) {
    const g = byId[id];
    if (g.parent === loadGroup) half = Math.max(half, Math.abs(g.position.x) + g.userData.item.size[0] / 2);
  }
  slingLines.forEach((line, k) => {
    line.visible = state.lifted;
    const tx = (k === 0 ? -1 : 1) * (half + 0.1);
    const ty = bay.pallet.top;
    const dx = tx - hx, dy = ty - hy;
    const len = Math.hypot(dx, dy) || 0.01;
    line.position.set((hx + tx) / 2, (hy + ty) / 2, 0);
    line.scale.y = len;
    line.rotation.z = Math.atan2(dx, -dy);
  });

  // hoist cable from the trolley down to the hook
  hook.getWorldPosition(TMP);
  trolley.position.x = TMP.x;
  const len = Math.max(0.05, (BEAM_Y - 0.3) - TMP.y);
  cable.position.set(TMP.x, TMP.y + len / 2, TMP.z);
  cable.scale.y = len;
}

/* ============================================================
   Small helpers
   ============================================================ */
function emptyCog() {
  return { height: 0, penalty: 0, effective: 0, lean: 0, reading: ui.cogEmpty };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

/** Centred label, shrunk to fit rather than clipped. */
function labelTexture(text, colour) {
  const lines = String(text).split('\n');
  return canvasTexture(512, 180, (c, cw, ch) => {
    c.clearRect(0, 0, cw, ch);
    c.fillStyle = colour;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach((l, i) => {
      const weight = i === 0 ? 800 : 700;
      let size = i === 0 ? 58 : 40;
      c.font = `${weight} ${size}px Helvetica, Arial, sans-serif`;
      const w = c.measureText(l).width;
      if (w > cw * 0.92) {
        size = Math.max(12, Math.floor(size * (cw * 0.92) / w));
        c.font = `${weight} ${size}px Helvetica, Arial, sans-serif`;
      }
      c.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * 66);
    });
  });
}
