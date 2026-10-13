/* ============================================================
   Content for "Give learners someone to practise with".

   A one-to-one with Rae, who has asked for ten minutes. She talks;
   the learner has exactly one decision, three times over: when to
   open their mouth.

     cut in while she is mid-sentence  -> she closes up and says less
     speak in the pause she leaves     -> she feels heard and goes further
     let the pause run too long        -> it goes awkward and she fills it
     stay quiet and let her keep going -> right on some turns, not others

   There is no list of replies anywhere in here on purpose. Nobody is
   picking the best-worded sentence; they are practising when to use
   one. Every word the learner reads lives in this file, and so do the
   timings, the phase lengths, the palette and the postures.
   ============================================================ */

export const meta = {
  eyebrow: 'One-to-one — Thursday, 4:15pm',
  title: 'Rae asked for ten minutes. The only thing you choose is when you speak.',

  /* Stat chips, top right */
  turnLabel: 'Turn',
  attemptLabel: 'Attempt',

  /* Names, used on the panel and on the two avatars */
  themName: 'Rae',
  youName: 'You',

  /* Controls */
  speakLabel: 'Your turn',
  quietLabel: 'Let her keep going',
  restartLabel: 'Restart',
  closeLabel: 'Close',
  againLabel: 'Run that moment again',

  /* How this works. Shown before the first turn and taken away once
     she starts talking, so it is read rather than skimmed past. */
  howToTitle: 'How this works',
  howTo:
    'Listen while Rae talks — pressing while she is mid-sentence cuts her off. '
    + 'When she stops, read how she left it. A sentence that tails off mid-thought is not an invitation: '
    + 'let her keep going. One that lands, or ends on a question, is yours to take, and the pause right '
    + 'after it is where she feels heard. Leaving that pause to run on is a choice too — do it long '
    + 'enough and she fills it herself.',

  /* The one line under the buttons */
  hint: 'The space bar does the same as “Your turn”. The ring around Rae is her, talking — it is not counting you down.',

  /* ---- The live status, directly above the two buttons ----
     One line per moment of the turn, in plain words. No marks, no
     counts, and nothing that says whether a press would be right. */
  introStatus: 'She shuts the door and sits down.',
  speakingStatus: 'Rae is talking right now. Let her finish.',
  windowStatus: 'Rae has stopped. This is the pause.',
  overrunStatus: 'The silence has run on. Any second now she will fill it herself.',
  reactingStatus: 'She is answering you.',
  doneStatus: 'She picks her bag up off the floor.',

  /* ---- The sub-label under “Your turn”, one per moment ---- */
  speakSubWaiting: 'Nothing to come in on yet. Wait for her to start.',
  speakSubSpeaking: 'She is mid-sentence — press now and you talk over her.',
  speakSubWindow: 'Now. She has finished and she is waiting on you.',
  speakSubOverrun: 'You are running out of room. The pause has gone cold.',

  /* ---- The sub-label under “let her keep going”, always the same ---- */
  quietSub: 'Use this when she has tailed off mid-thought and is clearly still going.',

  /* The tag on the ring around her avatar, so it reads as her and not
     as a clock ticking down on the learner. */
  ringLabel: 'Rae, talking',

  /* Shown in her words when she is cut off mid-sentence */
  cutMark: '—',

  /* Toasts */
  againToast: 'Same ten minutes, same three moments. Attempt {n}.',
  restartToast: 'Back to the first knock on the door.',
};

/* ------------------------------------------------------------------
   The palette. Two avatars sitting opposite each other, so the two
   wearable colours have to live next to each other: the house blue
   for the learner and a warm clay for Rae. Skin and hair are
   deliberately muted — the only saturated things in the room are the
   two tops and the ring.
   ------------------------------------------------------------------ */
export const palette = {
  blue: '#2757E2',
  blueInk: '#1B41B4',
  warm: '#D2763F',
  warmInk: '#8A3F10',
  mint: '#5FE0B0',
  mintInk: '#12A177',
  amber: '#E0A32A',
  amberInk: '#A8761A',
  danger: '#E0234E',

  ink: '#10131A',
  dim: '#4B5162',
  line: '#E4E7EF',
  line2: '#CED4E0',
  paper: '#FFFFFF',

  /* The room: warm, flat, two tones and a soft contact shadow */
  wall: '#EFEDE9',
  floor: '#E3DCD2',
  shade: 'rgba(42, 34, 26, 0.10)',
};

