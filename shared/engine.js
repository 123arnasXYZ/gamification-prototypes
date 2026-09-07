/* ============================================================
   engine.js - the thin Three.js layer every prototype sits on.

   Handles the boring, identical parts: renderer, camera, lighting
   rig, resize, render loop, and pointer picking that knows the
   difference between a click and an orbit-drag.

   Usage:
     const stage = createStage({ container, cameraPos: [0, 5, 8] });
     stage.pickable(mesh, { id: 'thing' });
     stage.onPick((mesh, data) => ...);
     stage.onFrame((dt, t) => ...);
     stage.start();
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export { THREE };

export function createStage(opts = {}) {
  const {
    container,
    fov        = 45,
    near       = 0.1,
    far        = 300,
    cameraPos  = [0, 5, 8],
    lookAt     = [0, 0, 0],
    background = 0x0d1117,
    fog        = null,        // [near, far] to enable
    shadows    = true,
    orbit      = true,
    orbitLimits = {},
    fit        = null,        // { width, height, distance? } in world units
  } = opts;

  // ---- Renderer -------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // ---- Scene ----------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  if (fog) scene.fog = new THREE.Fog(background, fog[0], fog[1]);

  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  camera.position.set(...cameraPos);
  camera.lookAt(new THREE.Vector3(...lookAt));

  // ---- Controls -------------------------------------------------
  let controls = null;
  if (orbit) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...lookAt);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    Object.assign(controls, orbitLimits);
    controls.update();
  }

  // ---- Resize ---------------------------------------------------
  // `fit` keeps a required slice of the scene on screen whatever shape the
  // frame is: { width, height } in world units, optionally measured at a
  // `distance` other than the camera's home distance. On a frame too narrow
  // to show that width at the base fov, the fov widens instead of cropping.
  const baseFov = fov;
  const homeDistance = new THREE.Vector3(...cameraPos)
    .distanceTo(new THREE.Vector3(...lookAt));

  function applyFit() {
    if (!fit) return;
    const d = fit.distance ?? homeDistance;
    const forHeight = fit.height ? 2 * Math.atan((fit.height / 2) / d) : 0;
    const forWidth = fit.width ? 2 * Math.atan((fit.width / 2) / (d * camera.aspect)) : 0;
    camera.fov = Math.max(
      baseFov,
      THREE.MathUtils.radToDeg(forHeight),
      THREE.MathUtils.radToDeg(forWidth),
    );
  }

  /* How many real pixels to render, given a CSS size.

     devicePixelRatio is re-read every time, because dragging a window to a
     screen with different scaling changes it and a ratio fixed at startup
     leaves the canvas blurry or oversized on the new display.

     It is then capped by a fragment budget. A Retina laptop or a 4K screen
     at 150% asks for 2x on an already large frame, which is 10M+ fragments
     a frame — enough to drop the shadowed scenes below 60fps on integrated
     graphics for detail nobody can see. Never below 1: rendering under CSS
     resolution would visibly soften the label text. */
  const MAX_FRAGMENTS = 4_500_000;

  function pixelRatioFor(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const budget = Math.sqrt(MAX_FRAGMENTS / (w * h));
    return Math.min(dpr, Math.max(1, budget));
  }

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    if (!w || !h) return;                       // hidden container, nothing to do

    renderer.setPixelRatio(pixelRatioFor(w, h));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    applyFit();
    camera.updateProjectionMatrix();
  }

  /* Checked every frame, and the only thing we actually rely on. Resize
     events are not trustworthy here: inside an iframe they can be missed
     entirely, and moving a window to a screen with different scaling changes
     devicePixelRatio without changing any CSS size. Comparing the drawing
     buffer against the displayed size costs two property reads and catches
     every case. */
  function syncSize() {
    const cv = renderer.domElement;
    if (!cv.clientWidth || !cv.clientHeight) return;
    // Same ratio resize() would pick, or this disagrees with it every frame
    // and calls resize() forever.
    const ratio = pixelRatioFor(cv.clientWidth, cv.clientHeight);
    const w = Math.floor(cv.clientWidth * ratio);
    const h = Math.floor(cv.clientHeight * ratio);
    if (cv.width !== w || cv.height !== h) resize();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  window.addEventListener('resize', resize);
  resize();

  // ---- Picking --------------------------------------------------
  // A mesh becomes clickable via stage.pickable(mesh, data). We walk
  // up the parent chain on hit so nested groups still resolve to the
  // registered object.
  const pickables = [];
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickHandlers = [];
  const hoverHandlers = [];
  let hovered = null;
  let downAt = null;

  function toNDC(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    return ndc;
  }

  function resolve(hitObject) {
    let o = hitObject;
    while (o) {
      if (o.userData.__pick) return o;
      o = o.parent;
    }
    return null;
  }

  function castAt(ev) {
    // Pointer events fire between frames, so world matrices can still
    // hold last frame's transforms (or none at all for objects added
    // since the last render). Without this, clicks on freshly placed
    // or freshly animated objects silently miss.
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(toNDC(ev), camera);
    const hits = raycaster.intersectObjects(pickables, true);
    for (const h of hits) {
      const target = resolve(h.object);
      if (target && target.visible && target.userData.__pickEnabled !== false) {
        return { target, point: h.point, distance: h.distance };
      }
    }
    return null;
  }

  renderer.domElement.addEventListener('pointerdown', (ev) => {
    downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() };
  });

  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (!downAt) return;
    const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y);
    const held = performance.now() - downAt.t;
    downAt = null;
    if (moved > 6 || held > 700) return;   // that was a drag, not a click
    const hit = castAt(ev);
    pickHandlers.forEach((fn) => fn(hit ? hit.target : null, hit ? hit.target.userData.__pick : null, hit));
  });

  renderer.domElement.addEventListener('pointermove', (ev) => {
    if (!hoverHandlers.length && !pickables.length) return;
    const hit = castAt(ev);
    const next = hit ? hit.target : null;
    if (next !== hovered) {
      const prev = hovered;
      hovered = next;
      renderer.domElement.style.cursor = next ? 'pointer' : '';
      hoverHandlers.forEach((fn) => fn(next, prev));
    }
  });

  // ---- Loop -----------------------------------------------------
  const frameHandlers = [];
  let running = false;
  let rafId = 0;
  let last = 0;
  let elapsed = 0;

  function tick(now) {
    rafId = requestAnimationFrame(tick);
    syncSize();
    const dt = Math.min((now - last) / 1000, 0.05);  // clamp after a tab switch
    last = now;
    elapsed += dt;
    // OrbitControls.update() re-applies its own lookAt every frame, so a
    // prototype that takes the camera over (disabling the controls) would
    // have its aim overwritten. Only drive the camera while it owns it.
    if (controls?.enabled) controls.update();
    for (const fn of frameHandlers) fn(dt, elapsed);
    renderer.render(scene, camera);
  }

  const stage = {
    scene, camera, renderer, controls, raycaster,

    pickable(obj, data = {}) {
      obj.userData.__pick = data;
      if (!pickables.includes(obj)) pickables.push(obj);
      return obj;
    },
    unpickable(obj) {
      obj.userData.__pick = undefined;
      const i = pickables.indexOf(obj);
      if (i >= 0) pickables.splice(i, 1);
    },
    setPickEnabled(obj, on) { obj.userData.__pickEnabled = on; },
    clearPickables() { pickables.length = 0; },

    onPick(fn)  { pickHandlers.push(fn); return () => pickHandlers.splice(pickHandlers.indexOf(fn), 1); },
    onHover(fn) { hoverHandlers.push(fn); return () => hoverHandlers.splice(hoverHandlers.indexOf(fn), 1); },
    onFrame(fn) { frameHandlers.push(fn); return () => frameHandlers.splice(frameHandlers.indexOf(fn), 1); },

    start() { if (!running) { running = true; last = performance.now(); tick(last); } },
    stop()  { running = false; cancelAnimationFrame(rafId); },
    resize,

    dispose() {
      stage.stop();
      ro.disconnect();
      window.removeEventListener('resize', resize);
      controls?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };

  return stage;
}

