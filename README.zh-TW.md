# 勝利女神：妮姬 隊伍計算機

[한국어](README.md) · [繁體中文](README.zh-TW.md)

把既有的 Python 模擬引擎放到瀏覽器裡執行的靜態五人隊伍傷害計算機。網站介面可切換**繁體中文**（台灣／香港客戶端用語）。

服務：<https://swiftstar.github.io/nikke-calc/>

原始計算引擎：<https://github.com/Jgaram/nikke-calc>

## 結構

- `calculator/`、`context/`、`data/`：計算引擎與原始資料
- `site/`：以 Vite 與 TypeScript 製作的靜態網頁
- `site/public/calculator.worker.js`：把計算從介面分開、依序執行的 Web Worker
- `site/pybridge/bridge.py`：把網頁請求轉成既有 Python 引擎呼叫的橋接層
- `site/scripts/sync-runtime.mjs`：把引擎、資料、角色清單與圖片同步到網頁執行環境
- `worker/`：BlablaLink 查詢代理（Cloudflare Workers），與網站分開部署
- `.github/workflows/pages.yml`：測試、建置、GitHub Pages 部署自動化

## 主要功能

- 各妮姬的改造裝備效果、調和魔方（17 種）、收藏品／愛用品、技能等級、突破、操控可個別設定
- 帳號控制台設定 — 共通、職業三種、企業五種，依所屬套用到全隊
- 五隊模式與**複製隊伍** — 把一隊的編成與設定原樣鋪到另一隊，只換輸出手來比較
- 各妮姬**普通攻擊／技能傷害分解** — 貢獻度，以及普攻與技能傷害比例、各技能傷害與命中次數
- 以幀為單位的戰鬥時間軸圖
- **報告圖片** — 把結果做成一張 PNG，可複製或儲存（一隊是直式卡片，五隊則是合計與 25 人個別傷害）
- **爆裂計量條充能時間**調整 — 不用累積計量條，改填固定時間來調整循環
- 可用 Let's Doro CSV 匯入，以及 BlablaLink 個人檔案同步，帶入實際育成狀態
- 隊伍可用連結或代碼分享、編成預設儲存、隊伍之間排名比較

網頁用固定版本的 Pyodide，在 Web Worker 裡執行 Python 引擎。計算請求與結果不離開使用者的瀏覽器，不使用 AI API、獨立伺服器、資料庫、登入或分析工具。結果快取存在該瀏覽器的 `localStorage`，最多 30 筆。

目前可選清單只包含同時存在於 `data/parsed_nikke.json` 與 `data/parsed_skills.json` 的正式角色。會排除 `test_` 資料；預覽角色會標示資料尚未驗證。以目前同步為準，支援 199 名妮姬。

## 本機執行

需要 Node.js 22 以上與 Python 3。

```bash
cd site
npm install
npm run dev
```

請用 Vite 顯示的本機網址加上 `/nikke-calc/` 路徑開啟。第一次計算會下載 Pyodide，因此需要網路；之後會用瀏覽器快取。

## 驗證

網頁應用的快速檢查：

```bash
cd site
npm test -- --run
python3 scripts/test-bridge.py
npm run check-pages
npm run build
```

包含既有計算引擎的完整檢查：

```bash
python3 calculator/damage.py
python3 -m context.doclint
python3 -m context.snapshot
```

## 資料更新

引擎、資料或角色圖片有變時，不要直接改產出檔，請用下面指令重新同步：

```bash
cd site
npm run sync-runtime
npm run check-runtime
```

`npm run dev` 與 `npm run build` 在執行前也會自動同步執行環境。

## 部署

第一次請到儲存庫的 **Settings → Pages → Build and deployment → Source**，選擇 **GitHub Actions**。工作流程的 `GITHUB_TOKEN` 沒有新建 Pages 站台的管理員權限，這一步無法自動化。

之後只要推到 `master`，GitHub Actions 會依鎖定檔安裝依賴，測試與正式建置通過後只部署 `site/dist`。Vite 的部署路徑與公開網址來自 Pages 設定，所以 fork 的儲存庫名稱或使用者名稱不同也不必另外改。

### BlablaLink 同步（選用）

用個人檔網址帶入育成資料需要代理才能運作 — BlablaLink API 沒有開放 CORS，查詢也要求登入 session，靜態網站無法直接呼叫。部署步驟見 [worker/README.md](worker/README.md)，把部署後的網址寫進 [site/.env.production](site/.env.production) 的 `VITE_BLABLA_PROXY`，網站就會出現 **BlablaLink 同步**按鈕。若留空，該按鈕不會畫出來，只保留 Let's Doro CSV。

## 授權

計算引擎原文來自 <https://github.com/Jgaram/nikke-calc>，以 MIT 授權公開。
本儲存庫是其 fork，因此同樣遵循 MIT，並把原著作權聲明原樣放在 [LICENSE](LICENSE)。

    Copyright (c) 2026 Jgaram
    MIT License

## 聲明

本儲存庫與服務是非官方粉絲工具，並未與 SHIFT UP 或 Level Infinite 合作，也未經其認可。
《勝利女神：NIKKE》的遊戲資料、角色、圖像及相關著作之權利屬於 SHIFT UP CORP. 與 Level Infinite。
上述授權僅適用於計算機程式碼，不適用於遊戲著作。
公開營運前，請另行確認所用素材與資料的散布權限。

計算結果僅供參考 — 可能仍有程式錯誤或尚未確認的遊戲機制。
