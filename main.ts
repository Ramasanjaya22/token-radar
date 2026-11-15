// token-radar-01: build the ranked board from the sealed snapshot and the dashboard from it.
//
// The program reads the snapshot from /input/snapshot.json (or --input <file|dir>), scores every ranked
// protocol with the model in lib/model.ts, writes the board to /output/board.json, the dashboard's data
// to /output/data.js, copies this repository's dashboard/ and screenshots/ into /output, and writes
// /output/dossier.json last with the vendored make.fun library.
//
// The dashboard is a static page, no framework and no network: dashboard/index.html, dashboard/app.css
// and dashboard/app.js read /output/data.js. Node 22, standard library only.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** The scorer's own caps: the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const MIN_SCREENSHOTS = 3;
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** Print one line on stderr and exit; every expected failure goes through here. */
function fail(message: string, code: number): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(code);
}

/** --name <value> out of the arguments, or the fallback. A flag with no value is an error. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0) {
    const value = process.argv[at + 1];
    if (value === undefined || value === '') fail(`--${name} needs a value`, 2);
    return value;
  }
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals === undefined) return fallback;
  const value = withEquals.slice(name.length + 3);
  if (value === '') fail(`--${name} needs a value`, 2);
  return value;
}

const inputArg = arg('input', '/input');
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
// A directory (existing, or a path ending in a slash) holds snapshot.json; anything else is the file itself.
const isDir = inputArg.endsWith('/') || (existsSync(inputArg) && statSync(inputArg).isDirectory());
const inputFile = isDir ? join(inputArg, 'snapshot.json') : inputArg;
if (!existsSync(inputFile)) {
  fail(`no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input`, 2);
}

let snapshot: ReturnType<typeof parseSnapshot>;
try {
  snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
} catch (error) {
  fail(`${inputFile} is not a usable snapshot: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`, 2);
}
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) fail(`the model wrote a board the gate refuses: ${issue}`, 1);

const dashboardDir = join(here, 'dashboard');
if (!existsSync(dashboardDir) || !statSync(dashboardDir).isDirectory()) {
  fail(`dashboard/ is missing at ${dashboardDir}: the pipeline copies it into the output`, 1);
}

/** Copy one directory's regular files into `to`, skipping names that start with a dot. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

// Build everything in a staging directory inside the output (one filesystem for the final rename); the output is only touched once every check passes.
mkdirSync(out, { recursive: true });
const staging = mkdtempSync(join(out, '.token-radar-stage-'));
process.on('exit', () => rmSync(staging, { recursive: true, force: true }));
function stageAndInstall(): number {
  copyFiles(dashboardDir, join(staging, 'dashboard'));
  const shots = copyFiles(join(here, 'screenshots'), join(staging, 'screenshots'));
  if (shots.length < MIN_SCREENSHOTS || shots.length > SCREENSHOT_CAPS.max) {
    fail(
      `screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in ${MIN_SCREENSHOTS} to ${SCREENSHOT_CAPS.max}, the board, a detail view and a filtered view`,
      1,
    );
  }
  for (const name of shots) {
    if (!IMAGE_NAME.test(name)) fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`, 1);
    const bytes = statSync(join(staging, 'screenshots', name)).size;
    if (bytes > SCREENSHOT_CAPS.max_bytes) fail(`screenshots/${name} is ${bytes} bytes: the cap is ${SCREENSHOT_CAPS.max_bytes}`, 1);
  }
  writeFileSync(join(staging, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
  writeFileSync(join(staging, 'data.js'), dataScript(radar));

  // Clear stale files, then move the staged tree in.
  for (const name of ['board.json', 'data.js', 'dossier.json', 'dashboard', 'screenshots']) {
    rmSync(join(out, name), { recursive: true, force: true });
  }
  for (const name of readdirSync(staging)) renameSync(join(staging, name), join(out, name));
  rmSync(staging, { recursive: true, force: true }); // before the dossier reads out/
  return shots.length;
}

const shotCount = stageAndInstall();

// The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
writeFileSync(join(out, 'dossier.json'), buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: { max_files: 400, max_bytes: 4_194_304 } }));

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} below the floor, ${radar.live_size} live set aside)\n` +
    `token radar: wrote board.json, data.js, dashboard/ and ${shotCount} screenshot${shotCount === 1 ? '' : 's'} into ${out}, then dossier.json\n`,
);