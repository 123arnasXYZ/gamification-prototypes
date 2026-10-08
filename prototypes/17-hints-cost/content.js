/* ============================================================
   Content for "Make hints cost something".

   The morning's incoming work has to be triaged by hand. Eight
   items arrive one at a time and go into one of three trays. No
   multiple choice anywhere — the answer is where you put the thing.

   The help is a limited resource: three "ask a senior" tokens for
   the whole run, spent on one specific item, gone for good. Asking
   reveals the senior's *reasoning*, not a tray number, so the
   learner still has to place it.

   Tuning lives in `scoring` below. The intent:
     - 8 right, nothing asked      → 80/80   (top)
     - 8 right, all three asked    → 68/80   (respectable)
     - right on the second pass is worth less than right with help,
       because the first guess was already wrong.
   ============================================================ */

export const meta = {
  eyebrow: 'Monday, 08:40 — the morning’s post',
  title: 'Triage the morning’s incoming work, one item at a time.',
  instructions: 'Read the item, then click the tray you want it in.',
  lanePrompt: 'Click a tray to file it.',
  askedPrompt: 'You have the reasoning. Now pick a tray.',
  secondPrompt: 'This one is back round. Pick a tray.',
  itemCounter: 'Item {n} of {total}',
  backRound: 'Back round — second and last look',
  seniorEyebrow: 'What the senior actually looks at',
  nudgeEyebrow: 'Before you pick again',
  askButton: 'Ask a senior · {n} left',
  askSpent: 'No asks left',
  askUsedHere: 'Asked on this one',
  tokensLabel: 'Asks left',
  filedLabel: 'Filed',
  close: 'Close',
  again: 'Try again',
};

/* The three trays, left to right across the desk. */
export const lanes = [
  { id: 'now', label: 'Deal with it now', colour: 0x2757e2 },
  { id: 'log', label: 'Log it and move on', colour: 0x7a8494 },
  { id: 'up', label: 'Pass it up', colour: 0xe0b02a },
];

/* `lane` is the index into `lanes`. `ambiguous` marks the ones that
   genuinely could go two ways — they are the items an ask is worth
   spending on, and the ending checks whether it was spent there.
   `kind` picks the 3D object. `nudge` is the one line shown if the
   item comes back round. */
export const items = [
  {
    id: 'refund',
    kind: 'email',
    label: 'Printed email',
    name: 'Email — “where is my refund?”',
    line: 'A customer asks where a refund has got to. It was approved nine days ago and never left.',
    lane: 0,
    ambiguous: false,
    reasoning: 'The decision was already made nine days ago, so there is nothing to decide and nobody to ask. What is left is a job that someone forgot to finish, and it gets slower and more expensive every day it sits in a tray.',
    nudge: 'Nothing here needs deciding — it needs doing.',
  },
  {
    id: 'voicemail',
    kind: 'voicemail',
    label: 'Voicemail slip',
    name: 'Voicemail — regulator mentioned',
    line: 'A caller says that if nobody rings back today they are going to the regulator.',
    lane: 2,
    ambiguous: true,
    reasoning: 'The instinct is to ring back fast, and that instinct is right about the urgency and wrong about the owner. The moment an outside body is named, the call stops being a customer problem and becomes something the business has to answer for. Ringing back yourself means whatever you say first is the official position.',
    nudge: 'Ask who has to stand behind the answer, not how soon it is needed.',
  },
  {
    id: 'address',
    kind: 'form',
    label: 'Change of address',
    name: 'Form — change of address',
    line: 'Filled in, signed, dated, nothing unusual about any of it.',
    lane: 1,
    ambiguous: false,
    reasoning: 'Routine, complete, and no decision in it. Logging it is the whole job; stopping to deal with it now would just push something that actually needs you further down the pile.',
    nudge: 'Complete and routine. What does that leave you to do?',
  },
  {
    id: 'parcel',
    kind: 'parcel',
    label: 'Parcel',
    name: 'Parcel — addressed to a leaver',
    line: 'A small parcel for someone who left the team last year.',
    lane: 1,
    ambiguous: false,
    reasoning: 'Mildly annoying, completely harmless. Nobody is waiting on it and nothing goes wrong if it waits another day, so it gets written down and put with the returns rather than eating a morning.',
    nudge: 'Who is actually waiting on this?',
  },
  {
    id: 'complaint',
    kind: 'complaint',
    label: 'Complaint card',
    name: 'Complaint card — third time',
    line: '“This is the third time I have been given different information.”',
    lane: 0,
    ambiguous: true,
    reasoning: 'Read it as one complaint and it looks like paperwork to log. The word doing the work is “third”. Two people have already handled this and both handled it badly, so logging it a third time is just the same failure with better records. Someone has to stop the loop, and the person holding the card is the only one in a position to.',
    nudge: 'One word in that sentence changes what this is. Find it.',
  },
  {
    id: 'invoice',
    kind: 'invoice',
    label: 'Invoice',
    name: 'Invoice — £4,200, unknown supplier',
    line: 'An invoice for £4,200 from a supplier nobody here recognises.',
    lane: 2,
    ambiguous: false,
    reasoning: 'Money going out to a name nobody knows is either a filing error or a fraud attempt, and you cannot tell which from the paper. Both versions need authority you do not have.',
    nudge: 'You cannot tell which of two things this is. That is the signal.',
  },
  {
    id: 'note',
    kind: 'note',
    label: 'Handwritten note',
    name: 'Note — “when you get a chance”',
    line: 'A colleague has left a note asking you to look at the Dawson file when you get a chance.',
    lane: 1,
    ambiguous: false,
    reasoning: 'They told you the priority in the note itself. Taking it as urgent is doing them a favour they did not ask for, at the cost of whatever was actually urgent.',
    nudge: 'They already told you how urgent it is.',
  },
  {
    id: 'envelope',
    kind: 'envelope',
    label: 'Unmarked envelope',
    name: 'Envelope — medical notes inside',
    line: 'An unmarked envelope with two pages of somebody’s medical notes in it. No covering letter.',
    lane: 2,
    ambiguous: true,
    reasoning: 'This is the one that most often gets dealt with on the spot, out of good intentions — find the owner, get it back to them, done. But nobody knows how it got here, and that is the actual problem. Handling it quietly means the only record of it is in your head.',
    nudge: 'The pages are not the problem. The fact that they are here is.',
  },
];

