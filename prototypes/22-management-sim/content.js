/* ============================================================
   Content for "Build a management simulation".

   Five days in a support office. Four people, three lanes of work.
   The learner runs the place by moving people between lanes and
   spending a small number of one-off day actions. Nothing here is a
   question with a right answer — the only thing the learner chooses
   is where the bodies go and what the day gets spent on.

   Everything learner-facing lives in this file, including the rules,
   so the simulation can be re-tuned without touching main.js.

   The four measures run 0–100 and carry across the whole week. The
   learner never sees a number: bars and colour only. Queue and Risk
   are inverted — high is bad — which is said in words on the board
   so colour is never the only signal.
   ============================================================ */

export const meta = {
  eyebrow: 'A support office — five days',
  title: 'You are running the place. Move people. Spend the week.',
  days: 5,
  dayLabel: 'Day {n} of {total}',
  intro: 'Pick a person, then pick a lane. When you are happy with the day, end it.',
  pickHint: 'Pick a person, then pick a lane to move them into.',
  placeHint: 'Now pick a lane for {name} — or pick {name} again to stand them down.',
  endDay: 'End the day',
  endWeek: 'End the week',
  boardHint: 'Nothing on the board is a number. Watch which way it moves.',
  needsLabel: 'What today is asking for',
  needTemplate: '{lane} needs {need} — {have} on it',
  actionsLabel: 'What you do with the day — one use each, all week',
  countWords: ['nobody', 'one person', 'two people', 'three people', 'four people'],
  movedTo: '{name} moves to {lane}.',
  stoodDown: '{name} stands down and waits for a lane.',
  outUnavailable: '{name} is not in today.',
  actionSpent: 'You have already used that one this week.',
  alreadyThere: '{name} is already on {lane}.',
};

/* ---------------- The floor ---------------- */
export const lanes = [
  {
    id: 'desk',
    name: 'Front desk',
    note: 'The queue the customers can see.',
  },
  {
    id: 'projects',
    name: 'Projects',
    note: 'The work that only matters later.',
  },
  {
    id: 'admin',
    name: 'Admin and cover',
    note: 'Holiday cover, the audit, the backlog.',
  },
];

/* ---------------- The people ----------------
   resilience scales how fast strain builds. Nobody is a machine and
   nobody is made of glass; the spread is small on purpose. */
export const people = [
  { id: 'priya',  name: 'Priya',  note: 'Fast on the desk. Never says she has had enough.', resilience: 0.9 },
  { id: 'tomas',  name: 'Tomas',  note: 'Knows the audit file better than anyone.',         resilience: 1.0 },
  { id: 'dani',   name: 'Dani',   note: 'Carries the project work when it is left alone.',   resilience: 1.15 },
  { id: 'marcus', name: 'Marcus', note: 'Steady anywhere, quietly, for about three days.',   resilience: 1.05 },
];

/* ---------------- The board ---------------- */
export const measures = [
  { id: 'queue',    name: 'Queue',    hint: 'Keep this LOW',  start: 34, inverted: true },
  { id: 'morale',   name: 'Morale',   hint: 'Keep this high', start: 62, inverted: false },
  { id: 'progress', name: 'Progress', hint: 'Keep this high', start: 30, inverted: false },
  { id: 'risk',     name: 'Risk',     hint: 'Keep this LOW',  start: 30, inverted: true },
];

/* ============================================================
   Rules
   ============================================================ */
export const rules = {
  /* What a normal day asks for, before the event moves it. */
  baseNeed: { desk: 2, projects: 1, admin: 1 },

  /* Thresholds the day resolution and the delayed effects read. */
  queueHighAt: 58,
  queueLowAt: 28,
  riskBiteAt: 60,
  strainDropOutAt: 84,
  /* Coming back from a day out does not make somebody new. */
  strainAfterDropOut: 66,
  strainBands: { calm: 38, strained: 66 },

  /* Day-to-day movement. */
  /* Tuned so that four straight days in one lane takes somebody out:
     day one carries no same-lane cost, then roughly 21–24 a day. */
  strainPerDay: 9,
  strainSameLaneBonus: 12,
  strainDeskSurcharge: 3,
  strainRestRelief: -20,
  moraleOnDropOut: -9,

  /* Every daily move is jittered, so the same week never repeats. */
  variation: 0.2,

  /** Short-handed desk climbs fast. An over-staffed desk drains, but
      only at the speed one spare pair of hands can drain it — piling
      the whole floor onto the desk buys nothing the third person did
      not already buy, and costs everything the other lanes needed. */
  queueMove(onDesk, need) {
    const gap = need - onDesk;
    return gap > 0 ? gap * 15 : Math.max(gap, -1.2) * 11;
  },

  /** Projects need somebody on them or the work quietly slides back. */
  progressMove(onProjects, need) {
    return onProjects * 10 - need * 7;
  },

  /** Nobody on admin means nobody is doing the audit. */
  riskMove(onAdmin, need) {
    const gap = need - onAdmin;
    return gap > 0 ? gap * 12 : gap * 8;
  },

  /** Same-day morale drift, from how tired the floor already is. */
  moraleMove(averageStrain) {
    if (averageStrain >= 62) return -7;
    if (averageStrain <= 30) return 4;
    return -2;
  },

  /** How much a day costs one person. */
  strainMove(person, { working, sameLane, lane }) {
    if (!working) return this.strainRestRelief;
    let s = this.strainPerDay + (sameLane ? this.strainSameLaneBonus : 0);
    if (lane === 'desk') s += this.strainDeskSurcharge;
    return s * (person.resilience ?? 1);
  },
};

