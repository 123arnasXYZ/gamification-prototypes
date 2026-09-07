/* ============================================================
   02 — Decision Deck
   One scenario: heavy rain during a crane lift. Three cards held
   like a poker hand. Pick one and watch three meters move.

   The cards are parented to the camera, so they sit in a fixed fan
   at the bottom of the frame the way a hand of cards does, whichever
   way the camera is turned.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, canvasTexture, tween, ease } from '../../shared/engine.js';
import { el, toast, hideLoading, statBar } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import { meta, resources, cards, scoreFor } from './content.js';

const bridge = createBridge('decision-deck');

/* ---------------- Hand geometry, all in camera space ---------------- */
// Sized and placed so the hand occupies only the bottom of the frame —
// the crane, the load and the rain above it are the reason for the choice.
const CARD_W = 0.78, CARD_H = 1.10;
const HAND = [
  { x: -0.84, y: -0.56, z: -3.20, rot: 0.14 },
  { x: 0.00, y: -0.49, z: -3.19, rot: 0.00 },
  { x: 0.84, y: -0.56, z: -3.18, rot: -0.14 },
];
// Sits above the feedback panel rather than behind it.
const PLAYED = { x: 0, y: 0.55, z: -3.0, scale: 0.88 };

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 42,
  cameraPos: [0, 9, 16],
  lookAt: [0, 4.5, -8],
  background: 0x161c24,
  fog: [24, 78],
  // Measured at the hand, not the crane: the cards are the thing that must
  // never be clipped, and they live 3.2 units in front of the camera.
  fit: { width: 2.7, height: 2.3, distance: 3.2 },
  orbitLimits: {
    minPolarAngle: 1.30, maxPolarAngle: 1.50,
    minAzimuthAngle: -0.24, maxAzimuthAngle: 0.24,
    minDistance: 22, maxDistance: 28,
  },
});

// The hand hangs off the camera, so the camera has to be in the scene
// graph for its world matrix — and therefore picking — to update.
stage.scene.add(stage.camera);

addLightRig(stage.scene, {
  sky: 0x8ea6c0, ground: 0x1b212a, hemi: 0.8,
  keyColor: 0xcfdcea, keyIntensity: 1.0, keyPos: [10, 20, 6],
  shadowSize: 26, fillColor: 0x40567a, fillIntensity: 0.45,
});

buildSite();
const rain = buildRain();
stage.onFrame(rain.update);

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
document.getElementById('scenario').textContent = meta.scenario;
const hint = document.getElementById('hint');
const feedback = document.getElementById('feedback');
const stats = statBar(document.getElementById('stats'), resources);

document.getElementById('restart').addEventListener('click', reset);

/* ---------------- State ---------------- */
const state = { values: {}, played: null, busy: false };

const hand = cards.map(buildCard);

stage.onPick((obj, data) => {
  if (state.busy || state.played || !data || data.kind !== 'card') return;
  play(data.index);
});

