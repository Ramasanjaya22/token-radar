import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRadar } from '../lib/model.ts';
import { makeSnapshot, makeProtocol, makePreTokenProtocol } from './helpers/snapshot.mjs';

test('unscorable_count counts rankable pre-token protocols left off the board, and nothing else', () => {
  const protocols = [
    makePreTokenProtocol({ slug: 'ok-a', name: 'Ok A', tvl_usd: 5_000_000 }),
    makePreTokenProtocol({ slug: 'ok-b', name: 'Ok B', tvl_usd: 3_000_000 }),
    makePreTokenProtocol({ slug: 'bad-date', name: 'Bad Date', listed_at: null }),
    makePreTokenProtocol({ slug: 'bad-growth', name: 'Bad Growth', change_7d: null }),
    makePreTokenProtocol({ slug: 'bad-tvl', name: 'Bad Tvl', tvl_usd: 0 }),
    makePreTokenProtocol({ slug: 'a-cex', name: 'A Cex', category: 'CEX', listed_at: null }),
    makePreTokenProtocol({ slug: 'a-pool', name: 'A Pool V2', listed_at: null }),
    makeProtocol({ slug: 'live-x', name: 'Live X', listed_at: null }),
  ];
  const snapshot = makeSnapshot({ protocols, watchlist: [] });
  const { board, radar } = buildRadar(snapshot);
  assert.equal(radar.unscorable_count, 3);
  assert.deepEqual(board.map((r) => r.slug).sort(), ['ok-a', 'ok-b']);
  assert.deepEqual(radar.unrankable, []);
});

test('a watchlist unrankable entry is in unrankable and not double-counted', () => {
  const protocols = [
    makePreTokenProtocol({ slug: 'ok-a', name: 'Ok A' }),
    makePreTokenProtocol({ slug: 'w-bad', name: 'W Bad', listed_at: null }),
    makePreTokenProtocol({ slug: 'bad', name: 'Bad', listed_at: null }),
  ];
  const { radar } = buildRadar(makeSnapshot({ protocols, watchlist: ['w-bad'] }));
  assert.deepEqual(radar.unrankable.map((u) => u.slug), ['w-bad']);
  assert.equal(radar.unscorable_count, 1);
});
