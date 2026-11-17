import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "@/lib/oauth-return-path";

describe("oauthReturnPath", () => {
  it("povolí iba internú cestu vrátane query a hash", () => {
    expect(oauthReturnPath("/platby?q=potraviny#posledne")).toBe("/platby?q=potraviny#posledne");
  });

  it("presmeruje prázdne a neplatné hodnoty na prehľad", () => {
    expect(oauthReturnPath(undefined)).toBe("/");
    expect(oauthReturnPath("https://example.com")).toBe("/");
    expect(oauthReturnPath("javascript:alert(1)")).toBe("/");
  });

  it("odmietne protokolové relatívne a spätné lomky", () => {
    expect(oauthReturnPath("//example.com")).toBe("/");
    expect(oauthReturnPath("/\\\\example.com")).toBe("/");
  });

  it("odmietne riadiace znaky", () => {
    expect(oauthReturnPath("/platby\nmalicious")).toBe("/");
  });
});
