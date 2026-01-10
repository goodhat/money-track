# Change: Add MoneyTrack V1 Core Features

## Why
建立個人記帳應用程式的核心功能，讓使用者能夠追蹤收入、支出，並監控預算使用狀況。
這是專案的初始版本，包含所有 MVP 功能。

## What Changes
- 建立 Next.js 15 專案結構與 Supabase 整合
- 實作 Email/Password 認證系統
- 建立 Categories CRUD（收入/支出分類管理）
- 建立 Transactions CRUD（交易紀錄管理）
- 建立 Budget 設定功能
- 建立 Dashboard 統計頁面
- 設定 CICD pipeline（GitHub Actions + Vercel）

## Impact
- Affected specs: auth, categories, transactions, budgets, dashboard
- Affected code: 全新專案，無既有程式碼
