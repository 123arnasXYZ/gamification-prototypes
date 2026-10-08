/* ============================================================
   Content for "Give learners a taste of mastery".

   Hands-on only: no questions anywhere. The learner sets up a desk
   so somebody can work at it all day without hurting themselves —
   picking up the monitor, keyboard, mouse, chair and lamp and
   putting each one somewhere.

   Beat one hands them an experienced assessor's kit: the right slot
   lights up, the reason floats beside it, and a note explains every
   placement as it happens. Beat two takes all of that away on a
   different desk. Beat three is the first desk again, bare.

   Everything the learner reads lives in this file.
   ============================================================ */

export const meta = {
  title: 'Set this desk up so somebody could work at it all day without hurting themselves.',
  takeHint: 'Click an item on the desk to pick it up.',
  placeHint: 'Now click one of the glowing slots to put it down.',
  heldHint: 'Holding {item} — click a slot, or click it again to put it back.',
  doneHint: 'All five placed.',
  assessorLabel: 'Assessor’s note',
  assessorWaiting: 'Pick something up and I will tell you what I am looking at.',
  trayLabel: 'The five things on this desk',
  placedTag: 'placed',
  movedLine: '{item} → {slot}',
  blockedLine: 'The kit is pointing at a different slot for that one.',
};

/* The counters in the top right. */
export const counters = {
  beat: 'Beat',
  placed: 'Placed',
};

/* ------------------------------------------------------------------
   The five items, and the three places each one can go.
   `correct` is what an experienced assessor does with it; `tag` is
   the short reason that floats beside the slot in beat one; `note`
   is the longer line the assessor says out loud.
   ------------------------------------------------------------------ */
export const items = [
  {
    id: 'monitor',
    name: 'Monitor',
    slots: [
      {
        id: 'monitor-low',
        label: 'Flat on the desk',
        tag: 'too low: you look down all day',
        note: 'Flat on the desk is the default everybody inherits, and it means the neck holds the head forward for seven hours.',
      },
      {
        id: 'monitor-eye',
        label: 'Raised to eye level',
        correct: true,
        tag: 'eye level: your neck stays neutral',
        note: 'Top of the screen roughly level with the eyes. The head sits on top of the spine instead of hanging in front of it, and nobody has to think about posture to keep it there.',
      },
      {
        id: 'monitor-high',
        label: 'Up on the tall riser',
        tag: 'too high: chin up, shoulders creep',
        note: 'Too high is not the safe side of the mistake — the chin lifts, the shoulders come up with it, and the eyes dry out.',
      },
    ],
  },
  {
    id: 'keyboard',
    name: 'Keyboard',
    slots: [
      {
        id: 'keyboard-edge',
        label: 'Hard against the front edge',
        tag: 'wrists hanging off the edge',
        note: 'Against the edge there is nothing under the forearms, so the wrists carry the weight of both arms all day.',
      },
      {
        id: 'keyboard-in',
        label: 'A hand’s depth in from the edge',
        correct: true,
        tag: 'a hand’s depth in: forearms supported',
        note: 'About a hand’s depth back. The forearms rest on the desk, the wrists stay straight, and the elbows stay at the person’s side.',
      },
      {
        id: 'keyboard-back',
        label: 'Pushed right back',
        tag: 'too far back: you lean in to reach',
        note: 'Pushed back, the arms stretch out to reach it and the whole upper body follows them forward off the backrest.',
      },
    ],
  },
  {
    id: 'mouse',
    name: 'Mouse',
    slots: [
      {
        id: 'mouse-beside',
        label: 'Beside the keyboard, same depth',
        correct: true,
        tag: 'beside the keys: elbow stays at your side',
        note: 'Right next to the keyboard at the same depth, so the hand moves to it without the shoulder going anywhere.',
      },
      {
        id: 'mouse-across',
        label: 'Across the desk',
        tag: 'across the desk: a shoulder stretch per click',
        note: 'Across the desk the arm is held out away from the body every time it is used. That is the one people live with for years without naming it.',
      },
      {
        id: 'mouse-edge',
        label: 'Wedged in front of the keyboard',
        tag: 'in front of the keys: wrist bent sideways',
        note: 'Squeezed in at the front edge, the wrist has to bend sideways to reach it and there is nowhere to rest between clicks.',
      },
    ],
  },
  {
    id: 'chair',
    name: 'Chair',
    slots: [
      {
        id: 'chair-low',
        label: 'Dropped to the bottom',
        tag: 'too low: knees up, shoulders raised',
        note: 'At the bottom of its travel the knees sit above the hips and the elbows are below the desk, so the shoulders lift to reach the keys.',
      },
      {
        id: 'chair-fit',
        label: 'Set to this person’s height',
        correct: true,
        tag: 'set to their height: feet flat, elbows level',
        note: 'Set the chair to the person, then everything else to the chair: feet flat on the floor, elbows about level with the desk top.',
      },
      {
        id: 'chair-high',
        label: 'Wound right up',
        tag: 'too high: feet dangle, edge presses',
        note: 'Wound up, the feet dangle and the front edge of the seat presses into the back of the thighs.',
      },
    ],
  },
  {
    id: 'lamp',
    name: 'Desk lamp',
    slots: [
      {
        id: 'lamp-glare',
        label: 'Aimed at the screen',
        tag: 'glare: you squint and lean in',
        note: 'Aimed at the screen it washes the display out, and the squinting and leaning in that follow are what the person actually complains about.',
      },
      {
        id: 'lamp-side',
        label: 'Off to the side, over the paperwork',
        correct: true,
        tag: 'off to the side: light on the page, not the screen',
        note: 'Off to the side and pointed down at the paper. Light where the reading happens, nothing bouncing off the glass.',
      },
      {
        id: 'lamp-behind',
        label: 'Behind the shoulder',
        tag: 'behind you: your own shadow on the page',
        note: 'Behind the shoulder, the person’s own head shadows whatever they are reading, so they move the paper instead of the lamp.',
      },
    ],
  },
];

