/* global console, process */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const EXPECTED_EFFECT_COUNT = 107;
const CELL_WIDTH = 96;
const CELL_HEIGHT = 54;
const COLUMNS = 10;
const AUDIT_FRAME = 21;
const AUDIT_END_FRAME = 59;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const studioDirectory = path.join(repositoryRoot, 'apps', 'studio');
const entryPoint = path.join(studioDirectory, 'src', 'index.ts');

const hasFlag = (name) => process.argv.includes(name);

if (hasFlag('--help')) {
  console.log(`Audit every Canvas2D preset in Remotion's real Chrome renderer.

Usage:
  node scripts/audit-canvas-effects.mjs [options]

Options:
  --skip-build  Use the existing remotion-presets dist.
  --keep-temp   Keep rendered PNGs and the temporary bundle.
  --help        Show this help.
`);
  process.exit(0);
}

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
  if (!npmCli) throw new Error('npm CLI could not be located.');
  console.log('Building remotion-presets...');
  run(process.execPath, [npmCli, 'run', 'build', '--workspace=remotion-presets']);
}

const repositoryRequire = createRequire(import.meta.url);
const { presetRegistry } = repositoryRequire('remotion-presets/registry');
const effectIds = presetRegistry
  .filter((preset) => preset.api === 'effects')
  .map((preset) => preset.id);

if (effectIds.length !== EXPECTED_EFFECT_COUNT) {
  throw new Error(
    `Expected ${EXPECTED_EFFECT_COUNT} effects, received ${effectIds.length}. ` +
      'Update the audit grid and expected count when adding presets.',
  );
}

const cliManifest = repositoryRequire.resolve('@remotion/cli/package.json', {
  paths: [studioDirectory],
});
const cliRequire = createRequire(cliManifest);
const { bundle } = cliRequire('@remotion/bundler');
const { openBrowser, renderStill, selectComposition } = cliRequire('@remotion/renderer');

const paeth = (left, up, upperLeft) => {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
};

