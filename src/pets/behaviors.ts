import { sfx, type SfxName } from '../audio/sfx';
import { FOODS } from '../game/items';
import type { FoodId, GameEvent, ToyId, Vec2 } from '../game/types';
import { clampToRoom, randomRoomPoint, SPOTS } from '../scene/layout';
import { fx } from './fx';
import type { Behavior, PetBrain, Step } from './PetBrain';
import { hideAllProps, props } from './props';

/** Calls `fn` roughly every `interval` seconds inside an onUpdate hook. */
function every(interval: number, fn: () => void) {
  let acc = 0;
  return (_t: number, dt: number) => {
    acc += dt;
    while (acc >= interval) {
      acc -= interval;
      fn();
    }
  };
}

/** Plays a sound in the pet's own voice. */
const say = (brain: PetBrain, name: SfxName) => sfx(name, brain.cfg.voice);

function joy(brain: PetBrain, hearts = 3) {
  say(brain, 'heart');
  const h = brain.headPosition();
  fx.emit('heart', h.x, h.y + 0.2, h.z, hearts);
  if (brain.cfg.id === 'dragon') fx.emit('spark', h.x + Math.sin(brain.yaw) * 0.25, h.y, h.z + Math.cos(brain.yaw) * 0.25, 10);
}

export function installSpeciesHooks(brain: PetBrain) {
  brain.onJoy = () => {
    const h = brain.headPosition();
    if (brain.cfg.id === 'dragon') fx.emit('spark', h.x + Math.sin(brain.yaw) * 0.25, h.y, h.z + Math.cos(brain.yaw) * 0.25, 8);
    else fx.emit('star', h.x, h.y + 0.3, h.z, 2);
  };
}

// ------------------------------------------------------------------ eating

export function eat(brain: PetBrain, food: FoodId, favorite: boolean): Behavior {
  const bowl = SPOTS.bowl;
  const duration = 3.6;
  return {
    name: 'eat',
    busy: true,
    cleanup: () => {
      props.food.visible = false;
    },
    steps: [
      {
        clip: 'walk',
        walkTo: bowl.stand,
        run: brain.world.mood === 'hungry',
        emote: { icon: FOODS[food].emoji, kind: 'thought' },
        onStart: () => {
          props.food.food = food;
          props.food.amount = 1;
          props.food.visible = true;
          sfx('pop');
        },
      },
      {
        clip: 'eat',
        duration,
        face: bowl.face,
        onUpdate: (() => {
          const chew = every(0.38, () => say(brain, 'chomp'));
          return (t: number, dt: number) => {
            props.food.amount = Math.max(0.05, 1 - t / duration);
            if (Math.random() < dt * 4) fx.emit('crumb', bowl.at.x + 0.1, 0.2, bowl.at.z, 1);
            chew(t, dt);
          };
        })(),
      },
      {
        clip: 'happy',
        duration: favorite ? 1.8 : 1.2,
        face: 'camera',
        emote: { icon: favorite ? '😍' : '😋', kind: 'speech' },
        onStart: () => {
          props.food.visible = false;
          say(brain, 'yum');
          joy(brain, favorite ? 6 : 2);
        },
      },
    ],
  };
}

// ------------------------------------------------------------------ toilet

export function toilet(brain: PetBrain): Behavior {
  const litter = SPOTS.litter;
  return {
    name: 'toilet',
    busy: true,
    steps: [
      { clip: 'fidget', duration: 0.6, emote: { icon: '🚽', kind: 'thought' } },
      { clip: 'walk', walkTo: litter.stand, run: true, emote: { icon: '🚽', kind: 'thought' } },
      { clip: 'squat', duration: 2.6, face: litter.face, emote: { icon: '…', kind: 'speech' } },
      {
        clip: 'happy',
        duration: 1.3,
        face: 'camera',
        emote: { icon: '😌', kind: 'speech' },
        onStart: () => {
          fx.emit('star', litter.at.x, 0.5, litter.at.z, 4);
          say(brain, 'relief');
          joy(brain, 1);
        },
      },
      // Step out of the litter box again
      { clip: 'walk', walkTo: { x: litter.stand.x - 0.9, z: litter.stand.z + 1 } },
    ],
  };
}

