import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, symlinkSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSnapshot, makeProtocol, makePreTokenProtocol } from './helpers/snapshot.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

const made = [];
afterEach(() => {
  while (made.length) rmSync(made.pop(), { recursive: true, force: true });
});
function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'token-radar-test-'));
  made.push(dir);
  return dir;
}
function goodSnapshot() {
  return makeSnapshot({
    protocols: [
      makePreTokenProtocol({ slug: 'pre-a', name: 'Pre A', tvl_usd: 9_000_000 }),
      makeProtocol({ slug: 'live-x', name: 'Live X' }),
    ],
    watchlist: ['pre-a'],
  });
}
function run(args, main = join(root, 'main.ts')) {
  return spawnSync(process.execPath, [main, ...args], { encoding: 'utf8', env: { ...process.env, MAKEFUN_OUTPUT_DIR: '' } });
}
function oneLine(stderr) {
  const lines = stderr.trim().split('\n');
  assert.equal(lines.length, 1, `expected one stderr line, got: ${stderr}`);
  assert.doesNotMatch(stderr, /\n\s+at /);
  assert.doesNotMatch(stderr, /node:internal/);
}

test('a bad snapshot exits 2 with one line and no stack trace', () => {
  const dir = tmp();
  const input = join(dir, 'snapshot.json');
  writeFileSync(input, '{not json');
  const r = run(['--input', input, '--output', join(dir, 'out')]);
  assert.equal(r.status, 2);
  oneLine(r.stderr);
  assert.match(r.stderr, /^token radar: /);
  assert.equal(existsSync(join(dir, 'out', 'board.json')), false);
});

test('--input with no value fails instead of falling back to /input', () => {
  const dir = tmp();
  const r = run(['--output', join(dir, 'out'), '--input']);
  assert.notEqual(r.status, 0);
  oneLine(r.stderr);
  assert.match(r.stderr, /--input needs a value/);
});

test('a non-.json --input is read as a file path', () => {
  const dir = tmp();
  const input = join(dir, 'snap.data');
  writeFileSync(input, JSON.stringify(goodSnapshot()));
  const out = join(dir, 'out');
  const r = run(['--input', input, '--output', out]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(out, 'board.json')));
});

test('a missing dashboard/ exits 1 with a clear message', () => {
  const dir = tmp();
  const copy = join(dir, 'app');
  mkdirSync(copy);
  copyFileSync(join(root, 'main.ts'), join(copy, 'main.ts'));
  for (const d of ['lib', 'vendor', 'screenshots']) symlinkSync(join(root, d), join(copy, d));
  const input = join(dir, 'snapshot.json');
  writeFileSync(input, JSON.stringify(goodSnapshot()));
  const out = join(dir, 'out');
  const r = run(['--input', input, '--output', out], join(copy, 'main.ts'));
  assert.equal(r.status, 1);
  oneLine(r.stderr);
  assert.match(r.stderr, /dashboard/);
  assert.equal(existsSync(join(out, 'board.json')), false);
  assert.equal(existsSync(join(out, 'data.js')), false);
});

test('a successful run removes stale files from out/', () => {
  const dir = tmp();
  const input = join(dir, 'snapshot.json');
  writeFileSync(input, JSON.stringify(goodSnapshot()));
  const out = join(dir, 'out');
  mkdirSync(join(out, 'dashboard'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  writeFileSync(join(out, 'dashboard', 'stale.js'), 'x');
  writeFileSync(join(out, 'screenshots', 'stale.png'), 'x');
  const r = run(['--input', input, '--output', out]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(out, 'dashboard', 'stale.js')), false);
  assert.equal(existsSync(join(out, 'screenshots', 'stale.png')), false);
  assert.ok(existsSync(join(out, 'dashboard', 'index.html')));
  assert.ok(existsSync(join(out, 'dossier.json')));
});

test('a failed run leaves no new board.json or data.js', () => {
  const dir = tmp();
  const out = join(dir, 'out');
  const copy = join(dir, 'app');
  mkdirSync(copy);
  copyFileSync(join(root, 'main.ts'), join(copy, 'main.ts'));
  for (const d of ['lib', 'vendor', 'dashboard']) symlinkSync(join(root, d), join(copy, d));
  mkdirSync(join(copy, 'screenshots')); // too few screenshots: the check fails
  const input = join(dir, 'snapshot.json');
  writeFileSync(input, JSON.stringify(goodSnapshot()));
  const r = run(['--input', input, '--output', out], join(copy, 'main.ts'));
  assert.equal(r.status, 1);
  assert.equal(existsSync(join(out, 'board.json')), false);
  assert.equal(existsSync(join(out, 'data.js')), false);
});

test('a 758-protocol snapshot ranks all 226 scorable pre-token protocols and counts the 6 unscorable', () => {
  const protocols = [];
  for (let i = 0; i < 226; i++) {
    protocols.push(makePreTokenProtocol({ slug: `pre-${i}`, name: `Pre ${i}`, tvl_usd: 1_000_000 + i * 37_000, change_7d: (i % 40) - 10 }));
  }
  for (let i = 0; i < 6; i++) {
    protocols.push(makePreTokenProtocol({ slug: `nodate-${i}`, name: `Nodate ${i}`, listed_at: null }));
  }
  for (let i = 0; i < 400; i++) protocols.push(makeProtocol({ slug: `live-${i}`, name: `Live ${i}` }));
  for (let i = 0; i < 60; i++) protocols.push(makePreTokenProtocol({ slug: `cex-${i}`, name: `Cex ${i}`, category: 'CEX' }));
  for (let i = 0; i < 66; i++) protocols.push(makePreTokenProtocol({ slug: `ver-${i}`, name: `Pool ${i} V${(i % 3) + 2}` }));
  assert.equal(protocols.length, 758);

  const dir = tmp();
  const input = join(dir, 'snapshot.json');
  writeFileSync(input, JSON.stringify(makeSnapshot({ protocols, watchlist: ['pre-3', 'pre-77', 'pre-200'] })));
  const out = join(dir, 'out');
  const r = run(['--input', input, '--output', out]);
  assert.equal(r.status, 0, r.stderr); // the gate (boardIssue) refuses with a non-zero exit

  const rows = JSON.parse(readFileSync(join(out, 'board.json'), 'utf8')).rows;
  assert.equal(rows.length, 226);
  const slugs = new Set(rows.map((x) => x.slug));
  for (const s of ['pre-3', 'pre-77', 'pre-200']) assert.ok(slugs.has(s), `${s} on the board`);
  assert.equal(rows.filter((x) => x.slug.startsWith('live-') || x.slug.startsWith('cex-') || x.slug.startsWith('ver-') || x.slug.startsWith('nodate-')).length, 0);

  const radar = JSON.parse(readFileSync(join(out, 'data.js'), 'utf8').replace(/^window\.RADAR=/, '').replace(/;\s*$/, ''));
  assert.equal(radar.unscorable_count, 6);
});
