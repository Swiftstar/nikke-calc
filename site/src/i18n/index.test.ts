// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  availableLocales,
  displayCharacterName,
  displayCubeName,
  displayFavoriteItemName,
  getLocale,
  initializeLocale,
  resolveLocale,
  setLocale,
  t,
} from './index';
import { characterNamesZhTW } from './character-names-zh-tw';
import { cubeNamesZhTW, favoriteItemNamesZhTW } from './equipment-names-zh-tw';

afterEach(() => {
  vi.unstubAllGlobals();
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

  it('enables the complete zh-TW UI and display-name catalogs', () => {
    expect(availableLocales()).toEqual(['ko', 'zh-TW']);
    expect(setLocale('zh-TW')).toBe('zh-TW');
    expect(getLocale()).toBe('zh-TW');
    expect(document.documentElement.lang).toBe('zh-TW');
    expect(t('app.retry')).toBe('重試');
    expect(t('element.fire')).toBe('燃燒');
  });

  it('persists an explicitly selected locale', () => {
    setLocale('ko', true);
    expect(window.localStorage.getItem('nikke-locale-v1')).toBe('ko');
  });

  it('selects Traditional Chinese for a zh-HK browser', () => {
    vi.stubGlobal('navigator', { languages: ['zh-HK', 'en-US'] });
    expect(initializeLocale()).toBe('zh-TW');
    expect(document.documentElement.lang).toBe('zh-TW');
    expect(t('nav.calculator')).toBe('計算機');
    expect(t('feedback.posted')).toContain('已送出');
    expect(t('slot.duplicate', { name: '麗塔', slot: 1 })).toBe('麗塔已在第 1 格。');
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

describe('official character-settings display names', () => {
  it('covers every canonical cube and favorite-item name', () => {
    const cubes = JSON.parse(readFileSync(
      resolve(process.cwd(), '../data/base_stat_tables/cube.json'),
      'utf8',
    )) as Record<string, unknown>;
    const canonicalCubes = Object.keys(cubes)
      .filter((name) => !name.startsWith('_') && name !== '공통');
    expect(canonicalCubes.filter((name) => !cubeNamesZhTW[name])).toEqual([]);
    expect(Object.keys(cubeNamesZhTW)).toHaveLength(canonicalCubes.length);

    const characters = JSON.parse(readFileSync(
      resolve(process.cwd(), '../scraper/nikke_scraped.json'),
      'utf8',
    )) as Record<string, { 애장품?: { 아이템명?: string } }>;
    const canonicalFavorites = Object.values(characters)
      .flatMap((character) => character.애장품?.아이템명 ?? []);
    expect(canonicalFavorites.filter((name) => !favoriteItemNamesZhTW[name])).toEqual([]);
    expect(Object.keys(favoriteItemNamesZhTW)).toHaveLength(canonicalFavorites.length);
  });

  it('uses official zh-TW labels without changing canonical keys', () => {
    expect(displayCubeName('렐릭 베어 큐브')).toBe('렐릭 베어 큐브');
    expect(displayFavoriteItemName('기념 열쇠고리')).toBe('기념 열쇠고리');
    setLocale('zh-TW');
    expect(displayCubeName('렐릭 베어 큐브')).toBe('遺跡巨熊魔方');
    expect(displayFavoriteItemName('기념 열쇠고리')).toBe('紀念鑰匙圈');
  });

  it('falls back to Korean canonical labels for unknown records', () => {
    setLocale('zh-TW');
    expect(displayCubeName('새 큐브')).toBe('새 큐브');
    expect(displayFavoriteItemName('새 애장품')).toBe('새 애장품');
  });
});
