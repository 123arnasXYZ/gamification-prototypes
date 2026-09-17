/* ============================================================
   Content for "Make progress impossible to miss".

   A first-week onboarding journey as a level map. Every stage is
   visible from the start — including what's locked — but a stage
   only clears when the learner gets its challenge right. Viewing
   isn't progress; succeeding is.
   ============================================================ */

export const meta = {
  eyebrow: 'Onboarding — your first week',
  title: 'Clear each stage to unlock the next.',
};

export const stages = [
  {
    title: 'Get in the building',
    question: 'You’ve forgotten your badge. A colleague offers to let you follow them through the secure door.',
    options: [
      { text: 'Go to reception for a temporary pass', correct: true },
      { text: 'Follow them in — they know who you are' },
      { text: 'Wait by the door for someone from security' },
    ],
    why: 'Anyone following someone through a secure door is invisible to the access log. Reception is quick and keeps the record right.',
  },
  {
    title: 'Fire safety',
    question: 'The fire alarm goes off in the middle of a meeting. What do you do first?',
    options: [
      { text: 'Pick up your laptop, then leave' },
      { text: 'Leave by the nearest exit and don’t use the lifts', correct: true },
      { text: 'Check the team chat to see if it’s a drill' },
    ],
    why: 'Treat every alarm as real. Belongings and checking whether it’s a drill both cost time you might not have.',
  },
  {
    title: 'Handling data',
    question: 'A customer emails asking for their account details to be sent to a new email address.',
    options: [
      { text: 'Send them — it’s their own information' },
      { text: 'Reply to say you can’t help with that' },
      { text: 'Verify who they are before changing anything', correct: true },
    ],
    why: 'Changing where details go is exactly what someone taking over an account would ask for. Check identity first.',
  },
  {
    title: 'Ask for help',
    question: 'It’s your third day and you’re stuck on a task. Your manager is in back-to-back meetings.',
    options: [
      { text: 'Ask your onboarding buddy or post in the team channel', correct: true },
      { text: 'Wait until your manager is free on Friday' },
      { text: 'Guess, and fix it later if it’s wrong' },
    ],
    why: 'Nobody expects you to know everything in week one. Asking early is faster for everyone than a guess that needs undoing.',
  },
];

export const results = {
  title: 'Week one complete',
  summary: 'Four stages, each cleared by getting something right — not by scrolling to the end of a page.',
};
