import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Prepojenie aplikácie · George" },
      { name: "description", content: "Povoľte externej aplikácii prístup k vášmu účtu George." },
      { property: "og:title", content: "Prepojenie aplikácie · George" },
      { property: "og:description", content: "Povoľte externej aplikácii prístup k vášmu účtu George." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Chýba identifikátor žiadosti.");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
    return { email: data.session.user.email ?? "" };
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  pendingComponent: () => <main className="p-8 text-center text-sm text-muted-foreground">Načítavam žiadosť…</main>,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-[430px] p-8 text-center">
      <h1 className="text-xl font-bold">Žiadosť sa nedá načítať</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : String(error)} Žiadosť mohla vypršať — skúste prepojenie spustiť znova.
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const { email } = Route.useRouteContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "Aplikácia";
  const redirectUri: string | undefined = details?.redirect_uri ?? details?.client?.redirect_uri;
  const scopes: string[] = String(details?.scope ?? "").split(" ").filter(Boolean);
  const label = (s: string) =>
    s === "openid" ? "Overenie totožnosti" : s === "email" ? "Vaša e-mailová adresa" : s === "profile" ? "Základný profil" : `Ďalšie oprávnenie: ${s}`;

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorization_id)
        : await oauth().denyAuthorization(authorization_id);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("Server nevrátil adresu na návrat.");
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Akcia sa nepodarila.");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 py-10 text-foreground">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Prepojiť {client} s aplikáciou George</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {client} bude môcť čítať údaje vášho účtu (zostatok, transakcie, sporenie, rozpočet), kým ste prihlásený.
        </p>
        <p className="mt-4 text-sm">Prihlásený ako <strong>{email}</strong></p>
        {redirectUri ? <p className="mt-1 break-all text-xs text-muted-foreground">Návrat na: {redirectUri}</p> : null}
        {scopes.length ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">{scopes.map((s) => <li key={s}>{label(s)}</li>)}</ul>
        ) : null}
        <p className="mt-4 text-xs text-muted-foreground">Toto neobchádza oprávnenia ani ochranu údajov aplikácie.</p>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-6 grid gap-2">
          <button disabled={busy} onClick={() => decide(true)} className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">
            Povoliť
          </button>
          <button disabled={busy} onClick={() => decide(false)} className="rounded-xl border border-border px-4 py-3 font-semibold disabled:opacity-60">
            Zrušiť prepojenie
          </button>
        </div>
      </div>
    </main>
  );
}
