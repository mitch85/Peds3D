import { describe, expect, it } from 'vitest';
import { PETS } from '../game/pets.config';
import { SPOTS } from '../scene/layout';
import { eat, handleGameEvent, syncSleep } from './behaviors';
import { PetBrain } from './PetBrain';
import { props } from './props';

const DT = 1 / 60;

function makeBrain() {
  const b = new PetBrain(PETS.cat);
  let seed = 1;
  b.random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return b;
}

function runFor(b: PetBrain, seconds: number) {
  for (let t = 0; t < seconds; t += DT) b.update(DT);
}

describe('PetBrain', () => {
  it('crossfades between clips instead of switching hard', () => {
    const b = makeBrain();
    runFor(b, 0.5);
    b.run({ name: 'test', busy: true, steps: [{ clip: 'happy', duration: 2 }] });
    b.update(DT);
    const w = b.weights.get('happy') ?? 0;
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(0.2);
    runFor(b, 1);
    expect(b.weights.get('happy')).toBeGreaterThan(0.95);
  });

  it('pose values change smoothly between frames', () => {
    const b = makeBrain();
    let prev = { ...b.pose };
    b.run({ name: 'test', busy: true, steps: [{ clip: 'sleep', duration: 1 }, { clip: 'jump', duration: 1 }] });
    for (let i = 0; i < 150; i++) {
      b.update(DT);
      expect(Math.abs(b.pose.crouch - prev.crouch)).toBeLessThan(0.15);
      expect(Math.abs(b.pose.headPitch - prev.headPitch)).toBeLessThan(0.15);
      prev = { ...b.pose };
    }
  });

  it('walks to a target and plays the walk clip on the way', () => {
    const b = makeBrain();
    b.run({ name: 'go', busy: true, steps: [{ clip: 'walk', walkTo: { x: 1.5, z: 0.4 } }] });
    runFor(b, 0.3);
    expect(b.activeClip).toBe('walk');
    for (let i = 0; i < 600 && b.behavior; i++) b.update(DT);
    expect(b.behavior).toBeNull();
    expect(Math.hypot(b.pos.x - 1.5, b.pos.z - 0.4)).toBeLessThan(0.07);
  });

  it('eating walks to the bowl, shows food that shrinks and then disappears', () => {
    const b = makeBrain();
    b.run(eat(b, 'fish', true));
    expect(b.busy).toBe(true);
    b.update(DT);
    expect(props.food.visible).toBe(true);
    runFor(b, 8);
    expect(Math.hypot(b.pos.x - SPOTS.bowl.stand.x, b.pos.z - SPOTS.bowl.stand.z)).toBeLessThan(0.2);
    runFor(b, 6);
    expect(props.food.visible).toBe(false);
    expect(b.busy).toBe(false);
  });

  it('interrupting a behaviour cleans up its props', () => {
    const b = makeBrain();
    handleGameEvent(b, { type: 'play', toy: 'ball', favorite: false });
    runFor(b, 0.5);
    expect(props.ball.visible).toBe(true);
    handleGameEvent(b, { type: 'wash' });
    expect(props.ball.visible).toBe(false);
    expect(b.behavior?.name).toBe('wash');
  });

  it('goes to bed when asleep and wakes up again', () => {
    const b = makeBrain();
    b.world = { ...b.world, asleep: true };
    syncSleep(b);
    expect(b.behavior?.name).toBe('sleep');
    runFor(b, 6);
    expect(b.activeClip).toBe('sleep');
    expect(Math.hypot(b.pos.x - SPOTS.bed.stand.x, b.pos.z - SPOTS.bed.stand.z)).toBeLessThan(0.2);
    b.world = { ...b.world, asleep: false };
    syncSleep(b);
    expect(b.behavior?.name).toBe('wake');
  });

  it('shows a toilet thought bubble when the pet needs to go', () => {
    const b = makeBrain();
    b.world = { ...b.world, mood: 'needsToilet' };
    expect(b.currentEmote()?.icon).toBe('🚽');
  });
});
