import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_goals_and_budgets",
  title: "Savings goals and budgets",
  description: "List the signed-in user's savings goals and monthly budget limits per category.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const [g, b] = await Promise.all([
      sb.from("goals").select("name, target, saved"),
      sb.from("budgets").select("category, limit_amount"),
    ]);
    if (g.error) throw new ToolError(g.error.message);
    if (b.error) throw new ToolError(b.error.message);
    const goals = (g.data ?? []).map((x) => ({ name: String(x.name), target: Number(x.target), saved: Number(x.saved) }));
    const budgets = (b.data ?? []).map((x) => ({ category: String(x.category), limit: Number(x.limit_amount) }));
    const text = [
      "Goals:", ...goals.map((x) => `- ${x.name}: ${x.saved} / ${x.target} €`),
      "Budgets:", ...budgets.map((x) => `- ${x.category}: ${x.limit} €`),
    ].join("\n");
    return { content: [{ type: "text", text }], structuredContent: { goals, budgets } };
  },
});
