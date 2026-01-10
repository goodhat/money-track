import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Goals API", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };
  const mockGoals = [
    {
      id: "goal-1",
      user_id: "user-123",
      name: "Emergency Fund",
      target_amount: 100000,
      current_amount: 25000,
      target_date: "2025-12-31",
      color: "#3b82f6",
      icon: "piggy-bank",
      is_completed: false,
      completed_at: null,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/goals", () => {
    it("should return 401 when not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return goals when authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        returns: vi.fn().mockResolvedValue({ data: mockGoals, error: null }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockGoals);
    });
  });

  describe("POST /api/goals", () => {
    it("should return 401 when not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new Request("http://localhost/api/goals", {
        method: "POST",
        body: JSON.stringify({ name: "Test Goal", target_amount: 50000 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should require name and target_amount", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new Request("http://localhost/api/goals", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should create a goal when valid data provided", async () => {
      const newGoal = { ...mockGoals[0], id: "goal-new" };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newGoal, error: null }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new Request("http://localhost/api/goals", {
        method: "POST",
        body: JSON.stringify({
          name: "Emergency Fund",
          target_amount: 100000,
          target_date: "2025-12-31",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toBeDefined();
    });

    it("should reject negative target_amount", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const request = new Request("http://localhost/api/goals", {
        method: "POST",
        body: JSON.stringify({ name: "Test Goal", target_amount: -1000 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("positive");
    });
  });
});
