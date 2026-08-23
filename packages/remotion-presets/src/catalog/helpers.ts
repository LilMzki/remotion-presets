import type {
  ControlDefinition,
  Fidelity,
  PremiereReference,
  PremiereStatus,
  PresetDefinition,
  PresetApi,
  PresetEngine,
  PresetKind,
  PresetRenderMode,
} from '../types';

type PresetApiForKind<TKind extends PresetKind> = TKind extends 'transition'
  ? 'presentation'
  : TKind extends 'animation' | 'text'
    ? 'component'
    : 'effects';

export const standardControls: readonly ControlDefinition[] = [
  {
    id: 'intensity',
    labelJa: '強さ',
    type: 'number',
    defaultValue: 1,
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    id: 'seed',
    labelJa: 'シード',
    type: 'text',
    defaultValue: 'remotion-presets',
  },
];

export const timingControls: readonly ControlDefinition[] = [
  ...standardControls,
  {
    id: 'durationInFrames',
    labelJa: '長さ（フレーム）',
    type: 'number',
    defaultValue: 30,
    min: 1,
    max: 300,
    step: 1,
  },
];

export const premiereReference = (
  name: string,
  category: string,
  status: Exclude<PremiereStatus, 'recipe'> = 'current',
  fidelity: Fidelity = 'approximate',
  noteJa?: string,
): PremiereReference => ({
  name,
  category,
  status,
  version: '26.0',
  fidelity,
  ...(noteJa ? { noteJa } : {}),
});

export type DefinePresetInput = {
  readonly id: string;
  readonly name: string;
  readonly nameJa: string;
  readonly descriptionJa: string;
  readonly kind: PresetKind;
  readonly engine: PresetEngine;
  readonly variant?: string;
  readonly renderMode?: PresetRenderMode;
  readonly duration?: number;
  readonly tags?: readonly string[];
  readonly controls?: readonly ControlDefinition[];
  readonly premiere?: readonly PremiereReference[];
  readonly compound?: boolean;
};

const toExportName = (id: string): string =>
  id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

export const definePreset = <const T extends DefinePresetInput>(
  input: T,
): PresetDefinition & {
  readonly id: T['id'];
  readonly kind: T['kind'];
  readonly api: PresetApiForKind<T['kind']>;
} => ({
  id: input.id,
  exportName: toExportName(input.id),
  displayName: input.name,
  displayNameJa: input.nameJa,
  descriptionJa: input.descriptionJa,
  kind: input.kind,
  api: (input.kind === 'transition'
    ? 'presentation'
    : input.kind === 'animation' || input.kind === 'text'
      ? 'component'
      : 'effects') as PresetApiForKind<T['kind']> & PresetApi,
  engine: input.engine,
  variant: input.variant ?? input.id,
  renderMode: input.renderMode ?? 'dom',
  defaultDurationInFrames: input.duration ?? 30,
  tags: input.tags ?? [],
  controls:
    input.controls ??
    (input.kind === 'transition' || input.kind === 'animation' || input.kind === 'text'
      ? timingControls
      : standardControls),
  premiereReferences: input.premiere ?? [],
  isCompound: input.compound ?? false,
});
