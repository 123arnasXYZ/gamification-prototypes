/* ============================================================
   18 — Add side quests
   An opening shift in a café. Three jobs have to be done before the
   doors open, and every one of them is a physical act: a switch, a
   sign carried to a wet patch, a till drawer. No questions anywhere.

   Three more things sit in the room that nobody mentions, and each
   of those is an activity too — put three strays back, restack a
   delivery, find the thing that was switched off. The three empty
   outlines in the corner are the only clue they exist.

   Like 12, the camera only slides along x, so the café reads as a
   side-on world rather than a model to be inspected.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, jobs, sideQuests, strays, crates, chiller, door, results } from './content.js';

const bridge = createBridge('side-quests');

const COLORS = {
  dim:    0x9aa1ab,
  done:   0x5fe0b0,
  blue:   0x2757e2,
  wall:   0xeef1f6,
  floor:  0xd9d2c6,
  wood:   0xc9b391,
  wood2:  0xb79b75,
  metal:  0xb8bec8,
  dark:   0x4b515c,
  skin:   0xcfd6e0,
  yellow: 0xf2c53d,
};

/* Everything in the café lives at a known x, so walking, clicking and
   the debug hooks all agree about where things are. */
const X = {
  chiller:   -13.2,
  machine:   -9.0,
  crates:    -5.0,
  patch:     -1.0,
  sign:       1.1,
  mug:        2.6,
  till:       5.0,
  mugHome:    6.4,
  table:      8.6,
  chairHome:  9.9,
  broom:     11.3,
  broomHome: 12.5,
  door:      13.2,
};

const JOB_X = [X.machine, X.patch, X.till];
const START_X = -6.0;
const WALK_MIN = -14.0;
const WALK_MAX = 13.0;
const NEAR = 2.1;
const SPEED = 3.8;
const CARRY = { y: 1.78, z: 1.25 };
const CR_Y = (slot) => 0.36 + slot * 0.74;

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 38,
  cameraPos: [START_X, 3.1, 13.6],
  lookAt: [START_X, 1.5, 0],
  background: 0xe9eef5,
  fog: [28, 74],
  shadows: true,
  orbit: false,
  fit: { width: 14, height: 7.6 },
});

const rig = addLightRig(stage.scene, {
  sky: 0xf2f7ff, ground: 0x99917f, hemi: 1.05,
  keyColor: 0xfff6e8, keyIntensity: 1.85, keyPos: [5, 11, 7],
  shadowSize: 9, fillColor: 0x7d9bc4, fillIntensity: 0.55,
});
// A small shadow box stays sharp, so it travels with the learner instead of
// trying to cover a thirty-unit room.
rig.key.target.position.set(0, 0, 0);
stage.scene.add(rig.key.target);

/* ---------------- The room ---------------- */
{
  const floor = box(44, 0.3, 11, COLORS.floor, { roughness: 1 });
  floor.position.set(0, -0.15, 0);
  stage.scene.add(floor);
  // The floor is clickable so walking can be aimed rather than held
  stage.pickable(floor, { kind: 'floor' });

  const wall = box(44, 10, 0.4, COLORS.wall, { roughness: 0.95 });
  wall.position.set(0, 5, -3.6);

  const skirting = box(44, 0.3, 0.12, 0xc3c9d2, { roughness: 1 });
  skirting.position.set(0, 0.15, -3.37);
  stage.scene.add(wall, skirting);

  for (let i = -4; i <= 3; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), mat(0xbcd6ef, { roughness: 0.3 }));
    win.position.set(i * 4.6 + 1, 4.3, -3.37);
    stage.scene.add(win);
  }

  // Pillar near the back corner: the chiller behind it is easy to walk past
  const pillar = box(0.9, 4.4, 0.9, 0xe3e7ee, { roughness: 0.95 });
  pillar.position.set(-11.6, 2.2, -2.2);
  stage.scene.add(pillar);
}

