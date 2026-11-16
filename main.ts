// Entry point for the makefun-frontend-01 entry.
//
// The frontend itself lives in app/ as plain static files — no build step:
// a browser opens app/index.html and the modules read make.fun's public API
// at https://make.fun/api. This program is only the hand-in step. It
// assembles the submission directory (the app, the screenshots of it
// running on live data, and a dossier.json describing both) in the folder
// the grader points at:
//
//   node main.ts                        # assembles into /output
//   MAKEFUN_OUTPUT_DIR=out node main.ts # assembles into ./out instead
//
// dossier.json is produced by the vendored make.fun library and has to stay
// byte-for-byte what that library writes, so vendor/makefun-frontend.ts is
// imported here and never edited; the caps below are the scorer's own.

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The scorer's limits, mirrored so an entry it would refuse fails here
// first: at most 160 KiB of dossier text, at most 3 screenshots of at most
// 256 KiB each, and an app/ tree of at most 993 files and 16 MiB in total.
const SCORER_CAPS = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 3, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 16 * 1024 * 1024,
};

// Copy a directory tree into place, one entry at a time: directories are
// recreated (and recursed into), files are copied as-is. The entry holds
// only regular files and directories, so nothing else needs handling.
function copyTree(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const source = join(sourceDir, entry.name);
    const target = join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyTree(source, target);
    } else {
      copyFileSync(source, target);
    }
  }
}

function assemble() {
  const entryDir = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  mkdirSync(outDir, { recursive: true });
  copyTree(join(entryDir, 'app'), join(outDir, 'app'));

  // screenshots/ belongs in the submission even if this checkout has none,
  // so its directory is always created; the images are copied when present.
  const shotsTarget = join(outDir, 'screenshots');
  mkdirSync(shotsTarget, { recursive: true });
  const shotsSource = join(entryDir, 'screenshots');
  if (existsSync(shotsSource)) {
    copyTree(shotsSource, shotsTarget);
  }

  // The dossier is written last: it is built from the assembled tree, so
  // the app and screenshots above must already be in their final places.
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, SCORER_CAPS));
}

assemble();
