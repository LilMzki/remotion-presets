import type { FC } from 'react';
import React from 'react';
import { PresetText } from './components/PresetText';
import { getPresetDefinition, presetRegistry } from './registry';
import type { CategoryCheckedPresetId, TextPresetId } from './registry';
import type { PresetTextProps } from './types';

export type TextPresetProps = PresetTextProps;
export { PresetText };
export * from './generated/text';

export const createTextComponent = <const TId extends string>(
  preset: CategoryCheckedPresetId<TId, TextPresetId>,
): FC<TextPresetProps> => {
  const definition = getPresetDefinition(preset);
  if (definition.kind !== 'text') {
    throw new RangeError(
      `Preset "${definition.id}" is a ${definition.kind} preset and cannot be used as text.`,
    );
  }

  const TextPreset: FC<TextPresetProps> = (props) =>
    React.createElement(PresetText, { ...props, preset: definition.id });
  TextPreset.displayName = `RemotionText(${definition.id})`;
  return TextPreset;
};

export const textPresets = Object.fromEntries(
  presetRegistry
    .filter((preset) => preset.kind === 'text')
    .map((preset) => [preset.id, createTextComponent(preset.id)]),
) as Readonly<Record<TextPresetId, FC<TextPresetProps>>>;

export const TypewriterText = createTextComponent('typewriter');
export const GoldenText = createTextComponent('golden-text');
export const NeonText = createTextComponent('neon-text');
export const ChromeText = createTextComponent('chrome-text');
export const GlassText = createTextComponent('glass-text');
export const KineticWordCascade = createTextComponent('kinetic-word-cascade');
export const ScrambleRevealText = createTextComponent('scramble-reveal-text');