/* ---------------- Job 1: the coffee machine ---------------- */
const machine = {};
{
  const g = new THREE.Group();
  g.position.set(X.machine, 0, -1.9);

  const counter = new THREE.Mesh(roundedBox(2.6, 1.0, 1.2, 0.05), mat(COLORS.wood, { roughness: 0.85 }));
  counter.position.y = 0.5;
  counter.castShadow = true;
  counter.receiveShadow = true;

  const body = new THREE.Mesh(roundedBox(1.5, 0.95, 0.85, 0.07), mat(0x8e97a4, { roughness: 0.45, metalness: 0.3 }));
  body.position.set(-0.1, 1.48, 0);
  body.castShadow = true;

  const group_head = box(0.3, 0.3, 0.3, COLORS.metal, { roughness: 0.3, metalness: 0.5 });
  group_head.position.set(-0.1, 0.9, 0.5);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), mat(COLORS.dim, { roughness: 0.4 }));
  lamp.position.set(0.48, 1.74, 0.42);

  const cups = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.16, 12), mat(0xf4f1ea, { roughness: 0.6 }));
    cup.position.set(0.85, 1.08 + i * 0.17, -0.1);
    cups.add(cup);
  }

  g.add(counter, body, group_head, lamp, cups);
  stage.scene.add(g);

  // The switch is on the wall, not on the machine: a separate thing to find
  const sw = new THREE.Group();
  sw.position.set(X.machine + 1.7, 1.95, -3.35);
  const plate = new THREE.Mesh(roundedBox(0.52, 0.66, 0.08, 0.04), mat(0xfbfbf8, { roughness: 0.6 }));
  const toggle = box(0.26, 0.26, 0.09, COLORS.dim, { roughness: 0.5 });
  toggle.position.set(0, -0.1, 0.06);
  const swLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), mat(COLORS.dim, { roughness: 0.4 }));
  swLamp.position.set(0, 0.2, 0.07);
  sw.add(plate, toggle, swLamp);
  stage.scene.add(sw);
  stage.pickable(sw, { kind: 'switch' });

  Object.assign(machine, { body, lamp, toggle, swLamp });
}

/* ---------------- Job 2: wet patch and sign ---------------- */
const patch = new THREE.Mesh(
  new THREE.CircleGeometry(1.15, 32),
  mat(0xc8c3b6, { roughness: 0.18, metalness: 0.08 }),
);
patch.rotation.x = -Math.PI / 2;
patch.position.set(X.patch, 0.012, 1.0);
stage.scene.add(patch);
stage.pickable(patch, { kind: 'patch' });

const sign = new THREE.Group();
{
  for (const s of [-1, 1]) {
    const leaf = new THREE.Mesh(roundedBox(0.7, 1.0, 0.06, 0.04), mat(COLORS.yellow, { roughness: 0.7 }));
    leaf.position.set(0, 0.5, s * 0.17);
    leaf.rotation.x = s * 0.3;
    leaf.castShadow = true;
    sign.add(leaf);
  }
  const bar = box(0.06, 0.06, 0.34, 0xd8a92b, { roughness: 0.7 });
  bar.position.y = 0.3;
  sign.add(bar);
  sign.position.set(X.sign, 0, 1.5);
  stage.scene.add(sign);
  stage.pickable(sign, { kind: 'sign' });
}

/* ---------------- Job 3: counter and till ---------------- */
const till = {};
{
  const counter = new THREE.Mesh(roundedBox(4.4, 1.0, 1.3, 0.05), mat(COLORS.wood, { roughness: 0.85 }));
  counter.position.set(X.till + 0.5, 0.5, -1.3);
  counter.castShadow = true;
  counter.receiveShadow = true;
  stage.scene.add(counter);

  const g = new THREE.Group();
  g.position.set(X.till, 1.0, -1.3);

  const body = new THREE.Mesh(roundedBox(1.0, 0.56, 0.8, 0.05), mat(0x5b6573, { roughness: 0.6 }));
  body.position.y = 0.28;
  body.castShadow = true;

  const screen = new THREE.Mesh(roundedBox(0.8, 0.5, 0.07, 0.04), mat(0x2b303a, { roughness: 0.4 }));
  screen.position.set(0, 0.78, -0.18);
  screen.rotation.x = -0.2;

  const drawer = new THREE.Mesh(roundedBox(0.92, 0.2, 0.7, 0.03), mat(0x8e97a4, { roughness: 0.5 }));
  drawer.position.set(0, 0.12, 0.1);

  g.add(body, screen, drawer);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'till' });
  Object.assign(till, { g, drawer, screen });
}

/* A table, which is also where one of the strays ended up */
{
  const top = new THREE.Mesh(roundedBox(1.5, 0.1, 1.5, 0.03), mat(COLORS.wood2, { roughness: 0.85 }));
  top.position.set(X.table, 0.78, -0.9);
  top.castShadow = true;
  const leg = box(0.16, 0.78, 0.16, COLORS.dark, { roughness: 0.6 });
  leg.position.set(X.table, 0.39, -0.9);
  stage.scene.add(top, leg);
}

