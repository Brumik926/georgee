import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { findNearbyPlaces, type NearbyPlace } from "@/lib/nearby-atms";
import { ArrowLeft, MapPin, Search, Building2, Banknote, MapPinned, ExternalLink, LocateFixed, Loader2, Navigation } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lokality")({
  head: () => ({ meta: [
      { property: "og:title", content: "Vyhľadávanie miest · George" },
      { property: "og:description", content: "Externé vyhľadávanie pobočiek a bankomatov cez mapovú službu; George nie je ich prevádzkovateľ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    { title: "Vyhľadávanie miest · George" },
    { name: "description", content: "Externé vyhľadávanie pobočiek a bankomatov cez mapovú službu; George nie je ich prevádzkovateľ." },
  ] }),
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

  const [nearby, setNearby] = useState<NearbyPlace[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  function locate() {
    setGeoError("");
    if (!("geolocation" in navigator)) {
      setGeoError("Tento prehliadač nepodporuje zisťovanie polohy.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const list = await findNearbyPlaces(pos.coords.latitude, pos.coords.longitude, kind);
          setNearby(list);
        } catch {
          setGeoError("Nepodarilo sa načítať miesta v okolí. Skúste to znova.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setGeoError(err.code === 1 ? "Prístup k polohe bol zamietnutý. Povoľte polohu v nastaveniach prehliadača." : "Polohu sa nepodarilo zistiť.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchTerm)}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 pb-28 text-foreground">
      <header className="pt-6 pb-5">
        
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

      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition disabled:opacity-60"
      >
        {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
        {locating ? "Hľadám v okolí…" : "Nájsť najbližšie podľa mojej polohy"}
      </button>
      {geoError && <p role="alert" className="mt-3 text-sm text-destructive">{geoError}</p>}

      {nearby && (
        <section className="mt-5" aria-label="Najbližšie miesta">
          <h2 className="mb-3 text-base font-bold">Najbližšie v okolí</h2>
          {nearby.length === 0 ? (
            <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">V okruhu 3 km sme nenašli žiadne miesto.</p>
          ) : (
            <ul className="space-y-2">
              {nearby.map((p) => (
                <li key={p.id} className={`rounded-2xl border p-4 ${p.isSlsp ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold">
                        {p.type === "atm" ? <Banknote className="size-4 shrink-0 text-primary" /> : <Building2 className="size-4 shrink-0 text-primary" />}
                        <span className="truncate">{p.name}</span>
                      </p>
                      {p.address && <p className="mt-1 text-xs text-muted-foreground">{p.address}</p>}
                      {p.isSlsp && <span className="mt-2 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Slovenská sporiteľňa</span>}
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{p.distance < 1000 ? `${Math.round(p.distance)} m` : `${(p.distance / 1000).toFixed(1)} km`}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                  >
                    <Navigation className="size-3.5" /> Navigovať
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Údaje © prispievatelia OpenStreetMap.</p>
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
        <h2 className="text-sm font-semibold">Ako vyhľadávanie funguje</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Aplikácia otvorí externé mapy s vybraným typom miesta a zadanou lokalitou.
          Zoznam, otváracie hodiny a navigáciu poskytuje mapová služba; pri vyhľadaní v okolí sa tvoja poloha použije len na nájdenie miest a neukladá sa.
        </p>
      </section>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Údaje a dostupnosť si over priamo v mapovej službe.
      </p>
    </main>
  );
}
