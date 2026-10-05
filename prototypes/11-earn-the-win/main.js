/* ============================================================
   11 — Make learners earn the win
   Two decisions at a desk. A wrong choice plays out on the screen,
   says something useful, then hands back the same decision with a
   little more support. Nothing is removed and nothing is revealed,
   so the right answer has to be chosen rather than arrived at.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, steps, doneScreen, result } from './content.js';

const bridge = createBridge('earn-the-win');

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 38,
  cameraPos: [0.1, 2.25, 4.3],
  lookAt: [0, 1.38, 0],
  background: 0x151b23,
  fog: [14, 34],
  fit: { width: 4.6, height: 3.1 },
  orbitLimits: {
    minPolarAngle: 1.0, maxPolarAngle: 1.5,
    minAzimuthAngle: -0.35, maxAzimuthAngle: 0.35,
    minDistance: 3.2, maxDistance: 6.5,
  },
});

addLightRig(stage.scene, {
  sky: 0xe6edf5, ground: 0x2a3038, hemi: 0.95,
  keyColor: 0xfff2e0, keyIntensity: 1.5, keyPos: [3, 7, 6],
  shadowSize: 7, fillColor: 0x4a6f9c, fillIntensity: 0.5,
});

/* ---------------- The desk ---------------- */
{
  const floor = box(24, 0.2, 16, 0xb9bfc8, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(24, 7, 0.3, 0xe7ebf1, { roughness: 0.95 });
  wall.position.set(0, 3.5, -1.9);
  stage.scene.add(floor, wall);

  const top = new THREE.Mesh(roundedBox(3.6, 0.09, 1.5, 0.03), mat(0xe3d7c3, { roughness: 0.7 }));
  top.position.set(0, 1.0, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  stage.scene.add(top);
  for (const x of [-1.6, 1.6]) {
    const leg = box(0.1, 1.0, 1.3, 0x6f7886, { roughness: 0.6, metalness: 0.2 });
    leg.position.set(x, 0.5, 0);
    stage.scene.add(leg);
  }

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.19, 16), mat(0x2757e2, { roughness: 0.6 }));
  mug.position.set(1.05, 1.14, 0.3);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), mat(0x3a3f47, { roughness: 1 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-0.95, 1.046, 0.33);
  const notebook = new THREE.Mesh(roundedBox(0.44, 0.04, 0.62, 0.02), mat(0xf4f4f1, { roughness: 0.9 }));
  notebook.position.set(1.25, 1.07, -0.2);
  notebook.rotation.y = 0.2;
  stage.scene.add(mug, pad, notebook);
}

/* The learner, faceless on purpose — the decision is the character. */
{
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 6, 16), mat(0x8fa3bf, { roughness: 0.7 }));
  body.position.y = 0.45;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), body.material);
  head.position.y = 0.95;
  head.castShadow = true;
  g.add(body, head);
  g.position.set(1.55, 0.6, 1.25);
  stage.scene.add(g);
}

/* ---------------- The laptop ---------------- */
const laptop = new THREE.Group();
laptop.position.set(-0.05, 1.045, 0.08);
stage.scene.add(laptop);

const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
{
  const base = new THREE.Mesh(roundedBox(1.22, 0.05, 0.82, 0.02), mat(0x4a5058, { roughness: 0.5, metalness: 0.3 }));
  base.position.set(0, 0.025, 0.1);
  base.castShadow = true;
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.44), mat(0x2f343b, { roughness: 0.9 }));
  keys.rotation.x = -Math.PI / 2;
  keys.position.set(0, 0.053, 0.16);
  laptop.add(base, keys);

  // Hinge group so the lid leans back like a real one
  const lid = new THREE.Group();
  lid.position.set(0, 0.04, -0.3);
  lid.rotation.x = -0.26;
  const shell = new THREE.Mesh(roundedBox(1.22, 0.8, 0.04, 0.02), mat(0x4a5058, { roughness: 0.5, metalness: 0.3 }));
  shell.position.y = 0.4;
  shell.castShadow = true;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.68), screenMat);
  glass.position.set(0, 0.4, 0.023);
  lid.add(shell, glass);
  laptop.add(lid);
}

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const stepsHost = document.getElementById('steps');
const bottom = document.getElementById('bottom');
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
// attempts counts every try on each step; support is how many hint
// cards that step has earned (0, 1 or 2).
const state = { step: 0, attempts: [0, 0], support: [0, 0], feedback: null, busy: false, done: false, run: 0 };

