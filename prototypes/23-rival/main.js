/* ============================================================
   23 — Give learners a rival

   Twelve work cards lie on a table between you and Mara. Every card
   is printed with what it is worth and how many hours it costs, and
   both sides can see all of it from the start. You take a card with
   your hands; she immediately takes one from the same board. You
   have the same hours, and the day ends when neither of you can
   afford anything left.

   The point of the thing is in how she chooses. Before every pick
   she reads the last two cards you took:

     two high-worth in a row  → deny:       take the biggest left
     two quick wins in a row  → quickWins:  leave the small ones,
                                            take the biggest left
     a mix                    → efficient:  best worth per hour
     her hours too short      → squeeze:    best of what still fits

   Then she picks at random among the cards that are within `slack`
   of the best one under that rule — enough that she is not a lookup
   table, never enough that the choice looks arbitrary. Each pick
   comes with one line chosen by WHICH rule fired, so the learner can
   read her off the table rather than guessing.

   Totals are by worth delivered, not cards cleared, so six quick
   wins can lose to three big ones.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, sides, cardCaptions, config, cards,
  maraLines, ruleRecap, recapLine, feedback, results, endingPoints,
} from './content.js';

const bridge = createBridge('rival');

/* ---------------- Palette ---------------- */
const BLUE   = 0x2757e2;        // the learner's side
const ORANGE = 0xe07a2a;        // the rival's side
const MINT   = 0x5fe0b0;
const NEUTRAL = 0xcfd4dc;       // an untaken card's mat
const BLUE_CSS = '#2757E2';
const ORANGE_CSS = '#E07A2A';
const INK_CSS = '#4B5162';

/** Everything on the board, so the two worth meters read as a share of it. */
const TOTAL_WORTH = cards.reduce((s, c) => s + c.worth, 0);

/* ---------------- Table geometry ----------------
   One flat table: x across, z toward the camera, y up. The board sits
   in the middle, the two piles along the two long edges. */
const DESK_Y = 0.95;
const DESK_W = 12.2;
const DESK_D = 8.6;

const CARD_W = 1.6;
const CARD_D = 1.0;
const COL_X = [-2.85, -0.95, 0.95, 2.85];
const ROW_Z = [-1.35, 0, 1.35];

const PILE_Z = 2.85;            // your pile at +z, hers at -z
const PILE_SCALE = 0.68;
const PILE_SLOTS = config.hours;                       // one hour is the cheapest card
const PILE_GAP = Math.min(1.05, 7.4 / PILE_SLOTS);
const PILE_X0 = -((PILE_SLOTS - 1) * PILE_GAP) / 2;

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [0, 10.6, 7.2],
  lookAt: [0, 0.9, 0.1],
  background: 0xe8ebf0,
  fog: [26, 60],
  fit: { width: 13.2, height: 10.4 },
  orbitLimits: {
    minPolarAngle: 0.34, maxPolarAngle: 1.0,
    minAzimuthAngle: -0.3, maxAzimuthAngle: 0.3,
    minDistance: 10, maxDistance: 17,
  },
});

addLightRig(stage.scene, {
  sky: 0xf1f5fb, ground: 0xb6bec9, hemi: 1.0,
  keyColor: 0xfff4e4, keyIntensity: 1.6, keyPos: [4, 14, 7],
  shadowSize: 13, fillColor: 0x6d8ec0, fillIntensity: 0.5,
});

