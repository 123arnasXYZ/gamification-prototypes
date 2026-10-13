/* ============================================================
   Content for "Give learners a role".

   A major incident, nine minutes old. Six things are happening at
   once and you have ten minutes of your own hands. You pick who
   you are first, and the role does not change which answer is
   right — it changes which of the six are YOURS.

   Everyone sees the same six. Two of them belong to you, four
   belong to the other two people on the call, and the only way
   through is to hold your own and hand the rest to the person who
   can actually do them. Take somebody else's work and you spend
   minutes you do not have, they sit idle, and something of yours
   never gets held at all.

   Run it again as a different role and the same six cards sort a
   different way. That is the whole argument of this prototype.

   EVERY learner-facing string and every tunable number is here.
   ============================================================ */

export const meta = {
  eyebrow: 'Major incident — 14:05, nine minutes down',
  title: 'Six things are happening. Two of them are yours.',
  pickTitle: 'Who are you on this call?',
  pickSub: 'Three people are on the bridge. Pick the job you are holding.',
  boardLabel: 'On the bridge',
  youLabel: 'You are',
  ownsLabel: 'Only you can',
  needsLabel: 'Needs',
  clockLabel: 'Your hands',
  minutes: (n) => `${n} min`,
  takenBy: (name) => `Passed to ${name}`,
  mineTag: 'You have it',
  openTag: 'Nobody has it',
};

/* The incident. Identical whoever you are. */
export const incident = {
  what: 'Checkout has been failing for nine minutes. Payments go through, the confirmation never lands.',
  facts: [
    'Three engineering teams are already in the channel.',
    'Nobody outside the company has been told anything.',
    'The board call is at 14:30.',
  ],
};

/* ------------------------------------------------------------------
   The three jobs. `minutes` is how much of the hour you personally
   have — the whole squeeze lives in this number.
   ------------------------------------------------------------------ */
export const roles = [
  {
    id: 'incident',
    name: 'Incident lead',
    short: 'Incident',
    tint: '#2757e2',
    soft: '#E7EDFE',
    owns: 'The decisions. Nobody else can make them.',
    /* Said plainly, because the whole puzzle is matching these to the
       "Needs" line on each card. One power per card you own. */
    can: [
      'Decide for all three teams',
      'Set a time everyone keeps',
    ],
    brief: 'Three teams are waiting for you to say what we are doing.',
    minutes: 10,
  },
  {
    id: 'comms',
    name: 'Comms lead',
    short: 'Comms',
    tint: '#12A177',
    soft: '#E6F8F1',
    owns: 'Anything that goes outside this call.',
    can: [
      'Publish on our website',
      'Answer people outside the team',
    ],
    brief: 'Nobody outside this call has been told anything yet.',
    minutes: 10,
  },
  {
    id: 'support',
    name: 'Support lead',
    short: 'Support',
    tint: '#B8701A',
    soft: '#FDF2E2',
    owns: 'The people already trying to reach us.',
    can: [
      'Reach all 40 agents',
      'Open a customer’s account',
    ],
    brief: 'Forty agents are on the phones with nothing to tell anyone.',
    minutes: 10,
  },
];

/* ------------------------------------------------------------------
   The six things. Each belongs to exactly one role.

   mine        — you own it and you held it
   others      — somebody else held it instead of its owner
   passed      — handed to the person whose job it is
   misPassed   — handed to the wrong person ({who} is who you sent it to)
   unheld      — your hands ran out before you got to it
   ------------------------------------------------------------------ */
