/* ============================================================
   16 — Give learners a taste of mastery

   A one-page report stands on the desk and goes to a client at five.
   The review is done by clicking the parts of the page that are
   wrong; a flag tab appears beside whatever has been flagged, and
   clicking it again takes the flag off. No questions anywhere.

   Three passes, each ended by "Send it":
     1  the kit an experienced reviewer carries is switched on —
        every genuine problem pulses amber with its reason floating
        beside it, and a running note explains each flag;
     2  a different report with its own problems and none of the kit;
     3  Friday's report again, bare.

   Only the third pass is graded, against the first: the same three
   problems, the same page, nothing lent to them.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, beats, docs, regionOrder, results, ending } from './content.js';

const bridge = createBridge('taste-of-mastery');

/* ---------------- Measurements ----------------
   The page is drawn on a 1024x1448 canvas and stands up on the desk
   at the same aspect, so a rect in canvas fractions maps straight
   onto a rect of the standing page. */
const CANVAS_W = 1024;
const CANVAS_H = 1448;
const PAGE_W = 3.1;
const PAGE_H = PAGE_W * (CANVAS_H / CANVAS_W);
const DESK_Y = 0.95;
const PAGE_Z = -0.3;
const PAGE_TILT = -0.08;

/* Where the six reviewable parts sit on the page, in canvas
   fractions with the origin at the top left. The layout is the same
   for both documents; only the words change. */
const LAYOUT = {
  header: { x: 0.07, y: 0.030, w: 0.86, h: 0.150 },
  client: { x: 0.07, y: 0.190, w: 0.86, h: 0.098 },
  para:   { x: 0.07, y: 0.300, w: 0.86, h: 0.158 },
  chart:  { x: 0.07, y: 0.472, w: 0.86, h: 0.196 },
  table:  { x: 0.07, y: 0.682, w: 0.86, h: 0.205 },
  footer: { x: 0.07, y: 0.900, w: 0.86, h: 0.070 },
};

const AMBER = 0xe0a32a;
const BLUE = 0x2757e2;
const AMBER_INK = '#8F6310';
const PAPER = '#FBFAF6';
const INK = '#10131A';
const INK_DIM = '#4B5162';
const RULE = 'rgba(16,19,26,0.14)';

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 38,
  cameraPos: [0.9, 3.5, 7.4],
  lookAt: [0.9, 2.9, 0],
  background: 0x161b22,
  fog: [22, 52],
  fit: { width: 7.4, height: 6.4 },
  orbitLimits: {
    minPolarAngle: 1.05, maxPolarAngle: 1.62,
    minAzimuthAngle: -0.26, maxAzimuthAngle: 0.26,
    minDistance: 6, maxDistance: 11,
  },
});

addLightRig(stage.scene, {
  sky: 0xe4ebf4, ground: 0x2a3038, hemi: 1.0,
  keyColor: 0xfff4e4, keyIntensity: 1.35, keyPos: [4, 11, 9],
  shadowSize: 10, fillColor: 0x4a6f9c, fillIntensity: 0.6,
});

/* ---------------- Room, desk, props ---------------- */
{
  const floor = box(30, 0.2, 20, 0x6c737d, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(30, 11, 0.3, 0xcbd2db, { roughness: 0.95 });
  wall.position.set(0, 5.5, -3.0);
  stage.scene.add(floor, wall);

  const top = new THREE.Mesh(roundedBox(8.2, 0.16, 3.4, 0.05), mat(0xd9cdb8, { roughness: 0.8 }));
  top.position.set(0, DESK_Y - 0.08, 0.1);
  top.castShadow = true;
  top.receiveShadow = true;
  stage.scene.add(top);

  for (const x of [-3.8, 3.8]) {
    for (const z of [-1.3, 1.5]) {
      const leg = box(0.14, DESK_Y - 0.16, 0.14, 0x5b6573, { roughness: 0.6 });
      leg.position.set(x, (DESK_Y - 0.16) / 2, z);
      stage.scene.add(leg);
    }
  }

  // A mug and a couple of filed pages, so the desk is somebody's desk
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.34, 16), mat(BLUE, { roughness: 0.7 }));
  mug.position.set(2.65, DESK_Y + 0.17, 0.75);
  mug.castShadow = true;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 6, 14), mat(BLUE, { roughness: 0.7 }));
  handle.position.set(2.88, DESK_Y + 0.18, 0.75);
  handle.rotation.y = Math.PI / 2;
  stage.scene.add(mug, handle);

  for (let i = 0; i < 3; i++) {
    const sheet = box(1.5, 0.02, 1.05, 0xf6f3ec, { roughness: 0.95 });
    sheet.position.set(-2.75 + i * 0.03, DESK_Y + 0.012 + i * 0.022, 0.7);
    sheet.rotation.y = -0.16 + i * 0.05;
    stage.scene.add(sheet);
  }

  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8), mat(0xe0234e, { roughness: 0.6 }));
  pen.rotation.set(Math.PI / 2, 0, 0.42);
  pen.position.set(-1.5, DESK_Y + 0.03, 1.05);
  pen.castShadow = true;
  stage.scene.add(pen);
}

