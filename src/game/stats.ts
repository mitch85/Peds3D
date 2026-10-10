import { BALANCE } from './balance';
import type { PetConfig } from './pets.config';
import type { Stats } from './types';

export const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export function clampStats(s: Stats): Stats {
  return {
    hunger: clamp(s.hunger),
    energy: clamp(s.energy),
    fun: clamp(s.fun),
    hygiene: clamp(s.hygiene),
    bladder: clamp(s.bladder),
    health: clamp(s.health),
  };
}

export function initialStats(): Stats {
  return { hunger: 80, energy: 90, fun: 80, hygiene: 100, bladder: 10, health: 100 };
}

/** Applies a partial delta and clamps. */
export function applyDelta(stats: Stats, delta: Partial<Stats>): Stats {
  const next = { ...stats };
  for (const key of Object.keys(delta) as (keyof Stats)[]) {
    next[key] += delta[key] ?? 0;
  }
  return clampStats(next);
}

export interface DecayContext {
  asleep: boolean;
  /** Ice room decoration is active. */
  coldRoom: boolean;
  poops: number;
  offline: boolean;
}

/** Number of needs currently in the red zone (used for health damage and moods). */
export function criticalNeeds(stats: Stats, cfg: PetConfig): number {
  const crit = BALANCE.health.criticalBelow;
  let n = 0;
  if (stats.hunger < Math.max(crit, cfg.hungerTolerance)) n++;
  if (stats.energy < crit) n++;
  if (stats.fun < crit) n++;
  if (stats.hygiene < crit) n++;
  if (stats.bladder >= 95) n++;
  return n;
}

/** Pure stat decay over `dtSeconds`. Does not handle accidents or sleep transitions (see tick.ts). */
export function decayStats(stats: Stats, cfg: PetConfig, dtSeconds: number, ctx: DecayContext): Stats {
  const min = dtSeconds / 60;
  const f = ctx.offline ? BALANCE.offlineRateFactor : 1;
  const r = cfg.rates;
  const s = { ...stats };

  const tempFactor = ctx.coldRoom ? BALANCE.temperature[cfg.temperature] : 1;

  if (ctx.asleep) {
    s.hunger -= r.hunger * BALANCE.sleep.hungerFactor * min * f;
    s.energy += BALANCE.sleep.energyGain * min;
    s.hygiene -= r.hygiene * BALANCE.sleep.hygieneFactor * min * f;
    s.bladder += r.bladder * BALANCE.sleep.bladderFactor * min * f;
  } else {
    s.hunger -= r.hunger * min * f;
    s.energy -= r.energy * min * f;
    s.fun -= r.fun * tempFactor * min * f;
    s.hygiene -= r.hygiene * min * f;
    s.bladder += r.bladder * min * f;
  }

  if (ctx.poops > 0) {
    s.hygiene -= BALANCE.poop.hygienePerMinute * ctx.poops * min;
    s.fun -= BALANCE.poop.funPerMinute * ctx.poops * min;
  }

  // Penguins love the ice room: it slowly cheers them up.
  if (ctx.coldRoom && cfg.temperature === 'cold' && !ctx.asleep) {
    s.fun += 0.2 * min;
  }

  const crits = criticalNeeds(clampStats(s), cfg);
  if (crits > 0) {
    s.health -= BALANCE.health.damagePerCritical * crits * min * f;
  } else if (
    s.hunger > BALANCE.health.regenAbove &&
    s.energy > BALANCE.health.regenAbove &&
    s.fun > BALANCE.health.regenAbove &&
    s.hygiene > BALANCE.health.regenAbove
  ) {
    s.health += BALANCE.health.regen * min;
  }

  const out = clampStats(s);
  if (ctx.offline) {
    const floor = BALANCE.offlineStatFloor;
    // Only clamp stats that were above the floor before; never "heal" through the floor.
    out.hunger = Math.max(out.hunger, Math.min(stats.hunger, floor));
    out.energy = Math.max(out.energy, Math.min(stats.energy, floor));
    out.fun = Math.max(out.fun, Math.min(stats.fun, floor));
    out.hygiene = Math.max(out.hygiene, Math.min(stats.hygiene, floor));
    out.health = Math.max(out.health, Math.min(stats.health, BALANCE.offlineHealthFloor));
  }
  return out;
}

/** True when the pet is in a well-cared-for state (earns coins over time). */
export function isWellCared(stats: Stats, poops: number): boolean {
  const g = BALANCE.coins.goodAbove;
  return (
    poops === 0 &&
    stats.hunger >= g &&
    stats.energy >= g &&
    stats.fun >= g &&
    stats.hygiene >= g &&
    stats.health >= g &&
    stats.bladder < BALANCE.bladder.needsToiletAt
  );
}
