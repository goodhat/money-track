import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Recurring API", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/recurring", () => {
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

    it("should return due recurring templates", async () => {
      const today = new Date().toISOString().split("T")[0];
      const mockDueTemplates = [
        {
          id: "template-1",
          user_id: "user-123",
          name: "Monthly Rent",
          is_recurring: true,
          is_active: true,
          next_occurrence: today,
          recurrence_frequency: "monthly",
          category: { id: "cat-1", name: "Housing", type: "expense" },
        },
      ];

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDueTemplates, error: null }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.due_count).toBe(1);
    });

    it("should return 0 when no templates are due", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.due_count).toBe(0);
    });
  });

  describe("POST /api/recurring", () => {
    it("should return 401 when not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return message when no transactions are due", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        returns: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.applied).toBe(0);
      expect(data.message).toContain("No recurring transactions due");
    });
  });
});
