import type { PetConfig } from '../game/pets.config';
import type { LifeStage, Mood, Vec2 } from '../game/types';
import { MOOD_EMOJI } from '../game/mood';
import { clampToRoom, SPOTS } from '../scene/layout';
import type { Emote } from '../store/uiStore';
import { blendPose, REST_POSE, type ClipName, type Pose } from './clips';

type Target = Vec2 | (() => Vec2);

/** One step of a behaviour: play a clip, optionally while walking somewhere. */
export interface Step {
  clip: ClipName | (() => ClipName);
  /** Seconds. Walk steps end on arrival, other steps without duration run until `until()` is true. */
  duration?: number;
  /** Walk to a point; the step ends on arrival. */
  walkTo?: Target;
  /** Follow a moving point without ending on arrival (laser pointer). */
  chase?: () => Vec2;
  run?: boolean;
  face?: Target | 'camera';
  emote?: Emote | null;
  onStart?(): void;
  onUpdate?(t: number, dt: number): void;
  until?(): boolean;
}

export interface Behavior {
  name: string;
  steps: Step[];
  /** Busy behaviours block the action buttons. */
  busy: boolean;
  /** Runs every frame while the behaviour is active (prop physics etc). */
  onUpdate?(dt: number): void;
  /** Always called when the behaviour ends or is interrupted. */
  cleanup?(): void;
}

export interface BrainWorld {
  mood: Mood;
  happiness: number;
  asleep: boolean;
  stage: LifeStage;
  scale: number;
}

const FADE_RATE = 7; // ~0.3 s crossfade
const TURN_RATE = 7;
const NEED_MOODS: Mood[] = ['hungry', 'tired', 'bored', 'dirty', 'sick', 'needsToilet'];

const dampFactor = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

