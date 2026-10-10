import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { gameEvents } from '../game/events';
import { getMood, happiness } from '../game/mood';
import { PETS } from '../game/pets.config';
import { STAGE_SCALE, stageForAge } from '../game/progression';
import type { SpeciesId } from '../game/types';
import { setPetPositionProvider, useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { boop, handleGameEvent, installSpeciesHooks, syncSleep } from './behaviors';
import { EmoteBubble } from './EmoteBubble';
import { fx } from './fx';
import { GltfPet } from './GltfPet';
import { PetBrain } from './PetBrain';
import { PlaceholderPet } from './PlaceholderPet';
import type { RigHandle } from './rig';
import { runtime } from './runtime';
import { hideAllProps } from './props';

const STROKE_PIXELS = 80;
const STROKE_COOLDOWN = 0.5;

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface PetProps {
  species: SpeciesId;
  /** Onboarding preview: no game state, just a happy idle pet. */
  preview?: boolean;
}

/**
 * Encapsulates a pet: behaviour brain + model (GLB if configured, primitives otherwise)
 * + interaction (stroke by dragging, tap to boop).
 */
export function Pet({ species, preview = false }: PetProps) {
  const cfg = PETS[species];
  const brain = useMemo(() => {
    const b = new PetBrain(cfg);
    installSpeciesHooks(b);
    return b;
  }, [cfg]);

  const stage = useGameStore((s) => (s.pet && !preview ? stageForAge(s.lastTick - s.pet.bornAt) : 'child'));
  const accessory = useGameStore((s) => (preview ? null : s.equipped.accessory));

  const group = useRef<THREE.Group>(null);
  const scaled = useRef<THREE.Group>(null);
  const emoteAnchor = useRef<THREE.Group>(null);
  const rig = useRef<RigHandle>(null);
  const strokeState = useRef({ active: false, x: 0, y: 0, dist: 0, total: 0, last: -10 });

  useEffect(() => {
    runtime.brain = brain;
    setPetPositionProvider(() => ({ x: brain.pos.x, z: brain.pos.z }));
    if (preview) return;
    const unsub = gameEvents.subscribe((e) => handleGameEvent(brain, e));
    return () => {
      unsub();
      brain.stop();
      hideAllProps();
      if (runtime.brain === brain) runtime.brain = null;
    };
  }, [brain, preview]);

  // Stroking: drag across the pet. Tracked on window so fast swipes are not lost.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const st = strokeState.current;
      if (!st.active) return;
      const d = Math.hypot(e.clientX - st.x, e.clientY - st.y);
      st.x = e.clientX;
      st.y = e.clientY;
      st.dist += d;
      st.total += d;
      if (st.dist > STROKE_PIXELS && brain.clock - st.last > STROKE_COOLDOWN) {
        st.dist = 0;
        st.last = brain.clock;
        if (preview) {
          const h = brain.headPosition();
          fx.emit('heart', h.x, h.y + 0.2, h.z, 1);
        } else {
          useGameStore.getState().stroke();
        }
      }
    };
    const up = () => {
      const st = strokeState.current;
      if (!st.active) return;
      st.active = false;
      if (runtime.controls) runtime.controls.enabled = true;
      if (st.total < 8 && !brain.busy && !brain.world.asleep) brain.run(boop(brain));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [brain, preview]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const st = strokeState.current;
    st.active = true;
    st.x = e.nativeEvent.clientX;
    st.y = e.nativeEvent.clientY;
    st.dist = 0;
    st.total = 0;
    if (runtime.controls) runtime.controls.enabled = false;
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const pet = useGameStore.getState().pet;
    const targetScale = STAGE_SCALE[stage];

    if (pet && !preview) {
      brain.world = {
        mood: getMood(pet, cfg),
        happiness: happiness(pet),
        asleep: pet.asleep,
        stage,
        scale: targetScale,
      };
      syncSleep(brain);
    } else {
      brain.world = { mood: 'happy', happiness: 0.9, asleep: false, stage, scale: targetScale };
    }

    brain.update(dt);

    const g = group.current;
    if (g) {
      g.position.set(brain.pos.x, 0, brain.pos.z);
      g.rotation.y = brain.yaw;
    }
    const s = scaled.current;
    if (s) {
      const k = 1 - Math.exp(-3 * dt);
      s.scale.setScalar(s.scale.x + (targetScale - s.scale.x) * k);
      if (emoteAnchor.current) {
        emoteAnchor.current.position.set(brain.pos.x, (cfg.look.legs === 2 ? 1.55 : 1.35) * s.scale.x + brain.pose.bodyY, brain.pos.z);
      }
    }
    rig.current?.apply(brain, dt);

    const ui = useUiStore.getState();
    ui.setBusy(brain.busy || brain.world.asleep);
    ui.setEmote(brain.currentEmote());
  });

  const placeholder = <PlaceholderPet ref={rig} cfg={cfg} stage={stage} accessory={accessory} />;

  return (
    <>
      <group ref={group} onPointerDown={onPointerDown}>
        <group ref={scaled} scale={STAGE_SCALE[stage]}>
          {cfg.model ? (
            <ModelBoundary fallback={placeholder}>
              <Suspense fallback={placeholder}>
                <GltfPet ref={rig} model={cfg.model} />
              </Suspense>
            </ModelBoundary>
          ) : (
            placeholder
          )}
          {/* Invisible, generous hit area so stroking is easy on phones */}
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>
      <group ref={emoteAnchor}>
        <EmoteBubble />
      </group>
    </>
  );
}
