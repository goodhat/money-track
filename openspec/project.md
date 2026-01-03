# Project Context

## Purpose
MoneyTrack 是一個個人記帳應用程式，用於追蹤收入、支出，並設定月預算。
目標是練習 AI 輔助開發完整流程，包含 Next.js + Supabase 全端整合、CICD 自動部署。

## Tech Stack
- **Frontend**: Next.js 16 (App Router, Server Components)
- **UI**: Tailwind CSS v4 (CSS-first 設定) + shadcn/ui
- **Backend**: Next.js Route Handlers
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Hosting**: Vercel
- **CICD**: GitHub Actions

### 版本需求
- Node.js 20.9.0+
- React 19 (Next.js 16 內建)

## Project Conventions

### Code Style
- TypeScript 嚴格模式
- ESLint + Prettier
- 使用 `src/` 目錄結構
- 元件使用 PascalCase，檔案使用 kebab-case

### Architecture Patterns
- App Router with Route Groups: `(auth)`, `(protected)`
- Server Components by default, Client Components 僅在需要時使用
- API Routes 使用 Route Handlers
- 資料庫操作統一透過 Supabase JS Client

### Testing Strategy
- 暫不實作測試（V1 scope）

### Git Workflow
- main branch 為生產環境
- feature branches 開發新功能
- PR 合併前需通過 lint + type check

## Domain Context

### 核心概念
- **Transaction**: 一筆收入或支出紀錄
- **Category**: 交易分類（分收入/支出兩種類型）
- **Budget**: 每月預算設定

### 資料模型

#### categories
| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| name | text | 分類名稱 |
| type | enum('income', 'expense') | 收入或支出分類 |
| created_at | timestamptz | 建立時間 |

#### transactions
| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| category_id | uuid | FK to categories |
| type | enum('income', 'expense') | 收入或支出 |
| amount | decimal(10,2) | 金額（正數） |
| date | date | 交易日期 |
| note | text | 備註（nullable） |
| created_at | timestamptz | 建立時間 |

#### budgets
| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| year_month | text | 格式：2025-01 |
| amount | decimal(10,2) | 預算金額 |
| created_at | timestamptz | 建立時間 |
| **unique** | | (user_id, year_month) |

### 預設分類
**支出**: 餐飲、交通、娛樂、購物、居住、其他
**收入**: 薪資、投資、其他

## API Design

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
- `GET /api/dashboard?month=2025-01` - 取得當月統計

## Page Structure
```
/login          # 登入頁（Supabase Auth）
/dashboard      # 首頁：本月統計
/transactions   # 交易列表 + 新增/編輯
/categories     # 分類管理
/settings       # 預算設定
```

## Important Constraints
- 單一幣別：TWD
- RLS 確保使用者只能存取自己的資料
- 金額必須為正數

## External Dependencies
- Supabase Project (獨立專案)
- Vercel Deployment
- GitHub Repository
