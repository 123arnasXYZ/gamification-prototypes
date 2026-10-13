/* ============================================================
   22 — Build a management simulation
   Five days in a support office. Four faceless figures, three lanes
   of work painted on the floor, and a board of four bars that pull
   against each other. The learner runs the place: pick a person,
   pick a lane, spend one of three one-off day actions, end the day.

   Nothing is scored and nothing is a question. The queue is physical
   — ticket blocks pile up in front of the desk — and most of the
   consequences arrive a day or two after the decision that caused
   them, so the staffing that was right yesterday is what is being
   paid for today. Friday ends with a handover, not a mark.
   ============================================================ */

import { THREE, createStage, addLightRig, mat, box, roundedBox, canvasTexture, tween, ease, wait } from '../../shared/engine.js';
import { el, toast, hideLoading } from '../../shared/ui.js';
import { createBridge } from '../../shared/embed.js';
import {
  meta, lanes, people, measures, rules,
  opening, events, eventNotes, dayActions, actionNotes,
  delayed, strainNotes, handover,
} from './content.js';

const bridge = createBridge('management-sim');

/* ---------------- Palette ---------------- */
const C = {
  blue:  0x2757e2,
  mint:  0x5fe0b0,
  amber: 0xe0a32a,
  red:   0xe0234e,
};

/* One number the colour rule runs on: 1 is a good place to be.
   Queue and Risk are inverted, so a high reading there scores the
   same as a low reading anywhere else. */
const health = (m, v) => (m.inverted ? 1 - v / 100 : v / 100);
const colourFor = (h) => (h >= 0.55 ? C.mint : h >= 0.32 ? C.amber : C.red);
const strainColour = (s) => (s <= rules.strainBands.calm ? C.mint : s <= rules.strainBands.strained ? C.amber : C.red);

/* ---------------- Floor geometry ---------------- */
const LANE_X = { desk: -5.1, projects: 0, admin: 5.1 };
const LANE_Z = 0.8;
const LANE_W = 4.4;
const LANE_D = 4.6;
const SLOTS = [[-1.0, -0.8], [1.0, -0.8], [-1.0, 0.8], [1.0, 0.8]];
const WAIT = (i) => [-1.65 + i * 1.1, 5.75];
const OUT = (i) => [6.6 + i * 0.8, 6.4];

const MAX_TICKETS = 20;
const BOARD = { x: 0, z: -3.6, base: 0.2, span: 2.3, gap: 1.15 };

/* ---------------- Stage ---------------- */
const stage = createStage({
  container: document.getElementById('stage'),
  fov: 42,
  cameraPos: [0, 7.4, 13.2],
  lookAt: [0, 1.2, 0.7],
  background: 0xe6eaf1,
  fog: [24, 56],
  fit: { width: 19, height: 11.5 },
  orbitLimits: {
    minPolarAngle: 0.72, maxPolarAngle: 1.36,
    minAzimuthAngle: -0.45, maxAzimuthAngle: 0.45,
    minDistance: 11, maxDistance: 20,
  },
});

addLightRig(stage.scene, {
  sky: 0xf4f7fc, ground: 0xbac3cf, hemi: 1.0,
  keyColor: 0xfff6e8, keyIntensity: 1.75, keyPos: [-6, 14, 10],
  shadowSize: 16, fillColor: 0x6d8ec0, fillIntensity: 0.45,
});

/* ---------------- The office ---------------- */
{
  const floor = box(52, 0.2, 32, 0xd4dae3, { roughness: 1 });
  floor.position.y = -0.1;
  const wall = box(52, 11, 0.3, 0xeff2f7, { roughness: 0.98 });
  wall.position.set(0, 5.5, -4.8);
  stage.scene.add(floor, wall);
}

/* Three lanes painted on the floor. The pad itself is the drop
   target: a click anywhere inside it moves the selected person in. */
