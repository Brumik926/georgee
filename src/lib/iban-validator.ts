/**
 * IBAN validátor s kontrolou dĺžky, štruktúry a ISO 7064 MOD-97 kontrolného súčtu.
 */

// Špecifické dĺžky IBAN pre vybrané SEPA krajiny
const IBAN_LENGTHS: Record<string, number> = {
  SK: 24, // Slovensko
  CZ: 24, // Česko
  AT: 20, // Rakúsko
  DE: 22, // Nemecko
  PL: 28, // Poľsko
  HU: 28, // Maďarskoa
};

export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

export function formatIban(iban: string): string {
  const cleaned = normalizeIban(iban);
  return cleaned.match(/.{1,4}/g)?.join(" ") ?? cleaned;
}

export function validateIban(iban: string): { valid: boolean; error?: string } {
  const cleaned = normalizeIban(iban);

  if (!cleaned) {
    return { valid: false, error: "Zadajte IBAN." };
  }

  // Základný formát: 2 písmená krajiny + 2 kontrolné číslice + alfanumerické znaky (max 34)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return { valid: false, error: "IBAN nemá správny formát (napr. SK89 0900 ...)." };
  }

  const country = cleaned.slice(0, 2);
  const expectedLength = IBAN_LENGTHS[country];
  if (expectedLength && cleaned.length !== expectedLength) {
    return {
      valid: false,
      error: `IBAN pre krajinu ${country} musí mať presne ${expectedLength} znakov (zadaných: ${cleaned.length}).`,
    };
  }

  // ISO 7064 MOD-97 kontrola:
  // 1. Presunúť prvé 4 znaky na koniec reťazca
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

  // 2. Nahradiť písmená číslami (A = 10, B = 11, ..., Z = 35)
  let numeric = "";
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i]!;
    if (char >= "A" && char <= "Z") {
      numeric += (char.charCodeAt(0) - 55).toString();
    } else {
      numeric += char;
    }
  }

  // 3. Spočítanie modulo 97 po blokoch (kvôli limitu veľkosti čísiel v JS)
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i]!, 10)) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, error: "Kontrolný súčet IBAN je neplatný. Skontrolujte preklepy." };
  }

  return { valid: true };
}