export function accident(brain: PetBrain): Behavior {
  return {
    name: 'accident',
    busy: true,
    steps: [
      { clip: 'fidget', duration: 0.9, emote: { icon: '😣', kind: 'speech' }, onStart: () => say(brain, 'oops') },
      { clip: 'squat', duration: 1.8, face: 'camera', emote: { icon: '…', kind: 'speech' } },
      {
        clip: 'walk',
        walkTo: clampToRoom(brain.inFront(0.7)),
        onStart: () => brain.showEmote({ icon: '😳', kind: 'speech' }, 3),
      },
      { clip: 'sad', duration: 1.5, face: 'camera' },
    ],
  };
}

// ------------------------------------------------------------------ washing

export function wash(brain: PetBrain): Behavior {
  const bubbles = every(0.07, () => {
    const p = brain.headPosition(0.5);
    const r = 0.45 * brain.world.scale;
    fx.emit('bubble', brain.pos.x + (Math.random() - 0.5) * r * 2, p.y * (0.5 + Math.random()), brain.pos.z + (Math.random() - 0.5) * r * 2, 1);
  });
  const drops = every(0.04, () => {
    const p = brain.headPosition(0.5);
    fx.emit('drop', brain.pos.x, p.y, brain.pos.z, 2);
  });
  return {
    name: 'wash',
    busy: true,
    steps: [
      { clip: 'walk', walkTo: SPOTS.center.stand },
      { clip: 'scrub', duration: 3.2, face: 'camera', emote: { icon: '🫧', kind: 'speech' }, onUpdate: bubbles },
      { clip: 'shake', duration: 1.3, onUpdate: drops, onStart: () => sfx('shake') },
      {
        clip: 'happy',
        duration: 1,
        emote: { icon: '✨', kind: 'speech' },
        onStart: () => {
          const h = brain.headPosition();
          fx.emit('star', h.x, h.y, h.z, 6);
          sfx('sparkle');
        },
      },
    ],
  };
}

// ------------------------------------------------------------------ sleeping

export function sleep(brain: PetBrain): Behavior {
  const zzz = every(1.1, () => {
    const h = brain.headPosition(0.5);
    fx.emit('zzz', h.x, h.y + 0.15, h.z, 1);
    if (Math.random() < 0.5) say(brain, 'snore');
  });
  return {
    name: 'sleep',
    busy: true,
    steps: [
      { clip: 'walk', walkTo: SPOTS.bed.stand, emote: { icon: '🥱', kind: 'speech' } },
      { clip: 'sleep', face: SPOTS.bed.face, until: () => !brain.world.asleep, onUpdate: zzz },
    ],
  };
}

export function wake(brain: PetBrain): Behavior {
  return {
    name: 'wake',
    busy: false,
    steps: [
      { clip: 'shake', duration: 0.8, emote: { icon: '☀️', kind: 'speech' }, onStart: () => say(brain, 'boing') },
      { clip: 'happy', duration: 0.8, face: 'camera', onStart: () => joy(brain, 1) },
    ],
  };
}

/** Keeps the behaviour in sync with the persisted sleep state (also after offline catch-up). */
export function syncSleep(brain: PetBrain) {
  const name = brain.behavior?.name;
  if (brain.world.asleep && name !== 'sleep') brain.run(sleep(brain));
  else if (!brain.world.asleep && name === 'sleep') brain.run(wake(brain));
}

// ------------------------------------------------------------------ playing

const THROW_FROM = { x: 0, y: 1.6, z: 3.2 };

