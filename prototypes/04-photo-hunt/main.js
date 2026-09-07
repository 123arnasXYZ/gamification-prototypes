/* ============================================================
   04 — Photo Hunt
   An empty warehouse, one hazard, and a camera with three shots.
   Look around, walk to a better position, photograph the hazard.

   Every shutter press costs a shot, so a photograph of empty floor
   is a wasted one — the point is to look before you shoot.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, tween, ease } from '../../shared/engine.js';
import { el, toast, showResult, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, film, waypoints, hazards, results } from './content.js';

const bridge = createBridge('photo-hunt');

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 62,
  near: 0.05,
  cameraPos: waypoints[0].pos,
  background: 0x0f141b,
  fog: [16, 50],
  orbit: false,            // we drive the camera ourselves, first-person style
});

stage.camera.rotation.order = 'YXZ';

// An empty room has nothing to bounce light off, so it needs more fill
// than the cluttered version did.
addLightRig(stage.scene, {
  sky: 0xbcd0e8, ground: 0x2a3038, hemi: 0.9,
  keyColor: 0xfff2dc,
  keyIntensity: 1.9,
  keyPos: [8, 16, 10],
  shadowSize: 20,
  fillColor: 0x4a6f9c,
  fillIntensity: 0.65,
});

buildWarehouse();
const hazardNodes = hazards.map(buildHazard);

/* ---------------- First-person look ---------------- */
const look = { yaw: waypoints[0].yaw, pitch: -0.06 };
const canvas = stage.renderer.domElement;
let dragging = false, lastX = 0, lastY = 0;

function applyLook() {
  stage.camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
}
applyLook();

canvas.addEventListener('pointerdown', (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  look.yaw -= (e.clientX - lastX) * 0.0033;
  look.pitch -= (e.clientY - lastY) * 0.0033;
  look.pitch = Math.max(-0.8, Math.min(0.55, look.pitch));
  lastX = e.clientX; lastY = e.clientY;
  applyLook();
});
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointercancel', () => { dragging = false; });

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const hint = document.getElementById('hint');
const roll = document.getElementById('roll');
const foundList = document.getElementById('found');
const flashEl = document.getElementById('flash');

const stats = statBar(document.getElementById('stats'), [
  { id: 'found', label: 'Hazards', value: 0, max: hazards.length, color: '#12A177' },
  { id: 'film', label: 'Film', value: film, max: film, color: '#C98A0E' },
]);

const walk = document.getElementById('walk');
const walkButtons = waypoints.map((w, i) => {
  const b = el('button.btn', { type: 'button', onclick: () => moveTo(i) }, w.label);
  walk.append(b);
  return b;
});

document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ---------------- */
const state = { found: new Set(), wasted: 0, film, at: 0, busy: false, over: false };

stage.onPick((obj, data) => {
  if (state.busy || state.over) return;
  // A photograph of nothing is still a photograph, and still costs a shot.
  shoot(data?.kind === 'hazard' ? data.id : null);
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) window.__hunt = { stage, state, shoot, moveTo, restart };

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
renderFound();
refreshWalk();

/* ---------------- Movement ---------------- */
function moveTo(index) {
  if (state.busy || index === state.at) return;
  state.busy = true;
  state.at = index;
  refreshWalk();

  const from = stage.camera.position.clone();
  const to = new THREE.Vector3(...waypoints[index].pos);
  const fromYaw = look.yaw;
  const toYaw = waypoints[index].yaw;

  tween({
    ms: 900,
    easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      stage.camera.position.lerpVectors(from, to, e);
      look.yaw = fromYaw + (toYaw - fromYaw) * e;
      applyLook();
    },
    onDone: () => { state.busy = false; },
  });
}

function refreshWalk() {
  walkButtons.forEach((b, i) => {
    b.disabled = i === state.at;
    b.classList.toggle('primary', i === state.at);
  });
}

/* ---------------- Shooting ---------------- */
function shoot(hazardId) {
  if (hazardId && state.found.has(hazardId)) { toast('Already photographed', '', 1400); return; }

  const thumb = grabFrame();
  flashEl.classList.remove('fire');
  void flashEl.offsetWidth;          // restart the CSS animation
  flashEl.classList.add('fire');

  state.film -= 1;
  stats.set('film', state.film);

  if (hazardId) {
    state.found.add(hazardId);
    stats.set('found', state.found.size);
    const h = hazards.find((x) => x.id === hazardId);
    addThumb(thumb, true, h.label);
    toast(`${h.label} logged`, 'good', 2400);
    markHazardFound(hazardId);
  } else {
    state.wasted += 1;
    addThumb(thumb, false, 'Nothing in frame');
    toast('Nothing in that shot — one less on the roll', 'bad', 2400);
  }

  renderFound();
  bridge.progress(state.found.size / hazards.length);

  if (state.found.size === hazards.length || state.film <= 0) {
    setTimeout(finish, 900);
  }
}

/** Read the current frame straight off the WebGL canvas. Only valid
    immediately after a render, before the buffer is cleared. */
function grabFrame() {
  stage.renderer.render(stage.scene, stage.camera);
  try { return stage.renderer.domElement.toDataURL('image/jpeg', 0.55); }
  catch { return null; }
}

