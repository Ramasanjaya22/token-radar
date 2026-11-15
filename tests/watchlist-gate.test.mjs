import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRadar, boardIssue } from '../lib/model.ts';
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
