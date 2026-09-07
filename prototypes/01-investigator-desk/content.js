/* ============================================================
   The investigator desk runs in two modes. Both share the same
   mechanic — inspect four items, stamp each one, exactly one is
   wrong — but they use different props and different reasoning.

   In every mode exactly one item must have faulty: true.
   ============================================================ */

/* ------------------------------------------------------------------
   MEDICAL — four dispensed bottles, one with a dosing error.
   The pharmacy's own checking system prints the dose in red when it
   falls outside the expected range, so the red field is the flag the
   learner is being trained to look for (and then to justify).
   ------------------------------------------------------------------ */
const medical = {
  id: 'medical',
  label: 'Medical training',
  kind: 'bottle',
  eyebrow: 'Case 04 — Final dispensing check',
  title: 'Four bottles. One dose is wrong.',
  instructions: 'Click a bottle to pick it up. Drag to turn it, scroll to zoom. Approve the safe ones, reject the unsafe one.',
  items: [
    {
      id: 'BTL-1141',
      faulty: false,
      drug: 'Amoxicillin',
      strength: '500 mg',
      form: 'Capsules',
      quantity: '21 capsules',
      directions: 'ONE capsule THREE times a day',
      patient: 'M. Okafor',
      batch: 'A4-22817',
      expiry: '09 / 2027',
      note: 'Community-acquired chest infection. Seven-day course.',
      verdict: 'A standard adult dose and a sensible course length. The checking system printed the dose in blue — inside the expected range.',
    },
    {
      id: 'BTL-1142',
      faulty: true,
      drug: 'Digoxin',
      strength: '1.25 mg',          // the error: 10x the intended 125 micrograms
      form: 'Tablets',
      quantity: '28 tablets',
      directions: 'ONE tablet ONCE daily',
      patient: 'E. Hallam',
      batch: 'D9-10774',
      expiry: '02 / 2027',
      note: 'Rate control for atrial fibrillation. Patient is 78, 54 kg, eGFR 41.',
      verdict:
        'The maintenance dose should be <b>125 micrograms</b>, not 1.25 mg — a ten-fold overdose, printed in red ' +
        'because it sits far outside the expected range. In an underweight 78-year-old with reduced renal function ' +
        'this is the bottle that causes harm.',
    },
    {
      id: 'BTL-1143',
      faulty: false,
      drug: 'Metformin',
      strength: '500 mg',
      form: 'Tablets',
      quantity: '56 tablets',
      directions: 'ONE tablet TWICE a day with food',
      patient: 'S. Bright',
      batch: 'M2-56390',
      expiry: '11 / 2026',
      note: 'Newly started for type 2 diabetes. Allergy on file: penicillin.',
      verdict: 'A normal starting dose. The penicillin allergy on the label has nothing to do with metformin — a deliberate distraction.',
    },
    {
      id: 'BTL-1144',
      faulty: false,
      drug: 'Warfarin',
      strength: '3 mg',
      form: 'Tablets',
      quantity: '28 tablets',
      directions: 'ONE tablet ONCE daily at 18:00',
      patient: 'J. Trevino',
      batch: 'W7-30219',
      expiry: '05 / 2027',
      note: 'INR target 2.0–3.0. Last INR 2.4. Anticoagulant book issued.',
      verdict: 'A high-risk drug, but the bottle is correct: a plausible dose, a monitored INR in range, and a fixed dosing time. Risky-sounding is not the same as wrong.',
    },
  ],
  results: {
    perfect: {
      title: 'Clean check',
      summary: 'You caught the ten-fold digoxin overdose and let the safe bottles through.',
    },
    missed: {
      title: 'The overdose left the pharmacy',
      summary: 'BTL-1142 was approved. A 1.25 mg digoxin dose reaching this patient is a serious incident.',
    },
    overcautious: {
      title: 'Too many rejections',
      summary:
        'Rejecting safe bottles delays treatment and erodes trust in the check. ' +
        'The skill is spotting the one real error, not flagging everything that looks unusual.',
    },
  },
};

/* ------------------------------------------------------------------
   COMPLIANCE — four printed emails, one of which leaks confidential
   information to a competitor. One of the safe three is written to
   look far more alarming than it is.
   ------------------------------------------------------------------ */
