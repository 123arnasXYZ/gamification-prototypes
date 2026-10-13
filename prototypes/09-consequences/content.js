/* ============================================================
   Content for "Use immediate consequences as feedback".

   Goods-in, bay 3. You build a load on a pallet that is about to be
   craned up to the mezzanine. Every consequence lands while you are
   still building: something that is carrying more than it can take
   gives way on the spot, a bad centre of gravity shows as a lean, a
   perched item sits visibly over the edge. Damage stays done — taking
   the top item off again does not un-crush anything.

   Then the crane takes it exactly as it stands, and what happens in
   the air is the build. Nothing is marked right or wrong; the ending
   describes what made it onto the mezzanine and what the banksman
   says about it.

   EVERY learner-facing string and every tunable number is in here.

   Units: weight in kg. Sizes and heights in scene metres, which are
   roughly real metres — the pallet below is 1.30 x 1.15.
   ============================================================ */

export const meta = {
  eyebrow: 'Goods-in — bay 3, mezzanine lift',
  title: 'Build the load. The crane takes it up exactly as it stands.',
};

/* ------------------------------------------------------------------
   The bay. Change `pallet.width` / `pallet.depth` and items start
   hanging over the deck edge as well as over each other.
   ------------------------------------------------------------------ */
export const bay = {
  pallet: { width: 1.30, depth: 1.15, top: 0.32 },
  signs: { staging: 'STAGING', mezzanine: 'MEZZANINE  ·  2.5 t', },
};

/* ------------------------------------------------------------------
   The five things in the staging area.

   weight  — what it puts on whatever is underneath it
   holds   — the most weight it will carry on top before it gives way
   size    — [width, height, depth]
   shape   — how it is built in the scene: blocks | tote | drum | crate | cartons
   tags    — what the learner reads on the label
   flags   — the four the rules below actually read:
             liquid    the contents move when the load moves  (rule 3)
             round     a domed, rolling top: a poor base       (rule 2)
             tall      narrow and high: a poor base            (rule 2)
             upright   it only works standing up               (rule 4)
             loose     nothing bands or wraps it on            (rule 4)
           — and three that are character only, because `weight` and
             `holds` already carry them:
             stable, fragile, crushable
   ------------------------------------------------------------------ */