stage.onHover((next, prev) => {
  if (state.played) return;
  for (const [mesh, up] of [[prev, false], [next, true]]) {
    const card = hand.find((c) => c.mesh === mesh);
    if (!card) continue;
    const slot = HAND[card.index];
    tween({
      ms: 170,
      onUpdate: (_, e) => {
        const k = up ? e : 1 - e;
        card.mesh.position.set(slot.x, slot.y + 0.12 * k, slot.z + 0.10 * k);
        card.mesh.scale.setScalar(1 + 0.06 * k);
      },
    });
  }
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) window.__deck = { stage, state, hand, play, reset };

requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
reset();

/* ============================================================
   Playing a card
   ============================================================ */
function play(index) {
  state.busy = true;
  const card = hand[index];
  state.played = card;

  // The two you did not pick drop out of frame
  for (const other of hand) {
    if (other === card) continue;
    stage.setPickEnabled(other.mesh, false);
    const from = other.mesh.position.clone();
    tween({
      ms: 300,
      easing: ease.outCubic,
      onUpdate: (_, e) => {
        other.mesh.position.set(from.x, from.y - 1.7 * e, from.z);
        other.mesh.material.opacity = 1 - e;
      },
      onDone: () => { other.mesh.visible = false; },
    });
  }

  // The chosen card comes up into the middle of the frame
  const from = card.mesh.position.clone();
  const fromRot = card.mesh.rotation.z;
  tween({
    ms: 480,
    easing: ease.outCubic,
    onUpdate: (_, e) => {
      card.mesh.position.set(
        from.x + (PLAYED.x - from.x) * e,
        from.y + (PLAYED.y - from.y) * e,
        from.z + (PLAYED.z - from.z) * e,
      );
      card.mesh.rotation.z = fromRot * (1 - e);
      card.mesh.scale.setScalar(1 + (PLAYED.scale - 1) * e);
    },
    onDone: () => {
      applyEffects(card.def);
      showFeedback(card.def);
      state.busy = false;
    },
  });

  hint.textContent = `You chose: ${card.def.title}`;
}

function applyEffects(def) {
  for (const r of resources) {
    const delta = def.effects[r.id] || 0;
    if (!delta) continue;
    state.values[r.id] = Math.max(0, Math.min(r.max, state.values[r.id] + delta));
    stats.set(r.id, state.values[r.id]);
  }
  // Call out the biggest hit, since that is the point of the choice
  const [worstId, worstDelta] = Object.entries(def.effects).sort((a, b) => a[1] - b[1])[0];
  const worstLabel = resources.find((r) => r.id === worstId).label;
  toast(`${worstLabel} ${worstDelta > 0 ? '+' : ''}${worstDelta}`, worstDelta < 0 ? 'bad' : 'good', 2600);
}

function showFeedback(def) {
  const deltas = resources
    .filter((r) => def.effects[r.id])
    .map((r) => {
      const d = def.effects[r.id];
      return el('span.delta.' + (d > 0 ? 'up' : 'down'), {}, `${r.label} ${d > 0 ? '+' : ''}${d}`);
    });

  feedback.replaceChildren(
    el('div.verdict-tag.' + def.rating, {}, def.verdict),
    el('h2', {}, def.title),
    el('div.deltas', {}, deltas),
    el('p', {}, def.feedback),
    el('div', { style: 'margin-top:16px' },
      el('button.btn.primary', { type: 'button', onclick: reset }, 'Try a different card')),
  );
  feedback.style.display = 'block';

  bridge.complete({ passed: def.rating !== 'bad', score: scoreFor[def.rating], choice: def.id });
}

/* ============================================================
   Reset
   ============================================================ */
function reset() {
  state.played = null;
  state.busy = false;
  feedback.style.display = 'none';
  hint.textContent = meta.instructions;

  for (const r of resources) {
    state.values[r.id] = r.value;
    stats.set(r.id, r.value);
  }

  hand.forEach((card, i) => {
    const slot = HAND[i];
    card.mesh.visible = true;
    card.mesh.material.opacity = 1;
    card.mesh.position.set(slot.x, slot.y, slot.z);
    card.mesh.rotation.set(0, 0, slot.rot);
    card.mesh.scale.setScalar(1);
    stage.setPickEnabled(card.mesh, true);
  });
}

/* ============================================================
   Cards
   ============================================================ */
function buildCard(def, index) {
  const slot = HAND[index];
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W, CARD_H),
    // Unlit on purpose: a card in your hand is something you read, so
    // the art should look exactly as drawn rather than take the gloom
    // of an overcast site.
    new THREE.MeshBasicMaterial({ map: cardTexture(def), transparent: true }),
  );
  mesh.position.set(slot.x, slot.y, slot.z);
  mesh.rotation.z = slot.rot;
  mesh.renderOrder = 10 + index;

  stage.camera.add(mesh);
  stage.pickable(mesh, { kind: 'card', index });
  return { def, mesh, index };
}