/* ---------------- Side quest 3: the chiller in the corner ---------------- */
const chillerParts = {};
{
  const g = new THREE.Group();
  g.position.set(X.chiller, 0, -2.6);

  const shell = new THREE.Mesh(roundedBox(1.6, 2.5, 1.0, 0.06), mat(0x7f8894, { roughness: 0.55, metalness: 0.2 }));
  shell.position.y = 1.25;
  shell.castShadow = true;

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.9),
    mat(0x3c4652, { roughness: 0.2, transparent: true, opacity: 0.85 }),
  );
  glass.position.set(0, 1.35, 0.51);

  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.8), mat(0x2b333d, { roughness: 0.9 }));
  inner.position.set(0, 1.35, 0.5);

  const sw = new THREE.Group();
  const plate = new THREE.Mesh(roundedBox(0.4, 0.5, 0.08, 0.03), mat(0xfbfbf8, { roughness: 0.6 }));
  const toggle = box(0.2, 0.2, 0.09, COLORS.dim, { roughness: 0.5 });
  toggle.position.set(0, -0.08, 0.06);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), mat(COLORS.dim, { roughness: 0.4 }));
  lamp.position.set(0, 0.15, 0.07);
  sw.add(plate, toggle, lamp);
  sw.position.set(0.95, 1.6, 0.2);
  sw.rotation.y = 0.5;

  g.add(shell, inner, glass, sw);
  stage.scene.add(g);
  stage.pickable(sw, { kind: 'chiller' });
  // Clicking the dark cabinet itself says it is dark, which is the nudge to
  // go looking for the switch on its side.
  stage.pickable(shell, { kind: 'chillerBody' });
  Object.assign(chillerParts, { inner, glass, toggle, lamp });
}

/* ---------------- Side quest 1: the night shift's leftovers ---------------- */
function buildMug() {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.24, 14), mat(0xf2f0eb, { roughness: 0.55 }));
  cup.position.y = 0.12;
  cup.castShadow = true;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.026, 6, 14), mat(0xf2f0eb, { roughness: 0.55 }));
  handle.position.set(0.16, 0.12, 0);
  handle.rotation.y = Math.PI / 2;
  g.add(cup, handle);
  return g;
}

function buildChair() {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(roundedBox(0.58, 0.09, 0.58, 0.03), mat(COLORS.wood2, { roughness: 0.85 }));
  seat.position.y = 0.46;
  seat.castShadow = true;
  const back = new THREE.Mesh(roundedBox(0.58, 0.55, 0.08, 0.03), mat(COLORS.wood2, { roughness: 0.85 }));
  back.position.set(0, 0.76, -0.25);
  back.castShadow = true;
  g.add(seat, back);
  for (const dx of [-0.23, 0.23]) {
    for (const dz of [-0.23, 0.23]) {
      const leg = box(0.07, 0.46, 0.07, COLORS.dark, { roughness: 0.7 });
      leg.position.set(dx, 0.23, dz);
      g.add(leg);
    }
  }
  return g;
}

function buildBroom() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 10), mat(0xd6c49a, { roughness: 0.8 }));
  handle.position.y = 0.78;
  handle.castShadow = true;
  const head = new THREE.Mesh(roundedBox(0.52, 0.12, 0.18, 0.03), mat(0x3f4650, { roughness: 0.8 }));
  head.position.y = 0.07;
  const bristles = box(0.5, 0.14, 0.14, 0xc9a35e, { roughness: 1 });
  bristles.position.y = -0.03;
  g.add(handle, head, bristles);
  return g;
}

/* Where each stray starts, and the pose it settles into once it is home. */
const STRAY_DEFS = [
  {
    build: buildMug,
    start: { pos: [X.mug, 0, 1.45], rot: 0 },
    home:  { pos: [X.mugHome, 1.0, -1.3], rot: 0 },
    ring:  [X.mugHome, 1.02, -1.3],
  },
  {
    build: buildChair,
    start: { pos: [X.table, 1.88, -0.9], rot: Math.PI },      // upside down on the table
    home:  { pos: [X.chairHome, 0, 0.55], rot: -0.25 },
    ring:  [X.chairHome, 0.02, 0.55],
  },
  {
    build: buildBroom,
    start: { pos: [X.broom, 0.09, 1.1], rot: Math.PI / 2 },   // lying across the walkway
    home:  { pos: [X.broomHome, 0, -2.5], rot: 0.1 },
    ring:  [X.broomHome, 0.02, -2.5],
  },
];

const strayNodes = STRAY_DEFS.map((d) => {
  const g = d.build();
  stage.scene.add(g);
  return g;
});
strayNodes.forEach((g, i) => stage.pickable(g, { kind: 'stray', index: i }));

// A quiet outline on every home spot: visible from the start, never explained.
const homeRings = STRAY_DEFS.map((d, i) => {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.42, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.dim, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  g.position.set(...d.ring);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'home', index: i });
  return { g, ring };
});

// A bracket on the wall, so the broom's corner looks like it means something
{
  const bracket = box(0.14, 0.14, 0.4, COLORS.dark, { roughness: 0.7 });
  bracket.position.set(X.broomHome, 1.3, -3.1);
  stage.scene.add(bracket);
}

