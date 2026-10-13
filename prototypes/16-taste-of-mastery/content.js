/* ============================================================
   Content for "Give learners a taste of mastery".

   A one-page report is going out to a client and the job is to catch
   what should not leave the building. The learner reviews it by
   clicking the parts of the page that are wrong. No questions, no
   answer lists — the page is the question.

   Beat one lends them the kit an experienced reviewer carries: every
   genuine problem pulses, the reason floats beside it, and a running
   note explains each one as it is flagged. Beat two is a different
   report with the kit switched off. Beat three is Friday's report
   again, bare.

   Everything the learner reads lives in this file.
   ============================================================ */

export const meta = {
  sendLabel: 'Send it',
  closeLabel: 'Close',
  againLabel: 'Review it again',

  /* Stat chips, top right */
  beatLabel: 'Review',
  flaggedLabel: 'Flagged',

  /* The panel across the bottom */
  noteTitle: 'Reviewer’s note',
  noteWaiting: 'Flag something and I will tell you what I am looking at.',

  /* Clicking a part of the page */
  flaggedToast: 'Flagged {part}.',
  unflaggedToast: 'Unflagged {part}. It will go out as it is.',

  /* Beat one only: the kit will not let a clean part be flagged. */
  blockedSendOne: 'One marked problem is still unflagged. It is right there on the page.',
  blockedSendMany: '{n} marked problems are still unflagged. They are right there on the page.',
};

/* ------------------------------------------------------------------
   The three passes. `supports` is the whole mechanic: beat one has
   the reviewer's kit switched on, the other two do not.
   ------------------------------------------------------------------ */
export const beats = [
  {
    n: 1,
    doc: 'a',
    supports: true,
    eyebrow: 'Document review — Friday, 4:40pm',
    title: 'This report goes to the client at five. Click anything on the page that should not leave the building.',
    hint: 'Everything an experienced reviewer would spot is marked for you. Click each marked part to flag it.',
    readyHint: 'All three flagged. Send it.',
    sentToast: 'Sent — and all three were caught before it left the building.',
  },
  {
    n: 2,
    doc: 'b',
    supports: false,
    eyebrow: 'Document review — Monday, 9:15am',
    title: 'A different report, a different client. Same job: click anything that should not leave the building.',
    banner: 'The marks, the floating reasons and the reviewer’s note are switched off from here on. Flag what you think is wrong and send it.',
    hint: 'Nothing is marked. Flag what you think is wrong, then send it.',
    sentToast: 'Sent. Nothing is marked right or wrong yet.',
  },
  {
    n: 3,
    doc: 'a',
    supports: false,
    eyebrow: 'Document review — Monday, 11:30am',
    title: 'Friday’s report is back, unchanged, and it goes out again today. Click anything that should not leave the building.',
    banner: 'Still no marks, no reasons and no note. Only what you now know to look for.',
    hint: 'The page you reviewed on Friday. Flag what should not go out.',
    sentToast: 'Sent.',
  },
];

/* The order regions sit down the page — used for the note log and the
   ending, so both read top to bottom rather than in click order. */
export const regionOrder = ['header', 'client', 'para', 'chart', 'table', 'footer'];

/* ------------------------------------------------------------------
   The two documents.

   Everything printed on the page is here: the text drawn onto the
   paper, and for each of the six regions whether it is a problem,
   the short tag that floats beside it in beat one, the line the
   reviewer adds to the running note, the reason used in the ending,
   and the one-line refusal if the learner flags it while the kit is
   on and it is clean.
   ------------------------------------------------------------------ */