const lanePads = lanes.map((lane) => {
  const g = new THREE.Group();
  g.position.set(LANE_X[lane.id], 0, LANE_Z);

  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(LANE_W, LANE_D),
    mat(0xc6ced9, { roughness: 1 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.015;
  pad.receiveShadow = true;

  const edge = new THREE.Mesh(
    new THREE.PlaneGeometry(LANE_W + 0.22, LANE_D + 0.22),
    mat(0xffffff, { roughness: 1, transparent: true, opacity: 0.55 }),
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = 0.008;

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 0.9),
    new THREE.MeshBasicMaterial({ map: laneTexture(lane), transparent: true, depthWrite: false }),
  );
  sign.rotation.x = -Math.PI / 2;
  sign.position.set(0, 0.03, -LANE_D / 2 - 0.62);

  g.add(edge, pad, sign);
  stage.scene.add(g);
  stage.pickable(pad, { kind: 'lane', id: lane.id });
  return { def: lane, group: g, pad, edge };
});
const padById = Object.fromEntries(lanePads.map((p) => [p.def.id, p]));

/* The counter the customers stand at, and the queue they make. */
{
  const counter = box(4.2, 0.95, 0.55, 0xf2f4f8, { roughness: 0.85 });
  counter.position.set(LANE_X.desk, 0.475, LANE_Z + LANE_D / 2 + 0.5);
  const top = box(4.4, 0.1, 0.75, 0xaeb7c4, { roughness: 0.7 });
  top.position.set(LANE_X.desk, 0.98, LANE_Z + LANE_D / 2 + 0.5);
  stage.scene.add(counter, top);
}

const tickets = [];
{
  const geo = roundedBox(0.52, 0.28, 0.52, 0.05);
  for (let i = 0; i < MAX_TICKETS; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const m = new THREE.Mesh(geo, mat(C.amber, { roughness: 0.65 }));
    m.position.set(LANE_X.desk - 1.0 + col * 0.68, 0.14 + row * 0.3, LANE_Z + LANE_D / 2 + 1.75);
    m.rotation.y = (Math.random() - 0.5) * 0.2;
    m.castShadow = true;
    m.visible = false;
    stage.scene.add(m);
    tickets.push(m);
  }
}

/* ---------------- The board ---------------- */
const heightFor = (v) => 0.12 + (v / 100) * BOARD.span;

const bars = measures.map((m, i) => {
  const g = new THREE.Group();
  g.position.set(BOARD.x + (i - 1.5) * BOARD.gap, 0, BOARD.z);

  const plinth = new THREE.Mesh(roundedBox(1.0, 0.2, 1.0, 0.05), mat(0xaeb7c4, { roughness: 0.85 }));
  plinth.position.y = 0.1;
  plinth.receiveShadow = true;

  const trackGeo = roundedBox(0.6, BOARD.span + 0.12, 0.6, 0.04);
  trackGeo.translate(0, (BOARD.span + 0.12) / 2, 0);
  const track = new THREE.Mesh(trackGeo, mat(0xffffff, { roughness: 1, transparent: true, opacity: 0.42 }));
  track.position.y = 0.2;

  const barGeo = roundedBox(0.72, 1, 0.72, 0.05);
  barGeo.translate(0, 0.5, 0);
  const fill = new THREE.Mesh(barGeo, mat(colourFor(health(m, m.start)), { roughness: 0.6 }));
  fill.position.y = 0.2;
  fill.scale.y = heightFor(m.start);
  fill.castShadow = true;

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.75, 0.72),
    new THREE.MeshBasicMaterial({ map: boardTexture(m), transparent: true, depthWrite: false }),
  );
  label.position.y = BOARD.span + 0.78;

  g.add(plinth, track, fill, label);
  stage.scene.add(g);
  return { def: m, group: g, fill, label };
});
const barById = Object.fromEntries(bars.map((b) => [b.def.id, b]));

