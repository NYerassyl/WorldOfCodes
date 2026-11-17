// The inherited workspace lock contains Darwin-only optional native packages.
// Install matching Linux binaries without changing either manifest or lockfile.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
if (process.platform === 'linux' && process.arch === 'x64') {
  const version = name => JSON.parse(readFileSync(new URL(`../frontend/node_modules/${name}/package.json`, import.meta.url), 'utf8')).version;
  execFileSync('npm', ['install', '--no-save', '--package-lock=false', '--ignore-scripts', '--no-audit', '--no-fund',
    `@esbuild/linux-x64@${version('esbuild')}`, `@rollup/rollup-linux-x64-gnu@${version('rollup')}`], { stdio: 'inherit' });
}
