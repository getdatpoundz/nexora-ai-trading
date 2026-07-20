// Server-only helpers for Twelve Data. Not to be imported from client code.

type CacheEntry = { at: number; ttl: number; value: unknown };
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > e.ttl) return null;
  return e.value as T;
}
function setCached(key: string, value: unknown, ttlMs: number) {
  cache.set(key, { at: Date.now(), ttl: ttlMs, value });
}

const BASE = "https://api.twelvedata.com";

export async function tdFetch<T>(path: string, params: Record<string, string>, ttlMs: number): Promise<T> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY saknas");
  const qs = new URLSearchParams({ ...params, apikey: apiKey }).toString();
  const url = `${BASE}${path}?${qs}`;
  const cacheKey = `${path}?${new URLSearchParams(params).toString()}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    // Serve stale cache on rate-limit / upstream errors instead of throwing.
    const stale = cache.get(cacheKey);
    if (stale) return stale.value as T;
    throw new Error(`Twelve Data ${res.status}`);
  }
  const json = (await res.json()) as { status?: string; code?: number; message?: string } & T;
  if (json.status === "error") {
    const stale = cache.get(cacheKey);
    if (stale) return stale.value as T;
    throw new Error(json.message || "Twelve Data error");
  }
  setCached(cacheKey, json, ttlMs);
  return json;
}

// Convert a USD/EUR price into SEK via Twelve Data FX quote.
export async function getFxToSek(from: "USD" | "EUR" | "SEK"): Promise<number> {
  if (from === "SEK") return 1;
  const { fallbackFxToSek } = await import("./market-data.shared");
  const symbol = `${from}/SEK`;
  try {
    const data = await tdFetch<{ price: string }>("/price", { symbol }, 5 * 60_000);
    const price = Number(data.price);
    return Number.isFinite(price) && price > 0 ? price : fallbackFxToSek(from);
  } catch {
    return fallbackFxToSek(from);
  }
}