/* ---------------- The people ---------------- */
const figures = people.map((p) => {
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.5, 6, 16),
    mat(C.mint, { roughness: 0.7 }),
  );
  body.position.y = 0.52;
  body.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 14), body.material);
  head.position.y = 1.16;
  head.castShadow = true;

  // Selection ring, hidden until this person is picked up
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.055, 8, 28),
    mat(C.blue, { roughness: 0.5, emissive: C.blue, emissiveIntensity: 0.35 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.visible = false;

  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.45),
    new THREE.MeshBasicMaterial({ map: nameTexture(p.name), transparent: true, depthWrite: false }),
  );
  tag.position.y = 1.72;
  // The tag is a wide billboarded plane; without this it swallows
  // clicks aimed at the lane behind the person.
  tag.raycast = () => {};

  g.add(ring, body, head, tag);
  g.userData = { person: p, body, ring, tag };
  stage.scene.add(g);
  stage.pickable(g, { kind: 'person', id: p.id });
  return g;
});
const figureById = Object.fromEntries(figures.map((f) => [f.userData.person.id, f]));
const personById = Object.fromEntries(people.map((p) => [p.id, p]));

// Labels face the camera, so names stay readable as the view orbits
stage.onFrame((dt, t) => {
  for (const b of bars) b.label.quaternion.copy(stage.camera.quaternion);
  for (const f of figures) {
    f.userData.tag.quaternion.copy(stage.camera.quaternion);
    if (f.userData.ring.visible) f.userData.ring.rotation.z = t * 1.4;
  }
});

/* ---------------- UI ---------------- */
document.getElementById('eyebrow').textContent = meta.eyebrow;
document.getElementById('title').textContent = meta.title;
const panel = document.getElementById('panel');
const hintNode = document.getElementById('hint');
document.getElementById('restart').addEventListener('click', restart);

/* ---------------- State ----------------
   day       1..meta.days
   lanes     laneId -> [personId], the staffing the learner set
   measures  the four readings, 0–100, carried across the week
   strain    personId -> 0..100, their own week
   events    what has actually fired, in order
   pending   consequences scheduled for a later day
   out       personId -> the day number they are not in
   prevLane  where each person stood yesterday (same-lane strain)   */
const state = {
  day: 1,
  days: meta.days,
  lanes: {},
  measures: {},
  strain: {},
  events: [],
  pending: [],
  firedDelayed: [],
  out: {},
  prevLane: {},
  dropped: [],
  used: [],
  halfDay: null,
  rested: null,
  current: null,
  schedule: [],
  selected: null,
  busy: false,
  moving: false,
  over: false,
};

/** Hoisted: paintFigures runs from restart() during start-up. */
function isOut(id) { return state.out[id] === state.day; }

stage.onPick((obj, data) => {
  if (!data || state.over || state.busy || state.moving) return;
  if (data.kind === 'person') {
    if (state.selected === data.id) select(null);
    else select(data.id);
  } else if (data.kind === 'lane' && state.selected) {
    assign(state.selected, data.id);
  }
});

stage.start();
if (new URLSearchParams(location.search).has('debug')) {
  window.__manage = { state, assign, endDay, restart };
}
requestAnimationFrame(() => { hideLoading(); bridge.ready(); });
restart();

/* ============================================================
   Actions
   ============================================================ */

/** Pick a person up (or put them down again). */
function select(id) {
  state.selected = id;
  for (const f of figures) {
    const on = f.userData.person.id === id;
    f.userData.ring.visible = on;
    f.position.y = on ? 0.14 : 0;
  }
  renderHint();
}

/** Move someone into a lane. laneId null stands them down. */
async function assign(personId, laneId) {
  if (state.over || state.busy || state.moving) return;
  const p = personById[personId];
  if (!p) return;
  if (laneId && !padById[laneId]) return;

  if (isOut(personId)) {
    toast(fill(meta.outUnavailable, { name: p.name }), 'bad');
    select(null);
    return;
  }

  const from = laneOf(personId);
  if (from === laneId) {
    toast(laneId
      ? fill(meta.alreadyThere, { name: p.name, lane: padById[laneId].def.name })
      : fill(meta.stoodDown, { name: p.name }));
    select(null);
    return;
  }

  if (from) state.lanes[from] = state.lanes[from].filter((x) => x !== personId);
  if (laneId) state.lanes[laneId].push(personId);

  select(null);
  state.moving = true;
  await arrange(true);
  state.moving = false;

  toast(laneId
    ? fill(meta.movedTo, { name: p.name, lane: padById[laneId].def.name })
    : fill(meta.stoodDown, { name: p.name }));
  renderDay();
}