function cardTexture(def) {
  const accent = { best: '#2f8f57', ok: '#1f8f87', bad: '#b8443f' }[def.rating] || '#1d2733';
  return canvasTexture(620, 880, (c, w, h) => {
    c.clearRect(0, 0, w, h);

    // Rounded body with a playing-card double border
    roundRect(c, 8, 8, w - 16, h - 16, 40);
    c.fillStyle = '#fbf8f1';
    c.fill();
    c.strokeStyle = '#d8d0be';
    c.lineWidth = 5;
    c.stroke();
    roundRect(c, 26, 26, w - 52, h - 52, 26);
    c.strokeStyle = accent + '55';
    c.lineWidth = 3;
    c.stroke();

    // Corner index, mirrored bottom-right like a real playing card
    drawCorner(c, def, accent, 62, 92);
    c.save();
    c.translate(w - 62, h - 92);
    c.rotate(Math.PI);
    drawCorner(c, def, accent, 0, 0);
    c.restore();

    // Centre pip
    drawIcon(c, def.icon, w / 2, 300, 104, accent);

    c.textAlign = 'center';
    c.fillStyle = '#16202a';
    c.font = '700 50px Georgia, serif';
    let y = wrapCentred(c, def.title, w / 2, 440, w - 150, 56);

    c.fillStyle = '#6b6355';
    c.font = '400 23px Helvetica, Arial, sans-serif';
    wrapCentred(c, def.blurb, w / 2, y + 52, w - 130, 32);

    // Effect chips. The sign carries the meaning, so colour by sign.
    let cy = 620;
    for (const [id, delta] of Object.entries(def.effects)) {
      const good = delta > 0;
      c.fillStyle = good ? '#2f8f57' : '#b8443f';
      roundRect(c, 78, cy, w - 156, 60, 12);
      c.fill();
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.font = '700 25px Helvetica, Arial, sans-serif';
      c.fillText(labelFor(id).toUpperCase(), 104, cy + 40);
      c.textAlign = 'right';
      c.font = '700 31px Consolas, monospace';
      c.fillText(`${good ? '+' : ''}${delta}`, w - 104, cy + 41);
      cy += 72;
    }
    c.textAlign = 'left';
  });
}

// Declared, not assigned to a const: the cards are built at module load,
// before this point in the file is reached.
function labelFor(id) {
  return resources.find((r) => r.id === id)?.label ?? id;
}

function drawCorner(c, def, accent, x, y) {
  c.fillStyle = accent;
  c.font = '700 36px Helvetica, Arial, sans-serif';
  c.textAlign = 'center';
  c.fillText(def.title[0].toUpperCase(), x, y - 18);
  drawIcon(c, def.icon, x, y + 24, 32, accent);
  c.textAlign = 'left';
}

