import { describe, expect, it } from 'vitest';
import {
  getPresetDefinition,
  isPresetId,
  presetRegistry,
  registryStats,
  searchPresets,
} from './registry';

const initialPresetIds = [
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
] as const;

describe('preset registry', () => {
  it('contains every Premiere mapping plus 24 compound presets', () => {
    expect(presetRegistry).toHaveLength(228);
    expect(registryStats).toEqual({
      total: 228,
      currentPremiereReferences: 171,
      legacyPremiereReferences: 33,
      compound: 24,
    });
  });

  it('has unique stable IDs and export names', () => {
    const ids = presetRegistry.map((preset) => preset.id);
    const exportNames = presetRegistry.map((preset) => preset.exportName);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(exportNames).size).toBe(exportNames.length);
    expect(ids.every((id) => /^[a-z][a-z0-9-]*$/.test(id))).toBe(true);
  });

  it('keeps the initial quality-bar presets', () => {
    for (const id of initialPresetIds) {
      expect(isPresetId(id), id).toBe(true);
    }
  });

  it('labels every Premiere mapping as approximate in the 0.1 series', () => {
    const references = presetRegistry.flatMap((preset) => preset.premiereReferences);
    expect(references).toHaveLength(204);
    expect(references.every((reference) => reference.fidelity === 'approximate')).toBe(true);
  });

  it('has complete, serializable metadata', () => {
    for (const preset of presetRegistry) {
      expect(preset.displayNameJa.length, preset.id).toBeGreaterThan(0);
      expect(preset.descriptionJa.length, preset.id).toBeGreaterThan(8);
      expect(preset.controls.length, preset.id).toBeGreaterThan(0);
      expect(preset.defaultDurationInFrames, preset.id).toBeGreaterThan(0);
      expect(() => JSON.stringify(preset)).not.toThrow();
      if (preset.isCompound) {
        expect(preset.premiereReferences, preset.id).toHaveLength(0);
      } else {
        expect(preset.premiereReferences.length, preset.id).toBeGreaterThan(0);
      }
    }
  });

  it('resolves and searches presets', () => {
    expect(getPresetDefinition('golden-text').displayNameJa).toBe('黄金の文字');
    expect(searchPresets('黄金')).toContainEqual(getPresetDefinition('golden-text'));
    expect(searchPresets('glow').length).toBeGreaterThan(2);
    expect(() => getPresetDefinition('does-not-exist')).toThrow(/Unknown remotion-presets id/);
  });
});
