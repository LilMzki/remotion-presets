/* global console */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exportChecks = [
  ['remotion-presets', ['presetRegistry', 'getPresetMetadata']],
  ['remotion-presets/animations', ['SpringMotion', 'animationPresets']],
  ['remotion-presets/effects', ['createPresetEffect', 'effectPresets']],
  ['remotion-presets/looks', ['VintageFilm', 'vintageFilmEffect']],
  ['remotion-presets/registry', ['presetRegistry', 'registryStats']],
  ['remotion-presets/text', ['TypewriterText', 'textPresets']],
  ['remotion-presets/transitions', ['createPresetTransition', 'transitionPresets']],
];

for (const [specifier, expectedExports] of exportChecks) {
  const resolved = fileURLToPath(import.meta.resolve(specifier));
  assert.equal(
    path.extname(resolved),
    '.js',
    `ESM resolution for ${specifier} must use the published .js entry`,
  );
  assert.match(
    resolved,
    /[\\/]node_modules[\\/]remotion-presets[\\/]dist[\\/]/,
    `ESM resolution for ${specifier} escaped the installed package: ${resolved}`,
  );

  const imported = await import(specifier);
  for (const name of expectedExports) {
    assert.ok(name in imported, `${specifier} is missing the ESM export ${name}`);
  }
}

const { presetRegistry, registryStats } = await import('remotion-presets/registry');
assert.equal(presetRegistry.length, 228, 'the published registry must contain 228 presets');
assert.equal(
  new Set(presetRegistry.map((preset) => preset.id)).size,
  presetRegistry.length,
  'preset IDs must be unique',
);
assert.deepEqual(registryStats, {
  total: 228,
  currentPremiereReferences: 171,
  legacyPremiereReferences: 33,
  compound: 24,
});

const require = createRequire(import.meta.url);
const manifest = require('remotion-presets/package.json');
assert.equal(manifest.name, 'remotion-presets');
assert.equal(manifest.type, 'module');

console.log('ESM package smoke test passed for all public subpaths.');