/* ---------------- Side quest 2: the delivery ---------------- */
const crateNodes = crates.map((c, i) => {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(roundedBox(1.1, 0.7, 0.9, 0.05), mat(i === 0 ? COLORS.wood2 : i === 1 ? COLORS.wood : 0xd8c9ae, { roughness: 0.9 }));
  shell.castShadow = true;
  shell.receiveShadow = true;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.33),
    new THREE.MeshBasicMaterial({ map: signTexture(c.label), transparent: true, depthWrite: false }),
  );
  label.position.set(0, 0, 0.46);
  g.add(shell, label);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'crate', index: i });
  return g;
});

// Drop targets for the stack, only up while something is in the air
const crateSlots = [0, 1, 2].map((s) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.82),
    new THREE.MeshBasicMaterial({ color: COLORS.done, transparent: true, opacity: 0.3, depthTest: false, side: THREE.DoubleSide }),
  );
  m.renderOrder = 12;
  m.position.set(X.crates, CR_Y(s), -0.45);
  m.visible = false;
  stage.scene.add(m);
  stage.pickable(m, { kind: 'slot', index: s });
  return m;
});

/* ---------------- The front door ---------------- */
const doorParts = {};
{
  const g = new THREE.Group();
  g.position.set(X.door, 0, -3.3);

  const frame = box(2.6, 3.6, 0.3, 0x8c939d, { roughness: 0.8 });
  frame.position.y = 1.8;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.0), mat(0xcfe0f5, { roughness: 0.25 }));
  glass.position.set(0, 1.8, 0.17);

  const closedTex = signTexture(door.closed);
  const openTex = signTexture(door.open);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.46),
    new THREE.MeshBasicMaterial({ map: closedTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  plate.position.set(0, 2.1, 0.22);

  g.add(frame, glass, plate);
  stage.scene.add(g);
  stage.pickable(g, { kind: 'door' });
  Object.assign(doorParts, { g, plate, closedTex, openTex });
}

/* ---------------- Job badges ---------------- */
/* Grey discs on the floor at each required job: the only thing in the room
   that announces itself. The optional three have no badges at all. */
const badges = JOB_X.map((x) => {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 28),
    new THREE.MeshBasicMaterial({ color: COLORS.dim, transparent: true, opacity: 0.85 }),
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.44, 0.56, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.dim, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  const tick = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: tickTexture(), transparent: true, depthWrite: false }),
  );
  tick.position.z = 0.002;
  tick.visible = false;
  g.add(disc, ring, tick);
  g.rotation.x = -Math.PI / 2;
  g.position.set(x, 0.03, 2.35);
  stage.scene.add(g);
  return { g, disc, ring, tick };
});

/* ---------------- The learner ---------------- */
const avatar = pawn(COLORS.blue);
avatar.position.set(START_X, 0, 1.6);
stage.scene.add(avatar);

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const hintEl = document.getElementById('hint');
const tallyEl = document.getElementById('tally');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const openBtn = document.getElementById('open');
const restartBtn = document.getElementById('restart');
leftBtn.textContent = meta.walkLeft;
rightBtn.textContent = meta.walkRight;
openBtn.textContent = meta.openUp;
restartBtn.textContent = meta.restart;
openBtn.addEventListener('click', () => { openUp(); });
restartBtn.addEventListener('click', restart);

const stats = statBar(document.getElementById('stats'), [
  { id: 'jobs', label: meta.counter, value: 0, max: jobs.length, color: '#12A177' },
]);

// Three empty outlines, from the first frame. Nothing says what fills them.
const slotHost = document.getElementById('slots');
const slotNodes = sideQuests.map(() => {
  const n = el('div.slot', {}, meta.slotEmpty);
  slotHost.append(n);
  return n;
});

/* ---------------- State ---------------- */
const state = {
  x: START_X,
  dir: 0,
  facing: 1,
  jobsDone: [false, false, false],
  collected: [false, false, false],
  strayHome: [false, false, false],
  stack: [2, 0, 1],          // bottom, middle, top — heaviest starts in the middle
  carrying: null,            // { type: 'sign' | 'stray' | 'crate', index, mesh, fromSlot }
  signPlaced: false,
  busy: false,
  walking: false,
  over: false,
};

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

stage.onPick((obj, data, hit) => {
  if (!data || state.over) return;
  if (data.kind === 'floor') {
    if (hit && !state.busy) walkTo(hit.point.x);
    return;
  }
  if (state.busy) return;
  switch (data.kind) {
    case 'switch':  toggleMachine(); break;
    case 'sign':    takeSign(); break;
    case 'patch':   placeSign(); break;
    case 'till':    openTill(); break;
    case 'stray':   takeStray(data.index); break;
    case 'home':    placeStray(data.index); break;
    case 'crate':   clickCrate(data.index); break;
    case 'slot':    dropCrate(data.index); break;
    case 'chiller': flipChiller(); break;
    case 'chillerBody': if (!state.collected[2]) toast(chiller.off, '', 2600); break;
    case 'door':    openUp(); break;
  }
});