function addThumb(src, ok, label) {
  const shot = el('div.shot' + (ok ? '' : '.miss'), { title: label });
  if (src) shot.append(el('img', { src, alt: label }));
  roll.append(shot);
  while (roll.children.length > 6) roll.firstChild.remove();
}

function markHazardFound(id) {
  const node = hazardNodes.find((n) => n.id === id);
  if (!node) return;
  stage.setPickEnabled(node.group, false);
  node.marker.visible = true;
  tween({ ms: 420, easing: ease.outBack, onUpdate: (_, e) => node.marker.scale.setScalar(Math.max(0.01, e)) });
}

function renderFound() {
  foundList.replaceChildren(...hazards.map((h) => {
    const got = state.found.has(h.id);
    return el('div.item' + (got ? '' : '.todo'), {}, got ? `✓ ${h.label}` : '— not yet found');
  }));
  hint.textContent = state.found.size === hazards.length
    ? 'Hazard logged'
    : meta.instructions;
}

/* ---------------- Debrief ---------------- */
function finish() {
  if (state.over) return;
  state.over = true;

  const all = state.found.size === hazards.length;
  const outcome = !all ? results.missed : (state.wasted ? results.wasteful : results.perfect);
  const score = Math.max(0, (all ? 1 : 0) - state.wasted * 0.15);

  const points = hazards.map((h) => {
    const got = state.found.has(h.id);
    return `<b style="color:${got ? 'var(--good)' : 'var(--danger)'}">${got ? '✓' : '✕'} ${h.label}</b> — ${h.why}`;
  });
  if (state.wasted) {
    points.push(`<b>${state.wasted} shot${state.wasted === 1 ? '' : 's'} spent on empty floor.</b> ` +
      'Walking to a closer position costs nothing; film does.');
  }

  bridge.complete({ passed: all, score });

  showResult({
    passed: all,
    title: outcome.title,
    summary: outcome.summary,
    points,
    actions: [
      { label: 'Close', kind: 'ghost' },
      { label: 'Walk it again', kind: 'primary', onClick: restart },
    ],
  });
}

function restart() {
  document.querySelector('.scrim')?.remove();
  state.found.clear();
  state.wasted = 0;
  state.film = film;
  state.over = false;
  state.busy = false;
  stats.set('found', 0);
  stats.set('film', film);
  roll.replaceChildren();
  for (const n of hazardNodes) {
    stage.setPickEnabled(n.group, true);
    n.marker.visible = false;
  }
  renderFound();
  moveTo(0);
  bridge.restart();
}

/* ============================================================
   The building — floor, walls, roof. Nothing else, so the one
   hazard is the only thing in the room to find.
   ============================================================ */
function buildWarehouse() {
  const S = stage.scene;

  const floor = box(24, 0.4, 26, 0x3b424c, { roughness: 1 });
  floor.position.set(0, -0.2, -1);
  S.add(floor);

  // Painted walkway, so the spill is clearly across a route people use
  const walkway = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 24),
    mat(0x4a525d, { roughness: 1 }),
  );
  walkway.rotation.x = -Math.PI / 2;
  walkway.position.set(-1.5, 0.01, -1);
  walkway.receiveShadow = true;
  S.add(walkway);

  const walls = [
    [24, 7, 0.4, 0, 3.5, -14],     // back
    [24, 7, 0.4, 0, 3.5, 12],      // front
    [0.4, 7, 26, -12, 3.5, -1],    // left
    [0.4, 7, 26, 12, 3.5, -1],     // right
  ];
  for (const [w, h, d, x, y, z] of walls) {
    const m = box(w, h, d, 0x4a525e, { roughness: 0.95 });
    m.position.set(x, y, z);
    m.receiveShadow = true;
    S.add(m);
  }

  // Roof beams and light strips
  for (let i = 0; i < 6; i++) {
    const beam = box(24, 0.35, 0.35, 0x39414c, { roughness: 0.8 });
    beam.position.set(0, 6.4, -12 + i * 4.2);
    S.add(beam);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.14, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xfff2d5 }),
    );
    strip.position.set(0, 6.1, -12 + i * 4.2);
    S.add(strip);
  }
}

/* ---------------- The hazard ---------------- */
function buildHazard(h) {
  const group = new THREE.Group();
  group.position.set(...h.spot);

  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 28),
    mat(0x5b7f9e, { roughness: 0.10, metalness: 0.05 }),
  );
  puddle.rotation.x = -Math.PI / 2;
  group.add(puddle);

  const splash = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 20),
    mat(0x6890b0, { roughness: 0.08, metalness: 0.05 }),
  );
  splash.rotation.x = -Math.PI / 2;
  splash.position.set(1.3, 0.001, 0.75);
  group.add(splash);

  // The drum it came from, still lying on its side
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.1, 18),
    mat(0x3f6f4f, { roughness: 0.6 }),
  );
  drum.position.set(-1.15, 0.42, -0.5);
  drum.rotation.z = Math.PI / 2;
  drum.rotation.y = 0.4;
  group.add(drum);

  for (const m of group.children) { m.castShadow = true; m.receiveShadow = true; }

  // Confirmation marker, hidden until the hazard is photographed
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.07, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0x12a177, transparent: true, opacity: 0.95 }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 1.3;
  marker.visible = false;
  group.add(marker);

  stage.scene.add(group);
  stage.pickable(group, { kind: 'hazard', id: h.id });
  return { id: h.id, group, marker };
}
