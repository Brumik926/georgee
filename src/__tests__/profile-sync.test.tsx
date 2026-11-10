import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
  single: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => ({
      upsert: mocks.upsert,
    })),
  },
}));

import { resetStore, saveProfile, useBank } from "@/lib/bank-store";

describe("Synchronizácia uloženého majiteľa účtu", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetStore();
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const { hydrate } = await import("@/lib/bank-store");
    await hydrate();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "account-user" } } });
    mocks.upsert.mockReturnValue({ select: () => ({ single: mocks.single }) });
  });

  it("publikuje uložené meno do všetkých odberateľov a pri ďalšom uložení ho nahradí", async () => {
    const first = renderHook(() => useBank());
    const second = renderHook(() => useBank());
    mocks.single.mockResolvedValue({ data: { owner: "Marek Zobala", iban: "SK42" }, error: null });
    await act(async () => { await saveProfile(" Marek Zobala ", "SK42"); });
    await waitFor(() => {
      expect(first.result.current.owner).toBe("Marek Zobala");
      expect(second.result.current.owner).toBe("Marek Zobala");
    });
    expect(mocks.upsert).toHaveBeenCalledWith({ id: "account-user", owner: "Marek Zobala", iban: "SK42", seeded: true });
    mocks.single.mockResolvedValue({ data: { owner: "Ján Šamot", iban: "SK42" }, error: null });
    await act(async () => { await saveProfile("Ján Šamot", "SK42"); });
    expect(first.result.current.owner).toBe("Ján Šamot");
    expect(second.result.current.owner).toBe("Ján Šamot");
    first.unmount();
    second.unmount();
  });

  it("pri zlyhaní uloženia ponechá pôvodné potvrdené meno", async () => {
    mocks.single.mockResolvedValue({ data: { owner: "Marek Zobala", iban: "SK42" }, error: null });
    await saveProfile("Marek Zobala", "SK42");
    const profile = renderHook(() => useBank());
    mocks.single.mockResolvedValue({ data: null, error: new Error("Save failed") });
    await expect(saveProfile("Ján Šamot", "SK42")).rejects.toThrow("Save failed");
    expect(profile.result.current.owner).toBe("Marek Zobala");
    profile.unmount();
  });
});