/* ============================================================
   Content for "Let the world react without you".

   Three decisions, each taken with one person. The point is what
   happens to everyone else: the team talk to each other between
   decisions, relationships between people you never spoke to move,
   and some of what you caused only surfaces a round later, in a
   message you were not meant to be impressed by.

   `links` are between team members, never between a member and the
   learner — the learner's own standing is not the thing being
   modelled here. Positive is "still talking properly".
   ============================================================ */

export const meta = {
  eyebrow: 'Your team — three weeks',
  title: 'You only ever talk to one person. Everyone hears about it anyway.',
  workspace: 'Fieldwork Studio',
  channelsLabel: 'Channels',
  channel: '# delivery',
  channelNote: '4 members · you are the lead',
  peopleLabel: 'Team',
  dmLabel: 'One-to-one with {name}',
  settling: 'The week goes on…',
  weekLabel: 'Week {n}',
  youName: 'You',
  youStatus: 'the only one they all talk to',
  restart: 'Restart',
};

/* Avatar colours, one per person — the initials are drawn from the name. */
export const avatarColours = {
  ade: '#C2573F', nia: '#2757E2', tom: '#1F8A6D', kara: '#7A4FD1', you: '#10131A',
};

/* How each person is doing with the rest of the team, worst first. */
export const memberStatus = [
  { atMost: -0.35, tone: 'bad',  text: 'not speaking to someone' },
  { atMost:  0.05, tone: 'warn', text: 'careful around the team' },
  { atMost:  0.45, tone: '',     text: 'fine' },
  { atMost:  Infinity, tone: 'good', text: 'working well with everyone' },
];

/* The four of them. The learner is not on this list. */
export const people = [
  { id: 'ade',  name: 'Ade',  role: 'Delivery' },
  { id: 'nia',  name: 'Nia',  role: 'Delivery' },
  { id: 'tom',  name: 'Tom',  role: 'Client lead' },
  { id: 'kara', name: 'Kara', role: 'Analyst' },
];

/* Everything starts civil but not warm. */
export const startLink = 0.35;

export const decisions = [
  {
    with: 'ade',
    brief: 'Ade has missed the deadline again. You take it to a one-to-one, just the two of you.',
    options: [
      {
        text: 'Move Ade’s work over to Nia for now',
        effects: { 'ade-nia': -0.55, 'nia-tom': -0.2 },
        now: [{ from: 'nia', text: 'Picking up Ade’s bits this week. That’s the second lot this month, but fine.' }],
        later: [{ from: 'ade', text: 'Apparently my work went to Nia. Would’ve been good to hear that from me first.' }],
      },
      {
        text: 'Ask what is getting in the way and keep it between you',
        effects: { 'ade-nia': 0.1 },
        now: [],
        later: [{ from: 'tom', text: 'Is anything happening about last week’s deadline? The client is still asking me.' }],
      },
      {
        text: 'Post the new plan in the team channel so nobody is guessing',
        effects: { 'ade-nia': -0.25, 'ade-tom': -0.3, 'ade-kara': -0.3 },
        now: [{ from: 'kara', text: 'Didn’t really need to be public, did it.' }],
        later: [{ from: 'ade', text: '🙂' }],
      },
    ],
  },
  {
    with: 'kara',
    brief: 'Kara asks you for the new project. Tom has been waiting for something like it for months.',
    options: [
      {
        text: 'Give it to Kara',
        effects: { 'kara-tom': -0.6 },
        now: [{ from: 'kara', text: 'Thanks for this — starting on it tonight.' }],
        later: [{ from: 'tom', text: 'Congrats Kara. Genuinely.' }, { from: 'nia', text: 'Tom’s gone very quiet in standups.' }],
      },
      {
        text: 'Split it between Kara and Tom',
        effects: { 'kara-tom': -0.15, 'nia-kara': 0.1 },
        now: [{ from: 'tom', text: 'Happy to share it. We’ll work out who does what.' }],
        later: [{ from: 'kara', text: 'Who is actually running this one? Tom and I keep redoing each other’s work.' }],
      },
      {
        text: 'Give it to Tom and tell Kara why',
        effects: { 'kara-tom': -0.25, 'kara-nia': -0.2 },
        now: [{ from: 'tom', text: 'Appreciate it. I’ll take it from here.' }],
        later: [{ from: 'kara', text: 'Fair enough. I’ll stop putting my hand up then.' }],
      },
    ],
  },
  {
    with: 'nia',
    brief: 'Nia tells you she is at capacity and something has to give this week.',
    options: [
      {
        text: 'Move some of Nia’s work to Ade',
        effects: { 'ade-nia': -0.35, 'ade-tom': -0.2 },
        now: [{ from: 'ade', text: 'Got it. I’ll do what I can with it.' }],
        later: [{ from: 'tom', text: 'The thing that moved to Ade hasn’t landed. I’ve had to tell the client.' }],
      },
      {
        text: 'Push the deadline out a week',
        effects: { 'nia-tom': -0.3, 'ade-nia': 0.15 },
        now: [{ from: 'nia', text: 'Thank you. Genuinely needed that.' }],
        later: [{ from: 'tom', text: 'Found out from the client that we’d moved the date. That was a fun call.' }],
      },
      {
        text: 'Take it on yourself and say nothing',
        effects: { 'nia-kara': 0.1 },
        now: [],
        later: [{ from: 'kara', text: 'Why is our manager doing delivery work at 11pm? Are we in trouble?' }],
      },
    ],
  },
];

/* How a link reads, worst first. `atMost` is the value it tops out at. */
export const linkStates = [
  { atMost: -0.35, id: 'broken',  label: 'not speaking', colour: 0xe0234e },
  { atMost:  0.05, id: 'strained', label: 'strained',    colour: 0xe0a32a },
  { atMost:  0.45, id: 'civil',    label: 'civil',        colour: 0x9aa3ae },
  { atMost:  Infinity, id: 'good', label: 'working well', colour: 0x5fe0b0 },
];

/* The state of the team at the end, tested in order. */
export const endings = [
  {
    maxBroken: 0,
    minAverage: 0.3,
    title: 'A team that still talks to each other',
    line: 'Nothing you did landed on somebody who was not in the room. They sorted the rest out between themselves.',
  },
  {
    maxBroken: 0,
    minAverage: -1,
    title: 'Holding, but quieter',
    line: 'Nobody has fallen out. A few of them are being careful with each other in a way they were not three weeks ago.',
  },
  {
    maxBroken: 1,
    minAverage: -1,
    title: 'One relationship paid for it',
    line: 'Two people who used to work things out between themselves now route everything through you.',
  },
  {
    maxBroken: 99,
    minAverage: -1,
    title: 'A team that goes through you for everything',
    line: 'Several of them have stopped dealing with each other directly. Every decision you made was about one person; none of them stayed that way.',
  },
];

export const recapTitle = 'What happened while you were not looking';
export const noRipples = 'Nothing came back to you that you had not already heard.';
export const point =
  'Not one of those messages came from the person you were talking to. '
  + 'Decisions land on people who were never in the room, and some of it only shows up a week later.';

export const again = 'Run the three weeks again';
export const close = 'Close';
