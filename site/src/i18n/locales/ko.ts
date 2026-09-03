export const ko = {
  'app.missingRoot': '앱을 표시할 영역이 없습니다.',
  'app.loading': '계산기 데이터를 불러오는 중…',
  'app.dataLoadFailed': '캐릭터 데이터를 불러오지 못했습니다.',
  'app.startFailed': '계산기를 시작하지 못했습니다.',
  'app.retry': '다시 시도',
  'meta.title': 'NIKKE 스쿼드 계산기',
  'meta.description': '브라우저에서 실행되는 비공식 NIKKE 5인 스쿼드 대미지 계산기',
} as const;

export type MessageKey = keyof typeof ko;
export type MessageCatalog = Record<MessageKey, string>;
