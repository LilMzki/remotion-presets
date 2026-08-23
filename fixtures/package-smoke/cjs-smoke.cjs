/* global console, require */
/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require('node:assert/strict');
const path = require('node:path');

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
  const resolved = require.resolve(specifier);
  assert.equal(
    path.extname(resolved),
    '.cjs',
    `CommonJS resolution for ${specifier} must use the published .cjs entry`,
  );
  assert.match(
    resolved,
    /[\\/]node_modules[\\/]remotion-presets[\\/]dist[\\/]/,
    `CommonJS resolution for ${specifier} escaped the installed package: ${resolved}`,
  );

  const imported = require(specifier);
  for (const name of expectedExports) {
    assert.ok(name in imported, `${specifier} is missing the CommonJS export ${name}`);
  }
}

const { presetRegistry, registryStats } = require('remotion-presets/registry');
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

const manifest = require('remotion-presets/package.json');
assert.equal(manifest.name, 'remotion-presets');
assert.equal(manifest.type, 'module');

console.log('CommonJS package smoke test passed for all public subpaths.');
