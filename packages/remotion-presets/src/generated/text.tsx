/* This file is generated from the preset registry. Do not hand-edit individual exports. */
import type { FC } from 'react';
import React from 'react';
import { PresetText } from '../components/PresetText';
import type { PresetTextProps } from '../types';

const defineText = (presetId: string): FC<PresetTextProps> => {
  const Component: FC<PresetTextProps> = (props) =>
    React.createElement(PresetText, { ...props, preset: presetId });
  Component.displayName = `RemotionText(${presetId})`;
  return Component;
};

export const SimpleText = defineText('simple-text');
export const TextAnimator = defineText('text-animator');
export const Typewriter = defineText('typewriter');