function angleDiff(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const resolve = (t: Target): Vec2 => (typeof t === 'function' ? t() : t);

/**
 * Pet behaviour + animation state machine. Framework independent: the `<Pet />` component
 * calls `update(dt)` every frame and applies `pos`, `yaw` and `pose` to the model.
 */
export class PetBrain {
  pos: Vec2 = { x: 0, z: 0.4 };
  yaw = 0;
  targetYaw = 0;
  clock = 0;
  pose: Pose = { ...REST_POSE };
  activeClip: ClipName = 'idle';
  readonly weights = new Map<ClipName, number>([['idle', 1]]);
  readonly times = new Map<ClipName, number>([['idle', 0]]);

  world: BrainWorld = { mood: 'content', happiness: 0.7, asleep: false, stage: 'baby', scale: 0.65 };

  behavior: Behavior | null = null;
  private stepIndex = 0;
  private stepTime = 0;
  private stepStarted = false;

  private nextIdleAt = 2;
  private lookYaw = 0;
  private lookTarget = 0;
  private blinkTimer = 2;
  private blink = 1;
  private transientEmote: { emote: Emote; until: number } | null = null;
  private strokeUntil = 0;
  /** Random source (replaceable for tests). */
  random = Math.random;

  constructor(public cfg: PetConfig) {}

  get busy() {
    return !!this.behavior?.busy;
  }

  /** Approximate world position of the head (for particles and props). */
  headPosition(height = 0.95): { x: number; y: number; z: number } {
    const s = this.world.scale;
    const fwd = this.cfg.look.legs === 2 ? 0.05 : 0.3;
    return {
      x: this.pos.x + Math.sin(this.yaw) * fwd * s,
      y: (this.cfg.look.legs === 2 ? 1.15 : height) * s + this.pose.bodyY,
      z: this.pos.z + Math.cos(this.yaw) * fwd * s,
    };
  }

  /** Point in front of the pet at a given distance. */
  inFront(dist: number): Vec2 {
    return { x: this.pos.x + Math.sin(this.yaw) * dist, z: this.pos.z + Math.cos(this.yaw) * dist };
  }

  run(behavior: Behavior) {
    this.stop();
    this.behavior = behavior;
    this.stepIndex = 0;
    this.stepTime = 0;
    this.stepStarted = false;
  }

  stop() {
    if (this.behavior) {
      const b = this.behavior;
      this.behavior = null;
      b.cleanup?.();
    }
  }

  showEmote(emote: Emote, seconds = 2.5) {
    this.transientEmote = { emote, until: this.clock + seconds };
  }

  /** Keeps the nuzzle going while the player strokes. */
  extendStroke(seconds = 1.2) {
    this.strokeUntil = this.clock + seconds;
  }

  get stroking() {
    return this.clock < this.strokeUntil;
  }

  update(dt: number) {
    this.clock += dt;
    this.updateBehavior(dt);
    this.updateIdle(dt);

    // Smooth turning
    this.yaw += angleDiff(this.yaw, this.targetYaw) * dampFactor(TURN_RATE, dt);

    this.updateWeights(dt);
    this.updatePose(dt);
  }

  // ---------------------------------------------------------------- behaviours

  private currentStep(): Step | null {
    return this.behavior?.steps[this.stepIndex] ?? null;
  }

  private updateBehavior(dt: number) {
    const b = this.behavior;
    if (!b) return;
    b.onUpdate?.(dt);
    // onUpdate may have replaced/stopped the behaviour
    if (this.behavior !== b) return;

    const step = this.currentStep();
    if (!step) {
      this.finishBehavior();
      return;
    }
    if (!this.stepStarted) {
      this.stepStarted = true;
      this.stepTime = 0;
      step.onStart?.();
    }
    this.stepTime += dt;

    let done = false;
    if (step.walkTo) {
      done = this.moveTowards(resolve(step.walkTo), dt, step.run ?? false, 0.06);
    } else if (step.chase) {
      this.moveTowards(step.chase(), dt, true, 0.35);
    }
    if (step.face && !(step.walkTo && !done)) {
      this.faceTowards(step.face === 'camera' ? { x: this.pos.x * 0.6, z: 6 } : resolve(step.face));
    }
    step.onUpdate?.(this.stepTime, dt);
    if (this.behavior !== b) return;

    if (step.duration !== undefined && this.stepTime >= step.duration) done = true;
    if (step.until?.()) done = true;
    if (!step.walkTo && step.duration === undefined && !step.until) done = true;

    if (done) {
      this.stepIndex++;
      this.stepStarted = false;
      if (this.stepIndex >= b.steps.length) this.finishBehavior();
    }
  }

  private finishBehavior() {
    this.stop();
    this.nextIdleAt = this.clock + 1.5 + this.random() * 2.5;
  }

  /** Returns true when arrived. */
  private moveTowards(target: Vec2, dt: number, run: boolean, arriveDist: number): boolean {
    const t = clampToRoom(target);
    const dx = t.x - this.pos.x;
    const dz = t.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < arriveDist) return true;
    this.targetYaw = Math.atan2(dx, dz);
    const align = Math.max(0, Math.cos(angleDiff(this.yaw, this.targetYaw)));
    const moodFactor = NEED_MOODS.includes(this.world.mood) ? 0.65 : 1;
    const stageFactor = this.world.stage === 'baby' ? 0.8 : 1;
    const speed = this.cfg.speed * (run ? 1.9 : 1) * moodFactor * stageFactor;
    const step = Math.min(dist, speed * dt * align * align);
    this.pos.x += (dx / dist) * step;
    this.pos.z += (dz / dist) * step;
    return dist - step < arriveDist;
  }

  private faceTowards(p: Vec2) {
    const dx = p.x - this.pos.x;
    const dz = p.z - this.pos.z;
    if (Math.hypot(dx, dz) > 0.01) this.targetYaw = Math.atan2(dx, dz);
  }

  /** Whether the current step is a moving step (walk clip should play). */
  private isWalking(step: Step | null) {
    if (!step?.walkTo) return false;
    const t = clampToRoom(resolve(step.walkTo));
    return Math.hypot(t.x - this.pos.x, t.z - this.pos.z) > 0.06;
  }

  // ---------------------------------------------------------------- idle AI

  private updateIdle(dt: number) {
    // Random look-around and blinking run all the time
    if (this.random() < dt * 0.4) this.lookTarget = (this.random() - 0.5) * 1.3;
    this.lookYaw += (this.lookTarget - this.lookYaw) * dampFactor(3, dt);

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2 + this.random() * 3.5;
    }
    this.blink = this.blinkTimer < 0.14 ? Math.abs(this.blinkTimer - 0.07) / 0.07 : 1;

    if (this.behavior || this.world.asleep) return;
    if (this.clock < this.nextIdleAt) {
      if (!this.stroking) this.faceTowards({ x: this.pos.x * 0.5, z: 6 });
      return;
    }
    this.nextIdleAt = this.clock + 3 + this.random() * 4;
    this.pickIdleBehavior();
  }

  private pickIdleBehavior() {
    const { mood, stage, happiness } = this.world;
    const sad = NEED_MOODS.includes(mood);
    const r = this.random();
    const wander = (dist: number) => {
      const target = clampToRoom({
        x: this.pos.x + (this.random() - 0.5) * dist,
        z: this.pos.z + (this.random() - 0.5) * dist * 0.7,
      });
      // Drift back towards the middle so the pet stays in view
      target.x *= 0.85;
      target.z = target.z * 0.8 + 0.1;
      return target;
    };

    if (mood === 'needsToilet') {
      this.run({ name: 'fidget', busy: false, steps: [{ clip: 'fidget', duration: 2, face: 'camera' }] });
      return;
    }
    if (sad) {
      if (r < 0.4) {
        this.run({ name: 'mope', busy: false, steps: [{ clip: 'walk', walkTo: wander(1.6) }, { clip: 'sad', duration: 3, face: 'camera' }] });
      }
      return;
    }
    if (r < 0.35) {
      this.run({ name: 'wander', busy: false, steps: [{ clip: 'walk', walkTo: wander(2.6) }] });
    } else if (r < 0.5) {
      this.run({ name: 'sit', busy: false, steps: [{ clip: 'sit', duration: 3 + this.random() * 3, face: 'camera' }] });
    } else if (r < 0.62 && stage === 'baby') {
      this.run({
        name: 'tumble',
        busy: false,
        steps: [{ clip: 'walk', walkTo: wander(1) }, { clip: 'tumble', duration: 2, onStart: () => this.showEmote({ icon: '😵‍💫', kind: 'speech' }, 1.5) }],
      });
    } else if (r < 0.62 && stage === 'child') {
      this.run({ name: 'hop', busy: false, steps: [{ clip: 'hop', duration: 1.5, face: 'camera' }] });
    } else if (r < 0.62 && stage === 'adult') {
      this.run({ name: 'trick', busy: false, steps: [{ clip: 'spin', duration: 1.3 }, { clip: 'happy', duration: 0.6, face: 'camera' }] });
    } else if (r < 0.75 && happiness > 0.7) {
      this.run({ name: 'joy', busy: false, steps: [{ clip: 'happy', duration: 1.2, face: 'camera', onStart: () => this.onJoy() }] });
    } else if (r < 0.82) {
      const center = SPOTS.center.stand;
      this.run({ name: 'home', busy: false, steps: [{ clip: 'walk', walkTo: center }] });
    }
  }

  /** Hook for species specific joy effects (set by behaviours module). */
  onJoy: () => void = () => {};

  // ---------------------------------------------------------------- animation

  private chooseClip(): ClipName {
    const step = this.currentStep();
    if (step) {
      if (step.walkTo) return this.isWalking(step) ? (step.run ? 'run' : 'walk') : resolveClip(step.clip);
      return resolveClip(step.clip);
    }
    if (this.world.asleep) return 'sleep';
    if (this.stroking) return 'nuzzle';
    switch (this.world.mood) {
      case 'needsToilet':
        return 'fidget';
      case 'sick':
      case 'hungry':
      case 'tired':
      case 'bored':
      case 'dirty':
        return 'sad';
      default:
        return 'idle';
    }
  }

  private updateWeights(dt: number) {
    const clip = this.chooseClip();
    if (clip !== this.activeClip) {
      if ((this.weights.get(clip) ?? 0) < 0.3) this.times.set(clip, 0);
      this.activeClip = clip;
    }
    if (!this.weights.has(clip)) this.weights.set(clip, 0);
    const k = dampFactor(FADE_RATE, dt);
    this.weights.forEach((w, c) => {
      const target = c === clip ? 1 : 0;
      const nw = w + (target - w) * k;
      if (target === 0 && nw < 0.002) {
        this.weights.delete(c);
        this.times.delete(c);
      } else {
        this.weights.set(c, nw);
        this.times.set(c, (this.times.get(c) ?? 0) + dt);
      }
    });
  }

  private updatePose(_dt: number) {
    const p = blendPose(this.weights, this.times, { locomotion: this.cfg.locomotion }, this.pose);
    const { happiness, asleep } = this.world;

    // Breathing
    p.squash += asleep ? 0 : 0.012 * Math.sin(this.clock * 3);

    // Look around while standing
    const idleish = this.activeClip === 'idle' || this.activeClip === 'sit' || this.activeClip === 'sad';
    if (idleish && !this.stroking) p.headYaw += this.lookYaw * (this.activeClip === 'sad' ? 0.3 : 0.6);

    // Blink (closed eyes stay closed)
    p.eyeOpen = Math.min(p.eyeOpen, p.eyeOpen * this.blink);

    // Mood layer: unhappy pets droop their ears, happy dogs wag harder
    p.earDroop = Math.max(p.earDroop, (1 - happiness) * 0.55);
    if (this.cfg.look.tail === 'wag') p.tailWag *= 0.6 + happiness * 1.6;
  }

  // ---------------------------------------------------------------- emotes

  /** Emote bubble to show right now (step > transient > need). */
  currentEmote(): Emote | null {
    const step = this.currentStep();
    if (step?.emote !== undefined && step.emote !== null) return step.emote;
    if (this.transientEmote && this.clock < this.transientEmote.until) return this.transientEmote.emote;
    const mood = this.world.mood;
    if (mood === 'sleeping') return null;
    if (mood === 'needsToilet' || mood === 'sick') return { icon: MOOD_EMOJI[mood], kind: 'thought' };
    if (NEED_MOODS.includes(mood) && this.clock % 9 < 3.5) return { icon: MOOD_EMOJI[mood], kind: 'thought' };
    return null;
  }
}

function resolveClip(c: ClipName | (() => ClipName)): ClipName {
  return typeof c === 'function' ? c() : c;
}
