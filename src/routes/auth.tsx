import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s["next"] === "string" ? { next: s["next"] } : {},
  head: () => ({
    meta: [
      { title: "Prihlásenie · Internetbanking George" },
      {
        name: "description",
        content: "Prihláste sa do internetbankingu George a majte svoje platby, sporenie a rozpočet vždy po ruke.",
      },
      { property: "og:title", content: "Prihlásenie · Internetbanking George" },
      {
        property: "og:description",
        content: "Prihláste sa do internetbankingu George a majte svoje platby, sporenie a rozpočet vždy po ruke.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next: rawNext } = Route.useSearch();
  const next = oauthReturnPath(rawNext);
  const goNext = () => {
    navigate({ to: next, replace: true });
  };

  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [owner, setOwner] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !isRecovery) goNext();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      } else if (event === "SIGNED_IN" && !isRecovery) {
        goNext();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, next, isRecovery]);

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Vaše heslo bolo úspešne zmenené.");
      setIsRecovery(false);
      goNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Zmena hesla zlyhala.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Zadajte prosím váš e-mail.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/auth", window.location.origin).href,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Odkaz na obnovenie hesla sme odoslali na váš e-mail.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Odoslanie odkazu zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL("/auth", window.location.origin).href,
            data: { owner: owner.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Poslali sme vám overovací e-mail. Potvrďte ho a potom sa prihláste.");
          return;
        }
        toast.success("Účet je vytvorený.");
        goNext();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Prihlásenie úspešné.");
        goNext();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prihlásenie sa nepodarilo.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setBusy(false);
      toast.error("Prihlásenie cez Google sa nepodarilo.");
      return;
    }
    if (result.redirected) return;
    goNext();
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-background">
      <header className="brand-header px-5 pb-14 pt-10 text-brand-foreground">
        <p className="text-[13px] font-semibold tracking-wide opacity-90">George · Slovenská sporiteľňa</p>
        <h1 className="mt-3 text-[34px] font-bold leading-none">
          {isRecovery
            ? "Nové heslo"
            : mode === "reset"
            ? "Obnova hesla"
            : mode === "in"
            ? "Prihlásenie"
            : "Nový účet"}
        </h1>
        <p className="mt-2 text-sm opacity-80">
          {isRecovery
            ? "Zadajte nové bezpečné heslo k vášmu účtu."
            : mode === "reset"
            ? "Zadajte svoj e-mail a pošleme vám odkaz na obnovenie prístupu."
            : "Vaše platby, sporenie a rozpočet zostanú uložené aj po zatvorení aplikácie."}
        </p>
      </header>

      <div className="-mt-10 px-5">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-lg">
          {isRecovery ? (
            <form onSubmit={submitNewPassword} className="space-y-4">
              <label className="block text-sm">
                <span className="text-muted-foreground">Nové heslo</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimálne 8 znakov"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
              >
                Uložiť nové heslo
              </button>
            </form>
          ) : mode === "reset" ? (
            <div>
              {resetSent ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                    Odkaz na obnovenie hesla sme odoslali na adresu <strong>{email}</strong>.
                    Skontrolujte si e-mailovú schránku (prípadne priečinok Spam).
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetSent(false);
                      setMode("in");
                    }}
                    className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
                  >
                    Späť na prihlásenie
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Váš prihlasovací e-mail</span>
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="meno@priklad.sk"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Odoslať odkaz na obnovenie
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("in")}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Naspäť na prihlásenie
                  </button>
                </form>
              )}
            </div>
          ) : sent ? (
            <p className="text-sm text-muted-foreground">
              Skontrolujte si e-mail <strong className="text-foreground">{email}</strong> a potvrďte registráciu.
              Potom sa môžete prihlásiť.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {mode === "up" ? (
                <label className="block text-sm">
                  <span className="text-muted-foreground">Meno majiteľa účtu</span>
                  <input
                    required
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Jakub Varga"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary"
                  />
                </label>
              ) : null}
              <label className="block text-sm">
                <span className="text-muted-foreground">E-mail</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="block text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Heslo</span>
                  {mode === "in" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Zabudli ste heslo?
                    </button>
                  )}
                </div>
                <input
                  required
                  type="password"
                  minLength={mode === "up" ? 8 : 6}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
              >
                {mode === "in" ? "Prihlásiť sa" : "Vytvoriť účet"}
              </button>
            </form>
          )}

          {!isRecovery && mode !== "reset" && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                alebo
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 font-semibold text-foreground disabled:opacity-60"
              >
                Pokračovať s Google
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === "in" ? "up" : "in");
                  setSent(false);
                }}
                className="mt-4 w-full text-center text-sm text-muted-foreground underline"
              >
                {mode === "in" ? "Nemáte účet? Zaregistrujte sa" : "Už máte účet? Prihláste sa"}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Potrebujete pomôcť s prihlásením?{" "}
          <a href="tel:0850111888" className="text-primary hover:underline">
            Klientske centrum 0850 111 888
          </a>
        </p>
      </div>
    </div>
  );
}
