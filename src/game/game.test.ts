import { describe, expect, it } from 'vitest';
import { adopt, buy, cleanPoop, feed, play, stroke, toggleSleep, toilet, wash, initialGameState, equipAccessory } from './actions';
import { BALANCE } from './balance';
import { getMood } from './mood';
import { PETS } from './pets.config';
import { currentStreak, dayKey, emptyDiary, favoriteActivity, recordCare, stageForAge } from './progression';
import { decayStats, initialStats, isWellCared } from './stats';
import { simulate } from './tick';
import type { GameState, Stats } from './types';

const T0 = new Date(2026, 0, 10, 12, 0, 0).getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;

function game(stats: Partial<Stats> = {}, species: 'cat' | 'dog' | 'rabbit' | 'dragon' | 'penguin' = 'cat'): GameState {
  const g = adopt(species, 'Mimi', T0);
  return { ...g, pet: { ...g.pet!, stats: { ...g.pet!.stats, ...stats } } };
}

describe('decayStats', () => {
  const cat = PETS.cat;
  const ctx = { asleep: false, coldRoom: false, poops: 0, offline: false };

  it('drops needs over time according to species rates', () => {
    const s = decayStats(initialStats(), cat, 60, ctx);
    expect(s.hunger).toBeCloseTo(80 - cat.rates.hunger);
    expect(s.fun).toBeCloseTo(80 - cat.rates.fun);
    expect(s.bladder).toBeCloseTo(10 + cat.rates.bladder);
  });

  it('restores energy while asleep and does not reduce fun', () => {
    const s = decayStats({ ...initialStats(), energy: 20 }, cat, 600, { ...ctx, asleep: true });
    expect(s.energy).toBeCloseTo(20 + BALANCE.sleep.energyGain * 10);
    expect(s.fun).toBe(80);
  });

  it('clamps all stats to 0..100', () => {
    const s = decayStats(initialStats(), cat, 60 * 60 * 24, ctx);
    for (const v of Object.values(s)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('damages health when needs are critical and regenerates when all is well', () => {
    const bad = decayStats({ ...initialStats(), hunger: 5, health: 80 }, cat, 60, ctx);
    expect(bad.health).toBeLessThan(80);
    const good = decayStats({ ...initialStats(), health: 60 }, cat, 60, ctx);
    expect(good.health).toBeGreaterThan(60);
  });

  it('rabbits are less tolerant to hunger', () => {
    const stats = { ...initialStats(), hunger: 25, health: 80 };
    expect(decayStats(stats, PETS.rabbit, 60, ctx).health).toBeLessThan(80);
    expect(decayStats(stats, PETS.cat, 60, ctx).health).toBeGreaterThanOrEqual(80);
  });

  it('cats get bored faster than rabbits', () => {
    expect(PETS.cat.rates.fun).toBeGreaterThan(PETS.rabbit.rates.fun);
  });

  it('penguins like the ice room, dragons do not', () => {
    const base = initialStats();
    const pIce = decayStats(base, PETS.penguin, 600, { ...ctx, coldRoom: true });
    const pNormal = decayStats(base, PETS.penguin, 600, ctx);
    expect(pIce.fun).toBeGreaterThan(pNormal.fun);
    const dIce = decayStats(base, PETS.dragon, 600, { ...ctx, coldRoom: true });
    const dNormal = decayStats(base, PETS.dragon, 600, ctx);
    expect(dIce.fun).toBeLessThan(dNormal.fun);
  });

  it('poops reduce hygiene', () => {
    const clean = decayStats(initialStats(), cat, 600, ctx);
    const dirty = decayStats(initialStats(), cat, 600, { ...ctx, poops: 2 });
    expect(dirty.hygiene).toBeLessThan(clean.hygiene);
  });
});

describe('simulate', () => {
  it('advances lastTick and decays stats', () => {
    const g = game();
    const { state } = simulate(g, T0 + 10 * MIN);
    expect(state.lastTick).toBe(T0 + 10 * MIN);
    expect(state.pet!.stats.hunger).toBeLessThan(g.pet!.stats.hunger);
  });

  it('caps offline time so the pet is not sick after a holiday', () => {
    const g = game();
    const { state } = simulate(g, T0 + 14 * 24 * HOUR, { offline: true });
    const s = state.pet!.stats;
    expect(s.health).toBeGreaterThanOrEqual(BALANCE.offlineHealthFloor);
    expect(s.hunger).toBeGreaterThanOrEqual(BALANCE.offlineStatFloor);
    expect(getMood(state.pet!, PETS.cat)).not.toBe('sick');
    // 2 weeks and 8 hours offline must produce the same result
    const capped = simulate(g, T0 + BALANCE.maxOfflineMs, { offline: true }).state;
    expect(capped.pet!.stats).toEqual(s);
  });

  it('offline time decays slower than online time', () => {
    const g = game();
    const online = simulate(g, T0 + HOUR).state.pet!.stats.hunger;
    const offline = simulate(g, T0 + HOUR, { offline: true }).state.pet!.stats.hunger;
    expect(offline).toBeGreaterThan(online);
  });

  it('creates an accident when the bladder overflows', () => {
    const g = game({ bladder: 99.9, hygiene: 80 });
    const { state, events } = simulate(g, T0 + MIN, { poopPosition: () => ({ x: 1, z: 2 }) });
    expect(state.pet!.poops).toHaveLength(1);
    expect(state.pet!.poops[0]).toMatchObject({ x: 1, z: 2 });
    expect(state.pet!.stats.bladder).toBeLessThan(50);
    expect(state.pet!.stats.hygiene).toBeLessThan(80);
    expect(events.some((e) => e.type === 'accident')).toBe(true);
    expect(state.diary.accidents).toBe(1);
  });

  it('wakes up when fully rested and falls asleep when exhausted', () => {
    const sleeping = game({ energy: 99 });
    sleeping.pet!.asleep = true;
    const woke = simulate(sleeping, T0 + 5 * MIN);
    expect(woke.state.pet!.asleep).toBe(false);
    expect(woke.events).toContainEqual({ type: 'wake' });

    const tired = game({ energy: 2.1 });
    const slept = simulate(tired, T0 + 2 * MIN);
    expect(slept.state.pet!.asleep).toBe(true);
  });

  it('awards coins for continuous good care', () => {
    const g = game({ hunger: 100, energy: 100, fun: 100, hygiene: 100, bladder: 0 });
    const { state, events } = simulate(g, T0 + BALANCE.coins.careIntervalSeconds * 1000);
    expect(state.coins).toBe(g.coins + 1);
    expect(events).toContainEqual({ type: 'coins', amount: 1 });
  });

  it('emits stage-up events as the pet ages', () => {
    const g = game({ hunger: 100 });
    const { events } = simulate({ ...g, lastTick: T0 + 23.9 * HOUR }, T0 + 24.1 * HOUR);
    expect(events).toContainEqual({ type: 'stageUp', stage: 'child' });
  });
});

describe('actions', () => {
  it('feeding raises hunger and fills the bladder', () => {
    const g = game({ hunger: 30, bladder: 10 });
    const { state, events, error } = feed(g, 'kibble', T0);
    expect(error).toBeUndefined();
    expect(state.pet!.stats.hunger).toBe(55);
    expect(state.pet!.stats.bladder).toBe(25);
    expect(events[0]).toEqual({ type: 'feed', food: 'kibble', favorite: false });
  });

  it('favourite food gives a bonus and consumes stock', () => {
    const g = game({ hunger: 20, fun: 50 });
    const stock = g.inventory.foods.fish!;
    const { state, events } = feed(g, 'fish', T0);
    expect(state.pet!.stats.hunger).toBeCloseTo(20 + 35 * 1.5);
    expect(state.pet!.stats.fun).toBe(50 + 5 + 15);
    expect(state.inventory.foods.fish).toBe(stock - 1);
    expect(events[0]).toMatchObject({ favorite: true });
  });

  it('refuses food when full or out of stock', () => {
    expect(feed(game({ hunger: 98 }), 'kibble', T0).error).toBe('full');
    const g = game({ hunger: 10 });
    g.inventory.foods.cake = 0;
    expect(feed(g, 'cake', T0).error).toBe('noStock');
  });

  it('cannot do most things while asleep, but can be stroked', () => {
    const g = toggleSleep(game(), T0).state;
    expect(g.pet!.asleep).toBe(true);
    expect(feed(g, 'kibble', T0).error).toBe('asleep');
    expect(play(g, 'ball', T0).error).toBe('asleep');
    expect(stroke(g, T0).error).toBeUndefined();
    expect(toggleSleep(g, T0).state.pet!.asleep).toBe(false);
  });

  it('playing raises fun, costs energy; dogs need more exercise', () => {
    const cat = play(game({ fun: 30, energy: 80 }), 'ball', T0).state.pet!.stats;
    const dog = play(game({ fun: 30, energy: 80 }, 'dog'), 'ball', T0).state.pet!.stats;
    expect(cat.fun).toBeGreaterThan(30);
    expect(cat.energy).toBeLessThan(80);
    expect(dog.fun).toBeGreaterThan(cat.fun);
    expect(dog.energy).toBeLessThan(cat.energy);
  });

  it('requires owning a toy and enough energy', () => {
    expect(play(game(), 'laser', T0).error).toBe('notOwned');
    expect(play(game({ energy: 5 }), 'ball', T0).error).toBe('tooTired');
  });

  it('toilet empties the bladder but lowers hygiene a bit', () => {
    const { state } = toilet(game({ bladder: 80, hygiene: 90 }), T0);
    expect(state.pet!.stats.bladder).toBe(0);
    expect(state.pet!.stats.hygiene).toBe(85);
    expect(toilet(game({ bladder: 5 }), T0).error).toBe('notNeeded');
  });

  it('washing restores hygiene', () => {
    expect(wash(game({ hygiene: 10 }), T0).state.pet!.stats.hygiene).toBe(100);
  });

  it('cleaning a poop removes it and gives a coin', () => {
    const g = simulate(game({ bladder: 99.9 }), T0 + MIN, { poopPosition: () => ({ x: 0, z: 0 }) }).state;
    const id = g.pet!.poops[0].id;
    const { state } = cleanPoop(g, id, T0 + MIN);
    expect(state.pet!.poops).toHaveLength(0);
    expect(state.coins).toBe(g.coins + 1);
  });

  it('records care actions in the diary', () => {
    let g = game({ hunger: 10 });
    g = feed(g, 'kibble', T0).state;
    g = stroke(g, T0).state;
    g = stroke(g, T0).state;
    expect(g.diary.actionCounts).toEqual({ feed: 1, stroke: 2 });
    expect(favoriteActivity(g.diary)).toBe('stroke');
  });
});

describe('shop', () => {
  it('buys items with coins', () => {
    const g = { ...game(), coins: 100 };
    const r = buy(g, 'laser');
    expect(r.state.inventory.toys).toContain('laser');
    expect(r.state.coins).toBe(70);
    expect(buy(r.state, 'laser').error).toBe('owned');
  });

  it('food is bought in packs', () => {
    const g = { ...game(), coins: 100 };
    const before = g.inventory.foods.cake ?? 0;
    expect(buy(g, 'cake').state.inventory.foods.cake).toBe(before + 2);
  });

  it('rejects purchases without enough coins', () => {
    expect(buy({ ...game(), coins: 5 }, 'crown').error).toBe('notEnoughCoins');
  });

  it('auto-equips bought accessories and allows unequipping', () => {
    const g = buy({ ...game(), coins: 100 }, 'bow').state;
    expect(g.equipped.accessory).toBe('bow');
    expect(equipAccessory(g, null).state.equipped.accessory).toBeNull();
    expect(equipAccessory(g, 'crown').error).toBe('notOwned');
  });
});

describe('progression', () => {
  it('ages from baby to child to adult', () => {
    expect(stageForAge(0)).toBe('baby');
    expect(stageForAge(BALANCE.stages.childAtHours * HOUR)).toBe('child');
    expect(stageForAge(BALANCE.stages.adultAtHours * HOUR)).toBe('adult');
  });

  it('counts daily care streaks', () => {
    let d = emptyDiary();
    d = recordCare(d, 'feed', T0);
    d = recordCare(d, 'feed', T0 + HOUR);
    expect(d.streak).toBe(1);
    d = recordCare(d, 'feed', T0 + 24 * HOUR);
    expect(d.streak).toBe(2);
    expect(currentStreak(d, T0 + 48 * HOUR)).toBe(2);
    expect(currentStreak(d, T0 + 72 * HOUR)).toBe(0);
    d = recordCare(d, 'feed', T0 + 96 * HOUR);
    expect(d.streak).toBe(1);
    expect(d.bestStreak).toBe(2);
    expect(d.lastCareDay).toBe(dayKey(T0 + 96 * HOUR));
  });
});

describe('mood', () => {
  it('reports the most pressing need', () => {
    expect(getMood(game({ bladder: 80 }).pet!, PETS.cat)).toBe('needsToilet');
    expect(getMood(game({ hunger: 10 }).pet!, PETS.cat)).toBe('hungry');
    expect(getMood(game({ health: 10 }).pet!, PETS.cat)).toBe('sick');
    expect(getMood(game({ hunger: 100, fun: 100, energy: 100, hygiene: 100 }).pet!, PETS.cat)).toBe('happy');
  });

  it('isWellCared requires all needs in the green', () => {
    expect(isWellCared(initialStats(), 0)).toBe(true);
    expect(isWellCared(initialStats(), 1)).toBe(false);
    expect(isWellCared({ ...initialStats(), bladder: 80 }, 0)).toBe(false);
  });

  it('new games start without a pet', () => {
    expect(initialGameState(T0).pet).toBeNull();
  });
});

describe('day/night', () => {
  it('is bright at noon and dark at midnight', async () => {
    const { dayPhase } = await import('./daynight');
    expect(dayPhase(new Date(2026, 0, 1, 12)).daylight).toBe(1);
    expect(dayPhase(new Date(2026, 0, 1, 0)).daylight).toBe(0);
    expect(dayPhase(new Date(2026, 0, 1, 19, 15)).dusk).toBeGreaterThan(0.5);
  });
});
