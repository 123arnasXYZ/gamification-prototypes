/* ============================================================
   Content for "Make learners earn the win".

   Two security decisions. A wrong answer plays out its consequence,
   says something useful, and then hands back the same decision —
   never the answer. Support arrives instead: a hint after the second
   try, a firmer one after the third. Nothing is greyed out, because
   the point is to choose correctly, not to be left one button.

   Everything the learner reads lives in this file, including the
   words drawn on the canvas — the email client's own chrome, the
   fake login page, the label on the consequence banner. main.js
   holds no wording and no tuning: the palette, the board's design
   space and the timings are all down the bottom of this file.
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
      /* Drawn as a link in the body, between the message and the
         sign-off. The host is not the one in the address either. */
      link: 'https://secure-portal.procure-partners-billing.co/customer-list',
    },
    options: [
      {
        id: 'reply',
        label: 'Reply with the list',
        consequence: 'The spreadsheet goes out. Nine thousand customer records are now with someone you have never met.',
        feedback: 'Nothing in that email proved who sent it. Urgency is not identity.',
        fx: 'sent',
        banner: 'Sent. The customer list is outside the company.',
      },
      {
        id: 'link',
        label: 'Click the link to check',
        consequence: 'The link opens a login page wearing your company logo. You have just handed over your password.',
        feedback: 'Opening it to “have a look” is the attack. The page only has to look right for a second.',
        fx: 'login',
        banner: 'Password typed into a page that was never ours.',
      },
      {
        id: 'report',
        label: 'Report it to IT',
        correct: true,
        consequence: 'IT confirm the domain was registered yesterday and block it. Four colleagues got the same email.',
        fx: 'reported',
        banner: 'Reported. IT have blocked the domain.',
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
        fx: 'plugged',
        banner: 'Mounted. Something is installing itself.',
      },
      {
        id: 'kitchen',
        label: 'Leave it in the kitchen',
        consequence: 'It sits by the kettle until someone else plugs it in to be helpful. Same outcome, different laptop.',
        feedback: 'Passing the decision to a passer-by is not handling it. It is still live, just further away from you.',
        fx: 'kitchen',
        banner: 'Left by the kettle. Still live, still waiting.',
      },
      {
        id: 'it',
        label: 'Hand it to IT',
        correct: true,
        consequence: 'IT open it on an isolated machine. It carried a loader, and nobody in the building plugged it in.',
        fx: 'handed',
        banner: 'Handed over. Opened on an isolated machine.',
      },
    ],
    support: [
      { title: 'Think about what plugging in does', text: 'Looking at a file is one thing. Connecting unknown hardware runs code before you have looked at anything.' },
      { title: 'It needs to go somewhere safe', text: 'Somebody can inspect it without risking a live machine — your job is to get it to them, not to identify it.' },
    ],
  },
];

/* Drawn on screen once both decisions have been handled. */
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
  close: 'Close',
  again: 'Try again',
};

/* ============================================================
   Words drawn on the canvas

   The email client's own furniture, the fake login page the link
   opens, and the labels on the desk. Nothing here is a question
   and nothing here is an answer — it is the thing being judged.
   ============================================================ */
export const labels = {
  /* The mail client */
  mailbox: 'Inbox — 1 new',
  externalFlag: 'EXTERNAL',
  externalNote: 'This message came from outside the company.',
  fromLabel: 'From',
  subjectLabel: 'Subject',
  attachmentName: 'customer-list-full.xlsx',
  attachmentNote: 'Attached to your reply',
  reportedStamp: 'Reported to IT',

  /* The page the link opens: your logo, somebody else's address bar */
  loginUrl: 'procure-partners-billing.co/sign-in',
  loginBrand: 'Sign in to continue',
  loginUser: 'you@yourcompany.com',
  loginPassLabel: 'Password',
  loginButton: 'Sign in',

  /* The desk */
  deskLabel: 'Your desk — 09:14',
  portLabel: 'USB',
  kettleLabel: 'Kitchen',
  bagLabel: 'For IT — do not open',

  /* The tick on a step the learner has already earned */
  doneMark: '✓',
};

/* ============================================================
   Palette

   Flat and clean: solid shapes, no gradients, no fake lighting.
   The -ink entries are the darker versions that survive as text.
   ============================================================ */
export const palette = {
  blue: '#2757e2',
  mint: '#5fe0b0',
  amber: '#e0a32a',
  red: '#e0234e',
  ink: '#10131A',
  dim: '#4B5162',
  line: '#E4E7EF',
  paper: '#FFFFFF',

  body: '#262B36',
  soft: '#F4F6FA',
  wall: '#EEF1F7',
  desk: '#DCE3EE',
  deskEdge: '#C6CEDC',
  metal: '#BFC6D4',
  shell: '#3A4049',
  screenOff: '#2F343B',
  redTint: '#FDECF0',
  redInk: '#B51C40',
  mintTint: '#EAFBF4',
  mintInk: '#12A177',
  shade: 'rgba(16,19,26,0.09)',
};

/* ============================================================
   The board

   Everything is composed in this fixed design space and scaled as
   a single piece into whatever room the overlay leaves it, so the
   proportions hold at 1280x720 and at 900x520 alike.
   ============================================================ */
export const view = {
  board: { w: 880, h: 545 },
  maxScale: 1.35,
  minRegion: { w: 260, h: 200 },
  fontFamily: 'Urbanist, "Segoe UI", system-ui, -apple-system, sans-serif',
};

/* How long each consequence takes to play out. Every one of these
   rides the animation loop, so a throttled tab cannot strand a step
   halfway through. */
export const timing = {
  wrong: 820,        // the screen reacting to a wrong call
  right: 620,        // the settle on a right one
  bannerIn: 240,     // the banner sliding up
  hold: 900,         // how long the consequence stays on screen
  handBack: 260,     // beat before the same decision comes back
  doneHold: 700,     // beat on the finished screen before the ending
};