/* ------------------------------------------------------------------
   Lighting rig - one call, consistent look across every prototype.
   ------------------------------------------------------------------ */
export function addLightRig(scene, opts = {}) {
  const {
    sky = 0x9fb6d6, ground = 0x1a1f28, hemi = 0.55,
    keyColor = 0xfff3dd, keyIntensity = 2.4,
    keyPos = [6, 10, 6],
    shadowSize = 14, shadowMapSize = 2048,
    fillColor = 0x4a6fa5, fillIntensity = 0.6,
  } = opts;

  const hemiLight = new THREE.HemisphereLight(sky, ground, hemi);
  scene.add(hemiLight);

  const key = new THREE.DirectionalLight(keyColor, keyIntensity);
  key.position.set(...keyPos);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -shadowSize;
  key.shadow.camera.right = shadowSize;
  key.shadow.camera.top = shadowSize;
  key.shadow.camera.bottom = -shadowSize;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const fill = new THREE.DirectionalLight(fillColor, fillIntensity);
  fill.position.set(-7, 5, -6);
  scene.add(fill);

  return { hemiLight, key, fill };
}

/* ------------------------------------------------------------------
   Small geometry / material helpers for the low-poly look.
   ------------------------------------------------------------------ */
export function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: o.roughness ?? 0.75,
    metalness: o.metalness ?? 0.05,
    flatShading: o.flat ?? false,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
}

