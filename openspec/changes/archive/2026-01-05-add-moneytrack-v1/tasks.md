# Implementation Tasks

## 1. Project Setup
- [ ] 1.1 初始化 Next.js 15 專案 (TypeScript, Tailwind, ESLint, App Router)
- [ ] 1.2 安裝並設定 shadcn/ui
- [ ] 1.3 設定 Supabase client (client + server)
- [ ] 1.4 建立環境變數範本 (.env.example)
- [ ] 1.5 設定 TypeScript 類型定義 (database types)

## 2. Database Schema
- [ ] 2.1 建立 SQL migration 檔案
- [ ] 2.2 建立 transaction_type enum
- [ ] 2.3 建立 categories 資料表
- [ ] 2.4 建立 transactions 資料表
- [ ] 2.5 建立 budgets 資料表
- [ ] 2.6 設定 RLS policies
- [ ] 2.7 建立預設分類 seed data

## 3. Authentication
- [ ] 3.1 建立 Supabase Auth middleware
- [ ] 3.2 建立 Login 頁面 UI
- [ ] 3.3 實作登入/登出功能
- [ ] 3.4 建立 Auth context provider
- [ ] 3.5 設定路由保護 (protected routes)

## 4. Categories Feature
- [ ] 4.1 建立 GET /api/categories endpoint
- [ ] 4.2 建立 POST /api/categories endpoint
- [ ] 4.3 建立 PUT /api/categories/[id] endpoint
- [ ] 4.4 建立 DELETE /api/categories/[id] endpoint
- [ ] 4.5 建立 Categories 管理頁面 UI
- [ ] 4.6 實作分類列表顯示
- [ ] 4.7 實作新增分類 Modal
- [ ] 4.8 實作編輯/刪除分類功能

## 5. Transactions Feature
- [ ] 5.1 建立 GET /api/transactions endpoint (with month filter)
- [ ] 5.2 建立 POST /api/transactions endpoint
- [ ] 5.3 建立 PUT /api/transactions/[id] endpoint
- [ ] 5.4 建立 DELETE /api/transactions/[id] endpoint
- [ ] 5.5 建立 Transactions 頁面 UI
- [ ] 5.6 實作月份選擇器
- [ ] 5.7 實作交易列表顯示
- [ ] 5.8 實作新增交易 Modal
- [ ] 5.9 實作編輯/刪除交易功能

## 6. Budget & Dashboard
- [ ] 6.1 建立 GET /api/budgets/[year_month] endpoint
- [ ] 6.2 建立 PUT /api/budgets/[year_month] endpoint
- [ ] 6.3 建立 GET /api/dashboard endpoint
- [ ] 6.4 建立 Dashboard 頁面 UI
- [ ] 6.5 實作支出 vs 預算進度條
- [ ] 6.6 實作收入/支出/淨收支統計卡片
- [ ] 6.7 實作最近交易列表
- [ ] 6.8 建立 Settings 頁面 (預算設定)

## 7. Navigation & Layout
- [ ] 7.1 建立主要 Layout (header, sidebar/nav)
- [ ] 7.2 建立導航元件
- [ ] 7.3 實作 Loading states
- [ ] 7.4 實作 Error handling UI

## 8. CICD & Deployment
- [ ] 8.1 建立 GitHub Actions workflow
- [ ] 8.2 設定 lint + type check jobs
- [ ] 8.3 設定 Vercel 專案
- [ ] 8.4 設定環境變數 (Vercel)
- [ ] 8.5 驗證部署流程
