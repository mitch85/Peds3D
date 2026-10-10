/** Core game types shared by logic, store, scene and UI. */

export type StatKey = 'hunger' | 'energy' | 'fun' | 'hygiene' | 'bladder' | 'health';

/**
 * All stats are in the range 0–100.
 * For hunger/energy/fun/hygiene/health: 100 = perfect.
 * For bladder: 0 = empty, 100 = accident.
 */
export type Stats = Record<StatKey, number>;

export type SpeciesId = 'cat' | 'dog' | 'rabbit' | 'dragon' | 'penguin';
export type FoodId = 'kibble' | 'fish' | 'meat' | 'carrot' | 'berries' | 'cake' | 'chili' | 'medicine';
export type ToyId = 'ball' | 'laser' | 'feather';
export type DecorId = 'plant' | 'rug' | 'painting' | 'lamp' | 'iceRoom';
export type AccessoryId = 'partyHat' | 'bow' | 'crown' | 'scarf';
export type ShopItemId = FoodId | ToyId | DecorId | AccessoryId;

export type LifeStage = 'baby' | 'child' | 'adult';

export type CareAction = 'feed' | 'play' | 'toilet' | 'wash' | 'sleep' | 'stroke' | 'clean';

export interface Vec2 {
  x: number;
  z: number;
}

export interface Poop {
  id: string;
  x: number;
  z: number;
  createdAt: number;
}

export interface PetState {
  species: SpeciesId;
  name: string;
  bornAt: number;
  stats: Stats;
  asleep: boolean;
  poops: Poop[];
  /** Seconds accumulated while the pet was well cared for (used for coin rewards). */
  careSeconds: number;
}

export interface Inventory {
  foods: Partial<Record<FoodId, number>>;
  toys: ToyId[];
  decor: DecorId[];
  accessories: AccessoryId[];
}

export interface Equipped {
  accessory: AccessoryId | null;
  decor: DecorId[];
}

export interface Diary {
  actionCounts: Partial<Record<CareAction, number>>;
  streak: number;
  bestStreak: number;
  /** Local date (YYYY-MM-DD) of the last care action. */
  lastCareDay: string | null;
  coinsEarned: number;
  accidents: number;
}

export interface GameState {
  pet: PetState | null;
  coins: number;
  inventory: Inventory;
  equipped: Equipped;
  diary: Diary;
  /** Timestamp (ms) of the last simulation tick. */
  lastTick: number;
}

/** Events emitted by game logic so the 3D scene can react with animations. */
export type GameEvent =
  | { type: 'feed'; food: FoodId; favorite: boolean }
  | { type: 'refuse'; reason: 'full' | 'asleep' | 'noToilet' }
  | { type: 'play'; toy: ToyId; favorite: boolean }
  | { type: 'toilet' }
  | { type: 'accident'; poop: Poop }
  | { type: 'wash' }
  | { type: 'sleep' }
  | { type: 'wake' }
  | { type: 'stroke' }
  | { type: 'clean'; poopId: string }
  | { type: 'coins'; amount: number }
  | { type: 'stageUp'; stage: LifeStage };

export type Mood = 'happy' | 'content' | 'hungry' | 'tired' | 'bored' | 'dirty' | 'needsToilet' | 'sick' | 'sleeping';
