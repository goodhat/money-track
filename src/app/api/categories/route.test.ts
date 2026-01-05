import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextResponse } from "next/server";

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

describe("Categories API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return categories for authenticated user", async () => {
      const mockUser = { id: "user-123" };
      const mockCategories = [
        { id: "1", name: "餐飲", type: "expense", user_id: "user-123" },
        { id: "2", name: "薪資", type: "income", user_id: "user-123" },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockCategories, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ data: mockCategories });
      expect(mockSupabase.from).toHaveBeenCalledWith("categories");
    });

    it("should return 500 if database error occurs", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { message: "Database error" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database error" });
    });
  });

  describe("POST /api/categories", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: "Test", type: "expense" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 if name is missing", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        body: JSON.stringify({ type: "expense" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Name and type are required" });
    });

    it("should return 400 if type is invalid", async () => {
      const mockUser = { id: "user-123" };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: "Test", type: "invalid" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Type must be 'income' or 'expense'" });
    });

    it("should create category successfully", async () => {
      const mockUser = { id: "user-123" };
      const mockCategory = { id: "1", name: "Test", type: "expense", user_id: "user-123" };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockCategory, error: null });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: "Test", type: "expense" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({ data: mockCategory });
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        name: "Test",
        type: "expense",
      });
    });

    it("should return 500 if database error occurs on insert", async () => {
      const mockUser = { id: "user-123" };
      const mockError = { message: "Database error" };

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

      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: "Test", type: "expense" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Database error" });
    });
  });
});
