/* ============================================================
   Content for "Add bonus challenges".

   The base activity is a planning puzzle, not a quiz: you have
   tomorrow, three meetings you cannot move, and seven jobs that
   add up to exactly the time you have left. Fit them in. That is
   the whole activity, and on its own it takes a minute.

   The six challenges below are what makes it worth running more
   than once. They run at the same time, they are judged against
   the plan you build rather than against answers, and some of
   them cannot both be true — "everything in the day" takes the
   last free half hour that "a proper break" needs. So one run
   cannot catch all six, and the second run is a different game
   played on the same board.

   EVERY learner-facing string and every tunable number is here.
   ============================================================ */

export const meta = {
  eyebrow: 'Tomorrow — 08:00 to 18:00',
  title: 'Build tomorrow out of what is on your list',
  trayLabel: 'On your list',
  dayLabel: 'Tomorrow',
  chalLabel: 'Challenges',
  chalSub: 'All six are live at once',
};

/* ------------------------------------------------------------------
   The day. 20 slots of 30 minutes, 08:00 to 18:00. Change `slots`
   or `slotMinutes` and the grid, the labels and every challenge
   below follow it.
   ------------------------------------------------------------------ */
export const day = {
  startHour: 8,
  slots: 20,
  slotMinutes: 30,
};

/* The three things already in the diary. `from` is a slot index:
   slot 0 is 08:00. These cannot be moved, which is the whole
   reason the puzzle is tight. */
export const meetings = [
  { id: 'team', name: 'Team meeting', from: 5, slots: 2 },
  { id: 'hartley', name: 'Hartley call', from: 12, slots: 2, client: true },
  { id: 'priya', name: '1:1 with Priya', from: 15, slots: 1 },
];

/* ------------------------------------------------------------------
   The seven jobs. Together they are 15 half-hours, and the day has
   exactly 15 half-hours that are not a meeting — so a plan that
   holds everything holds nothing else.

   must     — the day does not run without it
   deep     — real concentration, worth protecting
   waiting  — somebody else is held up until it is done
   ------------------------------------------------------------------ */
export const tasks = [
  {
    id: 'proposal',
    name: 'Finish the Hartley proposal',
    short: 'Hartley proposal',
    slots: 4,
    must: true, deep: true,
    note: 'Two hours. They are on the call at 14:00 expecting to talk about it.',
  },
  {
    id: 'spec',
    name: 'Write the handover spec',
    short: 'Handover spec',
    slots: 3,
    deep: true,
    note: 'Ninety minutes of head-down writing. Nobody is chasing it yet.',
  },
  {
    id: 'review',
    name: "Review Kara's draft",
    short: "Kara's draft",
    slots: 2,
    must: true, waiting: true,
    note: 'Kara cannot send it until you have been through it.',
  },
  {
    id: 'numbers',
    name: 'Pull the quarter numbers for Tom',
    short: 'Quarter numbers',
    slots: 2,
    waiting: true,
    note: 'Tom is building his board pack around them.',
  },
  {
    id: 'calls',
    name: 'Return the three supplier calls',
    short: 'Supplier calls',
    slots: 2,
    note: 'All three rang yesterday. None of them is urgent on its own.',
  },
  {
    id: 'inbox',
    name: 'Clear the inbox',
    short: 'Inbox',
    slots: 1,
    note: 'Half an hour and it is done. It will not stay done.',
  },
  {
    id: 'expenses',
    name: 'Expenses, before the cut-off',
    short: 'Expenses',
    slots: 1,
    must: true,
    note: 'Half an hour, and the cut-off is tonight.',
  },
];

/* ------------------------------------------------------------------
   The plain activity: what makes a day you can actually run. This
   is deliberately easy — it is the thing the challenges sit on top
   of, not the thing you replay for.
   ------------------------------------------------------------------ */
export const baseline = {
  /* The proposal has to be finished before the client call starts. */
  proposalBy: 12,
  missingMusts: (names) => `Still to place: ${names.join(', ')}.`,
  proposalLate: 'The day runs — but the proposal is not finished before the Hartley call at 14:00.',
  ready: 'The day runs. Six challenges are live — see how many this plan catches.',
};