/* ---------------- Room and table ---------------- */
{
  const floor = box(40, 0.2, 30, 0xc6ccd6, { roughness: 1 });
  floor.position.y = -0.1;
  stage.scene.add(floor);

  const top = new THREE.Mesh(roundedBox(DESK_W, 0.16, DESK_D, 0.06), mat(0xe2d9c8, { roughness: 0.85 }));
  top.position.y = DESK_Y - 0.08;
  top.castShadow = true;
  top.receiveShadow = true;
  stage.scene.add(top);

  for (const x of [-(DESK_W / 2 - 0.5), DESK_W / 2 - 0.5]) {
    for (const z of [-(DESK_D / 2 - 0.5), DESK_D / 2 - 0.5]) {
      const leg = box(0.16, DESK_Y - 0.16, 0.16, 0x5b6573, { roughness: 0.6 });
      leg.position.set(x, (DESK_Y - 0.16) / 2, z);
      stage.scene.add(leg);
    }
  }

  /* A coloured strip down each long edge: your side and hers, so the
     piles are never ambiguous even before anything is on them. */
  for (const [z, colour] of [[PILE_Z + 1.0, BLUE], [-(PILE_Z + 1.0), ORANGE]]) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(DESK_W - 1.0, 0.1),
      new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, DESK_Y + 0.011, z);
    stage.scene.add(strip);
  }

  // Name plates, flat on the table at the left end of each side
  for (const [label, z, colour] of [[sides.you, PILE_Z, BLUE_CSS], [sides.rival, -PILE_Z, ORANGE_CSS]]) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.56),
      new THREE.MeshBasicMaterial({ map: plateTexture(label, colour), transparent: true, depthWrite: false }),
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(-5.05, DESK_Y + 0.013, z);
    stage.scene.add(plate);
  }
}

/* ---------------- The twelve cards ----------------
   Each card is one pickable group: a coloured mat underneath that
   turns blue or orange once somebody owns it, the card body, the
   printed face, and a dim plate that greys the card out when it no
   longer fits in your day. */
const pieces = cards.map((card, i) => {
  const g = new THREE.Group();

  const under = new THREE.Mesh(roundedBox(CARD_W + 0.12, 0.05, CARD_D + 0.12, 0.05), mat(NEUTRAL, { roughness: 0.8 }));
  under.position.y = 0.025;
  under.receiveShadow = true;

  const body = new THREE.Mesh(roundedBox(CARD_W, 0.07, CARD_D, 0.04), mat(0xfbfaf6, { roughness: 0.9 }));
  body.position.y = 0.062;
  body.castShadow = true;

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W - 0.08, CARD_D - 0.06),
    new THREE.MeshBasicMaterial({ map: cardTexture(card), transparent: true, depthWrite: false }),
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.1;

  const dim = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W + 0.14, CARD_D + 0.14),
    new THREE.MeshBasicMaterial({ color: 0x10131a, transparent: true, opacity: 0, depthWrite: false }),
  );
  dim.rotation.x = -Math.PI / 2;
  dim.position.y = 0.108;
  dim.renderOrder = 8;

  // Generous invisible hit box, so a click near the card still counts
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(CARD_W + 0.16, 0.45, CARD_D + 0.16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.y = 0.22;

  g.add(under, body, face, dim, hit);
  g.position.set(COL_X[i % 4], DESK_Y, ROW_Z[Math.floor(i / 4)]);
  g.userData = { card, under, dim, home: g.position.clone(), baseY: DESK_Y, hover: false, moving: false };
  stage.scene.add(g);
  stage.pickable(g, { kind: 'card', id: card.id });
  return g;
});
const pieceById = Object.fromEntries(pieces.map((p) => [p.userData.card.id, p]));
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
document.getElementById('restart').textContent = meta.restart;
const bottom = document.getElementById('bottom');
const stats = statBar(document.getElementById('stats'), [
  { id: 'youHours', label: meta.youLabel, value: config.hours, max: config.hours, color: BLUE_CSS },
  { id: 'youWorth', label: meta.youWorthLabel, value: 0, max: TOTAL_WORTH, color: BLUE_CSS },
  { id: 'maraHours', label: meta.maraLabel, value: config.hours, max: config.hours, color: ORANGE_CSS },
  { id: 'maraWorth', label: meta.maraWorthLabel, value: 0, max: TOTAL_WORTH, color: ORANGE_CSS },
]);
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ----------------
   board: card ids still on the table.
   you / mara: hours left, worth delivered, and the pile in order.
   maraPicks: one entry per pick of hers, carrying the rule that fired.
   rules: the same rules in order, which is what the ending recaps. */