/** Spend one of the three one-off day actions. */
async function useAction(id) {
  if (state.over || state.busy || state.moving) return;
  const act = dayActions.find((a) => a.id === id);
  if (!act) return;
  if (state.used.includes(id)) { toast(meta.actionSpent, 'bad'); return; }

  state.busy = true;
  state.used.push(id);
  renderDay();

  if (act.restMostStrained) {
    const who = mostStrained(available());
    if (who) {
      state.rested = who.id;
      const lane = laneOf(who.id);
      if (lane) state.lanes[lane] = state.lanes[lane].filter((x) => x !== who.id);
      await arrange(true);
      toast(fill(actionNotes.rest, { name: who.name }), 'good');
    }
  }

  if (act.strainAll) {
    for (const p of available()) state.strain[p.id] = clamp(state.strain[p.id] + act.strainAll);
    paintFigures();
  }

  toast(act.note, netKind(act.now), 3400);
  if (act.now) await applyEffects(act.now);
  if (act.later) schedule(act.id, act.later);

  state.busy = false;
  renderDay();
}

/* ============================================================
   The day
   ============================================================ */

/** Draw the day's event and let it bite before anyone is moved. */
async function beginDay() {
  const ev = { ...state.schedule[state.day - 1] };
  state.current = ev;
  state.halfDay = null;
  state.rested = null;

  // Anybody who dropped out or called in sick yesterday is back
  for (const p of people) {
    if (state.out[p.id] === state.day - 1) toast(fill(strainNotes.returns, { name: p.name }));
  }

  if (ev.kind === 'sick') {
    const who = mostStrained(available()) ?? people[0];
    ev.who = who.id;
    ev.name = who.name;
    state.out[who.id] = state.day;
    const lane = laneOf(who.id);
    if (lane) state.lanes[lane] = state.lanes[lane].filter((x) => x !== who.id);
    toast(fill(eventNotes.sick, { name: who.name }), 'bad');
  }

  if (ev.kind === 'starter') {
    const who = leastStrained(available()) ?? people[0];
    ev.who = who.id;
    ev.name = who.name;
    state.halfDay = who.id;
    toast(fill(eventNotes.starter, { name: who.name }));
  }

  state.events.push({ day: state.day, id: ev.id, title: evTitle(ev), line: evLine(ev) });
  await arrange(true);
  paintFigures();

  if (ev.now) await applyEffects(ev.now);
  renderDay();
  renderHint();
}

/** Resolve the day, then roll into the next one. */
async function endDay() {
  if (state.over || state.busy || state.moving) return;
  state.busy = true;
  renderDay();

  const ev = state.current;
  const day = state.day;

  /* 1. Anything scheduled for today arrives first — this is the part
        the learner cannot connect to today's decisions. */
  const due = state.pending.filter((p) => p.day === day);
  state.pending = state.pending.filter((p) => p.day !== day);
  for (const p of due) {
    toast(p.line, netKind(p.effect), 4200);
    await applyEffects(p.effect);
    await wait(260);
  }

  /* 2. Today's staffing against what today asked for. */
  const counts = effectiveCounts();
  const need = needsFor(ev);
  const avg = averageStrain();

  await applyEffects({
    queue:    jitter(rules.queueMove(counts.desk, need.desk)),
    progress: jitter(rules.progressMove(counts.projects, need.projects)),
    risk:     jitter(rules.riskMove(counts.admin, need.admin)),
    morale:   jitter(rules.moraleMove(avg)),
  });

  /* 3. Risk normally keeps its teeth until Friday. An audit landing
        while it is already high is the exception. */
  if (ev.kind === 'audit' && state.measures.risk >= rules.riskBiteAt) {
    toast(ev.auditBite, 'bad', 4600);
    await flashBar(barById.risk);
    await applyEffects(ev.biteEffect);
  }

  /* 4. Schedule what today will cost later. */
  const snapshot = { counts, measures: { ...state.measures }, eventId: ev.id };
  for (const d of delayed) {
    if (d.once && state.firedDelayed.includes(d.id)) continue;
    if (!d.test(snapshot, rules)) continue;
    if (schedule(d.id, d)) state.firedDelayed.push(d.id);
  }

  /* 5. Strain, and anybody it takes out. */
  await settleStrain();

  bridge.progress(day / state.days, {
    day,
    measures: rounded(),
    strain: { ...state.strain },
  });

  state.day += 1;
  state.busy = false;

  if (state.day > state.days) finish();
  else await beginDay();
}