const compliance = {
  id: 'compliance',
  label: 'Compliance training',
  kind: 'paper',
  eyebrow: 'Case 07 — Outbound mail review',
  title: 'Four emails. One breaks the NDA.',
  instructions: 'Click an email to pick it up and read it. Approve the ones that are fine to send, and reject the one that leaks.',
  items: [
    {
      id: 'MSG-4412',
      faulty: false,
      from: 'd.rowe@northbridge.co',
      to: 'p.almeida@northbridge.co',
      date: '14 Mar, 09:12',
      subject: 'Atlas launch — revised timeline',
      classification: 'Internal',
      body: [
        'Pri — board signed off this morning. We are pulling Atlas forward to 3 March and',
        'holding the enterprise tier at £48 a seat. Churn on that tier is 9%, which is the',
        'whole argument for going early.',
        'Can you get the revised deck to the sales leads before Friday? Internal only for now.',
      ],
      verdict: 'Confidential, but sent to a colleague at the same company on an internal thread. Marking it internal and saying so is exactly right.',
    },
    {
      id: 'MSG-4413',
      faulty: true,
      from: 'd.rowe@northbridge.co',
      to: 'j.kessler@meridiansys.com',
      date: '14 Mar, 21:47',
      subject: 'Re: good to catch up',
      classification: 'External',
      body: [
        'Great to see you Thursday, Jonas. Between us — we are pulling Atlas forward to',
        '3 March and pricing it at £48 a seat, roughly 15% under where you sit today.',
        'Enterprise churn is running at 9%, which is why the board wants the aggressive',
        'number. Obviously do not repeat any of that.',
      ],
      verdict:
        'Meridian Systems is a direct competitor. This email hands them an unreleased launch date, ' +
        'unannounced pricing and internal churn figures. "Between us" and "do not repeat that" are not ' +
        'controls — they are an admission that the sender knew. This is the NDA breach.',
    },
    {
      id: 'MSG-4414',
      faulty: false,
      from: 'd.rowe@northbridge.co',
      to: 'contracts@haldenfreight.com',
      date: '15 Mar, 11:03',
      subject: 'Q2 volume forecast — under MNDA 2024-118',
      classification: 'Confidential — NDA',
      body: [
        'Attached is the Q2 volume forecast and the packaging spec you asked for.',
        'This is shared under the mutual NDA signed 12 Jan (ref MNDA 2024-118) and is',
        'limited to the fulfilment team named in schedule 2.',
        'Let me know if you need the tolerance figures as well.',
      ],
      verdict:
        'This is the one that looks worst and is fine. Halden is a supplier, not a competitor, the disclosure ' +
        'is covered by a signed NDA, the agreement is referenced by number, and the audience is limited. ' +
        'Confidential information can be shared — under a contract, to a defined recipient, for a stated purpose.',
    },
    {
      id: 'MSG-4415',
      faulty: false,
      from: 'd.rowe@northbridge.co',
      to: 'l.fenwick@brookvale-health.org',
      date: '15 Mar, 16:20',
      subject: 'The case study you asked for',
      classification: 'Public',
      body: [
        'Here is the published Brookvale case study and our current public price list.',
        'Both have been through comms and are already on the website, so please share',
        'them with whoever you need to.',
        'Happy to walk your team through it next week.',
      ],
      verdict: 'Published material sent to a customer. Nothing here is confidential, and it says so.',
    },
  ],
  results: {
    perfect: {
      title: 'The leak was caught',
      summary: 'You stopped the email to the competitor and let the legitimate ones go — including the one covered by an NDA.',
    },
    missed: {
      title: 'It went to the competitor',
      summary: 'MSG-4413 was approved. Unreleased pricing, a launch date and churn figures are now in a competitor’s inbox.',
    },
    overcautious: {
      title: 'Too many rejections',
      summary:
        'Blocking legitimate mail has a cost too: the supplier disclosure was contractually covered and the customer ' +
        'email was public material. Compliance is deciding what is allowed, not refusing everything that mentions a number.',
    },
  },
};

export const modes = [medical, compliance];
export const defaultMode = 'medical';
