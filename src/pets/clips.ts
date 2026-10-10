import type { Locomotion } from '../game/pets.config';

/**
 * Logical animation clips. The placeholder rig evaluates them procedurally;
 * GLB models map them to real animation clips via `PetModelConfig.clips`.
 */
export type ClipName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'eat'
  | 'fidget'
  | 'squat'
  | 'sleep'
  | 'jump'
  | 'pounce'
  | 'nuzzle'
  | 'scrub'
  | 'shake'
  | 'sad'
  | 'sit'
  | 'happy'
  | 'refuse'
  | 'spin'
  | 'tumble'
  | 'hop';

export const CLIP_NAMES: ClipName[] = [
  'idle', 'walk', 'run', 'eat', 'fidget', 'squat', 'sleep', 'jump', 'pounce', 'nuzzle',
  'scrub', 'shake', 'sad', 'sit', 'happy', 'refuse', 'spin', 'tumble', 'hop',
];

/** Procedural pose. Every value is blended across active clips. */
export interface Pose {
  bodyY: number;
  bodyPitch: number;
  bodyRoll: number;
  bodyYaw: number;
  squash: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  earDroop: number;
  tailWag: number;
  tailWagSpeed: number;
  tailLift: number;
  legSwing: number;
  legSpeed: number;
  eyeOpen: number;
  mouthOpen: number;
  frontPaw: number;
  crouch: number;
  wingFlap: number;
}

export const REST_POSE: Pose = {
  bodyY: 0,
  bodyPitch: 0,
  bodyRoll: 0,
  bodyYaw: 0,
  squash: 0,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  earDroop: 0,
  tailWag: 0.12,
  tailWagSpeed: 3,
  tailLift: 0,
  legSwing: 0,
  legSpeed: 0,
  eyeOpen: 1,
  mouthOpen: 0,
  frontPaw: 0,
  crouch: 0,
  wingFlap: 0,
};

export const POSE_KEYS = Object.keys(REST_POSE) as (keyof Pose)[];

export interface ClipContext {
  locomotion: Locomotion;
}

type ClipFn = (t: number, ctx: ClipContext) => Partial<Pose>;

const s = Math.sin;
const abs = Math.abs;
const TAU = Math.PI * 2;
/** Fades a value in/out over `d` seconds at the start of a clip. */
const ease = (t: number, d: number) => Math.min(1, t / d);
/** Repeating jump arc 0..1..0 every `period` seconds. */
const arc = (t: number, period: number) => Math.max(0, s((Math.PI * (t % period)) / period));

function locomotion(t: number, ctx: ClipContext, fast: boolean): Partial<Pose> {
  switch (ctx.locomotion) {
    case 'hop':
      return {
        bodyY: arc(t, fast ? 0.32 : 0.42) * (fast ? 0.22 : 0.16),
        bodyPitch: -0.15 * s((t * TAU) / (fast ? 0.32 : 0.42)),
        legSwing: 0.35,
        legSpeed: fast ? 20 : 15,
        earDroop: 0.15,
        tailWag: 0.05,
      };
    case 'waddle':
      return {
        bodyRoll: (fast ? 0.28 : 0.2) * s(t * (fast ? 11 : 7)),
        bodyY: abs(s(t * (fast ? 11 : 7))) * 0.03,
        legSwing: fast ? 0.45 : 0.35,
        legSpeed: fast ? 11 : 7,
        frontPaw: 0.3,
        tailWag: 0.25,
        tailWagSpeed: fast ? 11 : 7,
      };
    default:
      return {
        bodyY: abs(s(t * (fast ? 15 : 9))) * (fast ? 0.06 : 0.025),
        bodyPitch: fast ? 0.08 : 0,
        legSwing: fast ? 0.9 : 0.55,
        legSpeed: fast ? 15 : 9,
        tailLift: fast ? 0.35 : 0.15,
        earDroop: fast ? 0.25 : 0,
        mouthOpen: fast ? 0.35 : 0,
      };
  }
}

