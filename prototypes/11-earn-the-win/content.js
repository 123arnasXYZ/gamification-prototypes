/* ============================================================
   Content for "Make learners earn the win".

   Two security decisions. A wrong answer plays out its consequence,
   says something useful, and then hands back the same decision —
   never the answer. Support arrives instead: a hint after the second
   try, a firmer one after the third. Nothing is greyed out, because
   the point is to choose correctly, not to be left one button.
   ============================================================ */

export const meta = {
  eyebrow: 'Thursday, 09:14 — your desk',
  title: 'Two things land on you this morning. Deal with each one.',
  instructions: 'Read the screen and choose.',
  again: 'Same decision. Have another go.',
  lockedHint: 'Step 2 unlocks once step 1 is right.',
};

export const steps = [
  {
    id: 'email',
    short: 'The email',
    prompt: 'An email has arrived asking for the full customer list by lunchtime.',
    screen: {
      kind: 'email',
      from: 'Procurement Partners <billing@procure-partners.co>',
      subject: 'URGENT: customer list needed before 12:00',
      lines: [
        'Hi,',
        'Finance need the full customer',
        'list today. Reply with the file',
        'or use the secure link below.',
        'Thanks — Dan, Procurement',
      ],
    },
    options: [
      {
        id: 'reply',
        label: 'Reply with the list',
        consequence: 'The spreadsheet goes out. Nine thousand customer records are now with someone you have never met.',
        feedback: 'Nothing in that email proved who sent it. Urgency is not identity.',
      },
      {
        id: 'link',
        label: 'Click the link to check',
        consequence: 'The link opens a login page wearing your company logo. You have just handed over your password.',
        feedback: 'Opening it to “have a look” is the attack. The page only has to look right for a second.',
      },
      {
        id: 'report',
        label: 'Report it to IT',
        correct: true,
        consequence: 'IT confirm the domain was registered yesterday and block it. Four colleagues got the same email.',
      },
    ],
    support: [
      { title: 'Look at who sent it', text: 'The pressure is doing a lot of work here. What in the message actually proves the sender is who they say?' },
      { title: 'You are not meant to decide alone', text: 'You do not have to prove it is fake. Someone else checks suspicious messages for a living — pass it to them.' },
    ],
  },
  {
    id: 'usb',
    short: 'The USB stick',
    prompt: 'On the way in you picked up a USB stick from the car park. It has your company logo on it.',
    screen: {
      kind: 'usb',
      from: 'Found in the car park',
      subject: 'Unknown USB device',
      lines: [
        'No label beyond the logo.',
        'Contents unknown.',
        'Nobody has reported it missing.',
      ],
    },
    options: [
      {
        id: 'plug',
        label: 'Plug it in to find the owner',
        consequence: 'It mounts, and something installs itself quietly in the background. Your laptop is now the way in.',
        feedback: 'A stick in a car park is a cheap way past every firewall you have. Opening it is the risk, not reading it.',
      },
      {
        id: 'kitchen',
        label: 'Leave it in the kitchen',
        consequence: 'It sits by the kettle until someone else plugs it in to be helpful. Same outcome, different laptop.',
        feedback: 'Passing the decision to a passer-by is not handling it. It is still live, just further away from you.',
      },
      {
        id: 'it',
        label: 'Hand it to IT',
        correct: true,
        consequence: 'IT open it on an isolated machine. It carried a loader, and nobody in the building plugged it in.',
      },
    ],
    support: [
      { title: 'Think about what plugging in does', text: 'Looking at a file is one thing. Connecting unknown hardware runs code before you have looked at anything.' },
      { title: 'It needs to go somewhere safe', text: 'Somebody can inspect it without risking a live machine — your job is to get it to them, not to identify it.' },
    ],
  },
];

/* Drawn on the laptop screen once both decisions have been handled. */
export const doneScreen = {
  kind: 'done',
  from: 'Inbox',
  subject: 'Both reported',
  lines: ['Nothing left open.', 'IT have the lot.'],
};

export const result = {
  title: 'You earned both of those',
  summary: 'Neither step let you move on until you chose well — and neither one told you the answer.',
  /* {name} is the step, {n} the attempt text. */
  perStep: '<b>{name}</b> — right after {n}.',
  one: '1 attempt',
  many: '{n} attempts',
  cycle: '<b>Try → Feedback → Adjust → Retry → Succeed.</b> You went round that loop until the right choice was yours, not the quiz’s.',
  lesson: 'A wrong answer that moves you on teaches nothing. A wrong answer that gives you the same decision and a little more help teaches the behaviour.',
};
