import { BALANCE } from './balance';
import { PETS } from './pets.config';
import { stageForAge } from './progression';
import { decayStats, isWellCared } from './stats';
import type { GameEvent, GameState, Poop, Vec2 } from './types';

export interface TickOptions {
  /** True when catching up time while the app was closed. */
  offline?: boolean;
  /** Where an accident happens (the pet's current position). */
  poopPosition?: () => Vec2;
  random?: () => number;
}

export interface TickResult {
  state: GameState;
  events: GameEvent[];
}

let poopCounter = 0;
export const newPoopId = (now: number) => `poop-${now.toString(36)}-${(poopCounter++).toString(36)}`;

function randomRoomPosition(random: () => number): Vec2 {
  return { x: (random() - 0.5) * 4, z: (random() - 0.5) * 3 };
}

/**
 * Advances the simulation from `state.lastTick` to `now`.
 * Integrates in fixed steps so long offline periods behave like many short ticks.
 */
export function simulate(state: GameState, now: number, opts: TickOptions = {}): TickResult {
  const events: GameEvent[] = [];
  if (!state.pet) return { state: { ...state, lastTick: now }, events };

  const random = opts.random ?? Math.random;
  let elapsed = Math.max(0, now - state.lastTick);
  if (opts.offline) elapsed = Math.min(elapsed, BALANCE.maxOfflineMs);

  const cfg = PETS[state.pet.species];
  const coldRoom = state.equipped.decor.includes('iceRoom');
  const stageBefore = stageForAge(state.lastTick - state.pet.bornAt);

  const pet = { ...state.pet, stats: { ...state.pet.stats }, poops: [...state.pet.poops] };
  let coins = state.coins;
  let diary = state.diary;
  const step = BALANCE.tickStepSeconds;
  let remaining = elapsed / 1000;
  let simTime = now - elapsed;

  while (remaining > 1e-6) {
    const dt = Math.min(step, remaining);
    remaining -= dt;
    simTime += dt * 1000;

    pet.stats = decayStats(pet.stats, cfg, dt, {
      asleep: pet.asleep,
      coldRoom,
      poops: pet.poops.length,
      offline: !!opts.offline,
    });

    // Sleep transitions
    if (pet.asleep && pet.stats.energy >= 100) {
      pet.asleep = false;
      events.push({ type: 'wake' });
    } else if (!pet.asleep && pet.stats.energy <= BALANCE.sleep.autoSleepBelow) {
      pet.asleep = true;
      events.push({ type: 'sleep' });
    }

    // Accident: waited too long with the toilet
    if (pet.stats.bladder >= BALANCE.bladder.accidentAt) {
      pet.stats.bladder = BALANCE.bladder.afterAccident;
      pet.stats.hygiene = Math.max(0, pet.stats.hygiene - BALANCE.bladder.accidentHygienePenalty);
      if (pet.poops.length < BALANCE.poop.max) {
        const pos = opts.offline || !opts.poopPosition ? randomRoomPosition(random) : opts.poopPosition();
        const poop: Poop = { id: newPoopId(simTime), x: pos.x, z: pos.z, createdAt: simTime };
        pet.poops.push(poop);
        if (!opts.offline) events.push({ type: 'accident', poop });
      }
      diary = { ...diary, accidents: diary.accidents + 1 };
    }

    // Coins for good care (only while playing, not offline)
    if (!opts.offline && isWellCared(pet.stats, pet.poops.length)) {
      pet.careSeconds += dt;
      if (pet.careSeconds >= BALANCE.coins.careIntervalSeconds) {
        pet.careSeconds -= BALANCE.coins.careIntervalSeconds;
        coins += BALANCE.coins.carePerInterval;
        diary = { ...diary, coinsEarned: diary.coinsEarned + BALANCE.coins.carePerInterval };
        events.push({ type: 'coins', amount: BALANCE.coins.carePerInterval });
      }
    }
  }

  const stageAfter = stageForAge(now - pet.bornAt);
  if (stageAfter !== stageBefore) events.push({ type: 'stageUp', stage: stageAfter });

  // Collapse noisy sleep/wake flip-flops into the final transition only.
  const finalEvents = collapseSleepEvents(events, state.pet.asleep, pet.asleep);

  return { state: { ...state, pet, coins, diary, lastTick: now }, events: finalEvents };
}

function collapseSleepEvents(events: GameEvent[], before: boolean, after: boolean): GameEvent[] {
  const rest = events.filter((e) => e.type !== 'sleep' && e.type !== 'wake');
  if (before === after) return rest;
  return [...rest, { type: after ? 'sleep' : 'wake' }];
}
