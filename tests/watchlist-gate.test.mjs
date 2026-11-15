import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRadar, buildBoard, boardIssue, MODEL } from '../lib/model.ts';
import { makeSnapshot, makeProtocol, makePreTokenProtocol } from './helpers/snapshot.mjs';

test('a live-token watchlist entry is excluded from the board, listed, and the board passes boardIssue', () => {
  const protocols = [
    makePreTokenProtocol({ slug: 'pre-a', name: 'Pre A', tvl_usd: 9_000_000 }),
    makePreTokenProtocol({ slug: 'pre-b', name: 'Pre B', tvl_usd: 4_000_000 }),
    makeProtocol({ slug: 'live-x', name: 'Live X' }),
  ];
  const snapshot = makeSnapshot({ protocols, watchlist: ['pre-a', 'pre-b', 'live-x'] });
  const { board, radar } = buildRadar(snapshot);
  assert.deepEqual(board.map((r) => r.slug).sort(), ['pre-a', 'pre-b']);
  assert.deepEqual(radar.watchlist_excluded, ['live-x']);
  assert.equal(boardIssue(board, snapshot), null);
  for (const r of board) assert.equal(r.token_status, 'pre-token');
});

test('an unscorable protocol is left off the board and does not displace scorable ones', () => {
  const snapshot = makeSnapshot({
    watchlist: [],
    protocols: [
      makePreTokenProtocol({ slug: 'unscorable', name: 'Unscorable', tvl_usd: 900_000, listed_at: null }),
      makePreTokenProtocol({ slug: 'scorable', name: 'Scorable', tvl_usd: 100_000 }),
    ],
  });
  const board = buildBoard(snapshot, MODEL);
  assert.deepEqual(board.map((r) => r.slug), ['scorable']);
});

test('the early pool is not capped: 30 scorable pre-token protocols above the floor give 30 rows', () => {
  const protocols = Array.from({ length: 30 }, (_, i) =>
    makePreTokenProtocol({ slug: `pre-${i}`, name: `Pre ${i}`, tvl_usd: 2_000_000 + i * 500_000 }),
  );
  const snapshot = makeSnapshot({ watchlist: [], protocols });
  const board = buildBoard(snapshot, MODEL);
  assert.equal(board.length, 30);
  assert.equal(boardIssue(board, snapshot), null);
});
