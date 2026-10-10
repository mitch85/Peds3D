import { BALANCE } from '../game/balance';
import { PETS } from '../game/pets.config';
import { currentStreak, favoriteActivity, stageForAge } from '../game/progression';
import type { CareAction } from '../game/types';
import { getLocale, t } from '../i18n';
import { useGameStore } from '../store/gameStore';
import { Sheet } from './Sheet';

const HOUR = 3_600_000;
const CARE_ICONS: Record<CareAction, string> = {
  feed: '🍖',
  play: '🎾',
  toilet: '🚽',
  wash: '🧼',
  sleep: '🌙',
  stroke: '🤚',
  clean: '✨',
};

function formatAge(ms: number) {
  const hours = Math.floor(ms / HOUR);
  if (hours < 24) return t('age.hours', { count: hours });
  return t('age.days', { count: Math.floor(hours / 24), hours: hours % 24 });
}

export function Diary() {
  const pet = useGameStore((s) => s.pet);
  const diary = useGameStore((s) => s.diary);
  const now = useGameStore((s) => s.lastTick);
  if (!pet) return null;

  const age = now - pet.bornAt;
  const stage = stageForAge(age);
  const fav = favoriteActivity(diary);
  const nextAt = stage === 'baby' ? BALANCE.stages.childAtHours : stage === 'child' ? BALANCE.stages.adultAtHours : null;
  const counts = Object.entries(diary.actionCounts) as [CareAction, number][];
  const max = Math.max(1, ...counts.map(([, c]) => c));

  const rows: [string, string][] = [
    [t('diary.age'), formatAge(age)],
    [t('diary.stage'), t(`stage.${stage}`) + (nextAt ? ` · ${t('diary.nextStage', { hours: Math.ceil(nextAt - age / HOUR) })}` : '')],
    [t('diary.born'), new Date(pet.bornAt).toLocaleDateString(getLocale())],
    [t('diary.favorite'), fav ? `${CARE_ICONS[fav]} ${t(`care.${fav}`)}` : t('diary.none')],
    [t('diary.streak'), `🔥 ${t('diary.days', { count: currentStreak(diary, now) })}`],
    [t('diary.bestStreak'), t('diary.days', { count: diary.bestStreak })],
    [t('diary.coinsEarned'), `🪙 ${diary.coinsEarned}`],
    [t('diary.accidents'), `💩 ${diary.accidents}`],
  ];

  return (
    <Sheet title={`${t('diary.title')} – ${PETS[pet.species].emoji} ${pet.name}`}>
      <dl className="divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2 text-sm">
            <dt className="font-bold text-slate-500">{k}</dt>
            <dd className="text-right font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>
      {counts.length > 0 && (
        <>
          <h3 className="mb-2 mt-4 font-black">{t('diary.counts')}</h3>
          <div className="space-y-1.5">
            {counts
              .sort((a, b) => b[1] - a[1])
              .map(([action, count]) => (
                <div key={action} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-center">{CARE_ICONS[action]}</span>
                  <span className="w-24 font-bold">{t(`care.${action}`)}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-pink-400" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-black">{count}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
