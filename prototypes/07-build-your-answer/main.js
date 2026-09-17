/* ============================================================
   07 — Let learners build their answer
   A customer at the returns desk. Instead of picking a finished
   reply, the learner builds one from a Tone and an Action, sees it
   written out, and sends it. Each part is scored separately, so the
   feedback can say which half of the thinking worked.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box } from '../../shared/engine.js';
import { el, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { createPerson } from '../../shared/person.js';
import { meta, parts, verdict, reply } from './content.js';

const bridge = createBridge('build-your-answer');
const COMBINATIONS = parts.reduce((n, p) => n * p.options.length, 1);

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  cameraPos: [0.4, 2.5, 5.2],
  lookAt: [0.2, 1.75, -1.2],
  background: 0x151b23,
  fog: [14, 30],
  fit: { width: 4.6, height: 3.4 },
  orbitLimits: {
    minPolarAngle: 1.3, maxPolarAngle: 1.62,
    minAzimuthAngle: -0.35, maxAzimuthAngle: 0.35,
    minDistance: 5, maxDistance: 8,
  },
});

addLightRig(stage.scene, {
  sky: 0xdfe8f3, ground: 0x2a3038, hemi: 0.9,
  keyColor: 0xfff1dc, keyIntensity: 1.7, keyPos: [3, 8, 7],
  shadowSize: 8, fillColor: 0x4a6f9c, fillIntensity: 0.5,
});

// Shop behind the customer
{
  const floor = box(20, 0.2, 16, 0x3f4650, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(20, 6, 0.3, 0xe9e4da, { roughness: 0.95 });
  wall.position.set(0, 3, -4);
  const stripe = box(20, 0.35, 0.05, 0x2757e2, { roughness: 0.7 });
  stripe.position.set(0, 3.9, -3.83);
  stage.scene.add(floor, wall, stripe);

  // Shelves with stock
  for (const [x, y] of [[-2.8, 1.2], [-2.8, 2.3], [2.9, 1.2], [2.9, 2.3]]) {
    const shelf = box(2.2, 0.08, 0.6, 0x8a6a45, { roughness: 0.9 });
    shelf.position.set(x, y, -3.6);
    stage.scene.add(shelf);
    for (let i = 0; i < 3; i++) {
      const stock = box(0.5, 0.55, 0.4, [0xd1663f, 0x3f7fa8, 0xe3b52e][(i + Math.round(x)) % 3], { roughness: 0.8 });
      stock.position.set(x - 0.65 + i * 0.65, y + 0.32, -3.6);
      stage.scene.add(stock);
    }
  }
}

// The counter between you and the customer
{
  const counter = box(4.6, 1.1, 1.0, 0x2b313c, { roughness: 0.6 });
  counter.position.set(0, 0.55, 0.2);
  const top = box(4.8, 0.08, 1.15, 0xd9dde3, { roughness: 0.4 });
  top.position.set(0, 1.14, 0.2);
  stage.scene.add(counter, top);

  // The kettle with the cracked lid
  const kettle = new THREE.Group();
  const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.48, 24), mat(0xf1f1ee, { roughness: 0.3 }));
  bodyM.position.y = 0.24;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.07, 24), mat(0xf1f1ee, { roughness: 0.3 }));
  lid.position.y = 0.52;
  lid.rotation.z = 0.12;
  const crack = box(0.02, 0.03, 0.34, 0x1a1d24);
  crack.position.set(0.03, 0.56, 0);
  crack.rotation.y = 0.5;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 16, Math.PI), mat(0x2b313c));
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(-0.3, 0.28, 0);
  kettle.add(bodyM, lid, crack, handle);
  kettle.position.set(1.3, 1.18, 0.15);
  kettle.rotation.y = -0.6;
  kettle.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  stage.scene.add(kettle);
}

const customer = createPerson({ shirt: 0x7a4fb5, hair: 0x1f1a17, skin: 0xc68f6a });
customer.root.position.set(0.2, 0, -1.0);
stage.scene.add(customer.root);
stage.onFrame((dt, t) => customer.idle(t));

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('customer').textContent = meta.customer;
const builder = document.getElementById('builder');
const stats = statBar(document.getElementById('stats'), [
  { id: 'tried', label: 'Combinations tried', value: 0, max: COMBINATIONS },
]);

/* ---------------- State ---------------- */
const state = { choice: {}, sent: false, tried: new Set(), best: false };

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__build = { state, choose, send, again, customer };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
customer.setMood(-0.35, 1);   // arrives unhappy
renderCompose();

