import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, Search, Building2, Banknote, MapPinned, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lokality")({
  component: LokalityPage,
});

type PlaceKind = "all" | "branch" | "atm";

function LokalityPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlaceKind>("all");

  const searchTerm = useMemo(() => {
    const subject =
      kind === "branch"
        ? "bank branch"
        : kind === "atm"
          ? "ATM"
          : "bank branch ATM";
    return [subject, query.trim()].filter(Boolean).join(" ");
  }, [kind, query]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchTerm)}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 pb-28 text-foreground">
      <header className="pt-6 pb-5">
        <span className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-primary">
          DEMO · BANKOVÁ SIMULÁCIA
        </span>
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" />
          Späť na prehľad
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MapPinned className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pobočky a bankomaty</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vyhľadávanie miest v externých mapách</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <label htmlFor="location-query" className="mb-2 block text-sm font-semibold">
          Mesto, adresa alebo PSČ
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            id="location-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") window.open(mapsUrl, "_blank", "noopener,noreferrer");
            }}
            placeholder="Napr. Košice"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Typ miesta">
          <button
            type="button"
            onClick={() => setKind("all")}
            aria-pressed={kind === "all"}
            className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${kind === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            Všetko
          </button>
          <button
            type="button"
            onClick={() => setKind("branch")}
            aria-pressed={kind === "branch"}
            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition ${kind === "branch" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            <Building2 className="size-4" />
            Pobočky
          </button>
          <button
            type="button"
            onClick={() => setKind("atm")}
            aria-pressed={kind === "atm"}
            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition ${kind === "atm" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            <Banknote className="size-4" />
            Bankomaty
          </button>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <MapPin className="size-4" />
          Zobraziť výsledky v Mapách
          <ExternalLink className="size-4" />
        </a>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
        <h2 className="text-sm font-semibold">Ako vyhľadávanie funguje</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Aplikácia otvorí externé mapy s vybraným typom miesta a zadanou lokalitou.
          Zoznam, otváracie hodiny a navigáciu poskytuje mapová služba; aplikácia
          neukladá tvoju polohu ani nepredstiera vlastnú databázu pobočiek.
        </p>
      </section>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Demo funkcia · Údaje a dostupnosť si over priamo v mapovej službe.
      </p>
    </main>
  );
}
