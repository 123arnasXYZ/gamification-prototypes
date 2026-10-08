/* ============================================================
   16 — Give learners a taste of mastery

   A desk workstation, five things on it, three places each one can
   go. The learner picks an item up by clicking it and puts it down by
   clicking a slot — no questions anywhere.

   Beat 1 runs with an experienced assessor's kit switched on: the
   right slot glows mint with the reason floating beside it, and a
   running note explains each placement. Beat 2 is a different desk
   with all of that switched off. Beat 3 is the beat 1 desk again,
   restored exactly, still bare — and then the two runs are compared
   item by item.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, counters, items, beats, messes, ending, results } from './content.js';

const bridge = createBridge('taste-of-mastery');

const DESK_TOP = 1.02;          // world y of the desk surface
const MESS_FOR = ['A', 'B', 'A'];   // beats 1 and 3 share a desk on purpose

const MINT = 0x5fe0b0;
const MINT_INK = '#12A177';
const AMBER = 0xe0a32a;

/* Where every slot actually is. `kind` picks the marker shape, `aim`
   is the lamp's heading in radians, `bump` lifts the item in a small
   arc while it travels (wrong for the monitor and chair, whose stems
   stretch to whatever height they are at). */
const SLOT_LAYOUT = {
  'monitor-low':   { kind: 'bar',  pos: [0, 1.27, -0.85] },
  'monitor-eye':   { kind: 'bar',  pos: [0, 1.50, -0.85] },
  'monitor-high':  { kind: 'bar',  pos: [0, 1.78, -0.85] },

  'keyboard-edge': { kind: 'keys', pos: [0, DESK_TOP + 0.04, 1.08], bump: true },
  'keyboard-in':   { kind: 'keys', pos: [0, DESK_TOP + 0.04, 0.58], bump: true },
  'keyboard-back': { kind: 'keys', pos: [0, DESK_TOP + 0.04, -0.06], bump: true },

  'mouse-beside':  { kind: 'mouse', pos: [1.08, DESK_TOP + 0.05, 0.58], bump: true },
  'mouse-across':  { kind: 'mouse', pos: [2.45, DESK_TOP + 0.05, 0.30], bump: true },
  'mouse-edge':    { kind: 'mouse', pos: [0.66, DESK_TOP + 0.05, 1.20], bump: true },

  'chair-low':     { kind: 'seat', pos: [0, 0.40, 1.95] },
  'chair-fit':     { kind: 'seat', pos: [0, 0.58, 1.95] },
  'chair-high':    { kind: 'seat', pos: [0, 0.78, 1.95] },

  'lamp-glare':    { kind: 'lamp', pos: [-1.15, DESK_TOP, -0.90], aim: -1.57, bump: true },
  'lamp-side':     { kind: 'lamp', pos: [-2.55, DESK_TOP, 0.15],  aim: -2.30, bump: true },
  'lamp-behind':   { kind: 'lamp', pos: [2.55, DESK_TOP, 1.15],   aim: 1.00,  bump: true },
};

/* Lookups built once from the content. */
const ITEM = Object.fromEntries(items.map((i) => [i.id, i]));
const SLOT = {};
const OWNER = {};
for (const it of items) for (const s of it.slots) { SLOT[s.id] = s; OWNER[s.id] = it.id; }
const CORRECT = Object.fromEntries(items.map((i) => [i.id, i.slots.find((s) => s.correct).id]));

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  // Three-quarter view: the chair and the person on it sit between the
  // camera and the desk head-on, so the camera stands off to one side.
  cameraPos: [3.1, 3.3, 6.5],
  lookAt: [0, 1.3, 0.3],
  background: 0xe7ebf2,
  fog: [20, 48],
  fit: { width: 9.6, height: 6.2 },
  orbitLimits: {
    minPolarAngle: 0.62, maxPolarAngle: 1.32,
    minAzimuthAngle: 0.0, maxAzimuthAngle: 0.95,
    minDistance: 6, maxDistance: 12,
  },
});

addLightRig(stage.scene, {
  sky: 0xf3f6fb, ground: 0xbac3cf, hemi: 1.0,
  keyColor: 0xfff4e4, keyIntensity: 1.7, keyPos: [-6, 12, 8],
  shadowSize: 12, fillColor: 0x6d8ec0, fillIntensity: 0.5,
});