export const docs = {
  /* Friday's report. Beats one and three. */
  a: {
    id: 'a',
    name: 'the Harlow & Finch service review',
    kicker: 'Service review',
    title: 'Quarterly Service Review — Q3 2025',
    subtitle: 'Reporting period: 1 April – 30 June 2025   ·   Issued 14 October 2025',
    clientLabel: 'Prepared for',
    clientName: 'Harlow & Finch Ltd',
    clientAddress: '38 Peel Street, Manchester M4 5JH',
    para:
      'Call volumes rose steadily across the quarter and the team absorbed the increase '
      + 'without extra headcount. Average handling time held at four minutes twelve seconds, '
      + 'and the backlog cleared twice during the period.',
    chart: {
      caption: 'Calls answered inside the 20-second target',
      axis: 'Percentage of calls',
      suffix: '%',
      ticks: [0, 50, 100],
      max: 100,
      bars: [
        { label: 'Jul', value: 91 },
        { label: 'Aug', value: 88 },
        { label: 'Sep', value: 93 },
      ],
    },
    table: {
      caption: 'Hours delivered this quarter',
      rows: [
        ['Contract hours delivered', '1,240'],
        ['Additional hours approved', '310'],
        ['Out-of-hours callouts', '85'],
      ],
      total: ['Total hours invoiced', '1,540'],
    },
    footer:
      'Harlow & Finch Ltd — commercial in confidence · page 1 of 1 · '
      + 'Dan says just send it, he never reads past page one',

    regions: {
      header: {
        label: 'the header',
        problem: true,
        tag: 'the header still carries last quarter’s dates',
        note: 'The title says Q3 and the dates underneath it are April to June. One of them is wrong, and the dates are the ones a client checks first.',
        reason: 'the title says Q3 2025 but the reporting period underneath it is 1 April – 30 June, which is Q2.',
      },
      client: {
        label: 'the client block',
        problem: false,
        clean: 'The client block is right — correct company, correct trading address.',
      },
      para: {
        label: 'the paragraph',
        problem: false,
        clean: 'The paragraph is fine. Every figure in it matches what we actually recorded.',
      },
      chart: {
        label: 'the chart',
        problem: false,
        clean: 'The chart is fine — the axis is labelled and every bar carries its value.',
      },
      table: {
        label: 'the figures table',
        problem: true,
        tag: 'the total does not match the rows above it',
        note: '1,240 plus 310 plus 85 is 1,635, and the total says 1,540. A client adds up an invoice table before they read a word of the text.',
        reason: 'the three rows add up to 1,635 hours and the total line says 1,540 — a 95-hour gap on an invoiced figure.',
      },
      footer: {
        label: 'the footer',
        problem: true,
        tag: 'a colleague’s note is still sitting in the footer',
        note: 'Dan’s aside about the client not reading past page one is still in the footer. That is the sort of line that gets read out in a meeting.',
        reason: 'a colleague’s remark about the client — “he never reads past page one” — was left in the footer.',
      },
    },
  },

  /* Monday's report. Beat two only, and never explained. */
  b: {
    id: 'b',
    name: 'the Brightmere facilities report',
    kicker: 'Facilities report',
    title: 'Facilities Condition Report 2025',
    subtitle: 'Reporting period: 1 January – 31 December 2025   ·   Issued: TBC',
    clientLabel: 'Prepared for',
    clientName: 'Brightmere Academy Trust',
    clientAddress: 'Unit 2, Carrow Road, Norwich NR1 1JE',
    para:
      'Across the eleven sites surveyed, Kettleby Hall Trust’s roofing accounts for the '
      + 'largest share of outstanding work, with four flat roofs now past their stated '
      + 'service life. Boiler plant is in better condition than last year.',
    chart: {
      caption: 'Repair spend by site',
      axis: null,
      suffix: '',
      ticks: null,
      max: 80,
      bars: [
        { label: 'Norwich', value: 72 },
        { label: 'Thetford', value: 44 },
        { label: 'Diss', value: 61 },
        { label: 'Wymondham', value: 38 },
      ],
    },
    table: {
      caption: 'Spend across the year',
      rows: [
        ['Reactive repairs', '128,400'],
        ['Planned maintenance', '96,250'],
        ['Compliance testing', '18,900'],
      ],
      total: ['Total spend', '243,550'],
    },
    footer: 'Brightmere Academy Trust — commercial in confidence · page 1 of 1',

    regions: {
      header: {
        label: 'the header',
        problem: true,
        tag: 'the issue date is still a placeholder',
        note: 'The issue date still reads TBC.',
        reason: 'the issue date was still a placeholder: “Issued: TBC”.',
      },
      client: {
        label: 'the client block',
        problem: false,
        clean: 'The client block is right.',
      },
      para: {
        label: 'the paragraph',
        problem: true,
        tag: 'the paragraph names a different client',
        note: 'The paragraph names Kettleby Hall Trust, who are a different account altogether.',
        reason: 'the paragraph names Kettleby Hall Trust — a different client’s account — instead of Brightmere.',
      },
      chart: {
        label: 'the chart',
        problem: true,
        tag: 'the chart has no axis label',
        note: 'The bars have no axis and no values, so nobody can tell what they measure.',
        reason: 'the chart has no axis label and no values, so the bars could be pounds, jobs or days.',
      },
      table: {
        label: 'the figures table',
        problem: false,
        clean: 'The figures table adds up.',
      },
      footer: {
        label: 'the footer',
        problem: false,
        clean: 'The footer is clean.',
      },
    },
  },
};

/* ------------------------------------------------------------------
   The ending. Everything is judged on beat three — the same page as
   beat one, with none of the help.
   ------------------------------------------------------------------ */
export const results = [
  {
    min: 1,
    title: 'All three, unaided',
    summary:
      'Friday you had the marks, the reasons and somebody talking you through it. Today you had a blank page '
      + 'and you found the same three things on your own.',
  },
  {
    min: 0.66,
    title: 'Two of the three',
    summary:
      'Two came straight back to you without any help at all. The third is the one worth a second look — '
      + 'you have already seen the reason for it once.',
  },
  {
    min: 0.33,
    title: 'One came back',
    summary:
      'One of the three stuck. That is a real start: an hour ago you had no idea what a reviewer looks at on a page like this.',
  },
  {
    min: 0,
    title: 'Not yet, unaided',
    summary:
      'None of the three came back to you with the marks switched off. Worth knowing now rather than after it has gone out — '
      + 'and you have seen what catching them feels like.',
  },
];

export const ending = {
  leadOne: 'With no help at all, you caught <b>1 of the 3</b> problems you had caught on Friday.',
  leadMany: 'With no help at all, you caught <b>{n} of the 3</b> problems you had caught on Friday.',
  caughtLine: '<span class="ok">Caught</span> <b>{part}</b> — {reason}',
  missedLine: '<span class="no">Missed</span> <b>{part}</b> — {reason}',
  cleanSome: 'You also flagged {list}, which was clean. On a real review that costs somebody an afternoon arguing about it.',
  cleanNone: 'You flagged nothing that was clean, so nobody downstream had to defend a page that was already right.',
  secondDocSome: 'On Monday’s unfamiliar report you found {n} of its 3 problems with nothing marked for you.',
  secondDocNone: 'On Monday’s unfamiliar report, with nothing marked for you, none of its 3 problems came out.',
  lesson:
    '<b>You were reaching for something you had already done, not something you had read about.</b> '
    + 'The first pass was not an explanation of what good reviewing looks like — it was twenty seconds of being '
    + 'good at it. By the third pass the page was not new and neither was the job; you were going back for a '
    + 'move you already had.',
};