const state = {
  board: [],
  you:  { hours: config.hours, worth: 0, pile: [] },
  mara: { hours: config.hours, worth: 0, pile: [] },
  yourPicks: [],
  maraPicks: [],
  rules: [],
  lastLine: null,
  busy: false,
  done: false,
  run: 0,
};

stage.onPick((obj, data) => {
  if (!data || data.kind !== 'card') return;
  take(data.id);
});

stage.onHover((next, prev) => {
  for (const p of [next, prev]) {
    if (p && p.userData && 'hover' in p.userData) p.userData.hover = (p === next);
  }
});

/* Hover lift, applied only to cards still on the board and not mid-slide. */
stage.onFrame((dt) => {
  for (const p of pieces) {
    const d = p.userData;
    if (d.moving) continue;
    const onBoard = state.board.includes(d.card.id);
    const target = d.baseY + (onBoard && d.hover && !state.busy && !state.done ? 0.24 : 0);
    p.position.y += (target - p.position.y) * Math.min(1, dt * 12);
  }
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__rival = { state, take, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   The day
   ============================================================ */

/** Take a card off the board with your hands. Resolves once Mara has
    answered and the table has settled. */
async function take(cardId) {
  if (state.busy || state.done) return;
  const card = byId[cardId];
  if (!card || !state.board.includes(cardId)) return;

  if (card.hours > state.you.hours) {
    toast(fill(feedback.tooLong, { card: card.name, hours: card.hours, n: state.you.hours }), 'bad', 3000);
    return;
  }

  const run = state.run;
  state.busy = true;
  renderPanel();

  claim('you', cardId);
  state.yourPicks.push({ id: cardId, worth: card.worth, hours: card.hours });
  refreshStats();
  refreshBoard();

  await slideToPile(pieceById[cardId], 'you', run);
  if (run !== state.run) return;

  toast(fill(feedback.youTook, { card: card.name, worth: card.worth, hours: card.hours }), 'good', 2800);
  bridge.progress(progress(), { you: state.you.worth, mara: state.mara.worth });

  await maraRun(run);
  if (run !== state.run) return;

  state.busy = false;
  refreshBoard();

  if (stuck('you') && stuck('mara')) finish();
  else renderPanel();
}

/** Mara answers. She takes one card; if that leaves you unable to
    afford anything, she keeps going until she cannot either. */
async function maraRun(run) {
  while (affordable('mara').length) {
    await maraTake(run);
    if (run !== state.run) return;
    if (affordable('you').length) return;
    // Your day is full and hers is not: she carries on without you.
    if (affordable('mara').length && !state.youOutSaid) {
      state.youOutSaid = true;
      toast(feedback.youOut, '', 3200);
    }
  }
  // She is finished and you are not: say so once.
  if (affordable('you').length && !state.maraOutSaid) {
    state.maraOutSaid = true;
    toast(feedback.maraOut, '', 3200);
  }
}

async function maraTake(run) {
  const choice = maraChoose();
  if (!choice) return;
  const { card, rule } = choice;

  claim('mara', card.id);
  state.maraPicks.push({ id: card.id, worth: card.worth, hours: card.hours, rule });
  state.rules.push({ rule, cardId: card.id });
  state.lastLine = pickLine(rule).replace('{card}', card.name);
  refreshStats();
  refreshBoard();
  renderPanel();

  await slideToPile(pieceById[card.id], 'mara', run);
  if (run !== state.run) return;

  await flashMat(pieceById[card.id], run);
  if (run !== state.run) return;

  bridge.progress(progress(), { you: state.you.worth, mara: state.mara.worth });
  await wait(420);
}

/* ---------------- How she chooses ----------------
   One rule, read off the last two cards you took, then a near-tie
   shuffle so she is not a lookup table. */
function maraChoose() {
  const pool = affordable('mara');
  if (!pool.length) return null;

  const last2 = state.yourPicks.slice(-2);
  const bothBig = last2.length === 2 && last2.every((p) => p.worth >= config.highWorth);
  const bothQuick = last2.length === 2 && last2.every((p) => p.hours <= config.quickHours);

  // One card of yours is not a pattern, so her first answer is just maths.
  let rule = state.yourPicks.length < 2 ? 'opening'
    : bothBig ? 'deny'
    : bothQuick ? 'quickWins'
    : 'efficient';

  // She cannot deny you a big card she can no longer afford.
  if ((rule === 'deny' || rule === 'quickWins') && !pool.some((c) => c.worth >= config.highWorth)) {
    rule = 'squeeze';
  }

  // deny and quickWins both go for raw worth; everything else buys
  // the best worth per hour. quickWins breaks a tie toward the card
  // that leaves her more of the day.
  const score = (c) => {
    if (rule === 'deny') return c.worth;
    if (rule === 'quickWins') return c.worth - c.hours * 0.01;
    return c.worth / c.hours;
  };

  const best = Math.max(...pool.map(score));
  const near = pool.filter((c) => score(c) >= best * config.slack);
  const card = near[Math.floor(Math.random() * near.length)];
  return { card, rule };
}

/** One line, chosen by which rule fired, never the same one twice running. */
function pickLine(rule) {
  const list = maraLines[rule];
  const options = list.length > 1 ? list.filter((l) => l !== state.lastLine) : list;
  return options[Math.floor(Math.random() * options.length)];
}

/* ---------------- Board bookkeeping ---------------- */
function claim(sideKey, cardId) {
  const card = byId[cardId];
  const side = state[sideKey];
  state.board.splice(state.board.indexOf(cardId), 1);
  side.pile.push(cardId);
  side.hours -= card.hours;
  side.worth += card.worth;
  pieceById[cardId].userData.under.material.color.setHex(sideKey === 'you' ? BLUE : ORANGE);
  stage.setPickEnabled(pieceById[cardId], false);
}

/* Declarations, not arrow consts: restart() runs while the module is
   still being evaluated, and it reaches both of these. */
function affordable(sideKey) {
  return state.board.map((id) => byId[id]).filter((c) => c.hours <= state[sideKey].hours);
}
function stuck(sideKey) {
  return affordable(sideKey).length === 0;
}

function progress() {
  const spent = (config.hours - state.you.hours) + (config.hours - state.mara.hours);
  return spent / (config.hours * 2);
}

function refreshStats() {
  stats.set('youHours', state.you.hours);
  stats.set('youWorth', state.you.worth);
  stats.set('maraHours', state.mara.hours);
  stats.set('maraWorth', state.mara.worth);
}

/** Grey out and un-click anything that no longer fits in your day. */
function refreshBoard() {
  for (const p of pieces) {
    const d = p.userData;
    if (!state.board.includes(d.card.id)) { d.dim.material.opacity = 0; continue; }
    const fits = !state.done && d.card.hours <= state.you.hours;
    d.dim.material.opacity = fits ? 0 : 0.42;
    stage.setPickEnabled(p, fits && !state.busy);
    if (!fits) d.hover = false;
  }
}

async function restart() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, {
    board: cards.map((c) => c.id),
    you:  { hours: config.hours, worth: 0, pile: [] },
    mara: { hours: config.hours, worth: 0, pile: [] },
    yourPicks: [],
    maraPicks: [],
    rules: [],
    lastLine: null,
    maraOutSaid: false,
    youOutSaid: false,
    busy: false,
    done: false,
  });

  for (const p of pieces) {
    const d = p.userData;
    d.moving = false;
    d.hover = false;
    d.baseY = DESK_Y;
    p.position.copy(d.home);
    p.rotation.set(0, 0, 0);
    p.scale.set(1, 1, 1);
    d.under.material.color.setHex(NEUTRAL);
    d.dim.material.opacity = 0;
    stage.setPickEnabled(p, true);
  }

  refreshStats();
  refreshBoard();
  bottom.style.visibility = '';
  renderPanel();
  bridge.restart();
}

/* ---------------- Panel ---------------- */
function renderPanel() {
  if (state.done) return;

  const hoursLine = state.you.hours <= 0 ? meta.outOfHours
    : state.you.hours === 1 ? meta.lastHour
    : meta.hoursLeft.replace('{n}', String(state.you.hours));

  const prompt = !state.yourPicks.length ? meta.instructions
    : stuck('you') ? meta.outOfHours
    : meta.prompt;

  bottom.replaceChildren(el('div.turn', {}, [
    el('div.eyebrow', {}, hoursLine),
    el('p.line', {}, prompt),
    state.lastLine
      ? el('div.said', {}, [
        el('div.eyebrow', {}, meta.maraEyebrow),
        el('p', {}, state.lastLine),
      ])
      : el('div.said.quiet', {}, el('p', {}, meta.maraWaiting)),
  ]));
}

/* ---------------- Ending ---------------- */
function finish() {
  state.done = true;
  refreshBoard();

  const diff = state.you.worth - state.mara.worth;
  const r = results.find((x) => diff >= x.min) ?? results[results.length - 1];
  const passed = diff >= 0;
  const total = state.you.worth + state.mara.worth;

  bridge.complete({
    passed,
    score: total ? state.you.worth / total : 0,
    detail: {
      yourWorth: state.you.worth,
      maraWorth: state.mara.worth,
      yourPile: [...state.you.pile],
      maraPile: [...state.mara.pile],
      rules: state.rules.map((x) => x.rule),
    },
  });

  const points = [
    fill(endingPoints.totals, {
      you: state.you.worth,
      mara: state.mara.worth,
      youCards: state.you.pile.length,
      maraCards: state.mara.pile.length,
    }),
  ];
  if (state.you.pile.length > state.mara.pile.length && diff < 0) points.push(endingPoints.volume);
  else if (state.you.pile.length < state.mara.pile.length && diff > 0) points.push(endingPoints.fewer);

  points.push(meta.recapHeading, ...recap());
  points.push(endingPoints.plays, endingPoints.nextTime);

  // The modal carries the ending; the panel underneath would just be
  // a stale turn prompt once it is closed.
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

/** Her rules in the order they fired, with consecutive repeats of the
    same rule collapsed into the one entry that names its cards. */
function recap() {
  const runs = [];
  for (const entry of state.rules) {
    const last = runs[runs.length - 1];
    if (last && last.rule === entry.rule) last.ids.push(entry.cardId);
    else runs.push({ rule: entry.rule, ids: [entry.cardId] });
  }
  return runs.map((r) => recapLine
    .replace('{label}', ruleRecap[r.rule])
    .replace('{cards}', nameList(r.ids)));
}

/* ---------------- Animation ---------------- */
/** Arc a card off the board and onto one side's pile. `run` makes a
    restart mid-flight abandon the animation instead of dragging the
    card back to a slot that no longer exists. */
async function slideToPile(g, sideKey, run) {
  const d = g.userData;
  const index = state[sideKey].pile.indexOf(d.card.id);
  const slot = pileSlot(sideKey, index);

  d.moving = true;
  d.hover = false;
  const from = g.position.clone();
  const fromRot = g.rotation.y;
  const fromScale = g.scale.x;

  await tween({
    ms: 640, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      if (run !== state.run) return;
      g.position.lerpVectors(from, slot.pos, e);
      g.position.y += Math.sin(e * Math.PI) * 1.5;
      g.rotation.y = fromRot + (slot.rot - fromRot) * e;
      g.scale.setScalar(fromScale + (PILE_SCALE - fromScale) * e);
    },
  });
  if (run !== state.run) return;

  g.position.copy(slot.pos);
  g.rotation.y = slot.rot;
  g.scale.setScalar(PILE_SCALE);
  d.baseY = slot.pos.y;
  d.moving = false;
}

function pileSlot(sideKey, index) {
  const i = Math.max(0, Math.min(PILE_SLOTS - 1, index));
  return {
    pos: new THREE.Vector3(
      PILE_X0 + i * PILE_GAP,
      DESK_Y + i * 0.015,
      sideKey === 'you' ? PILE_Z : -PILE_Z,
    ),
    rot: (i % 2 ? 0.04 : -0.035),
  };
}

/** A short mint pulse on the mat of the card she just took. */
async function flashMat(g, run) {
  const m = g.userData.under.material;
  const pulse = new THREE.Color(MINT);
  await tween({
    ms: 520, easing: ease.outCubic,
    onUpdate: (_, e) => {
      if (run !== state.run) return;
      const k = Math.sin(Math.min(1, e) * Math.PI);
      m.color.setHex(ORANGE).lerp(pulse, k * 0.85);
    },
    onDone: () => { if (run === state.run) m.color.setHex(ORANGE); },
  });
}

/* ---------------- Text helpers ---------------- */
function fill(template, values) {
  return Object.entries(values).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

function nameList(ids) {
  const names = ids.map((id) => byId[id].name);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The printed face of a card: what it is, what it is worth, what it costs. */
function cardTexture(card) {
  return canvasTexture(512, 320, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.roundRect(4, 4, w - 8, h - 8, 26);
    c.fill();

    c.fillStyle = '#10131A';
    c.font = '800 38px Urbanist, Helvetica, Arial, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    const lines = wrap(c, card.name, w - 56, 3);
    lines.forEach((line, i) => c.fillText(line, 28, 62 + i * 42));

    c.fillStyle = 'rgba(16,19,26,0.14)';
    c.fillRect(28, 206, w - 56, 3);

    const blocks = [
      { caption: cardCaptions.worth, value: card.worth, align: 'left', x: 28, colour: BLUE_CSS },
      { caption: cardCaptions.hours, value: card.hours, align: 'right', x: w - 28, colour: INK_CSS },
    ];
    for (const b of blocks) {
      c.textAlign = b.align;
      c.fillStyle = INK_CSS;
      c.font = '700 22px Urbanist, Helvetica, Arial, sans-serif';
      c.fillText(b.caption.toUpperCase(), b.x, 244);
      c.fillStyle = b.colour;
      c.font = '800 62px Urbanist, Helvetica, Arial, sans-serif';
      c.fillText(String(b.value), b.x, 300);
    }
  });
}

/** Greedy word wrap. The last allowed line is truncated with an ellipsis
    rather than spilling off the card. */
function wrap(c, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    // On the last allowed line, keep appending and let the trim below cut it.
    if (!line || c.measureText(next).width <= maxWidth || lines.length === maxLines - 1) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
  }
  lines.push(line);

  let tail = lines[lines.length - 1];
  while (c.measureText(tail).width > maxWidth && tail.length > 1) {
    tail = `${tail.replace(/…$/, '').slice(0, -1)}…`;
  }
  lines[lines.length - 1] = tail;
  return lines;
}

function plateTexture(text, colour) {
  return canvasTexture(512, 150, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.roundRect(6, 10, w - 12, h - 20, 34);
    c.fill();
    c.strokeStyle = colour;
    c.lineWidth = 10;
    c.beginPath();
    c.roundRect(12, 16, w - 24, h - 32, 30);
    c.stroke();
    c.fillStyle = colour;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '800 64px Urbanist, Helvetica, Arial, sans-serif';
    c.fillText(text, w / 2, h / 2 + 3);
  });
}
