/* ============================================================
   Content for "Let learners build their answer".

   A customer at the returns desk. The reply is built from two
   separate choices — a Tone and an Action — and each one is
   scored on its own, so 4 x 4 gives sixteen replies and sixteen
   different pieces of feedback.

   The customer is drawn, and she reacts to each half as it
   arrives: the tone lands first and her face moves, then the
   action lands and it moves again. That is the whole argument of
   this prototype made visible — the two parts of the answer are
   two different things, and she can like one and not the other.

   `face` is what each option does to her:
     mood  -1 (upset) .. +1 (relieved)
     heat   0 (fine)  ..  1 (bristling — brows down, leaning back)

   EVERY learner-facing string and every tunable number is here.
   ============================================================ */

export const meta = {
  eyebrow: 'Customer service — returns desk',
  title: 'Build your reply, one part at a time.',
  customer: 'My kettle arrived this morning with a cracked lid. It’s a birthday present for my mum, and her birthday is on Saturday.',
  name: 'Mrs Doyle',
  role: 'Order #40219 · arrived today',
  youLabel: 'You',
  draftLabel: 'You · not sent yet',
  counterNote: 'Cracked lid',
};

/* How she arrives: not angry, not fine. */
export const startFace = { mood: -0.3, heat: 0.18 };

/* ------------------------------------------------------------------
   The two parts. Each option carries the words it puts in the reply,
   the mark it earns on its own, and what it does to her face.
   ------------------------------------------------------------------ */
export const parts = [
  {
    id: 'tone',
    label: 'Tone',
    prompt: 'How you say it',
    options: [
      {
        id: 'apologetic', label: 'Apologetic', score: 2,
        line: 'I’m so sorry — that isn’t what should have arrived.',
        feedback: 'Owning the problem first tells the customer you’re on their side.',
        face: { mood: 0.3, heat: 0 },
      },
      {
        id: 'neutral', label: 'Neutral', score: 1,
        line: 'Thanks for letting us know about the lid.',
        feedback: 'Polite, but it doesn’t acknowledge that a birthday present is now at risk.',
        face: { mood: -0.1, heat: 0.12 },
      },
      {
        id: 'casual', label: 'Casual', score: 0,
        line: 'Ah, no worries — these things happen!',
        feedback: '“No worries” brushes off something the customer is clearly worried about.',
        face: { mood: -0.6, heat: 0.45 },
      },
      {
        id: 'defensive', label: 'Defensive', score: 0,
        line: 'Our packaging is tested, so that’s very unusual.',
        feedback: 'Defending the packaging makes it sound like you doubt them.',
        face: { mood: -0.7, heat: 0.95 },
      },
    ],
  },
  {
    id: 'action',
    label: 'Action',
    prompt: 'What you actually do',
    options: [
      {
        id: 'replace', label: 'Replace', score: 2,
        line: 'I’ll send a new one today by next-day delivery, so you’ll have it well before Saturday.',
        feedback: 'They need a working kettle by Saturday — this is the only option that gets them one.',
        face: { mood: 0.9, heat: 0 },
      },
      {
        id: 'refund', label: 'Refund', score: 1,
        line: 'I’ll refund you in full right now.',
        feedback: 'It fixes the fault, but they’d still have no present for Saturday.',
        face: { mood: 0, heat: 0.1 },
      },
      {
        id: 'investigate', label: 'Investigate', score: 0,
        line: 'I’ll raise it with our warehouse and get back to you within five working days.',
        feedback: 'Five working days means no kettle for the birthday. Look into it after they’re sorted.',
        face: { mood: -0.8, heat: 0.3 },
      },
      {
        id: 'escalate', label: 'Escalate', score: 0,
        line: 'I’ll pass this to my manager to decide what we can offer.',
        feedback: 'This is well within what you can fix yourself. Passing it up only adds a wait.',
        face: { mood: -0.65, heat: 0.45 },
      },
    ],
  },
];

/* How much each half counts towards where her face ends up. The
   action weighs more because it is the half that decides Saturday. */
export const faceWeights = { tone: 0.4, action: 0.6 };

