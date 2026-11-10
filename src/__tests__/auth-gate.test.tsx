import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser } } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  redirect: (options: unknown) => ({ redirect: options }),
  Outlet: () => null,
}));
vi.mock("@/components/bank/BiometricLock", () => ({ BiometricLock: () => null }));
vi.mock("@/components/bank/AppShell", () => ({ PersistentBottomNav: () => null }));
vi.mock("@/components/bank/SessionTimeoutWarning", () => ({ SessionTimeoutWarning: () => null }));
import { Route } from "@/routes/_authenticated/route";

const gate = Route as unknown as {
  beforeLoad: (args: { location: { href: string } }) => Promise<{ user: { id: string } }>;
};
describe("Authenticated banking access", () => {
  beforeEach(() => vi.clearAllMocks());
  it("allows a verified signed-in user to proceed", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
    expect(await gate.beforeLoad({ location: { href: "/platby" } })).toEqual({ user: { id: "verified-user" } });
  });
  it("redirects signed-out users to sign-in and preserves their destination", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(gate.beforeLoad({ location: { href: "/platby" } })).rejects.toEqual({
      redirect: { to: "/auth", search: { next: "/platby" }, replace: true },
    });
  });
});