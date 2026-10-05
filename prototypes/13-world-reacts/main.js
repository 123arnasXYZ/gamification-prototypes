/* ============================================================
   13 — Let the world react without you
   The whole prototype is the team's chat workspace. You take three
   decisions, each one-to-one with a single person, and what moves is
   everybody else: two people who were never in your meeting stop
   speaking, and some of it only lands a week later, in the channel,
   as a shrug. The 3D scene behind is the office it happens in.
   ============================================================ */

import { THREE, createStage, addLightRig, box, tween, ease, wait } from '../../shared/engine.js';
import { el, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, people, avatarColours, memberStatus, startLink, decisions, linkStates,
  endings, recapTitle, noRipples, point, again, close,
} from './content.js';

const bridge = createBridge('world-reacts');

/* ---------------- Stage ----------------
   Deliberately quiet: the workspace sits on top of it, so this is
   the room behind the screen rather than the thing being read. */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 42,
  cameraPos: [0, 3.4, 9],
  lookAt: [0, 1.6, 0],
  background: 0x151b23,
  fog: [16, 38],
  fit: { width: 13, height: 8 },
  orbit: false,
});

addLightRig(stage.scene, {
  sky: 0xdfe8f3, ground: 0x2a3038, hemi: 0.8,
  keyColor: 0xfff1dc, keyIntensity: 1.2, keyPos: [-5, 10, 7],
  shadowSize: 10, fillColor: 0x4a6f9c, fillIntensity: 0.5,
});

{
  const floor = box(40, 0.2, 24, 0x5f6670, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(40, 12, 0.3, 0xb9c1cb, { roughness: 0.95 });
  wall.position.set(0, 6, -5);
  stage.scene.add(floor, wall);

  // Empty desks: everybody is talking in the channel instead
  for (const x of [-5.4, -1.8, 1.8, 5.4]) {
    const top = box(2.5, 0.12, 1.3, 0xd9cdb8, { roughness: 0.8 });
    top.position.set(x, 1.05, -1.6);
    const screen = box(1.2, 0.75, 0.07, 0x3a3f47, { roughness: 0.5 });
    screen.position.set(x, 1.5, -2);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.6), new THREE.MeshBasicMaterial({ color: 0x9cc2ff }));
    glow.position.set(x, 1.5, -1.94);
    const chair = box(0.8, 0.9, 0.8, 0x4b515c, { roughness: 0.8 });
    chair.position.set(x, 0.45, -0.5);
    stage.scene.add(top, screen, glow, chair);
    for (const dx of [-1.05, 1.05]) {
      const leg = box(0.1, 1, 0.1, 0x5b6573);
      leg.position.set(x + dx, 0.5, -1.6);
      stage.scene.add(leg);
    }
  }
}
stage.start();

/* ---------------- The workspace chrome ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
document.getElementById('ws').textContent = meta.workspace;
document.getElementById('grpChannels').textContent = meta.channelsLabel;
document.getElementById('chan').textContent = meta.channel;
document.getElementById('grpPeople').textContent = meta.peopleLabel;
document.getElementById('chatHead').replaceChildren(
  el('b', {}, meta.channel),
  el('span', {}, meta.channelNote),
);

/* The title card floats over the workspace, and it grows a line when
   the frame is narrow — so the workspace starts wherever it ends. */
const work = document.getElementById('work');
const titlePanel = document.querySelector('.topbar .panel');
function fitWork() {
  work.style.top = `${Math.round(titlePanel.getBoundingClientRect().bottom) + 12}px`;
}
window.addEventListener('resize', fitWork);
new ResizeObserver(fitWork).observe(titlePanel);
fitWork();

const membersEl = document.getElementById('members');
const meEl = document.getElementById('me');
const log = document.getElementById('log');
const compose = document.getElementById('compose');
const restartBtn = document.getElementById('restart');
restartBtn.textContent = meta.restart;
restartBtn.addEventListener('click', restart);

