// Vyhľadanie bankomatov a pobočiek v okolí cez verejné OpenStreetMap Overpass API.
export type PlaceKind = "all" | "branch" | "atm";

export interface NearbyPlace {
  id: string;
  type: "atm" | "bank";
  name: string;
  address: string;
  lat: number;
  lon: number;
  distance: number;
  isSlsp: boolean;
}

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const SLSP = /slovensk[áa]\s+sporite[ľl]|slsp|erste/i;

export function isSlspTags(tags: Record<string, string | undefined>): boolean {
  return [tags["name"], tags["operator"], tags["brand"]].some((v) => !!v && SLSP.test(v));
}

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

interface OverpassEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function findNearbyPlaces(lat: number, lon: number, kind: PlaceKind, radius = 3000): Promise<NearbyPlace[]> {
  const amenities = kind === "atm" ? ["atm"] : kind === "branch" ? ["bank"] : ["atm", "bank"];
  const parts = amenities.map((a) => `node["amenity"="${a}"](around:${radius},${lat},${lon});`).join("");
  const query = `[out:json][timeout:20];(${parts});out 60;`;
  // Verejné servery bývajú preťažené: pýtame sa všetkých naraz a berieme prvú platnú odpoveď.
  const controllers = OVERPASS_SERVERS.map(() => new AbortController());
  const json = await Promise.any(
    OVERPASS_SERVERS.map(async (url, i) => {
      const timer = setTimeout(() => controllers[i]?.abort(), 25000);
      try {
        const res = await fetch(url, { method: "POST", body: new URLSearchParams({ data: query }), signal: controllers[i]?.signal });
        if (!res.ok) throw new Error(`Overpass ${res.status}`);
        const data = (await res.json()) as { elements: OverpassEl[] };
        controllers.forEach((c, j) => j !== i && c.abort());
        return data;
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  return json.elements
    .map((el): NearbyPlace | null => {
      const plat = el.lat ?? el.center?.lat;
      const plon = el.lon ?? el.center?.lon;
      if (plat == null || plon == null) return null;
      const t = el.tags ?? {};
      const type = t["amenity"] === "atm" ? "atm" : "bank";
      const label = t["name"] || t["brand"] || t["operator"] || (type === "atm" ? "Bankomat" : "Pobočka banky");
      const address = [[t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" "), t["addr:city"]].filter(Boolean).join(", ");
      return { id: `${el.type}-${el.id}`, type, name: label, address, lat: plat, lon: plon, distance: distanceMeters(lat, lon, plat, plon), isSlsp: isSlspTags(t) };
    })
    .filter((p): p is NearbyPlace => p !== null)
    .sort((a, b) => Number(b.isSlsp) - Number(a.isSlsp) || a.distance - b.distance)
    .slice(0, 25);
}