export const CLIPS: Record<ClipName, ClipFn> = {
  idle: (t) => ({
    headYaw: 0.08 * s(t * 0.7),
    tailWag: 0.15,
  }),
  walk: (t, ctx) => locomotion(t, ctx, false),
  run: (t, ctx) => locomotion(t, ctx, true),
  eat: (t) => ({
    bodyPitch: 0.18,
    headPitch: 0.55 + 0.1 * s(t * 9),
    mouthOpen: 0.5 + 0.5 * s(t * 12),
    tailWag: 0.35,
    tailWagSpeed: 6,
    crouch: 0.15,
  }),
  fidget: (t) => ({
    bodyRoll: 0.12 * s(t * 14),
    bodyY: abs(s(t * 7)) * 0.04,
    headYaw: 0.45 * s(t * 2.5),
    legSwing: 0.2,
    legSpeed: 14,
    tailWag: 0.4,
    tailWagSpeed: 12,
    eyeOpen: 1.15,
  }),
  squat: (t) => ({
    crouch: 0.75 * ease(t, 0.4),
    bodyPitch: -0.3 * ease(t, 0.4),
    tailLift: 0.7,
    tailWag: 0,
    eyeOpen: 0.35,
    headPitch: -0.1,
    squash: 0.02 * s(t * 6),
  }),
  sleep: (t) => ({
    crouch: 1,
    bodyY: -0.04,
    squash: 0.025 * s(t * 1.6),
    eyeOpen: 0,
    headPitch: 0.3,
    headRoll: 0.25,
    earDroop: 0.7,
    tailWag: 0,
    tailLift: -0.3,
  }),
  jump: (t) => {
    const p = t % 0.9;
    const prep = p < 0.2 ? s((p / 0.2) * Math.PI) : 0;
    return {
      bodyY: p >= 0.2 ? s(((p - 0.2) / 0.7) * Math.PI) * 0.55 : 0,
      squash: -0.15 * prep + (p >= 0.2 ? 0.08 : 0),
      crouch: 0.4 * prep,
      frontPaw: p >= 0.2 ? 0.8 : 0,
      mouthOpen: 0.5,
      tailLift: 0.4,
      tailWag: 0.5,
      tailWagSpeed: 10,
      wingFlap: 1,
      bodyPitch: p >= 0.2 ? -0.25 : 0,
    };
  },
  pounce: (t) => {
    const p = t % 1.1;
    const crouching = p < 0.45;
    return {
      crouch: crouching ? 0.6 : 0,
      bodyPitch: crouching ? 0.15 : -0.35 * s(((p - 0.45) / 0.65) * Math.PI),
      bodyY: crouching ? 0 : s(((p - 0.45) / 0.65) * Math.PI) * 0.35,
      tailWag: crouching ? 0.5 : 0.1,
      tailWagSpeed: 18,
      frontPaw: crouching ? 0 : 1,
      eyeOpen: 1.2,
      mouthOpen: crouching ? 0 : 0.4,
    };
  },
  nuzzle: (t) => ({
    headRoll: 0.35 * s(t * 2.5),
    headPitch: -0.25,
    bodyRoll: 0.08 * s(t * 2.5),
    eyeOpen: 0.08,
    tailWag: 0.6,
    tailWagSpeed: 8,
    earDroop: 0.35,
    squash: 0.02 * s(t * 5),
    mouthOpen: 0.2,
  }),
  scrub: (t) => ({
    bodyRoll: 0.12 * s(t * 8),
    squash: 0.04 * s(t * 16),
    eyeOpen: 0.15,
    frontPaw: 0.4 * abs(s(t * 6)),
    headYaw: 0.25 * s(t * 4),
    earDroop: 0.5,
    tailWag: 0,
    crouch: 0.2,
  }),
  shake: (t) => {
    const env = Math.max(0, 1 - t / 1.2);
    return {
      bodyRoll: 0.45 * s(t * 32) * env,
      headRoll: 0.55 * s(t * 32 + 0.6) * env,
      headYaw: 0.3 * s(t * 32 + 1.2) * env,
      earDroop: 0.5 + 0.5 * s(t * 32),
      eyeOpen: 0.1,
      squash: -0.05,
      wingFlap: 1,
    };
  },
  sad: (t) => ({
    headPitch: 0.4,
    earDroop: 1,
    tailLift: -0.45,
    tailWag: 0,
    bodyY: -0.03,
    eyeOpen: 0.55,
    crouch: 0.15,
    headYaw: 0.1 * s(t * 0.4),
  }),
  sit: (t) => ({
    crouch: 0.45,
    bodyPitch: -0.35,
    headPitch: -0.2,
    tailWag: 0.25,
    headYaw: 0.25 * s(t * 0.5),
  }),
  happy: (t) => ({
    bodyY: abs(s(t * 8)) * 0.12,
    squash: 0.05 * s(t * 16),
    mouthOpen: 0.6,
    tailWag: 0.7,
    tailWagSpeed: 14,
    eyeOpen: 0.25,
    frontPaw: 0.3,
    wingFlap: 1,
  }),
  refuse: (t) => ({
    headYaw: 0.5 * s(t * 12) * Math.max(0, 1 - t / 1.2),
    headPitch: -0.1,
    eyeOpen: 0.5,
    tailWag: 0,
    bodyPitch: -0.08,
  }),
  spin: (t) => ({
    bodyYaw: t < 0.9 ? (t / 0.9) * TAU : 0,
    bodyY: t < 0.9 ? s((t / 0.9) * Math.PI) * 0.3 : 0,
    mouthOpen: 0.5,
    tailWag: 0.6,
    wingFlap: 1,
  }),
  tumble: (t) => {
    const fall = t < 0.35 ? t / 0.35 : t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.5);
    return {
      bodyRoll: 1.1 * fall,
      crouch: 0.4 * fall,
      eyeOpen: 1.2,
      mouthOpen: 0.4 * fall,
      earDroop: 0.6 * fall,
      legSwing: 0.4 * fall,
      legSpeed: 8,
    };
  },
  hop: (t) => ({
    bodyY: arc(t, 0.5) * 0.3,
    squash: 0.06 * s((t * TAU) / 0.5),
    frontPaw: 0.5,
    mouthOpen: 0.4,
    tailWag: 0.6,
    tailWagSpeed: 12,
  }),
};

/** Blends clip poses by weight. Weights do not need to sum to 1. */
export function blendPose(
  weights: Map<ClipName, number>,
  times: Map<ClipName, number>,
  ctx: ClipContext,
  out: Pose,
): Pose {
  let total = 0;
  for (const k of POSE_KEYS) out[k] = 0;
  weights.forEach((w, clip) => {
    if (w <= 0.001) return;
    const p = CLIPS[clip](times.get(clip) ?? 0, ctx);
    total += w;
    for (const k of POSE_KEYS) out[k] += w * (p[k] ?? REST_POSE[k]);
  });
  if (total <= 0) {
    Object.assign(out, REST_POSE);
    return out;
  }
  for (const k of POSE_KEYS) out[k] /= total;
  return out;
}
