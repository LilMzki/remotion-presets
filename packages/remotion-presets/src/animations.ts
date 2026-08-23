import type { FC } from 'react';
import React from 'react';
import { PresetLayer } from './components/PresetLayer';
import { getPresetDefinition, presetRegistry } from './registry';
import type { AnimationPresetId, CategoryCheckedPresetId } from './registry';
import type { PresetLayerProps, PresetOptions } from './types';

export type AnimationPresetProps = Omit<PresetLayerProps, 'preset'>;
export * from './generated/animations';

export const createAnimationComponent = <const TId extends string>(
  preset: CategoryCheckedPresetId<TId, AnimationPresetId>,
): FC<AnimationPresetProps> => {
  const definition = getPresetDefinition(preset);
  if (definition.kind !== 'animation') {
    throw new RangeError(
      `Preset "${definition.id}" is a ${definition.kind} preset and cannot be used as an animation.`,
    );
  }

  const AnimationPreset: FC<AnimationPresetProps> = (props) =>
    React.createElement(PresetLayer, { ...props, preset: definition.id });
  AnimationPreset.displayName = `RemotionPreset(${definition.id})`;
  return AnimationPreset;
};

export const animationPresets = Object.fromEntries(
  presetRegistry
    .filter((preset) => preset.kind === 'animation')
    .map((preset) => [preset.id, createAnimationComponent(preset.id)]),
) as Readonly<Record<AnimationPresetId, FC<AnimationPresetProps>>>;

export const SpringMotion = createAnimationComponent('spring-motion');
export const OffscreenSlideIn = createAnimationComponent('offscreen-slide-in');
export const ElasticPopIn = createAnimationComponent('elastic-pop-in');
export const BlurRiseIn = createAnimationComponent('blur-rise-in');
export const MaskedReveal = createAnimationComponent('masked-reveal');
export const CinematicZoomIn = createAnimationComponent('cinematic-zoom-in');
export const PaperFoldIn = createAnimationComponent('paper-fold-in');

export type { PresetOptions };
