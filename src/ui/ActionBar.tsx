import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { care } from './useCare';

interface ActionDef {
  id: string;
  icon: string;
  label: string;
  color: string;
  onClick(): void;
  /** Allowed while the pet sleeps or is busy. */
  always?: boolean;
  alert?: boolean;
}

export function ActionBar() {
  const asleep = useGameStore((s) => !!s.pet?.asleep);
  const needsToilet = useGameStore((s) => (s.pet?.stats.bladder ?? 0) >= 70);
  const poops = useGameStore((s) => s.pet?.poops.length ?? 0);
  const busy = useUiStore((s) => s.busy);
  const openPanel = useUiStore((s) => s.openPanel);
  const toast = useUiStore((s) => s.toast);

  const actions: ActionDef[] = [
    { id: 'feed', icon: '🍖', label: t('action.feed'), color: 'bg-orange-100', onClick: () => openPanel('food') },
    { id: 'play', icon: '🎾', label: t('action.play'), color: 'bg-sky-100', onClick: () => openPanel('toy') },
    {
      id: 'toilet',
      icon: '🚽',
      label: t('action.toilet'),
      color: 'bg-emerald-100',
      alert: needsToilet,
      onClick: () => {
        if (poops > 0 && !needsToilet) toast(t('toast.cleanHint'));
        care.toilet();
      },
    },
    { id: 'wash', icon: '🧼', label: t('action.wash'), color: 'bg-cyan-100', onClick: care.wash },
    {
      id: 'light',
      icon: asleep ? '☀️' : '🌙',
      label: asleep ? t('action.lightOn') : t('action.lightOff'),
      color: 'bg-indigo-100',
      onClick: care.toggleSleep,
      always: true,
    },
    { id: 'stroke', icon: '🤚', label: t('action.stroke'), color: 'bg-pink-100', onClick: care.stroke, always: true },
  ];

  return (
    <div className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 px-3">
      <div className="pointer-events-auto mx-auto grid max-w-xl grid-cols-6 gap-1.5 rounded-3xl bg-white/85 p-2 shadow-xl ring-1 ring-black/5 backdrop-blur">
        {actions.map((a) => {
          const disabled = !a.always && busy;
          return (
            <button
              key={a.id}
              onClick={a.onClick}
              disabled={disabled}
              className={`relative flex flex-col items-center justify-center rounded-2xl py-2 transition active:scale-90 disabled:opacity-40 ${a.color}`}
            >
              <span className={`text-2xl leading-none sm:text-3xl ${a.alert ? 'animate-wiggle' : ''}`} aria-hidden>
                {a.icon}
              </span>
              <span className="mt-1 text-[10px] font-extrabold leading-none text-slate-600 sm:text-xs">{a.label}</span>
              {a.alert && <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-ping rounded-full bg-rose-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
