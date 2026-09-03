// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import {
  availableLocales,
  getLocale,
  resolveLocale,
  setLocale,
  t,
} from './index';

afterEach(() => {
  window.localStorage.clear();
  setLocale('ko');
});

describe('locale resolution', () => {
  it('maps regional Chinese browser locales to the intended catalogs', () => {
    expect(resolveLocale('zh-HK')).toBe('zh-TW');
    expect(resolveLocale('zh_Hant')).toBe('zh-TW');
    expect(resolveLocale('zh-CN')).toBe('zh-CN');
    expect(resolveLocale('ko-KR')).toBe('ko');
  });

  it('falls back to Korean until a requested catalog is registered', () => {
    expect(availableLocales()).toEqual(['ko']);
    expect(setLocale('zh-TW')).toBe('ko');
    expect(getLocale()).toBe('ko');
    expect(document.documentElement.lang).toBe('ko');
    expect(t('app.retry')).toBe('다시 시도');
  });

  it('persists an explicitly selected locale', () => {
    setLocale('ko', true);
    expect(window.localStorage.getItem('nikke-locale-v1')).toBe('ko');
  });
});
