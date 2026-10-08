/* ============================================================
   19 — Add bonus challenges
   A plain six-question knowledge check, untouched. Layered over it,
   five optional challenges tracked live on a board of plaques. Only
   two of them are about answering well — the others reward holding
   off on clues, reading the explanations, and recovering from a
   mistake. Same six questions, five different things to aim for.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, questions, passMark, achievements, result } from './content.js';

const bridge = createBridge('bonus-challenges');

const GREY = 0xb9bfc8;
const MINT = 0x5fe0b0;

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 40,
  // Aimed at the board: the plaques ride high, clear of the question panel.
  cameraPos: [0, 2.5, 7.1],
  lookAt: [0, 1.95, 0],
  background: 0xe4e9f0,
  fog: [16, 40],
  fit: { width: 8.8, height: 4.6 },
  orbitLimits: {
    minPolarAngle: 0.95, maxPolarAngle: 1.46,
    minAzimuthAngle: -0.42, maxAzimuthAngle: 0.42,
    minDistance: 5.6, maxDistance: 9.5,
  },
});

addLightRig(stage.scene, {
  sky: 0xf2f6fc, ground: 0xb9c2ce, hemi: 1.0,
  keyColor: 0xfff5e6, keyIntensity: 1.7, keyPos: [-3, 9, 7],
  shadowSize: 9, fillColor: 0x6d8ec0, fillIntensity: 0.45,
});

/* ---------------- The room ---------------- */
{
  const floor = box(30, 0.2, 20, 0xd2d8e1, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(30, 9, 0.3, 0xeef1f6, { roughness: 0.98 });
  wall.position.set(0, 4.5, -1.7);
  stage.scene.add(floor, wall);

  // A desk, so the board is hanging over something rather than floating
  const top = new THREE.Mesh(roundedBox(6.4, 0.1, 1.3, 0.03), mat(0xe3d7c3, { roughness: 0.7 }));
  top.position.set(0, 1.0, 0.1);
  top.castShadow = true;
  top.receiveShadow = true;
  stage.scene.add(top);
  for (const x of [-2.8, 2.8]) {
    const leg = box(0.1, 1.0, 1.1, 0x6f7886, { roughness: 0.6, metalness: 0.2 });
    leg.position.set(x, 0.5, 0.1);
    stage.scene.add(leg);
  }

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.19, 16), mat(0x2757e2, { roughness: 0.6 }));
  mug.position.set(2.1, 1.14, 0.35);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), mat(0x3a3f47, { roughness: 1 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-2.0, 1.051, 0.35);
  stage.scene.add(mug, pad);

  const board = new THREE.Mesh(roundedBox(7.6, 1.6, 0.14, 0.04), mat(0xf4f6fa, { roughness: 0.9 }));
  board.position.set(0, 2.0, -1.45);
  board.receiveShadow = true;
  stage.scene.add(board);
}

/* ---------------- The five plaques ---------------- */
/* Each badge is a physical thing on the board: grey while locked,
   mint and lifted once earned. Nothing else in the scene moves. */
const PLAQUE_W = 1.4;
const PLAQUE_H = 0.84;

const plaques = achievements.map((a, i) => {
  const group = new THREE.Group();
  const baseY = 2.0;
  group.position.set((i - (achievements.length - 1) / 2) * 1.5, baseY, -1.3);

  const body = new THREE.Mesh(roundedBox(PLAQUE_W, PLAQUE_H, 0.1, 0.03), mat(GREY, { roughness: 0.65 }));
  body.castShadow = true;

  const faceMat = new THREE.MeshBasicMaterial({ map: null, transparent: true });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(PLAQUE_W - 0.08, PLAQUE_H - 0.08), faceMat);
  face.position.z = 0.051;

  group.add(body, face);
  stage.scene.add(group);
  return { def: a, group, body, faceMat, baseY };
});

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const chipsHost = document.getElementById('chips');
const quizHost = document.getElementById('quiz');
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
/* wrongAt holds the question indexes that were answered wrongly, which
   is what "one slip then clean" needs to know. flags carry the three
   behaviours that have nothing to do with being right. */
const state = {
  q: 0,
  score: 0,
  streak: 0,
  answered: 0,
  wrongAt: [],
  selected: null,
  confirmed: false,
  lastCorrect: null,
  earned: [],
  revealed: [],
  showWhy: false,
  flags: [],
  busy: false,
  done: false,
  run: 0,
};

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__bonus = { state, answer, restart, select, confirm: confirmAnswer, hint: useHint, why: openWhy, next };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   The plain activity
   ============================================================ */
function select(optionIndex) {
  if (state.busy || state.done || state.confirmed) return;
  if (!questions[state.q].options[optionIndex]) return;
  // Changing your mind before confirming is itself one of the five.
  if (state.selected !== null && state.selected !== optionIndex) {
    state.flags[state.q].changedAnswer = true;
  }
  state.selected = optionIndex;
  render();
  return checkAchievements(false);
}

