import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRadar, LIVE_ROWS } from '../lib/model.ts';
import { makeSnapshot, makeProtocol } from './helpers/snapshot.mjs';

test('live_size is the full live count while the Live rows stay capped', () => {
  const protocols = Array.from({ length: 30 }, (_, i) =>
    makeProtocol({ slug: `live-${i}`, name: `Live ${i}`, mcap_usd: 50_000_000 + i }),
  );
  const { radar } = buildRadar(makeSnapshot({ protocols }));
  assert.equal(radar.live_size, 30);
  assert.equal(radar.live.length, LIVE_ROWS);
  assert.equal(radar.live.length, 24);
});
