import type { FoodId, SpeciesId, ToyId } from './types';

/**
 * Central pet configuration. To add a new pet:
 *  1. add its id to `SpeciesId` in types.ts
 *  2. add an entry below (rates, favourites, look)
 *  3. optionally drop a GLB into public/models/ and set `model`
 */

export type EarShape = 'pointy' | 'floppy' | 'long' | 'horns' | 'none';
export type TailShape = 'thin' | 'wag' | 'puff' | 'spiked' | 'stub';
export type Locomotion = 'trot' | 'hop' | 'waddle';
export type TemperaturePreference = 'cold' | 'neutral' | 'warm';

export interface PetLook {
  body: string;
  belly: string;
  accent: string;
  ears: EarShape;
  tail: TailShape;
  /** Dragons get little wings, penguins get flippers instead of front legs. */
  extras: Array<'wings' | 'flippers' | 'beak' | 'whiskers' | 'snout' | 'spikes'>;
  /** Number of legs touching the ground (penguin = 2). */
  legs: 2 | 4;
  /** Body stretch; >1 = longer body (dog), <1 = rounder. */
  bodyLength: number;
}

/** Optional GLB model. Clip names map our logical clips to the clips inside the file. */
export interface PetModelConfig {
  url: string;
  scale: number;
  clips: Partial<Record<import('../pets/clips').ClipName, string>>;
}

export interface PetConfig {
  id: SpeciesId;
  /** i18n key for the species name. */
  nameKey: string;
  descriptionKey: string;
  emoji: string;
  /** Change per minute while awake (positive = stat drops by this amount). */
  rates: {
    hunger: number;
    energy: number;
    fun: number;
    hygiene: number;
    /** Bladder fill per minute (independent of food). */
    bladder: number;
  };
  /** Below this hunger value, health starts to suffer. Higher = less tolerant. */
  hungerTolerance: number;
  /** Multiplier for the effect of playing (dog needs exercise: bigger effect, but also bigger energy cost). */
  exerciseNeed: number;
  favoriteFood: FoodId;
  favoriteToy: ToyId;
  temperature: TemperaturePreference;
  locomotion: Locomotion;
  /** Walking speed in world units per second. */
  speed: number;
  look: PetLook;
  model?: PetModelConfig;
}

export const PETS: Record<SpeciesId, PetConfig> = {
  cat: {
    id: 'cat',
    nameKey: 'species.cat',
    descriptionKey: 'species.catDesc',
    emoji: '🐱',
    rates: { hunger: 0.5, energy: 0.35, fun: 0.75, hygiene: 0.2, bladder: 0.25 },
    hungerTolerance: 15,
    exerciseNeed: 1,
    favoriteFood: 'fish',
    favoriteToy: 'laser',
    temperature: 'warm',
    locomotion: 'trot',
    speed: 1.3,
    look: {
      body: '#f6a96b',
      belly: '#fde6cf',
      accent: '#e98b4f',
      ears: 'pointy',
      tail: 'thin',
      extras: ['whiskers'],
      legs: 4,
      bodyLength: 1,
    },
  },
  dog: {
    id: 'dog',
    nameKey: 'species.dog',
    descriptionKey: 'species.dogDesc',
    emoji: '🐶',
    rates: { hunger: 0.55, energy: 0.4, fun: 0.6, hygiene: 0.3, bladder: 0.3 },
    hungerTolerance: 15,
    exerciseNeed: 1.5,
    favoriteFood: 'meat',
    favoriteToy: 'ball',
    temperature: 'neutral',
    locomotion: 'trot',
    speed: 1.6,
    look: {
      body: '#c8925c',
      belly: '#f4e1c4',
      accent: '#7a4e2d',
      ears: 'floppy',
      tail: 'wag',
      extras: ['snout'],
      legs: 4,
      bodyLength: 1.15,
    },
  },
  rabbit: {
    id: 'rabbit',
    nameKey: 'species.rabbit',
    descriptionKey: 'species.rabbitDesc',
    emoji: '🐰',
    rates: { hunger: 0.85, energy: 0.3, fun: 0.45, hygiene: 0.2, bladder: 0.3 },
    hungerTolerance: 35,
    exerciseNeed: 1,
    favoriteFood: 'carrot',
    favoriteToy: 'feather',
    temperature: 'neutral',
    locomotion: 'hop',
    speed: 1.4,
    look: {
      body: '#f1eef0',
      belly: '#ffffff',
      accent: '#f7b8c8',
      ears: 'long',
      tail: 'puff',
      extras: [],
      legs: 4,
      bodyLength: 0.95,
    },
  },
  dragon: {
    id: 'dragon',
    nameKey: 'species.dragon',
    descriptionKey: 'species.dragonDesc',
    emoji: '🐲',
    rates: { hunger: 0.6, energy: 0.3, fun: 0.5, hygiene: 0.2, bladder: 0.2 },
    hungerTolerance: 15,
    exerciseNeed: 1.1,
    favoriteFood: 'chili',
    favoriteToy: 'ball',
    temperature: 'warm',
    locomotion: 'trot',
    speed: 1.2,
    look: {
      body: '#7fcf8f',
      belly: '#f3e9a8',
      accent: '#4fa36a',
      ears: 'horns',
      tail: 'spiked',
      extras: ['wings', 'spikes', 'snout'],
      legs: 4,
      bodyLength: 1.1,
    },
  },
  penguin: {
    id: 'penguin',
    nameKey: 'species.penguin',
    descriptionKey: 'species.penguinDesc',
    emoji: '🐧',
    rates: { hunger: 0.5, energy: 0.3, fun: 0.5, hygiene: 0.15, bladder: 0.25 },
    hungerTolerance: 15,
    exerciseNeed: 1,
    favoriteFood: 'fish',
    favoriteToy: 'feather',
    temperature: 'cold',
    locomotion: 'waddle',
    speed: 0.9,
    look: {
      body: '#3d4a5c',
      belly: '#fbfbfb',
      accent: '#f5a742',
      ears: 'none',
      tail: 'stub',
      extras: ['flippers', 'beak'],
      legs: 2,
      bodyLength: 1,
    },
  },
};

export const SPECIES_LIST: SpeciesId[] = ['cat', 'dog', 'rabbit', 'dragon', 'penguin'];
