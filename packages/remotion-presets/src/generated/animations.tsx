/* This file is generated from the preset registry. Do not hand-edit individual exports. */
import type { FC } from 'react';
import React from 'react';
import { PresetLayer } from '../components/PresetLayer';
import type { PresetLayerProps } from '../types';

type GeneratedAnimationProps = Omit<PresetLayerProps, 'preset'>;

const defineAnimation = (presetId: string): FC<GeneratedAnimationProps> => {
  const Component: FC<GeneratedAnimationProps> = (props) =>
    React.createElement(PresetLayer, { ...props, preset: presetId });
  Component.displayName = `RemotionPreset(${presetId})`;
  return Component;
};

export const BlockMotion = defineAnimation('block-motion');
export const FlipMotion = defineAnimation('flip-motion');
export const FoldMotion = defineAnimation('fold-motion');
export const PopMotion = defineAnimation('pop-motion');
export const PullMotion = defineAnimation('pull-motion');
export const SpinMotion = defineAnimation('spin-motion');
export const TravelMotion = defineAnimation('travel-motion');
export const MotionCamera = defineAnimation('motion-camera');
export const MotionTween = defineAnimation('motion-tween');
export const FreezeFramePunch = defineAnimation('freeze-frame-punch');
