import { PresetLayer } from './components/PresetLayer';
import { createPresetEffect, usePresetEffect } from './create-preset-effect';
import { presetRegistry } from './registry';
import type { EffectPresetId } from './registry';
import type { PresetEffect, PresetLayerProps, PresetOptions } from './types';

export { PresetLayer, createPresetEffect, usePresetEffect };
export type { PresetEffect, PresetLayerProps, PresetOptions };
export * from './generated/effects';

export const effectPresets = Object.fromEntries(
  presetRegistry
    .filter((preset) => preset.api === 'effects')
    .map((preset) => [
      preset.id,
      (options?: PresetOptions): PresetEffect => createPresetEffect(preset.id, options),
    ]),
) as Readonly<Record<EffectPresetId, (options?: PresetOptions) => PresetEffect>>;

export const cameraShakeEffect = (options?: PresetOptions) =>
  createPresetEffect('camera-shake', options);
export const rgbSplitEffect = (options?: PresetOptions) => createPresetEffect('rgb-split', options);
export const lightLeaksEffect = (options?: PresetOptions) =>
  createPresetEffect('light-leaks', options);
export const wonderGlowEffect = (options?: PresetOptions) =>
  createPresetEffect('wonder-glow', options);
export const mosaicEffect = (options?: PresetOptions) =>
  createPresetEffect('mosaic-effect', options);
export const vignetteEffect = (options?: PresetOptions) => createPresetEffect('vignette', options);
