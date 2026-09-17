/* ============================================================
   person.js - a low-poly character whose mood you can see.

   Built from primitives so there are no model files to ship.
   setMood(m) takes -1 (annoyed) to 1 (pleased) and animates
   brows, mouth, head tilt and arms between states:

     mood  1   brows up, smile, open posture
     mood  0   level brows, flat mouth, arms at the side
     mood -1   brows down, frown, arms folded, leaning back
   ============================================================ */

import { THREE, mat, tween, ease } from './engine.js';

export function createPerson({
  skin = 0xe2b08c,
  shirt = 0x3d6fb6,
  trousers = 0x2b313c,
  hair = 0x3b2a20,
} = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();          // everything above the legs leans
  root.add(body);

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.95, 16), mat(trousers));
  legs.position.y = 0.48;
  root.add(legs);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.43, 0.75, 6, 18), mat(shirt, { roughness: 0.85 }));
  torso.position.y = 1.4;
  body.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 12), mat(skin));
  neck.position.y = 2.0;
  body.add(neck);

  // ---- Head ----
  const head = new THREE.Group();
  head.position.y = 2.36;
  body.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.37, 28, 20), mat(skin, { roughness: 0.7 }));
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.385, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.46),
    mat(hair, { roughness: 0.9 }),
  );
  hairCap.position.set(0, 0.02, -0.02);
  hairCap.rotation.x = -0.25;
  head.add(skull, hairCap);

  const dark = mat(0x1a1d24, { roughness: 0.4 });
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), dark);
    e.position.set(0.13 * s, 0.05, 0.33);
    head.add(e);
    return e;
  });

  const brows = [-1, 1].map((s) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.032, 0.03), dark);
    b.position.set(0.13 * s, 0.17, 0.34);
    head.add(b);
    return b;
  });

  // Mouth in two halves so each outer end can lift or drop
  const mouth = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, -0.15, 0.345);
    const half = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.026, 0.02), mat(0x7a3b35));
    half.position.x = 0.05 * s;
    pivot.add(half);
    head.add(pivot);
    return pivot;
  });

  // ---- Arms, pivoting at the shoulder ----
  const arms = [-1, 1].map((s) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.5 * s, 1.78, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.7, 4, 10), mat(shirt, { roughness: 0.85 }));
    upper.position.y = -0.42;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(skin));
    hand.position.y = -0.86;
    shoulder.add(upper, hand);
    body.add(shoulder);
    return shoulder;
  });

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ---- Mood ----
  let current = 0;
  let token = 0;

  function pose(m) {
    const angry = Math.max(0, -m);
    const happy = Math.max(0, m);

    brows[0].rotation.z = -0.5 * angry + 0.12 * happy;
    brows[1].rotation.z = 0.5 * angry - 0.12 * happy;
    brows.forEach((b) => { b.position.y = 0.17 + 0.035 * happy - 0.02 * angry; });

    mouth[0].rotation.z = -0.55 * m;
    mouth[1].rotation.z = 0.55 * m;

    head.rotation.x = -0.1 * angry + 0.06 * happy;
    body.rotation.x = -0.12 * angry + 0.07 * happy;   // lean back when annoyed

    // Arms fold in once mood drops past a guarded threshold
    const fold = Math.min(1, Math.max(0, (angry - 0.3) / 0.5));
    arms[0].rotation.set(-1.25 * fold, 0, -0.12 + 1.05 * fold);
    arms[1].rotation.set(-1.25 * fold, 0, 0.12 - 1.05 * fold);
  }
  pose(0);

  function setMood(target, ms = 700) {
    target = Math.max(-1, Math.min(1, target));
    const t = ++token;
    const from = current;
    return tween({
      ms,
      easing: ease.inOutCubic,
      onUpdate: (_, e) => {
        if (t !== token) return;
        current = from + (target - from) * e;
        pose(current);
      },
    });
  }

  // Idle breathing, so a still character does not look frozen
  function idle(t) {
    torso.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
    head.position.y = 2.36 + Math.sin(t * 1.6) * 0.006;
  }

  return { root, head, setMood, get mood() { return current; }, idle };
}

/** Plain-language read of a mood, for recaps that should not say right/wrong. */
export function describeMood(m) {
  if (m >= 0.45) return 'relaxed, leaning in';
  if (m >= 0.1) return 'calmer, listening';
  if (m > -0.25) return 'guarded';
  if (m > -0.6) return 'tense, replies getting shorter';
  return 'arms folded, leaning back';
}