function ballPlay(brain: PetBrain, favorite: boolean): Behavior {
  const ball = props.ball;
  let flight = { t: 0, from: { ...THROW_FROM }, to: { x: 0, z: 0 }, dur: 1, active: false, carried: false };

  const throwBall = () => {
    const to = randomRoomPoint();
    flight = { t: 0, from: { ...THROW_FROM }, to, dur: 1.1, active: true, carried: false };
    ball.visible = true;
    sfx('whoosh');
  };
  const landing = (): Vec2 => flight.to;
  const catchStep = (): Step => ({
    clip: 'jump',
    duration: 0.9,
    onStart: () => {
      flight.active = false;
      flight.carried = true;
      say(brain, 'boing');
      joy(brain, 1);
    },
  });

  return {
    name: 'play-ball',
    busy: true,
    onUpdate: (dt) => {
      if (flight.active) {
        flight.t += dt;
        const k = Math.min(1, flight.t / flight.dur);
        ball.x = flight.from.x + (flight.to.x - flight.from.x) * k;
        ball.z = flight.from.z + (flight.to.z - flight.from.z) * k;
        // Arc plus two small bounces after landing
        ball.y = k < 1 ? flight.from.y * (1 - k) + Math.sin(k * Math.PI) * 1.2 + 0.12 : 0.12 + Math.abs(Math.sin((flight.t - flight.dur) * 9)) * 0.25 * Math.exp(-(flight.t - flight.dur) * 4);
      } else if (flight.carried) {
        const h = brain.headPosition(0.62);
        ball.x = h.x + Math.sin(brain.yaw) * 0.12;
        ball.y = h.y;
        ball.z = h.z + Math.cos(brain.yaw) * 0.12;
      }
    },
    cleanup: () => {
      ball.visible = false;
    },
    steps: [
      { clip: 'idle', duration: 0.3, face: 'camera', emote: { icon: '⚽', kind: 'thought' }, onStart: throwBall },
      { clip: 'run', walkTo: landing, run: true },
      catchStep(),
      { clip: 'walk', walkTo: SPOTS.center.stand, run: true },
      { clip: 'idle', duration: 0.3, face: 'camera', onStart: throwBall },
      { clip: 'run', walkTo: landing, run: true },
      catchStep(),
      { clip: 'walk', walkTo: SPOTS.center.stand },
      {
        clip: 'happy',
        duration: 1.4,
        face: 'camera',
        emote: { icon: favorite ? '😍' : '😄', kind: 'speech' },
        onStart: () => {
          ball.visible = false;
          joy(brain, favorite ? 6 : 3);
        },
      },
    ],
  };
}

function laserPlay(brain: PetBrain, favorite: boolean): Behavior {
  const laser = props.laser;
  let t = 0;
  const duration = 7;
  const dot = (): Vec2 => ({ x: laser.x, z: laser.z });
  return {
    name: 'play-laser',
    busy: true,
    onUpdate: (dt) => {
      t += dt;
      // Lissajous path with sudden direction changes
      laser.x = Math.sin(t * 1.3) * 1.9 + Math.sin(t * 3.7) * 0.3;
      laser.z = Math.sin(t * 0.9 + 1) * 1.2 + 0.1;
    },
    cleanup: () => {
      laser.visible = false;
    },
    steps: [
      {
        clip: 'pounce',
        duration: 0.6,
        face: dot,
        emote: { icon: '👀', kind: 'speech' },
        onStart: () => {
          laser.visible = true;
          sfx('zap');
        },
      },
      {
        clip: () => (Math.hypot(laser.x - brain.pos.x, laser.z - brain.pos.z) < 0.5 ? 'pounce' : 'run'),
        chase: dot,
        until: () => t > duration,
        onUpdate: every(1.1, () => {
          if (Math.hypot(laser.x - brain.pos.x, laser.z - brain.pos.z) < 0.5) say(brain, 'boing');
        }),
      },
      {
        clip: 'happy',
        duration: 1.4,
        face: 'camera',
        emote: { icon: favorite ? '😻' : '😄', kind: 'speech' },
        onStart: () => {
          laser.visible = false;
          joy(brain, favorite ? 6 : 3);
        },
      },
    ],
  };
}

function featherPlay(brain: PetBrain, favorite: boolean): Behavior {
  const feather = props.feather;
  let t = 0;
  let anchor: Vec2 = { x: 0, z: 0 };
  return {
    name: 'play-feather',
    busy: true,
    onUpdate: (dt) => {
      t += dt;
      feather.x = anchor.x + Math.sin(t * 2.2) * 0.35;
      feather.z = anchor.z;
      feather.y = 0.9 * brain.world.scale + 0.25 + Math.abs(Math.sin(t * 3.1)) * 0.3;
    },
    cleanup: () => {
      feather.visible = false;
    },
    steps: [
      { clip: 'walk', walkTo: SPOTS.center.stand },
      {
        clip: 'idle',
        duration: 0.4,
        face: 'camera',
        onStart: () => {
          anchor = clampToRoom({ x: brain.pos.x, z: brain.pos.z + 0.55 });
          feather.visible = true;
        },
      },
      { clip: 'jump', duration: 1.8, face: () => ({ x: feather.x, z: feather.z }), onUpdate: every(0.9, () => say(brain, 'boing')) },
      { clip: 'pounce', duration: 1.1, face: () => ({ x: feather.x, z: feather.z }) },
      { clip: 'jump', duration: 1.8, face: () => ({ x: feather.x, z: feather.z }), onUpdate: every(0.9, () => say(brain, 'boing')) },
      {
        clip: 'happy',
        duration: 1.4,
        face: 'camera',
        emote: { icon: favorite ? '😍' : '😄', kind: 'speech' },
        onStart: () => {
          feather.visible = false;
          joy(brain, favorite ? 6 : 3);
        },
      },
    ],
  };
}

