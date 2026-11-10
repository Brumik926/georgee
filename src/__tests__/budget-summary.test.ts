import { describe, expect, it } from "vitest";
import { budgetSummary } from "@/lib/budget-summary";
import type { Txn } from "@/lib/bank-store";

const transactions: Txn[] = [
  { id: "1", type: "out", counterparty: "Potraviny", category: "Potraviny", amount: 40, date: new Date(2026, 9, 3).toISOString() },
  { id: "2", type: "out", counterparty: "Tankovanie", category: "Doprava", amount: 60, date: new Date(2026, 9, 4).toISOString() },
  { id: "3", type: "in", counterparty: "Mzda", category: "Mzda", amount: 1500, date: new Date(2026, 9, 5).toISOString() },
  { id: "4", type: "out", counterparty: "Lekáreň", category: "Zdravie", amount: 20, date: new Date(2026, 8, 30).toISOString() },
  { id: "5", type: "in", counterparty: "Staršia mzda", category: "Mzda", amount: 1000, date: new Date(2025, 9, 5).toISOString() },
];
const state = { transactions, budgets: [{ category: "Potraviny", limit: 400 }, { category: "Doprava", limit: 150 }] };
describe("Mesačný FIT prehľad", () => {
  it("zobrazuje iba príjmy a výdavky vybraného mesiaca a roka", () => {
    const summary = budgetSummary(state, new Date(2026, 9, 1));
    expect(summary.expense).toBe(100);
    expect(summary.income).toBe(1500);
    expect(summary.net).toBe(1400);
  });
  it("po prepnutí mesiaca prepočíta kategórie aj celkové výdavky", () => {
    const summary = budgetSummary(state, new Date(2026, 8, 1));
    expect(summary.expense).toBe(20);
    expect(summary.income).toBe(0);
    expect(summary.expenses).toEqual([{ category: "Zdravie", amount: 20 }]);
  });
  it("mesačný rozpočet je súčet limitov a zvyšok odpočíta všetky výdavky", () => {
    const summary = budgetSummary(state, new Date(2026, 9, 1));
    expect(summary.budget).toBe(550);
    expect(summary.remaining).toBe(450);
  });
  it("bez limitov nevytvára fiktívny rozpočet", () => {
    expect(budgetSummary({ transactions: [], budgets: [] }, new Date(2026, 9, 1)).budget).toBe(0);
  });
});