/** Headline for a combination — says which half of the thinking worked. */
export function verdict(tone, action) {
  if (tone === 2 && action === 2) return 'Spot on';
  if (action === 2) return tone === 1 ? 'Right fix, a little flat' : 'Right action, handled the wrong way';
  if (tone === 2) return action === 1 ? 'Right tone, nearly the right fix' : 'Right tone, wrong fix';
  if (tone === 1 && action === 1) return 'Close on both, strong on neither';
  if (tone === 1 || action === 1) return 'One part nearly there, one part misses';
  return 'Neither part landed';
}

/** What she says back once the whole reply has landed. */
export function reply(tone, action) {
  if (tone === 2 && action === 2) return 'Oh, thank you — that’s such a relief.';
  if (action === 2) return '…Fine. As long as it actually turns up before Saturday.';
  if (tone === 2) return 'I appreciate that, but it doesn’t really help me for Saturday.';
  if (tone + action === 2) return 'Okay. I suppose that’s something.';
  return 'So what am I supposed to give her on Saturday?';
}

/** The half-way read: what her face is doing after only the tone has
    landed, before she knows what you are actually going to do. */
export const midRead = {
  2: 'She relaxes a little. You have not fixed anything yet.',
  1: 'Nothing moves. She is waiting for the part that matters.',
  0: 'That landed badly, and you have not even got to the fix yet.',
};

export const ui = {
  pickBoth: 'Pick a tone and an action. Your reply builds itself underneath.',
  pickTone: 'Pick how you want to say it.',
  pickAction: 'Now pick what you are actually going to do.',
  ready: 'That is your reply. Send it and watch her take it in two halves.',
  sending: 'Sending…',
  emptyTone: '[how you say it]',
  emptyAction: '[what you do]',
  sendBtn: 'Send reply',
  againBtn: 'Build another one',
  triedLabel: 'Replies built',
  markStrong: 'Strong',
  markPartly: 'Partly',
  markMisses: 'Misses',
  combos: (n) => `${n} possible replies from these two lists`,
  bestHint: 'Now try a weaker combination and watch which half she reacts to.',
  moreHint: 'Change one half and watch what moves.',
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
  wall: '#EDF0F7',
  shopWall: '#E3E8F2',
  shelf: '#C8B191',
  stock: ['#D1663F', '#3F7FA8', '#E3B52E'],
  counter: '#D9DEE8',
  counterEdge: '#C0C8D7',

  skin: '#E8B591',
  skinShade: '#D59F79',
  hair: '#4A3426',
  hairLight: '#5D4433',
  coat: '#7A4FB5',
  coatDark: '#664199',
  mouth: '#8E3B4A',
  eye: '#2A2520',
  blush: 'rgba(224,35,78,0.18)',

  kettle: '#F1F1EE',
  kettleEdge: '#C9CDD4',
  crack: '#2A313C',

  bubbleThem: '#FFFFFF',
  bubbleYou: '#2757e2',
  bubbleYouInk: '#FFFFFF',
  mintTint: '#EAFBF4',
  mintInk: '#12A177',
  redTint: '#FDECF0',
  redInk: '#B51C40',
  amberInk: '#9A6B08',
  shade: 'rgba(16,19,26,0.08)',
};

export const view = {
  board: { w: 1004, h: 500 },
  maxScale: 1.26,
  minRegion: { w: 300, h: 150 },
  fontFamily: 'Urbanist, "Segoe UI", system-ui, -apple-system, sans-serif',

  scene: { x: 2, y: 2, w: 392 },
  chat: { x: 408, y: 2, w: 594, pad: 18, gap: 14 },
  avatar: { cx: 196, cy: 232, r: 62 },
};

export const timing = {
  typeToneMs: 1100,     // your tone being said
  readToneMs: 900,      // the beat where she takes only the tone in
  typeActionMs: 1500,   // your action being said
  readActionMs: 800,
  replyTypeMs: 1200,    // her answer coming back
  faceMs: 520,          // how long her face takes to move
  blinkEveryMs: 4200,
  blinkMs: 150,
};
