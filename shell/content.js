/* ============================================================
   The pitch text shown around each prototype in the carousel.

   The wording is taken from "23 gamification ideas for L&D teams",
   so each entry mirrors a page of that document:

     title        the idea's name
     subtitle     the line underneath it
     opportunity  "The learning opportunity" (array = paragraphs)
     idea         "The idea" bullets
     why          "Why it works" bullets
     tags         "Where we'd use it", split on the | characters
     effort       the controller rating, 1-5 (see EFFORT_LABEL in
                  index.html: 1 Easy … 5 Call the game developers)

   This is the only place the wording lives — edit here and the
   shell picks it up.
   ============================================================ */

export const prototypes = [
  {
    id: 'investigator-desk',
    url: './prototypes/01-investigator-desk/',
    label: 'Investigator desk',
    title: 'Build an investigator desk',
    subtitle: 'Give learners the evidence. Let them work out what really happened.',
    effort: 3,
    opportunity: [
      'Real investigations rarely come with four possible answers. You have to gather information, decide what’s relevant, spot inconsistencies and piece together what happened.',
      'What if learners were given the whole case and left to investigate it for themselves?',
    ],
    idea: [
      'Give learners a case file containing evidence such as emails, reports, photographs, statements, invoices or records.',
      'Let them examine and compare the evidence, highlight important details and pin useful clues to an investigation board.',
      'Mix genuinely useful evidence with irrelevant information, contradictions or potential red herrings.',
      'When they’re ready, ask learners to commit to a conclusion and use the evidence they’ve collected to support it.',
    ],
    why: [
      'Learners have to investigate the problem rather than recognize the correct answer from a list.',
      'Deciding what matters and what doesn’t becomes part of the challenge.',
      'Different pieces of evidence can build on or contradict each other, requiring learners to make connections across the whole case.',
      'The same underlying mechanic can be reused with completely different cases and content.',
    ],
    tags: ['Fraud', 'HR investigations', 'Safety', 'Cybersecurity', 'Compliance', 'Medical training', 'Quality'],
  },
  {
    id: 'decision-deck',
    url: './prototypes/02-decision-deck/',
    label: 'Decision deck',
    title: 'Turn decisions into a deck',
    subtitle: 'Give learners a hand of options and make them decide which cards are worth playing.',
    effort: 4,
    opportunity: [
      'Real decisions often aren’t about choosing between one obviously right option and three wrong ones.',
      'You have several things you could do, but limited time, money, attention or influence to do them.',
      'What if learners had to build a strategy from the options available to them?',
    ],
    idea: [
      'Turn the learner’s available actions into cards: a communication technique, leadership tactic, safety response, investigation step or other useful action.',
      'Give each card different strengths, effects or costs - perhaps using resources such as time, trust, budget or morale.',
      'Present a challenge and ask learners to decide which cards to play, and in what combination.',
      'As learners progress, let them earn, upgrade or choose new cards to build a stronger deck.',
    ],
    why: [
      'Decisions become about strategy and trade-offs, rather than finding the obviously correct answer.',
      'Limited resources force learners to think about when an action is worth using.',
      'Building the deck over time gives learners a growing toolkit they can experiment with against different challenges.',
      'The underlying mechanic is reusable: change the cards and scenarios, while keeping the game system.',
    ],
    tags: ['Leadership', 'Project management', 'Cybersecurity', 'Safety', 'Healthcare', 'Strategy'],
  },
  {
    id: 'defence-waves',
    url: './prototypes/03-defence-waves/',
    label: 'Defence waves',
    title: 'Turn defense into a game',
    subtitle: 'Give learners something valuable to protect. Then start sending threats their way.',
    effort: 5,
    opportunity: [
      'It’s easy to teach individual controls, procedures or safeguards in isolation. What’s harder is helping learners understand how they work together - and what can happen when one of those layers is missing.',
      'What if learners had to build the defense themselves?',
    ],
    idea: [
      'Give learners something valuable to protect - a company network, workplace, production line or other critical system.',
      'Give them a limited budget to choose and position different defenses, with each one protecting against particular threats.',
      'Send threats in waves and let learners watch their defenses succeed - or discover where they’ve left themselves vulnerable.',
      'Reward successful rounds with resources they can use to add, replace or upgrade their defenses as the threats become more challenging.',
    ],
    why: [
      'Learners discover what each defense actually protects against by seeing it in action.',
      'No single defense solves everything, so learners have to think about how different layers work together.',
      'When something gets through, the learner can see where their strategy failed and change it for the next attempt.',
      'Increasingly difficult waves create a natural progression from understanding individual controls to building a complete defense strategy.',
    ],
    tags: ['Cybersecurity', 'Risk', 'Safety', 'Quality', 'Business continuity'],
  },
  {
    id: 'photo-hunt',
    url: './prototypes/04-photo-hunt/',
    label: 'Photo hunt',
    title: 'Turn observation into a photo hunt',
    subtitle: 'Give learners a camera and challenge them to find the things other people might miss.',
    effort: 3,
    opportunity: [
      'A lot of workplace learning is about noticing things: a safety hazard, a quality problem, a customer experience issue or something that simply doesn’t look right.',
      'Instead of pointing these things out, we can challenge learners to find them for themselves.',
    ],
    idea: [
      'Put learners inside a workplace scene and ask them to photograph hazards, quality issues, missed opportunities or policy breaches.',
      'Don’t necessarily tell them how many things they’re looking for. Let them decide when they’ve inspected the scene thoroughly enough.',
      'At the end, generate an inspection report showing what they spotted, what they missed and why each one mattered.',
    ],
    why: [
      'Learners have to notice and identify the issue themselves, rather than recognize the correct answer from a list of options.',
      'Hiding some obvious problems alongside much subtler ones can reward careful observation and create a genuine sense of discovery.',
      'The final report turns everything they found (and missed) into useful feedback.',
    ],
    tags: ['Safety', 'Quality', 'Retail', 'Healthcare', 'Operations'],
  },
  {
    id: 'challenge-first',
    url: './prototypes/05-challenge-first/',
    label: 'Start with the challenge',
    title: 'Start with the challenge',
    subtitle: 'Let learners try first. Teach them what they need when they need it.',
    effort: 1,
    opportunity: [
      'Digital learning often follows the same pattern: explain everything first, then give learners a chance to use it.',
      'But what if we flipped that around? Give learners the problem first and let the learning emerge from trying to solve it.',
    ],
    idea: [
      'Start with a realistic problem, decision or task - before explaining how to solve it.',
      'Let learners have a go using what they already know.',
      'If they struggle, offer hints, information or examples that help them work out what to do next.',
      'Then give them another chance to try, so they can immediately put what they’ve discovered into practice.',
    ],
    why: [
      'Games rarely begin with 20 minutes of instructions. We learn how they work by trying things, getting feedback and trying again.',
      'Starting with the challenge gives the information that follows a purpose: learners know why they need it.',
      'It also gives people who already know what they’re doing the opportunity to prove it, rather than forcing them through information they don’t need.',
    ],
    tags: ['Compliance', 'Leadership', 'Systems training', 'Product knowledge', 'Processes', 'Almost anything knowledge-heavy'],
  },
  {
    id: 'invisible-tutorial',
    url: './prototypes/06-invisible-tutorial/',
    label: 'Invisible tutorial',
    title: 'Make the tutorial invisible',
    subtitle: 'Teach learners how something works while they’re already using it.',
    effort: 1,
    opportunity: [
      'Complex interactions often start with complex instructions: click here, drag this, look out for that, then press this when you’re finished.',
      'What if learners could discover how everything works simply by using it?',
    ],
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
    tags: ['Simulations', 'Games', 'Software training', 'Complex interactions', 'Any unfamiliar learning experience'],
  },
  {
    id: 'build-your-answer',
    url: './prototypes/07-build-your-answer/',
    label: 'Build your answer',
    title: 'Let learners build their answer',
    subtitle: 'Don’t ask learners to pick the right response. Let them construct it.',
    effort: 1,
    opportunity: [
      'Multiple-choice questions often make the answer easier than the real decision. Learners aren’t deciding what to do; they’re recognizing the best response someone else has already written.',
      'What if you give them the individual ingredients and ask them to build the answer themselves?',
    ],
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
    tags: ['Leadership', 'Customer service', 'Compliance', 'Sales', 'Safety', 'Difficult conversations'],
  },
  {
    id: 'progress-map',
    url: './prototypes/08-progress-map/',
    label: 'Progress map',
    title: 'Make progress impossible to miss',
    subtitle: 'Turn progress into something learners can see, earn and unlock.',
    effort: 1,
    opportunity: [
      '“You’re 40% complete” tells learners how much content they’ve viewed, but not necessarily what they’ve achieved.',
      'What if progress showed learners exactly how far they’d come - and gave them something to work towards next?',
    ],
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
    tags: ['Onboarding', 'Leadership programmes', 'Compliance', 'Skills development', 'Product training', 'Multi-module learning'],
  },
  {
    id: 'consequences',
    url: './prototypes/09-consequences/',
    label: 'Immediate consequences',
    title: 'Use immediate consequences as feedback',
    subtitle: 'Don’t tell learners what their decision caused. Let them see it.',
    effort: 2,
    opportunity: [
      'Scenario feedback often stops the action. For example: “Incorrect. This response could make the customer feel that their concerns aren’t being taken seriously.”',
      'But that’s not how feedback usually arrives in real life. You make a decision, and then you see what happens.',
    ],
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
    tags: ['Customer service', 'Leadership & soft skills', 'Sales', 'Safety', 'Compliance', 'Branching scenarios'],
  },
  {
    id: 'hot-cold',
    url: './prototypes/10-hot-cold/',
    label: 'Hot and cold',
    title: 'Bring ‘Hot and Cold’ into quizzes',
    subtitle: 'Turn every wrong attempt into information that helps learners get closer.',
    effort: 2,
    opportunity: [
      'A standard hotspot question usually gives learners one attempt: click the right place, and you’re correct; click anywhere else, and you’re wrong.',
      'But there’s a huge difference between being a few pixels away and having absolutely no idea where to look. What if every attempt helped learners get closer to the answer?',
    ],
    idea: [
      'Let learners keep searching until they find the correct spot. After each attempt, give them proximity feedback such as ‘Freezing’, ‘Cold’, ‘Warm’, ‘Hot’ and ‘Found it!’',
      'Score their performance based on how many attempts they needed. Someone who finds it immediately scores higher than someone who needs six attempts.',
      'For more complex activities, you could combine attempts with other measures such as time, accuracy or hints used.',
    ],
    why: [
      'Learners aren’t simply told they’re wrong. Every attempt gives them new information they can use.',
      'It rewards degrees of understanding. Someone who was very close on their first attempt has demonstrated something different from someone who started completely in the wrong place.',
      'The warmer/colder feedback keeps learners thinking and adjusting between attempts, rather than clicking once and waiting for the answer.',
      'A range of possible scores can also give you a much richer picture of performance than pass/fail.',
    ],
    tags: ['Safety', 'Diagnostics', 'Technical skills', 'Visual inspection', 'Systems training', 'Product knowledge'],
  },
  {
    id: 'earn-the-win',
    url: './prototypes/11-earn-the-win/',
    label: 'Earn the win',
    title: 'Make learners earn the win',
    subtitle: 'Don’t let learners fail forwards. Give them another chance to get it right.',
    effort: 1,
    opportunity: [
      'In lots of eLearning, learners can answer a question incorrectly, read the feedback (or skip it) and simply carry on.',
      'That makes getting the answer right surprisingly unimportant. What if learners had to use the feedback, try again and succeed before they could move on?',
    ],
    idea: [
      'Don’t automatically reveal the correct answer after a learner gets something wrong. Give them useful feedback and let them try again.',
      'Keep the challenge open until they demonstrate that they can actually complete it successfully.',
      'On each retry, give learners enough information to rethink their approach without simply telling them the answer.',
      'For more complex challenges, you could gradually increase the support after repeated attempts - a small hint first, then a stronger clue if they continue to struggle.',
    ],
    why: [
      'If learners can fail and continue anyway, there’s very little reason for them to pay attention to the feedback.',
      'Requiring another attempt makes the feedback immediately useful: learners need to understand what went wrong so they can change what they do next.',
      'It turns failure into part of the learning experience rather than the end of it: Try → Feedback → Adjust → Retry → Succeed.',
      'Learners ultimately move on because they’ve demonstrated the required behavior or understanding, rather than simply because they’ve completed the interaction.',
    ],
    tags: ['Compliance', 'Safety', 'Systems training', 'Technical skills', 'Processes', 'Knowledge checks', 'Decision-making scenarios'],
  },
  {
    id: 'onboarding-adventure',
    url: './prototypes/12-onboarding-adventure/',
    label: 'Onboarding adventure',
    title: 'Turn your onboarding into an adventure',
    subtitle: 'Let new starters explore your organization, rather than introducing it through slides.',
    effort: 5,
    opportunity: [
      'Starting a new job means taking in a lot at once: new people, places, products, processes, history and ways of working.',
      'Rather than presenting all of that information in a long onboarding course, what if new starters could actually explore it?',
    ],
    idea: [
      'Turn your organization into a side-scrolling world that new starters can explore.',
      'Let learners choose or customize an avatar, then travel between different places, teams, products and moments from your company’s history.',
      'Hide things throughout the world to discover: characters to meet, objects to interact with, stories to uncover and challenges to complete.',
      'Unlock new areas as learners progress through their onboarding.',
    ],
    why: [
      'Exploration gives learners some control over what they discover and in what order.',
      'Information has a place and context: instead of reading about a product or team on a slide, learners encounter it as part of the world.',
      'Optional details and hidden discoveries mean curious learners can dig deeper without making everyone sit through everything.',
      'Creating an avatar of themselves puts the learner inside the experience, helping them see themselves as part of the organization.',
    ],
    tags: ['Onboarding', 'Company History', 'Strategy launches'],
  },
  {
    id: 'world-reacts',
    url: './prototypes/13-world-reacts/',
    label: 'The world reacts',
    title: 'Let the world react without you',
    subtitle: 'Create a world where your decisions affect people you never directly interacted with.',
    effort: 4,
    opportunity: [
      'Most workplace scenarios focus on one conversation at a time. But real teams don’t work like that. People talk, relationships change, and one decision can ripple through an entire team.',
      'What if the people in your scenario reacted to each other, not just to you?',
    ],
    idea: [
      'Create several characters with their own relationships, priorities and opinions. Let the learner’s actions affect how those characters behave towards each other, not just towards the learner.',
      'Show some of those knock-on effects through conversations, changing relationships or a live Teams/Slack-style chat.',
      'Keep the world moving between decisions, so situations can improve, deteriorate or develop without the learner directly intervening.',
    ],
    why: [
      'Learners can experience the ripple effects of their decisions across a wider team.',
      'It shows that ignoring a situation is still a decision. Problems don’t necessarily wait patiently for the learner to address them.',
      'Characters reacting to each other makes the experience feel more like a living workplace than a sequence of branching conversations.',
      'Learners have to think about the wider system they’re influencing, rather than just getting each individual interaction right.',
    ],
    tags: ['Leadership', 'Change', 'Team performance', 'Culture', 'Project management'],
  },
  {
    id: 'juggle',
    url: './prototypes/14-juggle/',
    label: 'Something to juggle',
    title: 'Give learners something to juggle',
    subtitle: 'Make every decision affect more than one thing.',
    effort: 3,
    opportunity: [
      'Workplace decisions rarely have one neat measure of success. A manager might hit a deadline but burn out their team. A project could come in under budget but compromise quality.',
      'What if learners could see these competing pressures change as they make decisions?',
    ],
    idea: [
      'Create a small set of competing measures such as Trust, Pressure, Morale and Capacity.',
      'Make every decision affect one or more of them - improving one might come at the expense of another.',
      'Let those effects accumulate across the experience rather than resetting after every decision.',
      'Push a measure too far and something happens: someone burns out, a deadline slips, trust breaks down, or another problem appears.',
    ],
    why: [
      'Learners have to manage trade-offs, rather than simply hunting for the right answer.',
      'It makes invisible consequences such as trust, pressure and morale visible.',
      'Decisions made earlier can create problems later, encouraging learners to think beyond the immediate outcome.',
      'There doesn’t need to be one perfect score. Success can mean keeping a complicated system in balance.',
    ],
    tags: ['Leadership', 'Project management', 'Change', 'Operations', 'Wellbeing', 'Customer experience'],
  },
];