/** Each day costs each person something; a rest gives some back. */
async function settleStrain() {
  for (const p of people) {
    const out = isOut(p.id);
    const lane = laneOf(p.id);
    const working = !out && !!lane && state.rested !== p.id;
    const sameLane = working && state.prevLane[p.id] === lane;
    state.strain[p.id] = clamp(state.strain[p.id] + rules.strainMove(p, { working, sameLane, lane }));
    state.prevLane[p.id] = working ? lane : null;
    if (working && sameLane && state.strain[p.id] >= rules.strainBands.strained && state.strain[p.id] < rules.strainDropOutAt) {
      toast(fill(strainNotes.rising, { name: p.name }), 'bad');
    }
  }
  paintFigures();

  // Anybody over the line is not in tomorrow
  for (const p of people) {
    if (state.strain[p.id] < rules.strainDropOutAt || isOut(p.id)) continue;
    state.out[p.id] = state.day + 1;
    state.dropped.push(p.id);
    state.strain[p.id] = rules.strainAfterDropOut;
    const lane = laneOf(p.id);
    if (lane) state.lanes[lane] = state.lanes[lane].filter((x) => x !== p.id);
    toast(fill(strainNotes.dropOut, { name: p.name }), 'bad', 4400);
    await applyEffects({ morale: rules.moraleOnDropOut });
  }
  paintFigures();
  await arrange(true);
}

/* ============================================================
   Measures
   ============================================================ */

/** Move the measures and grow the bars and the ticket pile together. */
async function applyEffects(effects) {
  const moves = Object.entries(effects || {})
    .filter(([id]) => barById[id])
    .map(([id, delta]) => {
      const from = state.measures[id];
      return { id, from, to: clamp(from + delta) };
    })
    .filter((mv) => Math.abs(mv.to - mv.from) > 0.01);
  if (!moves.length) return;

  await tween({
    ms: 720, easing: ease.inOutCubic,
    onUpdate: (_, e) => {
      for (const mv of moves) {
        state.measures[mv.id] = mv.from + (mv.to - mv.from) * e;
        paintBar(barById[mv.id]);
      }
      paintQueue();
    },
  });
  for (const mv of moves) {
    state.measures[mv.id] = mv.to;
    paintBar(barById[mv.id]);
  }
  paintQueue();
}

/** Park a consequence on a later day, once per cause at a time. */
function schedule(id, spec) {
  if (state.pending.some((p) => p.id === id)) return false;
  state.pending.push({
    id,
    day: state.day + (spec.delay ?? 1),
    effect: spec.effect,
    line: spec.line,
  });
  return true;
}

/* ============================================================
   Panels
   ============================================================ */
function renderDay() {
  if (state.over) return;
  const ev = state.current;
  if (!ev) return;
  const need = needsFor(ev);
  const have = effectiveCounts();
  const last = state.day >= state.days;

  panel.replaceChildren(el('div.day', {}, [
    el('div.head', {}, [
      el('div.eyebrow', {}, meta.dayLabel.replace('{n}', state.day).replace('{total}', state.days)),
    ]),
    el('h2', {}, evTitle(ev)),
    el('p.line', {}, evLine(ev)),

    el('p.sub', {}, meta.needsLabel),
    el('div.needs', {}, lanes.map((lane) => el('div.need', {
      html: meta.needTemplate
        .replace('{lane}', `<b>${lane.name}</b>`)
        .replace('{need}', word(need[lane.id]))
        .replace('{have}', `<i>${word(have[lane.id])}</i>`),
    }))),

    el('p.sub', {}, meta.actionsLabel),
    el('div.acts', {}, dayActions.map((a) => el('button.act', {
      type: 'button',
      disabled: state.busy || state.used.includes(a.id) || null,
      onClick: () => useAction(a.id),
    }, [
      document.createTextNode(a.label),
      el('small', {}, a.note),
    ]))),

    el('div.close', {}, el('button.btn.primary', {
      type: 'button',
      disabled: state.busy || null,
      onClick: endDay,
    }, last ? meta.endWeek : meta.endDay)),
  ]));
}

