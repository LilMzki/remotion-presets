import React from 'react';
import { AbsoluteFill, HtmlInCanvas, useVideoConfig } from 'remotion';
import { getPresetDefinition, presetRegistry, usePresetEffect } from 'remotion-presets';
import { paletteFor, SceneArtwork } from './SampleScene';

export type CanvasEffectSingleProps = {
  readonly presetId: string;
};

const UnsupportedEffect: React.FC<{
  readonly presetId: string;
  readonly reason: string;
}> = ({ presetId, reason }) => (
  <AbsoluteFill
    style={{
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      background: '#080b17',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}
  >
    <div style={{ fontSize: 52, fontWeight: 820 }}>Canvas effect unavailable</div>
    <div style={{ marginTop: 16, color: '#94a3b8', fontSize: 23 }}>
      {presetId} · {reason}
    </div>
  </AbsoluteFill>
);

const CanvasEffectPreview: React.FC<{
  readonly presetId: string;
}> = ({ presetId }) => {
  const { width, height, durationInFrames } = useVideoConfig();
  const definition = getPresetDefinition(presetId);
  const palette = paletteFor(presetId);
  const effect = usePresetEffect(presetId, {
    durationInFrames,
    intensity: 0.88,
    seed: `studio-canvas:${presetId}`,
    color: palette.accent,
    secondaryColor: palette.accentTwo,
  });

  return (
    <AbsoluteFill style={{ background: palette.ink }}>
      <HtmlInCanvas
        width={width}
        height={height}
        durationInFrames={durationInFrames}
        effects={effect.effects}
      >
        <SceneArtwork palette={palette} label={definition.displayName} />
      </HtmlInCanvas>
      <div
        style={{
          position: 'absolute',
          top: 42,
          left: 48,
          padding: '10px 16px',
          borderRadius: 999,
          color: 'white',
          background: 'rgba(5,8,24,.66)',
          border: '1px solid rgba(255,255,255,.22)',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: 18,
          fontWeight: 720,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          backdropFilter: 'blur(12px)',
        }}
      >
        Canvas effect · {presetId}
      </div>
    </AbsoluteFill>
  );
};

export const CanvasEffectSingle: React.FC<CanvasEffectSingleProps> = ({ presetId }) => {
  const definition = presetRegistry.find((candidate) => candidate.id === presetId);

  if (!definition) {
    return <UnsupportedEffect presetId={presetId} reason="unknown preset" />;
  }

  if (definition.api !== 'effects') {
    return <UnsupportedEffect presetId={presetId} reason={`API is ${definition.api}`} />;
  }

  return <CanvasEffectPreview presetId={presetId} />;
};
