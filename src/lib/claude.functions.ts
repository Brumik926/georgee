import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const askClaude = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { prompt: string }) => data)
  .handler(async ({ data, context }) => {
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
          "Si osobný bankový asistent George pre Slovenskú sporiteľňu. Odpovedaj priateľsky, vecne a stručne po slovensky. Pomáhaj používateľovi s financiami, rozpočtom, sporením a bežnými bankovými otázkami.",
        messages: [{ role: "user", content: data.prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Chyba AI brány (${response.status})`);
    }

    return await response.json();
  });
