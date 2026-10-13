/* ============================================================
   Content for "Give learners a rival".

   A shared backlog on a table at the start of the day. Twelve work
   cards, every one of them showing what it is WORTH and how many
   HOURS it takes. Nothing is hidden from either side.

   You take a card with your hands; Mara, working the same board from
   the other side, immediately takes one. You both have the same
   number of hours, and the day ends when neither of you can afford
   anything that is left.

   Mara is not a script. She reads the last two cards you took and
   picks a rule accordingly — and she says which rule it was, every
   time, so the learner can read her. Totals are by worth delivered,
   so six quick wins can lose to three big ones.

   Tuning lives in `config`. The intent:
     - 8 hours each, cards cost 1-3, so five or six cards a side
     - worth 6 and up is a "big one" (the cards she denies you)
     - a 1-hour card is a "quick win" (the ones she leaves you)
   ============================================================ */

export const meta = {
  eyebrow: 'Tuesday, 09:00 — the shared backlog',
  title: 'Take the work off the board. Mara is taking from the same board.',
  instructions: 'Click a card to take it. Mara takes one straight after you.',
  prompt: 'Your move — click a card to take it.',
  hoursLeft: 'You have {n} hours left in the day.',
  lastHour: 'You have one hour left in the day.',
  outOfHours: 'Your day is full. Mara is still working.',
  youLabel: 'Your hours',
  youWorthLabel: 'Your worth',
  maraLabel: 'Mara’s hours',
  maraWorthLabel: 'Mara’s worth',
  maraEyebrow: 'Mara, from the other side of the table',
  maraWaiting: 'Mara has not moved yet.',
  restart: 'Restart',
  close: 'Close',
  again: 'Run the day again',
  recapHeading: '<b>What she was responding to, in order:</b>',
};

/* The two sides of the table, as printed on the mats. */
export const sides = {
  you: 'You',
  rival: 'Mara',
};

/* Printed on every card, above the two numbers. */
export const cardCaptions = {
  worth: 'Worth',
  hours: 'Hours',
};

/* hours: the budget each side gets for the day.
   highWorth: at or above this, a card counts as one of the big ones.
   quickHours: at or below this, a card counts as a quick win.
   slack: how close a second-best card has to be before she might take
   it instead — this is the whole of her unpredictability, and it is
   deliberately small so her choice never looks arbitrary. */
export const config = {
  hours: 8,
  highWorth: 6,
  quickHours: 1,
  slack: 0.88,
};

/* The board. `worth` is what delivering it is worth; `hours` is what it
   costs the side that takes it. Both numbers are printed on the card. */
export const cards = [
  { id: 'renewal',    name: 'Renewal quote — Harlow & Finch',  worth: 9, hours: 3 },
  { id: 'tender',     name: 'Tender response — Ellis Park',    worth: 8, hours: 3 },
  { id: 'pricing',    name: 'Pricing review — top ten accounts', worth: 7, hours: 2 },
  { id: 'deck',       name: 'Status deck for Thursday',        worth: 6, hours: 2 },
  { id: 'redlines',   name: 'Contract redlines — Veyra',       worth: 5, hours: 2 },
  { id: 'supplier',   name: 'Supplier chase — three overdue',  worth: 4, hours: 2 },
  { id: 'handover',   name: 'Handover notes — new starter',    worth: 3, hours: 1 },
  { id: 'dunmore',    name: 'Call back the Dunmore site',      worth: 3, hours: 1 },
  { id: 'expenses',   name: 'Expenses approvals',              worth: 2, hours: 1 },
  { id: 'timesheets', name: 'Timesheet sign-off',              worth: 2, hours: 1 },
  { id: 'inbox',      name: 'Inbox triage',                    worth: 1, hours: 1 },
  { id: 'deskmove',   name: 'Desk move checklist',             worth: 1, hours: 1 },
];

/* What she says, picked by WHY she took it. {card} is the card's name.
   One short line, because the line is how the learner reads her. */
export const maraLines = {
  opening: [
    'One card is not a pattern yet, so I take the maths — {card}.',
    'Nothing to read off you so far. {card} pays best per hour.',
  ],
  deny: [
    'You have had two of the big ones. I will have {card}.',
    'You are going straight for worth, so {card} is not going the same way.',
    'Two heavy ones to you already. {card}, before you reach for it.',
  ],
  quickWins: [
    'You are clearing the small ones. I will leave those and take {card}.',
    'Count is not what gets scored here. {card}, please.',
    'Have the quick ones. {card} is mine.',
  ],
  efficient: [
    'You are mixing it, so I have nothing to lock on to. {card} pays best per hour.',
    'No pattern off you yet. The efficient one is {card}.',
    'Can’t read you this round, so I take the maths — {card}.',
  ],
  squeeze: [
    'The big ones are out of my reach now. {card} it is.',
    'Not enough hours left for anything heavy. I will take {card}.',
  ],
};

/* The recap at the end: one entry per run of the same rule, in the
   order they fired. {cards} is filled in with what that rule took. */
export const ruleRecap = {
  opening: 'With one pick of yours to go on she had no pattern to read, so she opened on the best worth per hour.',
  deny: 'You took two high-worth cards in a row, so she started taking the big ones first — ahead of you, and at a higher cost in her own hours.',
  quickWins: 'You were racking up quick wins, so she left them for you and took the high-worth cards, because she is scoring on worth.',
  efficient: 'You mixed big cards and small ones, so she had nothing to lock on to and fell back to the best worth-per-hour card left.',
  squeeze: 'Her hours had run short, so she took the best of what still fitted.',
};

export const recapLine = '{label} <b>Took {cards}.</b>';

/* {card}, {worth}, {hours}, {n} filled in by the scene. */
export const feedback = {
  youTook: 'Taken — {card}. Worth {worth}, {hours} off your day.',
  tooLong: '{card} needs {hours} hours and you have {n}. Pick something that fits.',
  maraOut: 'Mara is out of hours. The rest of the board is yours.',
  youOut: 'You are out of hours. Mara is finishing the board.',
};

/* Chosen by the gap between your worth and hers. */
export const results = [
  {
    min: 6,
    title: 'You delivered the day',
    summary: 'You read what she was doing and took the worth before she could. She spent her hours on what was left.',
  },
  {
    min: 1,
    title: 'You delivered more — just',
    summary: 'You finished ahead on worth, but not by enough that it would survive her expecting it.',
  },
  {
    min: 0,
    title: 'Dead level',
    summary: 'The same worth delivered on both sides of the table, out of the same board and the same hours.',
  },
  {
    min: -5,
    title: 'Mara delivered more',
    summary: 'She finished ahead on worth. Look at what she took and when she started taking it.',
  },
  {
    min: -999,
    title: 'Mara took the day off you',
    summary: 'She ended up with most of the worth on the board. Your hours went somewhere, just not into the cards that counted.',
  },
];

export const endingPoints = {
  totals: 'You delivered <b>{you}</b> of worth from {youCards} cards. Mara delivered <b>{mara}</b> from {maraCards}.',
  volume: 'You cleared more cards than she did and still delivered less worth. The day is scored on what got delivered, not on how many things you touched.',
  fewer: 'You cleared fewer cards than she did and delivered more worth. That is what the board is scored on.',
  plays:
    '<b>Mara was playing you, not running a script.</b> Every card she took was chosen off the last two cards '
    + 'you took, so there is no fixed route to learn here — change what you take and what she takes changes with it.',
  nextTime:
    'Settle into a pattern and she has you: two cards of the same kind in a row is all she needs to start taking '
    + 'the worth ahead of you. The route that won once is the first thing she will expect next time.',
};