export const items = [
  {
    id: 'blocks',
    name: 'Banded blocks',
    tags: '900 kg · BANDED',
    weight: 900, holds: 900,
    size: [1.30, 0.44, 1.10],
    shape: 'blocks', colour: 0x9aa3ac,
    stable: true,
    note: 'Two courses of blocks, strapped to their own base. Nothing in the bay is heavier and nothing is more solid.',
    crushed: 'A band lets go and the top course of blocks spreads sideways.',
    placedNote: '',
    arrivedOk: 'came up without moving a millimetre',
    arrivedBad: 'a band has gone and the top course has spread',
    arrivedFell: 'went off the side of the load and broke open on the bay floor',
  },
  {
    id: 'ibc',
    name: 'Coolant IBC',
    tags: '620 kg · PART FULL',
    weight: 620, holds: 400,
    size: [1.15, 1.10, 1.15],
    shape: 'tote', colour: 0xe4ebf1, fill: 0x58c08a, fillLevel: 0.55,
    liquid: true,
    note: 'A tote about half full of coolant. The surface rocks whenever the load does, and 300 kg of it moves at once.',
    crushed: 'The cage buckles and coolant runs down the outside of the tote.',
    placedNote: 'Up there the coolant has somewhere to swing to.',
    arrivedOk: 'arrived upright, coolant settled',
    arrivedBad: 'cage buckled, coolant down the outside of it',
    arrivedFell: 'went off on the way up and split on the bay floor',
  },
  {
    id: 'drum',
    name: 'Sealant drum',
    tags: '210 kg · KEEP UPRIGHT',
    weight: 210, holds: 70,
    size: [0.86, 1.02, 0.86],
    shape: 'drum', colour: 0x2f6fb5,
    round: true, upright: true, loose: true,
    note: 'A 205-litre drum of floor sealant. Domed top, nothing banding it to anything, and it only works stood up.',
    crushed: 'The drum lid dishes in and the seam weeps sealant.',
    placedNote: 'Nothing is holding the drum to the load.',
    arrivedOk: 'arrived upright and dry',
    arrivedBad: 'lid dished in, seam weeping',
    arrivedFell: 'went over the edge and burst on the bay floor',
    tipped: 'rolled onto its side and emptied down the front of the load',
  },
  {
    id: 'glass',
    name: 'Glass panels',
    tags: '180 kg · FRAGILE',
    weight: 180, holds: 0,
    size: [1.25, 1.50, 0.50],
    shape: 'crate', colour: 0xb98a52, glass: 0x9fd3e8,
    fragile: true, tall: true,
    note: 'A timber crate of glazing panels, stood on edge. It takes nothing at all on top and it is too tall to be a base.',
    crushed: 'Panels go inside the crate — that flat crack you hear once and never forget.',
    placedNote: '',
    arrivedOk: 'arrived whole, every panel',
    arrivedBad: 'panels cracked inside the crate',
    arrivedFell: 'came off in the air and emptied across the bay floor',
  },
  {
    id: 'cartons',
    name: 'Carton stack',
    tags: '40 kg · WRAPPED',
    weight: 40, holds: 15,
    size: [1.20, 0.82, 1.00],
    shape: 'cartons', colour: 0xc9a46e,
    crushable: true,
    note: 'Shrink-wrapped empties. Light, wide, and it folds under almost anything you put on it.',
    crushed: 'The cartons fold flat and the wrap splits down one side.',
    placedNote: '',
    arrivedOk: 'arrived square',
    arrivedBad: 'folded flat, wrap split',
    arrivedFell: 'blew off the load and scattered across the bay',
  },
];

/* ------------------------------------------------------------------
   The rules. Every consequence in the prototype comes out of these
   four blocks, and every one of them is a number you can move.
   ------------------------------------------------------------------ */
export const rules = {
  /* Fewest items the crane driver will take up in one lift. */
  minItems: 2,

  /* 1. CRUSH — weight on something that cannot take it.
     Checked after every placement: if the weight above an item is more
     than its `holds`, it gives way then and there and stays that way.
     `squash` is how much of its height it loses. */
  crush: { squash: 0.45, darken: 0.6 },

  /* 2. CENTRE OF GRAVITY — a lean you can see while you build.
     effective height = weighted mean height of the load above the deck
                      + tallLowPenalty   (a `tall` item with anything on it)
                      + roundLowPenalty  (a `round` item with anything on it)
                      + heavyHighPenalty (each item >= heavyKg off the deck)
     lean (radians)   = (effective - neutral) * leanPerMetre, capped at maxLean */
  balance: {
    neutral: 0.5,
    leanPerMetre: 0.11,
    tallLowPenalty: 0.50,
    roundLowPenalty: 0.35,
    heavyKg: 300,
    heavyHighPenalty: 0.60,
    maxLean: 0.17,
    steady: 0.035,   // at or under this it rides true
    watch: 0.085,    // over this and things start coming off in the air
  },

  /* 3. LIQUID — the tote is only safe on the deck.
     At or above this course, the coolant has room to surge on the lift.
     `sloshTilt` / `sloshSpeed` are the surface rocking you can see while
     you are still building. */
  liquid: { surgeFromCourse: 1, surgeKick: 0.9, sloshTilt: 0.07, sloshSpeed: 1.7 },

  /* 4. NOTHING HOLDING IT — overhang and loose items.
     overhang = how far, PER SIDE, an item's footprint hangs past whatever
     is under it (the pallet deck for the bottom course). Past `tolerance`
     it is visibly perched; at `catches` and above it comes off in the air
     whatever else happens. A `loose` item off the deck has nothing banding
     it on, so it shifts as soon as there is a lean or a surge. */
  hold: { tolerance: 0.08, catches: 0.16, showOffset: 0.6, showTilt: 0.5 },
};

