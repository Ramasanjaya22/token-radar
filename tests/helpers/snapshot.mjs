// Synthetic snapshot builder for tests. Every value is invented; no real snapshot is read.
// Shape mirrors the Snapshot and SnapshotProtocol interfaces in lib/model.ts.

/**
 * Build a snapshot object. Pass overrides to replace top-level fields, or `protocols`
 * to supply protocol entries; each protocol is merged over a neutral default.
 */
export function makeSnapshot(overrides = {}) {
  const protocols = (overrides.protocols ?? [makeProtocol()]).map((p) => makeProtocol(p));
  const watchlist = overrides.watchlist ?? protocols.map((p) => p.slug);
  return {
    as_of: '2026-01-01',
    source: 'synthetic',
    floor_usd: 1_000_000,
    ...overrides,
    protocols,
    watchlist,
  };
}

/** Build one protocol entry with the ten snapshot fields, merged over neutral defaults. */
export function makeProtocol(overrides = {}) {
  return {
    slug: 'synthetic-protocol',
    name: 'Synthetic Protocol',
    category: 'Lending',
    chains: ['synthetic-chain'],
    tvl_usd: 10_000_000,
    change_7d: 5,
    mcap_usd: 50_000_000,
    listed_at: '2024-01-01',
    gecko_id: 'synthetic-token',
    symbol: 'SYN',
    ...overrides,
  };
}

/** A pre-token protocol: the index entry records no token (no market cap, gecko id or symbol). */
export function makePreTokenProtocol(overrides = {}) {
  return makeProtocol({ mcap_usd: null, gecko_id: null, symbol: null, ...overrides });
}
