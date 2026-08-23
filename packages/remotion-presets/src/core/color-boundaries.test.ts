import { describe, expect, it } from 'vitest';

import { createPresetEffect } from '../create-preset-effect';
import { createPresetTransition } from '../create-preset-transition';
import { getPresetDefinition } from '../registry';
import { resolvePresetStyles } from './style-engine';

const INVALID_COLORS = [
  '',
  'url(https://attacker.example/pixel)',
  'var(--untrusted)',
  'red; background:black',
  'rgb(NaN, 0, 0)',
  'rgb(Infinity, 0, 0)',
  'rgb(256, 0, 0)',
  'hsl(0, 101%, 50%)',
] as const;

describe('public color boundaries', () => {
  it.each(INVALID_COLORS)('rejects an unsafe PresetLayer color: %s', (color) => {
    expect(() =>
      resolvePresetStyles(getPresetDefinition('golden-text'), {
        frame: 0,
        fps: 30,
        durationInFrames: 30,
        intensity: 1,
        seed: 'color-boundary',
        color,
      }),
    ).toThrowError(TypeError);
  });

  it.each(INVALID_COLORS)('rejects an unsafe PresetLayer secondaryColor: %s', (secondaryColor) => {
    expect(() =>
      resolvePresetStyles(getPresetDefinition('golden-text'), {
        frame: 0,
        fps: 30,
        durationInFrames: 30,
        intensity: 1,
        seed: 'color-boundary',
        secondaryColor,
      }),
    ).toThrowError(TypeError);
  });

  it.each(INVALID_COLORS)('rejects an unsafe transition color early: %s', (color) => {
    expect(() => createPresetTransition('whip', { color })).toThrowError(TypeError);
  });

  it.each(INVALID_COLORS)(
    'rejects an unsafe transition secondaryColor early: %s',
    (secondaryColor) => {
      expect(() => createPresetTransition('whip', { secondaryColor })).toThrowError(TypeError);
    },
  );

  it.each(INVALID_COLORS)('rejects an unsafe effect color early: %s', (color) => {
    expect(() => createPresetEffect('wonder-glow', { color })).toThrowError(TypeError);
  });

  it.each(INVALID_COLORS)('rejects an unsafe effect secondaryColor early: %s', (secondaryColor) => {
    expect(() => createPresetEffect('wonder-glow', { secondaryColor })).toThrowError(TypeError);
  });

  it('preserves normalized valid colors at the transition boundary', () => {
    const transition = createPresetTransition('whip', {
      color: '  rgba(255, 0, 0, .5)  ',
      secondaryColor: 'HSL(200 50% 50% / 25%)',
    });

    expect(transition.props).toMatchObject({
      color: 'rgba(255, 0, 0, .5)',
      secondaryColor: 'HSL(200 50% 50% / 25%)',
    });
  });

  it('preserves a normalized valid color in the effect fallback', () => {
    const effect = createPresetEffect('wonder-glow', {
      color: '  rgba(255, 0, 0, .5)  ',
      secondaryColor: 'HSL(200 50% 50% / 25%)',
    });

    expect(effect.fallbackStyle.textShadow).toContain('rgba(255, 0, 0, .5)');
    expect(JSON.stringify(effect.effects)).not.toContain('  rgba');
  });
});
