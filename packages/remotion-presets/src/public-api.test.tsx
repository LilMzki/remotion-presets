import React from 'react';
import { describe, expect, it } from 'vitest';
import {
  GoldenText,
  OffscreenSlideIn,
  PresetText,
  TypewriterText,
  createPresetEffect,
  createPresetTransition,
  createTransitionSpec,
  getPresetDefinition,
} from './index';

describe('public API', () => {
  it('exposes the high-level examples as React components', () => {
    expect(<TypewriterText text="Remotion" />).toBeTruthy();
    expect(<GoldenText text="GOLD" />).toBeTruthy();
    expect(
      <OffscreenSlideIn>
        <div>Scene</div>
      </OffscreenSlideIn>,
    ).toBeTruthy();
  });

  it('rejects non-finite or non-positive transition durations', () => {
    for (const durationInFrames of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
      expect(() => createTransitionSpec('whip', { durationInFrames })).toThrow(RangeError);
    }

    expect(
      createTransitionSpec('whip', { durationInFrames: 18.4 }).timing.getDurationInFrames({
        fps: 30,
      }),
    ).toBe(18);
  });

  it('rejects non-text IDs passed dynamically to PresetText', () => {
    const preset: string = 'vignette';
    expect(() => PresetText({ preset, text: 'Not text' })).toThrow(RangeError);
  });

  it('creates Remotion-native effect and transition values', () => {
    const effect = createPresetEffect('vintage-film', { intensity: 0.8, seed: 'test' });
    expect(effect.effects).toHaveLength(1);
    expect(effect.presetId).toBe('vintage-film');

    const transition = createPresetTransition('whip', { direction: 'left' });
    expect(typeof transition.component).toBe('function');
    expect(transition.props).toBeTruthy();
    expect(getPresetDefinition('whip').api).toBe('presentation');
  });
});
