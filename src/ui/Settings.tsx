import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { notificationsSupported, requestNotificationPermission } from './notifications';
import { Sheet } from './Sheet';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let deferredInstall: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e as BeforeInstallPromptEvent;
  });
}

export function Settings() {
  const name = useGameStore((s) => s.pet?.name ?? '');
  const enabled = useGameStore((s) => s.settings.notifications);
  const [denied, setDenied] = useState(false);
  const [canInstall, setCanInstall] = useState(!!deferredInstall);

  useEffect(() => {
    const on = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  const toggleNotifications = async () => {
    if (enabled) {
      useGameStore.getState().setSettings({ notifications: false });
      return;
    }
    const ok = await requestNotificationPermission();
    setDenied(!ok);
    useGameStore.getState().setSettings({ notifications: ok });
  };

  const reset = () => {
    if (window.confirm(t('settings.resetConfirm', { name }))) {
      useGameStore.getState().reset();
      useUiStore.getState().openPanel(null);
    }
  };

  return (
    <Sheet title={t('settings.title')}>
      <div className="space-y-3">
        {notificationsSupported() && (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <div className="font-extrabold">{t('settings.notifications')}</div>
              <div className="text-xs font-bold text-slate-400">{denied ? t('settings.notificationsDenied') : t('settings.notificationsHint', { name })}</div>
            </div>
            <input type="checkbox" checked={enabled} onChange={toggleNotifications} className="h-6 w-6 accent-pink-500" />
          </label>
        )}
        {canInstall && (
          <button
            onClick={async () => {
              await deferredInstall?.prompt();
              deferredInstall = null;
              setCanInstall(false);
            }}
            className="flex w-full items-center gap-3 rounded-2xl bg-sky-50 p-3 text-left font-extrabold active:scale-95"
          >
            <span className="text-2xl">📲</span> {t('settings.install')}
          </button>
        )}
        <button onClick={reset} className="flex w-full items-center gap-3 rounded-2xl bg-rose-50 p-3 text-left font-extrabold text-rose-600 active:scale-95">
          <span className="text-2xl">🐣</span> {t('settings.reset')}
        </button>
        <p className="pt-2 text-center text-xs font-bold text-slate-400">{t('hint.camera')}</p>
      </div>
    </Sheet>
  );
}
