/* ============================================================
   17 — Make hints cost something

   Eight items of incoming post arrive one at a time and get sorted
   by hand into one of three trays. No multiple choice: the answer
   is where you put the thing.

   The help is a limited resource. Three "ask a senior" tokens sit
   on the desk as physical objects; spending one on the item in
   front of you reveals the senior's reasoning and then leaves the
   desk for good. Right-first-time unaided scores most, right with
   help scores less, and a wrong tray without an ask sends the item
   back round once with a nudge rather than ending it.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, lanes, items, scoring, feedback, tokenUse, comeback, results, lesson, scoreLine } from './content.js';

const bridge = createBridge('hints-cost');

/* ---------------- Desk geometry ----------------
   One flat desk in world coordinates: x across, z toward the
   camera, y up. Everything sits on DESK_Y. */
const DESK_Y   = 0.95;
const DESK_W   = 10.0;
const DESK_D   = 6.4;
const TRAY_Z   = 1.45;          // trays along the near edge
const TRAY_FLOOR = 0.07;        // tray inner floor, above the desk top
const LANE_X   = [-3.1, 0, 3.1];
const INBOX    = new THREE.Vector3(0, DESK_Y, -1.5);   // where the current item waits
const TOKEN_AT = [
  new THREE.Vector3(-4.35, DESK_Y, -1.9),
  new THREE.Vector3(-4.35, DESK_Y, -1.05),
  new THREE.Vector3(-4.35, DESK_Y, -0.2),
];

const LANE_HEX = ['#2757E2', '#5B6573', '#B07A08'];

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [0, 8.1, 7.8],
  lookAt: [0, 0.9, -0.1],
  background: 0x161b22,
  fog: [24, 54],
  fit: { width: 11.6, height: 8.4 },
  orbitLimits: {
    minPolarAngle: 0.45, maxPolarAngle: 1.08,
    minAzimuthAngle: -0.3, maxAzimuthAngle: 0.3,
    minDistance: 8, maxDistance: 15,
  },
});

addLightRig(stage.scene, {
  sky: 0xe4ebf4, ground: 0x2a3038, hemi: 0.95,
  keyColor: 0xfff2e0, keyIntensity: 1.5, keyPos: [3, 13, 8],
  shadowSize: 12, fillColor: 0x4a6f9c, fillIntensity: 0.55,
});

/* ---------------- Room and desk ---------------- */
{
  const floor = box(34, 0.2, 22, 0x6c737d, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(34, 11, 0.3, 0xcbd2db, { roughness: 0.95 });
  wall.position.set(0, 5.5, -4.6);
  stage.scene.add(floor, wall);

  const top = new THREE.Mesh(roundedBox(DESK_W, 0.16, DESK_D, 0.05), mat(0xd9cdb8, { roughness: 0.8 }));
  top.position.y = DESK_Y - 0.08;
  top.castShadow = true;
  top.receiveShadow = true;
  stage.scene.add(top);

  for (const x of [-(DESK_W / 2 - 0.3), DESK_W / 2 - 0.3]) {
    for (const z of [-(DESK_D / 2 - 0.3), DESK_D / 2 - 0.3]) {
      const leg = box(0.14, DESK_Y - 0.16, 0.14, 0x5b6573, { roughness: 0.6 });
      leg.position.set(x, (DESK_Y - 0.16) / 2, z);
      stage.scene.add(leg);
    }
  }
}

/* ---------------- The three trays ---------------- */
/* Each tray is one pickable group: a shallow open box, a standing
   sign, and a flat glow plate that flashes mint or amber when
   something lands in it. The generous invisible hit box means a
   click anywhere over the tray counts, even on the items stacked
   inside it. */
const trays = lanes.map((lane, i) => {
  const g = new THREE.Group();
  g.position.set(LANE_X[i], DESK_Y, TRAY_Z);

  const base = box(2.5, 0.07, 1.7, 0xbfc6d0, { roughness: 0.65 });
  base.position.y = TRAY_FLOOR - 0.035;
  g.add(base);
  // Four low walls, in the lane's own colour so the trays read apart
  for (const [w, d, x, z] of [[2.5, 0.08, 0, -0.85], [2.5, 0.08, 0, 0.85], [0.08, 1.7, -1.25, 0], [0.08, 1.7, 1.25, 0]]) {
    const wall = box(w, 0.2, d, lane.colour, { roughness: 0.6 });
    wall.position.set(x, TRAY_FLOOR + 0.07, z);
    g.add(wall);
  }

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 2.1),
    new THREE.MeshBasicMaterial({ color: 0x5fe0b0, transparent: true, opacity: 0, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.012;
  glow.renderOrder = 6;
  g.add(glow);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.6),
    new THREE.MeshBasicMaterial({ map: signTexture(lane.label, LANE_HEX[i]), transparent: true }),
  );
  sign.position.set(0, 0.42, -1.12);
  sign.rotation.x = -0.42;
  g.add(sign);

  // Pick target: invisible, taller than anything that can stack here
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 1.1, 1.9),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.y = 0.55;
  g.add(hit);

  g.userData = { glow, stack: 0 };
  stage.scene.add(g);
  stage.pickable(g, { kind: 'lane', index: i });
  return g;
});