/* ------------------------------------------------------------------
   The six challenges.

   Each is tested against the plan, live, while it is being built —
   so the board shows you trading one for another as you move
   things about.

   test(p)     — true when the plan earns it
   progress(p) — [done, needed] for the ones worth counting
   hidden      — stays a "?" on the board until `revealAt` progress
   clash       — the one it fights with, named in the ending
   ------------------------------------------------------------------ */
export const challenges = [
  {
    id: 'early',
    name: 'Clear Head',
    goal: 'Start the proposal before 10:00',
    earned: 'The hardest job got your first, best hours.',
    missed: 'The proposal started after 10:00, on second-best attention.',
    test: (p) => p.placed('proposal') && p.start('proposal') < 5,
  },
  {
    id: 'waiting',
    name: 'Nobody Waiting',
    goal: 'Finish both jobs other people need by 12:00',
    earned: 'Kara and Tom both got what they needed before lunch.',
    missed: 'Somebody spent the afternoon waiting on you.',
    progress: (p) => [
      (p.placed('review') && p.end('review') <= 8 ? 1 : 0) + (p.placed('numbers') && p.end('numbers') <= 8 ? 1 : 0),
      2,
    ],
    test: (p) => p.placed('review') && p.end('review') <= 8 && p.placed('numbers') && p.end('numbers') <= 8,
  },
  {
    id: 'break',
    name: 'Proper Break',
    goal: 'Leave half an hour free between 12:00 and 13:30',
    earned: 'There was half an hour in the middle of the day that belonged to you.',
    missed: 'You ate at the desk between two jobs.',
    clash: 'Nothing Left Over',
    test: (p) => [8, 9, 10, 11].some((s) => p.isFree(s)),
  },
  {
    id: 'air',
    name: 'Breathing Room',
    goal: 'Keep the half hour before every meeting free',
    earned: 'You walked into all three meetings without finishing something on the way.',
    missed: 'At least one meeting started the second you put something else down.',
    clash: 'Front Loaded',
    hidden: true,
    revealAt: 2,
    nudge: 'One more clear half hour before a meeting unlocks Breathing Room.',
    progress: (p) => [[4, 11, 14].filter((s) => p.isFree(s)).length, 3],
    test: (p) => [4, 11, 14].every((s) => p.isFree(s)),
  },
  {
    id: 'all',
    name: 'Nothing Left Over',
    goal: 'Get everything on the list into the day',
    earned: 'Seven jobs, seven slots in the day, nothing carried over to Thursday.',
    missed: 'Something on the list never got a time, so it moves to Thursday by default.',
    clash: 'Proper Break',
    hidden: true,
    revealAt: 6,
    nudge: 'One job left to place and Nothing Left Over is yours.',
    progress: (p) => [p.placedCount, 7],
    test: (p) => p.placedCount === 7,
  },
  {
    id: 'front',
    name: 'Front Loaded',
    goal: 'Fill every working half hour before 12:00',
    earned: 'Three solid hours were behind you before most people had started.',
    missed: 'The morning had gaps in it.',
    clash: 'Breathing Room',
    progress: (p) => [[0, 1, 2, 3, 4, 7].filter((s) => !p.isFree(s)).length, 6],
    test: (p) => [0, 1, 2, 3, 4, 7].every((s) => !p.isFree(s)),
  },
];

/* ------------------------------------------------------------------
   What the learner reads while building.
   ------------------------------------------------------------------ */
export const ui = {
  pickPrompt: 'Click a job, then click where it starts.',
  pickedPrompt: '{name} — {len}. Click a start time, or click it again to put it back.',
  noRoom: 'It will not fit there — something is already in the way.',
  pastEnd: 'That runs past 18:00.',
  runLabel: 'Run the day',
  clearLabel: 'Clear the day',
  againLabel: 'Plan it again',
  closeLabel: 'Close',
  lockedMark: '?',
  /* Challenges you have already caught stay caught: a new plan starts
     with them marked, and the board keeps the running total. */
  bankedBadge: 'EARNED BEFORE',
  collected: (n, total) => `${n} of ${total} caught so far`,
  lastLeft: (name) => `${name} is the last one on the board.`,
  hiddenGoal: 'Hidden for now',
  onTrack: 'On track',
  running: 'Running the day…',
  duration: (slots) => (slots === 1 ? '30 minutes' : slots % 2 ? `${slots / 2} hours` : `${slots / 2} hour${slots > 2 ? 's' : ''}`),
};

