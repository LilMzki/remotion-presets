import { createPresetTransition } from './create-preset-transition';
import { presetRegistry } from './registry';
import { createTransitionSpec } from './transition-spec';
import type { TransitionPresetId } from './registry';
import type { PresetOptions, PresetTransition, PresetTransitionSpec } from './types';

export { createPresetTransition, createTransitionSpec };
export type { PresetTransition, PresetTransitionSpec };
export * from './generated/transitions';

export const transitionPresets = Object.fromEntries(
  presetRegistry
    .filter((preset) => preset.kind === 'transition')
    .map((preset) => [
      preset.id,
      (options?: PresetOptions): PresetTransitionSpec => createTransitionSpec(preset.id, options),
    ]),
) as Readonly<Record<TransitionPresetId, (options?: PresetOptions) => PresetTransitionSpec>>;

export const crossDissolve = (options?: PresetOptions) =>
  createTransitionSpec('cross-dissolve', options);
export const whip = (options?: PresetOptions) => createTransitionSpec('whip', options);
export const burnAlpha = (options?: PresetOptions) => createTransitionSpec('burn-alpha', options);
export const neonWipe = (options?: PresetOptions) => createTransitionSpec('neon-wipe', options);
export const glitchCut = (options?: PresetOptions) => createTransitionSpec('glitch-cut', options);
export const filmBurnCut = (options?: PresetOptions) =>
  createTransitionSpec('film-burn-cut', options);
export const lightLeakCut = (options?: PresetOptions) =>
  createTransitionSpec('light-leak-cut', options);
export const whipPanCut = (options?: PresetOptions) =>
  createTransitionSpec('whip-pan-cut', options);