/* ============================================================
   Events

   `opening` always lands on day one. The rest are shuffled, so an
   identical set of decisions in a different week does not play out
   the same way.

   need:  moves what the lanes are asking for today
   kind:  a handle main.js uses for the one-off mechanical twists
   now:   applied the moment the day resolves
   ============================================================ */
export const opening = {
  id: 'monday',
  title: 'Monday, and the weekend is still on the phone',
  line: 'Three days of voicemail and two days of email landed at eight. The desk is the only thing anyone can see this morning.',
  need: { desk: 1 },
};

export const events = [
  {
    id: 'sick',
    kind: 'sick',
    title: '{name} calls in sick',
    line: '{name} rang before seven. Whatever you had planned for them today is now somebody else\'s day.',
    need: {},
  },
  {
    id: 'audit',
    kind: 'audit',
    title: 'The audit arrives early',
    line: 'The folder is on your chair with a date on it. Somebody has to sit with it, and it is not a job you can do in gaps.',
    need: { admin: 1 },
    auditBite: 'The auditor opens the file and finds the gaps you left all week. It becomes everyone\'s afternoon.',
    biteEffect: { morale: -10, progress: -8, risk: 6 },
  },
  {
    id: 'deadline',
    kind: 'deadline',
    title: 'The project date is pulled forward',
    line: 'The thing that was due in a fortnight is now due in a week. Nobody asked you first.',
    need: { projects: 1 },
    now: { progress: -6 },
  },
  {
    id: 'complaint',
    kind: 'complaint',
    title: 'A complaint goes over your head',
    line: 'Somebody who waited forty minutes on Thursday has written to your director instead of to you.',
    need: { desk: 1 },
    now: { risk: 9, morale: -4 },
  },
  {
    id: 'starter',
    kind: 'starter',
    title: 'A new starter needs a day of somebody',
    line: 'She is keen, she has no logins, and she cannot be left on anything alone. One of your four is really half of one today.',
    need: { admin: 1 },
  },
  {
    id: 'backlog',
    kind: 'backlog',
    title: 'The backlog gets a name and a deadline',
    line: 'The pile everyone has been stepping over is now on a report with your name beside it.',
    need: { admin: 1 },
    now: { risk: 5 },
  },
];

/* Lines that need a person's name filled in. */
export const eventNotes = {
  sick: '{name} is out for the day.',
  starter: '{name} spends the day with the new starter and gets through about half a day of anything else.',
};

/* ============================================================
   Day actions — one use each, for the whole week.
   No right answer; each one buys something and sells something.
   ============================================================ */
export const dayActions = [
  {
    id: 'late',
    label: 'Ask the floor to stay late',
    note: 'They stay. The queue goes down tonight and the cost arrives later in the week.',
    now: { queue: -18, progress: 6 },
    strainAll: 11,
    later: { delay: 2, effect: { morale: -12 }, line: 'The late night catches up. Two people are visibly flat and one of them is short with a customer.' },
  },
  {
    id: 'protect',
    label: 'Protect the project hours',
    note: 'Nobody pulls the project people onto the desk, whatever the desk looks like.',
    now: { progress: 12, queue: 8 },
    later: { delay: 1, effect: { progress: 6 }, line: 'The protected hours show up as finished work rather than half-finished work.' },
  },
  {
    id: 'rest',
    label: 'Send the most worn-out person home',
    note: 'One person gets the day back. The lanes cope with three.',
    restMostStrained: true,
    now: { queue: 6 },
    later: { delay: 1, effect: { morale: 9 }, line: 'Word gets round that you sent somebody home before they broke, not after.' },
  },
];

export const actionNotes = {
  rest: 'You send {name} home. They are not on the floor today.',
};

/* ============================================================
   Consequences that arrive late.

   Tested against the floor as it stood at the end of a day, then
   scheduled for one or two days afterwards. This is where most of
   the simulation lives: the staffing that was right yesterday is
   being paid for today.
   ============================================================ */
