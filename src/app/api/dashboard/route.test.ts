import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe("Dashboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/dashboard", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new Request("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return dashboard data with transactions and budget", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions = [
        {
          id: "tx-1",
          type: "income",
          amount: 50000,
          date: "2026-01-01",
          note: "Salary",
          category: { id: "cat-1", name: "薪資", type: "income" },
        },
        {
          id: "tx-2",
          type: "expense",
          amount: 500,
          date: "2026-01-02",
          note: "Lunch",
          category: { id: "cat-2", name: "餐飲", type: "expense" },
        },
        {
          id: "tx-3",
          type: "expense",
          amount: 1000,
          date: "2026-01-03",
          note: "Transport",
          category: { id: "cat-3", name: "交通", type: "expense" },
        },
      ];
      const mockBudget = { amount: 30000 };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      // Mock transactions query
      const mockTransactionSelect = vi.fn().mockReturnThis();
      const mockTransactionEq = vi.fn().mockReturnThis();
      const mockTransactionGte = vi.fn().mockReturnThis();
      const mockTransactionLt = vi.fn().mockReturnThis();
      const mockTransactionOrder = vi.fn().mockReturnThis();

      // Mock budget query
      const mockBudgetSelect = vi.fn().mockReturnThis();
      const mockBudgetEq = vi.fn().mockReturnThis();

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transactions") {
          return {
            select: mockTransactionSelect,
          };
        }
        if (table === "budgets") {
          return {
            select: mockBudgetSelect,
          };
        }
        return {};
      });

      mockTransactionSelect.mockReturnValue({
        eq: mockTransactionEq,
      });

      mockTransactionEq.mockReturnValue({
        gte: mockTransactionGte,
      });

      mockTransactionGte.mockReturnValue({
        lt: mockTransactionLt,
      });

      mockTransactionLt.mockReturnValue({
        order: mockTransactionOrder,
      });

      mockTransactionOrder
        .mockReturnValueOnce({
          order: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
        });

      mockBudgetSelect.mockReturnValue({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: mockBudget, error: null }),
      });

      const request = new Request("http://localhost:3000/api/dashboard?month=2026-01");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        month: "2026-01",
        totalIncome: 50000,
        totalExpense: 1500, // 500 + 1000
        netIncome: 48500, // 50000 - 1500
        budget: 30000,
        expenseByCategory: {
          餐飲: 500,
          交通: 1000,
        },
        recentTransactions: mockTransactions.slice(0, 5),
      });
    });

    it("should use current month when month parameter is not provided", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions: unknown[] = [];

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      // Mock transaction query
      const mockTransactionSelect = vi.fn().mockReturnThis();
      const mockTransactionEq = vi.fn().mockReturnThis();
      const mockTransactionGte = vi.fn().mockReturnThis();
      const mockTransactionLt = vi.fn().mockReturnThis();
      const mockTransactionOrder = vi.fn().mockReturnThis();

      // Mock budget query
      const mockBudgetSelect = vi.fn().mockReturnThis();
      const mockBudgetEq = vi.fn().mockReturnThis();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transactions") {
          return {
            select: mockTransactionSelect,
          };
        }
        if (table === "budgets") {
          return {
            select: mockBudgetSelect,
          };
        }
        return {};
      });

      mockTransactionSelect.mockReturnValue({
        eq: mockTransactionEq,
      });

      mockTransactionEq.mockReturnValue({
        gte: mockTransactionGte,
      });

      mockTransactionGte.mockReturnValue({
        lt: mockTransactionLt,
      });

      mockTransactionLt.mockReturnValue({
        order: mockTransactionOrder,
      });

      mockTransactionOrder
        .mockReturnValueOnce({
          order: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
        });

      mockBudgetSelect.mockReturnValue({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const request = new Request("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should contain a month in YYYY-MM format
      expect(data.data.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should return null budget when no budget is set", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions = [
        {
          id: "tx-1",
          type: "expense",
          amount: 100,
          date: "2026-01-01",
          note: "Test",
          category: { id: "cat-1", name: "餐飲", type: "expense" },
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockTransactionSelect = vi.fn().mockReturnThis();
      const mockTransactionEq = vi.fn().mockReturnThis();
      const mockTransactionGte = vi.fn().mockReturnThis();
      const mockTransactionLt = vi.fn().mockReturnThis();
      const mockTransactionOrder = vi.fn().mockReturnThis();

      const mockBudgetSelect = vi.fn().mockReturnThis();
      const mockBudgetEq = vi.fn().mockReturnThis();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transactions") {
          return {
            select: mockTransactionSelect,
          };
        }
        if (table === "budgets") {
          return {
            select: mockBudgetSelect,
          };
        }
        return {};
      });

      mockTransactionSelect.mockReturnValue({
        eq: mockTransactionEq,
      });

      mockTransactionEq.mockReturnValue({
        gte: mockTransactionGte,
      });

      mockTransactionGte.mockReturnValue({
        lt: mockTransactionLt,
      });

      mockTransactionLt.mockReturnValue({
        order: mockTransactionOrder,
      });

      mockTransactionOrder
        .mockReturnValueOnce({
          order: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
        });

      mockBudgetSelect.mockReturnValue({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const request = new Request("http://localhost:3000/api/dashboard?month=2026-01");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.budget).toBeNull();
    });

    it("should return 500 if transaction query fails", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { message: "Database connection failed" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockTransactionSelect = vi.fn().mockReturnThis();
      const mockTransactionEq = vi.fn().mockReturnThis();
      const mockTransactionGte = vi.fn().mockReturnThis();
      const mockTransactionLt = vi.fn().mockReturnThis();
      const mockTransactionOrder = vi.fn().mockReturnThis();

      mockSupabase.from.mockReturnValue({
        select: mockTransactionSelect,
      });

      mockTransactionSelect.mockReturnValue({
        eq: mockTransactionEq,
      });

      mockTransactionEq.mockReturnValue({
        gte: mockTransactionGte,
      });

      mockTransactionGte.mockReturnValue({
        lt: mockTransactionLt,
      });

      mockTransactionLt.mockReturnValue({
        order: mockTransactionOrder,
      });

      mockTransactionOrder
        .mockReturnValueOnce({
          order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
        });

      const request = new Request("http://localhost:3000/api/dashboard?month=2026-01");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database connection failed" });
    });

    it("should calculate totals correctly with only expenses", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions = [
        {
          id: "tx-1",
          type: "expense",
          amount: 200,
          date: "2026-01-01",
          note: "Food",
          category: { id: "cat-1", name: "餐飲", type: "expense" },
        },
        {
          id: "tx-2",
          type: "expense",
          amount: 300,
          date: "2026-01-02",
          note: "More food",
          category: { id: "cat-1", name: "餐飲", type: "expense" },
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockTransactionSelect = vi.fn().mockReturnThis();
      const mockTransactionEq = vi.fn().mockReturnThis();
      const mockTransactionGte = vi.fn().mockReturnThis();
      const mockTransactionLt = vi.fn().mockReturnThis();
      const mockTransactionOrder = vi.fn().mockReturnThis();

      const mockBudgetSelect = vi.fn().mockReturnThis();
      const mockBudgetEq = vi.fn().mockReturnThis();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transactions") {
          return {
            select: mockTransactionSelect,
          };
        }
        if (table === "budgets") {
          return {
            select: mockBudgetSelect,
          };
        }
        return {};
      });

      mockTransactionSelect.mockReturnValue({
        eq: mockTransactionEq,
      });

      mockTransactionEq.mockReturnValue({
        gte: mockTransactionGte,
      });

      mockTransactionGte.mockReturnValue({
        lt: mockTransactionLt,
      });

      mockTransactionLt.mockReturnValue({
        order: mockTransactionOrder,
      });

      mockTransactionOrder
        .mockReturnValueOnce({
          order: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
        });

      mockBudgetSelect.mockReturnValue({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const request = new Request("http://localhost:3000/api/dashboard?month=2026-01");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.totalIncome).toBe(0);
      expect(data.data.totalExpense).toBe(500);
      expect(data.data.netIncome).toBe(-500);
      expect(data.data.expenseByCategory).toEqual({ 餐飲: 500 });
    });

    it("should handle transactions with null category gracefully", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions = [
        {
          id: "tx-1",
          type: "expense",
          amount: 100,
          date: "2026-01-01",
          note: "Uncategorized",
          category: null,
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockTransactionSelect = vi.fn().mockReturnThis();
      const mockTransactionEq = vi.fn().mockReturnThis();
      const mockTransactionGte = vi.fn().mockReturnThis();
      const mockTransactionLt = vi.fn().mockReturnThis();
      const mockTransactionOrder = vi.fn().mockReturnThis();

      const mockBudgetSelect = vi.fn().mockReturnThis();
      const mockBudgetEq = vi.fn().mockReturnThis();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transactions") {
          return {
            select: mockTransactionSelect,
          };
        }
        if (table === "budgets") {
          return {
            select: mockBudgetSelect,
          };
        }
        return {};
      });

      mockTransactionSelect.mockReturnValue({
        eq: mockTransactionEq,
      });

      mockTransactionEq.mockReturnValue({
        gte: mockTransactionGte,
      });

      mockTransactionGte.mockReturnValue({
        lt: mockTransactionLt,
      });

      mockTransactionLt.mockReturnValue({
        order: mockTransactionOrder,
      });

      mockTransactionOrder
        .mockReturnValueOnce({
          order: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
        });

      mockBudgetSelect.mockReturnValue({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const request = new Request("http://localhost:3000/api/dashboard?month=2026-01");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.expenseByCategory).toEqual({ 未分類: 100 });
    });

    it("should return only the 5 most recent transactions", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions = Array.from({ length: 10 }, (_, i) => ({
        id: `tx-${i}`,
        type: "expense",
        amount: 100,
        date: `2026-01-${String(10 - i).padStart(2, "0")}`,
        note: `Transaction ${i}`,
        category: { id: "cat-1", name: "餐飲", type: "expense" },
      }));

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockTransactionSelect = vi.fn().mockReturnThis();
      const mockTransactionEq = vi.fn().mockReturnThis();
      const mockTransactionGte = vi.fn().mockReturnThis();
      const mockTransactionLt = vi.fn().mockReturnThis();
      const mockTransactionOrder = vi.fn().mockReturnThis();

      const mockBudgetSelect = vi.fn().mockReturnThis();
      const mockBudgetEq = vi.fn().mockReturnThis();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transactions") {
          return {
            select: mockTransactionSelect,
          };
        }
        if (table === "budgets") {
          return {
            select: mockBudgetSelect,
          };
        }
        return {};
      });

      mockTransactionSelect.mockReturnValue({
        eq: mockTransactionEq,
      });

      mockTransactionEq.mockReturnValue({
        gte: mockTransactionGte,
      });

      mockTransactionGte.mockReturnValue({
        lt: mockTransactionLt,
      });

      mockTransactionLt.mockReturnValue({
        order: mockTransactionOrder,
      });

      mockTransactionOrder
        .mockReturnValueOnce({
          order: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
        });

      mockBudgetSelect.mockReturnValue({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        eq: mockBudgetEq,
      });

      mockBudgetEq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const request = new Request("http://localhost:3000/api/dashboard?month=2026-01");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.recentTransactions).toHaveLength(5);
    });
  });
});