function renderHint() {
  if (state.over) { hintNode.textContent = meta.boardHint; return; }
  if (state.selected) {
    hintNode.textContent = fill(meta.placeHint, { name: personById[state.selected].name });
  } else {
    hintNode.textContent = state.day === 1 ? meta.intro : meta.pickHint;
  }
}

/* ---------------- The handover ---------------- */
function finish() {
  state.over = true;
  select(null);
  const vals = rounded();

  /* The learner is never shown a score. The host page gets one anyway:
     average health, i.e. how balanced the four were left. */
  const score = measures.reduce((s, m) => s + health(m, vals[m.id]), 0) / measures.length;
  bridge.complete({
    passed: true,
    score: Math.max(0, Math.min(1, score)),
    detail: {
      measures: vals,
      strain: { ...state.strain },
      events: state.events.map((e) => e.id),
      dropped: [...state.dropped],
      actions: [...state.used],
    },
  });

  const nextUp = worstMeasure();
  const sections = [
    el('div.eyebrow', {}, handover.eyebrow),
    el('h2', {}, handover.title),
    el('p.lead', {}, handover.lead),

    el('section', {}, [
      el('p.sub', {}, handover.queueLabel),
      el('div.beat', { html: band(handover.queueBands, vals.queue).line }),
    ]),

    el('section', {}, [
      el('p.sub', {}, handover.peopleLabel),
      ...people.map((p) => {
        /* A day off does not undo the week that caused it: anybody who
           dropped out is never described as fresh, whatever the day of
           rest did to their reading. */
        const s = state.dropped.includes(p.id)
          ? Math.max(state.strain[p.id], rules.strainBands.strained)
          : state.strain[p.id];
        return el('div.beat' + strainClass(s), {
          html: fill(band(handover.personBands, s).line, { name: p.name })
            + (state.dropped.includes(p.id) ? ' ' + fill(handover.droppedNote, { name: p.name }) : ''),
        });
      }),
    ]),

    el('section', {}, [
      el('p.sub', {}, handover.undoneLabel),
      el('div.beat', { html: band(handover.progressBands, vals.progress).line }),
      el('div.beat', { html: band(handover.riskBands, vals.risk).line }),
    ]),

    el('section', {}, [
      el('p.sub', {}, handover.nextLabel),
      el('div.beat.next', { html: (handover.nextBands.find((b) => b.id === nextUp) ?? handover.nextBands[0]).line }),
    ]),

    el('section', {}, [
      el('p.sub', {}, handover.eventsLabel),
      ...state.events.map((e) => el('div.beat', { html: `<b>${e.title}</b> — ${e.line}` })),
    ]),
  ];

  if (state.pending.length) {
    sections.push(el('section', {}, [
      el('p.sub', {}, handover.pendingLabel),
      ...state.pending.map((p) => el('div.beat.warn', { html: p.line })),
    ]));
  }

  sections.push(el('p.point', {}, handover.variability));
  sections.push(el('button.btn.primary', { type: 'button', onClick: restart }, handover.again));

  panel.replaceChildren(el('div.over', {}, sections));
  renderHint();
}

