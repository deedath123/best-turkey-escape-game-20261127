// Gobble Dash — the entry program (Node 22, standard library only).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from
// vendor/makefun-game.ts. Run twice, it writes the same bytes twice.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

// Guard: the program wipes the output directory first, so refuse to run
// when the target is the repository itself, its parent, or the filesystem
// root — a stray MAKEFUN_OUTPUT_DIR must never delete the entry.
if (outDir === repoRoot || outDir === dirname(repoRoot) || outDir === resolve('/')) {
  throw new Error(`main.ts: refusing to use ${outDir} as the output directory`);
}

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
  throw new Error(`main.ts: game/ not found under ${repoRoot}`);
}
if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
  throw new Error(`main.ts: screenshots/ not found under ${repoRoot}`);
}

// Start from a clean output directory so a stale file can never leak in.
// Clear only the directory's contents, never the directory itself: in the
// grader /output is a Docker volume mount point, and removing the mount
// point itself throws EBUSY.
if (existsSync(outDir)) {
  for (const entry of readdirSync(outDir)) {
    rmSync(join(outDir, entry), { recursive: true, force: true });
  }
}
mkdirSync(outDir, { recursive: true });

cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// Guard: confirm the copy landed whole before the dossier is built from it.
const copiedIndex = join(outDir, 'game', 'index.html');
if (!existsSync(copiedIndex) || !statSync(copiedIndex).isFile()) {
  throw new Error(`main.ts: game/index.html missing after copy to ${outDir}`);
}
const copiedShots = readdirSync(join(outDir, 'screenshots')).filter((f) =>
  /\.(png|jpe?g)$/i.test(f),
);
if (copiedShots.length < 3 || copiedShots.length > 4) {
  throw new Error(`main.ts: expected 3-4 screenshots in ${outDir}, found ${copiedShots.length}`);
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