stage.onFrame((dt, t) => {
  laptop.rotation.y = Math.sin(t * 0.4) * 0.006;   // barely there, just not frozen
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__win = { state, choose, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   The decision
   ============================================================ */
async function choose(stepIndex, optionIndex) {
  // Step 2 is genuinely shut until step 1 is right, console included.
  if (state.busy || state.done || stepIndex !== state.step) return;
  const step = steps[stepIndex];
  const option = step.options[optionIndex];
  if (!option) return;

  const run = state.run;
  state.busy = true;
  state.attempts[stepIndex] += 1;
  render();

  if (option.correct) {
    toast(option.consequence, 'good', 4600);
    await nod();
    if (run !== state.run) return;
    return advance(stepIndex);
  }

  toast(option.consequence, 'bad', 4600);
  await shake();
  if (run !== state.run) return;

  // Same decision back, with more help each time. The answer stays hidden.
  state.feedback = option.feedback;
  state.support[stepIndex] = state.attempts[stepIndex] >= 3 ? 2 : state.attempts[stepIndex] >= 2 ? 1 : 0;
  state.busy = false;
  render();
}

async function advance(stepIndex) {
  state.feedback = null;
  bridge.progress((stepIndex + 1) / steps.length, { attempts: [...state.attempts] });

  if (stepIndex + 1 < steps.length) {
    state.step = stepIndex + 1;
    state.busy = false;
    setScreen(steps[state.step].screen);
    render();
    return;
  }

  state.step = steps.length;
  state.done = true;
  state.busy = false;
  setScreen(doneScreen);
  render();
  await wait(600);
  finish();
}

function finish() {
  const total = state.attempts.reduce((a, b) => a + b, 0);
  bridge.complete({
    passed: true,
    score: Math.max(0.2, steps.length / total),
    detail: { attempts: [...state.attempts], support: [...state.support] },
  });

  showResult({
    passed: true,
    title: result.title,
    summary: result.summary,
    points: [
      ...steps.map((s, i) => result.perStep
        .replace('{name}', s.short)
        .replace('{n}', attemptsText(state.attempts[i]))),
      result.cycle,
      result.lesson,
    ],
    actions: [
      { label: 'Close', kind: 'ghost' },
      { label: 'Try again', kind: 'primary', onClick: restart },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, { step: 0, attempts: [0, 0], support: [0, 0], feedback: null, busy: false, done: false });
  setScreen(steps[0].screen);
  render();
  bridge.restart();
}

/* ---------------- Panels ---------------- */
function render() {
  stepsHost.replaceChildren(...steps.map((s, i) => {
    const done = i < state.step;
    const now = i === state.step && !state.done;
    const cls = done ? 'done' : now ? 'now' : 'locked';
    return el(`div.step.${cls}`, { title: done || now ? s.short : meta.lockedHint }, [
      el('span.n', {}, done ? '✓' : String(i + 1)),
      el('span', {}, s.short),
    ]);
  }));

  if (state.done) {
    bottom.replaceChildren(el('div.deck', {}, [
      el('div.eyebrow', {}, result.title),
      el('div.note', {}, result.summary),
      el('div.opts', {}, [el('button.btn.primary', { type: 'button', onClick: restart }, 'Try again')]),
    ]));
    return;
  }

  const step = steps[state.step];
  const support = step.support.slice(0, state.support[state.step]);

  bottom.replaceChildren(el('div.deck', {}, [
    el('div.eyebrow', {}, step.short),
    el('div.prompt', {}, step.prompt),
    el('div.note', {}, state.feedback ?? meta.instructions),
    ...support.map((s, i) => el('div.support' + (i === 1 ? '.firm' : ''), {}, [
      el('div', {}, [el('b', {}, s.title), el('span', {}, s.text)]),
    ])),
    // Wrong options stay live: they have to pick the right one, not the last one left.
    el('div.opts', {}, step.options.map((o, i) =>
      el('button.btn', { type: 'button', disabled: state.busy || null, onClick: () => choose(state.step, i) }, o.label))),
  ]));
}

/* ---------------- Screen + motion ---------------- */
function setScreen(spec) {
  screenMat.map?.dispose();
  screenMat.map = drawScreen(spec);
  screenMat.needsUpdate = true;
}

/** Everything drawn here is text handed over by content.js. */
function drawScreen(spec) {
  return canvasTexture(880, 544, (c, w, h) => {
    c.fillStyle = '#F7F8FB';
    c.fillRect(0, 0, w, h);
    c.fillStyle = spec.kind === 'done' ? '#12A177' : '#2757E2';
    c.fillRect(0, 0, w, 74);
    c.fillStyle = '#FFFFFF';
    c.font = '800 34px Urbanist, Helvetica, Arial, sans-serif';
    c.textBaseline = 'middle';
    c.fillText(spec.from, 34, 38, w - 68);

    if (spec.kind === 'usb') {
      // A plain USB connector, drawn rather than imported
      c.fillStyle = '#4A5058';
      c.fillRect(70, 120, 150, 62);
      c.fillRect(220, 136, 44, 30);
      c.fillStyle = '#F7F8FB';
      c.fillRect(96, 134, 40, 16);
      c.fillRect(96, 160, 40, 16);
      c.fillStyle = '#2757E2';
      c.beginPath();
      c.arc(170, 151, 11, 0, Math.PI * 2);
      c.fill();
    } else if (spec.kind === 'done') {
      c.strokeStyle = '#12A177';
      c.lineWidth = 16;
      c.beginPath();
      c.moveTo(86, 152);
      c.lineTo(122, 188);
      c.lineTo(196, 112);
      c.stroke();
    } else {
      c.fillStyle = '#E0234E';
      c.beginPath();
      c.roundRect(70, 118, 196, 46, 23);
      c.fill();
      c.fillStyle = '#FFFFFF';
      c.font = '800 26px Urbanist, Helvetica, Arial, sans-serif';
      c.fillText('EXTERNAL', 92, 142);
    }

    let y = 240;
    c.fillStyle = '#10131A';
    c.font = '800 40px Urbanist, Helvetica, Arial, sans-serif';
    c.fillText(spec.subject, 70, y, w - 140);
    y += 62;
    c.fillStyle = '#4B5162';
    c.font = '600 32px Urbanist, Helvetica, Arial, sans-serif';
    for (const line of spec.lines) {
      c.fillText(line, 70, y, w - 140);
      y += 46;
    }
  });
}

/** A wrong choice knocks the desk — the consequence is felt, not scored. */
function shake() {
  const x = laptop.position.x;
  return tween({
    ms: 420, easing: ease.outCubic,
    onUpdate: (_, e, p) => { laptop.position.x = x + Math.sin(p * Math.PI * 7) * 0.05 * (1 - e); },
    onDone: () => { laptop.position.x = x; },
  });
}

/** A small settle on the right call, so it lands as an event too. */
function nod() {
  const y = laptop.position.y;
  return tween({
    ms: 420, easing: ease.outBack,
    onUpdate: (_, e) => { laptop.position.y = y + Math.sin(e * Math.PI) * 0.045; },
    onDone: () => { laptop.position.y = y; },
  });
}

function attemptsText(n) {
  return n === 1 ? result.one : result.many.replace('{n}', String(n));
}
