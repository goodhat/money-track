import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "./route";

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

describe("Transactions [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PUT /api/transactions/[id]", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "PUT",
        body: JSON.stringify({ amount: 200 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 if type is invalid", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "PUT",
        body: JSON.stringify({ type: "invalid" }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Type must be 'income' or 'expense'" });
    });

    it("should return 400 if amount is zero", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "PUT",
        body: JSON.stringify({ amount: 0 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Amount must be positive" });
    });

    it("should return 400 if amount is negative", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "PUT",
        body: JSON.stringify({ amount: -100 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Amount must be positive" });
    });

    it("should update transaction successfully with all fields", async () => {
      const mockUser = { id: "user-123" };
      const mockUpdatedTransaction = {
        id: "tx-1",
        user_id: "user-123",
        category_id: "cat-2",
        type: "income",
        amount: 60000,
        date: "2026-01-15",
        note: "Updated salary",
        category: { id: "cat-2", name: "薪資", type: "income" },
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedTransaction, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "PUT",
        body: JSON.stringify({
          category_id: "cat-2",
          type: "income",
          amount: 60000,
          date: "2026-01-15",
          note: "Updated salary",
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ data: mockUpdatedTransaction });
    });

    it("should update transaction with partial fields", async () => {
      const mockUser = { id: "user-123" };
      const mockUpdatedTransaction = {
        id: "tx-1",
        user_id: "user-123",
        category_id: "cat-1",
        type: "expense",
        amount: 150,
        date: "2026-01-03",
        note: "Dinner",
        category: { id: "cat-1", name: "餐飲", type: "expense" },
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedTransaction, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "PUT",
        body: JSON.stringify({ amount: 150 }), // Only updating amount
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ data: mockUpdatedTransaction });
    });

    it("should return 404 if transaction not found", async () => {
      const mockUser = { id: "user-123" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/transactions/tx-999", {
        method: "PUT",
        body: JSON.stringify({ amount: 200 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-999" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Transaction not found" });
    });

    it("should return 500 if database error occurs", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { message: "Database error" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "PUT",
        body: JSON.stringify({ amount: 200 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database error" });
    });

    it("should handle clearing note by setting to null", async () => {
      const mockUser = { id: "user-123" };
      const mockUpdatedTransaction = {
        id: "tx-1",
        user_id: "user-123",
        category_id: "cat-1",
        type: "expense",
        amount: 100,
        date: "2026-01-03",
        note: null,
        category: { id: "cat-1", name: "餐飲", type: "expense" },
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedTransaction, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "PUT",
        body: JSON.stringify({ note: "" }), // Empty string should become null
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "tx-1" }) });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/transactions/[id]", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should delete transaction successfully", async () => {
      const mockUser = { id: "user-123" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith("transactions");
    });

    it("should return 500 if database error occurs", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { message: "Foreign key constraint" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      });

      const request = new Request("http://localhost:3000/api/transactions/tx-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "tx-1" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Foreign key constraint" });
    });
  });
});
