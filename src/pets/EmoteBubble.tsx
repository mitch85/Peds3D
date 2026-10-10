import { Html } from '@react-three/drei';
import { useUiStore } from '../store/uiStore';

/** Thought / speech bubble above the pet's head. */
export function EmoteBubble() {
  const emote = useUiStore((s) => s.emote);
  return (
    <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className={`select-none transition-all duration-300 ${emote ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        style={{ transformOrigin: 'bottom center' }}
      >
        {emote && (
          <div className="relative">
            <div
              className={`flex h-12 min-w-12 items-center justify-center rounded-full bg-white/95 px-2 text-2xl shadow-lg ring-2 ${
                emote.kind === 'thought' ? 'ring-sky-200' : 'ring-pink-200'
              }`}
            >
              {emote.icon}
            </div>
            {emote.kind === 'thought' ? (
              <>
                <div className="absolute -bottom-2 left-3 h-3 w-3 rounded-full bg-white/95 ring-2 ring-sky-200" />
                <div className="absolute -bottom-4 left-1 h-1.5 w-1.5 rounded-full bg-white/95 ring-2 ring-sky-200" />
              </>
            ) : (
              <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white/95" />
            )}
          </div>
        )}
      </div>
    </Html>
  );
}
