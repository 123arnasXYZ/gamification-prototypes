/* ============================================================
   The pitch text shown around each prototype in the carousel, in the
   deck's own order. `n` is the idea's number in that deck (1-23), so
   the carousel and the "view all" lightbox agree on what to call it.

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
    id: 'give-a-role',
    n: 1,
    url: './prototypes/15-give-a-role/',
    label: 'Give learners a role',
    title: 'Give learners a role',
    subtitle: 'Give learners a job to do, not just a course to complete.',
    effort: 1,
    opportunity: [
      'A lot of digital learning asks people to watch someone else make decisions, or read about what they should do in theory.',
      'Giving the learner a role changes that. It gives them a reason to care about what happens next.',
    ],
    idea: [
      'Make the learner the investigator, manager, safety officer, adviser or specialist responsible for solving the problem.',
      'This could be as simple as a line of setup at the start of the experience, or more developed with a character, briefing, mission or avatar.',
      'If it fits the experience, let learners choose or customize who they are before they begin.',
    ],
    why: [
      'A role gives the learning context and purpose.',
      'Instead of answering questions about what someone else should do, learners make decisions from inside the situation. That can make even simple scenarios feel more active and meaningful.',
    ],
    tags: ['Compliance & risk', 'Customer service', 'Leadership', 'Onboarding', 'Safety'],
  },
  {
    id: 'challenge-first',
    n: 2,
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
    tags: ['Compliance & risk', 'Leadership', 'Operations & quality', 'Product knowledge'],
  },
  {
    id: 'taste-of-mastery',
    n: 3,
    url: './prototypes/16-taste-of-mastery/',
    label: 'A taste of mastery',
    title: 'Give learners a taste of mastery',
    subtitle: 'Let learners experience what great looks like before teaching them how to get there.',
    effort: 1,
    opportunity: [
      'Learning often starts by telling people what they’re going to learn. But knowing the topic isn’t necessarily the same as understanding why it’s worth getting good at.',
      'What if we started by letting learners experience what they’ll eventually be capable of?',
    ],
    idea: [
      'Open by putting learners briefly in the shoes of someone who’s brilliant at the skill they’re about to develop.',
      'Give them access to the knowledge, tools or abilities of an expert and let them experience what success looks like.',
      'Then take those supports away and challenge them to build that capability for themselves.',
      'As they progress, gradually reintroduce the skills or tools they experienced at the beginning.',
    ],
    why: [
      'It shows learners the payoff before the learning begins. They’re not just told what they’ll learn; they can see what becoming good at it will allow them to do.',
      'It gives the rest of the experience a destination. Each new skill gets them closer to something they’ve already experienced.',
      'Bringing learners back to the opening challenge at the end could create a particularly satisfying demonstration of how far they’ve come.',
      'Like Star Wars: The Force Unleashed, which opens by letting you play as Darth Vader at enormous power before switching to a character whose abilities you then build up yourself.',
    ],
    tags: ['Customer service', 'Leadership', 'Product knowledge', 'Sales & negotiation', 'Technical skills'],
  },
  {
    id: 'invisible-tutorial',
    n: 4,
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
    tags: ['Compliance & risk', 'Customer service', 'Cybersecurity', 'Difficult conversations', 'Leadership', 'Onboarding', 'Operations & quality', 'Product knowledge', 'Project management', 'Safety', 'Sales & negotiation', 'Strategy & change', 'Technical skills'],
  },
  {
    id: 'build-your-answer',
    n: 5,
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
    tags: ['Compliance & risk', 'Customer service', 'Difficult conversations', 'Leadership', 'Safety', 'Sales & negotiation'],
  },
  {
    id: 'progress-map',
    n: 6,
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
    tags: ['Compliance & risk', 'Leadership', 'Onboarding', 'Product knowledge'],
  },
  {
    id: 'hints-cost',
    n: 7,
    url: './prototypes/17-hints-cost/',
    label: 'Hints cost something',
    title: 'Make hints cost something',
    subtitle: 'Make asking for help a decision, not just another button to click.',
    effort: 2,
    opportunity: [
      'Hints are useful when learners genuinely need them. But if help is always sitting there for free, there’s little reason to think twice before using it.',
      'What if asking for help meant some kind of trade-off?',
    ],
    idea: [
      'Give learners the option to ask for help when they encounter a difficult challenge, but put a small cost against it - whether that’s points, time, an earned token or another limited resource.',
      'Make the help genuinely useful: reveal a clue, remind them of something they’ve learned or point them towards the part of the problem worth reconsidering.',
      'If learners back themselves and get the answer wrong, give them an extra challenge or short scene that helps them understand where they went wrong before trying again.',
      'If they get it right without help, let them keep their points and continue.',
    ],
    why: [
      'Putting a cost against help creates a small strategic decision: “Do I know this well enough?”',
      'Learners who need support can still access it without making the challenge frustrating.',
      'Getting something wrong doesn’t need to become a dead end. It can trigger more practice or explanation, while learners who already understand can move straight on.',
      'Starting learners with three tokens for a whole experience turns it into resource management: not “is 100 points worth it?” but “is this hard enough to spend one of my three?”',
    ],
    tags: ['Compliance & risk', 'Product knowledge', 'Technical skills'],
  },
  {
    id: 'side-quests',
    n: 8,
    url: './prototypes/18-side-quests/',
    label: 'Side quests',
    title: 'Add side quests',
    subtitle: 'Give curious learners more to explore without making everyone else sit through it.',
    effort: 1,
    opportunity: [
      'Courses have a habit of growing. Another useful example gets added. Then a resource. Then some background information. Before long, every learner has to work through everything.',
      'What if the essentials stayed on the main path, while everything else became optional?',
    ],
    idea: [
      'Keep the essential learning on a clear main path, then turn ‘nice-to-know’ content into optional side quests.',
      'Let learners choose whether to explore extra examples, stories, challenges, resources or deeper dives.',
      'Make side quests feel worth discovering. Learners could earn collectables, uncover bonus content or unlock something for completing them.',
      'Show what’s available without forcing learners to complete it; although completionists might find an unfinished collection very difficult to resist.',
    ],
    why: [
      'Learners can choose how deep they want or need to go, rather than everyone receiving exactly the same amount of content.',
      'It protects the main experience from content creep while still giving valuable additional material somewhere to live.',
      'Optional challenges also give confident or curious learners more to discover without slowing everyone else down.',
      'The side quest should be an activity rather than a renamed ‘further reading’ button: not “read about our history” but “explore the founder’s office and find three objects from the first year”.',
    ],
    tags: ['Compliance & risk', 'Leadership', 'Onboarding', 'Product knowledge'],
  },
  {
    id: 'bonus-challenges',
    n: 9,
    url: './prototypes/19-bonus-challenges/',
    label: 'Bonus challenges',
    title: 'Add bonus challenges',
    subtitle: 'Give learners something extra to aim for, without creating any extra content.',
    effort: 1,
    opportunity: [
      'Once learners understand how an activity works, repeating it can quickly become predictable: answer the questions, get the score, move on.',
      'What if the same activity had extra challenges running in the background?',
    ],
    idea: [
      'Layer optional challenges over quizzes, scenarios and activities you already have.',
      'Challenge learners to get three answers right in a row, beat their previous score, complete something without using a hint or discover every optional resource.',
      'Run several challenges at the same time, so learners can make progress towards different goals as they work through the experience.',
      'You could even keep some challenges hidden until learners are close to completing them: “One more correct answer to unlock Perfect Streak.”',
    ],
    why: [
      'The same activity can give learners more than one thing to aim for, without adding more learning content.',
      'Different challenges can reward different behaviors: accuracy, improvement, exploration or taking on something more difficult.',
      'They can also give learners a reason to try an activity again - this time with a different goal.',
      'They work best when they are not all about scoring highly, so they can quietly encourage the behaviours you actually want learners to practise.',
    ],
    tags: ['Onboarding', 'Product knowledge'],
  },
  {
    id: 'consequences',
    n: 10,
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
    tags: ['Compliance & risk', 'Customer service', 'Leadership', 'Safety', 'Sales & negotiation'],
  },
  {
    id: 'hot-cold',
    n: 11,
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
    tags: ['Product knowledge', 'Safety', 'Technical skills'],
  },
  {
    id: 'earn-the-win',
    n: 12,
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
    tags: ['Compliance & risk', 'Operations & quality', 'Safety', 'Technical skills'],
  },
  {
    id: 'photo-hunt',
    n: 13,
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
    tags: ['Operations & quality', 'Safety'],
  },
  {
    id: 'onboarding-adventure',
    n: 14,
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
    tags: ['Onboarding', 'Strategy & change'],
  },
  {
    id: 'investigator-desk',
    n: 16,
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
    tags: ['Compliance & risk', 'Cybersecurity', 'Operations & quality', 'Safety', 'Technical skills'],
  },
  {
    id: 'decision-deck',
    n: 17,
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
    tags: ['Cybersecurity', 'Leadership', 'Project management', 'Safety', 'Strategy & change'],
  },
  {
    id: 'juggle',
    n: 18,
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
    tags: ['Customer service', 'Leadership', 'Operations & quality', 'Project management', 'Strategy & change'],
  },
  {
    id: 'world-reacts',
    n: 19,
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
    tags: ['Leadership', 'Project management', 'Strategy & change'],
  },
  {
    id: 'defence-waves',
    n: 22,
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
    tags: ['Compliance & risk', 'Cybersecurity', 'Operations & quality', 'Safety'],
  },
];

/* ============================================================
   Every idea in the deck, in its own numbering — including the
   few that have no prototype yet. The "view all" lightbox lists
   these and filters them by `topics`; `prototype` is the id in
   `prototypes` above, or null when there is nothing to open.
   ============================================================ */