export const events = [
  {
    id: 'call',
    owner: 'incident',
    minutes: 4,
    title: 'Undo it, or keep fixing?',
    detail: 'The engineers can do either. They will not pick one themselves.',
    needs: 'Someone who can decide for all three teams',
    mine: 'You call it: undo it. The teams stop arguing and start undoing, and the outage finally begins getting shorter.',
    others: 'You picked one. It was not a bad pick — but the teams carried on arguing, because it did not come from the person who decides.',
    passed: 'The incident lead picks one inside a minute. That is the thing only they can do.',
    misPassed: 'The {who} cannot make that call, so it comes back round. Four minutes gone.',
    unheld: 'Nobody ever picked. Two teams undid it, one kept fixing, and they undid each other.',
  },
  {
    id: 'status',
    owner: 'comms',
    minutes: 3,
    title: 'Our website still says everything is working',
    detail: 'Nine minutes into an outage every customer can see.',
    needs: 'Someone who can publish on our website',
    mine: 'You put up a short note with the time on it. It says almost nothing, and it immediately stops being the biggest problem.',
    others: 'You published it yourself. It is live, it is slightly wrong about the symptom, and comms now have to correct it.',
    passed: 'Comms have a note up within two minutes, in the words we always use.',
    misPassed: 'The {who} cannot publish on the website. It sits there.',
    unheld: 'The website said everything was fine for the whole outage. That is the screenshot that gets shared.',
  },
  {
    id: 'queue',
    owner: 'support',
    minutes: 5,
    title: '40 agents have nothing to tell anyone',
    detail: 'They are making up their own explanations, and every one is different.',
    needs: 'Someone who can reach all 40 agents',
    mine: 'You write one line, push it to every agent, and the phones stop being forty different stories. Calls get half as long.',
    others: 'You wrote them a line. It is fine — but you cannot push it to their screens, so half the floor never sees it.',
    passed: 'Support have one agreed line on every screen in four minutes.',
    misPassed: 'The {who} has no way to reach the agents.',
    unheld: 'Agents kept making it up for the whole outage. Two of those versions are now in writing.',
  },
  {
    id: 'cfo',
    owner: 'comms',
    minutes: 4,
    title: 'The finance director wants to know when it will be fixed',
    detail: 'Asked twice. There is a board meeting at half past.',
    needs: 'Someone who answers people outside the team',
    mine: 'You give the honest shape of it — no time yet, next update at 14:25 — and the asking stops.',
    others: 'You answered with a time you had no way to stand behind. The board now has that time in writing.',
    passed: 'Comms handle it the way they handle every exec question, and nobody invents a time.',
    misPassed: 'The {who} forwards it to the engineers, where it reads as pressure and stops three people working.',
    unheld: 'Nobody answered, so the board meeting started with a guess from someone who was not even on this call.',
  },
  {
    id: 'checkpoint',
    owner: 'incident',
    minutes: 3,
    title: 'Nobody has said when we all speak again',
    detail: 'Three teams, no agreed time, so everyone is waiting for someone else.',
    needs: 'Someone who can set a time everyone keeps',
    mine: 'You set it: 14:25, same call. It stops being constant panic and becomes twenty minutes of work.',
    others: 'You announced a time. Two teams ignored it, because it did not come from the person running this.',
    passed: 'The incident lead sets it, and it holds, because it came from the person running this.',
    misPassed: 'The {who} suggests a time, and three teams treat it as a suggestion.',
    unheld: 'There was never a time. People drifted off the call one at a time.',
  },
  {
    id: 'account',
    owner: 'support',
    minutes: 4,
    title: 'Your biggest customer has been on hold six minutes',
    detail: 'They send us more orders than the next four customers put together.',
    needs: 'Someone who can open the customer’s account',
    mine: 'You take it with their account open in front of you, tell them exactly what is known, and they stand their own team down.',
    others: 'You took the call. You could not see their account, their orders or their contract, and they noticed.',
    passed: 'Support take it, with the account open in front of them.',
    misPassed: 'The {who} cannot open their account and ends up reading them the website.',
    unheld: 'They held for nineteen minutes and hung up. That call goes in their quarterly review.',
  },
];

/* ------------------------------------------------------------------
   The numbers worth moving.
   ------------------------------------------------------------------ */
export const rules = {
  /* Taking a job that is not yours costs you the same minutes it
     would cost its owner — which is the point. */
  passMinutes: 0,
};

export const ui = {
  pickCta: 'Take this job',
  takeCta: 'I have got this',
  passCta: 'Pass to {name}',
  openPrompt: 'Click one of the six. Then decide whether it is yours.',
  pickedPrompt: '{title} — {min} if you take it.',
  /* Both halves of the match in one line, so nobody has to hold the
     role card in their head while they read a job card. */
  matchLine: 'This needs: {needs}.  You can: {can}.',
  readyPrompt: 'All six are decided. Run the next twenty minutes.',
  leftPrompt: '{n} still undecided.',
  overPrompt: 'That is more than you have hands for — something will go unheld.',
  runCta: 'Run the next twenty minutes',
  againCta: 'Run it again as someone else',
  closeCta: 'Close',
  clockOver: 'over',
  undo: 'Put it back',
};

export const result = {
  titlePerfect: 'You held your two, and the other four got held by the people who could',
  titleGood: 'The incident got through it',
  titleRough: 'Everybody was busy. Not everybody was doing their own job.',
  summary: 'Six things, the same six for all three of you. The only thing your role changed was which two were yours.',
  mineLabel: 'What you held',
  elseLabel: 'What you passed',
  minutesLine: '<b>You took on {used} minutes of work, and you had {total}.</b> {verdict}',
  minutesOk: 'Your own two fitted, with room to think.',
  minutesTight: 'That was everything you had.',
  minutesOver: 'You ran out, and what was left of your own work never got held.',
  lesson: '<b>A role is not a label on the title slide.</b> It decides what you can see, what you are allowed to decide, and what nobody else can do for you. Give someone that and they stop asking what the module wants and start asking what their job needs.',
  tryOther: 'Run it again as the {name} — the same six cards, sorted a completely different way.',
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

  card: '#FFFFFF',
  cardEdge: '#E4E7EF',
  cardPicked: '#2757e2',
  mineTint: '#E7EDFE',
  passedTint: '#F4F6FA',

  mintTint: '#EAFBF4',
  mintInk: '#12A177',
  redTint: '#FDECF0',
  redInk: '#B51C40',
  amberInk: '#9A6B08',
  meter: '#E4E7EF',
  shade: 'rgba(16,19,26,0.08)',
};

export const view = {
  board: { w: 1004, h: 540 },
  maxScale: 1.28,
  minRegion: { w: 300, h: 150 },
  fontFamily: 'Urbanist, "Segoe UI", system-ui, -apple-system, sans-serif',

  side: { x: 2, y: 2, w: 258 },
  grid: { x: 272, y: 2, w: 730, cols: 2, cardW: 352, cardH: 160, gapX: 14, gapY: 10, top: 36 },
  pick: { cardW: 300, cardH: 310, gap: 22, y: 96 },
};

export const timing = {
  flip: 220,
  runStep: 520,
};
