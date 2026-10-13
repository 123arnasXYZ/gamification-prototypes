/* ============================================================
   Content for "Let learners experiment with a simulator".

   A service desk week. Three controls, four live outputs, five
   simulated days. Nothing here is a question with an answer: every
   string is either a label, a goal, or a neutral description of what
   the system just did.

   {braces} are filled in by main.js. The numbers live here too —
   the model at the bottom of this file (the budget, the week's
   arrivals, the return rate), the board's proportions, the colour
   bands and the run timings. main.js holds no tuning of its own.
   ============================================================ */

export const meta = {
  eyebrow: 'Service desk — one week, five days',
  title: 'Three dials. Set them, run the week, see what the desk does.',

  hint: 'Click the − and + blocks on the desk to change a dial. Nothing is right or wrong — run it and watch.',
  hintRunning: 'Running the week…',

  challengeLabel: 'Challenge',
  runsLabel: 'Runs',

  goalsLabel: 'What counts as cleared',
  runButton: 'Run the week',
  runAgainButton: 'Run it again',
  runningButton: 'Running…',
  nextButton: 'Next challenge',
  lastChallengeButton: 'See what you worked out',
  finishButton: 'Finish',

  challengeCounter: 'Challenge {n} of {total}',
  runCounter: 'Run {n} on this challenge',
  firstRun: 'No runs yet on this challenge',

  idleDay: 'Not running',
  weekDone: 'End of the week',

  money: '£{n}',
};

export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/* The three dials. `start` is where every restart puts them, and the
   first run from the starting position does not clear the week — which
   is the point: the learner has to move something. */
export const controls = [
  {
    id: 'people',
    name: 'People on the desk',
    unit: '',
    min: 2, max: 8, step: 1, start: 3,
    note: 'Each one works a normal day.',
  },
  {
    id: 'minutes',
    name: 'Minutes per ticket',
    unit: 'min',
    min: 4, max: 20, step: 2, start: 10,
    note: 'Thorough work takes longer. Rushed work comes back.',
  },
  {
    id: 'overtime',
    name: 'Overtime per person',
    unit: 'h',
    min: 0, max: 10, step: 1, start: 0,
    note: 'Hours booked across the week. They are not free.',
  },
];

/* The four things that move while the week runs. */
export const outputs = {
  queue: { name: 'Tickets waiting', unit: '' },
  returns: { name: 'Came back', unit: '' },
  cost: { name: 'Cost of the week', unit: '' },
  strain: { name: 'Staff strain', unit: '/100' },
};

export const budgetLine = 'Budget line';

/* ---------------- The three challenges ----------------
   `rules` is read by the simulator: noOvertime forbids booked hours,
   maxReturns caps the rework pile. The budget applies to all three. */
export const challenges = [
  {
    id: 'clear',
    title: "Clear the week's tickets.",
    line: 'Every ticket that arrives this week is dealt with by Friday evening, and the week stays inside the budget.',
    goals: [
      'Nothing left waiting on Friday',
      'Cost at or under {budget}',
    ],
    rules: { noOvertime: false, maxReturns: null },
    win: 'Friday evening, empty queue, inside the budget. That is the first relationship: the desk clears what it has time for.',
  },
  {
    id: 'nohours',
    title: 'Clear them again — without booking any overtime.',
    line: 'Same week, same arrivals, same budget. The overtime dial stays on zero, so whatever it was buying you has to come from somewhere else.',
    goals: [
      'Nothing left waiting on Friday',
      'Overtime on zero',
      'Cost at or under {budget}',
    ],
    rules: { noOvertime: true, maxReturns: null },
    win: 'Cleared on normal hours. The time came out of the other two dials, and the strain bar shows what that cost the people instead.',
  },
  {
    id: 'thorough',
    title: 'Clear them with fewer than {maxReturns} coming back — and the budget is the same.',
    line: 'The rework pile has to stay under {maxReturns} for the whole week. Overtime is allowed again. The budget line does not move.',
    goals: [
      'Nothing left waiting on Friday',
      'Fewer than {maxReturns} tickets came back',
      'Cost at or under {budget}',
    ],
    rules: { noOvertime: false, maxReturns: 10 },
    win: 'Thorough work, cleared, inside the same money. Slower per ticket turned out to be cheaper than doing it twice.',
  },
];

/* ---------------- What the run did ----------------
   Neutral descriptions. The system reports, it does not grade. */
export const report = {
  cleared: 'Friday ended with an empty queue.',
  leftOver: '{n} tickets were still waiting on Friday evening.',
  leftOverOne: 'One ticket was still waiting on Friday evening.',

  returnsSome: '{n} tickets came back during the week.',
  returnsOne: 'One ticket came back during the week.',
  returnsNone: 'Nothing came back.',

  cost: 'The week cost {cost}.',
  overBudget: 'That is {over} over the budget line.',
  underBudget: 'That leaves {under} of the budget unspent.',

  strain: 'Strain peaked at {n} out of 100.',

  overtimeBooked: '{n} overtime hours per person were booked.',
  overtimeNone: 'No overtime was booked.',

  tail: '{n} of those came back after Friday — next week starts with them.',
};

