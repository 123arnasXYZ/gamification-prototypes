/* ============================================================
   Content for "Give learners something to juggle".

   A week as a team lead. Four measures stand in the team area and
   every decision moves two or three of them — some up, some down.
   Nothing on this list is purely good.

   Values run 0–100 and carry across the whole run. They are never
   reset between decisions, which is the whole point: the fourth
   decision is made on whatever the first three left behind.

   Pressure is the odd one out. High Trust, Morale and Capacity are
   healthy; high Pressure is not. That is said out loud in the bar
   labels and in the brief, so nobody has to infer it.
   ============================================================ */

export const meta = {
  eyebrow: 'Your team — one week',
  title: 'Four decisions. Everything you choose moves more than one thing.',
  intro: 'Three of these bars should stay high. Pressure should stay low. You cannot keep all four where you want them.',
  stepLabel: 'Decision {n} of {total}',
  movedUp: 'up',
  movedDown: 'down',
  thresholdHint: 'The amber line on each bar is the point where something starts to break.',
};

/* `inverted: true` means high is bad. The bar colour rule reads this,
   and the hint says it in words so the colour is not the only signal. */
export const measures = [
  { id: 'trust',    name: 'Trust',    hint: 'Keep this high', start: 62, inverted: false, limit: 25 },
  { id: 'pressure', name: 'Pressure', hint: 'Keep this LOW',  start: 48, inverted: true,  limit: 85 },
  { id: 'morale',   name: 'Morale',   hint: 'Keep this high', start: 60, inverted: false, limit: 25 },
  { id: 'capacity', name: 'Capacity', hint: 'Keep this high', start: 55, inverted: false, limit: 20 },
];

export const decisions = [
  {
    brief: 'The release date is tight. Finance has already told the client it lands on Friday, and you have about six days of work left.',
    options: [
      {
        text: 'Commit to Friday and ask the team for extra hours this week.',
        note: 'They say yes, because you asked. It costs them.',
        effects: { pressure: +22, capacity: -14, morale: -10 },
      },
      {
        text: 'Tell the client the date moves by a week.',
        note: 'The team hears that you took the hit instead of passing it down. Next week is now crowded.',
        effects: { trust: +12, pressure: -10, capacity: -12 },
      },
      {
        text: 'Cut the smallest part of the release and keep Friday.',
        note: 'Friday is safe. The two people who built that part watch it get dropped.',
        effects: { pressure: -8, trust: -10, morale: -5 },
      },
    ],
  },
  {
    brief: 'One of your team has been stuck on the same piece of work for three days and has stopped asking questions.',
    options: [
      {
        text: 'Sit with them for two days and work through it together.',
        note: 'They unstick, and the team notices you spent your own days on it. Those days are gone.',
        effects: { morale: +12, trust: +10, capacity: -16 },
      },
      {
        text: 'Move their work to the two people who are already fastest.',
        note: 'The work moves. So does the load, onto people who were already full.',
        effects: { capacity: +6, pressure: +14, morale: -12 },
      },
      {
        text: 'Leave them to it and watch the deadline instead.',
        note: 'Nobody is rescued and nobody is told why. They stop volunteering.',
        effects: { capacity: +4, trust: -14, morale: -10 },
      },
    ],
  },
  {
    brief: 'Another department asks for one extra screen in this release. They call it small. It is about a day and a half.',
    options: [
      {
        text: 'Take it on. It is a small ask and it keeps them on side.',
        note: 'They are delighted. A day and a half you did not have is now spoken for.',
        effects: { trust: +8, capacity: -18, pressure: +16 },
      },
      {
        text: 'Say no, and show them what it would cost.',
        note: 'The team can breathe. The other department now thinks you are difficult.',
        effects: { trust: -10, pressure: -8, morale: +5 },
      },
      {
        text: 'Take it on and drop something of the same size.',
        note: 'The maths works. Swapping work mid-week is its own kind of tiring.',
        effects: { trust: +4, pressure: +6, morale: -6 },
      },
    ],
  },
  {
    brief: 'Someone asks for Thursday and Friday off. It was booked weeks ago, before the date moved onto them.',
    options: [
      {
        text: 'Approve it. The week gets harder, but they booked it.',
        note: 'Word travels fast that leave means leave here.',
        effects: { morale: +14, trust: +10, capacity: -16 },
      },
      {
        text: 'Ask them to move it to after the release.',
        note: 'They move it. Everyone else quietly works out what their own leave is worth.',
        effects: { morale: -14, trust: -12, capacity: +8 },
      },
      {
        text: 'Approve Thursday and cover Friday between you.',
        note: 'A fair-looking split. The covering lands on you and the one person left.',
        effects: { morale: +4, trust: +2, pressure: +10 },
      },
    ],
  },
];

/* Threshold events. Each fires at most once, the moment a measure
   crosses its limit. The knock-on is deliberate: a thing that breaks
   does not leave the rest of the system untouched. */
export const events = [
  {
    id: 'burnout',
    measure: 'pressure',
    title: 'Someone burns out',
    line: 'Your steadiest person goes off sick on Wednesday and does not answer messages.',
    knockOn: { morale: -10, capacity: -10 },
  },
  {
    id: 'silence',
    measure: 'trust',
    title: 'The team stops speaking up',
    line: 'Stand-up gets shorter every day. Problems now reach you after they have happened.',
    knockOn: { capacity: -8 },
  },
  {
    id: 'leaving',
    measure: 'morale',
    title: 'Someone starts looking elsewhere',
    line: 'A recruiter call gets taken in the car park. You are not supposed to know.',
    knockOn: { capacity: -8 },
  },
  {
    id: 'slip',
    measure: 'capacity',
    title: 'The deadline slips anyway',
    line: 'There is no room left in the week. Friday goes, and this time nobody chose it.',
    knockOn: { trust: -8 },
  },
];

/* The ending is a description of the state you left the team in, not a
   grade. First match wins, so the worst readings are tested first. */
export const endings = [
  {
    id: 'empty',
    test: (m, fired) => m.pressure >= 70 || fired.includes('burnout'),
    title: 'Delivered, on a team running on empty',
    line: 'The work went out. The people who did it have nothing left for next week, and next week is already booked.',
  },
  {
    id: 'quiet',
    test: (m) => m.trust <= 40,
    title: 'A team that has stopped telling you things',
    line: 'Nothing is obviously on fire. That is now the only thing you know, because the bad news stopped arriving.',
  },
  {
    id: 'reserve',
    test: (m) => m.capacity <= 25,
    title: 'A team with nothing held back',
    line: 'Every hour of the week is spent before it starts. The next surprise, whatever it is, lands on bare rock.',
  },
  {
    id: 'steady',
    test: (m) => m.trust >= 50 && m.morale >= 55 && m.capacity >= 35 && m.pressure <= 50,
    title: 'A steady team that gave a little ground on the date',
    line: 'You traded some of the schedule for people who will still be here, and still talking, in a month.',
  },
  {
    id: 'middle',
    test: () => true,
    title: 'A team somewhere in the middle',
    line: 'Nothing broke and nothing is thriving. Everything you gained, you paid for somewhere on this floor.',
  },
];

export const ending = {
  eyebrow: 'Where you left them',
  eventsLabel: 'What happened along the way',
  noEvents: 'Nothing broke. No limits were crossed.',
  point: 'There was no high score to chase here. Every option moved something good and something bad, and the only skill on offer was keeping four things that pull against each other inside their limits.',
  again: 'Run the week again',
};
