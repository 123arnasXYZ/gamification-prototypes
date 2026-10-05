/* ============================================================
   14 — Give learners something to juggle
   Four bar meters stand in the team area: Trust, Pressure, Morale,
   Capacity. Four decisions, three options each, and every option
   moves two or three of them in different directions. Values carry
   across the whole run, so the last decision is made on whatever the
   first three left behind. Cross a limit and something breaks on the
   spot. The ending describes the state the team was left in.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, measures, decisions, events, endings, ending } from './content.js';

const bridge = createBridge('juggle');

/* Health is the single number the colour rule runs on: 1 is a good
   place to be. Pressure is inverted, so a high reading there scores
   the same as a low reading anywhere else. */
const health = (m, v) => (m.inverted ? 1 - v / 100 : v / 100);

const BAR = { mint: 0x5fe0b0, amber: 0xe0a32a, red: 0xe0234e };
const colourFor = (h) => (h >= 0.55 ? BAR.mint : h >= 0.32 ? BAR.amber : BAR.red);

const BASE_Y = 0.3;
const SPAN = 3.9;
const heightFor = (v) => BASE_Y + (v / 100) * SPAN;

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  // Aimed low so the bars and their labels ride high, clear of the
  // decision bar across the bottom.
  cameraPos: [0, 4.9, 13.6],
  lookAt: [0, 2.2, 0.4],
  background: 0xe4e9f0,
  fog: [22, 52],
  fit: { width: 14.6, height: 9.2 },
  orbitLimits: {
    minPolarAngle: 0.8, maxPolarAngle: 1.42,
    minAzimuthAngle: -0.5, maxAzimuthAngle: 0.5,
    minDistance: 11, maxDistance: 18,
  },
});

addLightRig(stage.scene, {
  sky: 0xf2f6fc, ground: 0xb9c2ce, hemi: 1.0,
  keyColor: 0xfff5e6, keyIntensity: 1.8, keyPos: [-5, 13, 9],
  shadowSize: 13, fillColor: 0x6d8ec0, fillIntensity: 0.45,
});

/* ---------------- The team area ---------------- */
{
  const floor = box(44, 0.2, 26, 0xd2d8e1, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(44, 10, 0.3, 0xeef1f6, { roughness: 0.98 });
  wall.position.set(0, 5, -4.2);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 6.4), mat(0xc3cbd7, { roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.012, 0.9);
  stage.scene.add(floor, wall, rug);
}

const BAR_X = [-3.45, -1.15, 1.15, 3.45];

/* ---------------- Bars ---------------- */
const bars = measures.map((m, i) => {
  const g = new THREE.Group();
  g.position.set(BAR_X[i], 0, 0);

  const plinth = new THREE.Mesh(roundedBox(1.3, 0.16, 1.3, 0.05), mat(0xaeb7c4, { roughness: 0.85 }));
  plinth.position.y = 0.08;
  plinth.receiveShadow = true;

  // Full-height ghost column: the headroom you have left, visible at a glance
  const trackGeo = roundedBox(0.84, heightFor(100), 0.84, 0.05);
  trackGeo.translate(0, heightFor(100) / 2, 0);
  const track = new THREE.Mesh(trackGeo, mat(0xffffff, { roughness: 1, transparent: true, opacity: 0.4 }));
  track.position.y = 0.16;

  // Pivot at the base so the bar grows upward on a plain scale.y
  const barGeo = roundedBox(0.96, 1, 0.96, 0.05);
  barGeo.translate(0, 0.5, 0);
  const fill = new THREE.Mesh(barGeo, mat(colourFor(health(m, m.start)), { roughness: 0.6 }));
  fill.position.y = 0.16;
  fill.scale.y = heightFor(m.start);
  fill.castShadow = true;

  // The line a measure must not cross — drawn, so it is not a surprise
  const limit = box(1.14, 0.05, 1.14, 0xe0a32a, { roughness: 0.6, cast: false, receive: false });
  limit.position.y = 0.16 + heightFor(m.limit);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.15, 0.98),
    new THREE.MeshBasicMaterial({ map: labelTexture(m, m.start), transparent: true, depthWrite: false }),
  );
  label.position.y = 4.95;

  g.add(plinth, track, fill, limit, label);
  stage.scene.add(g);
  return { def: m, group: g, fill, label };
});
const barById = Object.fromEntries(bars.map((b) => [b.def.id, b]));

