import { http, HttpResponse } from "msw";

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";

export const handlers = [
  // Mock categories API
  http.get(`${API_URL}/rest/v1/categories`, () => {
    return HttpResponse.json([
      { id: "1", name: "餐飲", type: "expense", user_id: "test-user", created_at: new Date().toISOString() },
      { id: "2", name: "薪資", type: "income", user_id: "test-user", created_at: new Date().toISOString() },
    ]);
  }),

  // Mock transactions API
  http.get(`${API_URL}/rest/v1/transactions`, () => {
    return HttpResponse.json([
      {
        id: "1",
        type: "expense",
        amount: 100,
        date: "2026-01-03",
        note: "Lunch",
        user_id: "test-user",
        category_id: "1",
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // Mock budgets API
  http.get(`${API_URL}/rest/v1/budgets`, () => {
    return HttpResponse.json([
      {
        id: "1",
        user_id: "test-user",
        year_month: "2026-01",
        amount: 5000,
        created_at: new Date().toISOString(),
      },
    ]);
  }),
];