/* ---------------- The standing page ---------------- */
const pageGroup = new THREE.Group();
pageGroup.position.set(0, DESK_Y + 0.12 + PAGE_H / 2, PAGE_Z);
pageGroup.rotation.x = PAGE_TILT;
stage.scene.add(pageGroup);

const backing = box(PAGE_W + 0.07, PAGE_H + 0.07, 0.05, 0xe4dfd3, { roughness: 0.9 });
backing.position.z = -0.03;
pageGroup.add(backing);

const pagePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(PAGE_W, PAGE_H),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 }),
);
pagePlane.receiveShadow = true;
pageGroup.add(pagePlane);

/* A holder the page sits in, so it is standing rather than floating. */
{
  const lip = box(PAGE_W + 0.5, 0.1, 0.3, 0x5b6573, { roughness: 0.6 });
  lip.position.set(0, DESK_Y + 0.05, PAGE_Z + 0.16);
  const strut = box(0.16, PAGE_H * 0.5, 0.12, 0x5b6573, { roughness: 0.6 });
  strut.position.set(0, DESK_Y + PAGE_H * 0.25, PAGE_Z - 0.16);
  strut.rotation.x = 0.1;
  stage.scene.add(lip, strut);
}

/* ---------------- The six reviewable regions ----------------
   Each one is a highlight plane, an amber outline, a host for the
   floating reason tag, an invisible hit target, and a flag tab that
   sticks out of the left edge of the page once flagged. */
function localRect(r) {
  return {
    cx: (r.x + r.w / 2 - 0.5) * PAGE_W,
    cy: (0.5 - (r.y + r.h / 2)) * PAGE_H,
    w: r.w * PAGE_W,
    h: r.h * PAGE_H,
  };
}

function flatPlane(w, h, colour, opacity, order) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false }),
  );
  m.renderOrder = order;
  return m;
}

/** Four thin bars making a rectangle outline, as one group. */
function outlineRect(w, h, t, colour) {
  const g = new THREE.Group();
  for (const [bw, bh, bx, by] of [[w, t, 0, h / 2], [w, t, 0, -h / 2], [t, h, -w / 2, 0], [t, h, w / 2, 0]]) {
    g.add(flatPlane(bw, bh, colour, 1, 7));
    const bar = g.children[g.children.length - 1];
    bar.position.set(bx, by, 0);
  }
  return g;
}

