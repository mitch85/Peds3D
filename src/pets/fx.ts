export type FxKind = 'heart' | 'zzz' | 'bubble' | 'spark' | 'drop' | 'star' | 'crumb' | 'confetti' | 'stink';

export interface FxRequest {
  kind: FxKind;
  x: number;
  y: number;
  z: number;
  count: number;
}

type Listener = (req: FxRequest) => void;
const listeners = new Set<Listener>();

/** Particle effect bus. Behaviours emit, `<ParticleSystem />` renders. */
export const fx = {
  emit(kind: FxKind, x: number, y: number, z: number, count = 1) {
    const req = { kind, x, y, z, count };
    listeners.forEach((l) => l(req));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
