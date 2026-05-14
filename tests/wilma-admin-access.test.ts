import { describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn(async () => {
  throw new Error("Admin access required.");
});

vi.mock("@/lib/auth", () => ({
  requireAdmin
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wilmaChatSession: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    productOrder: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    auditEvent: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  })
}));

describe("Wilma admin access control", () => {
  it("blocks non-admin access to /admin/wilma", async () => {
    const page = await import("@/app/admin/wilma/page");

    await expect(page.default({ searchParams: Promise.resolve({}) })).rejects.toThrow("Admin access required.");
    expect(requireAdmin).toHaveBeenCalled();
  }, 30_000);

  it("blocks non-admin access to /admin/wilma/[sessionId]", async () => {
    const page = await import("@/app/admin/wilma/[sessionId]/page");

    await expect(
      page.default({ params: Promise.resolve({ sessionId: "wilma_session_123" }) })
    ).rejects.toThrow("Admin access required.");
    expect(requireAdmin).toHaveBeenCalled();
  }, 30_000);
});
