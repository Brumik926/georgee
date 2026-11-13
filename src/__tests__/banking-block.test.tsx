import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BankingAccessGate } from "@/components/bank/BankingAccessGate";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc, channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: vi.fn(),
} }));
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><BankingAccessGate userId="blocked-user"><p>Banking balance</p></BankingAccessGate></QueryClientProvider>);
}
describe("Blocked user banking access", () => {
  beforeEach(() => vi.clearAllMocks());
  it("denies banking and offers the requested payment destination when blocked", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    show();
    expect(await screen.findByRole("link")).toHaveAttribute("href", "https://m3.aircash.eu/acpay/tomasl5");
    expect(screen.queryByText("Banking balance")).not.toBeInTheDocument();
  });
  it("restores banking for unblocked users", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    show();
    expect(await screen.findByText("Banking balance")).toBeInTheDocument();
  });
  it("does not expose banking if the access check fails", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("offline") });
    show();
    await screen.findByRole("button", { name: "Skúsiť znova" });
    expect(screen.queryByText("Banking balance")).not.toBeInTheDocument();
  });
});