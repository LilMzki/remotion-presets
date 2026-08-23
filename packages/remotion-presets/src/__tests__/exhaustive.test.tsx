import type { ComponentType, ReactNode } from 'react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TransitionPresentationComponentProps } from '@remotion/transitions';
import type * as Remotion from 'remotion';
import { describe, expect, it, vi } from 'vitest';

const remotionState = vi.hoisted(() => ({
  frame: 0,
  durationInFrames: 90,
}));

vi.mock('remotion', async () => {
  const actual = await vi.importActual<typeof Remotion>('remotion');

  return {
    ...actual,
    useCurrentFrame: () => remotionState.frame,
    useVideoConfig: () => ({
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: remotionState.durationInFrames,
      id: 'exhaustive-contract-test',
      defaultProps: {},
      props: {},
      defaultCodec: null,
      defaultOutName: null,
      defaultVideoImageFormat: null,
      defaultPixelFormat: null,
      defaultProResProfile: null,
      defaultSampleRate: null,
    }),
  };
});

import { animationPresets } from '../animations';
import { createPresetEffect, effectPresets } from '../effects';
import { createPreset, getPresetDefinition, presetRegistry, type PresetId } from '../registry';
import { textPresets } from '../text';
import { createPresetTransition, transitionPresets } from '../transitions';
import { resolvePresetStyles } from '../core/style-engine';

const FIXED_OPTIONS = {
  intensity: 0.875,
  seed: 'exhaustive-contract',
  color: '#ffd166',
  secondaryColor: '#7c3aed',
  direction: 'left' as const,
  motion: 'smooth' as const,
};

const INVALID_NUMBER_PATTERN = /(?:NaN|[+-]?Infinity)/;