/* ---------------- Frame loop ---------------- */
stage.onFrame((dt, t) => {
  if (state.dir && !state.busy && !state.over) {
    state.x = clampWalk(state.x + state.dir * SPEED * dt);
    state.facing = state.dir;
  }

  const walking = (!!state.dir || state.walking) && !state.over;
  avatar.position.x = state.x;
  avatar.position.y = walking ? Math.abs(Math.sin(t * 9)) * 0.09 : 0;
  avatar.rotation.z = walking ? Math.sin(t * 9) * 0.05 : 0;
  avatar.rotation.y = state.facing > 0 ? 0.4 : -0.4;

  stage.camera.position.x += (state.x - stage.camera.position.x) * Math.min(1, dt * 4);
  stage.camera.lookAt(stage.camera.position.x, 1.5, 0);
  rig.key.position.x = stage.camera.position.x + 5;
  rig.key.target.position.x = stage.camera.position.x;
  rig.key.target.updateMatrixWorld();

  // Whatever is in the learner's hands rides along with them
  if (state.carrying) {
    const o = state.carrying.mesh;
    const k = Math.min(1, dt * 9);
    o.position.x += (state.x + state.facing * 0.5 - o.position.x) * k;
    o.position.y += (CARRY.y - o.position.y) * k;
    o.position.z += (CARRY.z - o.position.z) * k;
    o.rotation.z += (0.2 - o.rotation.z) * k;
    o.rotation.y = Math.sin(t * 2.2) * 0.14;
  }

  // The badge you are standing on is the one that invites a click
  badges.forEach((b, i) => {
    const live = !state.jobsDone[i] && Math.abs(state.x - JOB_X[i]) < NEAR;
    b.ring.material.opacity = live ? 0.4 + Math.sin(t * 3.4) * 0.3 : (state.jobsDone[i] ? 0.8 : 0.4);
    b.ring.scale.setScalar(live ? 1 + Math.sin(t * 3.4) * 0.07 : 1);
  });

  // A home spot only lights up once you are actually holding its thing
  homeRings.forEach((h, i) => {
    const live = state.carrying?.type === 'stray' && state.carrying.index === i;
    h.ring.material.color.setHex(live ? COLORS.done : state.strayHome[i] ? COLORS.done : COLORS.dim);
    h.ring.material.opacity = live ? 0.55 + Math.sin(t * 4) * 0.3 : state.strayHome[i] ? 0.45 : 0.28;
    h.ring.scale.setScalar(live ? 1 + Math.sin(t * 4) * 0.08 : 1);
  });

  const lifting = state.carrying?.type === 'crate';
  crateSlots.forEach((m) => {
    m.visible = lifting;
    if (lifting) m.material.opacity = 0.22 + Math.sin(t * 3.6) * 0.12;
  });
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__quests = { state, doJob, doSideQuest, openUp, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Walking
   ============================================================ */
async function walkTo(x) {
  if (state.over) return;
  const to = clampWalk(x);
  const from = state.x;
  if (Math.abs(to - from) < 0.06) return;
  state.facing = to > from ? 1 : -1;
  state.busy = true;
  state.walking = true;
  state.dir = 0;
  await tween({
    ms: Math.min(2400, Math.abs(to - from) / SPEED * 1000),
    easing: ease.inOutCubic,
    onUpdate: (_, e) => { state.x = from + (to - from) * e; },
  });
  state.x = to;
  state.walking = false;
  state.busy = false;
  paintHint();
}

/** Walk over only if we are not already standing there. */
async function goTo(x) {
  if (Math.abs(state.x - x) > NEAR) await walkTo(x);
}

/* ============================================================
   The three required jobs
   ============================================================ */

/** Job 0 — the machine switch on the wall. */
async function toggleMachine() {
  if (state.over || state.busy || state.jobsDone[0]) return;
  if (handsFull()) return;
  await goTo(X.machine + 1.2);
  state.busy = true;
  machine.toggle.material.color.setHex(COLORS.done);
  await tween({
    ms: 260, easing: ease.outCubic,
    onUpdate: (_, e) => { machine.toggle.position.y = -0.1 + e * 0.2; },
  });
  machine.swLamp.material.color.setHex(COLORS.done);
  machine.swLamp.material.emissive.setHex(0x1b5a44);
  machine.lamp.material.color.setHex(COLORS.done);
  machine.lamp.material.emissive.setHex(0x1b5a44);
  state.busy = false;
  completeJob(0);
}

/** Job 1, step one — pick the sign up. */
async function takeSign() {
  if (state.over || state.busy || state.signPlaced) return;
  if (state.carrying?.type === 'sign') return;
  if (handsFull()) return;
  await goTo(sign.position.x);
  state.carrying = { type: 'sign', index: null, mesh: sign };
  toast(meta.pickedUp.replace('{thing}', jobs[1].thing), '', 2000);
  paintHint();
}

/** Job 1, step two — stand it over the wet patch. */
async function placeSign() {
  if (state.over || state.busy || state.signPlaced) return;
  if (!state.carrying) {
    toast(jobs[1].pickupHint, '', 2800);
    return;
  }
  if (state.carrying.type !== 'sign') {
    toast(meta.wrongSpot, '', 2000);
    return;
  }
  await goTo(X.patch);
  state.carrying = null;
  state.busy = true;
  await settle(sign, [X.patch, 0, 1.0], 0);
  state.signPlaced = true;
  stage.setPickEnabled(sign, false);
  state.busy = false;
  completeJob(1);
}

/** Job 2 — unlock the till. */
async function openTill() {
  if (state.over || state.busy || state.jobsDone[2]) return;
  if (handsFull()) return;
  await goTo(X.till);
  state.busy = true;
  await tween({
    ms: 420, easing: ease.outCubic,
    onUpdate: (_, e) => { till.drawer.position.z = 0.1 + e * 0.55; },
  });
  till.screen.material.color.setHex(0x1b3f66);
  till.screen.material.emissive.setHex(0x12304f);
  state.busy = false;
  completeJob(2);
}

function completeJob(i) {
  if (state.jobsDone[i]) return;
  state.jobsDone[i] = true;
  const b = badges[i];
  b.disc.material.color.setHex(COLORS.done);
  b.ring.material.color.setHex(COLORS.done);
  b.tick.visible = true;
  b.tick.scale.setScalar(0.01);
  tween({ ms: 400, easing: ease.outBack, onUpdate: (_, e) => b.tick.scale.setScalar(Math.max(0.01, e)) });
  toast(jobs[i].toast, 'good', 2400);
  stats.set('jobs', doneCount());
  bridge.progress(doneCount() / jobs.length, { jobs: doneCount(), collected: collectedCount() });
  paintHint();
}

/* ============================================================
   Side quest 1 — three things in the wrong place
   ============================================================ */
async function takeStray(i) {
  if (state.over || state.busy || state.strayHome[i]) return;
  if (state.carrying?.type === 'stray' && state.carrying.index === i) return;
  if (handsFull()) return;
  await goTo(STRAY_DEFS[i].start.pos[0]);
  state.carrying = { type: 'stray', index: i, mesh: strayNodes[i] };
  toast(meta.pickedUp.replace('{thing}', strays[i].name), '', 2000);
  paintHint();
}

async function placeStray(i) {
  if (state.over || state.busy || state.strayHome[i]) return;
  if (!state.carrying) {
    toast(strays[i].homeIdle, '', 2600);
    return;
  }
  if (state.carrying.type !== 'stray' || state.carrying.index !== i) {
    toast(meta.wrongSpot, '', 2000);
    return;
  }
  const def = STRAY_DEFS[i];
  await goTo(def.home.pos[0]);
  state.carrying = null;
  state.busy = true;
  await settle(strayNodes[i], def.home.pos, def.home.rot);
  state.strayHome[i] = true;
  stage.setPickEnabled(strayNodes[i], false);
  state.busy = false;

  const n = state.strayHome.filter(Boolean).length;
  if (n === state.strayHome.length) collect(0);
  else toast(sideQuests[0].progress.replace('{n}', String(n)), '', 2200);
  paintHint();
}

/* ============================================================
   Side quest 2 — restack the delivery
   ============================================================ */
/** A click on a crate lifts it, or puts the lifted one straight back. */
function clickCrate(index) {
  const c = state.carrying;
  if (c?.type === 'crate' && c.index === index) return dropCrate(c.fromSlot);
  return liftCrate(state.stack.indexOf(index));
}

async function liftCrate(slot) {
  if (state.over || state.busy || state.collected[1]) return;
  if (slot < 0 || slot > 2) return;
  const idx = state.stack[slot];
  if (idx < 0) return;
  if (handsFull()) return;
  await goTo(X.crates + 1.4);
  state.stack[slot] = -1;
  state.carrying = { type: 'crate', index: idx, fromSlot: slot, mesh: crateNodes[idx] };
  toast(meta.pickedUp.replace('{thing}', meta.crateThing.replace('{label}', crates[idx].label)), '', 1800);
  paintHint();
}

async function dropCrate(slot) {
  if (state.over || state.busy) return;
  const held = state.carrying;
  if (!held || held.type !== 'crate') return;
  if (slot < 0 || slot > 2) return;

  // You might have wandered off with it, so carry it back to the stack first
  await goTo(X.crates + 1.4);
  state.carrying = null;
  state.busy = true;
  const from = held.fromSlot;
  const occupant = state.stack[slot];
  state.stack[slot] = held.index;

  const moves = [settle(crateNodes[held.index], [X.crates, CR_Y(slot), -1.0], 0)];
  if (occupant >= 0) {
    state.stack[from] = occupant;
    moves.push(settle(crateNodes[occupant], [X.crates, CR_Y(from), -1.0], 0));
  }
  await Promise.all(moves);
  state.busy = false;

  const weights = state.stack.map((i) => crates[i]?.weight ?? 0);
  if (weights[0] > weights[1] && weights[1] > weights[2]) collect(1);
  paintHint();
}

/* ============================================================
   Side quest 3 — the thing that was switched off
   ============================================================ */
async function flipChiller() {
  if (state.over || state.busy || state.collected[2]) return;
  if (handsFull()) return;
  await goTo(X.chiller + 1.3);
  state.busy = true;
  chillerParts.toggle.material.color.setHex(COLORS.done);
  await tween({
    ms: 260, easing: ease.outCubic,
    onUpdate: (_, e) => { chillerParts.toggle.position.y = -0.08 + e * 0.16; },
  });
  chillerParts.lamp.material.color.setHex(COLORS.done);
  chillerParts.lamp.material.emissive.setHex(0x1b5a44);
  chillerParts.inner.material.color.setHex(0xa8e8d0);
  chillerParts.inner.material.emissive.setHex(0x2e6f5a);
  chillerParts.glass.material.opacity = 0.35;
  state.busy = false;
  collect(2);
}

/* ============================================================
   Collectables and the ending
   ============================================================ */
function collect(i) {
  if (state.collected[i]) return;
  state.collected[i] = true;
  slotNodes[i].classList.add('on');
  slotNodes[i].textContent = sideQuests[i].badge;
  toast(sideQuests[i].toast, 'good', 2800);
  bridge.progress(doneCount() / jobs.length, { jobs: doneCount(), collected: collectedCount() });
  paintHint();
}

async function openUp() {
  if (state.over || state.busy) return;
  if (doneCount() < jobs.length) {
    toast(meta.refuse.replace('{list}', remainingList()), '', 3000);
    paintHint();
    return;
  }
  state.busy = true;
  state.dir = 0;
  await walkTo(X.door - 1.1);
  state.busy = true;
  await tween({
    ms: 520, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      doorParts.plate.rotation.y = e * Math.PI;
      if (e > 0.5 && doorParts.plate.material.map !== doorParts.openTex) {
        doorParts.plate.material.map = doorParts.openTex;
        doorParts.plate.material.needsUpdate = true;
      }
    },
  });
  toast(door.flip, 'good', 2400);
  await wait(700);
  state.busy = false;
  finish();
}

function finish() {
  state.over = true;
  const points = state.jobsDone
    .map((ok, i) => (ok ? `<b style="color:var(--good)">✓ ${jobs[i].name}</b> — ${jobs[i].ending}` : null))
    .filter(Boolean);
  sideQuests.forEach((q, i) => points.push(state.collected[i] ? q.foundPoint : q.missedPoint));
  const n = collectedCount();
  if (n === sideQuests.length) points.push(results.allThree);
  else if (n === 0) points.push(results.noneOfThem);
  points.push(results.closing);

  bridge.complete({
    passed: true,
    score: Math.min(1, 0.7 + n * 0.1),
    detail: { jobs: doneCount(), collected: n, found: sideQuests.filter((_, i) => state.collected[i]).map((q) => q.badge) },
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
   Debug actions — the console drives the same functions the clicks do
   ============================================================ */
/** 0 = machine switch, 1 = wet floor sign, 2 = till. */
async function doJob(index) {
  if (index === 0) return toggleMachine();
  if (index === 1) { await takeSign(); return placeSign(); }
  if (index === 2) return openTill();
}

/** 0 = put the strays back, 1 = restack the delivery, 2 = the chiller. */
async function doSideQuest(index) {
  if (index === 0) {
    for (let i = 0; i < STRAY_DEFS.length; i++) {
      if (state.strayHome[i]) continue;
      await takeStray(i);
      await placeStray(i);
    }
    return;
  }
  if (index === 1) {
    const want = crates.map((_, i) => i).sort((a, b) => crates[b].weight - crates[a].weight);
    for (let d = 0; d < want.length; d++) {
      if (state.stack[d] === want[d]) continue;
      await liftCrate(state.stack.indexOf(want[d]));
      await dropCrate(d);
    }
    return;
  }
  if (index === 2) return flipChiller();
}

function restart() {
  document.querySelector('.scrim')?.remove();
  Object.assign(state, {
    x: START_X, dir: 0, facing: 1,
    jobsDone: [false, false, false],
    collected: [false, false, false],
    strayHome: [false, false, false],
    stack: [2, 0, 1],
    carrying: null,
    signPlaced: false,
    busy: false, walking: false, over: false,
  });

  avatar.position.set(START_X, 0, 1.6);
  stage.camera.position.x = START_X;

  badges.forEach((b) => {
    b.disc.material.color.setHex(COLORS.dim);
    b.ring.material.color.setHex(COLORS.dim);
    b.tick.visible = false;
  });

  machine.toggle.material.color.setHex(COLORS.dim);
  machine.toggle.position.y = -0.1;
  machine.swLamp.material.color.setHex(COLORS.dim);
  machine.swLamp.material.emissive.setHex(0x000000);
  machine.lamp.material.color.setHex(COLORS.dim);
  machine.lamp.material.emissive.setHex(0x000000);

  sign.position.set(X.sign, 0, 1.5);
  sign.rotation.set(0, 0, 0);
  stage.setPickEnabled(sign, true);

  till.drawer.position.z = 0.1;
  till.screen.material.color.setHex(0x2b303a);
  till.screen.material.emissive.setHex(0x000000);

  STRAY_DEFS.forEach((d, i) => {
    strayNodes[i].position.set(...d.start.pos);
    strayNodes[i].rotation.set(0, 0, d.start.rot);
    stage.setPickEnabled(strayNodes[i], true);
  });

  state.stack.forEach((idx, s) => {
    crateNodes[idx].position.set(X.crates, CR_Y(s), -1.0);
    crateNodes[idx].rotation.set(0, 0, 0);
  });
  crateSlots.forEach((m) => { m.visible = false; });

  chillerParts.toggle.material.color.setHex(COLORS.dim);
  chillerParts.toggle.position.y = -0.08;
  chillerParts.lamp.material.color.setHex(COLORS.dim);
  chillerParts.lamp.material.emissive.setHex(0x000000);
  chillerParts.inner.material.color.setHex(0x2b333d);
  chillerParts.inner.material.emissive.setHex(0x000000);
  chillerParts.glass.material.opacity = 0.85;

  doorParts.plate.rotation.y = 0;
  doorParts.plate.material.map = doorParts.closedTex;
  doorParts.plate.material.needsUpdate = true;

  slotNodes.forEach((n) => {
    n.classList.remove('on');
    n.textContent = meta.slotEmpty;
  });

  stats.set('jobs', 0);
  paintHint();
  bridge.restart();
}

/* ============================================================
   Panels and small helpers
   ============================================================ */
function doneCount() { return state.jobsDone.filter(Boolean).length; }
function collectedCount() { return state.collected.filter(Boolean).length; }

function remainingList() {
  return jobs.filter((_, i) => !state.jobsDone[i]).map((j) => j.name).join(', ');
}

function carryName() {
  const c = state.carrying;
  if (!c) return '';
  if (c.type === 'sign') return jobs[1].thing;
  if (c.type === 'stray') return strays[c.index].name;
  return meta.crateThing.replace('{label}', crates[c.index].label);
}

/** True (and says so) when the hands are already busy. */
function handsFull() {
  if (!state.carrying) return false;
  toast(meta.handsFull.replace('{thing}', carryName()), '', 2200);
  return true;
}

function paintHint() {
  tallyEl.textContent = meta.tally
    .replace('{done}', String(doneCount()))
    .replace('{total}', String(jobs.length));

  const ready = doneCount() === jobs.length;
  openBtn.disabled = !ready || state.over;

  if (state.over) { hintEl.textContent = meta.done; return; }
  if (state.carrying) {
    hintEl.textContent = meta.hintCarrying.replace('{thing}', carryName());
    return;
  }
  if (ready) { hintEl.textContent = meta.hintReady; return; }
  if (doneCount() === 0) { hintEl.textContent = meta.hintStart; return; }
  hintEl.textContent = meta.hintRemaining.replace('{list}', remainingList());
}

/** Lower something onto a spot with a short hop, then let it rest there. */
function settle(obj, pos, rot = 0) {
  const from = obj.position.clone();
  const fromRot = obj.rotation.z;
  const to = new THREE.Vector3(...pos);
  return tween({
    ms: 460, easing: ease.outCubic,
    onUpdate: (_, e) => {
      obj.position.lerpVectors(from, to, e);
      obj.position.y += Math.sin(e * Math.PI) * 0.35;      // a little arc
      obj.rotation.z = fromRot + (rot - fromRot) * e;
      obj.rotation.y = (1 - e) * obj.rotation.y;
    },
    onDone: () => {
      obj.position.copy(to);
      obj.rotation.set(0, 0, rot);
    },
  });
}

function clampWalk(x) {
  return Math.max(WALK_MIN, Math.min(WALK_MAX, x));
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
    c.font = '800 62px Urbanist, Helvetica, Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 3);
  });
}

function tickTexture() {
  return canvasTexture(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 15;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(34, 64); c.lineTo(54, 88); c.lineTo(94, 40);
    c.stroke();
  });
}
