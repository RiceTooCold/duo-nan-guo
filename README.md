# Duo-Nan-Guo 多難過

> 語言檢定考試對戰應用 — 結合 Kahoot 式即時對戰與 JLPT / TOEIC / TOPIK / HSK 官方題型

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Pusher](https://img.shields.io/badge/Pusher-Realtime-blueviolet?logo=pusher)](https://pusher.com/)

---

## 📖 目錄

- [專案概述](#專案概述)
- [功能特色](#功能特色)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [環境變數設定](#環境變數設定)
- [可用指令](#可用指令)
- [專案結構](#專案結構)
- [部署指南](#部署指南)
- [開發文件](#開發文件)

---

## 專案概述

**Duo-Nan-Guo** 是一款語言檢定考試對戰 PWA 應用，玩家可透過 1v1 或多人對戰模式練習語言考試題目。

| 考試類型 | 語言 | 等級 |
|----------|------|------|
| JLPT | 日語 🇯🇵 | N5 → N1 |
| TOEIC | 英語 🇺🇸 | 橘色 → 金色證書 |
| TOPIK | 韓語 🇰🇷 | I 1급 → II 6급 |
| HSK | 中文 🇨🇳 | 1級 → 6級 |

---

## 功能特色

### 🎮 遊戲模式
- **Bot 對戰**：與 LLM 驅動的 AI 對手對決（GPT-4o-mini、Gemini、Llama 等）
- **PvP 對戰**：即時 1v1 真人對決
- **多人模式**：2-8 人同時競賽（開發中）

### 📊 遊戲機制
| 機制 | 說明 |
|------|------|
| 基礎分 | 答對 +100 分 |
| 速度獎勵 | 最多 +50 分（答題越快分數越高） |
| 連續正確 | 1.0x → 1.5x 倍率加成 |
| 即時回饋 | 點擊後立即顯示對錯（Client-side Hash 驗證） |

### 🤖 AI 對手
| Bot 類型 | 說明 |
|----------|------|
| GPT-4o-mini | OpenAI 最快模型 |
| Gemini Flash | Google 高速模型 |
| Llama 3.3 70B | Groq 推理加速 |

### 📈 其他功能
- **歷史紀錄**：查看過去對戰結果與答題詳情
- **排行榜**：全服玩家積分排名
- **Google 登入**：OAuth 2.0 快速登入

---

## 技術架構

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js 15 (App Router) + React 19 + Tailwind CSS 4        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend / API                           │
│  Next.js Server Actions + API Routes                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ NextAuth.js │  │ Prisma ORM  │  │ Vercel AI   │          │
│  │  (OAuth)    │  │ (MongoDB)   │  │    SDK      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │  MongoDB    │     │   Pusher    │     │   LLM APIs  │
   │   Atlas     │     │  (Realtime) │     │ Gemini/GPT  │
   └─────────────┘     └─────────────┘     └─────────────┘
```

| 層級 | 技術 |
|------|------|
| Framework | Next.js 15 (App Router, Server Actions) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Database | MongoDB Atlas + Prisma 6 |
| Auth | NextAuth.js 4 (Google OAuth) |
| Realtime | Pusher Channels |
| AI | Vercel AI SDK (Gemini, OpenAI, Groq) |
| Deployment | Vercel |

---

## 快速開始

### 環境需求

- **Node.js** 20+
- **pnpm** 9+
- **MongoDB Atlas** 帳號
- **Pusher** 帳號
- **Google Cloud** OAuth 憑證
- **AI API Key**（至少一個：Gemini / OpenAI / Groq）

### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/RiceTooCold/duo-nan-guo.git
cd duo-nan-guo

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 填入所有必要變數（見下方說明）

# 4. 推送 Schema 到資料庫
pnpm db:push

# 5. Seed Bot 使用者（建立 AI 對手帳號）
pnpm seed-bots

# 6. 啟動開發伺服器
pnpm dev
```

開啟 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## 環境變數設定

將 `.env.example` 複製為 `.env` 並填入以下變數：

### 必填

| 變數 | 說明 | 取得方式 |
|------|------|----------|
| `DATABASE_URL` | MongoDB 連線字串 | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) |
| `NEXTAUTH_SECRET` | NextAuth 加密金鑰 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 應用程式 URL | `http://localhost:3000` (開發) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | 同上 |
| `PUSHER_APP_ID` | Pusher App ID | [Pusher Dashboard](https://dashboard.pusher.com/) |
| `PUSHER_KEY` | Pusher Key | 同上 |
| `PUSHER_SECRET` | Pusher Secret | 同上 |
| `PUSHER_CLUSTER` | Pusher Cluster | 通常為 `ap3` |
| `NEXT_PUBLIC_PUSHER_KEY` | 同 `PUSHER_KEY` | 前端使用 |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | 同 `PUSHER_CLUSTER` | 前端使用 |

### AI API Keys（至少填一個）

| 變數 | 說明 | 取得方式 |
|------|------|----------|
| `GEMINI_API_KEY` | Google Gemini | [AI Studio](https://aistudio.google.com/app/apikey) |
| `OPENAI_API_KEY` | OpenAI | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `GROQ_API_KEY` | Groq | [Groq Console](https://console.groq.com/keys) |

### 選填

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Admin 頁面密碼 | - |
| `CRON_SECRET` | Vercel Cron 授權金鑰 | - |
| `GEMINI_RPM` | Gemini API 速率限制 | `30` |

---

## 可用指令

| 指令 | 說明 |
|------|------|
| `pnpm dev` | 啟動開發伺服器 |
| `pnpm build` | 建置生產版本 |
| `pnpm start` | 啟動生產伺服器 |
| `pnpm lint` | 執行 ESLint |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:push` | 推送 Schema 到資料庫 |
| `pnpm db:studio` | 開啟 Prisma Studio（資料庫 GUI） |
| `pnpm seed-bots` | 建立 AI Bot 使用者 |

---

## 專案結構

```
duo-nan-guo/
├── app/                       # Next.js App Router
│   ├── (game)/               # 遊戲頁面（需登入）
│   │   ├── battle/           # 對戰頁面
│   │   ├── history/          # 歷史紀錄
│   │   ├── leaderboard/      # 排行榜
│   │   ├── lobby/            # 大廳
│   │   ├── results/          # 結算頁面
│   │   └── room/             # 等待室
│   ├── admin/                # 題目管理後台
│   ├── api/                  # API Routes
│   │   ├── auth/             # NextAuth 端點
│   │   └── cron/             # 定時任務
│   └── login/                # 登入頁面
│
├── lib/
│   ├── factory/              # 題目生成邏輯
│   │   ├── ai/               # AI 模型整合
│   │   └── services/         # 生成服務
│   ├── game-engine/          # 遊戲引擎
│   │   ├── server/           # Server-side 狀態管理
│   │   └── useGameClient.ts  # Client-side Hook
│   ├── config/               # 遊戲設定
│   ├── auth.ts               # NextAuth 設定
│   ├── prisma.ts             # Prisma Client
│   └── pusher.ts             # Pusher 設定
│
├── actions/                   # Server Actions
│   ├── game.server.ts        # 遊戲相關
│   ├── bot.server.ts         # Bot AI 呼叫
│   └── leaderboard.server.ts # 排行榜
│
├── components/               # React 元件
│   └── game/                 # 遊戲 UI 元件
│
├── prisma/
│   ├── schema.prisma         # 資料庫 Schema
│   └── seed-bots.ts          # Bot 使用者 Seed
│
└── docs/                     # 專案文件
```

---

## 部署指南

### Vercel 部署

1. **連結 GitHub Repository**
   - 登入 [Vercel](https://vercel.com/)
   - Import 專案

2. **設定環境變數**
   - 在 Vercel Dashboard → Settings → Environment Variables
   - 加入所有[必填環境變數](#環境變數設定)
   - `NEXTAUTH_URL` 設為你的 Vercel 網域（如 `https://duo-nan-guo.vercel.app`）

3. **設定 Cron Job（選填）**
   - `vercel.json` 已設定每日 10:00 UTC 執行清理任務
   - 在 Vercel 設定 `CRON_SECRET` 環境變數

4. **部署**
   - Push 到 `main` 分支即自動部署

### 注意事項

- Vercel Hobby Plan 有 **10 秒** 函數執行限制
- 本專案已針對 Serverless 優化：
  - Client-side Hash 驗證實現即時回饋
  - LLM 呼叫有 5 秒 Timeout + Fallback
  - Client-driven 轉場避免背景執行

---

## 開發文件

- [整體規格書](./docs/overall-spec.md)
- [題目工廠規格](./docs/factory/Duo-Nan-Guo%20Factory%20Specification.md)
- [協作與 Git Flow](./docs/collaboration-and-gitflow.md)

---

## License

MIT © 2025 Duo-Nan-Guo Team
