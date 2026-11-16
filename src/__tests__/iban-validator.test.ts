import { describe, expect, it } from "vitest";
import { formatIban, normalizeIban, validateIban } from "@/lib/iban-validator";

describe("IBAN validátor", () => {
  it("normalizuje medzery a veľkosť písmen", () => {
    expect(normalizeIban(" nl91 abna 0417 1643 00 ")).toBe("NL91ABNA0417164300");
    expect(formatIban("NL91ABNA0417164300")).toBe("NL91 ABNA 0417 1643 00");
  });

  it("overí platné IBAN z rôznych krajín SEPA", () => {
    expect(validateIban("SK31 1200 0000 1987 4263 7541").valid).toBe(true);
    expect(validateIban("NL91 ABNA 0417 1643 00").valid).toBe(true);
    expect(validateIban("FR14 2004 1010 0505 0001 3M02 606").valid).toBe(true);
    expect(validateIban("GB29 NWBK 6016 1331 9268 19").valid).toBe(true);
  });

  it("odmietne nesprávnu dĺžku pre známu krajinu", () => {
    const result = validateIban("DE8937040044053201300");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("presne 22 znakov");
  });

  it("odmietne neplatný kontrolný súčet", () => {
    expect(validateIban("SK3212000000198742637541").valid).toBe(false);
  });

  it("vyžaduje IBAN", () => {
    expect(validateIban("   ").error).toBe("Zadajte IBAN.");
  });
});
