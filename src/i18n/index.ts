import { de, type MessageKey, type Messages } from './de';

/** Add new locales here, e.g. `en: () => import('./en')`. */
const locales: Record<string, Messages> = { de };

let current: Messages = de;
let currentLocale = 'de';

export function setLocale(locale: string) {
  const base = locale.split('-')[0];
  current = locales[base] ?? de;
  currentLocale = locales[base] ? base : 'de';
}

export function getLocale() {
  return currentLocale;
}

/** Translates a key and replaces `{placeholders}`. */
export function t(key: MessageKey | string, vars: Record<string, string | number> = {}): string {
  const template = (current as Record<string, string>)[key] ?? (de as Record<string, string>)[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export type { MessageKey };
