import type { FoodId } from '../game/types';

/**
 * Mutable runtime state for transient scene props (food in the bowl, ball, laser dot, ...).
 * Written by pet behaviours, read every frame by prop components. Not React state on purpose
 * (avoids re-renders at 60 fps).
 */
export const props = {
  food: { visible: false, food: 'kibble' as FoodId, amount: 1 },
  ball: { visible: false, x: 0, y: 0, z: 0 },
  laser: { visible: false, x: 0, z: 0 },
  feather: { visible: false, x: 0, y: 0, z: 0 },
};

export function hideAllProps() {
  props.food.visible = false;
  props.ball.visible = false;
  props.laser.visible = false;
  props.feather.visible = false;
}
