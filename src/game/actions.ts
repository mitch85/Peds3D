import { BALANCE } from './balance';
import { FOODS, TOYS, categoryOf, priceOf } from './items';
import { PETS } from './pets.config';
import { emptyDiary, recordCare } from './progression';
import { applyDelta, initialStats } from './stats';
import type {
  AccessoryId,
  CareAction,
  DecorId,
  FoodId,
  GameEvent,
  GameState,
  ShopItemId,
  SpeciesId,
  ToyId,
} from './types';

export type ActionError =
  | 'noPet'
  | 'asleep'
  | 'full'
  | 'noStock'
  | 'tooTired'
  | 'notNeeded'
  | 'notEnoughCoins'
  | 'owned'
  | 'notOwned';

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
  error?: ActionError;
}

const fail = (state: GameState, error: ActionError, events: GameEvent[] = []): ActionResult => ({
  state,
  events,
  error,
});

/** Reward coins + diary bookkeeping shared by all care actions. */
function reward(state: GameState, action: CareAction, coins: number, now: number): GameState {
  return {
    ...state,
    coins: state.coins + coins,
    diary: {
      ...recordCare(state.diary, action, now),
      coinsEarned: state.diary.coinsEarned + coins,
    },
  };
}

export function initialGameState(now: number): GameState {
  return {
    pet: null,
    coins: 20,
    inventory: { foods: { fish: 2, carrot: 2, meat: 2, chili: 2 }, toys: ['ball'], decor: [], accessories: [] },
    equipped: { accessory: null, decor: [] },
    diary: emptyDiary(),
    lastTick: now,
  };
}

/** Starts a fresh game with a newly adopted pet. */
export function adopt(species: SpeciesId, name: string, now: number): GameState {
  const base = initialGameState(now);
  const fav = PETS[species].favoriteFood;
  const foods = { ...base.inventory.foods };
  if (FOODS[fav].price > 0) foods[fav] = (foods[fav] ?? 0) + 3;
  return {
    ...base,
    inventory: { ...base.inventory, foods },
    pet: {
      species,
      name: name.trim().slice(0, 16) || PETS[species].emoji,
      bornAt: now,
      stats: initialStats(),
      asleep: false,
      poops: [],
      careSeconds: 0,
    },
    lastTick: now,
  };
}

export function feed(state: GameState, food: FoodId, now: number): ActionResult {
  const pet = state.pet;
  if (!pet) return fail(state, 'noPet');
  if (pet.asleep) return fail(state, 'asleep');
  const cfg = FOODS[food];
  const isMedicine = food === 'medicine';
  if (!isMedicine && pet.stats.hunger >= 95) return fail(state, 'full', [{ type: 'refuse', reason: 'full' }]);
  const stock = state.inventory.foods[food] ?? 0;
  if (cfg.price > 0 && stock <= 0) return fail(state, 'noStock');

  const favorite = PETS[pet.species].favoriteFood === food;
  const effects = { ...cfg.effects };
  if (favorite) {
    effects.hunger = (effects.hunger ?? 0) * 1.5;
    effects.fun = (effects.fun ?? 0) + 15;
  }
  const wasHungry = pet.stats.hunger < 70;
  const foods = { ...state.inventory.foods };
  if (cfg.price > 0) foods[food] = stock - 1;

  const next: GameState = {
    ...state,
    inventory: { ...state.inventory, foods },
    pet: { ...pet, stats: applyDelta(pet.stats, effects) },
  };
  return {
    state: reward(next, 'feed', wasHungry || (isMedicine && pet.stats.health < 50) ? 2 : 0, now),
    events: [{ type: 'feed', food, favorite }],
  };
}

export function play(state: GameState, toy: ToyId, now: number): ActionResult {
  const pet = state.pet;
  if (!pet) return fail(state, 'noPet');
  if (pet.asleep) return fail(state, 'asleep');
  if (!state.inventory.toys.includes(toy)) return fail(state, 'notOwned');
  if (pet.stats.energy < 10) return fail(state, 'tooTired');

  const cfg = PETS[pet.species];
  const t = TOYS[toy];
  const favorite = cfg.favoriteToy === toy;
  const funGain = t.fun * cfg.exerciseNeed * (favorite ? 1.5 : 1);
  const wasBored = pet.stats.fun < 70;
  const next: GameState = {
    ...state,
    pet: {
      ...pet,
      stats: applyDelta(pet.stats, {
        fun: funGain,
        energy: -t.energyCost * cfg.exerciseNeed,
        hunger: -5,
        hygiene: -5,
      }),
    },
  };
  return { state: reward(next, 'play', wasBored ? 3 : 1, now), events: [{ type: 'play', toy, favorite }] };
}