/* ------------------------------------------------------------------
   Three beats on the same two desks. `start` is the mess each beat
   opens with — beats one and three open identically on purpose.
   ------------------------------------------------------------------ */
export const beats = [
  {
    id: 'expert',
    supports: true,
    eyebrow: 'Beat 1 — expert mode',
    banner: 'The kit an experienced assessor carries is switched on. Pick anything up and the slot it belongs in glows, with the reason floating beside it, and the assessor talks you through every placement. You cannot really get this wrong.',
    arrive: 'Expert kit on — the right slot will light up.',
  },
  {
    id: 'bare',
    supports: false,
    eyebrow: 'Beat 2 — supports off',
    banner: 'Different desk, and the kit is off: no glow, no reason tags, no assessor. Place all five your own way. Nothing is marked right or wrong while you work.',
    arrive: 'A different desk, and the supports are off.',
  },
  {
    id: 'again',
    supports: false,
    eyebrow: 'Beat 3 — the first desk again',
    banner: 'This is the desk from beat one, back exactly as you first found it. Still no glow, no tags, no assessor. Set it up again.',
    arrive: 'The first desk again — still no supports.',
  },
];

/* Which slot each item starts in. Desk A is beats one and three. */
export const messes = {
  A: {
    monitor: 'monitor-low',
    keyboard: 'keyboard-edge',
    mouse: 'mouse-edge',
    chair: 'chair-high',
    lamp: 'lamp-behind',
  },
  B: {
    monitor: 'monitor-high',
    keyboard: 'keyboard-back',
    mouse: 'mouse-across',
    chair: 'chair-low',
    lamp: 'lamp-glare',
  },
};

/* ------------------------------------------------------------------
   The comparison at the end.
   ------------------------------------------------------------------ */
export const ending = {
  lead: 'Unaided on the same desk, you matched the assessor on <b>{n} of 5</b>.',
  expertLabel: 'Expert put it',
  yoursLabel: 'You put it',
  matchWord: 'match',
  missWord: 'differs',
  point:
    '<b>Beat three was not a recall question.</b> It was the same desk, the same five things, and the same movements you had '
    + 'already made once with the kit on. You were reaching for something you had done, not something you had read — which is '
    + 'why the ones you matched came back without any effort at all.',
  again: 'Set it up again',
  close: 'Close',
};

/* Chosen by how many of the five matched. */
export const results = [
  {
    min: 5,
    title: 'All five, unaided',
    summary: 'Every placement came back the same way the assessor made it, on a desk you had seen once with the supports on. That is the whole trick: the first run was the practice, not the explanation.',
  },
  {
    min: 4,
    title: 'Four of the five came straight back',
    summary: 'Nearly all of it carried over without the glow, the tags or the assessor. The one that drifted is the one worth another pass — look at what it does to the body, not at what the rule says.',
  },
  {
    min: 3,
    title: 'The big ones stuck',
    summary: 'The placements that change how the body sits came back; the finer ones slipped. That is the normal shape of it after one go with the kit on.',
  },
  {
    min: 0,
    title: 'Some of it carried, some did not',
    summary: 'Beat one felt easy because the kit was doing the deciding. What carried into beat three is what you actually took from it — and that gap is the useful part, not a failure.',
  },
];
