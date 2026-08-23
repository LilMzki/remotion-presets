import { describe, expect, it } from 'vitest';

import { presetRegistry, getPresetDefinition } from '../registry';
import type { StyleEngineOptions } from './style-engine';
import { resolvePresetStyles } from './style-engine';

const BASE_OPTIONS: StyleEngineOptions = {
  frame: 10,
  fps: 30,
  durationInFrames: 30,
  intensity: 1,
  seed: 'recipe-props-regression',
  color: '#f59e0b',
  secondaryColor: '#7c2d12',
  direction: 'left',
};

const stylesFor = (presetId: string, overrides: Partial<StyleEngineOptions> = {}) =>
  resolvePresetStyles(getPresetDefinition(presetId), {
    ...BASE_OPTIONS,
    ...overrides,
  });

describe('recipe style props', () => {
  it('uses custom Golden Text colors in the metallic gradient', () => {
    const amber = stylesFor('golden-text', {
      color: '#f59e0b',
      secondaryColor: '#7c2d12',
    });
    const cyan = stylesFor('golden-text', {
      color: '#22d3ee',
      secondaryColor: '#164e63',
    });

    expect(amber.content.backgroundImage).toContain('#f59e0b');
    expect(amber.content.backgroundImage).toContain('#7c2d12');
    expect(cyan.content.backgroundImage).toContain('#22d3ee');
    expect(cyan.content.backgroundImage).toContain('#164e63');
    expect(cyan.content.backgroundImage).not.toBe(amber.content.backgroundImage);
  });

  it('keeps Golden Text gold when no custom palette is provided', () => {
    const defaults = stylesFor('golden-text', {
      color: undefined,
      secondaryColor: undefined,
    });

    expect(defaults.content.backgroundImage).toContain('#f8d568');
    expect(defaults.content.backgroundImage).toContain('#a96709');
  });

  it('uses Offscreen Slide In intensity for travel and overshoot', () => {
    const gentle = stylesFor('offscreen-slide-in', { intensity: 0.4 });
    const strong = stylesFor('offscreen-slide-in', { intensity: 1.6 });

    expect(gentle.content.transform).not.toBe(strong.content.transform);
  });

  it('keeps intensity meaningful for every compound recipe', () => {
    const recipeIds = presetRegistry
      .filter((preset) => preset.engine === 'recipe')
      .map((preset) => preset.id);

    expect(recipeIds).toHaveLength(24);
    for (const presetId of recipeIds) {
      const gentle = stylesFor(presetId, { intensity: 0.4 });
      const strong = stylesFor(presetId, { intensity: 1.6 });

      expect(strong, `${presetId} ignores intensity`).not.toEqual(gentle);
    }
  });

  it.each([
    'kinetic-word-cascade',
    'offscreen-slide-in',
    'masked-reveal',
    'paper-fold-in',
    'whip-pan-cut',
  ])('uses direction for the directional recipe %s', (presetId) => {
    const fromLeft = stylesFor(presetId, { direction: 'left' });
    const fromRight = stylesFor(presetId, { direction: 'right' });

    expect(fromRight).not.toEqual(fromLeft);
  });
});
