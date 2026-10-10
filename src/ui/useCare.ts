import type { ActionError } from '../game/actions';
import type { FoodId, ToyId } from '../game/types';
import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';

export function errorText(error: ActionError, name: string): string | null {
  switch (error) {
    case 'full':
      return t('toast.full', { name });
    case 'asleep':
      return t('toast.asleep', { name });
    case 'notNeeded':
      return t('toast.noToilet', { name });
    case 'noStock':
      return t('toast.noStock');
    case 'tooTired':
      return t('toast.tooTired', { name });
    case 'notEnoughCoins':
      return t('toast.notEnoughCoins');
    default:
      return null;
  }
}

function report(error: ActionError | undefined) {
  if (!error) return;
  const name = useGameStore.getState().pet?.name ?? '';
  const text = errorText(error, name);
  if (text) useUiStore.getState().toast(text);
}

/** Care actions with user feedback for refused actions. */
export const care = {
  feed: (food: FoodId) => report(useGameStore.getState().feed(food)),
  play: (toy: ToyId) => report(useGameStore.getState().play(toy)),
  toilet: () => report(useGameStore.getState().toilet()),
  wash: () => report(useGameStore.getState().wash()),
  toggleSleep: () => report(useGameStore.getState().toggleSleep()),
  stroke: () => report(useGameStore.getState().stroke()),
};