const decodePng = (file) => {
  const png = readFileSync(file);
  const signature = '89504e470d0a1a0a';
  if (png.subarray(0, 8).toString('hex') !== signature) {
    throw new Error(`${file} is not a PNG file.`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const compressed = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(
      `Unsupported PNG layout for ${file}: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}.`,
    );
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(compressed));
  const reconstructed = Buffer.alloc(stride * height);
  let sourceOffset = 0;

  for (let row = 0; row < height; row++) {
    const filter = inflated[sourceOffset++];
    const rowOffset = row * stride;

    for (let column = 0; column < stride; column++) {
      const encoded = inflated[sourceOffset++];
      const left = column >= bytesPerPixel ? reconstructed[rowOffset + column - bytesPerPixel] : 0;
      const up = row > 0 ? reconstructed[rowOffset + column - stride] : 0;
      const upperLeft =
        row > 0 && column >= bytesPerPixel
          ? reconstructed[rowOffset + column - stride - bytesPerPixel]
          : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paeth(left, up, upperLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter} in ${file}.`);
      reconstructed[rowOffset + column] = (encoded + predictor) & 0xff;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const source = pixel * bytesPerPixel;
    const target = pixel * 4;
    rgba[target] = reconstructed[source];
    rgba[target + 1] = reconstructed[source + 1];
    rgba[target + 2] = reconstructed[source + 2];
    rgba[target + 3] = bytesPerPixel === 4 ? reconstructed[source + 3] : 255;
  }

  return { width, height, rgba };
};

const getPixel = (image, x, y) => {
  const index = (y * image.width + x) * 4;
  return image.rgba.subarray(index, index + 4);
};

const isSolidColor = (image, expected) => {
  for (let index = 0; index < image.rgba.length; index += 4) {
    for (let channel = 0; channel < 4; channel++) {
      if (image.rgba[index + channel] !== expected[channel]) return false;
    }
  }

  return true;
};

const compareCells = (actual, baseline) => {
  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    throw new Error('Effect and baseline audit images have different dimensions.');
  }

  return effectIds.map((id, presetIndex) => {
    const originX = (presetIndex % COLUMNS) * CELL_WIDTH;
    const originY = Math.floor(presetIndex / COLUMNS) * CELL_HEIGHT;
    let differentPixels = 0;
    let absoluteDelta = 0;

    for (let y = 0; y < CELL_HEIGHT; y++) {
      for (let x = 0; x < CELL_WIDTH; x++) {
        const actualPixel = getPixel(actual, originX + x, originY + y);
        const baselinePixel = getPixel(baseline, originX + x, originY + y);
        let delta = 0;
        for (let channel = 0; channel < 4; channel++) {
          delta += Math.abs(actualPixel[channel] - baselinePixel[channel]);
        }
        if (delta > 0) {
          differentPixels += 1;
          absoluteDelta += delta;
        }
      }
    }

    return { id, differentPixels, absoluteDelta };
  });
};

const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'remotion-presets-effects-audit-'));
const bundleDirectory = path.join(temporaryRoot, 'bundle');
let browser;

try {
  console.log('Bundling Studio for the Canvas2D audit...');
  const serveUrl = await bundle({
    entryPoint,
    outDir: bundleDirectory,
    enableCaching: true,
    onProgress: () => undefined,
  });
  browser = await openBrowser('chrome', { logLevel: 'warn' });

  const render = async ({ id, frame, inputProps = {}, name }) => {
    const composition = await selectComposition({
      id,
      inputProps,
      puppeteerInstance: browser,
      serveUrl,
      logLevel: 'warn',
    });
    const output = path.join(temporaryRoot, name);
    await renderStill({
      composition,
      frame,
      imageFormat: 'png',
      inputProps,
      output,
      overwrite: true,
      puppeteerInstance: browser,
      serveUrl,
      logLevel: 'warn',
    });
    return decodePng(output);
  };

  const actual = await render({
    id: 'CanvasEffectAudit',
    frame: AUDIT_FRAME,
    name: 'effects.png',
  });
  const baseline = await render({
    id: 'CanvasEffectAuditBaseline',
    frame: AUDIT_FRAME,
    name: 'baseline.png',
  });
  const comparisons = compareCells(actual, baseline);
  const noOps = comparisons.filter((comparison) => comparison.differentPixels === 0);
  if (noOps.length > 0) {
    throw new Error(`Exact Canvas2D no-op preset(s): ${noOps.map(({ id }) => id).join(', ')}`);
  }

  const keyIndex = effectIds.indexOf('color-key');
  const keyPixel = getPixel(
    actual,
    (keyIndex % COLUMNS) * CELL_WIDTH + 1,
    Math.floor(keyIndex / COLUMNS) * CELL_HEIGHT + 1,
  );
  const expectedBackground = [124, 58, 237];
  const keyDistance = expectedBackground.reduce(
    (sum, channel, index) => sum + Math.abs(channel - keyPixel[index]),
    0,
  );
  if (keyDistance > 6) {
    throw new Error(
      `color-key did not reveal the audit background; received rgba(${[...keyPixel].join(', ')}).`,
    );
  }

  const renderSingle = (presetId, frame, name, options = {}) =>
    render({
      id: 'CanvasEffectAuditSingle',
      frame,
      inputProps: { presetId, ...options },
      name,
    });

  const noise15a = await renderSingle('noise', 15, 'noise-15-a.png');
  const noise15b = await renderSingle('noise', 15, 'noise-15-b.png');
  const noise16 = await renderSingle('noise', 16, 'noise-16.png');
  if (!noise15a.rgba.equals(noise15b.rgba)) {
    throw new Error('Noise is not deterministic when rendering the same frame twice.');
  }
  if (noise15a.rgba.equals(noise16.rgba)) {
    throw new Error('Frame-aware noise did not change between adjacent frames.');
  }

  const temporalCases = [
    { presetId: 'camera-shake', from: 15, to: 16 },
    { presetId: 'strobe-light', from: 15, to: 16 },
    { presetId: 'posterize-time', from: 15, to: 16 },
    { presetId: 'echo-glow', from: 15, to: 16 },
    { presetId: 'grow', from: 0, to: 30 },
    { presetId: 'shrink', from: 0, to: 30 },
    { presetId: 'gradient-wipe-effect', from: 0, to: 17 },
    { presetId: 'legacy-linear-wipe', from: 0, to: 17 },
    { presetId: 'legacy-block-dissolve', from: 0, to: 17 },
  ];

  for (const { presetId, from, to } of temporalCases) {
    const fromImage = await renderSingle(presetId, from, `${presetId}-${from}.png`);
    const toImage = await renderSingle(presetId, to, `${presetId}-${to}.png`);
    if (fromImage.rgba.equals(toImage.rgba)) {
      throw new Error(`${presetId} did not change between frames ${from} and ${to}.`);
    }
  }

  const auditBackground = [124, 58, 237, 255];
  for (const presetId of ['gradient-wipe-effect', 'legacy-linear-wipe']) {
    const baseline = await renderSingle(presetId, 0, `${presetId}-baseline.png`, {
      intensity: 0,
    });
    const start = await renderSingle(presetId, 0, `${presetId}-start.png`);
    const end = await renderSingle(presetId, AUDIT_END_FRAME, `${presetId}-end.png`);

    if (!start.rgba.equals(baseline.rgba)) {
      throw new Error(`${presetId} changed pixels at its progress=0 endpoint.`);
    }
    if (!isSolidColor(end, auditBackground)) {
      throw new Error(`${presetId} left source pixels at its progress=1 endpoint.`);
    }
  }

  for (const presetId of ['grow', 'shrink']) {
    const baseline = await renderSingle(presetId, 0, `${presetId}-baseline.png`, {
      intensity: 0,
    });
    const start = await renderSingle(presetId, 0, `${presetId}-centered-start.png`);
    if (!start.rgba.equals(baseline.rgba)) {
      throw new Error(`${presetId} was not centered and unchanged at frame zero.`);
    }
  }

  const weakest = comparisons.reduce((minimum, current) =>
    current.differentPixels < minimum.differentPixels ? current : minimum,
  );
  console.log(
    `Canvas2D audit passed: ${comparisons.length}/${effectIds.length} presets changed pixels; ` +
      `weakest=${weakest.id} (${weakest.differentPixels} pixels); keying and ${
        temporalCases.length + 1
      } temporal checks, wipe endpoints, and centered transform starts passed.`,
  );
} finally {
  if (browser) await browser.close({ silent: true });
  if (hasFlag('--keep-temp')) console.log(`Audit artifacts kept at ${temporaryRoot}`);
  else rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
