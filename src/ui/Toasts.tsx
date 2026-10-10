import { useUiStore } from '../store/uiStore';

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-36 z-40 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className="animate-pop pointer-events-auto max-w-sm rounded-2xl bg-slate-800/90 px-4 py-2 text-center text-sm font-bold text-white shadow-lg"
        >
          {toast.text}
        </button>
      ))}
    </div>
  );
}
