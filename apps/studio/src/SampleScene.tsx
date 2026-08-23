import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, Loop, useCurrentFrame, useVideoConfig } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import {
  createPresetTransition,
  getPresetDefinition,
  presetRegistry,
  PresetLayer,
  PresetText,
} from 'remotion-presets';

type PresetDefinition = ReturnType<typeof getPresetDefinition>;

export type SampleSceneProps = {
  readonly presetId: string;
  readonly compact?: boolean;
  readonly showDetails?: boolean;
};

export type Palette = {
  readonly ink: string;
  readonly softInk: string;
  readonly accent: string;
  readonly accentTwo: string;
  readonly glow: string;
};

const PALETTES: readonly Palette[] = [
  {
    ink: '#080a20',
    softInk: '#171943',
    accent: '#8b5cf6',
    accentTwo: '#22d3ee',
    glow: '#d8b4fe',
  },
  {
    ink: '#071c1a',
    softInk: '#0c3731',
    accent: '#2dd4bf',
    accentTwo: '#facc15',
    glow: '#99f6e4',
  },
  {
    ink: '#200b19',
    softInk: '#47142f',
    accent: '#fb7185',
    accentTwo: '#fbbf24',
    glow: '#fecdd3',
  },
  {
    ink: '#0b1830',
    softInk: '#143665',
    accent: '#60a5fa',
    accentTwo: '#a3e635',
    glow: '#bfdbfe',
  },
] as const;

const hashText = (text: string): number => {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

export const paletteFor = (id: string): Palette =>
  PALETTES[hashText(id) % PALETTES.length] ?? PALETTES[0];

const GRID_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.13,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,.34) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.34) 1px, transparent 1px)',
  backgroundSize: '64px 64px',
  maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 70%, transparent)',
};

