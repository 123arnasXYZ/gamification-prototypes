/* ============================================================
   Content for "Start with the challenge".

   One task, no instructions: Sam has missed a deadline again — deal
   with it. Three places to do that. Two of them backfire in ways
   you can see; each wrong try reveals the next hint. Someone who
   already knows what to do never sees one.
   ============================================================ */

export const meta = {
  eyebrow: 'Team lead — Monday morning',
  title: 'Sam has missed a deadline for the third time. Deal with it.',
  instructions: 'Click where you want to deal with it.',
};

/* The three places, left to right. `correct` marks the one that works. */
export const options = [
  {
    id: 'meeting',
    label: 'Team meeting',
    consequence: 'You raise it in front of everyone. The room goes quiet, and Sam doesn’t say another word all meeting.',
  },
  {
    id: 'email',
    label: 'Send an email',
    consequence: 'Sam replies “Noted.” at 11pm. You still have no idea why it keeps happening.',
  },
  {
    id: 'oneToOne',
    label: 'One-to-one',
    correct: true,
  },
];

/* Revealed one per wrong try, vaguest first. */
export const hints = [
  { title: 'Make it a conversation', text: 'Called out in public, people get defensive. By email, they go quiet. Either way, you don’t find out why.' },
  { title: 'Go somewhere private', text: 'Take Sam into a one-to-one and ask what’s getting in the way before deciding what to do.' },
];

export const results = {
  firstTime: {
    title: 'You already knew this',
    summary: 'You went straight to a private conversation — no hints needed. No need to sit through the training.',
  },
  withHints: {
    title: 'Good conversation',
    summary: 'Sam tells you they’ve been covering two roles since March. Now you can actually fix it.',
  },
};

export const lesson = '<b>Raise problems in private, and ask before you judge.</b> Now you’ve done it rather than read it.';
