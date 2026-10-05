/* ============================================================
   Content for "Bring Hot and Cold into quizzes".

   A desk at the end of the day with one thing on it that should not
   be there. Every click is answered with a temperature word rather
   than "wrong", so a near miss reads as progress, and the number of
   looks is the score.

   The desk is dealt out again on every run: the same objects land in
   different places, and a different one of them is the problem. No
   findable object ever appears twice, so "the USB stick" always
   means one thing.
   ============================================================ */

export const meta = {
  eyebrow: 'Clear desk check — 5pm',
  title: 'Someone has left something on this desk that breaks the clear desk rule. Find it.',
  instructions: 'Click anywhere on the desk to look there. Each click tells you how close you are.',
  retryHint: 'Keep going — the words tell you which way to move.',
  doneHint: 'Found it.',
};

/* Where things can land, in desk-local coordinates: -3..3 across,
   -2..2 back. A plain grid, one object per slot, so nothing can ever
   be dealt on top of anything else. Shuffled on every run, so nothing
   sits in the same place twice and a remembered answer is worth
   nothing. */
export const slots = [
  { u: -2.40, v:  1.50 }, { u: -1.20, v:  1.50 }, { u:  0.00, v:  1.50 }, { u:  1.20, v:  1.50 }, { u:  2.40, v:  1.50 },
  { u: -2.40, v:  0.50 }, { u: -1.20, v:  0.50 }, { u:  0.00, v:  0.50 }, { u:  1.20, v:  0.50 }, { u:  2.40, v:  0.50 },
  { u: -2.40, v: -0.50 }, { u: -1.20, v: -0.50 }, { u:  0.00, v: -0.50 }, { u:  1.20, v: -0.50 }, { u:  2.40, v: -0.50 },
  { u: -2.40, v: -1.50 }, { u: -1.20, v: -1.50 }, { u:  0.00, v: -1.50 }, { u:  1.20, v: -1.50 }, { u:  2.40, v: -1.50 },
];


/* The things that can be the problem. One of each, every run, so the
   kind of object never gives the answer away — and never contradicts
   itself either. Which one is the problem changes run to run. */
export const findable = [
  { id: 'note',   kind: 'note',   where: 'a password written on a sticky note' },
  { id: 'folder', kind: 'folder', where: 'an open client file with names and addresses in it' },
  { id: 'usb',    kind: 'usb',    where: 'an unlabelled USB stick with last year’s payroll on it' },
  { id: 'tray',   kind: 'tray',   where: 'the leavers list, sitting in the out tray' },
  { id: 'badge',  kind: 'badge',  where: 'a building pass belonging to someone who left in March' },
];

/* Ordinary desk things. Nothing here is ever the problem; they are
   what makes the search a search. Loose paper repeats on purpose —
   it is scenery, not something you can be asked to find. */
export const clutter = [
  { kind: 'laptop' },
  { kind: 'mug' },
  { kind: 'pens' },
  { kind: 'notebook' },
  { kind: 'phone' },
  { kind: 'stapler' },
  { kind: 'calculator' },
  { kind: 'paper' }, { kind: 'paper' }, { kind: 'paper' },
  { kind: 'paper' }, { kind: 'paper' }, { kind: 'paper' },
];

/* Checked in order, first match wins, so `max` must only ever grow.
   Tuned for a desk roughly 6 units across. */
export const bands = [
  { id: 'found',    max: 0.45,     word: 'Found it!', line: 'That is the one.' },
  { id: 'hot',      max: 0.9,      word: 'Hot',       line: 'A hand’s width out, no more.' },
  { id: 'warm',     max: 1.6,      word: 'Warm',      line: 'Right corner of the desk.' },
  { id: 'cold',     max: 2.5,      word: 'Cold',      line: 'Wrong end of the desk.' },
  { id: 'freezing', max: Infinity, word: 'Freezing',  line: 'Nothing wrong anywhere near here.' },
];

/* {where} is filled in with whatever was sitting there. */
export const reveal = {
  toast: 'Found it — {where}.',
  ring: 'Here',
};

/* Chosen by attempt count: describing the search, never failing anyone. */
export const results = [
  {
    maxAttempts: 1,
    title: 'First click',
    summary: 'Straight to it. Either you have tidied a desk like this before or you knew exactly where to start looking.',
  },
  {
    maxAttempts: 3,
    title: 'Closed in fast',
    summary: 'Two or three looks and you had it. You moved towards “warm” instead of starting again somewhere random.',
  },
  {
    maxAttempts: 6,
    title: 'Worked it out',
    summary: 'A few cold clicks, then you followed the trail in. That is how a real walk-round goes.',
  },
  {
    maxAttempts: Infinity,
    title: 'Got there in the end',
    summary: 'A long search — but you did not give up, and every look narrowed it down a little.',
  },
];

/* {n} is the attempt count; the counter label is shared with the stat chip. */
export const counter = {
  label: 'Looks',
  one: '1 look',
  many: '{n} looks',
};
export const summaryLine = 'You found it in <b>{n}</b>.';

export const lesson =
  '<b>“Warm” teaches; “wrong” does not.</b> Counting attempts also tells you far more than a tick or a cross — '
  + 'two people can both pass the clear desk question and only one of them knew where to look.';
