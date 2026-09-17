/* ============================================================
   Content for "Use immediate consequences as feedback".

   Stack three boxes on a pallet. There is no "correct"/"incorrect"
   anywhere: a box that carries more than it can take gets crushed on
   the spot, and the damage stays even if you lift the top box off
   again. Sending the pallet shows how the load travels, and the end
   summary describes what arrived rather than grading it.

   `weight` is in kg. `holds` is the most weight a box can carry on
   top of it before it gives way.
   ============================================================ */

export const meta = {
  eyebrow: 'Warehouse — bay 3',
  title: 'Stack the order on the pallet and send it.',
  instructions: 'Click a box to put it on the pallet.',
};

export const items = [
  {
    id: 'tins', name: 'Tinned food', weight: 20, holds: 99,
    colour: 0x8a6238, height: 0.8,
    crushed: '',
    arrivedOk: 'arrived fine',
    arrivedBad: '',
  },
  {
    id: 'paper', name: 'Printer paper', weight: 10, holds: 12,
    colour: 0xc9a46e, height: 0.9,
    crushed: 'The paper box bulges and splits at the corners.',
    arrivedOk: 'arrived fine',
    arrivedBad: 'box split, several reams torn',
  },
  {
    id: 'eggs', name: 'Eggs', weight: 2, holds: 0, fragile: true,
    colour: 0xe8d9a8, height: 0.6,
    crushed: 'Crunch. The egg trays fold under the weight.',
    arrivedOk: 'arrived without a crack',
    arrivedBad: 'most of the trays arrived cracked',
  },
];

export const fellOff = 'fell off the pallet on the way';

/* What the driver says at the other end, picked by how many boxes were damaged. */
export const arrivals = [
  { damaged: 0, title: 'The order arrived', line: '“Easiest unload all week.”' },
  { damaged: 1, title: 'The order arrived — mostly', line: '“One of these is going to be a return.”' },
  { damaged: 2, title: 'The order arrived in pieces', line: '“I had to stop twice to push the stack back on.”' },
];

export const question = 'What would you change about the stack next time?';
