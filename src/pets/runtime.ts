import type { PetBrain } from './PetBrain';

/** Shared handles between scene parts that must not trigger React renders. */
export const runtime = {
  brain: null as PetBrain | null,
  /** OrbitControls instance; disabled while the player strokes the pet. */
  controls: null as { enabled: boolean } | null,
  /** Set by double tap; camera eases towards the pet while true. */
  focusPet: false,
};
