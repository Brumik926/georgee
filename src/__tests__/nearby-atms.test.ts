import { describe, expect, it } from "vitest";
import { distanceMeters, isSlspTags } from "@/lib/nearby-atms";

describe("nearby ATMs", () => {
  it("rozpozná bankomat Slovenskej sporiteľne podľa prevádzkovateľa", () => {
    expect(isSlspTags({ operator: "Slovenská sporiteľňa" })).toBe(true);
    expect(isSlspTags({ brand: "Tatra banka" })).toBe(false);
  });
  it("počíta vzdialenosť Bratislava–Košice približne 313 km", () => {
    const d = distanceMeters(48.1486, 17.1077, 48.7164, 21.2611);
    expect(d / 1000).toBeGreaterThan(305);
    expect(d / 1000).toBeLessThan(320);
  });
});