/** Drawn glyphs — no icon font and no image files to ship. */
function drawIcon(c, kind, cx, cy, size, color) {
  const s = size / 2;
  c.save();
  c.translate(cx, cy);
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = Math.max(3, size * 0.11);
  c.lineCap = 'round';

  if (kind === 'play') {
    c.beginPath();
    c.moveTo(-s * 0.6, -s);
    c.lineTo(s * 0.85, 0);
    c.lineTo(-s * 0.6, s);
    c.closePath();
    c.fill();
  } else if (kind === 'pause') {
    const bw = s * 0.42;
    c.fillRect(-s * 0.66 - bw / 2, -s, bw, s * 2);
    c.fillRect(s * 0.24 - bw / 2, -s, bw, s * 2);
  } else {
    c.beginPath();
    c.arc(-s * 0.15, -s * 0.15, s * 0.62, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(s * 0.3, s * 0.3);
    c.lineTo(s * 0.85, s * 0.85);
    c.stroke();
  }
  c.restore();
}

/* ============================================================
   Rain
   ============================================================ */
function buildRain() {
  const N = 2200;
  // The volume stops well short of the camera, so no drop is ever drawn
  // in front of the cards where it would sit on top of the text.
  const X = [-32, 32], Y = [-1, 26], Z = [-46, 5];

  const pos = new Float32Array(N * 6);
  const drops = new Float32Array(N * 5);   // x, y, z, length, speed

  const write = (i) => {
    const o = i * 5, p = i * 6;
    const x = drops[o], y = drops[o + 1], z = drops[o + 2], len = drops[o + 3];
    pos[p] = x;                  pos[p + 1] = y;       pos[p + 2] = z;
    pos[p + 3] = x - 0.16 * len; pos[p + 4] = y - len; pos[p + 5] = z;
  };

  const spawn = (i, anywhere) => {
    const o = i * 5;
    drops[o] = X[0] + Math.random() * (X[1] - X[0]);
    drops[o + 1] = anywhere ? Y[0] + Math.random() * (Y[1] - Y[0]) : Y[1] + Math.random() * 4;
    drops[o + 2] = Z[0] + Math.random() * (Z[1] - Z[0]);
    drops[o + 3] = 0.4 + Math.random() * 0.7;
    drops[o + 4] = 17 + Math.random() * 11;
    write(i);
  };

  for (let i = 0; i < N; i++) spawn(i, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: 0xc3d8ee, transparent: true, opacity: 0.45,
  }));
  mesh.frustumCulled = false;
  stage.scene.add(mesh);

  return {
    update(dt) {
      for (let i = 0; i < N; i++) {
        const o = i * 5;
        drops[o + 1] -= drops[o + 4] * dt;
        if (drops[o + 1] < Y[0]) spawn(i, false);
        else write(i);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

/* ============================================================
   The site
   ============================================================ */
function buildSite() {
  const S = stage.scene;

  const ground = box(160, 1, 160, 0x2b323b, { roughness: 0.55 });
  ground.position.y = -0.5;
  S.add(ground);

  // Wet patches catch the light and sell the weather
  const rng = seeded(11);
  for (let i = 0; i < 9; i++) {
    const r = 1.6 + rng() * 3.4;
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(r, 24),
      mat(0x44586e, { roughness: 0.08, metalness: 0.25 }),
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(-26 + rng() * 52, 0.012, -34 + rng() * 40);
    puddle.scale.y = 0.6 + rng() * 0.5;
    S.add(puddle);
  }

  S.add(buildCrane(-4, -20));

  // Half-built structure behind, for depth
  const frame = new THREE.Group();
  for (let f = 0; f < 3; f++) {
    const slab = box(14, 0.4, 10, 0x59616d, { roughness: 0.9 });
    slab.position.set(0, 3.2 + f * 3.4, 0);
    frame.add(slab);
    for (const [cx, cz] of [[-6, -4], [6, -4], [-6, 4], [6, 4], [0, 0]]) {
      const col = box(0.7, 3.4, 0.7, 0x4d545f, { roughness: 0.9 });
      col.position.set(cx, 1.6 + f * 3.4, cz);
      frame.add(col);
    }
  }
  frame.position.set(21, 0, -33);
  S.add(frame);

  // Containers
  [[11, -17, 0.2, 0xd1663f], [15.5, -15, -0.4, 0x3f7fa8], [-19, -15, 0.5, 0x6f7d54]].forEach(([x, z, rot, col]) => {
    const cont = box(6.4, 2.7, 2.6, col, { roughness: 0.85 });
    cont.position.set(x, 1.35, z);
    cont.rotation.y = rot;
    cont.castShadow = true;
    S.add(cont);
  });

  // Barrier line across the front of the lift zone
  for (let i = 0; i < 11; i++) {
    const barrier = box(1.9, 1.05, 0.16, i % 2 ? 0xf0b429 : 0xd94f3d, { roughness: 0.7 });
    barrier.position.set(-14 + i * 2.2, 0.55, -15);
    barrier.rotation.y = 0.04 * (i % 3);
    barrier.castShadow = true;
    S.add(barrier);
  }

  // Pipe stack
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 4 - r; i++) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 5.2, 14),
        mat(0x8a8f98, { roughness: 0.6, metalness: 0.2 }),
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(-20 + r * 0.44 + i * 0.9, 0.44 + r * 0.78, -19);
      pipe.castShadow = true;
      S.add(pipe);
    }
  }
}

