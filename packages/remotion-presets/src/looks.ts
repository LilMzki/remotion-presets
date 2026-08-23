import type { FC } from 'react';
import React from 'react';
import { PresetLayer } from './components/PresetLayer';
import { createPresetEffect } from './create-preset-effect';
import type { PresetEffect, PresetLayerProps, PresetOptions } from './types';

export type LookPresetProps = Omit<PresetLayerProps, 'preset'>;

const createLookComponent = (preset: string): FC<LookPresetProps> => {
  const LookPreset: FC<LookPresetProps> = (props) =>
    React.createElement(PresetLayer, { ...props, preset });
  LookPreset.displayName = `RemotionLook(${preset})`;
  return LookPreset;
};

const createLookEffect =
  (preset: string) =>
  (options?: PresetOptions): PresetEffect =>
    createPresetEffect(preset, options);

export const VintageFilm = createLookComponent('vintage-film');
export const TealOrangeCinema = createLookComponent('teal-orange-cinema');
export const Noir = createLookComponent('noir');
export const BleachBypass = createLookComponent('bleach-bypass');
export const DreamGlow = createLookComponent('dream-glow');
export const Vhs = createLookComponent('vhs');

export const vintageFilmEffect = createLookEffect('vintage-film');
export const tealOrangeCinemaEffect = createLookEffect('teal-orange-cinema');
export const noirEffect = createLookEffect('noir');
export const bleachBypassEffect = createLookEffect('bleach-bypass');
export const dreamGlowEffect = createLookEffect('dream-glow');
export const vhsEffect = createLookEffect('vhs');
