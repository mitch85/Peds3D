import { useAnimations, useGLTF } from '@react-three/drei';
import { createPortal } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PetModelConfig } from '../game/pets.config';
import type { AccessoryId } from '../game/types';
import { Accessory } from './Accessory';
import type { RigHandle } from './rig';

const FADE = 0.3;

/**
 * GLB based pet. Maps the brain's logical clip to the model's animation clips and
 * crossfades between them. Movement (position/rotation) still comes from the brain.
 */
interface Props {
  model: PetModelConfig;
  accessory: AccessoryId | null;
  biped: boolean;
}

export const GltfPet = forwardRef<RigHandle, Props>(function GltfPet({ model, accessory, biped }, ref) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(model.url);
  const object = useMemo(() => {
    const c = clone(scene);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return c;
  }, [scene]);
  const head = useMemo(() => (model.headBone ? object.getObjectByName(model.headBone) ?? null : null), [object, model.headBone]);
  const { actions } = useAnimations(animations, group);
  const current = useRef<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      apply(brain) {
        const name = model.clips[brain.activeClip] ?? model.clips.idle ?? null;
        if (name && name !== current.current) {
          const next = actions[name];
          const prev = current.current ? actions[current.current] : null;
          next?.reset().setEffectiveWeight(1).fadeIn(FADE).play();
          prev?.fadeOut(FADE);
          current.current = name;
        }
        if (group.current) group.current.position.y = brain.pose.bodyY;
      },
    }),
    [actions, model],
  );

  return (
    <group ref={group}>
      <primitive object={object} scale={model.scale} />
      {head &&
        accessory &&
        createPortal(
          <group position={model.accessoryOffset ?? [0, 0, 0]} scale={model.accessoryScale ?? 1}>
            <Accessory id={accessory} biped={biped} />
          </group>,
          head,
        )}
    </group>
  );
});
