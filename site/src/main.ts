import './styles.css';

import { initializeLocale, t } from './i18n';
import { CalculatorPool } from './worker-client';
import { mountCalculator } from './ui';
import type { CharacterMeta, RuntimeManifest, SettingsCatalog } from './types';

initializeLocale();
document.title = t('meta.title');
document.querySelector<HTMLMetaElement>('meta[name="description"]')
  ?.setAttribute('content', t('meta.description'));
document.querySelector<HTMLMetaElement>('meta[property="og:locale"]')
  ?.setAttribute('content', document.documentElement.lang === 'zh-TW' ? 'zh_TW' : 'ko_KR');
document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
  ?.setAttribute('content', t('meta.title'));
document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
  ?.setAttribute('content', t('meta.ogDescription'));
document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')
  ?.setAttribute('content', t('meta.title'));
document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')
  ?.setAttribute('content', t('meta.twitterDescription'));

const rootCandidate = document.querySelector<HTMLElement>('#app');
if (!rootCandidate) throw new Error(t('app.missingRoot'));
const root: HTMLElement = rootCandidate;

root.innerHTML = `<div class="boot-screen"><span></span><p>${t('app.loading')}</p></div>`;

async function start(): Promise<void> {
  const [catalogResponse, manifestResponse, settingsResponse] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}catalog.json`),
    fetch(`${import.meta.env.BASE_URL}runtime/manifest.json`),
    fetch(`${import.meta.env.BASE_URL}settings.json`),
  ]);
  if (!catalogResponse.ok || !manifestResponse.ok || !settingsResponse.ok) {
    throw new Error(t('app.dataLoadFailed'));
  }
  const catalog = await catalogResponse.json() as CharacterMeta[];
  const manifest = await manifestResponse.json() as RuntimeManifest;
  const settings = await settingsResponse.json() as SettingsCatalog;
  const client = new CalculatorPool();
  const cleanup = mountCalculator(root, {
    catalog,
    settings,
    version: manifest.version,
    client,
    storage: () => window.localStorage,
  });
  window.addEventListener('pagehide', cleanup, { once: true });
}

start().catch((error: unknown) => {
  root.replaceChildren();
  const box = document.createElement('section');
  box.className = 'fatal-error';
  const title = document.createElement('h1');
  title.textContent = t('app.startFailed');
  const message = document.createElement('p');
  message.textContent = error instanceof Error ? error.message : String(error);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = t('app.retry');
  retry.addEventListener('click', () => window.location.reload());
  box.append(title, message, retry);
  root.append(box);
});