/* ---------------- The room and the desk ---------------- */
{
  const floor = box(40, 0.2, 26, 0xcfd6e0, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(40, 10, 0.3, 0xedf0f5, { roughness: 0.98 });
  wall.position.set(0, 5, -2.3);
  stage.scene.add(floor, wall);

  const top = new THREE.Mesh(roundedBox(6.6, 0.14, 2.7, 0.05), mat(0xd9cdb8, { roughness: 0.8 }));
  top.position.set(0, DESK_TOP - 0.07, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  stage.scene.add(top);

  for (const x of [-3.1, 3.1]) {
    for (const z of [-1.1, 1.1]) {
      const leg = box(0.12, DESK_TOP - 0.14, 0.12, 0x5b6573, { roughness: 0.6 });
      leg.position.set(x, (DESK_TOP - 0.14) / 2, z);
      stage.scene.add(leg);
    }
  }

  // Paperwork, so "light on the page" has a page to land on
  const paper = box(0.9, 0.03, 0.66, 0xf8f6f0, { roughness: 0.95 });
  paper.position.set(-2.0, DESK_TOP + 0.015, 0.55);
  paper.rotation.y = 0.18;
  stage.scene.add(paper);
}

/* ---------------- The five items ---------------- */
const rig = {};

/* Monitor: screen on a stem that stretches down to the desk, so the
   same group reads correctly at any of its three heights. */
{
  const g = new THREE.Group();
  const panel = box(1.26, 0.52, 0.07, 0x2f3540, { roughness: 0.55 });
  const screen = box(1.14, 0.42, 0.075, 0x1a2230, { roughness: 0.3, cast: false });
  screen.position.z = 0.01;
  const stem = box(0.12, 1, 0.12, 0x4b515c, { roughness: 0.6 });
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.05, 20), mat(0x4b515c, { roughness: 0.6 }));
  foot.castShadow = true;
  g.add(panel, screen, stem, foot);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'item', id: 'monitor' });

  rig.monitor = {
    group: g,
    screen,
    fit(y) {
      const len = Math.max(0.06, y - 0.26 - DESK_TOP);
      stem.scale.y = len;
      stem.position.y = -0.26 - len / 2;
      foot.position.y = -0.26 - len - 0.02;
    },
  };
}

/* Keyboard */
{
  const g = new THREE.Group();
  const body = new THREE.Mesh(roundedBox(1.5, 0.08, 0.46, 0.03), mat(0xe6e8ec, { roughness: 0.7 }));
  body.castShadow = true;
  g.add(body);
  for (let r = 0; r < 3; r++) {
    const row = box(1.3, 0.02, 0.08, 0xb9bec8, { roughness: 0.9, cast: false });
    row.position.set(0, 0.05, -0.13 + r * 0.12);
    g.add(row);
  }
  stage.scene.add(g);
  stage.pickable(g, { kind: 'item', id: 'keyboard' });
  rig.keyboard = { group: g };
}

/* Mouse */
{
  const g = new THREE.Group();
  const body = new THREE.Mesh(roundedBox(0.28, 0.1, 0.42, 0.05), mat(0xe6e8ec, { roughness: 0.6 }));
  body.castShadow = true;
  const split = box(0.02, 0.02, 0.2, 0xb9bec8, { roughness: 0.9, cast: false });
  split.position.set(0, 0.05, -0.1);
  g.add(body, split);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'item', id: 'mouse' });
  rig.mouse = { group: g };
}

/* Chair, with a faceless pawn riding on the seat so the height
   actually means something. */
{
  const g = new THREE.Group();
  const seat = new THREE.Mesh(roundedBox(0.84, 0.1, 0.8, 0.04), mat(0x3b4252, { roughness: 0.8 }));
  seat.castShadow = true;
  const back = new THREE.Mesh(roundedBox(0.8, 0.66, 0.1, 0.04), mat(0x3b4252, { roughness: 0.8 }));
  back.position.set(0, 0.38, 0.38);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), mat(0x4b515c, { roughness: 0.5 }));
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.06, 5), mat(0x4b515c, { roughness: 0.5 }));
  base.castShadow = true;

  const skin = mat(0x6d7f99, { roughness: 0.85 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.4, 6, 14), skin);
  torso.position.set(0, 0.42, 0.06);
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), skin);
  head.position.set(0, 0.86, 0.02);
  head.castShadow = true;
  const thighL = box(0.2, 0.15, 0.56, 0x6d7f99, { roughness: 0.85 });
  thighL.position.set(-0.17, 0.09, -0.26);
  const thighR = thighL.clone();
  thighR.position.x = 0.17;

  g.add(seat, back, post, base, torso, head, thighL, thighR);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'item', id: 'chair' });

  rig.chair = {
    group: g,
    fit(y) {
      const len = Math.max(0.08, y - 0.08);
      post.scale.y = len;
      post.position.y = -0.05 - len / 2;
      base.position.y = -0.05 - len - 0.03;
    },
  };
}