export function toilet(state: GameState, now: number): ActionResult {
  const pet = state.pet;
  if (!pet) return fail(state, 'noPet');
  if (pet.asleep) return fail(state, 'asleep');
  if (pet.stats.bladder < 20) return fail(state, 'notNeeded', [{ type: 'refuse', reason: 'noToilet' }]);
  const urgent = pet.stats.bladder >= BALANCE.bladder.needsToiletAt;
  const next: GameState = {
    ...state,
    pet: { ...pet, stats: applyDelta(pet.stats, { bladder: -100, hygiene: -5 }) },
  };
  return { state: reward(next, 'toilet', urgent ? 3 : 1, now), events: [{ type: 'toilet' }] };
}

export function wash(state: GameState, now: number): ActionResult {
  const pet = state.pet;
  if (!pet) return fail(state, 'noPet');
  if (pet.asleep) return fail(state, 'asleep');
  const dirty = pet.stats.hygiene < 60;
  const next: GameState = {
    ...state,
    pet: { ...pet, stats: applyDelta(pet.stats, { hygiene: 100, fun: pet.species === 'cat' ? -8 : -2 }) },
  };
  return { state: reward(next, 'wash', dirty ? 2 : 0, now), events: [{ type: 'wash' }] };
}

export function toggleSleep(state: GameState, now: number): ActionResult {
  const pet = state.pet;
  if (!pet) return fail(state, 'noPet');
  if (pet.asleep) {
    return { state: { ...state, pet: { ...pet, asleep: false } }, events: [{ type: 'wake' }] };
  }
  const tired = pet.stats.energy < 40;
  const next: GameState = { ...state, pet: { ...pet, asleep: true } };
  return { state: reward(next, 'sleep', tired ? 2 : 0, now), events: [{ type: 'sleep' }] };
}

export function stroke(state: GameState, now: number): ActionResult {
  const pet = state.pet;
  if (!pet) return fail(state, 'noPet');
  const next: GameState = {
    ...state,
    pet: { ...pet, stats: applyDelta(pet.stats, { fun: pet.asleep ? 2 : 6, health: 0.5 }) },
  };
  return { state: reward(next, 'stroke', 0, now), events: [{ type: 'stroke' }] };
}

export function cleanPoop(state: GameState, poopId: string, now: number): ActionResult {
  const pet = state.pet;
  if (!pet) return fail(state, 'noPet');
  if (!pet.poops.some((p) => p.id === poopId)) return fail(state, 'notNeeded');
  const next: GameState = {
    ...state,
    pet: {
      ...pet,
      poops: pet.poops.filter((p) => p.id !== poopId),
      stats: applyDelta(pet.stats, { hygiene: 5 }),
    },
  };
  return { state: reward(next, 'clean', 1, now), events: [{ type: 'clean', poopId }] };
}

export function buy(state: GameState, item: ShopItemId): ActionResult {
  const price = priceOf(item);
  const cat = categoryOf(item);
  const inv = state.inventory;
  if (cat === 'food' && FOODS[item as FoodId].price === 0) return fail(state, 'owned');
  if (cat === 'toy' && inv.toys.includes(item as ToyId)) return fail(state, 'owned');
  if (cat === 'decor' && inv.decor.includes(item as DecorId)) return fail(state, 'owned');
  if (cat === 'accessory' && inv.accessories.includes(item as AccessoryId)) return fail(state, 'owned');
  if (state.coins < price) return fail(state, 'notEnoughCoins');

  let inventory = inv;
  let equipped = state.equipped;
  switch (cat) {
    case 'food': {
      const id = item as FoodId;
      inventory = { ...inv, foods: { ...inv.foods, [id]: (inv.foods[id] ?? 0) + FOODS[id].packSize } };
      break;
    }
    case 'toy':
      inventory = { ...inv, toys: [...inv.toys, item as ToyId] };
      break;
    case 'decor':
      inventory = { ...inv, decor: [...inv.decor, item as DecorId] };
      equipped = { ...equipped, decor: [...equipped.decor, item as DecorId] };
      break;
    case 'accessory':
      inventory = { ...inv, accessories: [...inv.accessories, item as AccessoryId] };
      equipped = { ...equipped, accessory: item as AccessoryId };
      break;
  }
  return { state: { ...state, coins: state.coins - price, inventory, equipped }, events: [] };
}

export function equipAccessory(state: GameState, id: AccessoryId | null): ActionResult {
  if (id && !state.inventory.accessories.includes(id)) return fail(state, 'notOwned');
  return { state: { ...state, equipped: { ...state.equipped, accessory: id } }, events: [] };
}

export function toggleDecor(state: GameState, id: DecorId): ActionResult {
  if (!state.inventory.decor.includes(id)) return fail(state, 'notOwned');
  const on = state.equipped.decor.includes(id);
  const decor = on ? state.equipped.decor.filter((d) => d !== id) : [...state.equipped.decor, id];
  return { state: { ...state, equipped: { ...state.equipped, decor } }, events: [] };
}
