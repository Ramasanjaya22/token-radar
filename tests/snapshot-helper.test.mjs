import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSnapshot, makeProtocol, makePreTokenProtocol } from './helpers/snapshot.mjs';

test('makeSnapshot returns the snapshot shape with a watchlist matching its protocols', () => {
  const snap = makeSnapshot({ protocols: [makeProtocol({ slug: 'a' }), makePreTokenProtocol({ slug: 'b' })] });
  assert.equal(typeof snap.as_of, 'string');
  assert.equal(snap.protocols.length, 2);
  assert.deepEqual(snap.watchlist, ['a', 'b']);
});

test('makePreTokenProtocol records no token', () => {
  const p = makePreTokenProtocol();
  assert.equal(p.mcap_usd, null);
  assert.equal(p.gecko_id, null);
  assert.equal(p.symbol, null);
});