/* One short line the moment a run ends. Never "wrong" — just what
   the desk did with the settings it was given. */
export const runToast = {
  cleared: 'Cleared by Friday.',
  notCleared: 'Friday came and the queue was still there.',
  overtimeUsed: 'Cleared, but on booked overtime.',
  tooManyReturns: 'Cleared, and {n} of them came back.',
  overBudget: 'Cleared, and over the budget line.',
  challengeMet: 'Challenge met.',
};

/* ---------------- Ending ---------------- */
export const ending = {
  eyebrow: 'What the desk taught you',
  title: 'You worked out the system by running it',
  titlePartial: 'As far as you took it',

  summaryAll: 'Three goals, and none of them were a question with options. You moved a dial, watched five days play out, and changed your mind about what to move next.',
  summarySome: 'You cleared {n} of the {total} goals. The dials are still on the desk and the week still runs the same way.',

  runsLabel: 'What it took',
  runsLine: '<b>{title}</b> — {runs}',
  runsCleared: 'cleared in {n} {word}',
  runsOpen: '{n} {word}, still open',
  runsNone: 'not attempted',
  run: 'run',
  runs: 'runs',

  foundLabel: 'What the week actually does',
  found: [
    'Tickets cleared per day is people multiplied by their day, divided by minutes per ticket. Add a person or cut the minutes and the queue drains faster — the two dials are interchangeable for throughput, and nothing else about them is.',
    'Overtime buys throughput without buying a person, so it is the cheap way to clear the week and the expensive way to run a desk: it lands straight on the strain bar.',
    'Minutes per ticket is the only dial that touches the rework pile. Under about a quarter of an hour, work starts coming back a day or two later — and a returned ticket costs the desk the same as a new one.',
    'Which is why the thorough settings can clear the week on the same money as the fast ones. Fast is only cheaper if the work stays done.',
  ],

  settled: 'You finished on <b>{people} people</b>, <b>{minutes} minutes</b> a ticket and <b>{overtime} overtime hours</b> each.',

  point: 'Nobody told you how the desk worked. There was no option list to read and no answer to pick — you formed a hunch, moved one dial, ran the week and watched the system disagree with you. That is the only way these relationships ever stick.',

  close: 'Close',
  again: 'Start over',
};

/* ============================================================
   The model

   Everything the week does comes out of these numbers. They are
   tuned so that each challenge has a small band of settings that
   works and a wide band that visibly does not:

     • the starting dials (3 people, 10 min, no overtime) end Friday
       with ~90 tickets still waiting
     • challenge 2 needs 5 people at 10 minutes, or 4 at 8
     • challenge 3 needs 14+ minutes a ticket, which only clears the
       week inside the budget at 6 people, or 5 plus some overtime
   ============================================================ */
export const model = {
  days: 5,
  dayMinutes: 180,            // minutes of actual ticket work in a day
  arrivals: [84, 74, 70, 60, 52],
  dayRate: 170,               // per person, per day
  otRate: 46,                 // per overtime hour, per person
  budget: 5600,
  returnDelay: 2,             // a rushed ticket comes back two days later
  thoroughAt: 14,             // minutes per ticket where returns bottom out
  returnSlope: 0.03,          // extra return rate per minute below that
  returnFloor: 0.015,
};

/* How much of the board each drawn thing is worth.

   The board is composed at `board` and scaled as one piece to fit
   whatever room the overlay leaves it, so the proportions hold at
   any window size. `queue` is 10 x 4 blocks of six tickets, which is
   more than the worst week this model can produce; `returns` is
   3 x 5 blocks of five, so a rushed pile is visibly taller than a
   thorough one. `costHeadroom` is how far past the budget line the
   cost bar can read before it tops out. */
export const view = {
  board: { w: 820, h: 560 },
  queue: { perBlock: 6, cols: 10, rows: 4 },
  returns: { perBlock: 5, cols: 3, levels: 5 },
  costHeadroom: 1.3,
};

/* Where the readings change colour. Strain carries these as bands
   drawn behind the bar, so the thresholds are visible before the
   bar ever reaches them. */
export const bands = {
  queueHigh: 40,      // tickets waiting, above which the count reads red
  returnsWarn: 10,    // rework, at or above which the pile reads red
  strainCalm: 45,     // mint below this
  strainHot: 75,      // amber below this, red above
};

/* The week takes about five seconds: each day lands its post, works
   through what it can, then holds for a beat. */
export const timing = {
  arrive: 300,        // the day's post and anything coming back
  work: 480,          // the desk working the queue down
  settle: 150,        // beat between days
  tail: 420,          // returns that land after Friday
  hold: 220,          // beat on "End of the week"
  press: 160,         // a − or + block being pushed
};
