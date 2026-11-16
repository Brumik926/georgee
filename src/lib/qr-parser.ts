export interface ParsedPaymentData {
  iban?: string | undefined;
  amount?: string | undefined;
  recipientName?: string | undefined;
  vs?: string | undefined;
  note?: string | undefined;
}

function normalizeQrAmount(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/\s/g, "").replace(/^EUR/i, "");
  const match = cleaned.match(/\d+(?:[.,]\d{1,2})?/);
  return match?.[0]?.replace(",", ".") ?? undefined;
}

export function parsePaymentQr(raw: string): ParsedPaymentData | null {
  const text = raw.trim();

  // 1. Payme URL formát: https://payme.sk?... alebo payme://...
  if (text.includes("payme.sk") || text.startsWith("payme:")) {
    try {
      const url = new URL(text.replace("payme://", "https://payme.sk/"));
      const p = url.searchParams;
      return {
        iban: p.get("iban") || p.get("IBAN") || undefined,
        amount: normalizeQrAmount(p.get("am") || p.get("amount")),
        recipientName: p.get("cn") || p.get("recipient") || undefined,
        vs: p.get("vs") || undefined,
        note: p.get("msg") || p.get("note") || undefined,
      };
    } catch {
      // fallback ďalej
    }
  }

  // 2. Európsky SEPA / EPC QR kód (BCD)
  if (text.startsWith("BCD")) {
    const lines = text.split(/\r?\n/);
    if (lines.length >= 8) {
      // EPC: BIC je na indexe 4, názov príjemcu na 5 a IBAN na 6.
      const recipientName = lines[5]?.trim();
      const iban = lines[6]?.trim();
      const amount = normalizeQrAmount(lines[7]);
      const purpose = lines[8]?.trim();
      const structured = lines[9]?.trim();
      const note = lines[10]?.trim();
      const vsText = [structured ?? "", note ?? ""].join(" ");
      const vsMatch = vsText.match(/(?:^|[^A-Z0-9])VS\s*[:/]?\s*(\d{1,10})/i);

      return {
        recipientName: recipientName || undefined,
        iban: iban || undefined,
        amount,
        vs: vsMatch?.[1] ?? undefined,
        note: note || purpose || undefined,
      };
    }
  }

  // 3. Fallback: detekcia slovenského IBAN a sumy v obyčajnom texte
  const ibanMatch = text.match(/SK\d{2}\s?(?:\d{4}\s?){4}\d{4}/i);
  const amountMatch = text.match(/(\d+[.,]\d{2})\s?€?/);
  const vsMatch = text.match(/(?:VS|variabilny|var\.?\s*symbol)[:\s]*(\d{1,10})/i);

  if (ibanMatch) {
    return {
      iban: (ibanMatch[0] ?? "").replace(/\s+/g, "").toUpperCase(),
      amount: amountMatch?.[1]?.replace(",", ".") ?? undefined,
      vs: vsMatch?.[1] ?? undefined,
    };
  }

  return null;
}
