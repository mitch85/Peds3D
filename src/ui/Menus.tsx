import { FOODS, TOYS } from '../game/items';
import { PETS } from '../game/pets.config';
import type { FoodId, ToyId } from '../game/types';
import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { Sheet } from './Sheet';
import { care } from './useCare';

export function FoodMenu() {
  const inventory = useGameStore((s) => s.inventory.foods);
  const species = useGameStore((s) => s.pet?.species ?? 'cat');
  const favorite = PETS[species].favoriteFood;
  const openPanel = useUiStore((s) => s.openPanel);

  const choose = (food: FoodId) => {
    openPanel(null);
    care.feed(food);
  };

  return (
    <Sheet title={t('food.title')}>
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(FOODS) as FoodId[]).map((id) => {
          const f = FOODS[id];
          const stock = f.price === 0 ? Infinity : inventory[id] ?? 0;
          const empty = stock <= 0;
          return (
            <button
              key={id}
              onClick={() => (empty ? openPanel('shop') : choose(id))}
              className={`relative flex flex-col items-center rounded-2xl p-2 ring-2 transition active:scale-90 ${
                id === favorite ? 'bg-pink-50 ring-pink-300' : 'bg-slate-50 ring-transparent'
              } ${empty ? 'opacity-40' : ''}`}
            >
              <span className="text-3xl">{f.emoji}</span>
              <span className="mt-1 text-center text-[11px] font-extrabold leading-tight">{t(f.nameKey)}</span>
              <span className="text-[10px] font-bold text-slate-400">
                {f.price === 0 ? t('food.free') : t('food.stock', { count: stock })}
              </span>
              {id === favorite && <span className="absolute -right-1 -top-1 text-base">💖</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs font-bold text-pink-500">
        💖 = {t('food.favorite')}
      </p>
    </Sheet>
  );
}

export function ToyMenu() {
  const toys = useGameStore((s) => s.inventory.toys);
  const species = useGameStore((s) => s.pet?.species ?? 'cat');
  const favorite = PETS[species].favoriteToy;
  const openPanel = useUiStore((s) => s.openPanel);

  const choose = (toy: ToyId) => {
    openPanel(null);
    care.play(toy);
  };

  return (
    <Sheet title={t('toy.title')}>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TOYS) as ToyId[]).map((id) => {
          const toy = TOYS[id];
          const owned = toys.includes(id);
          return (
            <button
              key={id}
              onClick={() => (owned ? choose(id) : openPanel('shop'))}
              className={`relative flex flex-col items-center rounded-2xl p-3 ring-2 transition active:scale-90 ${
                id === favorite ? 'bg-pink-50 ring-pink-300' : 'bg-slate-50 ring-transparent'
              } ${owned ? '' : 'opacity-40'}`}
            >
              <span className="text-4xl">{toy.emoji}</span>
              <span className="mt-1 text-xs font-extrabold">{t(toy.nameKey)}</span>
              {!owned && <span className="text-[10px] font-bold text-slate-400">🛒 {toy.price} 🪙</span>}
              {id === favorite && <span className="absolute -right-1 -top-1 text-base">💖</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
