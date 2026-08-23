import React from 'react';
import { Composition, Folder } from 'remotion';
import { presetRegistry } from 'remotion-presets';
import {
  CANVAS_EFFECT_AUDIT_DURATION_IN_FRAMES,
  CANVAS_EFFECT_AUDIT_HEIGHT,
  CANVAS_EFFECT_AUDIT_SINGLE_HEIGHT,
  CANVAS_EFFECT_AUDIT_SINGLE_WIDTH,
  CANVAS_EFFECT_AUDIT_WIDTH,
  CanvasEffectAudit,
  CanvasEffectAuditBaseline,
  CanvasEffectAuditSingle,
} from './CanvasEffectAudit';
import { CanvasEffectSingle } from './CanvasEffectSingle';
import {
  CATALOG_ITEM_DURATION,
  CONTACT_SHEET_DURATION,
  PresetCatalog,
  PresetContactSheet,
  PresetSingle,
  SINGLE_PRESET_DURATION,
} from './Catalog';

const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

const defaultPresetId = presetRegistry[0]?.id ?? 'typewriter';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="PresetCatalog"
        component={PresetCatalog}
        durationInFrames={Math.max(1, presetRegistry.length) * CATALOG_ITEM_DURATION}
        {...VIDEO}
      />

      <Folder name="Review">
        <Composition
          id="PresetContactSheet"
          component={PresetContactSheet}
          durationInFrames={CONTACT_SHEET_DURATION}
          defaultProps={{ page: 0 }}
          {...VIDEO}
        />
        <Composition
          id="PresetSingle"
          component={PresetSingle}
          durationInFrames={SINGLE_PRESET_DURATION}
          defaultProps={{ presetId: defaultPresetId }}
          {...VIDEO}
        />
        <Composition
          id="CanvasEffectSingle"
          component={CanvasEffectSingle}
          durationInFrames={SINGLE_PRESET_DURATION}
          defaultProps={{ presetId: 'vintage-film' }}
          {...VIDEO}
        />
        <Composition
          id="CanvasEffectAudit"
          component={CanvasEffectAudit}
          durationInFrames={CANVAS_EFFECT_AUDIT_DURATION_IN_FRAMES}
          width={CANVAS_EFFECT_AUDIT_WIDTH}
          height={CANVAS_EFFECT_AUDIT_HEIGHT}
          fps={VIDEO.fps}
        />
        <Composition
          id="CanvasEffectAuditBaseline"
          component={CanvasEffectAuditBaseline}
          durationInFrames={CANVAS_EFFECT_AUDIT_DURATION_IN_FRAMES}
          width={CANVAS_EFFECT_AUDIT_WIDTH}
          height={CANVAS_EFFECT_AUDIT_HEIGHT}
          fps={VIDEO.fps}
        />
        <Composition
          id="CanvasEffectAuditSingle"
          component={CanvasEffectAuditSingle}
          durationInFrames={CANVAS_EFFECT_AUDIT_DURATION_IN_FRAMES}
          width={CANVAS_EFFECT_AUDIT_SINGLE_WIDTH}
          height={CANVAS_EFFECT_AUDIT_SINGLE_HEIGHT}
          fps={VIDEO.fps}
          defaultProps={{ presetId: 'vintage-film' }}
        />
      </Folder>
    </>
  );
};