/** Box with softened edges - the single biggest "looks designed" win. */
export function roundedBox(w, h, d, r = 0.04, seg = 2) {
  // Clamp the bevel: a radius at or past half the smallest dimension
  // collapses that axis to zero, which silently produces a degenerate
  // mesh that raycasting cannot hit.
  r = Math.max(0, Math.min(r, Math.min(w, h, d) * 0.4));
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  // Cheap bevel: nudge every vertex toward the box centre along its normal.
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.x = Math.sign(v.x) * Math.max(0, Math.abs(v.x) - r);
    v.y = Math.sign(v.y) * Math.max(0, Math.abs(v.y) - r);
    v.z = Math.sign(v.z) * Math.max(0, Math.abs(v.z) - r);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function box(w, h, d, color, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, o));
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  return m;
}

/** Draw to a 2D canvas and get a colour-correct texture back. */
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------
   Tiny tween helper - avoids pulling in an animation library.
   tween({ from, to, ms, ease, onUpdate, onDone }) driven by rAF.
   ------------------------------------------------------------------ */
export const ease = {
  outCubic:  (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic:(t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack:   (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  outElastic:(t) => (t === 0 || t === 1) ? t
                    : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
};

export function tween({ from = 0, to = 1, ms = 400, easing = ease.outCubic, onUpdate, onDone }) {
  const t0 = performance.now();
  return new Promise((resolve) => {
    let settled = false;

    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      onUpdate?.(to, easing(1), 1);
      onDone?.();
      resolve();
    }

    function step(now) {
      if (settled) return;
      const p = Math.min(1, (now - t0) / ms);
      if (p >= 1) return finish();
      const e = easing(p);
      onUpdate?.(from + (to - from) * e, e, p);
      requestAnimationFrame(step);
    }

    // Background tabs suspend requestAnimationFrame. Without this the
    // await chain would never resolve and the prototype would lock up
    // as soon as the learner switched tabs mid-animation.
    const watchdog = setTimeout(finish, ms + 120);

    requestAnimationFrame(step);
  });
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