// Labels face the camera, so the numbers stay readable as you orbit
stage.onFrame(() => { for (const b of bars) b.label.quaternion.copy(stage.camera.quaternion); });

/* A milestone post, so a slipped deadline is something you can see. */
const post = new THREE.Group();
{
  const pole = box(0.09, 2.1, 0.09, 0xf3f5f8, { roughness: 0.8 });
  pole.position.y = 1.05;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.62), new THREE.MeshBasicMaterial({ map: signTexture(), transparent: true }));
  sign.position.set(0.6, 1.8, 0.03);
  post.add(pole, sign);
  post.position.set(6.1, 0, 1.1);
  stage.scene.add(post);
}

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const briefPanel = document.getElementById('brief');
const hint = document.getElementById('hint');
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
// values: the four measures, 0–100, carried across every decision.
// fired: event ids already triggered, so each one can only happen once.
const state = {
  values: Object.fromEntries(measures.map((m) => [m.id, m.start])),
  step: 0,
  fired: [],
  lastMove: null,
  busy: false,
  over: false,
};

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__juggle = { state, choose, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   The week
   ============================================================ */
async function choose(optionIndex) {
  if (state.busy || state.over) return;
  const d = decisions[state.step];
  const option = d?.options[optionIndex];
  if (!option) return;

  state.busy = true;
  state.lastMove = option.effects;
  renderBrief();

  await applyEffects(option.effects);
  toast(option.note, '', 3200);
  await wait(320);

  // Breaking happens now, not at the end — including anything the
  // knock-on from one break pushes over a second limit.
  await fireThresholds();

  state.step += 1;
  state.busy = false;
  bridge.progress(state.step / decisions.length, { values: { ...state.values }, fired: [...state.fired] });

  if (state.step >= decisions.length) finish();
  else renderBrief();
}

/** Move the measures and grow the bars at the same time. */
async function applyEffects(effects) {
  const moves = Object.entries(effects)
    .filter(([id]) => barById[id])
    .map(([id, delta]) => {
      const from = state.values[id];
      return { id, from, to: clamp(from + delta) };
    });
  if (!moves.length) return;

  await tween({
    ms: 760, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      for (const mv of moves) {
        const v = mv.from + (mv.to - mv.from) * e;
        state.values[mv.id] = v;
        paint(barById[mv.id], v);
      }
    },
  });
  for (const mv of moves) {
    state.values[mv.id] = mv.to;
    paint(barById[mv.id], mv.to);
  }
  refreshLabels();
}

/** Fire every event whose measure has crossed its limit, once each. */
async function fireThresholds() {
  for (let pass = 0; pass < events.length; pass++) {
    const ev = events.find((e) => !state.fired.includes(e.id) && crossed(e.measure));
    if (!ev) return;
    state.fired.push(ev.id);

    const bar = barById[ev.measure];
    toast(`${ev.title} — ${ev.line}`, 'bad', 4200);
    await flash(bar);
    if (ev.id === 'slip') tiltPost();
    if (ev.knockOn) await applyEffects(ev.knockOn);
    await wait(260);
  }
}

function crossed(id) {
  const m = measures.find((x) => x.id === id);
  return m.inverted ? state.values[id] >= m.limit : state.values[id] <= m.limit;
}

function finish() {
  state.over = true;
  const vals = rounded();
  const outcome = endings.find((e) => e.test(vals, state.fired)) ?? endings[endings.length - 1];
  const fired = state.fired.map((id) => events.find((e) => e.id === id));

  /* The learner is never shown a score — the ending is a description.
     The host page still wants one number, so it gets average health:
     how balanced the four measures were left, not how high they are. */
  const score = measures.reduce((s, m) => s + health(m, vals[m.id]), 0) / measures.length;
  bridge.complete({
    passed: true,
    score: Math.max(0, Math.min(1, score)),
    detail: { ending: outcome.id, values: vals, fired: [...state.fired] },
  });

  hint.textContent = meta.thresholdHint;
  briefPanel.replaceChildren(el('div.outcome', {}, [
    el('div.eyebrow', {}, ending.eyebrow),
    el('h2', {}, outcome.title),
    el('p.line', {}, outcome.line),
    el('p.sub', {}, ending.eventsLabel),
    ...(fired.length
      ? fired.map((e) => el('div.beat', { html: `<b>${e.title}</b> — ${e.line}` }))
      : [el('div.beat.none', {}, ending.noEvents)]),
    el('p.point', {}, ending.point),
    el('button.btn.primary', { type: 'button', onClick: restart }, ending.again),
  ]));
}

