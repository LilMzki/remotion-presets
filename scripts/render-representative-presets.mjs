/* global console, process */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPRESENTATIVE_PRESETS = [
  'typewriter',
  'golden-text',
  'offscreen-slide-in',
  'vintage-film',
  'spring-motion',
  'camera-shake',
  'rgb-split',
  'light-leaks',
  'wonder-glow',
  'mosaic-effect',
  'vignette',
  'cross-dissolve',
  'whip',
  'burn-alpha',
  'neon-wipe',
];

const DEFAULT_FRAMES = [0, 60, 149];
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const studioDirectory = path.join(repositoryRoot, 'apps', 'studio');
const entryPoint = path.join(studioDirectory, 'src', 'index.ts');

const parseValues = (name) => {
  const values = [];
  for (let index = 2; index < process.argv.length; index++) {
    const argument = process.argv[index];
    if (argument === name) {
      const value = process.argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
      values.push(value);
      index += 1;
    } else if (argument.startsWith(`${name}=`)) {
      values.push(argument.slice(name.length + 1));
    }
  }
  return values;
};

const hasFlag = (name) => process.argv.includes(name);

if (hasFlag('--help')) {
  console.log(`Render deterministic visual-QA stills for representative presets.

Usage:
  node scripts/render-representative-presets.mjs [options]

Options:
  --preset <id>       Render only this preset. Repeat to select more than one.
  --frame <number>    Render only this frame. Repeat to select more than one.
  --frames <list>     Comma-separated frame list (default: 0,60,149).
  --output <folder>   Output folder (default: outputs/representative-presets).
  --scale <number>    Remotion still scale (default: 1).
  --skip-build        Use the existing library dist without rebuilding it.
  --keep-bundle       Keep the temporary Remotion bundle for diagnostics.
  --help              Show this help.
`);
  process.exit(0);
}

const parseNumber = (value, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number: ${value}`);
  return parsed;
};

const requestedPresets = parseValues('--preset');
const requestedFrames = [
  ...parseValues('--frame'),
  ...parseValues('--frames').flatMap((value) => value.split(',')),
].filter(Boolean);
const presets = requestedPresets.length > 0 ? requestedPresets : REPRESENTATIVE_PRESETS;
const frames = (requestedFrames.length > 0 ? requestedFrames : DEFAULT_FRAMES).map((value) => {
  const frame = parseNumber(value, 'frame');
  if (!Number.isInteger(frame) || frame < 0 || frame >= 150) {
    throw new Error(`frame must be an integer from 0 through 149: ${value}`);
  }
  return frame;
});
const scaleValue = parseValues('--scale').at(-1) ?? '1';
const scale = parseNumber(scaleValue, 'scale');
if (scale <= 0) throw new Error(`scale must be greater than zero: ${scaleValue}`);

const outputArgument = parseValues('--output').at(-1);
const outputDirectory = outputArgument
  ? path.resolve(process.cwd(), outputArgument)
  : path.join(repositoryRoot, 'outputs', 'representative-presets');
mkdirSync(outputDirectory, { recursive: true });

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

const run = (command, args, cwd = repositoryRoot) => {
  const result = spawnSync(command, args, { cwd, env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
};

if (!hasFlag('--skip-build')) {
  if (!npmCli) {
    throw new Error(
      'npm CLI could not be located. Run this script through npm or install Node.js with npm.',
    );
  }
  console.log('Building the library before rendering Studio...');
  run(process.execPath, [npmCli, 'run', 'build', '--workspace=remotion-presets']);
}

const repositoryRequire = createRequire(import.meta.url);
const { presetRegistry } = repositoryRequire('remotion-presets/registry');
const knownPresetIds = new Set(presetRegistry.map((preset) => preset.id));
const presetsById = new Map(presetRegistry.map((preset) => [preset.id, preset]));
const unknownPresets = presets.filter((preset) => !knownPresetIds.has(preset));
if (unknownPresets.length > 0) {
  throw new Error(`Unknown preset ID(s): ${unknownPresets.join(', ')}`);
}

const cliManifest = repositoryRequire.resolve('@remotion/cli/package.json', {
  paths: [studioDirectory],
});
const cliRequire = createRequire(cliManifest);
const { bundle } = cliRequire('@remotion/bundler');
const { openBrowser, renderStill, selectComposition } = cliRequire('@remotion/renderer');

const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'remotion-presets-render-'));
const bundleDirectory = path.join(temporaryRoot, 'bundle');
let browser;

try {
  console.log('Bundling Studio once for all still renders...');
  let lastReportedBucket = -1;
  const serveUrl = await bundle({
    entryPoint,
    outDir: bundleDirectory,
    enableCaching: true,
    onProgress: (progress) => {
      const percent = progress <= 1 ? progress * 100 : progress;
      const bucket = Math.max(0, Math.min(4, Math.floor(percent / 25)));
      if (bucket !== lastReportedBucket) {
        lastReportedBucket = bucket;
        console.log(`Bundle progress: ${bucket * 25}%`);
      }
    },
  });

  browser = await openBrowser('chrome', { logLevel: 'warn' });

  for (const presetId of presets) {
    const inputProps = { presetId };
    const definition = presetsById.get(presetId);
    const compositionId = definition?.api === 'effects' ? 'CanvasEffectSingle' : 'PresetSingle';
    const composition = await selectComposition({
      id: compositionId,
      inputProps,
      puppeteerInstance: browser,
      serveUrl,
      logLevel: 'warn',
    });

    for (const frame of frames) {
      const output = path.join(
        outputDirectory,
        `${presetId}-f${String(frame).padStart(3, '0')}.png`,
      );
      console.log(`Rendering ${presetId} at frame ${frame} with ${compositionId}...`);
      await renderStill({
        composition,
        frame,
        imageFormat: 'png',
        inputProps,
        output,
        overwrite: true,
        puppeteerInstance: browser,
        scale,
        serveUrl,
        logLevel: 'warn',
      });
    }
  }

  console.log(
    `Rendered ${presets.length * frames.length} stills to ${outputDirectory} from ${presets.length} presets.`,
  );
} finally {
  if (browser) await browser.close({ silent: true });
  if (hasFlag('--keep-bundle')) {
    console.log(`Temporary bundle kept at ${temporaryRoot}`);
  } else {
    rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
