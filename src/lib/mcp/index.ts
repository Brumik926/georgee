import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTransactions from "./tools/list-transactions";
import accountSummary from "./tools/account-summary";
import listGoalsBudgets from "./tools/list-goals-budgets";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "george1",
  title: "George1",
  version: "0.1.0",
  instructions:
    "Read-only tools for the George1 banking app: account summary (balance, monthly income/expenses), recent transactions, savings goals and budgets of the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [accountSummary, listTransactions, listGoalsBudgets],
});
