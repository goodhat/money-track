## 專案概述

**名稱**：MoneyTrack

**目標**：練習 AI 輔助開發完整流程，包含 Next.js + Supabase 全端整合、CICD 自動部署

**使用者**：自己

**時程**：一個週末完成 v1

---

## 功能範圍

### V1（本次實作）

- 記錄收支（金額、分類、日期、備註、類型）
- 自訂分類（CRUD）
- 設定總月預算
- Dashboard 顯示本月花費 vs 預算
- 單一幣別（TWD）

### V2（未來）

- 按分類設預算
- 自動分類（keyword mapping）
- 多幣別 + 匯率

---

## User Stories

1. 身為使用者，我可以新增一筆收入或支出紀錄
2. 身為使用者，我可以編輯或刪除已存在的紀錄
3. 身為使用者，我可以建立、編輯、刪除分類
4. 身為使用者，我可以設定本月總預算
5. 身為使用者，我可以在 Dashboard 看到本月總支出與預算比較
6. 身為使用者，我可以看到本月所有交易紀錄列表

---

## 資料庫 Schema

### categories

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| name | text | 分類名稱 |
| type | enum('income', 'expense') | 收入或支出分類 |
| created_at | timestamptz |  |

### transactions

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| category_id | uuid | FK to categories |
| type | enum('income', 'expense') | 收入或支出 |
| amount | decimal(10,2) | 金額（正數） |
| date | date | 交易日期 |
| note | text | 備註（nullable） |
| created_at | timestamptz |  |

### budgets

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| year_month | text | 格式：2025-01 |
| amount | decimal(10,2) | 預算金額 |
| created_at | timestamptz |  |
| **unique** |  | (user_id, year_month) |

---

## API Endpoints

### Categories

- `GET /api/categories` - 取得所有分類
- `POST /api/categories` - 新增分類
- `PUT /api/categories/[id]` - 更新分類
- `DELETE /api/categories/[id]` - 刪除分類

### Transactions

- `GET /api/transactions?month=2025-01` - 取得指定月份交易
- `POST /api/transactions` - 新增交易
- `PUT /api/transactions/[id]` - 更新交易
- `DELETE /api/transactions/[id]` - 刪除交易

### Budgets

- `GET /api/budgets/[year_month]` - 取得指定月份預算
- `PUT /api/budgets/[year_month]` - 設定/更新預算

### Dashboard

- `GET /api/dashboard?month=2025-01` - 取得當月統計（總收入、總支出、預算、各分類支出）

---

## 頁面結構

```
/
├── /login          # 登入頁（Supabase Auth）
├── /dashboard      # 首頁：本月統計
├── /transactions   # 交易列表 + 新增/編輯
├── /categories     # 分類管理
└── /settings       # 預算設定
```

### Dashboard 頁面內容

- 本月總支出 / 預算（進度條）
- 本月總收入
- 本月淨收支（收入 - 支出）
- 最近 5 筆交易

### Transactions 頁面內容

- 月份選擇器
- 交易列表（日期、分類、金額、備註）
- 新增按鈕 → Modal 表單
- 點擊列表項 → 編輯/刪除

---

## Tech Stack

| 層級 | 技術 | 版本/備註 |
| --- | --- | --- |
| Frontend | Next.js | 16（Turbopack 預設開啟） |
| UI | Tailwind CSS | v4（CSS-first 設定） |
| UI Components | shadcn/ui | 已支援 Next.js 16 + Tailwind v4 |
| Backend | Next.js Route Handlers |  |
| Database | Supabase (PostgreSQL) |  |
| Auth | Supabase Auth |  |
| Hosting | Vercel |  |
| CICD | GitHub Actions |  |

### 版本需求

- Node.js 20.9.0+
- React 19.2（Next.js 16 內建）

---

## CICD Pipeline

### GitHub Actions Workflow

**觸發條件**：push to `main`

**Steps**：

1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run lint
5. Run type check
6. Build
7. Deploy to Vercel（透過 Vercel GitHub Integration）

### 環境變數（Vercel）

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（server-side 用）

---

## 預設分類

### 支出

- 餐飲
- 交通
- 娛樂
- 購物
- 居住
- 其他

### 收入

- 薪資
- 投資
- 其他

---

## 實作順序建議

1. **Setup**（30 min）
    - 建立 Next.js 16 專案
    - 設定 Supabase 專案 + schema
    - 設定 Vercel + GitHub 連接
2. **Auth**（1 hr）
    - Supabase Auth 整合
    - 登入/登出頁面
    - Middleware 保護路由（注意：Next.js 16 改用 `proxy.ts`）
3. **Categories CRUD**（1.5 hr）
    - API endpoints
    - 管理頁面 UI
4. **Transactions CRUD**（2 hr）
    - API endpoints
    - 列表頁面
    - 新增/編輯 Modal
5. **Budget + Dashboard**（1.5 hr）
    - Budget API
    - Dashboard 統計 API
    - Dashboard UI
6. **Polish + Deploy**（1 hr）
    - 錯誤處理
    - Loading states
    - 確認 CICD 正常

**預估總時間**：7-8 小時

---

## 給 AI Agent 的指令

```
建立一個個人記帳 SaaS，使用 Next.js 16 + Supabase + Tailwind CSS v4 + shadcn/ui。

核心功能：
1. 使用者認證（Supabase Auth，email/password）
2. 分類管理（CRUD，分收入/支出兩種類型）
3. 交易紀錄（CRUD，含金額、分類、日期、備註）
4. 月預算設定
5. Dashboard 顯示本月收支統計與預算比較

技術要求：
- 使用 Next.js 16 App Router + Server Components
- Turbopack 為預設 bundler
- API 使用 Route Handlers
- 資料庫操作使用 Supabase JS Client
- UI 使用 shadcn/ui 元件
- Tailwind CSS v4（CSS-first 設定，不用 tailwind.config.js）
- RLS 確保使用者只能存取自己的資料
- 注意 Next.js 16 的 middleware 改名為 proxy.ts

請依照以下順序實作：
1. 專案初始化 + Supabase schema
2. Auth 流程
3. Categories CRUD
4. Transactions CRUD
5. Budget + Dashboard
```

---

## 注意事項（Next.js 16 Breaking Changes）

- `middleware.ts` → `proxy.ts`
- Turbopack 預設開啟
- 需要 Node.js 20.9.0+
- React 19.2 內建
- Caching 行為改變（opt-in 而非預設）