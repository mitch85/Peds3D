import { BALANCE } from './balance';
import type { CareAction, Diary, LifeStage } from './types';

const HOUR = 60 * 60 * 1000;

export function stageForAge(ageMs: number): LifeStage {
  const hours = ageMs / HOUR;
  if (hours >= BALANCE.stages.adultAtHours) return 'adult';
  if (hours >= BALANCE.stages.childAtHours) return 'child';
  return 'baby';
}

export const STAGE_SCALE: Record<LifeStage, number> = {
  baby: 0.65,
  child: 0.82,
  adult: 1,
};

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function previousDayKey(ms: number): string {
  const d = new Date(ms);
  d.setDate(d.getDate() - 1);
  return dayKey(d.getTime());
}

export function emptyDiary(): Diary {
  return { actionCounts: {}, streak: 0, bestStreak: 0, lastCareDay: null, coinsEarned: 0, accidents: 0 };
}

/** Records a care action and updates the daily care streak. */
export function recordCare(diary: Diary, action: CareAction, now: number): Diary {
  const today = dayKey(now);
  let streak = diary.streak;
  if (diary.lastCareDay !== today) {
    streak = diary.lastCareDay === previousDayKey(now) ? streak + 1 : 1;
  }
  return {
    ...diary,
    actionCounts: { ...diary.actionCounts, [action]: (diary.actionCounts[action] ?? 0) + 1 },
    streak,
    bestStreak: Math.max(diary.bestStreak, streak),
    lastCareDay: today,
  };
}

/** Streak shown to the player: resets visually if a day was skipped. */
export function currentStreak(diary: Diary, now: number): number {
  if (!diary.lastCareDay) return 0;
  if (diary.lastCareDay === dayKey(now) || diary.lastCareDay === previousDayKey(now)) return diary.streak;
  return 0;
}

export function favoriteActivity(diary: Diary): CareAction | null {
  let best: CareAction | null = null;
  let bestCount = 0;
  for (const [action, count] of Object.entries(diary.actionCounts) as [CareAction, number][]) {
    if (count > bestCount) {
      best = action;
      bestCount = count;
    }
  }
  return best;
}
