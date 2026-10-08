/* ============================================================
   Content for "Add bonus challenges".

   The base activity is deliberately plain: six fire-safety
   questions, three options each. Nothing about it is clever.

   The five achievements below are what makes it worth running
   twice. Only two of them are about answering well — the rest
   reward restraint, curiosity, and recovering from a mistake, so
   the same six questions give five different things to chase.
   ============================================================ */

export const meta = {
  eyebrow: 'Annual refresher — 6 questions',
  title: 'Fire safety knowledge check',
  stepLabel: 'Question {n} of {total}',
  instructions: 'Pick an answer, then confirm it.',
  readyToConfirm: 'Happy with that one? Confirm it.',
  chasing: 'Chasing',
  hintLabel: 'Show me a clue',
  hintUsed: 'Clue shown',
  confirmLabel: 'Confirm answer',
  whyLabel: 'Why?',
  nextLabel: 'Next question',
  finishLabel: 'See how you did',
  correct: 'Correct.',
  wrong: 'Not that one.',
  hiddenMark: '?',
  hiddenLocked: 'Hidden for now',
  earnedMark: 'Earned',
};

export const questions = [
  {
    id: 'alarm',
    prompt: 'The fire alarm sounds while you are mid-task at your desk. What do you do first?',
    options: [
      'Leave by the nearest marked exit',
      'Finish the sentence you are typing, then go',
      'Wait until you see other people moving',
    ],
    answer: 0,
    hint: 'Two of these options involve waiting for something.',
    why: 'The alarm is the instruction — there is nothing else to wait for. Every second spent deciding is a second the corridor gets busier.',
  },
  {
    id: 'wedge',
    prompt: 'You find a fire door held open with a wooden wedge. What do you do?',
    options: [
      'Prop it wider so trolleys can get through',
      'Remove the wedge and let it close',
      'Leave it — someone opened it for a reason',
    ],
    answer: 1,
    hint: 'Think about the one job that door has when it is shut.',
    why: 'A fire door only works closed. Held open, it is a gap in the wall that smoke travels through — and smoke reaches people long before flames do.',
  },
  {
    id: 'assembly',
    prompt: 'What is the assembly point actually for?',
    options: [
      'Somewhere sheltered to wait out the weather',
      'A spot to wait for a colleague to say it is clear',
      'Where a roll call confirms everyone is out',
    ],
    answer: 2,
    hint: 'Someone at the assembly point is holding a list.',
    why: 'The assembly point exists so somebody can count. If you drift off to your car, you are recorded as still inside and someone goes back in to look for you.',
  },
  {
    id: 'bin',
    prompt: 'A waste bin catches light. You have had no extinguisher training. What now?',
    options: [
      'Grab the nearest extinguisher and put it out',
      'Raise the alarm and leave with everyone else',
      'Open a window to let the smoke out',
    ],
    answer: 1,
    hint: 'One of these is only an option if you have been trained for it.',
    why: 'Untrained use of an extinguisher buys seconds and costs minutes. Raising the alarm protects the whole building; tackling the fire protects one bin.',
  },
  {
    id: 'boxes',
    prompt: 'Cardboard boxes have been stacked in the corridor by the stairs. Why does that matter?',
    options: [
      'It makes the corridor look untidy',
      'It is fuel, and it narrows your way out',
      'It only counts if it blocks the door itself',
    ],
    answer: 1,
    hint: 'A corridor has two jobs here, and the boxes affect both.',
    why: 'Storage in an escape route does two things at once: it adds something to burn, and it slows down the people trying to get past it.',
  },
  {
    id: 'report',
    prompt: 'An extinguisher on your floor has clearly been discharged. What do you do?',
    options: [
      'Tell the fire warden or facilities today',
      'Nothing — extinguishers get checked annually',
      'Stick a note on it and carry on',
    ],
    answer: 0,
    hint: 'The next person to reach for it will not read your note first.',
    why: 'An empty extinguisher is worse than no extinguisher: someone will trust it in an emergency. Reporting it the same day is the whole job.',
  },
];

/* How many right answers counts as a pass on the plain activity.
   The achievements are deliberately separate from this. */
export const passMark = 4;

/* ------------------------------------------------------------------
   The five bonus challenges.

   `test(state)` reads the live run. `atEnd` ones cannot be settled
   until the last question is confirmed ("finish the rest" needs a
   finish). `hidden` ones stay off the board until the learner is
   within `revealWithin` of the target, then appear as a nudge —
   that distance is a tuning knob, so it lives here.
   ------------------------------------------------------------------ */
export const achievements = [
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    locked: 'Four correct answers in a row',
    earned: 'Four correct in a row — Sharpshooter.',
    hidden: true,
    need: 4,
    revealWithin: 1,
    nudge: 'One more correct answer to unlock Sharpshooter.',
    progress: (s) => s.streak,
    test: (s) => s.streak >= 4,
  },
  {
    id: 'comeback',
    name: 'Comeback Kid',
    locked: 'Get one wrong, then finish the rest clean',
    earned: 'One slip and nothing after it — Comeback Kid.',
    atEnd: true,
    test: (s) => s.wrongAt.length === 1 && s.wrongAt[0] < s.answered - 1,
  },
  {
    id: 'nohelp',
    name: 'No Help Needed',
    locked: 'Finish without asking for a single clue',
    earned: 'Six questions, no clues — No Help Needed.',
    atEnd: true,
    test: (s) => s.flags.every((f) => !f.hintUsed),
  },
  {
    id: 'curious',
    name: 'Curious Mind',
    locked: 'Read the "why?" on three questions',
    earned: 'Three explanations read — Curious Mind.',
    need: 3,
    progress: (s) => s.flags.filter((f) => f.whyOpened).length,
    test: (s) => s.flags.filter((f) => f.whyOpened).length >= 3,
  },
  {
    id: 'second',
    name: 'Second Thoughts',
    locked: 'Change your mind before confirming',
    earned: 'You changed your answer before locking it in — Second Thoughts.',
    test: (s) => s.flags.some((f) => f.changedAnswer),
  },
];

export const result = {
  title: 'Six questions, five things to chase',
  summary: 'You scored {score} out of {total}.',
  earnedLabel: 'Earned',
  missedLabel: 'Missed',
  earnedPoint: '<b>{name}</b> — earned.',
  missedPoint: '<b>{name}</b> — still open: {locked}.',
  nothingEarned: 'None of the five this time — every one of them is still there to go after.',
  point: '<b>The questions never changed.</b> Same six, same three options, same right answers — and five different ways to win at them. One run cannot catch all five, because chasing a clean streak and chasing every explanation pull in different directions.',
  again: 'Run it again, go after a different one',
  close: 'Close',
};
