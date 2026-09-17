/* ============================================================
   Content for "Make the tutorial invisible".

   Four short steps. Each adds exactly one thing, and the help
   fades as it goes: shown every time, then once, then only when
   something new appears, then not at all. Nobody reads a list of
   rules up front — by step 4 they already know them.

   Parcel codes: 'blue' | 'green' | 'fragile-blue' | 'fragile-green'
   ============================================================ */

export const meta = {
  eyebrow: 'Dispatch — sorting station',
  title: 'Sort the parcels.',
};

export const bins = {
  blue:    { label: 'BLUE',    color: 0x2757e2, css: '#2757E2' },
  green:   { label: 'GREEN',   color: 0x12a177, css: '#12A177' },
  fragile: { label: 'FRAGILE', color: 0xe8912a, css: '#C4720F' },
};

export const stages = [
  {
    name: 'First go',
    help: 'Lots of help',
    guide: 'always',          // coach shows on every parcel
    bins: ['blue'],
    parcels: ['blue', 'blue'],
    coach: 'Click the bin to send the parcel.',
  },
  {
    name: 'Two bins',
    help: 'Some help',
    guide: 'once',            // coach on the first parcel, then only after a mistake
    bins: ['blue', 'green'],
    parcels: ['green', 'blue', 'green', 'blue'],
    coach: 'Match the label colour to the bin.',
  },
  {
    name: 'Fragile items',
    help: 'A little help',
    guide: 'when-new',        // coach only when the new kind of parcel first appears
    bins: ['blue', 'green', 'fragile'],
    parcels: ['blue', 'fragile-green', 'green', 'fragile-blue'],
    coach: 'Fragile parcels go in the padded bin — whatever colour the label is.',
  },
  {
    name: 'On your own',
    help: 'No help',
    guide: 'none',
    bins: ['blue', 'green', 'fragile'],
    parcels: ['green', 'fragile-blue', 'blue', 'blue', 'fragile-green', 'green'],
    coach: '',
  },
];

export const results = {
  clean: {
    title: 'You learned it without a tutorial',
    summary: 'Three rules, picked up one at a time while doing the job — and the last round you did entirely on your own.',
  },
  some: {
    title: 'Sorted',
    summary: 'You picked the rules up as you went. The mistakes happened while the help was still there, which is exactly when they should.',
  },
};