function useHint() {
  if (state.busy || state.done || state.confirmed) return;
  state.flags[state.q].hintUsed = true;
  render();
}

function openWhy() {
  if (state.busy || state.done || !state.confirmed) return;
  state.flags[state.q].whyOpened = true;
  state.showWhy = true;
  render();
  return checkAchievements(false);
}

async function confirmAnswer() {
  if (state.busy || state.done || state.confirmed || state.selected === null) return;
  const q = questions[state.q];
  const correct = state.selected === q.answer;

  state.confirmed = true;
  state.lastCorrect = correct;
  state.answered += 1;
  if (correct) {
    state.score += 1;
    state.streak += 1;
    toast(meta.correct, 'good', 2000);
  } else {
    state.streak = 0;
    state.wrongAt.push(state.q);
    toast(meta.wrong, 'bad', 2000);
  }
  render();

  bridge.progress(state.answered / questions.length, {
    score: state.score, streak: state.streak, earned: [...state.earned],
  });
  await checkAchievements(false);
}

/** Select-then-confirm in one call, the way the console wants it. */
async function answer(optionIndex) {
  // Awaited, because selecting can itself unlock something and the
  // confirm would be swallowed while that animation runs.
  await select(optionIndex);
  await confirmAnswer();
}

async function next() {
  if (state.busy || state.done || !state.confirmed) return;
  const run = state.run;

  if (state.q + 1 < questions.length) {
    state.q += 1;
    state.selected = null;
    state.confirmed = false;
    state.showWhy = false;
    render();
    return;
  }

  state.done = true;
  render();
  // The two "finish the whole thing" challenges can only settle now.
  await checkAchievements(true);
  await wait(400);
  if (run !== state.run) return;
  finish();
}

/* ============================================================
   The layer on top
   ============================================================ */
/* Run after anything that could move a challenge. `final` unlocks the
   ones that need the run to be over. */
async function checkAchievements(final) {
  state.busy = true;

  for (const a of achievements) {
    if (state.earned.includes(a.id)) continue;
    if (a.atEnd && !final) continue;
    if (!a.test(state)) continue;
    await earn(a);
  }

  // A hidden one shows itself only once it is within reach, so the
  // reveal reads as a nudge rather than a list item.
  for (const a of achievements) {
    if (!a.hidden || state.revealed.includes(a.id)) continue;
    if (a.progress(state) < a.need - a.revealWithin) continue;
    state.revealed.push(a.id);
    paintPlaque(plaqueFor(a.id));
    toast(a.nudge, '', 3400);
  }

  state.busy = false;
  render();
}

async function earn(a) {
  state.earned.push(a.id);
  if (!state.revealed.includes(a.id)) state.revealed.push(a.id);

  const p = plaqueFor(a.id);
  paintPlaque(p);
  renderChips();
  toast(a.earned, 'good', 3600);

  await tween({
    ms: 520, easing: ease.outBack,
    onUpdate: (v) => { p.group.position.y = p.baseY + 0.18 * v; },
  });
}

