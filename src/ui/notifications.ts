import { useEffect, useRef } from 'react';
import { getMood } from '../game/mood';
import { PETS } from '../game/pets.config';
import type { Mood } from '../game/types';
import { t } from '../i18n';
import { useGameStore } from '../store/gameStore';

const URGENT: Mood[] = ['needsToilet', 'hungry', 'sick', 'tired', 'bored', 'dirty'];
const COOLDOWN_MS = 30 * 60 * 1000;

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

async function show(title: string, body: string) {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  const options: NotificationOptions = { body, icon: '/pwa-192.png', badge: '/pwa-192.png', tag: 'petpal-need' };
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

/**
 * Local notifications while the app runs in the background (tab hidden / PWA minimised).
 * Real server push would need a backend; this covers the common "app in background" case.
 */
export function useNeedNotifications() {
  const lastSent = useRef<Partial<Record<Mood, number>>>({});

  useEffect(
    () =>
      useGameStore.subscribe((state) => {
        if (!state.settings.notifications || !state.pet || !notificationsSupported()) return;
        if (Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
        const mood = getMood(state.pet, PETS[state.pet.species]);
        if (!URGENT.includes(mood)) return;
        const now = Date.now();
        if (now - (lastSent.current[mood] ?? 0) < COOLDOWN_MS) return;
        lastSent.current[mood] = now;
        void show('PetPal 3D', t(`notify.${mood}`, { name: state.pet.name }));
      }),
    [],
  );
}
