/* ============================================================
   Content for "Let learners build their answer".

   The reply is built from two separate choices, and each is scored
   on its own (2 = strong, 1 = partly, 0 = misses). 4 tones x 4
   actions = 16 replies, each with honest feedback about which part
   of the thinking worked.
   ============================================================ */

export const meta = {
  eyebrow: 'Customer service — returns desk',
  title: 'Build your reply.',
  customer: 'My kettle arrived this morning with a cracked lid. It’s a birthday present for my mum, and her birthday is on Saturday.',
};

export const parts = [
  {
    id: 'tone',
    label: 'Tone',
    options: [
      { id: 'apologetic', label: 'Apologetic', score: 2,
        line: 'I’m so sorry — that isn’t what should have arrived.',
        feedback: 'Owning the problem first tells the customer you’re on their side.' },
      { id: 'neutral', label: 'Neutral', score: 1,
        line: 'Thanks for letting us know about the lid.',
        feedback: 'Polite, but it doesn’t acknowledge that a birthday present is now at risk.' },
      { id: 'casual', label: 'Casual', score: 0,
        line: 'Ah, no worries — these things happen!',
        feedback: '“No worries” brushes off something the customer is clearly worried about.' },
      { id: 'defensive', label: 'Defensive', score: 0,
        line: 'Our packaging is tested, so that’s very unusual.',
        feedback: 'Defending the packaging makes it sound like you doubt them.' },
    ],
  },
  {
    id: 'action',
    label: 'Action',
    options: [
      { id: 'replace', label: 'Replace', score: 2,
        line: 'I’ll send a new one today by next-day delivery, so you’ll have it well before Saturday.',
        feedback: 'They need a working kettle by Saturday — this is the only option that gets them one.' },
      { id: 'refund', label: 'Refund', score: 1,
        line: 'I’ll refund you in full right now.',
        feedback: 'It fixes the fault, but they’d still have no present for Saturday.' },
      { id: 'investigate', label: 'Investigate', score: 0,
        line: 'I’ll raise it with our warehouse and get back to you within five working days.',
        feedback: 'Five working days means no kettle for the birthday. Look into it after they’re sorted.' },
      { id: 'escalate', label: 'Escalate', score: 0,
        line: 'I’ll pass this to my manager to decide what we can offer.',
        feedback: 'This is well within what you can fix yourself. Passing it up only adds a wait.' },
    ],
  },
];

/** Headline for a combination — says which half of the thinking worked. */
export function verdict(tone, action) {
  if (tone === 2 && action === 2) return 'Spot on';
  if (action === 2) return tone === 1 ? 'Right fix, a little flat' : 'Right action, handled the wrong way';
  if (tone === 2) return action === 1 ? 'Right tone, nearly the right fix' : 'Right tone, wrong fix';
  if (tone === 1 && action === 1) return 'Close on both, strong on neither';
  if (tone === 1 || action === 1) return 'One part nearly there, one part misses';
  return 'Neither part landed';
}

/** What the customer says back. */
export function reply(tone, action) {
  if (tone === 2 && action === 2) return 'Oh, thank you — that’s such a relief.';
  if (action === 2) return '…Fine. As long as it actually turns up before Saturday.';
  if (tone === 2) return 'I appreciate that, but it doesn’t really help me for Saturday.';
  if (tone + action === 2) return 'Okay. I suppose that’s something.';
  return 'So what am I supposed to give her on Saturday?';
}
