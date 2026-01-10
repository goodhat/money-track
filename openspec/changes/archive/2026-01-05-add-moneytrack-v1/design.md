# Technical Design: MoneyTrack V1

## Context
這是一個全新的個人記帳應用程式，使用 Next.js 15 + Supabase 技術棧。
使用者為單一使用者（自己），但架構上支援多使用者（透過 Supabase Auth + RLS）。

## Goals / Non-Goals

### Goals
- 快速建立可用的 MVP
- 學習 Next.js 15 + Supabase 全端整合
- 實作完整的 CICD 流程

### Non-Goals
- 多幣別支援（V2）
- 進階統計圖表（V2）
- 匯入/匯出功能（V2）
- 自動分類（V2）

## Decisions

### 1. 專案結構
```
src/
├── app/
│   ├── (auth)/           # 公開路由群組
│   │   └── login/
│   ├── (protected)/      # 受保護路由群組
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── categories/
│   │   └── settings/
│   ├── api/              # API Routes
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # shadcn components
│   └── ...               # Custom components
├── lib/
│   ├── supabase/
│   │   ├── client.ts     # Browser client
│   │   └── server.ts     # Server client
│   └── utils.ts
├── types/
│   └── database.ts       # Supabase generated types
└── middleware.ts         # Auth middleware
```

### 2. Supabase 整合策略
- **Client-side**: 使用 `@supabase/supabase-js` 建立 browser client
- **Server-side**: 使用 `@supabase/ssr` 建立 server client（支援 cookies）
- **Middleware**: 驗證 session 並保護路由

### 3. 認證流程
```
1. 使用者訪問 /dashboard
2. middleware.ts 檢查 session
3. 無 session → 重導向 /login
4. 有 session → 允許存取
5. 登入成功 → 重導向 /dashboard
```

### 4. API 設計原則
- 所有 API 都需要驗證（透過 Supabase session）
- 使用 Route Handlers（`route.ts`）
- 統一回傳格式：`{ data, error }`
- RLS 確保資料隔離

### 5. 資料庫設計決策
- `transaction_type` 使用 PostgreSQL enum 而非 text
- `year_month` 使用 text 格式 "YYYY-MM" 便於查詢
- 金額使用 `decimal(10,2)` 確保精度
- 所有表格都有 `user_id` 欄位配合 RLS

## Risks / Trade-offs

### Risk: Next.js 15 相容性
- **風險**: shadcn/ui 或其他套件可能不完全相容
- **緩解**: 使用官方推薦的版本，遇到問題時回退

### Trade-off: Server vs Client Components
- 優先使用 Server Components 以獲得更好的效能
- 需要互動的元件（表單、Modal）使用 Client Components
- API 呼叫統一透過 Route Handlers

### Trade-off: 簡單 vs 完整
- V1 選擇簡單實作，不做過度抽象
- 例如：不建立複雜的 state management（使用 React 內建狀態）

## Migration Plan
不適用 - 全新專案

## Open Questions
1. Supabase 專案需要使用者手動建立
2. Vercel 部署需要使用者手動連接 GitHub repo
