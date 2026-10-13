/* ============================================================
   Content for "Add side quests".

   A new handheld scanner on the counter, an hour before the shop
   opens. The main path is three things and three things only:
   put the battery in, pair it to the till, scan something. Do
   those and the shift starts. Nothing else is required, nothing
   else is mentioned, and the thing is perfectly usable without
   any of it.

   Around that sit four optional discoveries. Every one of them is
   something you DO to the scanner — hold a button down, wipe a
   lens, put it back in its cradle, keep trying a barcode that
   will not read. None of them is a reading list with a cheerful
   name on it, which is the whole argument of this prototype.

   Two of them quietly change the main path while you are on it:
   a dirty lens makes the first scan take two goes, and docking a
   paired scanner drops the pairing. That is the difference
   between optional content and optional learning.

   EVERY learner-facing string and every tunable number is here.
   ============================================================ */

export const meta = {
  eyebrow: 'Counter prep — an hour before open',
  title: 'Get the new scanner working.',
  mainLabel: 'The shift starts when',
  findsLabel: 'What you found',
  slotEmpty: '?',
  slotWaiting: 'Something here',
};

/* ------------------------------------------------------------------
   The main path. Three steps, in order, each one a single act on
   the thing in front of you.
   ------------------------------------------------------------------ */
export const steps = [
  { id: 'battery', label: 'The battery is in', hint: 'There is a battery in the tray and a bay in the scanner.' },
  { id: 'pair', label: 'It is paired to the till', hint: 'It is on, and the till is sitting there waiting for it.' },
  { id: 'scan', label: 'It has scanned something', hint: 'There is stock on the rack. Try one.' },
];

/* ------------------------------------------------------------------
   The four optional discoveries.

   `found` is what the learner has after doing it. `missed` is what
   the shift looks like for the person who never did — which is the
   only honest way to make an optional thing feel worth doing.
   ------------------------------------------------------------------ */
export const quests = [
  {
    id: 'menu',
    name: 'The engineer’s menu',
    card: 'BATTERY 71%',
    toast: 'Holding the power button opens a menu nobody mentioned.',
    found: '<b>The engineer’s menu</b> — you held the power button down instead of pressing it, and the scanner told you its battery is already down to 71% of what it was. That is the one that dies at four o’clock on a Saturday.',
    missed: 'Holding the power button down opens an engineer’s menu. This scanner’s battery is at 71% health — the reason it will die mid-shift in about a month, with nobody able to say why.',
  },
  {
    id: 'lens',
    name: 'The lens',
    card: 'LENS CLEAN',
    toast: 'The lens was dirty. It reads first time now.',
    found: '<b>The lens</b> — you found the dust on it. A clean lens reads first time; the one nobody wipes takes two goes at everything, all day. Nothing dramatic happened, which is exactly the point.',
    missed: 'The lens had shop dust on it. That is why the first scan did not take, and why they will keep not taking — slow enough to be annoying, never slow enough for anyone to stop and work out why.',
  },
  {
    id: 'dock',
    name: 'Why it un-pairs',
    card: 'DOCK = UNPAIR',
    toast: 'Docking it dropped the pairing. That is the cradle, not a fault.',
    found: '<b>Why it un-pairs</b> — you put it back in the cradle and watched the pairing drop. Now you know why it needs pairing again every single morning, and that nothing is broken.',
    missed: 'The cradle drops the pairing every time the scanner goes back in it. Tomorrow morning it will look broken, and somebody will spend twenty minutes and a phone call finding that out the hard way.',
  },
  {
    id: 'manual',
    name: 'Manual entry',
    card: 'KEYPAD',
    toast: 'A keypad. The number under the barcode is enough.',
    found: '<b>Manual entry</b> — you kept trying the crushed box until the scanner offered you a keypad, so a damaged barcode is now a ten-second problem.',
    missed: 'There is a keypad behind a barcode that will not read — the number printed under it is enough. Without it, a crushed box means a walk to the back, a supervisor, and a queue.',
  },
];

/* ------------------------------------------------------------------
   Everything the scanner, the till and the counter say.
   ------------------------------------------------------------------ */
