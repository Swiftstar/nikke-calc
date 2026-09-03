// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { parseCustomInput } from './custom-nikke';
import { formatEok } from './enikk';
import { doingPrompt } from './feedback';
import { visionSummary } from './fun-vision';
import { setLocale } from './i18n';
import { decodeShareCode } from './share-code';
import { agoText } from './share-panel';
import { summarizeSquad } from './share-server';
import { humanSeconds } from './union-raid';

afterEach(() => setLocale('ko'));

describe.each([
  {
    locale: 'ko' as const,
    ago: '1시간 전',
    duration: '1분 20초',
    eok: '62.5억',
    squad: '라피',
    customError: 'JSON 형식이 아닙니다.',
    shareError: '공유 코드를 입력해 주세요.',
    prompt: '진행중 피드백 0건',
    vision: '1명 · 우월 코드 합계 88.6% · 1등 라피 88.6%',
  },
  {
    locale: 'zh-TW' as const,
    ago: '1 小時前',
    duration: '1 分 20 秒',
    eok: '62.5 億',
    squad: '拉毗',
    customError: '內容不是 JSON 格式',
    shareError: '請輸入分享代碼。',
    prompt: '處理中意見 0 項',
    vision: '1 人 · 優越屬性總和 88.6% · 第 1 名 拉毗 88.6%',
  },
])('$locale production strings', ({
  locale, ago, duration, eok, squad, customError, shareError, prompt, vision,
}) => {
  it('localizes time, summaries, errors, and generated downloads', () => {
    setLocale(locale);
    const now = Date.parse('2026-08-26T12:00:00.000Z');
    expect(agoText('2026-08-26T11:00:00.000Z', now)).toBe(ago);
    expect(humanSeconds(80)).toBe(duration);
    expect(formatEok(6_254_535_716)).toBe(eok);
    expect(summarizeSquad([{ squad: ['라피'] }], false)).toBe(squad);
    expect(() => parseCustomInput('not json')).toThrow(customError);
    expect(() => decodeShareCode('')).toThrow(shareError);
    expect(doingPrompt([])).toContain(prompt);
    expect(visionSummary([
      { name: '라피', value: 88.6, share: 1 },
    ], 'element')).toBe(vision);
  });
});
