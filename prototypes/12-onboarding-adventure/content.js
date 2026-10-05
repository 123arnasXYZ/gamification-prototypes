/* ============================================================
   Content for "Turn your onboarding into an adventure".

   Day one as a place you walk through rather than a slide deck.
   Four stations sit along a corridor; each one is a small thing a
   new starter would otherwise be told. The exit stays locked until
   all four have been found, so the learner leaves having explored
   the organisation instead of having been read to.
   ============================================================ */

export const meta = {
  eyebrow: 'Day one — find your way around',
  title: 'Walk the corridor and find all four stops.',
  counter: 'Found',
  hintStart: 'Use Left and Right to walk. Stop at anything that looks interesting.',
  hintNear: 'You’re next to something. Click it to take a look.',
  hintWalking: 'Keep going — there’s more down the corridor.',
  hintDoorLocked: 'The door at the end is locked. Something’s still unfound.',
  hintDoorOpen: 'The door is open. Walk right to finish your first day.',
  walkLeft: '← Left',
  walkRight: 'Right →',
  collect: 'Got it',
  restart: 'Restart',
};

export const stations = [
  {
    name: 'Reception',
    lines: [
      'Marta signs for every delivery and knows where everyone actually sits.',
      'If your badge stops working, this is the desk that fixes it in two minutes.',
    ],
    found: 'Reception — found',
  },
  {
    name: 'Your team',
    lines: [
      'Six of you, one shared board, stand-up at 9:30 by the window.',
      'Nobody here expects you to know the product in week one. They expect you to ask.',
    ],
    found: 'Your team — found',
  },
  {
    name: 'The product',
    lines: [
      'One machine, built in-house, sold to about four hundred sites.',
      'Every change you make ends up on a shop floor somewhere by Friday.',
    ],
    found: 'The product — found',
  },
  {
    name: 'Our history',
    lines: [
      'Started in a rented unit in 1998 with two people and a borrowed van.',
      'The borrowed van is still in the car park. Nobody will tell you why.',
    ],
    found: 'Our history — found',
  },
];

/* The optional extra. Nothing depends on finding it, which is the point. */
export const bonus = {
  label: 'A chipped mug',
  lines: [
    'Someone’s mug, left on the reception desk, with “WORLD’S OKAYEST ENGINEER” on it.',
    'It belongs to Dev in maintenance. He will want it back.',
  ],
  found: 'You picked up the mug. Nobody asked you to.',
};

export const door = {
  label: 'The way in',
  locked: 'Locked until you’ve found all four stops.',
  opening: 'The padlock drops. The door swings open.',
};

export const results = {
  title: 'First day, walked not watched',
  summary: 'You covered the same four things a slide deck would have told you — except you went and found them, so you also know where they are.',
  bonusPoint: '<b>The mug</b> — nobody told you to pick it up. You found it because you were looking.',
  noBonusPoint: 'There was one more thing in the corridor that nobody asked you to find. It’s still there.',
  closing: 'Being shown around is forgettable. Finding your own way around is a map you keep.',
  again: 'Walk it again',
  close: 'Close',
};
