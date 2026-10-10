import { PETS } from '../game/pets.config';
import { stageForAge } from '../game/progression';
import type { StatKey } from '../game/types';
import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';

const STATS: { key: StatKey; icon: string; inverted?: boolean }[] = [
  { key: 'hunger', icon: '🍖' },
  { key: 'energy', icon: '⚡' },
  { key: 'fun', icon: '😊' },
  { key: 'hygiene', icon: '🛁' },
  { key: 'bladder', icon: '🚽', inverted: true },
  { key: 'health', icon: '❤️' },
];

function barColor(value: number) {
  if (value >= 60) return 'bg-emerald-400';
  if (value >= 30) return 'bg-amber-400';
  return 'bg-rose-500';
}

function StatBar({ stat }: { stat: (typeof STATS)[number] }) {
  const value = useGameStore((s) => Math.round(s.pet?.stats[stat.key] ?? 0));
  // Bladder: full = bad, so colour by the inverted value
  const quality = stat.inverted ? 100 - value : value;
  const critical = quality < 20;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5" title={`${t(`stat.${stat.key}`)}: ${value}`}>
      <span className={`text-lg leading-none ${critical ? 'animate-wiggle' : ''}`} aria-hidden>
        {stat.icon}
      </span>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-black/5" role="meter" aria-label={t(`stat.${stat.key}`)} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all duration-700 ${barColor(quality)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Hud() {
  const name = useGameStore((s) => s.pet?.name ?? '');
  const species = useGameStore((s) => s.pet?.species ?? 'cat');
  const coins = useGameStore((s) => s.coins);
  const stage = useGameStore((s) => (s.pet ? stageForAge(s.lastTick - s.pet.bornAt) : 'baby'));
  const openPanel = useUiStore((s) => s.openPanel);

  return (
    <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 px-3">
      <div className="pointer-events-auto mx-auto max-w-xl rounded-3xl bg-white/80 p-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {PETS[species].emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black leading-tight text-slate-800">{name}</div>
            <div className="text-xs font-bold text-pink-500">{t(`stage.${stage}`)}</div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-black text-amber-700">
            <span aria-hidden>🪙</span>
            {coins}
          </div>
          <HudButton icon="🛒" label={t('shop.title')} onClick={() => openPanel('shop')} />
          <HudButton icon="📖" label={t('diary.title')} onClick={() => openPanel('diary')} />
          <HudButton icon="⚙️" label={t('settings.title')} onClick={() => openPanel('settings')} />
        </div>
        <div className="flex gap-2">
          {STATS.map((s) => (
            <StatBar key={s.key} stat={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HudButton({ icon, label, onClick }: { icon: string; label: string; onClick(): void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-xl transition active:scale-90"
    >
      {icon}
    </button>
  );
}