/* ------------------------------------------------------------------
   The day playing out. Each beat fires as the clock passes its slot.
   `when` reads the same plan the challenges do.
   ------------------------------------------------------------------ */
export const beats = [
  {
    at: (p) => p.end('proposal'),
    when: (p) => p.placed('proposal') && p.end('proposal') <= 12,
    text: 'The proposal goes over to Tom, finished, with time to spare.',
    tone: 'good',
  },
  {
    at: () => 12,
    when: (p) => !p.placed('proposal') || p.end('proposal') > 12,
    text: 'You take the Hartley call with the proposal still half-written.',
    tone: 'bad',
  },
  {
    at: () => 9,
    when: (p) => [8, 9, 10, 11].some((s) => p.isFree(s)),
    text: 'Half an hour with nothing booked in it. You leave the desk.',
    tone: 'good',
  },
  {
    at: () => 9,
    when: (p) => ![8, 9, 10, 11].some((s) => p.isFree(s)),
    text: 'Lunch happens at the desk, between two jobs.',
    tone: '',
  },
  {
    at: () => 19,
    when: (p) => p.placedCount < 7,
    text: 'Six o\'clock. What never got a slot moves to Thursday.',
    tone: '',
  },
];

/* ------------------------------------------------------------------
   The ending.
   ------------------------------------------------------------------ */
export const result = {
  titleAll: 'Six out of six — on one plan',
  title: '{n} of the six, from one day',
  titleNone: 'The day ran. None of the six.',
  summary: 'Same three meetings, same seven jobs, same ten hours. The plan is the only thing that changed.',
  onTime: '<b>The proposal was finished before the Hartley call.</b> That was the job the day was really for, and it got done.',
  late: '<b>You took the Hartley call with the proposal half-written.</b> None of the six challenges covers that — the plain activity still has to work first.',
  earnedPoint: '<b>{name}</b> — {earned}',
  bankedPoint: '<b>{name}</b> — not on this plan, but you caught it on an earlier one. It stays caught.',
  collected: '<b>{n} of the six, across {runs} plans.</b> {left}',
  leftSome: '{k} still waiting for a plan that catches {them}.',
  leftNone: 'There is nothing left on the board to chase.',
  missedPoint: '<b>{name}</b> — {missed}',
  clashPoint: '<b>You cannot have all six.</b> The last free half hour cannot be both a break and the seventh job, and the gap before a meeting cannot be both empty and part of a full morning. Choosing which challenge to chase <i>is</i> the second playthrough.',
  point: '<b>Nothing here was added to the activity.</b> The day, the meetings and the list never changed — six optional goals were laid over the top of them, and between them they ask for accuracy, kindness to the people waiting, protecting your own attention and knowing when to leave something undone.',
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
  wall: '#EEF1F7',
  slot: '#FAFBFD',
  slotFree: '#FFFFFF',
  drop: '#E6EDFE',
  dropEdge: '#2757e2',
  meeting: '#E7EAF2',
  meetingInk: '#555D70',
  deep: '#E4ECFF',
  deepInk: '#1F49BE',
  wait: '#FDF1DC',
  waitInk: '#9A6B08',
  plain: '#EDF0F6',
  plainInk: '#3C4455',
  mintTint: '#EAFBF4',
  mintInk: '#12A177',
  redTint: '#FDECF0',
  redInk: '#B51C40',
  clock: '#2757e2',
  shade: 'rgba(16,19,26,0.08)',
};

export const view = {
  board: { w: 1004, h: 500 },
  maxScale: 1.3,
  minRegion: { w: 320, h: 230 },
  fontFamily: 'Urbanist, "Segoe UI", system-ui, -apple-system, sans-serif',

  tray: { x: 2, y: 2, w: 246, top: 44, cardH: 52, gap: 7 },
  grid: { x: 272, y: 2, w: 374, top: 44, labelW: 48, slotH: 22 },
  chal: { x: 672, y: 2, w: 330, top: 44, chipH: 62, gap: 9 },
};

export const timing = {
  place: 180,       // a job settling into the grid
  runMs: 5200,      // the clock sweeping 08:00 to 18:00
  beatIn: 220,
  endHold: 700,
};
