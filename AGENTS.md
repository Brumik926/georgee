<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
- Transaction detail colors use dedicated semantic tokens with light-mode aliases so its reference styling does not change other screens.
- Android TWA releases open the published site and must have their signing certificate listed in Digital Asset Links; retain earlier fingerprints so old installations remain associated. Keep signing credentials only in private artifact metadata, never in source.
- FIT monthly totals and category breakdowns use the pure budget-summary selector with a local-calendar month; recurring category limits remain in the existing bank store so browsing history does not modify account data.
- Keep login and password recovery on the public auth route; the protected layout validates the user and renders Outlet so successful login exposes child screens instead of a second login form.
- Account owner displays consume the shared bank store's persisted profile; edit drafts stay local and saveProfile publishes only confirmed database results so screens cannot disagree after saving.
- AI assistant calls use the authenticated server function and Lovable AI Gateway with the managed LOVABLE_API_KEY; never require a separate Anthropic credential.
