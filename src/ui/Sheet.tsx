import type { ReactNode } from 'react';
import { t } from '../i18n';
import { useUiStore } from '../store/uiStore';

/** Bottom sheet on phones, centered card on larger screens. */
export function Sheet({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  const close = () => useUiStore.getState().openPanel(null);
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-slate-900/30 sm:items-center" onClick={close}>
      <div
        className={`animate-sheet pb-safe max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800">{title}</h2>
          <button onClick={close} aria-label={t('settings.close')} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg active:scale-90">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
