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
    tags: ['Compliance', 'Investigations', 'Fraud & risk', 'Quality assurance', 'Data protection', 'Critical thinking'],
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
    tags: ['Leadership', 'Safety', 'Communication skills', 'Crisis response', 'Project management', 'Ethics'],
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
    tags: ['Cyber security', 'Information security', 'Risk management', 'Data protection', 'IT onboarding', 'Layered controls'],
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
    tags: ['Health & safety', 'Quality control', 'Site inspections', 'Retail standards', 'Food hygiene', 'Compliance'],
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

  /* ---- idea may also be an array: each entry becomes its own paragraph ---- */
  {
    id: 'challenge-first',
    tags: ['Compliance', 'Leadership', 'Systems training', 'Product knowledge', 'Processes', 'Almost anything knowledge-heavy'],
    url: './prototypes/05-challenge-first/',
    label: 'Start with the challenge',
    title: 'Start With the Challenge',
    effort: 1,
    idea: [
      'Start with a realistic problem, decision or task — before explaining how to solve it.',
      'Let learners have a go using what they already know.',
      'If they struggle, offer hints, information or examples that help them work out what to do next.',
      'Then give them another chance to try, so they can immediately put what they’ve discovered into practice.',
    ],
    why: [
      'Games rarely begin with 20 minutes of instructions. We learn how they work by trying things, getting feedback and trying again.',
      'Starting with the challenge gives the information that follows a purpose: learners know why they need it.',
      'It also gives people who already know what they’re doing the opportunity to prove it, rather than forcing them through information they don’t need.',
    ],
  },
  {
    id: 'invisible-tutorial',
    tags: ['Simulations', 'Games', 'Software training', 'Complex interactions', 'Any unfamiliar learning experience'],
    url: './prototypes/06-invisible-tutorial/',
    label: 'Invisible tutorial',
    title: 'Make the Tutorial Invisible',
    effort: 1,
    idea: [
      'Drop learners straight into a simple version of the activity, with an easy first challenge they can complete successfully.',
      'Introduce new controls, rules or features only when learners actually need them.',
      'Give plenty of guidance the first time they encounter something, then gradually take it away as they become more confident.',
      'By the time they reach the full challenge, they already know how everything works without ever sitting through a separate tutorial.',
    ],
    why: [
      'Instructions are easier to understand when learners can use them immediately, rather than trying to remember them for later.',
      'Introducing one thing at a time avoids overwhelming learners with instructions before they’ve even started.',
      'Gradually removing guidance also gives learners the opportunity to practice independently before they’re assessed.',
    ],
  },
  {
    id: 'build-your-answer',
    tags: ['Leadership', 'Customer service', 'Compliance', 'Sales', 'Safety', 'Difficult conversations'],
    url: './prototypes/07-build-your-answer/',
    label: 'Build your answer',
    title: 'Let Learners Build Their Answer',
    effort: 1,
    idea: [
      'Break a decision into two or more parts and ask learners to make each choice separately.',
      'A customer service response might combine Tone (Apologetic/Neutral/Defensive/Casual) with Action (Refund/Replace/Escalate/Investigate).',
      'A leadership decision could combine what you do with how you communicate it. A safety scenario could combine immediate action with who you notify.',
      'Score each part independently, so an answer can be completely right, partly right or an interesting combination of good and bad decisions.',
    ],
    why: [
      'Learners have to construct a response rather than recognize one, making it much harder to guess the intended answer.',
      'Combining just a few choices creates lots of possible outcomes; four options for Tone multiplied by four for Action already gives you 16 different responses.',
      'It creates much richer feedback. Instead of simply saying ‘Incorrect’, you can show learners which part of their thinking was strong and which part needs work.',
    ],
  },
  {
    id: 'progress-map',
    tags: ['Onboarding', 'Leadership programmes', 'Compliance', 'Skills development', 'Product training', 'Multi-module learning'],
    url: './prototypes/08-progress-map/',
    label: 'Progress map',
    title: 'Make Progress Impossible to Miss',
    effort: 1,
    idea: [
      'Show learners the journey upfront using a roadmap, checklist, level map or series of challenges.',
      'Make completed stages visibly different, clearly show where learners are now and tease what’s still ahead.',
      'Lock later challenges until learners complete what comes before - then make unlocking them feel like an achievement.',
      'Tie progress to doing something successfully, rather than simply viewing enough pages.',
    ],
    why: [
      'Learners can immediately see where they are, how far they’ve come and what’s still ahead.',
      'Visible locked content creates curiosity about what’s coming next.',
      'Most importantly, progress can represent mastery rather than completion. Clearing a challenge means the learner has achieved something, not simply clicked through it.',
    ],
  },
  {
    id: 'consequences',
    tags: ['Customer service', 'Leadership & soft skills', 'Sales', 'Safety', 'Compliance', 'Branching scenarios'],
    url: './prototypes/09-consequences/',
    label: 'Immediate consequences',
    title: 'Use Immediate Consequences as Feedback',
    effort: 2,
    idea: [
      'Instead of displaying a feedback box, make the scenario itself respond to the learner’s decision.',
      'A frustrated customer becomes angrier. A colleague stops contributing. A safety risk escalates. A client sends an unexpected reply.',
      'Feedback doesn’t have to be dialogue. The environment, character expressions, sound or even the interface itself could change.',
      'Don’t always explain whether the decision was “right” or “wrong”. Let learners interpret the consequences and decide what to do next.',
    ],
    why: [
      'The learner stays inside the situation, rather than being pulled out of it to read an explanation.',
      'Consequences give learners something to interpret: “Why did that happen?” rather than simply telling them what they got wrong.',
      'It also allows for more realistic shades of grey. A decision might solve one problem while accidentally creating another.',
    ],
  },
];