const regions = {};
for (const id of regionOrder) {
  const r = localRect(LAYOUT[id]);
  const group = new THREE.Group();
  group.position.set(r.cx, r.cy, 0);
  pageGroup.add(group);

  const fill = flatPlane(r.w, r.h, AMBER, 0, 6);
  fill.position.z = 0.012;
  fill.visible = false;

  const outline = outlineRect(r.w + 0.04, r.h + 0.04, 0.025, AMBER);
  outline.position.z = 0.016;
  outline.visible = false;

  const tagHost = new THREE.Group();
  tagHost.visible = false;

  // Invisible and in front of everything, so a click anywhere over
  // the part counts and nothing drawn on the paper can swallow it.
  const hit = flatPlane(r.w, r.h, 0xffffff, 0, 8);
  hit.position.z = 0.05;

  // The flag tab: a coloured stub off the left edge of the page
  const tab = new THREE.Group();
  const tabBody = box(0.34, Math.min(r.h * 0.62, 0.46), 0.07, BLUE, { roughness: 0.55 });
  const pip = box(0.1, 0.1, 0.08, 0xffffff, { roughness: 0.7, cast: false });
  pip.position.set(-0.06, 0, 0.005);
  tab.add(tabBody, pip);
  tab.position.set(-(PAGE_W / 2) - 0.1, 0, 0.02);
  tab.visible = false;
  tab.scale.setScalar(0.01);

  group.add(fill, outline, tagHost, hit, tab);
  stage.pickable(hit, { kind: 'region', id });
  // The tab counts as part of its own region, so it can be clicked
  // off again directly. Hidden tabs are skipped by the picker.
  stage.pickable(tab, { kind: 'region', id });

  regions[id] = { id, group, fill, outline, tagHost, hit, tab, rect: r };
}

/* The printed face of each document, built once and kept. */
const pageTex = new Map();

/* ---------------- UI ---------------- */
const eyebrowEl = document.getElementById('eyebrow');
const titleEl = document.getElementById('title');
const hintEl = document.getElementById('hint');
const board = document.getElementById('board');
const sendBtn = document.getElementById('send');
sendBtn.textContent = meta.sendLabel;
sendBtn.addEventListener('click', send);
document.getElementById('restart').addEventListener('click', restart);

const stats = statBar(document.getElementById('stats'), [
  { id: 'beat', label: meta.beatLabel, value: 1, max: beats.length },
  { id: 'flagged', label: meta.flaggedLabel, value: 0 },
]);

/* ---------------- State ---------------- */
const state = {
  beat: 1,
  docId: beats[0].doc,
  supports: beats[0].supports,
  flags: { 1: [], 2: [], 3: [] },
  problems: Object.fromEntries(
    Object.entries(docs).map(([id, doc]) => [id, regionOrder.filter((rid) => doc.regions[rid].problem)]),
  ),
  busy: false,
  done: false,
  run: 0,
};

const doc = () => docs[state.docId];
const beat = () => beats[state.beat - 1];
const flagsNow = () => state.flags[state.beat];
const problemsNow = () => state.problems[state.docId];

stage.onPick((obj, data) => {
  if (data?.kind === 'region') flag(data.id);
});