/* Desk lamp: built pointing down its own -z, then turned to aim. */
{
  const g = new THREE.Group();
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 18), mat(0x2757e2, { roughness: 0.6 }));
  foot.position.y = 0.03;
  foot.castShadow = true;
  const arm = box(0.07, 0.72, 0.07, 0x2757e2, { roughness: 0.6 });
  arm.position.set(0, 0.4, 0.06);
  arm.rotation.x = 0.3;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.3, 18, 1, true), mat(0x2757e2, { roughness: 0.6, side: THREE.DoubleSide }));
  shade.position.set(0, 0.7, -0.16);
  shade.rotation.x = -2.1;
  shade.castShadow = true;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff0c4 }));
  bulb.position.set(0, 0.63, -0.21);
  g.add(foot, arm, shade, bulb);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'item', id: 'lamp' });
  rig.lamp = { group: g };
}

/* ---------------- Slot markers ---------------- */
/* One group per slot: a thin marker you can see, an invisible pad
   that is comfortable to click, and the reason tag that only ever
   appears in beat one. */
const slotNodes = {};
for (const [id, L] of Object.entries(SLOT_LAYOUT)) {
  const g = new THREE.Group();
  g.position.set(...L.pos);
  g.visible = false;

  const skin = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide,
  });

  let marker;
  let pad;
  if (L.kind === 'bar') {
    marker = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.12), skin);
    pad = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.2, 0.4), hitMat());
  } else if (L.kind === 'keys') {
    marker = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.03, 0.48), skin);
    pad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.5), hitMat());
  } else if (L.kind === 'mouse') {
    marker = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.44), skin);
    pad = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.56), hitMat());
  } else if (L.kind === 'seat') {
    marker = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 24), skin);
    pad = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 1.0), hitMat());
  } else {
    marker = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 20), skin);
    pad = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.62), hitMat());
  }
  marker.renderOrder = 8;
  pad.position.y = L.kind === 'lamp' ? 0.2 : 0;

  // Tag sits on whichever side of the slot has room left on screen
  const dir = L.pos[0] > 0.5 ? -1 : 1;
  const tag = tagSprite(SLOT[id].tag);
  tag.position.set(dir * 1.75, 0.46, 0.1);
  tag.visible = false;

  g.add(marker, pad, tag);
  stage.scene.add(g);
  stage.pickable(pad, { kind: 'slot', id });
  slotNodes[id] = { group: g, marker, tag, skin };
}

function hitMat() {
  return new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
}

/* ---------------- UI ---------------- */
document.getElementById('title').textContent = meta.title;
const eyebrowEl = document.getElementById('eyebrow');
const hintEl = document.getElementById('hint');
const boardEl = document.getElementById('board');
const stats = statBar(document.getElementById('stats'), [
  { id: 'beat', label: counters.beat, value: 1, max: beats.length },
  { id: 'placed', label: counters.placed, value: 0, max: items.length },
]);
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
const state = {
  beatIndex: 0,
  beat: beats[0].id,
  supports: beats[0].supports,
  held: null,
  at: {},                 // itemId -> slotId the item is physically in
  set: {},                // itemId -> true once the learner has placed it this beat
  placements: {},         // beatId -> { itemId: slotId }  (what they chose)
  notes: [],
  busy: false,
  over: false,
  run: 0,
};

stage.onPick((obj, data) => {
  if (!data) return;
  if (data.kind === 'item') take(data.id);
  else if (data.kind === 'slot') place(data.id);
});