/* The two faceless avatars. `disc` is the tint behind them, `top` the
   shoulders, and the hair style decides whether there is a mass of it
   at the back or a short crop. */
export const looks = {
  you: {
    disc: '#E7EDFC', top: palette.blue, topDark: '#1E3F9C',
    skin: '#D7A880', hair: '#3A3330', hairStyle: 'crop', pill: palette.blueInk,
  },
  them: {
    disc: '#F7E9DE', top: palette.warm, topDark: '#A4521F',
    skin: '#E4BB95', hair: '#5D3F31', hairStyle: 'bob', pill: palette.warmInk,
  },
};

/* ------------------------------------------------------------------
   The 2D scene, composed in a fixed design space and scaled as one
   piece into whatever room the overlay leaves it. Everything here is
   in board coordinates.
   ------------------------------------------------------------------ */
export const view = {
  fontFamily: 'Urbanist, "Segoe UI", system-ui, -apple-system, sans-serif',

  /* A wide, shallow design space, because that is the shape of the
     room the overlay leaves between the topbar and the talk panel.
     Deliberately close to the smallest frame this has to work in, so
     at 900x520 the whole thing is still near 1:1 and at 1280x720 it
     scales up rather than down. */
  board: { w: 940, h: 250 },
  maxScale: 1.25,
  minRegion: { w: 220, h: 140 },
  floorY: 196,

  them: { cx: 810, cy: 118, r: 72, pillY: 232, shadeY: 196, pillSize: 13 },
  you: { cx: 72, cy: 136, r: 58, pillY: 222, shadeY: 198, pillSize: 13 },

  /* The timing ring around her avatar, and its tag */
  ring: { r: 86, width: 8, tagY: 14, tagSize: 11.5 },

  /* Her speech bubble, fixed so her words do not reflow the scene */
  bubble: {
    x: 152, y: 26, w: 536, h: 152, radius: 16,
    pad: 16, size: 14.5, lineHeight: 20, maxLines: 6,
    tailY: 118, tailH: 16, tailW: 12,
  },

  /* Her words arrive a few at a time rather than one by one */
  caretWidth: 2,        // the typing caret that follows her words in
  caretHeight: 0.92,    // as a fraction of the type size

  /* Idle motion, so nobody looks switched off */
  breath: { rise: 2.2, width: 0.012, rate: 1.45, talkRate: 2.4, refR: 72 },

  /* Named postures, in units of the avatar's own radius (and radians
     for `tilt`). `lean` is always "toward the other person", so it is
     applied in whichever direction that is. */
  postures: {
    listening: { lean: 0.04, rise: 0.00, tuck: 0.10, tilt: 0.00, dim: 0.00 },
    in: { lean: 0.14, rise: -0.015, tuck: 0.04, tilt: 0.045, dim: 0.00 },
    open: { lean: 0.21, rise: -0.025, tuck: 0.00, tilt: 0.075, dim: 0.00 },
    guarded: { lean: -0.08, rise: 0.02, tuck: 0.46, tilt: -0.05, dim: 0.10 },
    closed: { lean: -0.17, rise: 0.045, tuck: 0.82, tilt: -0.09, dim: 0.22 },
    flat: { lean: -0.02, rise: 0.01, tuck: 0.28, tilt: -0.03, dim: 0.06 },
  },
  poseEase: 6,
};

/* How long the bits between the decisions take. */
export const timing = {
  introMs: 950,
  /* Her reply types itself out at this rate; her opening line is paced
     to the length of the turn instead, so the pause still lands where
     the turn says it does. */
  replyPerCharMs: 24,
  caretBlinkMs: 530,
  reactMs: 650,
  replyBaseMs: 1800,
  replyPerChar: 26,
  replyMaxMs: 4800,
  nodMs: 520,
  ringEase: 14,
};

/* ------------------------------------------------------------------
   The three turns.

   speakMs  how long her line takes to come out
   pauseMs  the pause she leaves afterwards — the window
   lateMs   how long the silence can sit before she fills it herself

   Each outcome carries what she says next, the posture she takes,
   what it does to how open she is, and the line the ending uses.
   `gained` is something she only says when she is given the room;
   `unsaid` is what she was carrying and did not get out.
   ------------------------------------------------------------------ */
