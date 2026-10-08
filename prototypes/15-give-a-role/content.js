/* ============================================================
   Content for "Give learners a role".

   One incident — a tray of drinks over at the front of the queue —
   read through three different jobs. The briefing changes wording
   per role, and so do the options: the right call for the safety
   officer is somebody else's call for the customer host.

   Nothing here is a trick. Each role has one option that is
   plainly its own job, one that is useful but out of its lane,
   and one that belongs to one of the other two roles.
   ============================================================ */

export const meta = {
  eyebrow: 'Riverside Arena — 19:20, doors open',
  title: 'Same incident. Pick the job you are holding tonight.',
  pickPrompt: 'Three jobs are on shift. Which one is yours?',
  briefEyebrow: 'The duty manager finds you',
  decideEyebrow: 'Your call',
  outcomeEyebrow: 'What happened',
  /* {n} roles tried out of {m} */
  tried: 'Roles tried: {n} of {m}',
  allTried: 'All three jobs tried — the incident never changed.',
  briefCta: 'Go to the queue',
  againCta: 'Try the same incident as someone else',
};

/* The incident itself. Identical for everyone — only the job changes. */
export const incident = {
  what: 'A full tray of drinks has gone over at the head of the queue, right inside the main doors.',
  facts: [
    'Twenty-odd people waiting, more coming through the doors.',
    'The floor is wet across the width of the entrance.',
    'The show starts in ten minutes.',
  ],
};

export const roles = [
  {
    id: 'manager',
    name: 'Shift manager',
    colour: 0x2757e2,
    badgeColour: '#2757E2',
    responsible: 'You own how the floor runs: who is standing where, and whether the queue is moving.',
    brief: '“I need the entrance moving again. You decide who comes off what — that’s your call, not mine.”',
    options: [
      {
        id: 'reassign',
        label: 'Move a server off the bar to clear it and open a second lane',
        yours: true,
        score: 1,
        goto: 'counter',
        outcome: 'You were the only person on shift who could move someone. The second lane opens, the floor is dry in four minutes, and the show starts on time.',
      },
      {
        id: 'mop',
        label: 'Get a cloth and mop it up yourself',
        score: 0.55,
        goto: 'spill',
        outcome: 'The floor gets dry. But for those four minutes nobody is running the entrance, so the queue stops where it is and nothing else gets decided.',
      },
      {
        id: 'log',
        label: 'Write up the incident log before anything else',
        elsewhere: 'Safety officer',
        score: 0.3,
        goto: 'counter',
        outcome: 'The log is thorough and somebody else was always going to write it. Meanwhile the one person who could reassign staff was filling in a form.',
      },
    ],
  },
  {
    id: 'safety',
    name: 'Safety officer',
    colour: 0x5fe0b0,
    badgeColour: '#128A66',
    responsible: 'You own nobody getting hurt — and the record that shows you acted when it happened.',
    brief: '“Wet floor, main doors, crowd coming in. I need that made safe and I need it written down.”',
    options: [
      {
        id: 'cordon',
        label: 'Cordon the wet area, then log the time and who you told',
        yours: true,
        score: 1,
        goto: 'spill',
        outcome: 'Nobody walks on it, and when a claim arrives three weeks later there is a timed record with names on it. That record only exists because you were the one standing there.',
      },
      {
        id: 'dry',
        label: 'Grab a cloth and get it dry fast so people can move',
        score: 0.55,
        goto: 'spill',
        outcome: 'Quick, and well meant. But people were still walking across it while you worked, and there is nothing written down to show the floor was ever wet.',
      },
      {
        id: 'lanes',
        label: 'Re-plan the queue lanes to get people past',
        elsewhere: 'Shift manager',
        score: 0.3,
        goto: 'queue',
        outcome: 'The lanes do get sorted, by you, slowly, without the authority to move staff. The wet floor stayed open the whole time.',
      },
    ],
  },
  {
    id: 'host',
    name: 'Customer host',
    colour: 0xf0a23a,
    badgeColour: '#B8701A',
    responsible: 'You own how it feels to be the person standing in that queue with a ticket in their hand.',
    brief: '“There are twenty people watching this happen and nobody has said a word to them. That bit is yours.”',
    options: [
      {
        id: 'talk',
        label: 'Walk the front of the queue: apologise, say what is happening and how long',
        yours: true,
        score: 1,
        goto: 'queue',
        outcome: 'Phones go back in pockets. Nothing about the spill changed — but twenty people stopped guessing, because the person whose job that was actually turned up.',
      },
      {
        id: 'warn',
        label: 'Stand by the spill and warn each person as they come past',
        score: 0.55,
        goto: 'spill',
        outcome: 'Helpful, and safe. But you spent the incident being a wet-floor sign, and the queue behind you still heard nothing from anyone.',
      },
      {
        id: 'staff',
        label: 'Decide which staff member comes off the bar to clean it',
        elsewhere: 'Shift manager',
        score: 0.3,
        goto: 'counter',
        outcome: 'The server you picked was mid-order and the bar backs up. That call was somebody else’s to make, and the queue still has nobody talking to it.',
      },
    ],
  },
];

export const result = {
  yours: {
    title: 'That was your job, and you did it',
    summary: 'Same spill, same ten minutes. What changed was which bit of it was yours to hold.',
  },
  lane: {
    title: 'Useful, but not quite the job',
    summary: 'Nothing you did was wrong. It just wasn’t the part of this incident you were holding.',
  },
  elsewhere: {
    title: 'You did someone else’s job',
    summary: 'A reasonable thing to do, made by the wrong person. The part only you could do went unheld.',
  },
  /* {role} is the role name, {dut} what it is responsible for. */
  roleLine: '<b>{role}</b> — {dut}',
  elsewhereLine: 'That call belonged to the <b>{other}</b>. Nobody else could make yours.',
  lesson: '<b>A job is not a course.</b> Give someone a role and they stop asking what the module wants and start asking what their job needs — which is the question they will have at work.',
};
