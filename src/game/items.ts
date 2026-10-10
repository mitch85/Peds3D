import type { AccessoryId, DecorId, FoodId, ShopItemId, Stats, ToyId } from './types';

export interface FoodConfig {
  id: FoodId;
  nameKey: string;
  emoji: string;
  /** Stat changes applied when eaten (bladder is positive = fills up). */
  effects: Partial<Stats>;
  /** Price per pack in the shop. 0 = unlimited and free. */
  price: number;
  packSize: number;
  color: string;
}

export const FOODS: Record<FoodId, FoodConfig> = {
  kibble: { id: 'kibble', nameKey: 'food.kibble', emoji: '🥣', effects: { hunger: 25, bladder: 15 }, price: 0, packSize: 0, color: '#b9824d' },
  fish: { id: 'fish', nameKey: 'food.fish', emoji: '🐟', effects: { hunger: 35, fun: 5, bladder: 15 }, price: 12, packSize: 3, color: '#8fb8de' },
  meat: { id: 'meat', nameKey: 'food.meat', emoji: '🍖', effects: { hunger: 40, energy: 5, bladder: 20 }, price: 14, packSize: 3, color: '#c4553d' },
  carrot: { id: 'carrot', nameKey: 'food.carrot', emoji: '🥕', effects: { hunger: 30, health: 3, bladder: 10 }, price: 8, packSize: 3, color: '#f08a24' },
  berries: { id: 'berries', nameKey: 'food.berries', emoji: '🫐', effects: { hunger: 20, health: 5, bladder: 10 }, price: 8, packSize: 3, color: '#5b5fc7' },
  cake: { id: 'cake', nameKey: 'food.cake', emoji: '🍰', effects: { hunger: 20, fun: 20, health: -3, bladder: 15 }, price: 15, packSize: 2, color: '#f6c1d0' },
  chili: { id: 'chili', nameKey: 'food.chili', emoji: '🌶️', effects: { hunger: 30, energy: 10, bladder: 15 }, price: 12, packSize: 3, color: '#e0322b' },
  medicine: { id: 'medicine', nameKey: 'food.medicine', emoji: '💊', effects: { health: 40, fun: -5 }, price: 25, packSize: 1, color: '#e8e8f0' },
};

export interface ToyConfig {
  id: ToyId;
  nameKey: string;
  emoji: string;
  /** Base fun gain, multiplied by species exercise need. */
  fun: number;
  energyCost: number;
  price: number;
}

export const TOYS: Record<ToyId, ToyConfig> = {
  ball: { id: 'ball', nameKey: 'toy.ball', emoji: '⚽', fun: 25, energyCost: 10, price: 0 },
  laser: { id: 'laser', nameKey: 'toy.laser', emoji: '🔴', fun: 30, energyCost: 12, price: 30 },
  feather: { id: 'feather', nameKey: 'toy.feather', emoji: '🪶', fun: 25, energyCost: 8, price: 25 },
};

export interface DecorConfig {
  id: DecorId;
  nameKey: string;
  emoji: string;
  price: number;
}

export const DECOR: Record<DecorId, DecorConfig> = {
  plant: { id: 'plant', nameKey: 'decor.plant', emoji: '🪴', price: 20 },
  rug: { id: 'rug', nameKey: 'decor.rug', emoji: '🟣', price: 25 },
  painting: { id: 'painting', nameKey: 'decor.painting', emoji: '🖼️', price: 30 },
  lamp: { id: 'lamp', nameKey: 'decor.lamp', emoji: '💡', price: 35 },
  iceRoom: { id: 'iceRoom', nameKey: 'decor.iceRoom', emoji: '❄️', price: 60 },
};

export interface AccessoryConfig {
  id: AccessoryId;
  nameKey: string;
  emoji: string;
  price: number;
  color: string;
}

export const ACCESSORIES: Record<AccessoryId, AccessoryConfig> = {
  partyHat: { id: 'partyHat', nameKey: 'accessory.partyHat', emoji: '🥳', price: 30, color: '#6cc3f5' },
  bow: { id: 'bow', nameKey: 'accessory.bow', emoji: '🎀', price: 25, color: '#f25c8a' },
  crown: { id: 'crown', nameKey: 'accessory.crown', emoji: '👑', price: 80, color: '#f5c542' },
  scarf: { id: 'scarf', nameKey: 'accessory.scarf', emoji: '🧣', price: 35, color: '#d9443f' },
};

export type ShopCategory = 'food' | 'toy' | 'decor' | 'accessory';

export function categoryOf(id: ShopItemId): ShopCategory {
  if (id in FOODS) return 'food';
  if (id in TOYS) return 'toy';
  if (id in DECOR) return 'decor';
  return 'accessory';
}

export function priceOf(id: ShopItemId): number {
  switch (categoryOf(id)) {
    case 'food':
      return FOODS[id as FoodId].price;
    case 'toy':
      return TOYS[id as ToyId].price;
    case 'decor':
      return DECOR[id as DecorId].price;
    case 'accessory':
      return ACCESSORIES[id as AccessoryId].price;
  }
}
