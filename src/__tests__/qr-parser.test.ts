import { describe, expect, it } from "vitest";
import { parsePaymentQr } from "@/lib/qr-parser";

describe("Platobné QR kódy", () => {
  it("načíta Payme URL a predvyplní platobné údaje", () => {
    const parsed = parsePaymentQr(
      "https://payme.sk/?iban=SK3112000000198742637541&am=12.50&cn=Test%20Prijemca&vs=123456&msg=Faktura",
    );

    expect(parsed).toEqual({
      iban: "SK3112000000198742637541",
      amount: "12.50",
      recipientName: "Test Prijemca",
      vs: "123456",
      note: "Faktura",
    });
  });

  it("načíta základné polia EPC/SEPA QR formátu", () => {
    const raw = [
      "BCD",
      "001",
      "1",
      "SCT",
      "SK TEST BANKA",
      "Test Prijemca",
      "SK3112000000198742637541",
      "EUR12.50",
      "",
      "VS123456",
      "Faktura",
    ].join("\n");

    const parsed = parsePaymentQr(raw);

    expect(parsed?.recipientName).toBe("Test Prijemca");
    expect(parsed?.iban).toBe("SK3112000000198742637541");
    expect(parsed?.amount).toBe("12.50");
  });

  it("nájde IBAN, sumu a variabilný symbol v obyčajnom texte", () => {
    const parsed = parsePaymentQr(
      "Platba na účet SK3112000000198742637541, suma 25,90 €, VS: 987654",
    );

    expect(parsed).toEqual({
      iban: "SK3112000000198742637541",
      amount: "25.90",
      vs: "987654",
    });
  });

  it("vráti null, ak text neobsahuje podporované platobné údaje", () => {
    expect(parsePaymentQr("Toto nie je platobný QR kód")).toBeNull();
  });
});