export function play(brain: PetBrain, toy: ToyId, favorite: boolean): Behavior {
  switch (toy) {
    case 'laser':
      return laserPlay(brain, favorite);
    case 'feather':
      return featherPlay(brain, favorite);
    default:
      return ballPlay(brain, favorite);
  }
}

// ------------------------------------------------------------------ affection & reactions

export function stroke(brain: PetBrain): Behavior {
  brain.extendStroke(1.6);
  const hearts = every(0.35, () => {
    const h = brain.headPosition();
    fx.emit('heart', h.x, h.y + 0.15, h.z, 1);
  });
  const coo = every(0.9, () => say(brain, 'heart'));
  return {
    name: 'stroke',
    busy: false,
    steps: [
      {
        clip: 'nuzzle',
        face: 'camera',
        until: () => !brain.stroking,
        onUpdate: (t, dt) => {
          hearts(t, dt);
          coo(t, dt);
        },
        emote: { icon: '🥰', kind: 'speech' },
      },
    ],
  };
}

export function boop(brain: PetBrain): Behavior {
  return {
    name: 'boop',
    busy: false,
    steps: [{ clip: 'hop', duration: 0.55, face: 'camera', onStart: () => say(brain, 'pop'), emote: { icon: brain.world.happiness > 0.5 ? '😊' : '❓', kind: 'speech' } }],
  };
}

export function refuse(brain: PetBrain): Behavior {
  return {
    name: 'refuse',
    busy: false,
    steps: [{ clip: 'refuse', duration: 1.2, face: 'camera', onStart: () => say(brain, 'refuse'), emote: { icon: '🙅', kind: 'speech' } }],
  };
}

export function celebrate(brain: PetBrain): Behavior {
  return {
    name: 'celebrate',
    busy: false,
    steps: [
      {
        clip: 'happy',
        duration: 2,
        face: 'camera',
        emote: { icon: '🎉', kind: 'speech' },
        onStart: () => {
          const h = brain.headPosition();
          fx.emit('confetti', h.x, h.y + 0.6, h.z, 40);
          sfx('fanfare');
        },
      },
    ],
  };
}

/** Maps game events to behaviours. */
export function handleGameEvent(brain: PetBrain, e: GameEvent) {
  switch (e.type) {
    case 'feed':
      brain.run(eat(brain, e.food, e.favorite));
      break;
    case 'refuse':
      if (!brain.busy) brain.run(refuse(brain));
      break;
    case 'play':
      brain.run(play(brain, e.toy, e.favorite));
      break;
    case 'toilet':
      brain.run(toilet(brain));
      break;
    case 'accident':
      brain.run(accident(brain));
      break;
    case 'wash':
      brain.run(wash(brain));
      break;
    case 'stroke': {
      const h = brain.headPosition();
      fx.emit('heart', h.x, h.y + 0.2, h.z, 1);
      if (brain.world.asleep || brain.busy) return;
      if (brain.behavior?.name === 'stroke') brain.extendStroke(1.6);
      else brain.run(stroke(brain));
      break;
    }
    case 'clean':
      sfx('sparkle');
      if (!brain.busy) brain.showEmote({ icon: '✨', kind: 'speech' }, 1.5);
      break;
    case 'stageUp':
      if (!brain.busy) brain.run(celebrate(brain));
      break;
    case 'sleep':
    case 'wake':
      // handled state-driven by syncSleep
      break;
    case 'coins':
      sfx('coin');
      break;
  }
}

export { hideAllProps };
