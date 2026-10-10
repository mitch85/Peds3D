/**
 * Procedural sound effects via WebAudio. No audio files needed, works offline and
 * stays tiny. Every sound accepts a pitch factor so each species gets its own "voice".
 */

export type SfxName =
  | 'tap'
  | 'chomp'
  | 'yum'
  | 'boing'
  | 'whoosh'
  | 'zap'
  | 'bubble'
  | 'shake'
  | 'snore'
  | 'relief'
  | 'oops'
  | 'heart'
  | 'coin'
  | 'sparkle'
  | 'fanfare'
  | 'refuse'
  | 'pop';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = true;
const lastPlayed = new Map<SfxName, number>();
const MIN_GAP = 0.04;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/** Must be called from a user gesture once (browsers block audio before that). */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

interface ToneOpts {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone(o: ToneOpts) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.015, o.dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

interface NoiseOpts {
  dur: number;
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  gain?: number;
  delay?: number;
}

function noise(o: NoiseOpts) {
  if (!ctx || !master || !noiseBuffer) return;
  const t0 = ctx.currentTime + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.frequency.setValueAtTime(o.freq, t0);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  const g = ctx.createGain();
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + o.dur + 0.02);
}

const SOUNDS: Record<SfxName, (p: number) => void> = {
  tap: (p) => tone({ freq: 660 * p, to: 880 * p, dur: 0.06, gain: 0.08 }),
  pop: (p) => tone({ freq: 220 * p, to: 640 * p, dur: 0.08, gain: 0.15 }),
  chomp: (p) => {
    noise({ dur: 0.07, filter: 'lowpass', freq: 900, gain: 0.25 });
    tone({ freq: 170 * p, to: 120 * p, dur: 0.06, type: 'square', gain: 0.04 });
  },
  yum: (p) => {
    tone({ freq: 520 * p, dur: 0.12, type: 'triangle', gain: 0.18 });
    tone({ freq: 780 * p, dur: 0.18, type: 'triangle', gain: 0.18, delay: 0.11 });
  },
  boing: (p) => tone({ freq: 260 * p, to: 720 * p, dur: 0.2, type: 'triangle', gain: 0.2 }),
  whoosh: () => noise({ dur: 0.35, filter: 'bandpass', freq: 400, to: 2400, gain: 0.25 }),
  zap: () => tone({ freq: 1400, to: 2600, dur: 0.09, type: 'square', gain: 0.05 }),
  bubble: () => tone({ freq: 350 + Math.random() * 300, to: 1100 + Math.random() * 600, dur: 0.06, gain: 0.08 }),
  shake: () => {
    for (let i = 0; i < 6; i++) noise({ dur: 0.06, filter: 'highpass', freq: 2500, gain: 0.12, delay: i * 0.09 });
  },
  snore: (p) => tone({ freq: 120 * p, to: 85 * p, dur: 0.7, type: 'sine', gain: 0.12 }),
  relief: (p) => tone({ freq: 760 * p, to: 380 * p, dur: 0.45, type: 'sine', gain: 0.15 }),
  oops: (p) => {
    tone({ freq: 520 * p, to: 260 * p, dur: 0.3, type: 'triangle', gain: 0.18 });
    tone({ freq: 300 * p, to: 200 * p, dur: 0.3, type: 'triangle', gain: 0.15, delay: 0.28 });
  },
  heart: (p) => {
    tone({ freq: 880 * p, dur: 0.14, gain: 0.07 });
    tone({ freq: 1320 * p, dur: 0.18, gain: 0.05, delay: 0.06 });
  },
  coin: () => {
    tone({ freq: 988, dur: 0.08, type: 'square', gain: 0.06 });
    tone({ freq: 1319, dur: 0.3, type: 'square', gain: 0.06, delay: 0.08 });
  },
  sparkle: () => {
    [1500, 2000, 1750, 2400].forEach((f, i) => tone({ freq: f, dur: 0.1, gain: 0.07, delay: i * 0.06 }));
  },
  fanfare: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: i === 3 ? 0.5 : 0.14, type: 'triangle', gain: 0.18, delay: i * 0.13 }));
  },
  refuse: (p) => {
    tone({ freq: 240 * p, dur: 0.1, type: 'square', gain: 0.06 });
    tone({ freq: 200 * p, dur: 0.14, type: 'square', gain: 0.06, delay: 0.13 });
  },
};

/** Plays a sound effect. Silently does nothing before unlock, when muted or outside the browser. */
export function sfx(name: SfxName, pitch = 1) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (lastPlayed.get(name) ?? -1) < MIN_GAP) return;
  lastPlayed.set(name, now);
  SOUNDS[name](pitch);
}
