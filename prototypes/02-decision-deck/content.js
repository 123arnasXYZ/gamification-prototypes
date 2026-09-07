/* ============================================================
   One scenario, three cards, three meters. That is the whole game.

   Every card moves all three meters, and the sign is the whole
   story: green is better, red is worse. Swap this file to re-topic
   the mechanic without touching the 3D scene.
   ============================================================ */

export const meta = {
  eyebrow: 'Site decision — Crane lift',
  title: 'Heavy rain has started during crane operations.',
  scenario: 'The crane is holding a load. The rain is getting heavier and the wind is picking up. You are the supervisor on site.',
  instructions: 'Pick one of the three cards.',
};

export const resources = [
  { id: 'safety',   label: 'Safety',   value: 6, max: 10, color: '#12A177' },
  { id: 'budget',   label: 'Budget',   value: 6, max: 10, color: '#C98A0E' },
  { id: 'schedule', label: 'Schedule', value: 6, max: 10, color: '#2757E2' },
];

export const cards = [
  {
    id: 'continue',
    title: 'Continue work',
    blurb: 'Finish the lift before the weather gets any worse.',
    icon: 'play',
    effects: { safety: -4, budget: +1, schedule: +2 },
    rating: 'bad',
    verdict: 'Unsafe choice',
    feedback:
      'The load swings in the wind and the driver loses sight of the banksman. You saved two hours ' +
      'and left people working under a suspended load in a storm. This is the choice incident reports are written about.',
  },
  {
    id: 'pause',
    title: 'Pause operations',
    blurb: 'Set the load down, secure the crane and wait the weather out.',
    icon: 'pause',
    effects: { safety: +3, budget: -2, schedule: -2 },
    rating: 'ok',
    verdict: 'Safe, but costly',
    feedback:
      'Nobody gets hurt and the crane is secured. It costs you a day and some money. ' +
      'Stopping is never the wrong answer — but stopping without checking anything means you still ' +
      'will not know when it is safe to start again.',
  },
  {
    id: 'inspect',
    title: 'Inspect equipment',
    blurb: 'Hold the lift and check the crane, the ground and the wind reading.',
    icon: 'search',
    effects: { safety: +2, budget: -1, schedule: -1 },
    rating: 'best',
    verdict: 'Best choice',
    feedback:
      'You hold the lift, check the wind speed against the crane limit and look at the ground for softening. ' +
      'Now you are deciding with facts instead of guessing. It costs less than a full stand-down, and it tells ' +
      'you when it is safe to start again.',
  },
];

/** Score sent to the host page when a card is played. */
export const scoreFor = { best: 1, ok: 0.7, bad: 0 };
