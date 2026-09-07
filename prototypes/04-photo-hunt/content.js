/* ============================================================
   Content for the photo hunt.

   Deliberately minimal: an empty warehouse and one hazard. The
   learner looks around, walks to a better position, and takes the
   photograph. `spot` is a world position in metres — the scene
   builder reads it, so moving a hazard here moves it in the 3D.
   ============================================================ */

export const meta = {
  eyebrow: 'Site walk — Bay 3 warehouse',
  title: 'Find the hazard and photograph it.',
  instructions: 'Drag to look around. Click the hazard to photograph it. Use the buttons to walk somewhere else.',
};

/** Shots available. Every photograph costs one, hit or miss. */
export const film = 3;

export const waypoints = [
  { id: 'entry',   label: 'Entrance',    pos: [0, 1.7, 8.5],   yaw: 0 },
  { id: 'aisle',   label: 'Main aisle',  pos: [-1.5, 1.7, 1.5], yaw: 0.15 },
  { id: 'far',     label: 'Far corner',  pos: [7, 1.7, -3],    yaw: -1.1 },
];

export const hazards = [
  {
    id: 'spill',
    label: 'Unmarked spill',
    why: 'Liquid across a walkway with no cone, no barrier and no one watching it. ' +
         'Slips are the most common injury on sites like this one, and the drum it came from is still lying there.',
    spot: [-2, 0.02, -2.5],
  },
];

export const results = {
  perfect: {
    title: 'Found it',
    summary: 'One walk, one look, one photograph. That is what an inspection round is.',
  },
  wasteful: {
    title: 'Found it — eventually',
    summary: 'You got the spill, but spent shots on empty floor first. Move to a better position before you photograph.',
  },
  missed: {
    title: 'The spill is still there',
    summary: 'You ran out of film without photographing the hazard. Walking to another position gives you a much closer look.',
  },
};