export const SceneArtwork: React.FC<{
  readonly palette: Palette;
  readonly label: string;
  readonly alternate?: boolean;
  readonly compact?: boolean;
}> = ({ palette, label, alternate = false, compact = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drift = Math.sin((frame / fps) * Math.PI * 0.8);
  const orbit = Math.cos((frame / fps) * Math.PI * 0.55);
  const base = alternate ? palette.softInk : palette.ink;
  const accent = alternate ? palette.accentTwo : palette.accent;
  const typeSize = compact ? 32 : 74;

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        color: 'white',
        background: `radial-gradient(circle at ${alternate ? '75% 26%' : '24% 20%'}, ${accent}66, transparent 37%), linear-gradient(135deg, ${base}, ${palette.softInk})`,
      }}
    >
      <div style={GRID_STYLE} />
      <div
        style={{
          position: 'absolute',
          width: compact ? 190 : 530,
          height: compact ? 190 : 530,
          top: compact ? -72 : -190,
          right: compact ? -36 : 70,
          borderRadius: '50%',
          border: `${compact ? 22 : 58}px solid ${accent}1f`,
          transform: `translate(${drift * 12}px, ${orbit * 18}px) rotate(${frame * 0.15}deg)`,
          boxShadow: `0 0 ${compact ? 50 : 140}px ${accent}22`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: compact ? 64 : 190,
          height: compact ? 64 : 190,
          left: compact ? '9%' : '14%',
          bottom: compact ? '13%' : '15%',
          borderRadius: compact ? 18 : 48,
          background: `linear-gradient(145deg, ${palette.glow}, ${accent})`,
          transform: `translateY(${drift * 12}px) rotate(${12 + orbit * 4}deg)`,
          boxShadow: `0 ${compact ? 12 : 35}px ${compact ? 24 : 70}px #0008`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: compact ? '28%' : '34%',
          right: compact ? '7%' : '9%',
          top: compact ? '24%' : '22%',
          bottom: compact ? '18%' : '17%',
          borderRadius: compact ? 18 : 46,
          background: 'linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,.045))',
          border: '1px solid rgba(255,255,255,.28)',
          boxShadow: `0 ${compact ? 18 : 44}px ${compact ? 40 : 95}px #0007`,
          backdropFilter: 'blur(12px)',
          transform: `translateY(${orbit * 5}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: compact ? 16 : 42,
            right: compact ? 16 : 42,
            top: compact ? 15 : 38,
            display: 'flex',
            alignItems: 'center',
            gap: compact ? 6 : 14,
          }}
        >
          {[0, 1, 2].map((dot) => (
            <div
              key={dot}
              style={{
                width: compact ? 5 : 13,
                height: compact ? 5 : 13,
                borderRadius: '50%',
                background: dot === 0 ? accent : 'rgba(255,255,255,.35)',
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            left: compact ? 16 : 42,
            bottom: compact ? 16 : 39,
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            fontSize: typeSize,
            fontWeight: 750,
            lineHeight: 0.9,
            letterSpacing: '-0.045em',
            maxWidth: '84%',
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TransitionPreview: React.FC<{
  readonly definition: PresetDefinition;
  readonly palette: Palette;
  readonly compact: boolean;
}> = ({ definition, palette, compact }) => {
  const presentation = useMemo(
    () => createPresetTransition(definition.id, { intensity: 0.9, seed: definition.id }),
    [definition.id],
  );

  return (
    <Loop durationInFrames={84}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={54}>
          <SceneArtwork palette={palette} label="FIRST" compact={compact} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={presentation}
          timing={linearTiming({ durationInFrames: 24, easing: Easing.inOut(Easing.cubic) })}
        />
        <TransitionSeries.Sequence durationInFrames={54}>
          <SceneArtwork palette={palette} label="NEXT" alternate compact={compact} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Loop>
  );
};

const TextPresetPreview: React.FC<{
  readonly definition: PresetDefinition;
  readonly palette: Palette;
  readonly compact: boolean;
}> = ({ definition, palette, compact }) => {
  return (
    <AbsoluteFill>
      <SceneArtwork palette={palette} label="" compact={compact} />
      <PresetText
        preset={definition.id}
        text={compact ? 'CREATE' : 'CREATE\nIN MOTION'}
        durationInFrames={72}
        intensity={0.9}
        color={definition.id === 'golden-text' ? undefined : palette.glow}
        secondaryColor={definition.id === 'golden-text' ? undefined : palette.accentTwo}
        style={{
          position: 'absolute',
          inset: 0,
          whiteSpace: 'pre-line',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'white',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: compact ? 40 : 108,
          fontWeight: 850,
          lineHeight: 0.88,
          letterSpacing: '-0.055em',
          textShadow: `0 0 ${compact ? 24 : 60}px ${palette.accent}`,
        }}
      />
    </AbsoluteFill>
  );
};

const LayerPresetPreview: React.FC<{
  readonly definition: PresetDefinition;
  readonly palette: Palette;
  readonly compact: boolean;
}> = ({ definition, palette, compact }) => {
  return (
    <PresetLayer
      preset={definition.id}
      durationInFrames={90}
      intensity={0.82}
      seed={definition.id}
      color={palette.accent}
      secondaryColor={palette.accentTwo}
    >
      <SceneArtwork
        palette={palette}
        compact={compact}
        label={definition.kind === 'animation' ? 'MOVE' : definition.kind.toUpperCase()}
      />
    </PresetLayer>
  );
};

const KindBadge: React.FC<{ readonly definition: PresetDefinition; readonly compact: boolean }> = ({
  definition,
  compact,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: compact ? 12 : 42,
        left: compact ? 12 : 48,
        padding: compact ? '5px 8px' : '10px 16px',
        borderRadius: 999,
        color: 'white',
        background: 'rgba(5,8,24,.62)',
        border: '1px solid rgba(255,255,255,.22)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: compact ? 10 : 18,
        fontWeight: 700,
        letterSpacing: '0.12em',
        lineHeight: 1,
        textTransform: 'uppercase',
        backdropFilter: 'blur(12px)',
      }}
    >
      {definition.kind}
    </div>
  );
};

const Details: React.FC<{ readonly definition: PresetDefinition }> = ({ definition }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: 52,
        right: 52,
        bottom: 44,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 32,
        color: 'white',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        textShadow: '0 2px 20px #000',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
          {definition.displayName}
        </div>
        <div style={{ marginTop: 9, fontSize: 21, color: 'rgba(255,255,255,.68)' }}>
          {definition.displayNameJa} · {definition.descriptionJa}
        </div>
      </div>
      <div
        style={{
          flex: 'none',
          fontSize: 16,
          color: 'rgba(255,255,255,.6)',
          letterSpacing: '0.08em',
        }}
      >
        {definition.id}
      </div>
    </div>
  );
};

const InvalidPreset: React.FC<{ readonly presetId: string }> = ({ presetId }) => (
  <AbsoluteFill
    style={{
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      background: '#090b18',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}
  >
    <div style={{ fontSize: 52, fontWeight: 800 }}>Unknown preset</div>
    <div style={{ marginTop: 16, fontSize: 24, color: '#94a3b8' }}>{presetId}</div>
  </AbsoluteFill>
);

export const SampleScene: React.FC<SampleSceneProps> = ({
  presetId,
  compact = false,
  showDetails = true,
}) => {
  const frame = useCurrentFrame();
  const definitionFromRegistry = presetRegistry.find((candidate) => candidate.id === presetId);
  if (!definitionFromRegistry) return <InvalidPreset presetId={presetId} />;

  const definition = getPresetDefinition(presetId);
  const palette = paletteFor(presetId);
  const breathe = interpolate(Math.sin(frame / 18), [-1, 1], [0.96, 1], {
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: palette.ink }}>
      <AbsoluteFill style={{ transform: `scale(${breathe})` }}>
        {definition.kind === 'transition' ? (
          <TransitionPreview definition={definition} palette={palette} compact={compact} />
        ) : definition.kind === 'text' ? (
          <TextPresetPreview definition={definition} palette={palette} compact={compact} />
        ) : (
          <LayerPresetPreview definition={definition} palette={palette} compact={compact} />
        )}
      </AbsoluteFill>
      <KindBadge definition={definition} compact={compact} />
      {showDetails && !compact ? <Details definition={definition} /> : null}
    </AbsoluteFill>
  );
};
