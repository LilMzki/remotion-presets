import type { CSSProperties, ReactNode } from 'react';
import type { EffectDescriptor } from 'remotion';
import type { TransitionPresentation, TransitionTiming } from '@remotion/transitions';

export type PresetKind = 'effect' | 'transition' | 'animation' | 'text' | 'look' | 'overlay';

export type PresetEngine =
  | 'adjust'
  | 'blur'
  | 'color'
  | 'distort'
  | 'generate'
  | 'glow'
  | 'keying'
  | 'noise'
  | 'perspective'
  | 'stylize'
  | 'time'
  | 'transform'
  | 'utility'
  | 'vr'
  | 'transition'
  | 'text'
  | 'recipe';

export type PresetRenderMode = 'dom' | 'canvas2d' | 'webgl';
export type PresetApi = 'component' | 'effects' | 'presentation';
export type PremiereStatus = 'current' | 'legacy' | 'recipe';
export type Fidelity = 'equivalent' | 'approximate';

export type ControlDefinition =
  | {
      readonly id: string;
      readonly labelJa: string;
      readonly type: 'number';
      readonly defaultValue: number;
      readonly min: number;
      readonly max: number;
      readonly step: number;
    }
  | {
      readonly id: string;
      readonly labelJa: string;
      readonly type: 'color' | 'text';
      readonly defaultValue: string;
    }
  | {
      readonly id: string;
      readonly labelJa: string;
      readonly type: 'boolean';
      readonly defaultValue: boolean;
    }
  | {
      readonly id: string;
      readonly labelJa: string;
      readonly type: 'select';
      readonly defaultValue: string;
      readonly options: readonly string[];
    };

export interface PremiereReference {
  readonly name: string;
  readonly category: string;
  readonly status: Exclude<PremiereStatus, 'recipe'>;
  readonly version: '26.0';
  readonly fidelity: Fidelity;
  readonly noteJa?: string;
}

export interface PresetDefinition {
  readonly id: string;
  readonly exportName: string;
  readonly displayName: string;
  readonly displayNameJa: string;
  readonly descriptionJa: string;
  readonly kind: PresetKind;
  readonly api: PresetApi;
  readonly engine: PresetEngine;
  readonly variant: string;
  readonly renderMode: PresetRenderMode;
  readonly defaultDurationInFrames: number;
  readonly tags: readonly string[];
  readonly controls: readonly ControlDefinition[];
  readonly premiereReferences: readonly PremiereReference[];
  readonly isCompound: boolean;
}

export interface PresetOptions {
  readonly intensity?: number;
  readonly seed?: string | number;
  readonly durationInFrames?: number;
  readonly color?: string;
  readonly secondaryColor?: string;
  readonly direction?: 'left' | 'right' | 'top' | 'bottom';
  readonly motion?: 'gentle' | 'smooth' | 'snappy' | 'bouncy';
}

export interface PresetInstance<TId extends string = string> {
  readonly schemaVersion: 1;
  readonly id: TId;
  readonly options: Readonly<PresetOptions>;
}

export interface PresetLayerProps extends PresetOptions {
  readonly preset: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export interface PresetTextProps extends PresetOptions {
  readonly text: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export interface PresetEffect {
  readonly presetId: string;
  readonly effects: readonly EffectDescriptor<unknown>[];
  readonly fallbackStyle: CSSProperties;
}

export type PresetTransition = TransitionPresentation<Record<string, unknown>>;

export interface PresetTransitionSpec {
  readonly presentation: PresetTransition;
  readonly timing: TransitionTiming;
}
