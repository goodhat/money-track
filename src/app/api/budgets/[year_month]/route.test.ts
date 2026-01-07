import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";

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

describe("Budgets [year_month] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/budgets/[year_month]", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new Request("http://localhost:3000/api/budgets/2026-01");
      const response = await GET(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return budget for authenticated user", async () => {
      const mockUser = { id: "user-123" };
      const mockBudget = {
        id: "budget-1",
        user_id: "user-123",
        year_month: "2026-01",
        amount: 50000,
        created_at: "2026-01-01T00:00:00Z",
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockBudget, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/budgets/2026-01");
      const response = await GET(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ data: mockBudget });
      expect(mockSupabase.from).toHaveBeenCalledWith("budgets");
    });

    it("should return null data when budget not found (PGRST116)", async () => {
      const mockUser = { id: "user-123" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/budgets/2026-02");
      const response = await GET(request, { params: Promise.resolve({ year_month: "2026-02" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ data: null });
    });

    it("should return 500 for other database errors", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { code: "42P01", message: "Table not found" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        eq: mockEq,
      });

      mockEq.mockReturnValueOnce({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/budgets/2026-01");
      const response = await GET(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Table not found" });
    });
  });

  describe("PUT /api/budgets/[year_month]", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new Request("http://localhost:3000/api/budgets/2026-01", {
        method: "PUT",
        body: JSON.stringify({ amount: 50000 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 if amount is undefined", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/budgets/2026-01", {
        method: "PUT",
        body: JSON.stringify({}),
      });

      const response = await PUT(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Amount must be a non-negative number" });
    });

    it("should return 400 if amount is negative", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/budgets/2026-01", {
        method: "PUT",
        body: JSON.stringify({ amount: -100 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Amount must be a non-negative number" });
    });

    it("should create/update budget successfully (upsert)", async () => {
      const mockUser = { id: "user-123" };
      const mockBudget = {
        id: "budget-1",
        user_id: "user-123",
        year_month: "2026-01",
        amount: 50000,
        created_at: "2026-01-01T00:00:00Z",
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockBudget, error: null });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/budgets/2026-01", {
        method: "PUT",
        body: JSON.stringify({ amount: 50000 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ data: mockBudget });
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: "user-123",
          year_month: "2026-01",
          amount: 50000,
        },
        {
          onConflict: "user_id,year_month",
        }
      );
    });

    it("should allow zero amount for budget", async () => {
      const mockUser = { id: "user-123" };
      const mockBudget = {
        id: "budget-1",
        user_id: "user-123",
        year_month: "2026-01",
        amount: 0,
        created_at: "2026-01-01T00:00:00Z",
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockBudget, error: null });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/budgets/2026-01", {
        method: "PUT",
        body: JSON.stringify({ amount: 0 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ data: mockBudget });
    });

    it("should return 500 if database error occurs", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { message: "Database error" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/budgets/2026-01", {
        method: "PUT",
        body: JSON.stringify({ amount: 50000 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ year_month: "2026-01" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database error" });
    });

    it("should handle various year_month formats", async () => {
      const mockUser = { id: "user-123" };
      const mockBudget = {
        id: "budget-1",
        user_id: "user-123",
        year_month: "2025-12",
        amount: 75000,
        created_at: "2025-12-01T00:00:00Z",
      };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockUpsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockBudget, error: null });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/budgets/2025-12", {
        method: "PUT",
        body: JSON.stringify({ amount: 75000 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ year_month: "2025-12" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: "user-123",
          year_month: "2025-12",
          amount: 75000,
        },
        {
          onConflict: "user_id,year_month",
        }
      );
    });
  });
});
