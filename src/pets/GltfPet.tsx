import { useAnimations, useGLTF } from '@react-three/drei';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PetModelConfig } from '../game/pets.config';
import type { RigHandle } from './rig';

const FADE = 0.3;

/**
 * GLB based pet. Maps the brain's logical clip to the model's animation clips and
 * crossfades between them. Movement (position/rotation) still comes from the brain.
 */
export const GltfPet = forwardRef<RigHandle, { model: PetModelConfig }>(function GltfPet({ model }, ref) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(model.url);
  const object = useMemo(() => {
    const c = clone(scene);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return c;
  }, [scene]);
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
    </group>
  );
});