const assertFiniteDeep = (
  value: unknown,
  path: string,
  seen: WeakSet<object> = new WeakSet(),
): void => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${path} contains a non-finite number: ${String(value)}`);
    }

    return;
  }

  if (typeof value === 'string') {
    if (INVALID_NUMBER_PATTERN.test(value)) {
      throw new Error(`${path} contains an invalid numeric CSS value: ${value}`);
    }

    return;
  }

  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    assertFiniteDeep(child, `${path}.${key}`, seen);
  }
};

const assertMarkupIsFinite = (markup: string, presetId: string): void => {
  if (INVALID_NUMBER_PATTERN.test(markup)) {
    throw new Error(`${presetId} rendered non-finite numeric markup: ${markup}`);
  }
};

const representativeFrames = (durationInFrames: number): readonly number[] => {
  const lastFrame = Math.max(0, durationInFrames - 1);
  return [...new Set([0, Math.floor(lastFrame / 2), lastFrame])];
};

describe('228-preset exhaustive contract', () => {
  it('constructs a deterministic public instance for every registry entry', () => {
    expect(presetRegistry).toHaveLength(228);

    for (const preset of presetRegistry) {
      const id = preset.id as PresetId;
      const first = createPreset(id, FIXED_OPTIONS);
      const second = createPreset(id, FIXED_OPTIONS);

      expect(getPresetDefinition(id)).toBe(preset);
      expect(first).toEqual(second);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.options)).toBe(true);
      assertFiniteDeep(first, `instance.${id}`);
    }
  });

  it('resolves finite, deterministic styles at start, midpoint, and end for every preset', () => {
    for (const preset of presetRegistry) {
      const durationInFrames = Math.max(1, preset.defaultDurationInFrames);

      for (const frame of representativeFrames(durationInFrames)) {
        const options = {
          frame,
          fps: 30,
          durationInFrames,
          intensity: FIXED_OPTIONS.intensity,
          seed: FIXED_OPTIONS.seed,
          color: FIXED_OPTIONS.color,
          secondaryColor: FIXED_OPTIONS.secondaryColor,
          direction: FIXED_OPTIONS.direction,
        };
        const first = resolvePresetStyles(preset, options);
        const second = resolvePresetStyles(preset, options);

        expect(second).toEqual(first);
        assertFiniteDeep(first, `styles.${preset.id}.frame-${frame}`);
      }
    }
  });

  it('creates a finite, deterministic Remotion effect descriptor for every effects preset', () => {
    const effects = presetRegistry.filter((preset) => preset.api === 'effects');

    expect(Object.keys(effectPresets)).toHaveLength(effects.length);
    for (const preset of effects) {
      const publicFactory = effectPresets[preset.id];
      expect(publicFactory, `missing effect factory for ${preset.id}`).toBeTypeOf('function');

      const first = createPresetEffect(preset.id, FIXED_OPTIONS);
      const second = publicFactory(FIXED_OPTIONS);

      expect(first.presetId).toBe(preset.id);
      expect(first.effects).toHaveLength(1);
      expect(second.presetId).toBe(first.presetId);
      expect(second.effects[0]?.effectKey).toBe(first.effects[0]?.effectKey);
      expect(second.effects[0]?.params).toEqual(first.effects[0]?.params);
      expect(second.fallbackStyle).toEqual(first.fallbackStyle);
      assertFiniteDeep(first.effects[0]?.params, `effect.${preset.id}.params`);
      assertFiniteDeep(first.fallbackStyle, `effect.${preset.id}.fallbackStyle`);
    }
  });

  it('SSR-renders every component preset deterministically', () => {
    const components = presetRegistry.filter((preset) => preset.api === 'component');

    expect(Object.keys(animationPresets).length + Object.keys(textPresets).length).toBe(
      components.length,
    );

    for (const preset of components) {
      const durationInFrames = Math.max(1, preset.defaultDurationInFrames);
      remotionState.durationInFrames = durationInFrames;
      remotionState.frame = Math.floor((durationInFrames - 1) / 2);

      let element: ReactNode;
      if (preset.kind === 'text') {
        const Component = textPresets[preset.id];
        expect(Component, `missing text component for ${preset.id}`).toBeTypeOf('function');
        element = React.createElement(Component, {
          text: 'Remotion プリセット',
          durationInFrames,
          ...FIXED_OPTIONS,
        });
      } else {
        const Component = animationPresets[preset.id];
        expect(Component, `missing animation component for ${preset.id}`).toBeTypeOf('function');
        element = React.createElement(Component, {
          durationInFrames,
          ...FIXED_OPTIONS,
          children: React.createElement('span', null, 'Scene'),
        });
      }

      const first = renderToStaticMarkup(element);
      const second = renderToStaticMarkup(element);
      expect(second).toBe(first);
      expect(first).toContain(`data-preset="${preset.id}"`);
      assertMarkupIsFinite(first, preset.id);
    }
  });

  it('SSR-renders entering and exiting representative frames for every presentation', () => {
    const presentations = presetRegistry.filter((preset) => preset.api === 'presentation');

    expect(Object.keys(transitionPresets)).toHaveLength(presentations.length);
    for (const preset of presentations) {
      const publicFactory = transitionPresets[preset.id];
      expect(publicFactory, `missing transition factory for ${preset.id}`).toBeTypeOf('function');

      const direct = createPresetTransition(preset.id, FIXED_OPTIONS);
      const spec = publicFactory(FIXED_OPTIONS);
      const durationInFrames = spec.timing.getDurationInFrames({ fps: 30 });
      const representativeFrame = Math.floor(Math.max(0, durationInFrames - 1) / 2);
      const progress = spec.timing.getProgress({ frame: representativeFrame, fps: 30 });
      const Presentation = spec.presentation.component as ComponentType<
        TransitionPresentationComponentProps<Record<string, unknown>>
      >;

      expect(spec.presentation.props).toEqual(direct.props);
      expect(durationInFrames).toBeGreaterThan(0);
      expect(Number.isFinite(progress)).toBe(true);
      assertFiniteDeep(spec.presentation.props, `transition.${preset.id}.props`);

      for (const presentationDirection of ['entering', 'exiting'] as const) {
        const element = React.createElement(Presentation, {
          presentationProgress: progress,
          presentationDirection,
          presentationDurationInFrames: durationInFrames,
          passedProps: spec.presentation.props,
          onElementImage: () => undefined,
          onUnmount: () => undefined,
          bothEnteringAndExiting: true,
          children: React.createElement('span', null, 'Scene'),
        });
        const first = renderToStaticMarkup(element);
        const second = renderToStaticMarkup(element);

        expect(second).toBe(first);
        expect(first).toContain(`data-preset="${preset.id}"`);
        assertMarkupIsFinite(first, `${preset.id}:${presentationDirection}`);
      }
    }
  });

  it('keeps every API partition complete and mutually exclusive', () => {
    const partition = new Set([
      ...Object.keys(effectPresets),
      ...Object.keys(transitionPresets),
      ...Object.keys(animationPresets),
      ...Object.keys(textPresets),
    ]);

    expect(partition.size).toBe(presetRegistry.length);
    expect([...partition].sort()).toEqual(presetRegistry.map(({ id }) => id).sort());
  });
});
