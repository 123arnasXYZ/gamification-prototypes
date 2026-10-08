/* ============================================================
   Content for "Add side quests".

   An opening shift in a small café. Three jobs have to happen
   before the doors open, and every one of them is a physical act:
   a switch, a sign, a drawer. Nothing is asked, nothing is
   answered.

   Around those three jobs sit three optional things nobody
   mentions. They are not extra reading — each one is also
   something you do with your hands. That is the whole argument
   of this prototype, so all three had to be activities.
   ============================================================ */

export const meta = {
  eyebrow: 'Carrow Lane — twenty minutes before open',
  title: 'Open up the café. Three jobs, then the doors.',
  counter: 'Jobs done',
  tally: 'Jobs done {done} of {total}',

  walkLeft: '← Left',
  walkRight: 'Right →',
  openUp: 'Open up',
  restart: 'Restart',
  slotEmpty: '?',

  hintStart: 'Walk with Left and Right, or click a spot on the floor. The grey markers are the jobs.',
  hintRemaining: 'Still to do: {list}.',
  hintReady: 'All three jobs are done. Open the doors whenever you like.',
  hintCarrying: 'You’re holding {thing}. Click where it goes.',

  handsFull: 'You’re already holding {thing}.',
  crateThing: 'the {label} crate',
  wrongSpot: 'Not where that one lives.',
  pickedUp: 'You pick up {thing}.',
  refuse: 'The doors stay shut: {list} still to do.',
  done: 'Everything’s done. The place is open.',
};

/* ---------- The three required jobs ---------- */
export const jobs = [
  {
    name: 'coffee machine',
    toast: 'The machine wakes up and starts to heat.',
    ending: 'On at the wall first, because it needs twenty minutes before it will pour anything worth selling.',
  },
  {
    name: 'wet floor sign',
    thing: 'the wet floor sign',
    toast: 'The sign stands over the wet patch.',
    pickupHint: 'The floor here is still wet. Something should be warning people about it.',
    ending: 'Out on the mopped patch, which is the only place it does any good.',
  },
  {
    name: 'till',
    toast: 'The drawer slides open. Float counted.',
    ending: 'Unlocked and counted before the first customer, not during.',
  },
];

/* ---------- The optional three ---------- */
export const sideQuests = [
  {
    badge: 'Put back',
    toast: 'All three back where they live.',
    progress: '{n} of 3 back where they live.',
    foundPoint: '<b>The night shift’s leftovers</b> — you spotted three things in the wrong place and carried each one home. Nobody asked you to.',
    missedPoint: 'Three things were sitting where they didn’t belong: a mug on the floor, a chair up on a table, a broom across the walkway. They’re still there.',
  },
  {
    badge: 'Restacked',
    toast: 'Heaviest on the bottom, lightest on top.',
    foundPoint: '<b>The delivery</b> — you restacked it heaviest at the bottom, so it won’t come down on anyone.',
    missedPoint: 'The delivery is still stacked with the heavy crate on top. It held all morning, which is the kind of luck that runs out.',
  },
  {
    badge: 'Chiller',
    toast: 'The chiller hums into life.',
    foundPoint: '<b>The chiller</b> — switched off in the back corner, and you were the one who looked in the corner.',
    missedPoint: 'The chiller in the back corner was switched off the whole shift. The milk in it is a conversation for later.',
  },
];

/* Things the night shift left out of place. */
export const strays = [
  { name: 'a mug', homeIdle: 'A mug could live here.' },
  { name: 'a chair', homeIdle: 'There’s a gap at this table.' },
  { name: 'a broom', homeIdle: 'There’s a bracket on the wall here.' },
];

/* The delivery. Heaviest first in this list; the stack starts wrong. */
export const crates = [
  { label: '60 kg', weight: 60 },
  { label: '30 kg', weight: 30 },
  { label: '12 kg', weight: 12 },
];

export const chiller = {
  name: 'the chiller',
  off: 'The chiller is dark and silent.',
};

export const door = {
  closed: 'CLOSED',
  open: 'OPEN',
  flip: 'You turn the sign around.',
};

export const results = {
  title: 'You opened up',
  summary: 'The three jobs were the shift. Everything else was there whether you looked or not.',
  closing: 'That is the whole trick with a side quest: it has to be something you <b>do</b>. Nobody goes near an optional reading list, however cheerfully you label it — but people will carry a mug across a room for nothing at all.',
  allThree: 'You cleared all three optional things as well, and not one of them was mentioned anywhere.',
  noneOfThem: 'You ran a clean shift and walked straight past all three optional things. That is allowed — that is what optional means.',
  again: 'Open up again',
  close: 'Close',
};