/* ------------------------------------------------------------------
   What the learner reads. The 3D does the showing; these are the
   words that go with it.
   ------------------------------------------------------------------ */
export const ui = {
  instructions: 'Click something in the staging area to put it on the pallet.',
  onPallet: (n) => `${n} on the pallet. Keep building, or call the crane.`,
  needMore: (n) => `${n} on. The driver will not take up fewer than ${rules.minItems}.`,
  full: 'Everything in the staging area is on the pallet.',
  liftTopBtn: 'Take the top one off',
  liftBtn: 'Call the crane',
  tryAgainBtn: 'Build another load',
  cogLabel: 'Centre of gravity',
  cogEmpty: 'Nothing on the deck yet.',
  recapEyebrow: 'Up on the mezzanine',
  airEyebrow: 'What happened in the air',
  loadEyebrow: 'The load, top course down',
  banksmanLabel: 'The banksman',
  question: 'What would you load differently next time?',
};

/* How the centre of gravity reads out while you build. First match wins. */
export const cogReadings = [
  { underLean: 0.035, text: 'Low and square over the deck. It will ride where you put it.' },
  { underLean: 0.085, text: 'Riding high. There is a lean on it you can see from here.' },
  { underLean: 99, text: 'Well out of plumb — the top of the load is hanging off the side of the deck.' },
];

/* Said the moment it happens, while the learner is still building. */
export const building = {
  overhang: (name) => `The ${name} is perched — part of it is hanging over nothing.`,
  looseHigh: (name) => `Nothing is banding the ${name} to the load.`,
  leanWatch: 'The load has started to lean. It is leaning more with every course.',
  leanBad: 'That lean is past anything the banksman would sign off.',
  damageStays: (name) => `The ${name} stays damaged. Taking it off again does not undo it.`,
};

/* ------------------------------------------------------------------
   The lift itself: hook on, up, across, down on the mezzanine deck.
   `toast` goes up as it happens; `beat` goes in the ending.
   ------------------------------------------------------------------ */
export const air = {
  hookOn: 'Hook on. Taking the weight.',
  steady: {
    toast: 'It rides straight up, barely turning.',
    beat: 'The load went up true — no swing worth watching.',
  },
  sway: {
    toast: 'It sways on the hook and keeps swaying.',
    beat: 'The load swayed the whole way up — enough to watch, not enough to shed anything.',
  },
  swing: {
    toast: 'The load swings out and hangs over at an angle.',
    beat: 'The high centre of gravity swung out as soon as it left the deck, and it hung over at an angle the whole way up.',
  },
  surge: {
    toast: 'The coolant surges — the whole load lurches with it.',
    beat: 'Half a tonne of coolant ran to one side of the tote mid-lift and shoved the load over with it.',
  },
  collapse: {
    toast: 'The crushed item folds and the load drops into the gap.',
    beat: 'What was already crushed folded the rest of the way in the air, and the load dropped into the gap it left.',
  },
  slide: {
    toast: 'Something slides off the load.',
    beat: 'What was perched over the edge slid off as the load tipped and went down onto the bay floor.',
  },
  tipped: {
    toast: 'The drum goes over on its side.',
    beat: 'The drum had nothing holding it, so the first proper swing put it on its side.',
  },
  landed: 'Down on the mezzanine deck.',
};

/* ------------------------------------------------------------------
   The ending. Picked by what actually happened, not by a score.
   ------------------------------------------------------------------ */
export const arrivals = {
  clean: {
    title: 'The whole load is on the mezzanine',
    line: '“That is how you want to see one go up. Straight up, straight down, nobody moved out of the way.”',
  },
  scuffed: {
    title: 'It all got up there — not all of it in one piece',
    line: '“It arrived. Some of it arrived as a write-off, but it arrived.”',
  },
  rough: {
    title: 'It got up there the hard way',
    line: '“I had my hand up to stop that twice. Nobody should be stood under a load doing that.”',
  },
  dropped: {
    title: 'Part of the load never made it up',
    line: '“That came down into a bay people walk through. We are not loading another one until we talk about it.”',
  },
};