/* ---------------- The three ask tokens ----------------
   Physical, countable, and they leave the desk when spent. */
const tokens = TOKEN_AT.map((at, i) => {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 18), mat(0x2757e2, { roughness: 0.55 }));
  disc.position.y = 0.05;
  disc.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 20), mat(0x5fe0b0, { roughness: 0.5 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.1;
  const pip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.115, 12), mat(0xffffff, { roughness: 0.6 }));
  pip.position.y = 0.055;
  g.add(disc, rim, pip);
  g.position.copy(at);
  g.userData = { home: at.clone(), index: i };
  stage.scene.add(g);
  stage.pickable(g, { kind: 'token' });
  return g;
});

/* ---------------- The items ----------------
   Built flat on the desk with a camera-facing label above, so the
   learner can read what the thing is without a legend. */
function printedLines(host, w, zs, colour = 0xb9bec8, y = 0.035) {
  zs.forEach((dz, i) => {
    const line = box(w * (i % 2 ? 0.72 : 1), 0.008, 0.04, colour, { roughness: 1, cast: false });
    line.position.set(0, y, dz);
    host.add(line);
  });
}

const BUILD = {
  email() {
    const g = new THREE.Group();
    const page = box(1.0, 0.03, 0.72, 0xf8f6f1, { roughness: 0.95 });
    page.position.y = 0.015;
    g.add(page);
    const strip = box(1.0, 0.009, 0.14, 0x2757e2, { roughness: 1, cast: false });
    strip.position.set(0, 0.034, -0.26);
    g.add(strip);
    printedLines(g, 0.7, [-0.04, 0.08, 0.2]);
    return g;
  },

  voicemail() {
    const g = new THREE.Group();
    const slip = box(0.68, 0.025, 0.42, 0xf0b9c4, { roughness: 0.95 });
    slip.position.y = 0.013;
    g.add(slip);
    printedLines(g, 0.44, [-0.1, 0.03, 0.14], 0xa5636f, 0.03);
    return g;
  },

  form() {
    const g = new THREE.Group();
    const page = box(0.95, 0.03, 0.7, 0xfbfbf8, { roughness: 0.95 });
    page.position.y = 0.015;
    g.add(page);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        const field = box(0.36, 0.008, 0.11, 0xd4dae4, { roughness: 1, cast: false });
        field.position.set(-0.21 + c * 0.42, 0.034, -0.17 + r * 0.19);
        g.add(field);
      }
    }
    return g;
  },

  parcel() {
    const g = new THREE.Group();
    const body = box(0.66, 0.42, 0.54, 0xa9793f, { roughness: 1 });
    body.position.y = 0.21;
    const tape = box(0.2, 0.43, 0.56, 0xd9cfb8, { roughness: 1, cast: false });
    tape.position.y = 0.212;
    const slip = box(0.3, 0.44, 0.2, 0xf6f3ec, { roughness: 1, cast: false });
    slip.position.set(0.16, 0.212, 0.1);
    g.add(body, tape, slip);
    return g;
  },

  complaint() {
    const g = new THREE.Group();
    const card = box(0.74, 0.04, 0.5, 0xfdfcf8, { roughness: 0.92 });
    card.position.y = 0.02;
    g.add(card);
    const stripe = box(0.74, 0.012, 0.1, 0xe0234e, { roughness: 1, cast: false });
    stripe.position.set(0, 0.043, -0.18);
    g.add(stripe);
    printedLines(g, 0.5, [0.0, 0.12], 0xaeb4bf, 0.04);
    return g;
  },

  invoice() {
    const g = new THREE.Group();
    const page = box(0.98, 0.035, 0.72, 0xf9f8f3, { roughness: 0.95 });
    page.position.y = 0.017;
    g.add(page);
    const stripe = box(0.26, 0.011, 0.72, 0x12a177, { roughness: 1, cast: false });
    stripe.position.set(-0.36, 0.039, 0);
    g.add(stripe);
    printedLines(g, 0.44, [-0.16, -0.02, 0.12, 0.25], 0xb9bec8, 0.039);
    g.children.slice(-4).forEach((l) => { l.position.x = 0.12; });
    return g;
  },

  note() {
    const g = new THREE.Group();
    const square = box(0.48, 0.02, 0.48, 0xf2d85c, { roughness: 0.95 });
    square.position.y = 0.01;
    square.rotation.y = 0.18;
    g.add(square);
    printedLines(g, 0.3, [-0.1, 0.0, 0.1], 0x8d8464, 0.024);
    return g;
  },

  envelope() {
    const g = new THREE.Group();
    const body = box(0.86, 0.05, 0.52, 0xeae2d2, { roughness: 0.95 });
    body.position.y = 0.025;
    g.add(body);
    // Flap, as two thin bars meeting in the middle
    for (const s of [-1, 1]) {
      const bar = box(0.5, 0.008, 0.03, 0xc8bfa9, { roughness: 1, cast: false });
      bar.position.set(s * 0.19, 0.053, 0);
      bar.rotation.y = s * 0.55;
      g.add(bar);
    }
    return g;
  },
};