/* Points. Right-first-time unaided is the only way to score full
   marks; asking costs 4 of the 10, and a right answer on the way
   back round costs 6. Everything wrong scores nothing. */
export const scoring = {
  tokens: 3,
  unaided: 10,
  afterAsk: 6,
  secondPass: 4,
  wrong: 0,
  pass: 0.6,
};

/* {points} and {n} are filled in by the scene. */
export const feedback = {
  rightUnaided: 'Right tray, on your own. +{points}',
  rightAsked: 'Right tray, with the reasoning in front of you. +{points}',
  rightSecond: 'Right this time. +{points}',
  wrongFirst: 'Not that tray. This one comes back round later.',
  wrongAsked: 'Not that tray — and the ask went with it.',
  wrongSecond: 'Still not that tray. It closes there.',
  asked: 'Ask spent on this item. {n} left for the rest of the morning.',
  askedLast: 'Ask spent on this item. That was your last one.',
  noTokens: 'No asks left. This one is yours to call.',
};

/* How the three tokens were used. Picked in main.js from which
   items the asks landed on. */
export const tokenUse = {
  none: 'You spent nothing. Three asks sat there all morning and you decided, eight times, that you did not need one — including on the ones that could have gone either way.',
  ambiguous: 'You spent your asks on the genuinely ambiguous items and left the routine ones alone. That is the expensive judgement: knowing which of your own hesitations is worth a token.',
  early: 'Your asks went on the first items that looked hard rather than the ones that were hard. By the time the genuinely two-sided ones turned up, there was nothing left to spend.',
  mixed: 'A mix — some asks on items that really were two-sided, some on ones you could have called yourself. The tokens ran out before the run did.',
  allLeftUnsure: 'You saved your asks and got some of it wrong anyway. Holding a token back is only free if you were right.',
};

export const comeback = {
  none: 'Nothing came back round. Every item went in the right tray at the first attempt.',
  some: 'Came back round: {list}.',
  closed: 'Closed on a wrong tray: {list}.',
};

/* Chosen by score fraction, highest `min` that fits wins. */
export const results = [
  {
    min: 0.98,
    title: 'Eight out of eight, unaided',
    summary: 'You triaged the whole morning without spending a single ask. Nothing came back round and nothing went up that did not need to.',
  },
  {
    min: 0.82,
    title: 'Clean morning',
    summary: 'Everything ended up where it belonged. You paid for a little of it, which is what the tokens are for.',
  },
  {
    min: 0.62,
    title: 'All filed, some of it the long way',
    summary: 'The trays are right. Getting there cost you asks, second looks, or both.',
  },
  {
    min: 0.4,
    title: 'Half the morning went the wrong way first',
    summary: 'Enough of this came back round that the pile outlasted the asks. Worth looking at which ones you were sure about and wrong.',
  },
  {
    min: 0,
    title: 'This pile needed a second pair of eyes',
    summary: 'Most of these went in the wrong tray, and the three asks did not land where they would have paid off.',
  },
];

export const lesson =
  '<b>Three for the whole morning changes what asking is.</b> Unlimited hints get clicked out of habit, '
  + 'before the thinking starts. A help budget that runs out makes every ask a judgement about your own '
  + 'uncertainty — and noticing that you are unsure, on this item and not that one, is most of the skill.';

export const scoreLine = 'You scored <b>{score}</b> of {max}, with <b>{used}</b> of {tokens} asks spent.';
