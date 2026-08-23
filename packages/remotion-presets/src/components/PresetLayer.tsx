import type { CSSProperties, FC, ReactNode } from 'react';
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { getPresetDefinition } from '../registry';
import { resolvePresetStyles } from '../core/style-engine';
import type { PresetLayerProps } from '../types';

const fill: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};

type PresetFrameProps = Omit<PresetLayerProps, 'children'> & {
  readonly renderContent: (contentStyle: CSSProperties) => ReactNode;
};

const PresetFrame: FC<PresetFrameProps> = ({
  preset,
  intensity = 1,
  seed = preset,
  durationInFrames,
  color,
  secondaryColor,
  direction,
  className,
  style,
  renderContent,
}) => {
  const definition = getPresetDefinition(preset);
  const frame = useCurrentFrame();
  const { fps, durationInFrames: compositionDuration } = useVideoConfig();
  const resolved = resolvePresetStyles(definition, {
    frame,
    fps,
    durationInFrames:
      durationInFrames ?? Math.min(compositionDuration, definition.defaultDurationInFrames),
    intensity,
    seed,
    color,
    secondaryColor,
    direction,
  });

  return (
    <AbsoluteFill
      className={className}
      data-preset={definition.id}
      style={{ ...resolved.root, ...style }}
    >
      {renderContent(resolved.content)}
      <div aria-hidden style={{ ...fill, ...resolved.overlay }} />
      <div aria-hidden style={{ ...fill, ...resolved.overlaySecondary }} />
    </AbsoluteFill>
  );
};

export const PresetLayer: FC<PresetLayerProps> = ({ children, ...props }) => (
  <PresetFrame
    {...props}
    renderContent={(contentStyle) => <AbsoluteFill style={contentStyle}>{children}</AbsoluteFill>}
  />
);

type PresetTextLayerProps = Omit<PresetLayerProps, 'children' | 'className' | 'style'> & {
  readonly children: (contentStyle: CSSProperties) => ReactNode;
};

/** Internal text boundary: visual text styles must land on the node that paints the glyphs. */
export const PresetTextLayer: FC<PresetTextLayerProps> = ({ children, ...props }) => (
  <PresetFrame
    {...props}
    renderContent={(contentStyle) => <AbsoluteFill>{children(contentStyle)}</AbsoluteFill>}
  />
);