/* ---------------- Restart ---------------- */
function restart() {
  state.day = 1;
  state.measures = Object.fromEntries(measures.map((m) => [m.id, m.start]));
  state.strain = Object.fromEntries(people.map((p) => [p.id, 10 + Math.round(Math.random() * 10)]));
  state.events = [];
  state.pending = [];
  state.firedDelayed = [];
  state.out = {};
  state.prevLane = Object.fromEntries(people.map((p) => [p.id, null]));
  state.dropped = [];
  state.used = [];
  state.halfDay = null;
  state.rested = null;
  state.selected = null;
  state.busy = false;
  state.moving = false;
  state.over = false;

  /* A plausible Monday to argue with, rather than an empty floor. */
  state.lanes = { desk: [people[0].id, people[3].id], projects: [people[2].id], admin: [people[1].id] };

  /* The week is dealt fresh every run: day one is always the Monday
     backlog, the rest are drawn from the pool in a new order. */
  state.schedule = [opening, ...shuffle([...events]).slice(0, state.days - 1)];

  for (const b of bars) paintBar(b);
  paintQueue();
  paintFigures();
  arrange(false);
  beginDay();
  bridge.restart();
}

/* ============================================================
   Scene painting
   ============================================================ */
function paintBar(bar) {
  const v = state.measures[bar.def.id];
  bar.fill.scale.y = heightFor(v);
  bar.fill.material.color.setHex(colourFor(health(bar.def, v)));
}

function paintQueue() {
  const n = Math.round((state.measures.queue / 100) * MAX_TICKETS);
  const colour = colourFor(1 - state.measures.queue / 100);
  tickets.forEach((t, i) => {
    t.visible = i < n;
    t.material.color.setHex(colour);
  });
}

function paintFigures() {
  for (const f of figures) {
    const id = f.userData.person.id;
    const out = isOut(id);
    f.userData.body.material.color.setHex(out ? 0xaeb7c4 : strainColour(state.strain[id]));
    f.userData.body.material.transparent = out;
    f.userData.body.material.opacity = out ? 0.42 : 1;
    f.userData.tag.material.opacity = out ? 0.5 : 1;
    f.userData.tag.material.transparent = true;
  }
}

/** Walk everyone to where the current assignment says they stand. */
function arrange(animate = true) {
  const targets = {};
  for (const lane of lanes) {
    (state.lanes[lane.id] || []).forEach((id, i) => {
      const [dx, dz] = SLOTS[i % SLOTS.length];
      targets[id] = [LANE_X[lane.id] + dx, LANE_Z + dz];
    });
  }
  let w = 0;
  let o = 0;
  for (const p of people) {
    if (isOut(p.id)) { targets[p.id] = OUT(o++); continue; }
    if (!targets[p.id]) targets[p.id] = WAIT(w++);
  }

  const jobs = [];
  for (const p of people) {
    const f = figureById[p.id];
    const [x, z] = targets[p.id];
    if (!animate) { f.position.set(x, 0, z); continue; }
    if (Math.hypot(f.position.x - x, f.position.z - z) < 0.02) continue;
    const from = f.position.clone();
    const to = new THREE.Vector3(x, 0, z);
    jobs.push(tween({
      ms: 520, easing: ease.inOutCubic,
      onUpdate: (_, e) => {
        f.position.lerpVectors(from, to, e);
        f.position.y = Math.sin(e * Math.PI) * 0.14;
        f.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      },
      onDone: () => { f.position.y = 0; },
    }));
  }
  return Promise.all(jobs);
}

/** Three pulses on a bar that just did something. */
async function flashBar(bar) {
  const m = bar.fill.material;
  for (let i = 0; i < 3; i++) {
    await tween({ ms: 170, easing: ease.inOutCubic, onUpdate: (_, e) => { m.emissive.setHex(C.red); m.emissiveIntensity = e * 1.5; } });
    await tween({ ms: 170, easing: ease.inOutCubic, onUpdate: (_, e) => { m.emissiveIntensity = 1.5 * (1 - e); } });
  }
  m.emissiveIntensity = 0;
}

/* ============================================================
   Helpers
   ============================================================ */
