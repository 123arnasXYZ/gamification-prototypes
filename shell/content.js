/* ============================================================
   The pitch text shown around each prototype in the carousel.

   This is the only place the wording lives — edit here and the
   shell picks it up. `effort` is a 1–5 rating rendered with the
   controller artwork in assets/.

   `tags` is optional: add training topics, e.g.
       tags: ['Leadership', 'Onboarding', 'Compliance'],
   and a row of pills appears under the effort rating. Leave it out
   and nothing is drawn.
   ============================================================ */

export const prototypes = [
  {
    id: 'investigator-desk',
    tags: [],
    url: './prototypes/01-investigator-desk/',
    label: 'Investigator desk',
    title: 'Build An Investigator Desk',
    effort: 3,
    idea:
      'Hand learners a case rather than a question. Multiple documents spread across a virtual ' +
      'desk: emails, reports, photos, statements, invoices. Learners open, zoom, rotate, ' +
      'highlight, annotate and compare them, pin what matters to a board, then commit to a decision.',
    why: [
      'The learner practices the actual skill instead of answering a question about it. These ' +
      'gamified interactions also carry meaning in a fun way: crossing out wrong information, ' +
      'ranking documents, making a verdict delivered through a specific action, rather than ' +
      'performing a click.',
      'The same desk works for a variety of training types. You can build it once and swap the ' +
      'actual content according to the theme.',
    ],
  },
  {
    id: 'decision-deck',
    tags: [],
    url: './prototypes/02-decision-deck/',
    label: 'Decision deck',
    title: 'Turn Decisions Into A Deck',
    effort: 4,
    idea:
      'Represent learners available moves as a card: a communication technique, a safety response, ' +
      'a leadership tactic, an investigation step and so on. A scenario arrives as the challenge to ' +
      'overcome, and the learner plays their deck of cards against it.',
    why: [
      'It turns decision-making into strategy. The deck is where the learning content lives. Cards ' +
      'can be swapped for a different topic while the resource system and scenario structure stay ' +
      'put, so the mechanic is reusable across different projects.',
    ],
  },
  {
    id: 'defence-waves',
    tags: [],
    url: './prototypes/03-defence-waves/',
    label: 'Defence waves',
    title: 'Turn Defence Into A Game',
    effort: 5,
    idea:
      'Give the learners something valuable to protect and a set of controls to protect it with. ' +
      'Threats arrive in waves and each control the learner places stops a particular kind of ' +
      'threat. Learners earn points to add or upgrade controls, and every placement teaches what ' +
      'that control does. For example, the learner must protect a company network, while attackers ' +
      'attempt to reach critical assets within the company (databases, emails, company records, etc.)',
    why: [
      'Learners build layers instead of memorising definitions. No single control stops everything, ' +
      'they discover the vulnerabilities by watching something get through, which lands in a more ' +
      'meaningful way, than reading a paragraph on the same matter.',
    ],
  },
  {
    id: 'photo-hunt',
    tags: [],
    url: './prototypes/04-photo-hunt/',
    label: 'Photo hunt',
    title: 'Turn Observation Into a Photo Hunt',
    effort: 3,
    idea:
      'Put learners inside a workplace scene and ask them to photograph hazards, quality issues, ' +
      'missed opportunities or policy breaches. Give them an inspection report at the end showing ' +
      'what they found and missed.',
    why: [
      'It trains people to notice what matters in context, rather than recognise the correct answer ' +
      'from a list.',
    ],
  },
];
