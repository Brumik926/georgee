import { Txn, Goal, BudgetLimit } from "./bank-store";

export function anonymizeFinances(
  txns: Txn[],
  goals: Goal[],
  budgets: BudgetLimit[]
) {
  // Ponecháme posledných 20 transakcií bez osobných údajov
  const sanitizedTxns = txns.slice(0, 20).map((t) => ({
    smer: t.type === "in" ? "príjem" : "výdaj",
    suma_eur: t.amount,
    kategoria: t.category,
    // Ak ide o známy obchod (Billa, Slovnaft), názov necháme, inak anonymizujeme
    popis: ["Billa", "Slovnaft", "Nájom", "Kino"].some((b) => t.counterparty.includes(b))
      ? t.counterparty
      : t.type === "in" ? "Prichádzajúca platba" : "Platba kartou",
    den_v_mesiaci: new Date(t.date).getDate(),
  }));

  const sanitizedBudgets = budgets.map((b) => ({
    kategoria: b.category,
    limit_eur: b.limit,
  }));

  const sanitizedGoals = goals.map((g) => ({
    ciel: g.name,
    nasporene_eur: g.saved,
    cielova_suma_eur: g.target,
  }));

  return {
    transakcie: sanitizedTxns,
    rozpoctove_limity: sanitizedBudgets,
    sporiace_ciele: sanitizedGoals,
  };
}