export const turns = [
  {
    n: 1,
    speakMs: 8200,
    pauseMs: 2300,
    lateMs: 2900,
    /* She is building to something and says so. The sentence does not
       land — it reaches for the next one. That is the cue to sit still. */
    line:
      'I know you have got the review at half past, so I will be quick. '
      + 'It is the cover for Dom. I have had his inbox and mine since the start of the month, '
      + 'and I am not keeping on top of either of them any more. There is a bit more to it than that, '
      + 'actually, and I might as well say it while I am here, because the real thing is',
    cueSpeaking: 'She is still building to something.',
    cueWindow: 'She has tailed off mid-thought — she has not finished.',
    speakSubWindow: 'She has not finished the sentence. Press now and you take the floor off her.',
    outcomes: {
      early: {
        posture: 'closed',
        open: -18,
        reply: 'Sorry — no, it is fine. Honestly. I am managing it.',
        recap: 'you came in over the top of her and she took it back. “I am managing it” is what people say instead of the real sentence.',
        unsaid: 'that she has stopped keeping on top of either inbox',
      },
      heard: {
        posture: 'open',
        open: 16,
        reply: 'Thank you. The honest version is I asked about it twice. Once in writing. Nothing came back, so I stopped asking.',
        recap: 'you let the sentence land and then spoke into the gap, and she went from the workload to the thing underneath it.',
        gained: 'that she asked twice and then stopped asking',
      },
      late: {
        posture: 'guarded',
        open: -9,
        reply: 'Anyway. It is probably just the time of year. Everyone is flat out, I am not special.',
        recap: 'the pause went on long enough that she had to rescue it, and what she reached for was a way of making it smaller.',
        unsaid: 'that she asked twice and then stopped asking',
      },
      quiet: {
        posture: 'in',
        open: 11,
        reply: 'And the bit I actually came in to say is that I have started wondering whether I would be better off somewhere this does not happen.',
        recap: 'you said nothing at all, and she used the room to go further than she had planned to.',
        gained: 'that she has started thinking about leaving',
      },
    },
  },

  {
    n: 2,
    speakMs: 7600,
    pauseMs: 2100,
    lateMs: 2600,
    /* This one lands. She stops on a question and looks up: the cue is
       that there is nothing left for her to add. */
    line:
      'It is not the hours, really. I have done busy before. '
      + 'It is that I do not know when it stops. Nobody has told me whether Dom is back in April or at all, '
      + 'and I keep building plans around a date I made up myself. So that is it, that is the whole of it. '
      + 'Where are we with him?',
    cueSpeaking: 'She is working her way to a question.',
    cueWindow: 'She asked you something and stopped. She is waiting.',
    speakSubWindow: 'Now. She asked you a question and she is waiting on the answer.',
    outcomes: {
      early: {
        posture: 'closed',
        open: -16,
        reply: 'Right. Well. You would know more about that than me.',
        recap: 'you answered the first half of what she said, so she handed the question back to you and stopped volunteering.',
        unsaid: 'that she is planning her year around a date she invented',
      },
      heard: {
        posture: 'open',
        open: 16,
        reply: 'What I need is a date. Even a bad one. I can work with a bad date — I cannot work with nothing.',
        recap: 'she finished, you waited half a second, and she told you exactly what would fix it.',
        gained: 'that a bad date would do, and silence would not',
      },
      late: {
        posture: 'guarded',
        open: -11,
        reply: 'Anyway, you have got your review. I will sort something out.',
        recap: 'the silence stretched past the point of being generous, and she filled it by letting you off.',
        unsaid: 'that what she wanted was a date, even a bad one',
      },
      quiet: {
        posture: 'flat',
        open: -12,
        reply: 'Sorry, I thought you were going to say something there. No. No, that was it. That was the whole thing.',
        recap: 'this was the turn where she had actually finished and was waiting on you. Staying quiet left it hanging, and she read the silence as nothing to say.',
        unsaid: 'that what she wanted was a date, even a bad one',
      },
    },
  },

  {
    n: 3,
    speakMs: 7200,
    pauseMs: 2200,
    lateMs: 2500,
    /* Finished, and deliberately left in your hands — she has put it
       down on the table and is not going to pick it back up herself. */
    line:
      'Can I say the awkward part? I asked you about this in February and you said you would come back to me. '
      + 'I do not think you remember saying it. That is the bit I have been chewing on. Not the inbox. '
      + 'Anyway. It is said now.',
    cueSpeaking: 'She is getting to the thing she came in to say.',
    cueWindow: 'That is said, and she has put it down in front of you.',
    speakSubWindow: 'Now. She has said the hard part and she is waiting to see what you do with it.',
    outcomes: {
      early: {
        posture: 'closed',
        open: -18,
        reply: 'No — forget it. That came out wrong. It does not matter.',
        recap: 'she was three words from the hardest thing she came in to say and you took the floor off her. She will not offer it twice.',
        unsaid: 'that she is still carrying February, not the inbox',
      },
      heard: {
        posture: 'open',
        open: 18,
        reply: 'Thank you. That is all I wanted, really. For it to be a thing that got said out loud instead of a thing I was imagining.',
        recap: 'you took the hardest sentence in the conversation without flinching and without rushing it, and she let go of it.',
        gained: 'that February is the thing she has actually been carrying',
      },
      late: {
        posture: 'guarded',
        open: -10,
        reply: 'You do not have to answer that. I should not have brought it up.',
        recap: 'she said something difficult and then had to sit in your silence with it, so she apologised for saying it.',
        unsaid: 'that she needed February acknowledged rather than fixed',
      },
      quiet: {
        posture: 'in',
        open: 9,
        reply: 'And I would honestly rather hear you say you forgot than hear that it was fine.',
        recap: 'you left it alone and let her finish her own thought, which is the one thing that could not be rushed.',
        gained: 'that she would rather hear “I forgot” than “it was fine”',
      },
    },
  },
];

