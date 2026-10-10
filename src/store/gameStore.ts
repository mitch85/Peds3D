import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as actions from '../game/actions';
import type { ActionError, ActionResult } from '../game/actions';
import { gameEvents } from '../game/events';
import { simulate } from '../game/tick';
import type { AccessoryId, DecorId, FoodId, GameState, ShopItemId, SpeciesId, ToyId, Vec2 } from '../game/types';

export interface Settings {
  notifications: boolean;
  sound: boolean;
}

interface GameStore extends GameState {
  settings: Settings;
  adopt(species: SpeciesId, name: string): void;
  /** Advances the simulation to now. Gaps > 60s (app closed / background) count as offline time. */
  tick(): void;
  feed(food: FoodId): ActionError | undefined;
  play(toy: ToyId): ActionError | undefined;
  toilet(): ActionError | undefined;
  wash(): ActionError | undefined;
  toggleSleep(): ActionError | undefined;
  stroke(): ActionError | undefined;
  cleanPoop(id: string): ActionError | undefined;
  buy(item: ShopItemId): ActionError | undefined;
  equipAccessory(id: AccessoryId | null): ActionError | undefined;
  toggleDecor(id: DecorId): ActionError | undefined;
  setSettings(settings: Partial<Settings>): void;
  reset(): void;
}

/** The 3D scene registers where the pet currently stands (for accidents). */
let positionProvider: () => Vec2 = () => ({ x: 0, z: 0 });
export function setPetPositionProvider(fn: () => Vec2) {
  positionProvider = fn;
}

const OFFLINE_GAP_MS = 60_000;

function pickState(s: GameStore): GameState {
  return {
    pet: s.pet,
    coins: s.coins,
    inventory: s.inventory,
    equipped: s.equipped,
    diary: s.diary,
    lastTick: s.lastTick,
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /** Runs a pure action: bring the simulation up to date first, then apply + emit events. */
      const run = (fn: (state: GameState, now: number) => ActionResult): ActionError | undefined => {
        get().tick();
        const now = Date.now();
        const result = fn(pickState(get()), now);
        if (!result.error) set(result.state);
        result.events.forEach((e) => gameEvents.emit(e));
        return result.error;
      };

      return {
        ...actions.initialGameState(Date.now()),
        settings: { notifications: false, sound: true },

        adopt(species, name) {
          set(actions.adopt(species, name, Date.now()));
        },

        tick() {
          const state = pickState(get());
          const now = Date.now();
          const offline = now - state.lastTick > OFFLINE_GAP_MS;
          const { state: next, events } = simulate(state, now, { offline, poopPosition: positionProvider });
          set(next);
          events.forEach((e) => gameEvents.emit(e));
        },

        feed: (food) => run((s, now) => actions.feed(s, food, now)),
        play: (toy) => run((s, now) => actions.play(s, toy, now)),
        toilet: () => run((s, now) => actions.toilet(s, now)),
        wash: () => run((s, now) => actions.wash(s, now)),
        toggleSleep: () => run((s, now) => actions.toggleSleep(s, now)),
        stroke: () => run((s, now) => actions.stroke(s, now)),
        cleanPoop: (id) => run((s, now) => actions.cleanPoop(s, id, now)),
        buy: (item) => run((s) => actions.buy(s, item)),
        equipAccessory: (id) => run((s) => actions.equipAccessory(s, id)),
        toggleDecor: (id) => run((s) => actions.toggleDecor(s, id)),

        setSettings(settings) {
          set({ settings: { ...get().settings, ...settings } });
        },

        reset() {
          set({ ...actions.initialGameState(Date.now()) });
        },
      };
    },
    {
      name: 'petpal-3d',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ...pickState(s), settings: s.settings }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameStore>;
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
    },
  ),
);