stage.onFrame((_, t) => {
  if (!state.supports) return;
  const d = doc();
  const flagged = flagsNow();
  for (const id of problemsNow()) {
    if (!d.regions[id].problem) continue;
    const reg = regions[id];
    if (!reg.fill.visible) continue;
    const held = flagged.includes(id);
    const pulse = held ? 0.12 : 0.13 + Math.sin(t * 2.9) * 0.085;
    reg.fill.material.opacity = pulse;
    for (const bar of reg.outline.children) bar.material.opacity = held ? 0.5 : 0.75 + Math.sin(t * 2.9) * 0.25;
  }
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__mastery = { state, flag, send, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* The page is a wall of text, so it is redrawn once the webfont has
   actually arrived rather than left in the fallback face. */
document.fonts?.ready?.then(() => {
  for (const tex of pageTex.values()) tex.dispose();
  pageTex.clear();
  applyPage();
  applyVisuals();
});

/* ============================================================
   Actions
   ============================================================ */

/** Flag or unflag one part of the page. */
async function flag(regionId) {
  if (state.busy || state.done) return;
  const spec = doc().regions[regionId];
  if (!spec) return;
  const flags = flagsNow();
  const reg = regions[regionId];
  const at = flags.indexOf(regionId);

  // With the reviewer's kit on, a clean part cannot be flagged: the
  // kit already knows it is clean and says so in one line.
  if (state.supports && !spec.problem && at < 0) {
    toast(spec.clean, '', 3000);
    return;
  }

  if (at >= 0) {
    flags.splice(at, 1);
    if (!state.supports) toast(meta.unflaggedToast.replace('{part}', spec.label), '', 2400);
    await popTab(reg.tab, false);
  } else {
    flags.push(regionId);
    if (!state.supports) toast(meta.flaggedToast.replace('{part}', spec.label), '', 2400);
    await popTab(reg.tab, true);
  }

  stats.set('flagged', flags.length);
  renderBoard();
  setHint();
}

/** End the pass. Beat one will not go out with a marked problem left. */
async function send() {
  if (state.busy || state.done) return;
  const b = beat();

  if (b.supports) {
    const left = problemsNow().filter((id) => !flagsNow().includes(id)).length;
    if (left > 0) {
      toast(left === 1 ? meta.blockedSendOne : meta.blockedSendMany.replace('{n}', String(left)), 'bad', 3200);
      return;
    }
  }

  const run = state.run;
  state.busy = true;
  sendBtn.disabled = true;

  await liftAway();
  if (run !== state.run) return;

  toast(b.sentToast, b.supports ? 'good' : '', 3400);
  bridge.progress(state.beat / beats.length, { flagged: [...flagsNow()] });

  if (state.beat >= beats.length) {
    finish();
    return;
  }

  state.beat += 1;
  await setupBeat();
  if (run !== state.run) return;
  state.busy = false;
  sendBtn.disabled = false;
}

async function restart() {
  document.querySelector('.scrim')?.remove();
  state.run += 1;
  Object.assign(state, {
    beat: 1,
    flags: { 1: [], 2: [], 3: [] },
    busy: false,
    done: false,
  });
  board.style.visibility = '';
  sendBtn.style.visibility = '';
  hintEl.style.visibility = '';
  sendBtn.disabled = false;
  bridge.restart();
  await setupBeat(true);
}

/* ============================================================
   Beats
   ============================================================ */
async function setupBeat(instant = false) {
  const run = state.run;
  const b = beat();
  state.docId = b.doc;
  state.supports = b.supports;

  for (const id of regionOrder) {
    const reg = regions[id];
    reg.tab.visible = false;
    reg.tab.scale.setScalar(0.01);
  }

  applyPage();
  applyVisuals();

  eyebrowEl.textContent = b.eyebrow;
  titleEl.textContent = b.title;
  stats.set('beat', b.n);
  stats.set('flagged', flagsNow().length);
  renderBoard();
  setHint();

  if (!instant) {
    await dropIn();
    if (run !== state.run) return;
  } else {
    pageGroup.position.y = DESK_Y + 0.12 + PAGE_H / 2;
    pageGroup.rotation.set(PAGE_TILT, 0, 0);
    pageGroup.scale.setScalar(1);
  }
}

/** Put the current document's printed face on the standing page. */
function applyPage() {
  const d = doc();
  if (!pageTex.has(d.id)) pageTex.set(d.id, docTexture(d));
  pagePlane.material.map = pageTex.get(d.id);
  pagePlane.material.needsUpdate = true;
}

/** Switch the reviewer's kit on or off for this beat. */
function applyVisuals() {
  const d = doc();
  for (const id of regionOrder) {
    const reg = regions[id];
    const spec = d.regions[id];
    const show = state.supports && spec.problem;

    reg.fill.visible = show;
    reg.outline.visible = show;
    reg.fill.material.opacity = show ? 0.13 : 0;

    for (const child of reg.tagHost.children) {
      child.material?.map?.dispose?.();
      child.material?.dispose?.();
    }
    reg.tagHost.clear();
    reg.tagHost.visible = show;

    if (!show) continue;

    const sprite = tagSprite(spec.tag);
    sprite.position.set(PAGE_W / 2 + 0.22 + sprite.scale.x / 2, 0, 0.09);
    const link = flatPlane(0.22, 0.03, AMBER, 0.9, 7);
    link.position.set(PAGE_W / 2 + 0.11, 0, 0.06);
    reg.tagHost.add(sprite, link);
  }
}

function renderBoard() {
  const b = beat();
  if (!b.supports) {
    board.replaceChildren(el('p.banner', {}, b.banner));
    return;
  }
  const d = doc();
  const lines = regionOrder
    .filter((id) => flagsNow().includes(id))
    .map((id) => el('div.line', { html: `<b>${d.regions[id].label}</b> — ${d.regions[id].note}` }));
  board.replaceChildren(el('div.note', {}, [
    el('div.eyebrow', {}, meta.noteTitle),
    el('div.log', {}, lines.length ? lines : [el('div.line.wait', {}, meta.noteWaiting)]),
  ]));
}

function setHint() {
  const b = beat();
  const ready = b.supports && problemsNow().every((id) => flagsNow().includes(id));
  hintEl.textContent = ready ? b.readyHint : b.hint;
}

/* ============================================================
   The ending — beat three against beat one, on the same page
   ============================================================ */
function finish() {
  state.done = true;
  state.busy = false;
  const firstDoc = docs[beats[0].doc];
  const targets = state.problems[beats[0].doc];
  const final = state.flags[beats.length];

  const caught = targets.filter((id) => final.includes(id));
  const falseFlags = final.filter((id) => !firstDoc.regions[id].problem);
  const secondCaught = state.problems[beats[1].doc].filter((id) => state.flags[2].includes(id));

  const fraction = caught.length / targets.length;
  const passed = caught.length >= 2;
  const r = results.find((x) => fraction >= x.min) ?? results[results.length - 1];

  bridge.complete({
    passed,
    score: fraction,
    detail: {
      caught: [...caught],
      missed: targets.filter((id) => !final.includes(id)),
      falseFlags: [...falseFlags],
      secondDocCaught: [...secondCaught],
    },
  });

  const points = [
    caught.length === 1 ? ending.leadOne : ending.leadMany.replace('{n}', String(caught.length)),
    ...targets.map((id) => {
      const spec = firstDoc.regions[id];
      const line = final.includes(id) ? ending.caughtLine : ending.missedLine;
      return line.replace('{part}', spec.label).replace('{reason}', spec.reason);
    }),
    falseFlags.length
      ? ending.cleanSome.replace('{list}', nameList(falseFlags, firstDoc))
      : ending.cleanNone,
    secondCaught.length
      ? ending.secondDocSome.replace('{n}', String(secondCaught.length))
      : ending.secondDocNone,
    ending.lesson,
  ];

  // The modal carries the ending; the note panel underneath would
  // just be an empty white box behind it.
  board.replaceChildren();
  board.style.visibility = 'hidden';
  sendBtn.style.visibility = 'hidden';
  hintEl.style.visibility = 'hidden';

  showResult({
    passed,
    title: r.title,
    summary: r.summary,
    points,
    actions: [
      { label: meta.closeLabel, kind: 'ghost' },
      { label: meta.againLabel, kind: 'primary', onClick: restart },
    ],
  });
}

function nameList(ids, d) {
  const names = ids.map((id) => `<b>${d.regions[id].label}</b>`);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/* ============================================================
   Animation
   ============================================================ */
/** A flag tab pops out of the page edge, or shrinks back into it. */
function popTab(tab, on) {
  if (on) tab.visible = true;
  return tween({
    ms: on ? 260 : 180,
    easing: on ? ease.outBack : ease.outCubic,
    onUpdate: (_, e) => tab.scale.setScalar(on ? 0.01 + 0.99 * e : Math.max(0.01, 1 - e)),
    onDone: () => { if (!on) tab.visible = false; },
  });
}

/** The reviewed page leaves the holder and goes out. */
async function liftAway() {
  const y0 = pageGroup.position.y;
  await tween({
    ms: 560, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      pageGroup.position.y = y0 + 3.6 * e;
      pageGroup.rotation.z = 0.26 * e;
      pageGroup.rotation.x = PAGE_TILT - 0.3 * e;
      pageGroup.scale.setScalar(1 - 0.22 * e);
    },
  });
}

/** The next page drops into the holder. */
async function dropIn() {
  const y1 = DESK_Y + 0.12 + PAGE_H / 2;
  pageGroup.position.y = y1 + 3.6;
  pageGroup.rotation.set(PAGE_TILT - 0.3, 0, 0.26);
  pageGroup.scale.setScalar(0.78);
  await tween({
    ms: 620, easing: ease.outCubic,
    onUpdate: (_, e) => {
      pageGroup.position.y = y1 + 3.6 * (1 - e);
      pageGroup.rotation.z = 0.26 * (1 - e);
      pageGroup.rotation.x = PAGE_TILT - 0.3 * (1 - e);
      pageGroup.scale.setScalar(0.78 + 0.22 * e);
    },
  });
  pageGroup.position.y = y1;
  pageGroup.rotation.set(PAGE_TILT, 0, 0);
  pageGroup.scale.setScalar(1);
  await wait(60);
}

/* ============================================================
   Drawing the document
   ============================================================ */
/* Declarations, not consts: the first page is drawn during module
   start-up, before this section has been evaluated. */
function px(r) {
  return { x: r.x * CANVAS_W, y: r.y * CANVAS_H, w: r.w * CANVAS_W, h: r.h * CANVAS_H };
}
function font(weight, size) {
  return `${weight} ${size}px Urbanist, Helvetica, Arial, sans-serif`;
}
function monoFont(weight, size) {
  return `${weight} ${size}px "JetBrains Mono", Consolas, ui-monospace, monospace`;
}

function docTexture(d) {
  return canvasTexture(CANVAS_W, CANVAS_H, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
    c.fillStyle = '#2757E2';
    c.fillRect(0, 0, CANVAS_W, 16);
    c.strokeStyle = 'rgba(16,19,26,0.10)';
    c.lineWidth = 2;
    c.strokeRect(1, 1, CANVAS_W - 2, CANVAS_H - 2);

    drawHeader(c, px(LAYOUT.header), d);
    drawClient(c, px(LAYOUT.client), d);
    drawPara(c, px(LAYOUT.para), d);
    drawChart(c, px(LAYOUT.chart), d);
    drawTable(c, px(LAYOUT.table), d);
    drawFooter(c, px(LAYOUT.footer), d);
  });
}

function wrapLines(c, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (c.measureText(next).width > maxW && line) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Shrink until it fits one line, then give up and wrap. */
function fitLine(c, text, maxW, weight, start, min) {
  let size = start;
  c.font = font(weight, size);
  while (c.measureText(text).width > maxW && size > min) {
    size -= 2;
    c.font = font(weight, size);
  }
  return wrapLines(c, text, maxW);
}

function hairline(c, x, y, w, colour = RULE, h = 2) {
  c.fillStyle = colour;
  c.fillRect(x, y, w, h);
}

function drawHeader(c, r, d) {
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  c.font = font(800, 21);
  c.fillStyle = '#2757E2';
  c.fillText(d.kicker.toUpperCase(), r.x, r.y + 28);

  const lines = fitLine(c, d.title, r.w, 800, 52, 34);
  c.fillStyle = INK;
  lines.slice(0, 2).forEach((line, i) => c.fillText(line, r.x, r.y + 100 + i * 58));

  c.font = font(600, 25);
  c.fillStyle = INK_DIM;
  c.fillText(d.subtitle, r.x, r.y + 172);

  hairline(c, r.x, r.y + r.h - 12, r.w, '#2757E2', 3);
}

function drawClient(c, r, d) {
  c.textAlign = 'left';
  c.font = font(700, 20);
  c.fillStyle = INK_DIM;
  c.fillText(d.clientLabel.toUpperCase(), r.x, r.y + 24);

  c.font = font(800, 34);
  c.fillStyle = INK;
  c.fillText(d.clientName, r.x, r.y + 74);

  c.font = font(500, 24);
  c.fillStyle = INK_DIM;
  c.fillText(d.clientAddress, r.x, r.y + 114);
}

function drawPara(c, r, d) {
  c.textAlign = 'left';
  c.font = font(500, 27);
  c.fillStyle = '#242938';
  wrapLines(c, d.para, r.w).slice(0, 5).forEach((line, i) => c.fillText(line, r.x, r.y + 36 + i * 44));
}

function drawChart(c, r, d) {
  const ch = d.chart;
  c.textAlign = 'left';
  c.font = font(800, 25);
  c.fillStyle = INK;
  c.fillText(ch.caption, r.x, r.y + 26);

  const left = r.x + (ch.axis ? 118 : 24);
  const topY = r.y + 54;
  const plotW = r.x + r.w - left;
  const plotH = r.h - 54 - 46;
  const baseY = topY + plotH;

  if (ch.ticks) {
    c.font = font(600, 20);
    c.textAlign = 'right';
    for (const tick of ch.ticks) {
      const y = baseY - (tick / ch.max) * plotH;
      hairline(c, left, y, plotW, 'rgba(16,19,26,0.08)', 2);
      c.fillStyle = INK_DIM;
      c.fillText(String(tick), left - 14, y + 7);
    }
  }
  hairline(c, left, baseY, plotW, 'rgba(16,19,26,0.28)', 3);

  const n = ch.bars.length;
  const slot = plotW / n;
  const barW = slot * 0.46;
  ch.bars.forEach((bar, i) => {
    const h = Math.max(4, (bar.value / ch.max) * plotH);
    const x = left + slot * i + (slot - barW) / 2;
    c.fillStyle = '#2757E2';
    c.fillRect(x, baseY - h, barW, h);

    c.textAlign = 'center';
    if (ch.axis) {
      c.font = font(700, 21);
      c.fillStyle = '#2757E2';
      c.fillText(`${bar.value}${ch.suffix || ''}`, x + barW / 2, baseY - h - 12);
    }
    c.font = font(600, 21);
    c.fillStyle = INK_DIM;
    c.fillText(bar.label, x + barW / 2, baseY + 32);
  });

  if (ch.axis) {
    c.save();
    c.translate(r.x + 36, baseY - plotH / 2);
    c.rotate(-Math.PI / 2);
    c.font = font(700, 21);
    c.fillStyle = INK_DIM;
    c.textAlign = 'center';
    c.fillText(ch.axis, 0, 0);
    c.restore();
  }
}

function drawTable(c, r, d) {
  const t = d.table;
  c.textAlign = 'left';
  c.font = font(800, 25);
  c.fillStyle = INK;
  c.fillText(t.caption, r.x, r.y + 26);

  t.rows.forEach(([label, value], i) => {
    const y = r.y + 78 + i * 52;
    c.textAlign = 'left';
    c.font = font(600, 25);
    c.fillStyle = '#242938';
    c.fillText(label, r.x, y);
    c.textAlign = 'right';
    c.font = monoFont(500, 25);
    c.fillStyle = INK;
    c.fillText(value, r.x + r.w, y);
    hairline(c, r.x, y + 16, r.w, 'rgba(16,19,26,0.08)', 2);
  });

  const ruleY = r.y + 78 + t.rows.length * 52 - 20;
  hairline(c, r.x, ruleY, r.w, 'rgba(16,19,26,0.35)', 3);

  const totalY = ruleY + 48;
  c.textAlign = 'left';
  c.font = font(800, 26);
  c.fillStyle = INK;
  c.fillText(t.total[0], r.x, totalY);
  c.textAlign = 'right';
  c.font = monoFont(700, 26);
  c.fillText(t.total[1], r.x + r.w, totalY);
}

function drawFooter(c, r, d) {
  hairline(c, r.x, r.y, r.w, RULE, 2);
  c.textAlign = 'left';
  c.font = font(600, 21);
  c.fillStyle = INK_DIM;
  wrapLines(c, d.footer, r.w).slice(0, 2).forEach((line, i) => c.fillText(line, r.x, r.y + 36 + i * 30));
}

/** The floating reason tag beside a marked problem. */
function tagSprite(text) {
  const W = 1000, H = 300;
  const tex = canvasTexture(W, H, (c) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(8, 24, W - 16, H - 48, 34);
    c.fill();
    c.strokeStyle = '#E0A32A';
    c.lineWidth = 6;
    c.beginPath();
    c.roundRect(11, 27, W - 22, H - 54, 32);
    c.stroke();
    c.fillStyle = '#E0A32A';
    c.beginPath();
    c.roundRect(8, 24, 18, H - 48, 9);
    c.fill();

    c.font = font(700, 44);
    c.fillStyle = AMBER_INK;
    c.textAlign = 'left';
    const lines = wrapLines(c, text, W - 130).slice(0, 3);
    const y0 = H / 2 - ((lines.length - 1) * 52) / 2 + 14;
    lines.forEach((line, i) => c.fillText(line, 58, y0 + i * 52));
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const h = 0.62;
  s.scale.set(h * (W / H), h, 1);
  return s;
}
