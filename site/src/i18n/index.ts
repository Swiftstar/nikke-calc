import { ko, type MessageCatalog, type MessageKey } from './locales/ko';

export type Locale = 'ko' | 'zh-TW' | 'zh-CN';

const FALLBACK_LOCALE: Locale = 'ko';
const STORAGE_KEY = 'nikke-locale-v1';
const catalogs: Partial<Record<Locale, MessageCatalog>> = { ko };
let activeLocale: Locale = FALLBACK_LOCALE;

const localeAliases: Record<string, Locale> = {
  ko: 'ko',
  'ko-kr': 'ko',
  'zh-tw': 'zh-TW',
  'zh-hant': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-mo': 'zh-TW',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-sg': 'zh-CN',
};

export function registerMessages(locale: Locale, messages: MessageCatalog): void {
  catalogs[locale] = messages;
}

export function availableLocales(): Locale[] {
  return (Object.keys(catalogs) as Locale[]).filter((locale) => catalogs[locale]);
}

export function resolveLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const normalized = value.trim().replaceAll('_', '-').toLowerCase();
  return localeAliases[normalized] ?? localeAliases[normalized.split('-')[0]!] ?? null;
}

export function setLocale(locale: Locale, persist = false): Locale {
  activeLocale = catalogs[locale] ? locale : FALLBACK_LOCALE;
  document.documentElement.lang = activeLocale;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, activeLocale);
    } catch {
      // 브라우저가 저장소를 막아도 현재 탭의 언어 전환은 유지한다.
    }
  }
  return activeLocale;
}

export function initializeLocale(): Locale {
  const queryLocale = resolveLocale(new URLSearchParams(window.location.search).get('lang'));
  let storedLocale: Locale | null = null;
  try {
    storedLocale = resolveLocale(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // 시크릿 모드·보안 설정으로 localStorage가 막힌 경우 브라우저 언어로 이어 간다.
  }
  const browserLocale = navigator.languages
    .map(resolveLocale)
    .find((locale): locale is Locale => locale !== null);
  return setLocale(queryLocale ?? storedLocale ?? browserLocale ?? FALLBACK_LOCALE);
}

export function getLocale(): Locale {
  return activeLocale;
}

export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  const template = catalogs[activeLocale]?.[key] ?? ko[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(activeLocale, options).format(value);
}

export function formatDate(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(activeLocale, options).format(value);
}