function buildCrane(px, pz) {
  const g = new THREE.Group();
  const YELLOW = 0xe0a52a;
  const MAST_H = 12, HALF = 0.55;

  // Lattice mast: four legs plus rungs
  for (const [ox, oz] of [[-HALF, -HALF], [HALF, -HALF], [-HALF, HALF], [HALF, HALF]]) {
    const leg = box(0.17, MAST_H, 0.17, YELLOW, { roughness: 0.6 });
    leg.position.set(ox, MAST_H / 2, oz);
    leg.castShadow = true;
    g.add(leg);
  }
  for (let y = 1.4; y < MAST_H; y += 1.7) {
    for (const side of [-HALF, HALF]) {
      const rx = box(HALF * 2, 0.11, 0.11, YELLOW, { roughness: 0.6 });
      rx.position.set(0, y, side);
      const rz = box(0.11, 0.11, HALF * 2, YELLOW, { roughness: 0.6 });
      rz.position.set(side, y, 0);
      g.add(rx, rz);
    }
  }

  // Slewing platform and cab
  const platform = box(1.9, 0.5, 1.9, 0x3d454f, { roughness: 0.7 });
  platform.position.y = MAST_H + 0.25;
  platform.castShadow = true;
  const cab = box(1.5, 1.3, 1.6, 0x2f3640, { roughness: 0.5 });
  cab.position.set(1.3, MAST_H + 1.1, 0);
  cab.castShadow = true;
  const glass = box(1.3, 0.7, 0.06, 0x8fc0dd, { roughness: 0.15, metalness: 0.3 });
  glass.position.set(1.35, MAST_H + 1.25, 0.82);
  g.add(platform, cab, glass);

  // Jib forward, counter-jib back
  const jib = box(19, 0.36, 0.5, YELLOW, { roughness: 0.6 });
  jib.position.set(9, MAST_H + 0.9, 0);
  jib.castShadow = true;
  const jibTop = box(19, 0.14, 0.14, YELLOW, { roughness: 0.6 });
  jibTop.position.set(9, MAST_H + 1.75, 0);
  for (let i = 0; i < 9; i++) {
    const brace = box(0.09, 1.0, 0.09, YELLOW, { roughness: 0.6 });
    brace.position.set(0.8 + i * 2.1, MAST_H + 1.35, 0);
    brace.rotation.z = i % 2 ? 0.3 : -0.3;
    g.add(brace);
  }
  const counter = box(6.5, 0.4, 0.6, YELLOW, { roughness: 0.6 });
  counter.position.set(-3.6, MAST_H + 0.9, 0);
  const weight = box(1.8, 1.5, 1.7, 0x555c66, { roughness: 0.9 });
  weight.position.set(-6.2, MAST_H + 0.5, 0);
  weight.castShadow = true;
  g.add(jib, jibTop, counter, weight);

  // Hoist cable and the load, still hanging in the rain
  const HOOK_X = 11.5, LOAD_Y = 8;
  const cableLen = (MAST_H + 0.7) - (LOAD_Y + 1.2);
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, cableLen, 6),
    mat(0x20262e, { roughness: 0.8 }),
  );
  cable.position.set(HOOK_X, LOAD_Y + 1.2 + cableLen / 2, 0);
  const blockMesh = box(0.55, 0.6, 0.55, 0x3d454f, { roughness: 0.5 });
  blockMesh.position.set(HOOK_X, LOAD_Y + 1.0, 0);
  const load = box(3.2, 1.8, 2.0, 0xc2c8d0, { roughness: 0.95 });
  load.position.set(HOOK_X, LOAD_Y, 0);
  load.castShadow = true;
  const sling = box(0.12, 1.1, 0.12, 0xe2483c);
  sling.position.set(HOOK_X, LOAD_Y + 0.75, 0);
  g.add(cable, blockMesh, load, sling);

  // The load swings, which is the whole reason there is a decision to make
  const hanging = [
    [cable, cable.position.y],
    [blockMesh, blockMesh.position.y],
    [load, load.position.y],
    [sling, sling.position.y],
  ];
  stage.onFrame((dt, t) => {
    const sway = Math.sin(t * 0.85) * 0.55;
    const tilt = Math.sin(t * 0.85) * 0.05;
    for (const [m] of hanging) {
      m.position.x = HOOK_X + sway;
      m.rotation.z = tilt;
    }
  });

  g.position.set(px, 0, pz);
  return g;
}

/* ---------------- 2D helpers ---------------- */
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function wrapCentred(c, text, cx, y, maxW, lh) {
  let line = '';
  for (const word of String(text).split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (c.measureText(test).width > maxW && line) { c.fillText(line, cx, y); y += lh; line = word; }
    else line = test;
  }
  c.fillText(line, cx, y);
  return y;
}

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}
