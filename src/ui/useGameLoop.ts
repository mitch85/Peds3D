import { useEffect } from 'react';
import { gameEvents } from '../game/events';
import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';

const TICK_MS = 1000;

/** Runs the simulation tick, catches up offline time and turns game events into toasts. */
export function useGameLoop() {
  useEffect(() => {
    const store = useGameStore;
    // Catch up time while the app was closed (store decides offline vs. online by gap size)
    store.getState().tick();
    const id = window.setInterval(() => store.getState().tick(), TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') store.getState().tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(
    () =>
      gameEvents.subscribe((e) => {
        const name = useGameStore.getState().pet?.name ?? '';
        const toast = useUiStore.getState().toast;
        switch (e.type) {
          case 'accident':
            toast(t('toast.accident', { name }));
            break;
          case 'stageUp':
            toast(t('toast.stageUp', { name, stage: t(`stage.${e.stage}`) }));
            break;
          case 'coins':
            toast(t('toast.coins', { amount: e.amount }));
            break;
          default:
            break;
        }
      }),
    [],
  );
}
