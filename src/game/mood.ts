import { BALANCE } from './balance';
import type { PetConfig } from './pets.config';
import type { Mood, PetState } from './types';

const LOW = 25;

/** Most pressing mood, used for emote bubbles and sad/sick animations. */
export function getMood(pet: PetState, cfg: PetConfig): Mood {
  const s = pet.stats;
  if (pet.asleep) return 'sleeping';
  if (s.health < BALANCE.health.sickBelow) return 'sick';
  if (s.bladder >= BALANCE.bladder.needsToiletAt) return 'needsToilet';
  if (s.hunger < Math.max(LOW, cfg.hungerTolerance)) return 'hungry';
  if (s.energy < LOW) return 'tired';
  if (s.hygiene < LOW || pet.poops.length > 0) return 'dirty';
  if (s.fun < LOW) return 'bored';
  const avg = (s.hunger + s.energy + s.fun + s.hygiene + s.health) / 5;
  return avg >= 70 ? 'happy' : 'content';
}

/** 0 = miserable, 1 = very happy. Drives tail wagging, ear posture and walking speed. */
export function happiness(pet: PetState): number {
  const s = pet.stats;
  const avg = (s.hunger + s.energy + s.fun + s.hygiene + s.health) / 500;
  const bladderPenalty = s.bladder > 70 ? 0.15 : 0;
  return Math.max(0, Math.min(1, avg - bladderPenalty));
}

export const MOOD_EMOJI: Record<Mood, string> = {
  happy: '💖',
  content: '🙂',
  hungry: '🍖',
  tired: '🥱',
  bored: '🎾',
  dirty: '🧼',
  needsToilet: '🚽',
  sick: '🤒',
  sleeping: '💤',
};
