// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  availableLocales,
  displayCharacterName,
  getLocale,
  resolveLocale,
  setLocale,
  t,
} from './index';
import { characterNamesZhTW } from './character-names-zh-tw';

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

  it('enables the zh-TW display-name layer while UI messages fall back to Korean', () => {
    expect(availableLocales()).toEqual(['ko', 'zh-TW']);
    expect(setLocale('zh-TW')).toBe('zh-TW');
    expect(getLocale()).toBe('zh-TW');
    expect(document.documentElement.lang).toBe('zh-TW');
    expect(t('app.retry')).toBe('다시 시도');
  });

  it('persists an explicitly selected locale', () => {
    setLocale('ko', true);
    expect(window.localStorage.getItem('nikke-locale-v1')).toBe('ko');
  });
});

describe('official character display names', () => {
  it('covers every Korean canonical key in nikke_scraped.json', () => {
    const source = JSON.parse(readFileSync(
      resolve(process.cwd(), '../scraper/nikke_scraped.json'),
      'utf8',
    )) as Record<string, unknown>;
    const missing = Object.keys(source).filter((name) => !characterNamesZhTW[name]);
    expect(missing).toEqual([]);
    expect(Object.keys(characterNamesZhTW)).toHaveLength(Object.keys(source).length);
  });

  it('uses official zh-TW labels only when zh-TW is active', () => {
    expect(displayCharacterName('라피')).toBe('라피');
    setLocale('zh-TW');
    expect(displayCharacterName('라피')).toBe('拉毗');
    expect(displayCharacterName('라피 : 레드 후드')).toBe('拉毗：小紅帽');
  });

  it('falls back to the Korean key for unmapped and custom characters', () => {
    setLocale('zh-TW');
    expect(displayCharacterName('커스텀 니케')).toBe('커스텀 니케');
  });
});
