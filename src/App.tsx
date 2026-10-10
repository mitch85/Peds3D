import { useEffect, useState } from 'react';
import { setSoundEnabled, sfx, unlockAudio } from './audio/sfx';
import type { SpeciesId } from './game/types';
import { t } from './i18n';
import { Experience } from './scene/Experience';
import { useGameStore } from './store/gameStore';
import { useUiStore } from './store/uiStore';
import { ActionBar } from './ui/ActionBar';
import { Diary } from './ui/Diary';
import { Hud } from './ui/Hud';
import { FoodMenu, ToyMenu } from './ui/Menus';
import { useNeedNotifications } from './ui/notifications';
import { Onboarding } from './ui/Onboarding';
import { Settings } from './ui/Settings';
import { Shop } from './ui/Shop';
import { Toasts } from './ui/Toasts';
import { useGameLoop } from './ui/useGameLoop';

export function App() {
  useGameLoop();
  useNeedNotifications();
  const species = useGameStore((s) => s.pet?.species ?? null);
  const name = useGameStore((s) => s.pet?.name ?? '');
  const panel = useUiStore((s) => s.panel);
  const [previewSpecies, setPreviewSpecies] = useState<SpeciesId>('cat');
  const sound = useGameStore((s) => s.settings.sound);

  useEffect(() => setSoundEnabled(sound), [sound]);

  // Browsers only allow audio after a user gesture; also give every button a soft tap sound
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      unlockAudio();
      if ((e.target as HTMLElement | null)?.closest('button')) sfx('tap');
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, []);

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-pink-50 to-amber-50">
      <Experience species={species ?? previewSpecies} preview={!species} />

      {species ? (
        <>
          <Hud />
          <p className="pointer-events-none absolute inset-x-0 bottom-28 text-center text-xs font-bold text-slate-500/70 sm:bottom-32">
            {t('hint.stroke', { name })}
          </p>
          <ActionBar />
          {panel === 'food' && <FoodMenu />}
          {panel === 'toy' && <ToyMenu />}
          {panel === 'shop' && <Shop />}
          {panel === 'diary' && <Diary />}
          {panel === 'settings' && <Settings />}
        </>
      ) : (
        <Onboarding species={previewSpecies} onSpecies={setPreviewSpecies} />
      )}
      <Toasts />
    </div>
  );
}
