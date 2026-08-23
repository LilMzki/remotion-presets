/* global console, process */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const packageDirectory = path.join(repositoryRoot, 'packages', 'remotion-presets');
const fixtureDirectory = path.join(repositoryRoot, 'fixtures', 'package-smoke');
const publicEntries = [
  'index',
  'animations',
  'effects',
  'looks',
  'registry',
  'text',
  'transitions',
];

const keepTemporaryDirectory = process.argv.includes('--keep-temp');
const skipBuild = process.argv.includes('--skip-build');

const npmCliCandidates = [
  process.env.npm_execpath,
  path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  path.resolve(
    path.dirname(process.execPath),
    '..',
    'lib',
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  ),
].filter(Boolean);

const npmCli = npmCliCandidates.find((candidate) => existsSync(candidate));
if (!npmCli) {
  throw new Error(
    'npm CLI could not be located. Run this script through npm or install Node.js with npm.',
  );
}

const run = (command, args, options = {}) => {
  const { capture = false, cwd = repositoryRoot } = options;
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = capture ? `\n${result.stdout ?? ''}${result.stderr ?? ''}` : '';
    throw new Error(`${command} exited with status ${result.status}.${details}`);
  }

  return result.stdout ?? '';
};

const runNpm = (args, options) => run(process.execPath, [npmCli, ...args], options);

const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'remotion-presets-package-smoke-'));
const packDirectory = path.join(temporaryRoot, 'pack');
const installedFixture = path.join(temporaryRoot, 'fixture');
mkdirSync(packDirectory, { recursive: true });
cpSync(fixtureDirectory, installedFixture, { recursive: true });

try {
  if (!skipBuild) {
    console.log('Building the publishable library...');
    runNpm(['run', 'build', '--workspace=remotion-presets']);
  }

  console.log('Packing the library exactly as npm would publish it...');
  const packOutput = runNpm(
    ['pack', '--json', '--ignore-scripts', `--pack-destination=${packDirectory}`],
    {
      capture: true,
      cwd: packageDirectory,
    },
  );
  const packResult = JSON.parse(packOutput);
  const packed = packResult[0];
  if (!packed?.filename || !Array.isArray(packed.files)) {
    throw new Error(`Unexpected npm pack --json output: ${packOutput}`);
  }

  const packedPaths = new Set(packed.files.map((file) => file.path.replaceAll('\\', '/')));
  for (const entry of publicEntries) {
    for (const extension of ['js', 'cjs', 'd.ts', 'd.cts']) {
      const expected = `dist/${entry}.${extension}`;
      if (!packedPaths.has(expected)) {
        throw new Error(`The npm tarball is missing ${expected}.`);
      }
    }
  }

  const tarball = path.join(packDirectory, packed.filename);
  if (!existsSync(tarball)) throw new Error(`npm pack did not create ${tarball}`);

  console.log('Installing the tarball into an isolated fixture project...');
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', tarball], {
    cwd: installedFixture,
  });

  console.log('Checking all ESM exports from the installed package...');
  run(process.execPath, ['esm-smoke.mjs'], { cwd: installedFixture });

  console.log('Checking all CommonJS exports from the installed package...');
  run(process.execPath, ['cjs-smoke.cjs'], { cwd: installedFixture });

  const typescriptCli = path.join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!existsSync(typescriptCli)) {
    throw new Error(`TypeScript CLI could not be located at ${typescriptCli}.`);
  }
  console.log('Checking ESM and CommonJS TypeScript resolution from the installed package...');
  run(process.execPath, [typescriptCli, '--project', 'tsconfig.json', '--pretty', 'false'], {
    cwd: installedFixture,
  });

  const installedManifest = JSON.parse(
    readFileSync(
      path.join(installedFixture, 'node_modules', 'remotion-presets', 'package.json'),
      'utf8',
    ),
  );
  console.log(
    `Package smoke test passed: ${installedManifest.name}@${installedManifest.version} (${packed.size} bytes).`,
  );
} finally {
  if (keepTemporaryDirectory) {
    console.log(`Temporary fixture kept at ${temporaryRoot}`);
  } else {
    rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