const pieces = items.map((item, i) => {
  const g = BUILD[item.kind]();
  const tag = labelSprite(item.label, LANE_HEX[0], 0.46);
  tag.position.set(0, 0.95, 0);
  g.add(tag);
  g.userData = { item, index: i, tag };
  g.visible = false;
  stage.scene.add(g);
  return g;
});
const pieceById = Object.fromEntries(pieces.map((p) => [p.userData.item.id, p]));
const byId = Object.fromEntries(items.map((it) => [it.id, it]));

/* A ring under whatever is waiting to be sorted. */
const spot = new THREE.Group();
spot.visible = false;
const spotRing = new THREE.Mesh(
  new THREE.RingGeometry(0.72, 0.84, 36),
  new THREE.MeshBasicMaterial({ color: 0x5fe0b0, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
);
spotRing.rotation.x = -Math.PI / 2;
spotRing.renderOrder = 7;
spot.add(spotRing);
spot.position.copy(INBOX).setY(DESK_Y + 0.014);
stage.scene.add(spot);

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const bottom = document.getElementById('bottom');
const stats = statBar(document.getElementById('stats'), [
  { id: 'tokens', label: meta.tokensLabel, value: scoring.tokens, max: scoring.tokens },
  { id: 'filed', label: meta.filedLabel, value: 0, max: items.length },
]);
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ----------------
   queue[0] is the item on the desk now. live[id] carries what has
   happened to that item so far: whether a token was spent on it,
   and whether this is its second and last look. */
const state = {
  tokens: scoring.tokens,
  queue: [],
  live: {},
  placed: [],      // every attempt: { id, lane, correct, asked, second, points }
  wrong: [],       // ids put in the wrong tray at least once
  cameBack: [],    // ids that came back round
  asks: [],        // ids a token was spent on, in order
  score: 0,
  maxScore: items.length * scoring.unaided,
  busy: false,
  done: false,
  run: 0,
};

stage.onPick((obj, data) => {
  if (!data || state.busy || state.done) return;
  if (data.kind === 'lane') sort(data.index);
  else if (data.kind === 'token') ask();
});

stage.onFrame((_, t) => {
  if (!spot.visible) return;
  spotRing.scale.setScalar(1 + Math.sin(t * 2.6) * 0.045);
  spotRing.material.opacity = 0.6 + Math.sin(t * 2.6) * 0.18;
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__hints = { state, sort, ask, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Actions
   ============================================================ */

/** Spend one token on the item currently on the desk. */
async function ask() {
  if (state.busy || state.done || !state.queue.length) return;
  const id = state.queue[0];
  const entry = state.live[id];
  if (entry.asked) return;
  if (state.tokens <= 0) {
    toast(feedback.noTokens, 'bad', 2600);
    return;
  }

  const run = state.run;
  state.busy = true;
  renderPanel();

  state.tokens -= 1;
  entry.asked = true;
  state.asks.push(id);
  stats.set('tokens', state.tokens);

  await spendToken(state.tokens);
  if (run !== state.run) return;

  toast(
    state.tokens === 0 ? feedback.askedLast : feedback.asked.replace('{n}', String(state.tokens)),
    '',
    3400,
  );
  state.busy = false;
  renderPanel();
}

/** Put the current item in a tray. laneIndex is 0..2. */
async function sort(laneIndex) {
  if (state.busy || state.done || !state.queue.length) return;
  const id = state.queue[0];
  const item = byId[id];
  const entry = state.live[id];
  const run = state.run;

  state.busy = true;
  spot.visible = false;
  renderPanel();

  const correct = laneIndex === item.lane;
  const points = !correct ? scoring.wrong
    : entry.second ? scoring.secondPass
    : entry.asked ? scoring.afterAsk
    : scoring.unaided;
  // A wrong tray only ends the item if it was a second look, or if a
  // token was already spent on it. Otherwise it comes back round once.
  const requeue = !correct && !entry.second && !entry.asked;
  const kind = correct
    ? (entry.second ? 'rightSecond' : entry.asked ? 'rightAsked' : 'rightUnaided')
    : (entry.second ? 'wrongSecond' : entry.asked ? 'wrongAsked' : 'wrongFirst');

  state.score += points;
  state.queue.shift();
  if (!correct && !state.wrong.includes(id)) state.wrong.push(id);
  state.placed.push({ id, lane: laneIndex, correct, asked: entry.asked, second: entry.second, points });

  await dropInto(pieceById[id], laneIndex, requeue);
  if (run !== state.run) return;

  flash(laneIndex, correct ? 0x5fe0b0 : 0xe0b02a);
  toast(feedback[kind].replace('{points}', String(points)), correct ? 'good' : 'bad', 3200);

  if (requeue) {
    entry.second = true;
    state.cameBack.push(id);
    state.queue.push(id);
    await liftAway(pieceById[id]);
  } else {
    entry.done = true;
  }
  if (run !== state.run) return;

  const filed = Object.values(state.live).filter((e) => e.done).length;
  stats.set('filed', filed);
  bridge.progress(filed / items.length, { score: state.score, asksLeft: state.tokens });

  await wait(240);
  if (run !== state.run) return;

  state.busy = false;
  if (state.queue.length) await present(state.queue[0]);
  else finish();
}

async function restart() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, {
    tokens: scoring.tokens,
    queue: items.map((i) => i.id),
    live: Object.fromEntries(items.map((i) => [i.id, { asked: false, second: false, done: false }])),
    placed: [],
    wrong: [],
    cameBack: [],
    asks: [],
    score: 0,
    busy: false,
    done: false,
  });

  for (const t of tokens) {
    t.position.copy(t.userData.home);
    t.scale.set(1, 1, 1);
    t.visible = true;
  }
  for (const p of pieces) {
    p.visible = false;
    p.position.copy(INBOX);
    p.rotation.set(0, 0, 0);
    p.scale.set(1, 1, 1);
    p.userData.tag.visible = true;
  }
  for (const tray of trays) {
    tray.userData.stack = 0;
    tray.userData.glow.material.opacity = 0;
  }
  stats.set('tokens', scoring.tokens);
  stats.set('filed', 0);
  bottom.style.visibility = '';
  bridge.restart();
  await present(state.queue[0]);
}

/* ---------------- Presentation ---------------- */
/** Drop the next item onto the desk and open the panel on it. */
async function present(id) {
  const run = state.run;
  const g = pieceById[id];
  g.visible = true;
  g.position.copy(INBOX);
  g.rotation.set(0, 0, 0);
  spot.visible = true;
  renderPanel();

  const lift = 2.6;
  g.position.y = DESK_Y + lift;
  await tween({
    ms: 460, easing: ease.outCubic,
    onUpdate: (_, e) => { g.position.y = DESK_Y + lift * (1 - e); },
  });
  if (run !== state.run) return;
  g.position.y = DESK_Y;
}

function renderPanel() {
  if (state.done) return;
  const id = state.queue[0];
  if (!id) { bottom.replaceChildren(); return; }
  const item = byId[id];
  const entry = state.live[id];
  // First-pass items are numbered by where they sit in the morning's
  // post; a second look is labelled "back round" instead.
  const nth = items.findIndex((i) => i.id === id) + 1;

  const askLabel = state.tokens <= 0 ? meta.askSpent
    : entry.asked ? meta.askUsedHere
    : meta.askButton.replace('{n}', String(state.tokens));

  const prompt = entry.second ? meta.secondPrompt
    : entry.asked ? meta.askedPrompt
    : state.placed.length === 0 ? meta.instructions
    : meta.lanePrompt;

  bottom.replaceChildren(el('div.item', {}, [
    el('div.eyebrow', {}, entry.second
      ? meta.backRound
      : meta.itemCounter.replace('{n}', String(nth)).replace('{total}', String(items.length))),
    el('h2', {}, item.name),
    el('p.line', {}, item.line),
    entry.second ? el('div.said.nudge', {}, [
      el('div.eyebrow', {}, meta.nudgeEyebrow),
      el('p', {}, item.nudge),
    ]) : null,
    entry.asked ? el('div.said', {}, [
      el('div.eyebrow', {}, meta.seniorEyebrow),
      el('p', {}, item.reasoning),
    ]) : null,
    el('div.row', {}, [
      el('div.grow', {}, prompt),
      el('button.btn.primary', {
        type: 'button',
        disabled: state.busy || entry.asked || state.tokens <= 0,
        onClick: ask,
      }, askLabel),
    ]),
  ]));
}

function finish() {
  state.done = true;
  spot.visible = false;
  const fraction = state.score / state.maxScore;
  const r = results.find((x) => fraction >= x.min) ?? results[results.length - 1];
  const used = scoring.tokens - state.tokens;
  const passed = fraction >= scoring.pass;

  bridge.complete({
    passed,
    score: fraction,
    detail: {
      points: state.score,
      asksUsed: used,
      asksOn: [...state.asks],
      cameBack: [...state.cameBack],
    },
  });

  const points = [
    scoreLine
      .replace('{score}', String(state.score))
      .replace('{max}', String(state.maxScore))
      .replace('{used}', String(used))
      .replace('{tokens}', String(scoring.tokens)),
    tokenUse[askPattern()],
    state.cameBack.length
      ? comeback.some.replace('{list}', nameList(state.cameBack))
      : comeback.none,
  ];
  const closed = state.placed.filter((p) => !p.correct && (p.second || p.asked)).map((p) => p.id);
  if (closed.length) points.push(comeback.closed.replace('{list}', nameList(closed)));
  points.push(lesson);

  // The modal carries the ending; an empty panel underneath would
  // just be a blank white box once it is closed.
  bottom.replaceChildren();
  bottom.style.visibility = 'hidden';
  showResult({
    passed,
    title: r.title,
    summary: r.summary,
    points,
    actions: [
      { label: meta.close, kind: 'ghost' },
      { label: meta.again, kind: 'primary', onClick: restart },
    ],
  });
}

/* Which story the ending tells about the three tokens. */
function askPattern() {
  if (!state.asks.length) return state.wrong.length ? 'allLeftUnsure' : 'none';
  const hard = state.asks.filter((id) => byId[id].ambiguous).length;
  if (hard === state.asks.length) return 'ambiguous';
  if (hard === 0) return 'early';
  return 'mixed';
}

/* ---------------- Animation ---------------- */
/** Arc the item over into a tray, stacking on whatever is there. */
async function dropInto(g, laneIndex, temporary) {
  const tray = trays[laneIndex];
  const slot = tray.userData.stack;
  const to = new THREE.Vector3(
    LANE_X[laneIndex] + ((slot % 3) - 1) * 0.16,
    DESK_Y + TRAY_FLOOR + slot * 0.075,
    TRAY_Z + (slot % 2 ? 0.1 : -0.08),
  );
  if (!temporary) tray.userData.stack = slot + 1;

  const from = g.position.clone();
  const spin = ((laneIndex - 1) * 0.3) + 0.12;
  g.userData.tag.visible = false;
  await tween({
    ms: 620, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      g.position.lerpVectors(from, to, e);
      g.position.y += Math.sin(e * Math.PI) * 1.4;
      g.rotation.y = spin * e;
    },
  });
}

/** A wrong first guess: back out of the tray and onto the pile. */
async function liftAway(g) {
  const from = g.position.clone();
  await wait(420);
  await tween({
    ms: 520, easing: ease.outCubic,
    onUpdate: (_, e) => {
      g.position.set(from.x, from.y + 2.2 * e, from.z - 0.6 * e);
      g.scale.setScalar(1 - 0.6 * e);
    },
  });
  g.visible = false;
  g.scale.set(1, 1, 1);
  g.userData.tag.visible = true;
}

/** A token rises off the desk and leaves. It never comes back. */
async function spendToken(remaining) {
  const g = tokens[remaining];     // tokens are spent right to left
  if (!g || !g.visible) return;
  const from = g.position.clone();
  await tween({
    ms: 520, easing: ease.outCubic,
    onUpdate: (_, e) => {
      g.position.set(from.x - 1.1 * e, from.y + 2.4 * e, from.z - 1.6 * e);
      g.scale.setScalar(1 - 0.75 * e);
    },
  });
  g.visible = false;
}

function flash(laneIndex, hex) {
  const m = trays[laneIndex].userData.glow.material;
  m.color.setHex(hex);
  tween({
    ms: 820, easing: ease.outCubic,
    onUpdate: (_, e) => { m.opacity = Math.sin(Math.min(1, e) * Math.PI) * 0.5; },
    onDone: () => { m.opacity = 0; },
  });
}

/* ---------------- Text helpers ---------------- */
function nameList(ids) {
  const names = ids.map((id) => `<b>${byId[id].label}</b>`);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function labelSprite(text, colour = '#10131A', h = 0.46) {
  const W = 1024, H = 192;
  const tex = canvasTexture(W, H, (c, cw, ch) => {
    c.clearRect(0, 0, cw, ch);
    c.font = '800 76px Urbanist, Helvetica, Arial, sans-serif';
    const w = Math.min(cw - 12, c.measureText(text).width + 96);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect((cw - w) / 2, 22, w, ch - 44, 62);
    c.fill();
    c.fillStyle = colour;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch / 2 + 4);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(h * (W / H), h, 1);
  return s;
}

function signTexture(text, colour) {
  return canvasTexture(1024, 256, (c, cw, ch) => {
    c.clearRect(0, 0, cw, ch);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(5, 18, cw - 10, ch - 36, 40);
    c.fill();
    c.strokeStyle = colour;
    c.lineWidth = 11;
    c.beginPath();
    c.roundRect(11, 24, cw - 22, ch - 48, 36);
    c.stroke();
    let size = 96;
    const font = () => `800 ${size}px Urbanist, Helvetica, Arial, sans-serif`;
    c.font = font();
    while (c.measureText(text).width > cw - 90 && size > 40) { size -= 4; c.font = font(); }
    c.fillStyle = colour;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch / 2 + 4);
  });
}
