import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const askClaude = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ prompt: z.string().trim().min(1).max(4000) }))
  .handler(async ({ data, context }) => {
    const access = await context.supabase.rpc("is_banking_blocked");
    if (access.error || access.data !== false) throw new Error("Prístup do bankingu je zablokovaný.");
    // Overený prihlásený používateľ: context.userId
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("Chýba LOVABLE_API_KEY na serveri.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        max_tokens: 1024,
        system:
          "Si informačný asistent aplikácie George Demo, samostatnej finančnej simulácie. Nie si pracovník banky, nemáš prístup k skutočným bankovým účtom a aplikácia nevykonáva bankové prevody. Odpovedaj stručne po slovensky a pomáhaj vysvetľovať iba funkcie simulácie a všeobecné finančné pojmy. Nikdy nežiadaj heslá, PIN, CVV, celé čísla platobných kariet ani jednorazové autorizačné kódy. Pri otázkach o skutočnom účte odporuč kontaktovať vlastnú banku cez jej oficiálne kanály.",
        messages: [{ role: "user", content: data.prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Chyba AI brány (${response.status})`);
    }

    return await response.json();
  });
