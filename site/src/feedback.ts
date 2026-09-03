/**
 * 피드백 게시판 — 올린 글은 모두에게 보이고, 관리자가 상태를 옮긴다.
 *
 * 화면을 그리는 일은 `ui.ts`가 하고, 여기에는 **그리지 않아도 답이 정해지는 것**만
 * 둔다: 상태의 차례, 목록을 세우는 순서, 그리고 「진행중」을 AI에게 그대로 넘길 수 있는
 * 글로 바꾸는 일.
 */

import type { FeedbackItem, FeedbackKind, FeedbackStatus } from './share-server';
import { t } from './i18n';

export const FEEDBACK_KINDS: FeedbackKind[] = ['bug', 'idea', 'etc'];
export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  bug: '버그', idea: '건의', etc: '기타',
};

const FEEDBACK_KIND_KEYS = {
  bug: 'feedback.bug', idea: 'feedback.idea', etc: 'feedback.etc',
} as const satisfies Record<FeedbackKind, Parameters<typeof t>[0]>;
const feedbackKindLabel = (kind: FeedbackKind): string => t(FEEDBACK_KIND_KEYS[kind]);

/**
 * 접수 → 진행중 → 완료 / 불가능.
 *
 * 「불가능」을 끝에 두는 것은 «안 한다»가 결론인 글도 남겨 두기 위해서다 — 지우면
 * 같은 이야기가 다시 올라온다.
 */
export const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'doing', 'done', 'wont'];
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: '접수', doing: '진행중', done: '완료', wont: '불가능',
};

/** 상태 차례로, 같은 상태 안에서는 새로 올라온 것이 위로. */
export function sortFeedback(items: FeedbackItem[]): FeedbackItem[] {
  return [...items].sort((a, b) => FEEDBACK_STATUSES.indexOf(a.status) - FEEDBACK_STATUSES.indexOf(b.status)
    || b.at.localeCompare(a.at));
}

export const countByStatus = (items: FeedbackItem[]): Record<FeedbackStatus, number> => {
  const counts = { new: 0, doing: 0, done: 0, wont: 0 };
  for (const item of items) if (item.status in counts) counts[item.status] += 1;
  return counts;
};

/** 목록에 적는 날짜. 시각까지는 필요 없다. */
export const feedbackDate = (iso: string): string => (iso ? iso.slice(0, 10) : '');

/**
 * 「진행중」을 AI에게 그대로 넘길 수 있는 글로.
 *
 * 게시판을 눈으로 옮겨 적는 일을 없애려는 것이라, **그대로 붙여 넣으면 일이 되도록**
 * 적는다 — 무엇을 하는 파일인지 한 줄로 밝히고, 항목마다 종류·날짜를 붙여 번호를 매긴다.
 * 여러 줄로 쓴 글도 있으므로 본문은 인용 부호 없이 그대로 싣는다.
 */
export function doingPrompt(items: FeedbackItem[], at = new Date()): string {
  const doing = sortFeedback(items.filter((item) => item.status === 'doing'));
  const stamp = feedbackDate(at.toISOString());
  const head = [
    t('feedback.promptTitle', { count: doing.length, date: stamp }),
    '',
    t('feedback.promptIntro'),
    t('feedback.promptAction'),
  ];
  if (doing.length === 0) {
    return [...head, '', t('feedback.promptEmpty'), ''].join('\n');
  }
  const body = doing.map((item, index) => [
    '',
    `## ${index + 1}. [${feedbackKindLabel(item.kind)}] ${feedbackDate(item.at)}`
      + `${item.by ? ` · ${item.by}` : ''}`,
    '',
    item.text,
  ].join('\n'));
  return [...head, ...body, ''].join('\n');
}

export const feedbackFileName = (at = new Date()): string => {
  const stamp = [at.getFullYear(), at.getMonth() + 1, at.getDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, '0'))).join('');
  return t('feedback.fileName', { stamp });
};

export const textBlob = (text: string): Blob =>
  new Blob([text], { type: 'text/plain;charset=utf-8' });