function restart() {
  state.values = Object.fromEntries(measures.map((m) => [m.id, m.start]));
  state.step = 0;
  state.fired = [];
  state.lastMove = null;
  state.busy = false;
  state.over = false;

  for (const b of bars) paint(b, b.def.start);
  refreshLabels();
  post.rotation.z = 0;
  renderBrief();
  bridge.restart();
}

/* ---------------- Panels ---------------- */
function renderBrief() {
  if (state.over) return;
  const d = decisions[state.step];
  hint.textContent = state.step === 0 ? meta.intro : meta.thresholdHint;

  briefPanel.replaceChildren(el('div.brief', {}, [
    el('div.head', {}, [
      el('div.eyebrow', {}, meta.stepLabel.replace('{n}', state.step + 1).replace('{total}', decisions.length)),
      el('p.q', {}, d.brief),
    ]),
    el('div.options', {}, d.options.map((o, i) => el('button.opt', {
      type: 'button',
      disabled: state.busy || null,
      onClick: () => choose(i),
    }, o.text))),
    // The last trade-off stays on screen into the next decision, so the
    // cost of the previous choice is still in front of you while you make
    // the next one.
    el('div.moved', { html: movedLine() }),
  ]));
}

/** "Trust up, Capacity down" — names the trade-off that just happened. */
function movedLine() {
  const effects = state.lastMove;
  if (!effects) return '';
  return Object.entries(effects).map(([id, delta]) => {
    const m = measures.find((x) => x.id === id);
    return `<b>${m.name}</b> ${delta > 0 ? meta.movedUp : meta.movedDown}`;
  }).join(', ');
}

/* ---------------- Scene reactions ---------------- */
function paint(bar, value) {
  bar.fill.scale.y = heightFor(value);
  bar.fill.material.color.setHex(colourFor(health(bar.def, value)));
}

function refreshLabels() {
  for (const b of bars) {
    b.label.material.map.dispose();
    b.label.material.map = labelTexture(b.def, state.values[b.def.id]);
    b.label.material.needsUpdate = true;
  }
}

/** Three red pulses on the bar that just broke something. */
async function flash(bar) {
  const m = bar.fill.material;
  for (let i = 0; i < 3; i++) {
    await tween({
      ms: 180, easing: ease.inOutCubic,
      onUpdate: (_, e) => { m.emissive.setHex(BAR.red); m.emissiveIntensity = e * 1.6; },
    });
    await tween({
      ms: 180, easing: ease.inOutCubic,
      onUpdate: (_, e) => { m.emissiveIntensity = 1.6 * (1 - e); },
    });
  }
  m.emissiveIntensity = 0;
}

function tiltPost() {
  tween({ ms: 700, easing: ease.outCubic, onUpdate: (_, e) => { post.rotation.z = -0.34 * e; } });
}

/* ---------------- Helpers ---------------- */
const clamp = (v) => Math.max(0, Math.min(100, v));
const rounded = () => Object.fromEntries(measures.map((m) => [m.id, Math.round(state.values[m.id])]));

function labelTexture(m, value) {
  const h = health(m, value);
  const colour = h >= 0.55 ? '#12A177' : h >= 0.32 ? '#A8761A' : '#E0234E';
  return canvasTexture(430, 196, (c, w, hh) => {
    c.clearRect(0, 0, w, hh);
    c.fillStyle = '#ffffff';
    const r = 26;
    c.beginPath();
    c.moveTo(r, 6); c.arcTo(w - 6, 6, w - 6, hh - 6, r); c.arcTo(w - 6, hh - 6, 6, hh - 6, r);
    c.arcTo(6, hh - 6, 6, 6, r); c.arcTo(6, 6, w - 6, 6, r); c.closePath();
    c.fill();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#10131A';
    c.font = '800 46px Helvetica, Arial, sans-serif';
    c.fillText(m.name, w / 2, 42);
    c.fillStyle = colour;
    c.font = '800 62px Helvetica, Arial, sans-serif';
    c.fillText(String(Math.round(value)), w / 2, 104);
    c.fillStyle = '#4B5162';
    c.font = '700 30px Helvetica, Arial, sans-serif';
    c.fillText(m.hint, w / 2, 160);
  });
}

function signTexture() {
  return canvasTexture(512, 212, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#2757E2';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '800 66px Helvetica, Arial, sans-serif';
    c.fillText('FRIDAY', w / 2, h / 2);
  });
}