export const ideas = [
  { n: 1, title: 'Give learners a role', effort: 1, prototype: 'give-a-role', topics: ['Compliance & risk', 'Customer service', 'Leadership', 'Onboarding', 'Safety'] },
  { n: 2, title: 'Start with the challenge', effort: 1, prototype: 'challenge-first', topics: ['Compliance & risk', 'Leadership', 'Operations & quality', 'Product knowledge'] },
  { n: 3, title: 'Give learners a taste of mastery', effort: 1, prototype: 'taste-of-mastery', topics: ['Customer service', 'Leadership', 'Product knowledge', 'Sales & negotiation', 'Technical skills'] },
  { n: 4, title: 'Make the tutorial invisible', effort: 1, prototype: 'invisible-tutorial', topics: ['Compliance & risk', 'Customer service', 'Cybersecurity', 'Difficult conversations', 'Leadership', 'Onboarding', 'Operations & quality', 'Product knowledge', 'Project management', 'Safety', 'Sales & negotiation', 'Strategy & change', 'Technical skills'] },
  { n: 5, title: 'Let learners build their answer', effort: 1, prototype: 'build-your-answer', topics: ['Compliance & risk', 'Customer service', 'Difficult conversations', 'Leadership', 'Safety', 'Sales & negotiation'] },
  { n: 6, title: 'Make progress impossible to miss', effort: 1, prototype: 'progress-map', topics: ['Compliance & risk', 'Leadership', 'Onboarding', 'Product knowledge'] },
  { n: 7, title: 'Make hints cost something', effort: 2, prototype: 'hints-cost', topics: ['Compliance & risk', 'Product knowledge', 'Technical skills'] },
  { n: 8, title: 'Add side quests', effort: 1, prototype: 'side-quests', topics: ['Compliance & risk', 'Leadership', 'Onboarding', 'Product knowledge'] },
  { n: 9, title: 'Add bonus challenges', effort: 1, prototype: 'bonus-challenges', topics: ['Onboarding', 'Product knowledge'] },
  { n: 10, title: 'Use immediate consequences as feedback', effort: 2, prototype: 'consequences', topics: ['Compliance & risk', 'Customer service', 'Leadership', 'Safety', 'Sales & negotiation'] },
  { n: 11, title: 'Bring \'Hot and Cold\' into quizzes', effort: 2, prototype: 'hot-cold', topics: ['Product knowledge', 'Safety', 'Technical skills'] },
  { n: 12, title: 'Make learners earn the win', effort: 1, prototype: 'earn-the-win', topics: ['Compliance & risk', 'Operations & quality', 'Safety', 'Technical skills'] },
  { n: 13, title: 'Turn observation into a photo hunt', effort: 3, prototype: 'photo-hunt', topics: ['Operations & quality', 'Safety'] },
  { n: 14, title: 'Turn your onboarding into an adventure', effort: 5, prototype: 'onboarding-adventure', topics: ['Onboarding', 'Strategy & change'] },
  { n: 15, title: 'Give learners a rival', effort: 4, prototype: null, topics: ['Project management', 'Sales & negotiation', 'Strategy & change'] },
  { n: 16, title: 'Build an investigator desk', effort: 3, prototype: 'investigator-desk', topics: ['Compliance & risk', 'Cybersecurity', 'Operations & quality', 'Safety', 'Technical skills'] },
  { n: 17, title: 'Turn decisions into a deck', effort: 4, prototype: 'decision-deck', topics: ['Cybersecurity', 'Leadership', 'Project management', 'Safety', 'Strategy & change'] },
  { n: 18, title: 'Give learners something to juggle', effort: 3, prototype: 'juggle', topics: ['Customer service', 'Leadership', 'Operations & quality', 'Project management', 'Strategy & change'] },
  { n: 19, title: 'Let the world react without you', effort: 4, prototype: 'world-reacts', topics: ['Leadership', 'Project management', 'Strategy & change'] },
  { n: 20, title: 'Let learners experiment with a simulator', effort: 3, prototype: null, topics: ['Operations & quality', 'Sales & negotiation', 'Technical skills'] },
  { n: 21, title: 'Give learners someone to practise with', effort: 4, prototype: null, topics: ['Customer service', 'Difficult conversations', 'Leadership', 'Sales & negotiation'] },
  { n: 22, title: 'Turn defense into a game', effort: 5, prototype: 'defence-waves', topics: ['Compliance & risk', 'Cybersecurity', 'Operations & quality', 'Safety'] },
  { n: 23, title: 'Build a management simulation', effort: 5, prototype: null, topics: ['Leadership', 'Operations & quality', 'Project management', 'Safety', 'Sales & negotiation', 'Strategy & change'] },
];

/* The filter chips, in the order they are shown. */
export const topics = [
  'Leadership',
  'Compliance & risk',
  'Safety',
  'Operations & quality',
  'Product knowledge',
  'Sales & negotiation',
  'Customer service',
  'Technical skills',
  'Strategy & change',
  'Onboarding',
  'Project management',
  'Cybersecurity',
  'Difficult conversations',
];
