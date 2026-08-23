import { describe, expect, expectTypeOf, it } from 'vitest';
import { animationPresets, createAnimationComponent } from './animations';
import { createPresetEffect, effectPresets, usePresetEffect } from './effects';
import {
  isAnimationPresetId,
  isEffectPresetId,
  isTextPresetId,
  isTransitionPresetId,
} from './registry';
import type {
  AnimationPresetId,
  EffectPresetId,
  PresetIdByKind,
  TextPresetId,
  TransitionPresetId,
} from './registry';
import { createTextComponent, PresetText, textPresets } from './text';
import { createPresetTransition, createTransitionSpec, transitionPresets } from './transitions';

describe('category-safe preset IDs', () => {
  it('gives each category map its exact registered key union', () => {
    expectTypeOf<keyof typeof animationPresets>().toEqualTypeOf<AnimationPresetId>();
    expectTypeOf<keyof typeof textPresets>().toEqualTypeOf<TextPresetId>();
    expectTypeOf<keyof typeof effectPresets>().toEqualTypeOf<EffectPresetId>();
    expectTypeOf<keyof typeof transitionPresets>().toEqualTypeOf<TransitionPresetId>();
    expectTypeOf<PresetIdByKind<'animation'>>().toEqualTypeOf<AnimationPresetId>();

    expect(animationPresets['spring-motion']).toBeTypeOf('function');
    expect(textPresets.typewriter).toBeTypeOf('function');
    expect(effectPresets.vignette).toBeTypeOf('function');
    expect(transitionPresets['cross-dissolve']).toBeTypeOf('function');
  });

  it('narrows untrusted strings with exported category guards', () => {
    const values: string[] = ['spring-motion', 'typewriter', 'vignette', 'cross-dissolve'];

    expect(isAnimationPresetId(values[0] ?? '')).toBe(true);
    expect(isTextPresetId(values[1] ?? '')).toBe(true);
    expect(isEffectPresetId(values[2] ?? '')).toBe(true);
    expect(isTransitionPresetId(values[3] ?? '')).toBe(true);

    const candidate: string = 'spring-motion';
    if (isAnimationPresetId(candidate)) {
      expectTypeOf(candidate).toEqualTypeOf<AnimationPresetId>();
      expect(createAnimationComponent(candidate)).toBeTypeOf('function');
    }
  });

  it('keeps dynamic strings runtime-validated', () => {
    const animation: string = 'spring-motion';
    const text: string = 'typewriter';
    const effect: string = 'vignette';
    const transition: string = 'cross-dissolve';

    expect(createAnimationComponent(animation)).toBeTypeOf('function');
    expect(createTextComponent(text)).toBeTypeOf('function');
    expect(createPresetEffect(effect).presetId).toBe('vignette');
    expect(createPresetTransition(transition).component).toBeTypeOf('function');
    expect(createTransitionSpec(transition).presentation.component).toBeTypeOf('function');

    const wrongAnimation: string = 'cross-dissolve';
    const wrongText: string = 'spring-motion';
    const wrongEffect: string = 'typewriter';
    const wrongTransition: string = 'vignette';
    expect(() => createAnimationComponent(wrongAnimation)).toThrowError(RangeError);
    expect(() => createTextComponent(wrongText)).toThrowError(RangeError);
    expect(() => createPresetEffect(wrongEffect)).toThrowError(RangeError);
    expect(() => createPresetTransition(wrongTransition)).toThrowError(TypeError);
    expect(() => createTransitionSpec(wrongTransition)).toThrowError(TypeError);
    expect(() => createPresetEffect('future-effect-id')).toThrowError(RangeError);
  });
});

// Compile-only API assertions. The skipped callback is still checked by `tsc`. Unknown/future IDs
// and broad strings stay available for runtime validation, while a registered literal from another
// category must be rejected by TypeScript.
describe.skip('compile-only category assertions', () => {
  it('rejects registered literals from the wrong category', () => {
    const dynamicId: string = 'loaded-at-runtime';
    createAnimationComponent(dynamicId);
    createTextComponent(dynamicId);
    createPresetEffect(dynamicId);
    usePresetEffect(dynamicId);
    createPresetTransition(dynamicId);
    createTransitionSpec(dynamicId);

    createAnimationComponent('future-animation-id');
    createTextComponent('future-text-id');
    createPresetEffect('future-effect-id');
    usePresetEffect('future-effect-id');
    createPresetTransition('future-transition-id');
    createTransitionSpec('future-transition-id');

    // @ts-expect-error a registered transition is not an animation preset
    createAnimationComponent('cross-dissolve');
    // @ts-expect-error a registered animation is not a text preset
    createTextComponent('spring-motion');
    // @ts-expect-error the generic text component also rejects a registered non-text preset
    PresetText({ preset: 'vignette', text: 'Not text' });
    // @ts-expect-error a registered text preset cannot be used with the effects API
    createPresetEffect('typewriter');
    // @ts-expect-error a registered transition cannot be used with the effects hook
    usePresetEffect('cross-dissolve');
    // @ts-expect-error a registered effect is not a transition presentation
    createPresetTransition('vignette');
    // @ts-expect-error a registered animation is not a transition spec
    createTransitionSpec('spring-motion');

    // @ts-expect-error category maps do not expose keys from another category
    void animationPresets['cross-dissolve'];
    // @ts-expect-error category maps do not expose keys from another category
    void textPresets.vignette;
    // @ts-expect-error category maps do not expose keys from another category
    void effectPresets.typewriter;
    // @ts-expect-error category maps do not expose keys from another category
    void transitionPresets.vignette;
  });
});
