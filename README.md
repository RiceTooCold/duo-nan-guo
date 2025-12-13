# Duo-Nan-Guo 多難過

> 語言檢定考試對戰應用 — 結合 Kahoot 式即時對戰與 JLPT / TOEIC / TOPIK / HSK 官方題型

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)

---

## 專案概述

**Duo-Nan-Guo** 是一款語言檢定考試對戰 PWA 應用，玩家可透過 1v1 或多人對戰模式練習語言考試題目，支援：

| 考試類型 | 語言 |
|----------|------|
| JLPT N1-N5 | 日語 |
| TOEIC | 英語 |
| TOPIK I-II | 韓語 |
| HSK 1-6 | 中文 |

### 核心特色

- **T2T 沉浸式學習**：目標語言對目標語言，無母語提示
- **即時對戰**：1v1 對決 + 2-8 人多人模式
- **AI 對手**：規則 Bot 與 LLM Bot 雙模式
- **AI 題目工廠**：Gemini 驅動的 Generator-Critic 生成管線

---

## 技術架構

```
duo-nan-guo/
├── app/                    # Next.js App Router
│   ├── admin/             # 題目管理後台
│   ├── (game)/            # 遊戲頁面
│   └── api/               # API Routes
├── lib/
│   ├── factory/           # 題目生成邏輯
│   └── game/              # 對戰引擎 (開發中)
├── prisma/                # Database Schema
└── docs/                  # 專案文件
```

| 層級 | 技術選擇 |
|------|----------|
| Framework | Next.js 15 (App Router) |
| Database | MongoDB Atlas + Prisma |
| AI | Google Gemini 2.5 Flash/Pro |
| Realtime | Socket.io (規劃中) |
| Auth | NextAuth.js (規劃中) |

---

## 快速開始

### 環境需求

- Node.js 20+
- pnpm 9+
- MongoDB Atlas 帳號

### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/your-org/duo-nan-guo.git
cd duo-nan-guo

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
cp .env.example .env
# 填入 DATABASE_URL 和 GEMINI_API_KEY

# 4. 生成 Prisma Client
pnpm db:generate

# 5. 推送 Schema 到資料庫
pnpm db:push

# 6. 啟動開發伺服器
pnpm dev
```

開啟 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## 可用指令

| 指令 | 說明 |
|------|------|
| `pnpm dev` | 啟動開發伺服器 |
| `pnpm build` | 建置生產版本 |
| `pnpm lint` | 執行 ESLint |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:push` | 推送 Schema 到資料庫 |
| `pnpm db:studio` | 開啟 Prisma Studio |

---

## 團隊分工

| 角色 | 負責範圍 |
|------|----------|
| **Factory Engineer** | 題目生成、Admin Dashboard |
| **Game Engineer** | 對戰引擎、Bot 實作 |
| **UI/UX Designer** | 設計系統、遊戲介面 |

詳見 [協作規範](./docs/collaboration-and-gitflow.md)

---

## 文件

- [整體規格書](./docs/overall-spec.md)
- [題目工廠規格](./docs/factory/Duo-Nan-Guo%20Factory%20Specification.md)
- [協作與 Git Flow](./docs/collaboration-and-gitflow.md)

---

## License

MIT © 2025 Duo-Nan-Guo Team
