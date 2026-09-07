/* ============================================================
   Content for the defence prototype.

   Deliberately small: two controls, two waves, one kind of threat
   per wave. The learning point is matching a control to the threat
   it actually stops, so each wave says plainly what is coming and
   the colours line up with the control that handles it.
   ============================================================ */

export const meta = {
  eyebrow: 'Protect: the customer database',
  title: 'Two waves. Place the control that stops each one.',
  instructions: 'Click a pad, then choose the control to put there.',
};

export const asset = {
  name: 'Customer database',
  integrity: 4,
};

/** One control per wave. */
export const budget = 2;

export const threatTypes = {
  phishing:   { label: 'Fake emails',      color: 0xe8912a, css: '#C4720F' },
  credential: { label: 'Stolen passwords', color: 0x8b5cf6, css: '#6D3FD6' },
};

export const controls = [
  {
    id: 'filter',
    label: 'Mail filter',
    short: 'Filter',
    color: 0xe8912a,
    css: '#C4720F',
    stops: 'phishing',
    blurb: 'Blocks fake emails before anyone can click them.',
  },
  {
    id: 'mfa',
    label: 'Multi-factor login',
    short: 'MFA',
    color: 0x8b5cf6,
    css: '#6D3FD6',
    stops: 'credential',
    blurb: 'A stolen password on its own is not enough to get in.',
  },
];

export const waves = [
  {
    threat: 'phishing',
    count: 4,
    intel: 'Fake emails are arriving, pretending to be from your finance team.',
  },
  {
    threat: 'credential',
    count: 4,
    intel: 'Passwords stolen from another company are being tried on your login page.',
  },
];

export const results = {
  clean: {
    title: 'Nothing got through',
    summary: 'You matched each control to the threat that was actually coming. That is the whole skill.',
  },
  damaged: {
    title: 'Some of it landed',
    summary: 'The database survived, but a wave arrived with no control that could stop it.',
  },
  lost: {
    title: 'The database fell',
    summary: 'Controls were placed, but not the ones these waves needed. A control only stops its own kind of threat.',
  },
};
