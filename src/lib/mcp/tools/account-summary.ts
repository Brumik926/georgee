import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_account_summary",
  title: "Account summary",
  description: "Get the signed-in user's account owner, IBAN, current balance and this month's income and expenses.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const [profile, txns] = await Promise.all([
      sb.from("profiles").select("owner, iban").maybeSingle(),
      sb.from("transactions").select("type, amount, date"),
    ]);
    if (txns.error) throw new ToolError(txns.error.message);
    const now = new Date();
    let balance = 0, income = 0, expense = 0;
    for (const t of txns.data ?? []) {
      const a = Number(t.amount);
      balance += t.type === "in" ? a : -a;
      const d = new Date(String(t.date));
      if (d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth()) {
        if (t.type === "in") income += a; else expense += a;
      }
    }
    const summary = {
      owner: String(profile.data?.owner ?? ""),
      iban: String(profile.data?.iban ?? ""),
      balance: Math.round(balance * 100) / 100,
      monthIncome: Math.round(income * 100) / 100,
      monthExpense: Math.round(expense * 100) / 100,
    };
    return {
      content: [{ type: "text", text: `Balance ${summary.balance.toFixed(2)} €, this month +${summary.monthIncome.toFixed(2)} € / -${summary.monthExpense.toFixed(2)} €.` }],
      structuredContent: { summary },
    };
  },
});
