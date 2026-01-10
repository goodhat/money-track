import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

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

describe("Transactions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/transactions", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new Request("http://localhost:3000/api/transactions");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return paginated transactions for authenticated user", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions = [
        {
          id: "1",
          type: "expense",
          amount: 100,
          date: "2026-01-03",
          note: "Lunch",
          user_id: "user-123",
          category: { id: "cat-1", name: "餐飲", type: "expense" },
        },
        {
          id: "2",
          type: "income",
          amount: 50000,
          date: "2026-01-01",
          note: "Salary",
          user_id: "user-123",
          category: { id: "cat-2", name: "薪資", type: "income" },
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      // Build query chain mock for transaction_attachments
      const mockAttachmentQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
      };

      // Build query chain mock for transactions
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
      };

      // For the final order call that returns the promise
      mockQuery.order
        .mockReturnValueOnce(mockQuery) // First order call returns this
        .mockReturnValueOnce(mockQuery); // Second order returns query for limit

      mockQuery.limit.mockResolvedValue({ data: mockTransactions, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transaction_attachments") {
          return mockAttachmentQuery;
        }
        return mockQuery;
      });

      const request = new Request("http://localhost:3000/api/transactions");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockTransactions.map(t => ({ ...t, attachment_count: 0 })));
      expect(data.pagination).toBeDefined();
      expect(data.pagination.hasMore).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith("transactions");
    });

    it("should filter transactions by month when month parameter is provided", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions = [
        {
          id: "1",
          type: "expense",
          amount: 100,
          date: "2026-01-15",
          note: "Lunch",
          user_id: "user-123",
          category: { id: "cat-1", name: "餐飲", type: "expense" },
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      // Build query chain mock for transaction_attachments
      const mockAttachmentQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
      };

      const mockGte = vi.fn().mockReturnThis();
      const mockLt = vi.fn().mockResolvedValue({ data: mockTransactions, error: null });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: mockGte,
        lt: mockLt,
      };

      // Chain the order calls properly
      mockQuery.order.mockReturnValue(mockQuery);
      mockQuery.limit.mockReturnValue(mockQuery);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transaction_attachments") {
          return mockAttachmentQuery;
        }
        return mockQuery;
      });

      const request = new Request("http://localhost:3000/api/transactions?month=2026-01");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockTransactions.map(t => ({ ...t, attachment_count: 0 })));
      expect(data.pagination).toBeDefined();
      expect(mockGte).toHaveBeenCalledWith("date", "2026-01-01");
      expect(mockLt).toHaveBeenCalledWith("date", "2026-02-01");
    });

    it("should handle December to January year transition correctly", async () => {
      const mockUser = { id: "user-123" };
      const mockTransactions: unknown[] = [];

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockGte = vi.fn().mockReturnThis();
      const mockLt = vi.fn().mockResolvedValue({ data: mockTransactions, error: null });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: mockGte,
        lt: mockLt,
      };

      mockQuery.order.mockReturnValue(mockQuery);
      mockQuery.limit.mockReturnValue(mockQuery);
      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new Request("http://localhost:3000/api/transactions?month=2025-12");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGte).toHaveBeenCalledWith("date", "2025-12-01");
      expect(mockLt).toHaveBeenCalledWith("date", "2026-01-01");
    });

    it("should return 500 if database error occurs", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { message: "Database connection failed" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // Chain order and limit, final limit returns error
      mockQuery.order.mockReturnValue(mockQuery);
      mockQuery.limit.mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new Request("http://localhost:3000/api/transactions");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database connection failed" });
    });

    it("should return hasMore true when there are more transactions", async () => {
      const mockUser = { id: "user-123" };
      // Create 21 transactions (default limit is 20, so 21 means hasMore = true)
      const mockTransactions = Array.from({ length: 21 }, (_, i) => ({
        id: `tx-${i}`,
        type: "expense",
        amount: 100,
        date: `2026-01-${String(20 - i).padStart(2, "0")}`,
        note: `Transaction ${i}`,
        user_id: "user-123",
        category: { id: "cat-1", name: "餐飲", type: "expense" },
      }));

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      // Build query chain mock for transaction_attachments
      const mockAttachmentQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      mockQuery.order.mockReturnValue(mockQuery);
      mockQuery.limit.mockResolvedValue({ data: mockTransactions, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transaction_attachments") {
          return mockAttachmentQuery;
        }
        return mockQuery;
      });

      const request = new Request("http://localhost:3000/api/transactions");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(20); // Should only return 20 items
      expect(data.pagination.hasMore).toBe(true);
      expect(data.pagination.nextCursor).toBeDefined();
    });
  });

  describe("POST /api/transactions", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new Request("http://localhost:3000/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          category_id: "cat-1",
          type: "expense",
          amount: 100,
          date: "2026-01-03",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 if required fields are missing", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/transactions", {
        method: "POST",
        body: JSON.stringify({ category_id: "cat-1" }), // Missing type, amount, date
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "category_id, type, amount, and date are required" });
    });

    it("should return 400 if type is invalid", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          category_id: "cat-1",
          type: "invalid",
          amount: 100,
          date: "2026-01-03",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Type must be 'income' or 'expense'" });
    });

    it("should return 400 if amount is zero (falsy check in required fields)", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      // Note: amount: 0 is falsy, so it triggers the required fields check first
      const request = new Request("http://localhost:3000/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          category_id: "cat-1",
          type: "expense",
          amount: 0,
          date: "2026-01-03",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "category_id, type, amount, and date are required" });
    });

    it("should return 400 if amount is negative", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          category_id: "cat-1",
          type: "expense",
          amount: -50,
          date: "2026-01-03",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Amount must be positive" });
    });

    it("should create transaction successfully", async () => {
      const mockUser = { id: "user-123" };
      const mockTransaction = {
        id: "tx-1",
        user_id: "user-123",
        category_id: "cat-1",
        type: "expense",
        amount: 100,
        date: "2026-01-03",
        note: "Lunch",
        category: { id: "cat-1", name: "餐飲", type: "expense" },
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockTransaction, error: null });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          category_id: "cat-1",
          type: "expense",
          amount: 100,
          date: "2026-01-03",
          note: "Lunch",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({ data: mockTransaction });
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        category_id: "cat-1",
        type: "expense",
        amount: 100,
        date: "2026-01-03",
        note: "Lunch",
      });
    });

    it("should create transaction with null note when not provided", async () => {
      const mockUser = { id: "user-123" };
      const mockTransaction = {
        id: "tx-1",
        user_id: "user-123",
        category_id: "cat-1",
        type: "income",
        amount: 50000,
        date: "2026-01-01",
        note: null,
        category: { id: "cat-2", name: "薪資", type: "income" },
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockTransaction, error: null });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          category_id: "cat-1",
          type: "income",
          amount: 50000,
          date: "2026-01-01",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({ data: mockTransaction });
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        category_id: "cat-1",
        type: "income",
        amount: 50000,
        date: "2026-01-01",
        note: null,
      });
    });

    it("should return 500 if database error occurs on insert", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { message: "Foreign key constraint violation" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          category_id: "invalid-cat",
          type: "expense",
          amount: 100,
          date: "2026-01-03",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Foreign key constraint violation" });
    });
  });
});
