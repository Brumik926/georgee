import { inMonth, type BankState } from "@/lib/bank-store";

/** Monthly cash flow and recurring category limits share the same local-calendar filter. */
export function budgetSummary(state: Pick<BankState, "transactions" | "budgets">, month: Date) {
  const rows = state.transactions.filter((transaction) => inMonth(transaction, month));
  const categories = (type: "in" | "out") => {
    const amounts = new Map<string, number>();
    for (const row of rows) {
      if (row.type !== type) continue;
      amounts.set(row.category, (amounts.get(row.category) ?? 0) + row.amount);
    }
    return [...amounts.entries()].map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };
  const expenses = categories("out");
  const incomes = categories("in");
  const expense = expenses.reduce((sum, row) => sum + row.amount, 0);
  const income = incomes.reduce((sum, row) => sum + row.amount, 0);
  const budget = state.budgets.reduce((sum, row) => sum + row.limit, 0);
  return { expenses, incomes, expense, income, budget, remaining: budget - expense, net: income - expense };
}