/* ------------------------------------------------------------------
   The ending. It describes the conversation. It does not score it.
   ------------------------------------------------------------------ */
export const endings = [
  {
    min: 78,
    title: 'She said the thing she came in to say',
    summary:
      'Rae walked in with one sentence she was not sure she was going to use, and she used it. '
      + 'Nothing you said made that happen — it was where you put the silence.',
  },
  {
    min: 56,
    title: 'Most of it got out',
    summary:
      'She told you more than the workload, and stopped short of the rest. Somewhere in the middle she '
      + 'decided to be careful with you, and you can probably feel which turn that was.',
  },
  {
    min: 32,
    title: 'You got the inbox, not the reason',
    summary:
      'What you have is a workload problem. What she brought in was something else, and it went back out '
      + 'of the room with her.',
  },
  {
    min: 0,
    title: 'She managed you',
    summary:
      'By the end she was handling the conversation rather than having it: short answers, nothing offered, '
      + 'and “I am managing it” twice. That is what being cut off twice does.',
  },
];

export const ending = {
  recapTitle: 'The three moments',

  heardSome: 'What you actually heard: {list}.',
  heardNone: 'Nothing came out that she had not already decided to say in the corridor on the way in.',

  unsaidSome: 'What she never got to say: {list}.',
  unsaidNone: 'Nothing she came in carrying went back out of the room with her.',

  turningGood:
    'The turn that made the difference was <b>turn {n}</b>. That is where she stopped answering you and '
    + 'started telling you something.',
  turningCost:
    'The turn that decided it was <b>turn {n}</b>. After that one she was managing you rather than talking to you.',

  attemptFirst: 'That was your first run at it. Nothing about it is on the record anywhere.',
  attemptBetter: 'On attempt {prev} she went back out of the room with more than she did this time. This run was the better listen.',
  attemptSame: 'That landed about where attempt {prev} did. The timing on one of the three is still deciding it.',
  attemptWorse: 'Attempt {prev} got further than this one. Worth another go while the moment is still warm.',

  point:
    '<b>A real one-to-one gives you one go at this.</b> A practice partner is the thing you can get wrong '
    + 'twice — cut her off on purpose, sit in the silence until it hurts, find out where the edge of the '
    + 'pause actually is — and then walk into the real Thursday already knowing.',
};
