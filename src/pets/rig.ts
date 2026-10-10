import type { PetBrain } from './PetBrain';

/** Imperative handle every pet model implements; called once per frame by `<Pet />`. */
export interface RigHandle {
  apply(brain: PetBrain, dt: number): void;
}
