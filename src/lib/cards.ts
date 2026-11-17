// src/lib/cards.ts
// Spoločny zdroj údajov o kartách: úvodná obrazovka aj obrazovka Karty
// musia zobrazovať tie isté karty a rovnaký stav blokovania.

export interface BankCard {
  id: string;
  label: string;
  last4: string;
  number: string;
  cvv: string;
  expiry: string;
}

export type CardSettings = { blocked: boolean; payLimit: number; atmLimit: number };

export const DEFAULT_CARD_SETTINGS: CardSettings = {
  blocked: false,
  payLimit: 1500,
  atmLimit: 500,
};

export const CARDS: BankCard[] = [
  {
    id: "mc-3302",
    label: "Virtuálna karta Visa",
    last4: "3302",
    number: "4123 4567 8901 3302",
    cvv: "945",
    expiry: "10/31",
  },
  {
    id: "mc-5739",
    label: "Virtuálna karta Visa",
    last4: "5739",
    number: "4123 4567 2050 5739",
    cvv: "081",
    expiry: "10/31",
  },
];

const settingsKey = (userId: string) => `george-cards:${userId}`;

export function loadCardSettings(userId: string | null | undefined): Record<string, CardSettings> {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(settingsKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, CardSettings>) : {};
  } catch {
    // Vypnuté úložisko: predvolený stav kariet.
    return {};
  }
}

export function saveCardSettings(
  userId: string | null | undefined,
  next: Record<string, CardSettings>,
): void {
  if (!userId) return;
  try {
    localStorage.setItem(settingsKey(userId), JSON.stringify(next));
  } catch {
    // Úložisko môže byť vypnuté; zmena zostane len v tejto relácii.
  }
}
