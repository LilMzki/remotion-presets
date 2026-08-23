import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { presetRegistry, usePresetEffect } from 'remotion-presets';

export const CANVAS_EFFECT_AUDIT_CELL_WIDTH = 96;
export const CANVAS_EFFECT_AUDIT_CELL_HEIGHT = 54;
export const CANVAS_EFFECT_AUDIT_COLUMNS = 10;

export const CANVAS_EFFECT_AUDIT_PRESET_IDS = presetRegistry
  .filter((preset) => preset.api === 'effects')
  .map((preset) => preset.id);

export const CANVAS_EFFECT_AUDIT_ROWS = Math.ceil(
  CANVAS_EFFECT_AUDIT_PRESET_IDS.length / CANVAS_EFFECT_AUDIT_COLUMNS,
);
export const CANVAS_EFFECT_AUDIT_WIDTH =
  CANVAS_EFFECT_AUDIT_CELL_WIDTH * CANVAS_EFFECT_AUDIT_COLUMNS;
export const CANVAS_EFFECT_AUDIT_HEIGHT =
  CANVAS_EFFECT_AUDIT_CELL_HEIGHT * CANVAS_EFFECT_AUDIT_ROWS;

export const CANVAS_EFFECT_AUDIT_SINGLE_WIDTH = 640;
export const CANVAS_EFFECT_AUDIT_SINGLE_HEIGHT = 360;
export const CANVAS_EFFECT_AUDIT_DURATION_IN_FRAMES = 60;

export type CanvasEffectAuditSingleProps = {
  readonly presetId: string;
  readonly effectsEnabled?: boolean;
  readonly intensity?: number;
};

const SOURCE_SVG = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#00ff00"/>
    <rect x="32" y="28" width="238" height="145" rx="24" fill="#ef4444"/>
    <circle cx="455" cy="118" r="78" fill="#2563eb"/>
    <path d="M86 306 L226 196 L338 316 Z" fill="#facc15"/>
    <text x="330" y="300" fill="white" font-family="sans-serif" font-size="54" font-weight="700">QA 42</text>
  </svg>
`);

const SOURCE_URL = `data:image/svg+xml;charset=utf-8,${SOURCE_SVG}`;

const SOURCE_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
};

const CELL_STYLE: React.CSSProperties = {
  position: 'relative',
  width: CANVAS_EFFECT_AUDIT_CELL_WIDTH,
  height: CANVAS_EFFECT_AUDIT_CELL_HEIGHT,
  overflow: 'hidden',
  backgroundColor: '#7c3aed',
};

const AUDIT_GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${CANVAS_EFFECT_AUDIT_COLUMNS}, ${CANVAS_EFFECT_AUDIT_CELL_WIDTH}px)`,
  gridAutoRows: `${CANVAS_EFFECT_AUDIT_CELL_HEIGHT}px`,
  alignContent: 'start',
  justifyContent: 'start',
  backgroundColor: '#111827',
};

const StaticSource: React.FC<{
  readonly effects?: ReturnType<typeof usePresetEffect>['effects'];
}> = ({ effects }) => <Img effects={effects} src={SOURCE_URL} style={SOURCE_STYLE} />;

const EffectSource: React.FC<CanvasEffectAuditSingleProps> = ({
  presetId,
  effectsEnabled = true,
  intensity = 1,
}) => {
  const preset = usePresetEffect(presetId, {
    intensity,
    seed: `canvas-effect-audit:${presetId}`,
    durationInFrames: CANVAS_EFFECT_AUDIT_DURATION_IN_FRAMES,
  });

  return <StaticSource effects={effectsEnabled ? preset.effects : undefined} />;
};

const EffectCell: React.FC<CanvasEffectAuditSingleProps> = ({ presetId }) => (
  <div style={CELL_STYLE}>
    <EffectSource presetId={presetId} />
  </div>
);

const BaselineCell: React.FC = () => (
  <div style={CELL_STYLE}>
    <StaticSource />
  </div>
);

/** Every effects-API preset rendered against the same deterministic SVG source. */
export const CanvasEffectAudit: React.FC = () => (
  <AbsoluteFill style={AUDIT_GRID_STYLE}>
    {CANVAS_EFFECT_AUDIT_PRESET_IDS.map((presetId) => (
      <EffectCell key={presetId} presetId={presetId} />
    ))}
  </AbsoluteFill>
);

/** Pixel-identical source grid used as the no-effect comparison image. */
export const CanvasEffectAuditBaseline: React.FC = () => (
  <AbsoluteFill style={AUDIT_GRID_STYLE}>
    {CANVAS_EFFECT_AUDIT_PRESET_IDS.map((presetId) => (
      <BaselineCell key={presetId} />
    ))}
  </AbsoluteFill>
);

/** One effects-API preset rendered at the source SVG's native 16:9 size. */
export const CanvasEffectAuditSingle: React.FC<CanvasEffectAuditSingleProps> = (props) => (
  <AbsoluteFill style={{ backgroundColor: '#7c3aed' }}>
    <EffectSource {...props} />
  </AbsoluteFill>
);
