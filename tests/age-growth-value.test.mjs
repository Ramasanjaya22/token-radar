import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRadar, boardIssue, ageDays, MODEL } from '../lib/model.ts';
import { makeSnapshot, makePreTokenProtocol } from './helpers/snapshot.mjs';

const pre = (o) => makePreTokenProtocol({ category: 'Lending', ...o });

test('ageDays parses the date part of a timestamp like a plain date', () => {
  assert.equal(ageDays('2026-01-01', '2024-03-01T10:00:00Z'), ageDays('2026-01-01', '2024-03-01'));
  assert.equal(ageDays('2026-01-01', '2024-03-01T10:00:00Z'), 671);
});

test('a timestamped listed_at is ranked with an age, not unrankable', () => {
  const snapshot = makeSnapshot({ protocols: [pre({ slug: 'a', name: 'A', listed_at: '2024-03-01T10:00:00Z' })] });
  const { board, radar } = buildRadar(snapshot);
  assert.equal(board.length, 1);
  assert.equal(board[0].age_days, 671);
  assert.deepEqual(radar.unrankable, []);
});

test('null listed_at is unrankable and reported, not scored on an invented age', () => {
  const snapshot = makeSnapshot({
    protocols: [pre({ slug: 'ok', name: 'Ok' }), pre({ slug: 'noage', name: 'No Age', listed_at: null })],
  });
  const { board, radar } = buildRadar(snapshot);
  assert.deepEqual(board.map((r) => r.slug), ['ok']);
  assert.equal(radar.unrankable.length, 1);
  assert.equal(radar.unrankable[0].slug, 'noage');
  assert.match(radar.unrankable[0].reason, /listed_at/);
  assert.equal(boardIssue(board, snapshot), null);
});

test('an unparseable listed_at is unrankable', () => {
  const snapshot = makeSnapshot({
    protocols: [pre({ slug: 'ok', name: 'Ok' }), pre({ slug: 'bad', name: 'Bad', listed_at: 'not-a-date' })],
  });
  const { board, radar } = buildRadar(snapshot);
  assert.deepEqual(board.map((r) => r.slug), ['ok']);
  assert.deepEqual(radar.unrankable.map((u) => u.slug), ['bad']);
});

test('null change_7d is unrankable and reported, not scored as 0% growth', () => {
  const snapshot = makeSnapshot({
    protocols: [pre({ slug: 'ok', name: 'Ok' }), pre({ slug: 'nogrowth', name: 'No Growth', change_7d: null })],
  });
  const { board, radar } = buildRadar(snapshot);
  assert.deepEqual(board.map((r) => r.slug), ['ok']);
  assert.equal(radar.unrankable[0].slug, 'nogrowth');
  assert.match(radar.unrankable[0].reason, /change_7d/);
  assert.equal(boardIssue(board, snapshot), null);
});

test('zero and negative TVL are unrankable, with no max(1) floor', () => {
  const snapshot = makeSnapshot({
    protocols: [
      pre({ slug: 'ok', name: 'Ok' }),
      pre({ slug: 'zero', name: 'Zero', tvl_usd: 0 }),
      pre({ slug: 'neg', name: 'Neg', tvl_usd: -5 }),
    ],
  });
  const { board, radar } = buildRadar(snapshot);
  assert.deepEqual(board.map((r) => r.slug), ['ok']);
  assert.deepEqual(radar.unrankable.map((u) => u.slug).sort(), ['neg', 'zero']);
  for (const u of radar.unrankable) assert.match(u.reason, /TVL/);
  assert.equal(boardIssue(board, snapshot), null);
});

test('MODEL no longer carries unknown_age_days', () => {
  assert.equal('unknown_age_days' in MODEL, false);
});

test('a watchlist slug absent from the snapshot still trips boardIssue', () => {
  const snapshot = makeSnapshot({
    protocols: [pre({ slug: 'ok', name: 'Ok' })],
    watchlist: ['ok', 'ghost'],
  });
  const { board } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  assert.match(issue, /misses 1 watchlist slug: ghost/);
});

test('a CEX and a versioned-pool watchlist slug are excluded and listed', () => {
  const snapshot = makeSnapshot({
    protocols: [
      pre({ slug: 'ok', name: 'Ok' }),
      pre({ slug: 'cex-one', name: 'Cex One', category: 'CEX' }),
      pre({ slug: 'pool-v3', name: 'Pool V3' }),
    ],
    watchlist: ['ok', 'cex-one', 'pool-v3'],
  });
  const { board, radar } = buildRadar(snapshot);
  assert.deepEqual(board.map((r) => r.slug), ['ok']);
  assert.deepEqual(radar.watchlist_excluded, ['cex-one', 'pool-v3']);
  assert.equal(boardIssue(board, snapshot), null);
});