function finish() {
  const passed = state.score >= passMark;
  const missed = achievements.filter((a) => !state.earned.includes(a.id));

  bridge.complete({
    passed,
    score: state.score / questions.length,
    detail: {
      earned: [...state.earned],
      missed: missed.map((a) => a.id),
      flags: state.flags.map((f) => ({ ...f })),
    },
  });

  const earnedList = achievements.filter((a) => state.earned.includes(a.id));
  showResult({
    passed,
    title: result.title,
    summary: result.summary
      .replace('{score}', String(state.score))
      .replace('{total}', String(questions.length)),
    points: [
      ...(earnedList.length
        ? earnedList.map((a) => result.earnedPoint.replace('{name}', a.name))
        : [result.nothingEarned]),
      ...missed.map((a) => result.missedPoint
        .replace('{name}', a.name)
        .replace('{locked}', a.locked.toLowerCase())),
      result.point,
    ],
    actions: [
      { label: result.close, kind: 'ghost' },
      { label: result.again, kind: 'primary', onClick: restart },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, {
    q: 0, score: 0, streak: 0, answered: 0, wrongAt: [],
    selected: null, confirmed: false, lastCorrect: null,
    earned: [], revealed: [], showWhy: false,
    flags: questions.map(() => ({ hintUsed: false, whyOpened: false, changedAnswer: false })),
    busy: false, done: false,
  });

  for (const p of plaques) {
    p.group.position.y = p.baseY;
    paintPlaque(p);
  }
  render();
  bridge.restart();
}

/* ---------------- Panels ---------------- */
function render() {
  renderChips();
  renderQuiz();
}

function renderChips() {
  chipsHost.replaceChildren(...achievements.map((a, i) => {
    const earned = state.earned.includes(a.id);
    const dark = a.hidden && !state.revealed.includes(a.id);
    const cls = earned ? 'earned' : dark ? 'hidden-badge' : state.revealed.includes(a.id) ? 'revealed' : '';
    return el('div.chip' + (cls ? '.' + cls : ''), {}, [
      el('span.n', {}, earned ? '✓' : dark ? meta.hiddenMark : String(i + 1)),
      el('span', {}, dark ? meta.hiddenMark : a.name),
      el('span.sub', {}, earned ? meta.earnedMark : dark ? meta.hiddenLocked : a.locked),
    ]);
  }));
}

function renderQuiz() {
  if (state.done) {
    quizHost.replaceChildren(el('div.quiz', {}, [
      el('div.eyebrow', {}, result.title),
      el('div.note', {}, result.summary
        .replace('{score}', String(state.score))
        .replace('{total}', String(questions.length))),
      el('div.acts', {}, [
        el('button.btn.primary', { type: 'button', onClick: restart }, result.again),
      ]),
    ]));
    return;
  }

  const q = questions[state.q];
  const flags = state.flags[state.q];
  const answered = state.confirmed;

  const note = answered
    ? (state.lastCorrect ? meta.correct : meta.wrong)
    : state.selected !== null ? meta.readyToConfirm : meta.instructions;

  quizHost.replaceChildren(el('div.quiz', {}, [
    el('div.eyebrow', {}, meta.stepLabel
      .replace('{n}', String(state.q + 1))
      .replace('{total}', String(questions.length))),
    el('p.q', {}, q.prompt),

    el('div.opts', {}, q.options.map((text, i) => {
      let cls = '';
      if (answered) {
        if (i === q.answer) cls = '.right';
        else if (i === state.selected) cls = '.wrongpick';
      } else if (i === state.selected) cls = '.picked';
      return el('button.opt' + cls, {
        type: 'button',
        disabled: answered || state.busy || null,
        onClick: () => select(i),
      }, text);
    })),

    el('div.note', {}, note),
    ...(flags.hintUsed ? [el('div.aside', {}, q.hint)] : []),
    ...(state.showWhy ? [el('div.aside.why', {}, q.why)] : []),

    el('div.acts', {}, [
      // One clue button per question — never taking it is one of the five.
      !answered
        ? el('button.btn', {
            type: 'button',
            disabled: flags.hintUsed || state.busy || null,
            onClick: useHint,
          }, flags.hintUsed ? meta.hintUsed : meta.hintLabel)
        : el('button.btn', {
            type: 'button',
            disabled: state.showWhy || state.busy || null,
            onClick: openWhy,
          }, meta.whyLabel),
      el('div.grow'),
      answered
        ? el('button.btn.primary', {
            type: 'button',
            disabled: state.busy || null,
            onClick: next,
          }, state.q + 1 < questions.length ? meta.nextLabel : meta.finishLabel)
        : el('button.btn.primary', {
            type: 'button',
            disabled: state.selected === null || state.busy || null,
            onClick: confirmAnswer,
          }, meta.confirmLabel),
    ]),
  ]));
}

/* ---------------- Plaques ---------------- */
function plaqueFor(id) {
  return plaques.find((p) => p.def.id === id);
}

function paintPlaque(p) {
  const earned = state.earned.includes(p.def.id);
  const dark = p.def.hidden && !state.revealed.includes(p.def.id);
  p.body.material.color.setHex(earned ? MINT : GREY);
  p.faceMat.map?.dispose();
  p.faceMat.map = plaqueTexture(p.def, earned ? 'earned' : dark ? 'hidden' : 'locked');
  p.faceMat.needsUpdate = true;
}

/** All text here comes from content.js — the plaque just renders it. */
function plaqueTexture(a, mode) {
  return canvasTexture(448, 268, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    if (mode === 'hidden') {
      c.fillStyle = '#8D95A3';
      c.font = '800 120px Urbanist, Helvetica, Arial, sans-serif';
      c.fillText(meta.hiddenMark, w / 2, h / 2 - 14);
      c.fillStyle = '#6E7686';
      c.font = '700 24px Urbanist, Helvetica, Arial, sans-serif';
      c.fillText(meta.hiddenLocked, w / 2, h - 46);
      return;
    }

    const ink = mode === 'earned' ? '#0C1A16' : '#3C434F';
    c.fillStyle = ink;
    c.font = '800 44px Urbanist, Helvetica, Arial, sans-serif';
    c.fillText(a.name, w / 2, 76, w - 36);

    c.fillStyle = mode === 'earned' ? '#0C1A16' : '#6E7686';
    c.font = '600 24px Urbanist, Helvetica, Arial, sans-serif';
    wrapped(c, mode === 'earned' ? meta.earnedMark : a.locked, w / 2, 146, w - 44, 32);
  });
}

/** Plaques are narrow; the locked lines are sentences. */
function wrapped(c, text, cx, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (c.measureText(test).width > maxWidth && line) {
      c.fillText(line, cx, y);
      y += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) c.fillText(line, cx, y);
}
