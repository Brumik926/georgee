import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_transactions",
  title: "List transactions",
  description: "List the signed-in user's most recent account transactions (newest first).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("How many transactions to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("transactions")
      .select("id, type, counterparty, iban, amount, date, category, note, vs")
      .order("date", { ascending: false })
      .limit(limit ?? 20);
    if (error) throw new ToolError(error.message);
    const rows = (data ?? []).map((r) => ({
      id: String(r.id),
      type: String(r.type),
      counterparty: String(r.counterparty),
      iban: r.iban ? String(r.iban) : null,
      amount: Number(r.amount),
      date: String(r.date),
      category: String(r.category),
      note: r.note ? String(r.note) : null,
      vs: r.vs ? String(r.vs) : null,
    }));
    const text = rows.length
      ? rows.map((r) => `${r.date.slice(0, 10)} ${r.type === "in" ? "+" : "-"}${r.amount.toFixed(2)} € ${r.counterparty} (${r.category})`).join("\n")
      : "No transactions.";
    return { content: [{ type: "text", text }], structuredContent: { transactions: rows } };
  },
});