meEl.replaceChildren(
  avatar('you', meta.youName),
  el('div', {}, [el('div.nm', {}, meta.youName), el('div.st', {}, meta.youStatus)]),
);

/* ---------------- Relationships ----------------
   One value per pair of team members. Nothing here is between a
   person and the learner: the learner's own standing is not what is
   being modelled. */
const links = {};
for (let i = 0; i < people.length; i++) {
  for (let j = i + 1; j < people.length; j++) {
    const key = [people[i].id, people[j].id].sort().join('-');
    links[key] = { value: startLink, a: people[i].id, b: people[j].id };
  }
}

/* ---------------- State ---------------- */
const state = { step: 0, pending: [], busy: false, over: false, run: 0 };

if (new URLSearchParams(location.search).has('debug')) {
  window.__world = { state, links, choose, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   A decision
   ============================================================ */
async function choose(index) {
  if (state.busy || state.over) return;
  const decision = decisions[state.step];
  const option = decision?.options[index];
  if (!option) return;

  state.busy = true;
  const run = state.run;
  renderCompose();

  // Last week's fallout arrives now, whether or not you remember causing it
  if (state.pending.length) {
    divider(meta.weekLabel.replace('{n}', String(state.step + 1)));
    for (const msg of state.pending) {
      post(msg, true);
      await wait(520);
      if (run !== state.run) return;
    }
  }
  state.pending = option.later ?? [];

  await applyEffects(option.effects);
  if (run !== state.run) return;
  renderMembers();

  for (const msg of option.now ?? []) {
    post(msg, false);
    await wait(460);
    if (run !== state.run) return;
  }

  state.step += 1;
  bridge.progress(state.step / decisions.length, { links: valueMap() });
  state.busy = false;

  if (state.step >= decisions.length) return settle();
  renderCompose();
}

/** The last week still happens, even with nothing left to decide. */
async function settle() {
  const run = state.run;
  state.busy = true;
  renderCompose();
  await wait(800);
  if (state.pending.length) divider(meta.weekLabel.replace('{n}', String(decisions.length + 1)));
  for (const msg of state.pending) {
    if (run !== state.run) return;
    post(msg, true);
    await wait(520);
  }
  state.pending = [];
  state.busy = false;
  finish();
}

/** Move the relationships between people. None of them is with you. */
async function applyEffects(effects = {}) {
  const moves = Object.entries(effects)
    .map(([pair, delta]) => {
      const link = links[pair.split('-').sort().join('-')];
      return link && { link, from: link.value, to: clamp(link.value + delta) };
    })
    .filter(Boolean);
  if (!moves.length) return;

  await tween({
    ms: 620, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      for (const m of moves) m.link.value = m.from + (m.to - m.from) * e;
      renderMembers();
    },
  });
  for (const m of moves) m.link.value = m.to;
}

/* ---------------- The channel ---------------- */
function post(msg, late) {
  const person = people.find((p) => p.id === msg.from);
  log.append(el('div.post', {}, [
    avatar(msg.from, person?.name ?? msg.from),
    el('div', {}, [
      el('div', {}, [
        el('span.who', {}, person?.name ?? msg.from),
        el('span.when', {}, timeFor(state.step, late)),
      ]),
      el('div.text', {}, msg.text),
    ]),
  ]));
  trim();
}

function divider(text) {
  log.append(el('div.day.post', {}, text));
  trim();
}

/** Old posts fade out of the top of the channel instead of piling up. */
function trim() {
  while (log.querySelectorAll('.post:not(.out)').length > 5) {
    const oldest = log.querySelector('.post:not(.out)');
    oldest.classList.add('out');
    setTimeout(() => oldest.remove(), 380);
  }
}

/* ---------------- Sidebar ---------------- */
function renderMembers() {
  membersEl.replaceChildren(...people.map((person) => {
    const mine = Object.values(links).filter((l) => l.a === person.id || l.b === person.id);
    const worst = Math.min(...mine.map((l) => l.value));
    const status = memberStatus.find((s) => worst <= s.atMost) ?? memberStatus[memberStatus.length - 1];
    return el(`div.member${status.tone ? '.' + status.tone : ''}`, {}, [
      avatar(person.id, person.name),
      el('div', {}, [
        el('div.nm', {}, person.name),
        el('div.st', {}, status.text),
      ]),
    ]);
  }));
}

/* ---------------- Compose box ---------------- */
function renderCompose() {
  if (state.over) return;
  const decision = decisions[state.step];
  if (!decision) return;
  const person = people.find((p) => p.id === decision.with);

  compose.replaceChildren(el('div', {}, [
    el('div.dm', {}, [
      avatar(person.id, person.name),
      el('span', {}, meta.dmLabel.replace('{name}', person.name)),
    ]),
    el('div.brief', {}, state.busy ? meta.settling : decision.brief),
    el('div.options', {}, decision.options.map((o, i) => el('button.opt', {
      type: 'button',
      disabled: state.busy || null,
      onClick: () => choose(i),
    }, o.text))),
  ]));
}

function finish() {
  state.over = true;
  const values = Object.values(links).map((l) => l.value);
  const broken = Object.values(links).filter((l) => stateOf(l.value).id === 'broken').length;
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const ending = endings.find((e) => broken <= e.maxBroken && average >= e.minAverage) ?? endings[endings.length - 1];

  bridge.complete({
    passed: broken === 0,
    score: Math.max(0, Math.min(1, (average + 1) / 2)),
    detail: { broken, links: valueMap() },
  });

  const pairs = Object.values(links)
    .map((l) => ({ l, s: stateOf(l.value) }))
    .filter((x) => x.s.id !== 'civil')
    .sort((a, b) => a.l.value - b.l.value)
    .slice(0, 4);

  compose.replaceChildren(el('div.recap', {}, [
    el('h2', {}, ending.title),
    el('p.line', {}, ending.line),
    el('div.eyebrow', { style: 'margin-bottom:6px' }, recapTitle),
    ...(pairs.length
      ? pairs.map((x) => el('div.beat', {
        html: `<b>${nameOf(x.l.a)} and ${nameOf(x.l.b)}</b> — ${x.s.label}`,
      }))
      : [el('div.beat', {}, noRipples)]),
    el('p.point', {}, point),
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button.btn.ghost', { type: 'button', onClick: () => compose.replaceChildren() }, close),
      el('button.btn.primary', { type: 'button', onClick: restart }, again),
    ]),
  ]));
}

function restart() {
  state.run += 1;
  Object.assign(state, { step: 0, pending: [], busy: false, over: false });
  for (const link of Object.values(links)) link.value = startLink;
  log.replaceChildren();
  renderMembers();
  renderCompose();
  bridge.restart();
}

/* ---------------- Helpers ---------------- */
const clamp = (v) => Math.max(-1, Math.min(1, v));
const nameOf = (id) => people.find((p) => p.id === id)?.name ?? id;
const valueMap = () => Object.fromEntries(Object.entries(links).map(([k, l]) => [k, Number(l.value.toFixed(2))]));

function stateOf(value) {
  return linkStates.find((s) => value <= s.atMost) ?? linkStates[linkStates.length - 1];
}

/** Initials in a coloured tile, the way every chat app does it. */
function avatar(id, name) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return el('div.av', { style: `background:${avatarColours[id] ?? '#5b6573'}` }, initials);
}

/** Rough timestamps, so the week a message belongs to is readable. */
function timeFor(step, late) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const day = days[(step * 2 + (late ? 3 : 1)) % days.length];
  const hour = 9 + ((step * 3 + (late ? 5 : 2)) % 8);
  return `${day} ${String(hour).padStart(2, '0')}:${late ? '47' : '12'}`;
}