const clamp = (v) => Math.max(0, Math.min(100, v));
const rounded = () => Object.fromEntries(measures.map((m) => [m.id, Math.round(state.measures[m.id])]));
function jitter(v) { return v * (1 + (Math.random() * 2 - 1) * rules.variation); }
function fill(t, vars) { return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), t); }
function word(n) { return meta.countWords[Math.max(0, Math.min(meta.countWords.length - 1, n))]; }
function evTitle(ev) { return fill(ev.title, { name: ev.name ?? '' }); }
function evLine(ev) { return fill(ev.line, { name: ev.name ?? '' }); }

function laneOf(id) {
  for (const lane of lanes) if ((state.lanes[lane.id] || []).includes(id)) return lane.id;
  return null;
}

/** Everyone who is actually in today. */
function available() { return people.filter((p) => !isOut(p.id)); }

/** Staffing as the day will actually feel it: a day given to the new
    starter, or a day given back as rest, is a day the lane does not get. */
function effectiveCounts() {
  const counts = { desk: 0, projects: 0, admin: 0 };
  for (const p of people) {
    if (isOut(p.id) || state.halfDay === p.id || state.rested === p.id) continue;
    const lane = laneOf(p.id);
    if (lane) counts[lane] += 1;
  }
  return counts;
}

function needsFor(ev) {
  const need = { ...rules.baseNeed };
  for (const [k, v] of Object.entries(ev?.need || {})) need[k] = (need[k] ?? 0) + v;
  return need;
}

const averageStrain = () => people.reduce((s, p) => s + state.strain[p.id], 0) / people.length;
const mostStrained = (list) => list.slice().sort((a, b) => state.strain[b.id] - state.strain[a.id])[0];
const leastStrained = (list) => list.slice().sort((a, b) => state.strain[a.id] - state.strain[b.id])[0];

/** Is this bundle of deltas net good or net bad for the place? */
function netKind(effect) {
  if (!effect) return '';
  let net = 0;
  for (const [id, delta] of Object.entries(effect)) {
    const m = measures.find((x) => x.id === id);
    if (m) net += m.inverted ? -delta : delta;
  }
  return net > 0 ? 'good' : net < 0 ? 'bad' : '';
}

/** Which of the four is going to land on somebody next week. */
function worstMeasure() {
  const v = state.measures;
  const severity = {
    risk: v.risk,
    queue: v.queue,
    morale: 100 - v.morale,
    progress: 100 - v.progress,
  };
  return Object.entries(severity).sort((a, b) => b[1] - a[1])[0][0];
}

const band = (bands, value) => bands.find((b) => value >= b.at) ?? bands[bands.length - 1];
const strainClass = (s) => (s >= rules.strainBands.strained ? '.warn' : s <= rules.strainBands.calm ? '.ok' : '');

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/* ---------------- Canvas labels ---------------- */
function laneTexture(lane) {
  return canvasTexture(1024, 230, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = 'center';
    c.fillStyle = '#10131A';
    c.font = '800 88px Urbanist, Helvetica, Arial, sans-serif';
    c.fillText(lane.name.toUpperCase(), w / 2, 92);
    c.fillStyle = '#4B5162';
    c.font = '600 50px Urbanist, Helvetica, Arial, sans-serif';
    c.fillText(lane.note, w / 2, 164);
  });
}

function boardTexture(m) {
  return canvasTexture(440, 180, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(6, 6, w - 12, h - 12, 26);
    c.fill();
    c.textAlign = 'center';
    c.fillStyle = '#10131A';
    c.font = '800 62px Urbanist, Helvetica, Arial, sans-serif';
    c.fillText(m.name, w / 2, 78);
    c.fillStyle = '#4B5162';
    c.font = '700 36px Urbanist, Helvetica, Arial, sans-serif';
    c.fillText(m.hint, w / 2, 134);
  });
}

function nameTexture(name) {
  return canvasTexture(512, 150, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.font = '800 66px Urbanist, Helvetica, Arial, sans-serif';
    const tw = Math.min(w - 12, c.measureText(name).width + 76);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect((w - tw) / 2, 20, tw, h - 40, 55);
    c.fill();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#10131A';
    c.fillText(name, w / 2, h / 2);
  });
}
