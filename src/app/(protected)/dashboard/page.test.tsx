import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "./page";

// Mock fetch
let mockFetch: ReturnType<typeof vi.fn>;

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  it("should show loading state initially", () => {
    mockFetch.mockImplementationOnce(() =>
      new Promise(() => {}) // Never resolves
    );

    const { container } = render(<DashboardPage />);
    // Check for skeleton elements
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should display dashboard data after loading", async () => {
    const mockData = {
      data: {
        month: "2026-01",
        totalIncome: 50000,
        totalExpense: 30000,
        netIncome: 20000,
        budget: 40000,
        expenseByCategory: {
          餐飲: 10000,
          交通: 5000,
        },
        recentTransactions: [
          {
            id: "1",
            type: "expense",
            amount: 100,
            date: "2026-01-03",
            note: "Lunch",
            category: { id: "1", name: "餐飲", type: "expense" },
          },
        ],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    // Check if income is displayed in the income card
    await waitFor(() => {
      expect(screen.getByText("本月收入")).toBeInTheDocument();
    });

    // Check if the amounts are displayed (use getAllByText for duplicates)
    const expenseElements = screen.getAllByText(/30,000/);
    expect(expenseElements.length).toBeGreaterThan(0);

    // Check net income with + prefix
    expect(screen.getByText(/\+.*20,000/)).toBeInTheDocument();
  });

  it("should show budget progress when budget is set", async () => {
    const mockData = {
      data: {
        month: "2026-01",
        totalIncome: 0,
        totalExpense: 30000,
        netIncome: -30000,
        budget: 40000,
        expenseByCategory: {},
        recentTransactions: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("預算使用狀況")).toBeInTheDocument();
    });

    expect(screen.getByText(/本月預算/)).toBeInTheDocument();
  });

  it("should show message when budget is not set", async () => {
    const mockData = {
      data: {
        month: "2026-01",
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        budget: null,
        expenseByCategory: {},
        recentTransactions: [],
      },
    };

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("尚未設定預算")).toBeInTheDocument();
    });
  });

  it("should show message when no transactions exist", async () => {
    const mockData = {
      data: {
        month: "2026-01",
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        budget: null,
        expenseByCategory: {},
        recentTransactions: [],
      },
    };

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("本月尚無交易紀錄")).toBeInTheDocument();
    });
  });

  it("should format currency correctly", async () => {
    const mockData = {
      data: {
        month: "2026-01",
        totalIncome: 123456,
        totalExpense: 0,
        netIncome: 123456,
        budget: null,
        expenseByCategory: {},
        recentTransactions: [],
      },
    };

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<DashboardPage />);

    await waitFor(() => {
      // Check for Taiwan dollar formatting (getAllByText for multiple matches)
      const elements = screen.getAllByText(/123,456/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