export const delayed = [
  {
    id: 'queue-morale',
    delay: 1,
    test: (s, r) => s.measures.queue >= r.queueHighAt,
    effect: { morale: -13 },
    line: 'The queue you left is still in the room this morning. Nobody on the desk has had a civil conversation yet.',
  },
  {
    id: 'desk-only',
    delay: 2,
    test: (s) => s.counts.projects === 0 && s.counts.admin === 0 && s.counts.desk > 0,
    effect: { risk: 16, progress: -9 },
    line: 'The day everyone stood on the desk: the audit folder was not opened, and the project went backwards while nobody was looking.',
  },
  {
    id: 'empty-desk',
    delay: 1,
    test: (s) => s.counts.desk === 0,
    effect: { morale: -8, risk: 7 },
    line: 'The day nobody was on the desk has turned into eleven emails that all start "I tried to call".',
  },
  {
    id: 'project-care',
    delay: 2,
    test: (s) => s.counts.projects >= 2,
    effect: { progress: 9 },
    line: 'The pair you left on the project finished something properly. It lands early and it lands done.',
  },
  {
    id: 'admin-held',
    delay: 2,
    test: (s, r) => s.counts.admin >= 1 && s.measures.risk <= r.riskBiteAt,
    effect: { risk: -7 },
    line: 'The cover and the paperwork somebody did quietly this week means nothing is overdue.',
  },
  {
    id: 'calm-queue',
    delay: 1,
    once: true,            // a lift, not an income stream
    test: (s, r) => s.measures.queue <= r.queueLowAt,
    effect: { morale: 6 },
    line: 'A short queue two mornings running. The desk sounds different.',
  },
];

export const strainNotes = {
  dropOut: '{name} does not come in. Four days in the same lane and that is where it ends.',
  returns: '{name} is back, and not in any lane yet.',
  rising: '{name} has been in the same lane all week and it is starting to show.',
};

/* ============================================================
   The handover. Not a score — a description of the place.
   Bands are read top-down: the first one whose `at` the value
   reaches is the one that gets said.
   ============================================================ */
export const handover = {
  eyebrow: 'Five o\'clock on Friday',
  title: 'The place you are handing over',
  lead: 'Somebody else has this office on Monday. This is what they walk into.',

  queueLabel: 'The queue you left',
  queueBands: [
    { at: 76, line: 'The queue is the first thing anybody sees. Monday morning starts already behind, and the people who inherit it did not make it.' },
    { at: 52, line: 'There is a queue. Not a crisis, but it is never empty and it has not been empty for days.' },
    { at: 26, line: 'The desk is clear enough that somebody can look up. That is rarer than it sounds.' },
    { at: 0,  line: 'There is no queue at all. The desk has been over-staffed and the room knows it.' },
  ],

  peopleLabel: 'Who is still standing',
  personBands: [
    { at: 80, line: '<b>{name}</b> is finished. One more week like this one and they will not be here for it.' },
    { at: 62, line: '<b>{name}</b> is still turning up, and that is about all you can say.' },
    { at: 38, line: '<b>{name}</b> is tired in the ordinary way. Fine on Monday.' },
    { at: 0,  line: '<b>{name}</b> had a week with some air in it and is in good shape.' },
  ],
  droppedNote: '<b>{name}</b> dropped out mid-week and you got them back short.',

  undoneLabel: 'What never got done',
  progressBands: [
    { at: 70, line: 'The project is genuinely ahead. Somebody protected it while the room was noisy.' },
    { at: 45, line: 'The project moved, but not as far as the date it is now measured against.' },
    { at: 22, line: 'The project is roughly where it was on Monday. Five days went into the room instead.' },
    { at: 0,  line: 'The project went backwards. It was the only thing with no one shouting about it.' },
  ],
  riskBands: [
    { at: 72, line: 'The audit, the cover and the backlog were all somebody-else\'s-job all week. Every one of them is still waiting, and now they are late.' },
    { at: 48, line: 'The paperwork is behind. Not dangerously, but nothing is signed off.' },
    { at: 0,  line: 'The admin held. The audit file is current and the cover rota is done.' },
  ],

  nextLabel: 'The one thing that lands on somebody next week',
  nextBands: [
    { id: 'risk',     line: 'The audit comes back with the gaps in it. Somebody who was not here this week will be asked to explain them.' },
    { id: 'queue',    line: 'Monday\'s queue, plus Monday\'s own callers. The first person on the desk takes that on alone.' },
    { id: 'morale',   line: 'A resignation. It has not been written yet, but the week it came out of has been.' },
    { id: 'progress', line: 'The project date, which has not moved, meeting the project, which has.' },
  ],

  eventsLabel: 'What the week threw at you',
  pendingLabel: 'Still in the post',
  variability: 'Make exactly these decisions again and it will not go the same way. The events come in a different order, and the week they land in is never the week you planned for.',
  again: 'Run the week again',
};
