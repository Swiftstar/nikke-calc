import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from '../../worker/src/index.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BlablaLink Worker server selection', () => {
  it('수동 서버를 고르면 그 지역만 상류 API에 요청한다', async () => {
    const requestedAreas = [];
    vi.stubGlobal('fetch', async (url, init) => {
      const body = JSON.parse(init.body);
      requestedAreas.push(body.nikke_area_id);
      const route = String(url);
      if (route.endsWith('Game/GetUserCharacters')) {
        return Response.json({ code: 0, data: { characters: [{ name_code: 5001 }] } });
      }
      if (route.endsWith('Game/GetUserCharacterDetails')) {
        return Response.json({
          code: 0,
          data: { character_details: [{ name_code: 5001 }], state_effects: [] },
        });
      }
      if (route.endsWith('Game/GetUserProfileOutpostInfo')) {
        return Response.json({ code: 0, data: { outpost_info: null } });
      }
      throw new Error(`unexpected route: ${route}`);
    });

    const request = new Request('https://worker.example/sync', {
      method: 'POST',
      headers: {
        Origin: 'https://moris-kr.github.io',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profileUrl: '15361668407129878426', area: 84 }),
    });
    const response = await worker.fetch(request, {
      ALLOWED_ORIGINS: 'https://moris-kr.github.io',
      BLABLA_COOKIE: 'game_token=test',
    });

    expect(response.status).toBe(200);
    expect(requestedAreas).toEqual([84, 84, 84]);
  });

  it('자동 선택용 응답에는 공식 서버 다섯 곳을 모두 담는다', async () => {
    vi.stubGlobal('fetch', async (url) => {
      const route = String(url);
      if (route.endsWith('Game/GetUserCharacters')) {
        return Response.json({ code: 0, data: { characters: [{ name_code: 5001 }] } });
      }
      if (route.endsWith('Game/GetUserCharacterDetails')) {
        return Response.json({
          code: 0,
          data: { character_details: [{ name_code: 5001 }], state_effects: [] },
        });
      }
      if (route.endsWith('Game/GetUserProfileOutpostInfo')) {
        return Response.json({ code: 0, data: { outpost_info: null } });
      }
      throw new Error(`unexpected route: ${route}`);
    });

    const request = new Request('https://worker.example/sync', {
      method: 'POST',
      headers: {
        Origin: 'https://moris-kr.github.io',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profileUrl: '15361668407129878426' }),
    });
    const response = await worker.fetch(request, {
      ALLOWED_ORIGINS: 'https://moris-kr.github.io',
      BLABLA_COOKIE: 'game_token=test',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.areas.map((area) => area.area)).toEqual([83, 81, 84, 82, 85]);
  });

  it('홍콩·대만 주소는 HMT 서버만 조회하고 게임 id를 헤더에 넣는다', async () => {
    const requestedAreas = [];
    const gameIds = [];
    vi.stubGlobal('fetch', async (url, init) => {
      const body = JSON.parse(init.body);
      requestedAreas.push(body.nikke_area_id);
      const params = JSON.parse(new Headers(init.headers).get('X-Common-Params'));
      gameIds.push(params.game_id);
      const route = String(url);
      if (route.endsWith('Game/GetUserCharacters')) {
        return Response.json({ code: 0, data: { characters: [{ name_code: 5001 }] } });
      }
      if (route.endsWith('Game/GetUserCharacterDetails')) {
        return Response.json({
          code: 0,
          data: { character_details: [{ name_code: 5001 }], state_effects: [] },
        });
      }
      if (route.endsWith('Game/GetUserProfileOutpostInfo')) {
        return Response.json({ code: 0, data: { outpost_info: null } });
      }
      throw new Error(`unexpected route: ${route}`);
    });

    const encoded = btoa('29157-12345678901234567890');
    const request = new Request('https://worker.example/sync', {
      method: 'POST',
      headers: {
        Origin: 'https://swiftstar.github.io',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileUrl: `https://www.blablalink.com/user?openid=${encoded}`,
      }),
    });
    const response = await worker.fetch(request, {
      ALLOWED_ORIGINS: 'https://moris-kr.github.io,https://swiftstar.github.io',
      BLABLA_COOKIE: 'game_token=test',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.areas.map((area) => area.area)).toEqual([91]);
    expect(requestedAreas).toEqual([91, 91, 91]);
    expect(gameIds[0]).toBe('29157');
  });
});