/* ============================================================
   Building
   ============================================================ */
function option(partId, optionId) {
  return parts.find((p) => p.id === partId).options.find((o) => o.id === optionId);
}

function choose(partId, optionId) {
  if (state.sent) return;
  state.choice[partId] = optionId;
  renderCompose();
}

function renderCompose() {
  const rows = parts.map((p) => el('div.row', {}, [
    el('div.name', {}, p.label),
    el('div.chips', {}, p.options.map((o) => el('button.chip', {
      type: 'button',
      'aria-pressed': String(state.choice[p.id] === o.id),
      onclick: () => choose(p.id, o.id),
    }, o.label))),
  ]));

  const tone = state.choice.tone && option('tone', state.choice.tone);
  const action = state.choice.action && option('action', state.choice.action);
  const preview = el('div.preview', {},
    tone || action
      ? [
        tone ? el('span.t', {}, tone.line + ' ') : el('span.empty', {}, '[pick a tone] '),
        action ? el('span', {}, action.line) : el('span.empty', {}, '[pick an action]'),
      ]
      : [el('span.empty', {}, 'Pick a tone and an action — your reply will appear here.')]);

  const ready = Boolean(tone && action);
  builder.replaceChildren(
    ...rows,
    preview,
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px' }, [
      el('span', { style: 'font-size:12.5px;color:var(--ink-dim)' },
        `${parts[0].options.length} tones × ${parts[1].options.length} actions = ${COMBINATIONS} possible replies`),
      el('button.btn.primary', { type: 'button', disabled: ready ? null : true, onclick: send }, 'Send reply'),
    ]),
  );
}

/* ============================================================
   Sending
   ============================================================ */
function send() {
  const tone = option('tone', state.choice.tone);
  const action = option('action', state.choice.action);
  if (!tone || !action || state.sent) return;
  state.sent = true;

  state.tried.add(`${tone.id}+${action.id}`);
  stats.set('tried', state.tried.size);

  const mood = (tone.score + action.score - 2) / 2;
  customer.setMood(mood, 900);

  const both = tone.score === 2 && action.score === 2;
  if (both) state.best = true;

  const mark = (s) => (s === 2 ? '✓ Strong' : s === 1 ? '~ Partly' : '✕ Misses');
  const partCard = (label, opt) => el('div.part', {}, [
    el('div.top', {}, [el('span.k', {}, `${label}: ${opt.label}`), el(`span.mark.s${opt.score}`, {}, mark(opt.score))]),
    el('p', {}, opt.feedback),
  ]);

  builder.replaceChildren(
    el('div.verdict-line', {}, verdict(tone.score, action.score)),
    el('p.said', {}, reply(tone.score, action.score)),
    el('div.parts', {}, [partCard('Tone', tone), partCard('Action', action)]),
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px' }, [
      el('span', { style: 'font-size:12.5px;color:var(--ink-dim)' },
        both ? 'Try a weaker combination to see how the customer reacts.' : 'Change one part and see what shifts.'),
      el('button.btn.primary', { type: 'button', onclick: again }, 'Try another combination'),
    ]),
  );

  bridge.complete({
    passed: both,
    score: (tone.score + action.score) / 4,
    tone: tone.id, action: action.id,
  });
}

function again() {
  state.sent = false;
  customer.setMood(-0.35, 600);
  renderCompose();
}
