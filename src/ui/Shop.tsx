import { useState } from 'react';
import { ACCESSORIES, DECOR, FOODS, TOYS, type ShopCategory } from '../game/items';
import type { AccessoryId, DecorId, FoodId, ShopItemId, ToyId } from '../game/types';
import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { Sheet } from './Sheet';
import { errorText } from './useCare';

const TABS: { id: ShopCategory; icon: string }[] = [
  { id: 'food', icon: '🍎' },
  { id: 'toy', icon: '🧸' },
  { id: 'decor', icon: '🪴' },
  { id: 'accessory', icon: '🎀' },
];

interface Row {
  id: ShopItemId;
  emoji: string;
  name: string;
  price: number;
  sub?: string;
}

export function Shop() {
  const [tab, setTab] = useState<ShopCategory>('food');
  const coins = useGameStore((s) => s.coins);
  const inventory = useGameStore((s) => s.inventory);
  const equipped = useGameStore((s) => s.equipped);
  const toast = useUiStore((s) => s.toast);

  const buy = (row: Row) => {
    const error = useGameStore.getState().buy(row.id);
    if (error) {
      const text = errorText(error, '');
      if (text) toast(text);
    } else {
      toast(t('toast.bought', { item: `${row.emoji} ${row.name}` }));
    }
  };

  let rows: Row[] = [];
  switch (tab) {
    case 'food':
      rows = (Object.keys(FOODS) as FoodId[])
        .filter((id) => FOODS[id].price > 0)
        .map((id) => ({
          id,
          emoji: FOODS[id].emoji,
          name: t(FOODS[id].nameKey),
          price: FOODS[id].price,
          sub: `${t('shop.pack', { count: FOODS[id].packSize })} · ${t('shop.inStock', { count: inventory.foods[id] ?? 0 })}`,
        }));
      break;
    case 'toy':
      rows = (Object.keys(TOYS) as ToyId[]).map((id) => ({ id, emoji: TOYS[id].emoji, name: t(TOYS[id].nameKey), price: TOYS[id].price }));
      break;
    case 'decor':
      rows = (Object.keys(DECOR) as DecorId[]).map((id) => ({ id, emoji: DECOR[id].emoji, name: t(DECOR[id].nameKey), price: DECOR[id].price }));
      break;
    case 'accessory':
      rows = (Object.keys(ACCESSORIES) as AccessoryId[]).map((id) => ({
        id,
        emoji: ACCESSORIES[id].emoji,
        name: t(ACCESSORIES[id].nameKey),
        price: ACCESSORIES[id].price,
      }));
      break;
  }

  const ownedState = (id: ShopItemId): { owned: boolean; active?: boolean; toggle?: () => void } => {
    const store = useGameStore.getState();
    if (tab === 'toy') return { owned: inventory.toys.includes(id as ToyId) };
    if (tab === 'decor') {
      const d = id as DecorId;
      return { owned: inventory.decor.includes(d), active: equipped.decor.includes(d), toggle: () => store.toggleDecor(d) };
    }
    if (tab === 'accessory') {
      const a = id as AccessoryId;
      const active = equipped.accessory === a;
      return { owned: inventory.accessories.includes(a), active, toggle: () => store.equipAccessory(active ? null : a) };
    }
    return { owned: false };
  };

  return (
    <Sheet title={t('shop.title')} wide>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-slate-100 p-1">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-extrabold transition ${tab === tb.id ? 'bg-white text-pink-600 shadow' : 'text-slate-500'}`}
            >
              <span aria-hidden>{tb.icon}</span> <span className="hidden sm:inline">{t(`shop.${tb.id}`)}</span>
            </button>
          ))}
        </div>
        <div className="rounded-full bg-amber-100 px-3 py-1 font-black text-amber-700">🪙 {coins}</div>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => {
          const o = ownedState(row.id);
          const free = row.price === 0;
          return (
            <li key={row.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5">
              <span className="text-3xl">{row.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold">{row.name}</div>
                {row.sub && <div className="text-xs font-bold text-slate-400">{row.sub}</div>}
              </div>
              {o.owned || (free && tab === 'toy') ? (
                o.toggle ? (
                  <button
                    onClick={o.toggle}
                    className={`rounded-full px-4 py-2 text-sm font-black active:scale-90 ${o.active ? 'bg-slate-200 text-slate-600' : 'bg-pink-500 text-white'}`}
                  >
                    {o.active ? (tab === 'decor' ? t('shop.remove') : t('shop.unequip')) : tab === 'decor' ? t('shop.place') : t('shop.equip')}
                  </button>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">✓ {t('shop.owned')}</span>
                )
              ) : (
                <button
                  onClick={() => buy(row)}
                  disabled={coins < row.price}
                  className="rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-amber-900 shadow active:scale-90 disabled:opacity-40"
                >
                  {row.price} 🪙
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
