# MoneyTrack 💰

Personal expense tracking application built with Next.js 16 and Supabase.

[![CI](https://github.com/goodhat/money-track/actions/workflows/ci.yml/badge.svg)](https://github.com/goodhat/money-track/actions/workflows/ci.yml)

## Features

- 📊 Track income and expenses
- 💳 Categorize transactions (customizable)
- 📈 Monthly budget management
- 📱 Responsive design with Tailwind CSS
- 🔐 Secure authentication with Supabase
- 🌙 Clean, modern UI with shadcn/ui
- ⚡ Skeleton loading states for better UX
- ✅ Comprehensive test coverage (89%+)

## Tech Stack

- **Frontend**: Next.js 16 (App Router, Server Components)
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Backend**: Next.js Route Handlers
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Testing**: Vitest + React Testing Library + Playwright
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel (ready to deploy)

## Prerequisites

- Node.js 20.9.0+
- npm or yarn
- Supabase account

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/goodhat/money-track.git
cd money-track
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Set up Supabase database

Run the migrations in your Supabase SQL Editor:

1. Go to your Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/001_initial_schema.sql`
3. Run `supabase/migrations/002_seed_categories.sql`

Or use the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

### Development

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
```

### Testing

```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run E2E tests with Playwright
npm run test:e2e:ui  # Run E2E tests with Playwright UI
```

### Code Quality

```bash
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## Testing

The project has comprehensive test coverage with unit tests, integration tests, and E2E tests:

- **Test Coverage**: 89.36% overall coverage
  - Statements: 89.36%
  - Branches: 81.7%
  - Functions: 85.71%
  - Lines: 93.25%

- **Test Suites**:
  - API Route Tests (100% coverage)
  - Component Integration Tests
  - UI Component Tests
  - E2E Tests with Playwright

Run `npm run test:coverage` to see detailed coverage reports.

## Project Structure

```
money-track/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth route group
│   │   ├── (protected)/       # Protected routes
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── skeletons/         # Loading skeleton components
│   │   └── ui/                # shadcn/ui components
│   ├── lib/                   # Utilities and libraries
│   ├── test/                  # Test setup and mocks
│   └── types/                 # TypeScript types
├── e2e/                       # Playwright E2E tests
├── supabase/
│   └── migrations/            # Database migrations
├── .github/
│   └── workflows/             # GitHub Actions CI/CD
└── public/                    # Static files
```

## Database Schema

### Tables

- **categories**: Transaction categories (income/expense)
- **transactions**: Financial transactions
- **budgets**: Monthly budget settings

All tables use Row Level Security (RLS) to ensure data privacy.

### Default Categories

**Expenses**: 餐飲, 交通, 娛樂, 購物, 居住, 其他
**Income**: 薪資, 投資, 其他

## API Routes

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/[id]` - Update category
- `DELETE /api/categories/[id]` - Delete category

### Transactions
- `GET /api/transactions?month=YYYY-MM` - Get transactions by month
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/[id]` - Update transaction
- `DELETE /api/transactions/[id]` - Delete transaction

### Budgets
- `GET /api/budgets/[year_month]` - Get budget for month
- `PUT /api/budgets/[year_month]` - Set/update budget

### Dashboard
- `GET /api/dashboard?month=YYYY-MM` - Get monthly statistics

## Contributing

### Workflow

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push to GitHub and create a Pull Request:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Wait for CI checks to pass
5. Request review and merge

### Code Standards

- TypeScript strict mode
- ESLint configuration enforced
- All tests must pass
- Code coverage maintained

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/goodhat/money-track)

Or manually:

```bash
npm install -g vercel
vercel
```

Make sure to set environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## License

MIT

## Support

For issues and questions, please [open an issue](https://github.com/goodhat/money-track/issues).