export const lines = {
  start: 'Everything on the counter can be clicked. Only three things have to happen.',
  needBattery: 'Nothing happens. There is no battery in it.',
  batteryIn: 'The battery seats with a click and the screen comes up.',
  alreadyOn: 'It powers down and straight back up. There is more in that button than that.',
  pairNeedsPower: 'The till cannot see it. The scanner is dead.',
  paired: 'Paired. The till can see it.',
  repaired: 'Paired again. That took four seconds, now you know where to look.',
  alreadyPaired: 'Already paired.',
  scanNeedsPair: 'It reads the barcode and has nowhere to send it.',
  scanDirty: 'The beam flickers across the label and nothing happens.',
  scanOk: 'Beep. {name} goes up on the till.',
  scanAgain: '{name} again. The till does not mind.',
  crushedFail: 'The label is crushed. The beam has nothing to read.',
  crushedAgain: 'Still nothing. The barcode is physically damaged.',
  keypadReady: 'The screen offers you something: ENTER CODE.',
  dockedUnpaired: 'It sits in the cradle, and the till drops it.',
  docked: 'Back in the cradle.',
  undocked: 'Out of the cradle.',
  wipeUsed: 'The lens was dirtier than it looked.',
  wipeGone: 'The wipe is used up.',
  menuOpen: 'ENGINEER — BATTERY HEALTH 71%',
  ready: 'That is the three. Start the shift whenever you like.',
  startBtn: 'Start the shift',
  closeBtn: 'Close',
};

/* ------------------------------------------------------------------
   The stock on the rack. The last one is the crushed box, and it
   will never read — that is deliberate.
   ------------------------------------------------------------------ */
export const stock = [
  { id: 'a', name: 'Oat milk, 12', colour: 0 },
  { id: 'b', name: 'Dog food, 6', colour: 1 },
  { id: 'c', name: 'Batteries, 40', colour: 2 },
  { id: 'crushed', name: 'Crushed box', colour: 3, damaged: true },
];

/* ------------------------------------------------------------------
   The numbers worth moving.
   ------------------------------------------------------------------ */
export const rules = {
  holdMs: 1100,        // how long the power button has to be held
  menuMs: 4200,        // how long the engineer's menu stays up
  crushedTries: 2,     // failed attempts before the keypad is offered
  dirtyScansFail: 1,   // how many times a dirty lens kills a good scan
};

export const result = {
  title: 'The shift started',
  titleAll: 'The shift started, and you found all four',
  summary: 'Three things had to happen. They happened. The other four were sitting there the whole time and nothing in the shop mentioned any of them.',
  foundLabel: 'What you found',
  missedLabel: 'What was there',
  none: 'You did the three things and started the shift, which is a complete, correct way to do this. That is what optional means.',
  point: '<b>Every one of the four was something you do, not something you read.</b> Hold a button, wipe a lens, dock it, keep trying. Nobody opens an optional reading list — but people will hold a button down for three seconds to see what happens.',
  again: 'Set it up again',
  close: 'Close',
};

/* ------------------------------------------------------------------
   Looks.
   ------------------------------------------------------------------ */
export const palette = {
  blue: '#2757e2',
  mint: '#5fe0b0',
  amber: '#e0a32a',
  red: '#e0234e',
  ink: '#10131A',
  dim: '#4B5162',
  faint: '#8891A3',
  line: '#E4E7EF',
  paper: '#FFFFFF',
  soft: '#F4F6FA',
  wall: '#EDF0F7',
  bench: '#DDE3EE',
  benchEdge: '#C5CDDC',

  shell: '#39414E',
  shellDark: '#2A313C',
  grip: '#222932',
  screenOff: '#1C222B',
  screenOn: '#123A2E',
  screenInk: '#6CF0B8',
  trigger: '#596273',
  bay: '#2A313C',
  cell: '#7FE9C2',

  till: '#E7EAF2',
  tillDark: '#CBD2E0',
  tillScreen: '#1B2230',
  tillInk: '#9FE7FF',

  box: ['#E3C48F', '#D8B47A', '#E8D3AC', '#C9B392'],
  boxEdge: '#B59A6A',
  label: '#FFFFFF',
  bar: '#2B3240',

  mintTint: '#EAFBF4',
  mintInk: '#12A177',
  redTint: '#FDECF0',
  redInk: '#B51C40',
  beam: 'rgba(224,35,78,0.55)',
  beamOk: 'rgba(95,224,176,0.75)',
  shade: 'rgba(16,19,26,0.08)',
};

export const view = {
  board: { w: 1004, h: 506 },
  maxScale: 1.3,
  minRegion: { w: 320, h: 230 },
  fontFamily: 'Urbanist, "Segoe UI", system-ui, -apple-system, sans-serif',

  side: { x: 2, y: 2, w: 244, top: 42, rowH: 40, gap: 6, findsTop: 212, slotH: 54, slotGap: 8 },
  scene: { x: 258, y: 2, w: 744 },
};

export const timing = {
  beam: 420,
  pair: 520,
  seat: 260,
  wipe: 420,
  dock: 300,
};
