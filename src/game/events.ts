import type { GameEvent } from './types';

type Listener = (event: GameEvent) => void;

/** Tiny pub/sub so the 3D scene and UI can react to game logic events. */
const listeners = new Set<Listener>();

export const gameEvents = {
  emit(event: GameEvent) {
    listeners.forEach((l) => l(event));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
