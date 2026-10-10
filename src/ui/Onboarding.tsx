import { useState } from 'react';
import { FOODS, TOYS } from '../game/items';
import { PETS, SPECIES_LIST } from '../game/pets.config';
import type { SpeciesId } from '../game/types';
import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';

interface Props {
  species: SpeciesId;
  onSpecies(s: SpeciesId): void;
}

/** First start: choose a pet (previewed live in the 3D room) and give it a name. */
export function Onboarding({ species, onSpecies }: Props) {
  const [name, setName] = useState('');
  const cfg = PETS[species];
  const start = () => useGameStore.getState().adopt(species, name || t(cfg.nameKey));

  return (
    <>
      <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 px-4 text-center">
        <h1 className="mt-2 text-3xl font-black text-pink-500 drop-shadow-sm">{t('onboarding.welcome')}</h1>
        <p className="font-extrabold text-slate-600">{t('onboarding.choose')}</p>
      </div>
      <div className="pb-safe absolute inset-x-0 bottom-0 px-3">
        <div className="animate-sheet mx-auto max-w-xl rounded-3xl bg-white/90 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 grid grid-cols-5 gap-2">
            {SPECIES_LIST.map((id) => (
              <button
                key={id}
                onClick={() => onSpecies(id)}
                className={`flex flex-col items-center rounded-2xl py-2 ring-2 transition active:scale-90 ${
                  id === species ? 'bg-pink-100 ring-pink-400' : 'bg-slate-50 ring-transparent'
                }`}
              >
                <span className="text-3xl">{PETS[id].emoji}</span>
                <span className="text-[11px] font-extrabold">{t(PETS[id].nameKey)}</span>
              </button>
            ))}
          </div>
          <p className="min-h-10 text-center text-sm font-bold text-slate-600">{t(cfg.descriptionKey)}</p>
          <p className="mb-3 text-center text-xs font-extrabold text-pink-500">
            💖 {t('onboarding.favorites', { food: `${FOODS[cfg.favoriteFood].emoji} ${t(FOODS[cfg.favoriteFood].nameKey)}`, toy: `${TOYS[cfg.favoriteToy].emoji} ${t(TOYS[cfg.favoriteToy].nameKey)}` })}
          </p>
          <label className="mb-1 block text-sm font-extrabold" htmlFor="pet-name">
            {t('onboarding.name')}
          </label>
          <div className="flex gap-2">
            <input
              id="pet-name"
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
              placeholder={t('onboarding.namePlaceholder')}
              className="min-w-0 flex-1 select-text rounded-2xl bg-slate-100 px-4 py-3 font-bold outline-none ring-pink-300 focus:ring-2"
            />
            <button onClick={start} className="rounded-2xl bg-pink-500 px-5 py-3 font-black text-white shadow-lg active:scale-95">
              {t('onboarding.start')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