/* The glowing slot breathes, so "this one" reads without any text. */
stage.onFrame((dt, t) => {
  if (!state.supports || !state.held) return;
  const n = slotNodes[CORRECT[state.held]];
  if (!n) return;
  n.skin.opacity = 0.7 + Math.sin(t * 3.4) * 0.22;
  n.marker.scale.setScalar(1 + Math.sin(t * 3.4) * 0.04);
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__mastery = { state, take, place, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Picking things up and putting them down
   ============================================================ */
async function take(itemId) {
  if (state.busy || state.over || !ITEM[itemId]) return false;
  state.held = state.held === itemId ? null : itemId;
  showSlots();
  render();
  return true;
}

async function place(slotId) {
  if (state.busy || state.over) return false;
  const itemId = state.held;
  const slot = SLOT[slotId];
  if (!itemId || !slot || OWNER[slotId] !== itemId) return false;

  // Expert mode steers: the wrong slots are visibly dimmed and will
  // not take the item, so the beat cannot go badly.
  if (state.supports && !slot.correct) {
    toast(meta.blockedLine, '', 2200);
    return false;
  }

  const run = state.run;
  state.busy = true;
  state.at[itemId] = slotId;
  state.set[itemId] = true;
  state.placements[state.beat][itemId] = slotId;

  await moveItem(itemId, slotId);
  if (run !== state.run) return false;

  state.held = null;
  showSlots();
  paintGlare();
  if (state.supports) state.notes.push({ item: ITEM[itemId], slot });
  toast(meta.movedLine.replace('{item}', ITEM[itemId].name).replace('{slot}', slot.label), '', 2400);

  const done = items.filter((i) => state.set[i.id]).length;
  stats.set('placed', done);
  render();
  state.busy = false;

  bridge.progress((state.beatIndex + done / items.length) / beats.length, {
    beat: state.beat, placed: done,
  });

  if (done === items.length) await closeBeat();
  return true;
}

/** Five placed: hand over to the next beat, or to the comparison. */
async function closeBeat() {
  const run = state.run;
  state.busy = true;
  hintEl.textContent = meta.doneHint;
  await wait(1500);
  if (run !== state.run) return;
  state.busy = false;

  if (state.beatIndex + 1 < beats.length) startBeat(state.beatIndex + 1);
  else finish();
}

/* ============================================================
   Beats
   ============================================================ */
function startBeat(index) {
  const beat = beats[index];
  state.beatIndex = index;
  state.beat = beat.id;
  state.supports = beat.supports;
  state.placements[beat.id] = {};
  state.set = {};
  state.held = null;
  state.notes = [];

  const mess = messes[MESS_FOR[index]];
  for (const it of items) {
    state.at[it.id] = mess[it.id];
    setItem(it.id, mess[it.id]);
  }
  paintGlare();
  showSlots();

  eyebrowEl.textContent = beat.eyebrow;
  stats.set('beat', index + 1);
  stats.set('placed', 0);
  hintEl.textContent = meta.takeHint;
  render();
  if (index > 0) toast(beat.arrive, '', 3600);
}

function finish() {
  state.over = true;
  state.held = null;
  showSlots();
  hintEl.textContent = meta.doneHint;
  render();

  const expert = state.placements.expert || {};
  const mine = state.placements.again || {};
  const matched = items.filter((i) => expert[i.id] === mine[i.id]).length;
  const r = results.find((x) => matched >= x.min) ?? results[results.length - 1];

  bridge.complete({
    passed: matched >= 3,
    score: matched / items.length,
    detail: { matched, expert, unaided: mine },
  });

  const points = [ending.lead.replace('{n}', String(matched))];
  for (const it of items) {
    const exp = SLOT[expert[it.id]] ?? SLOT[CORRECT[it.id]];
    const got = SLOT[mine[it.id]];
    const ok = exp && got && exp.id === got.id;
    points.push(
      `<b>${it.name}</b> <span class="${ok ? 'ok' : 'no'}">${ok ? ending.matchWord : ending.missWord}</span>`
      + '<div class="cmp">'
      + `<span class="who">${ending.expertLabel}: ${exp.label}</span>`
      + `<span class="who">${ending.yoursLabel}: ${got ? got.label : exp.label}</span>`
      + `<span class="tag">${exp.tag}</span>`
      + '</div>',
    );
  }
  points.push(ending.point);

  showResult({
    passed: matched >= 3,
    title: r.title,
    summary: r.summary,
    points,
    actions: [
      { label: ending.close, kind: 'ghost' },
      { label: ending.again, kind: 'primary', onClick: restart },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  state.busy = false;
  state.over = false;
  state.placements = {};
  startBeat(0);
  bridge.restart();
}

/* ============================================================
   Scene reactions
   ============================================================ */
/** Drop an item straight into a slot, no animation. */
function setItem(itemId, slotId) {
  const L = SLOT_LAYOUT[slotId];
  const g = rig[itemId].group;
  g.position.set(...L.pos);
  g.rotation.y = L.aim ?? 0;
  rig[itemId].fit?.(g.position.y);
}

/** Carry an item across to a slot, in a small arc where that suits. */
function moveItem(itemId, slotId) {
  const L = SLOT_LAYOUT[slotId];
  const r = rig[itemId];
  const g = r.group;
  const from = g.position.clone();
  const to = new THREE.Vector3(...L.pos);
  const fromAim = g.rotation.y;
  const toAim = L.aim ?? 0;
  const lift = L.bump ? 0.3 : 0;

  return tween({
    ms: 520, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      g.position.lerpVectors(from, to, e);
      g.position.y += Math.sin(Math.PI * e) * lift;
      g.rotation.y = fromAim + (toAim - fromAim) * e;
      if (!lift) r.fit?.(g.position.y);
    },
    onDone: () => {
      g.position.copy(to);
      g.rotation.y = toAim;
      r.fit?.(to.y);
    },
  });
}

/** Only the held item's slots are on, and only beat one marks one up. */
function showSlots() {
  // The held item stops taking clicks, so the pad of the slot it is
  // already sitting in stays reachable — leaving something where it is
  // has to be a choice the learner can make.
  for (const it of items) stage.setPickEnabled(rig[it.id].group, state.held !== it.id);

  for (const [id, n] of Object.entries(slotNodes)) {
    const on = !!state.held && OWNER[id] === state.held;
    n.group.visible = on;
    n.marker.scale.setScalar(1);
    if (!on) { n.tag.visible = false; continue; }

    const correct = SLOT[id].correct && state.supports;
    n.tag.visible = !!correct;
    n.skin.color.setHex(correct ? MINT : 0xffffff);
    n.skin.opacity = correct ? 0.85 : state.supports ? 0.16 : 0.5;
  }
}

/** A lamp pointed at the screen washes it out — visibly. */
function paintGlare() {
  const glaring = state.at.lamp === 'lamp-glare';
  const m = rig.monitor.screen.material;
  m.emissive.setHex(glaring ? AMBER : 0x16202e);
  m.emissiveIntensity = glaring ? 0.85 : 0.25;
}

/* ============================================================
   The board along the bottom
   ============================================================ */
function render() {
  const beat = beats[state.beatIndex];

  const chips = items.map((it) => {
    const held = state.held === it.id;
    const done = !!state.set[it.id];
    const where = SLOT[state.at[it.id]];
    return el('button.chip' + (held ? '.held' : done ? '.done' : ''), {
      type: 'button',
      disabled: state.busy || state.over || null,
      onClick: () => take(it.id),
    }, [
      el('span', {}, it.name),
      el('span.sub', {}, (where ? where.label : '') + (done ? ' · ' + meta.placedTag : '')),
    ]);
  });

  const parts = [
    el('div.eyebrow', {}, beat.eyebrow),
    el('p.banner', {}, beat.banner),
    el('div.tray', {}, chips),
  ];

  if (beat.supports) {
    const lines = state.notes.length
      ? state.notes.map((n) => el('div.line', { html: `<b>${n.item.name} — ${n.slot.label}.</b> ${n.slot.note}` }))
      : [el('div.line.wait', {}, meta.assessorWaiting)];
    parts.push(el('div.assessor', {}, [
      el('div.eyebrow', {}, meta.assessorLabel),
      el('div.log', {}, lines),
    ]));
  }

  boardEl.replaceChildren(...parts);

  if (!state.over) {
    hintEl.textContent = state.held
      ? (state.supports ? meta.placeHint : meta.heldHint.replace('{item}', ITEM[state.held].name))
      : items.every((i) => state.set[i.id]) ? meta.doneHint : meta.takeHint;
  }
}

/* ---------------- Label sprite ---------------- */
/** The floating reason tag: a white pill, wrapped to two lines. */
function tagSprite(text) {
  const W = 760;
  const H = 240;
  const tex = canvasTexture(W, H, (c) => {
    c.clearRect(0, 0, W, H);
    c.font = '700 44px Urbanist, Helvetica, Arial, sans-serif';

    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (c.measureText(next).width > W - 110 && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    const show = lines.slice(0, 2);

    const widest = Math.max(...show.map((l) => c.measureText(l).width));
    const boxW = Math.min(W - 8, widest + 80);
    const boxH = show.length > 1 ? 150 : 100;
    const x = (W - boxW) / 2;
    const y = (H - boxH) / 2;

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(x, y, boxW, boxH, 44);
    c.fill();
    c.fillStyle = MINT_INK;
    c.fillRect(x + 14, y + 22, 7, boxH - 44);

    c.fillStyle = '#10131A';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    show.forEach((l, i) => {
      c.fillText(l, W / 2 + 6, H / 2 + (i - (show.length - 1) / 2) * 54);
    });
  });

  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  s.renderOrder = 20;
  s.scale.set(2.5, 0.79, 1);
  return s;
}
