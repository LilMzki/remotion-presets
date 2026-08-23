import { currentEffectPresets } from './catalog/current-effects';
import { currentTransitionPresetsA } from './catalog/current-transitions-a';
import { currentTransitionPresetsB } from './catalog/current-transitions-b';
import { legacyPresets } from './catalog/legacy';
import { compoundPresets } from './catalog/recipes';
import type { PresetDefinition, PresetInstance, PresetKind, PresetOptions } from './types';

export const presetRegistry = [
  ...currentEffectPresets,
  ...currentTransitionPresetsA,
  ...currentTransitionPresetsB,
  ...legacyPresets,
  ...compoundPresets,
] as const;

export type PresetRegistryEntry = (typeof presetRegistry)[number];
export type PresetId = (typeof presetRegistry)[number]['id'];

/** The registered IDs whose metadata has the requested high-level kind. */
export type PresetIdByKind<TKind extends PresetKind> = Extract<
  PresetRegistryEntry,
  { readonly kind: TKind }
>['id'];

export type AnimationPresetId = PresetIdByKind<'animation'>;
export type TextPresetId = PresetIdByKind<'text'>;
export type TransitionPresetId = PresetIdByKind<'transition'>;
export type LookPresetId = PresetIdByKind<'look'>;
export type OverlayPresetId = PresetIdByKind<'overlay'>;

/** IDs accepted by Remotion's effects API, including high-level look and overlay recipes. */
export type EffectPresetId = PresetIdByKind<'effect' | 'look' | 'overlay'>;

/**
 * Keeps broad `string` and unknown future IDs available for runtime validation, while rejecting a
 * registered ID from the wrong category when it is known at compile time.
 */
export type CategoryCheckedPresetId<
  TCandidate extends string,
  TAllowed extends PresetId,
> = string extends TCandidate
  ? string
  : TCandidate extends PresetId
    ? TCandidate extends TAllowed
      ? TCandidate
      : never
    : TCandidate;

const presetById = new Map<string, PresetDefinition>(
  presetRegistry.map((preset) => [preset.id, preset]),
);

export const isPresetId = (value: string): value is PresetId => presetById.has(value);

export const isPresetIdOfKind = <TKind extends PresetKind>(
  value: string,
  kind: TKind,
): value is PresetIdByKind<TKind> => presetById.get(value)?.kind === kind;

export const isAnimationPresetId = (value: string): value is AnimationPresetId =>
  isPresetIdOfKind(value, 'animation');

export const isTextPresetId = (value: string): value is TextPresetId =>
  isPresetIdOfKind(value, 'text');

export const isTransitionPresetId = (value: string): value is TransitionPresetId =>
  isPresetIdOfKind(value, 'transition');

export const isEffectPresetId = (value: string): value is EffectPresetId =>
  presetById.get(value)?.api === 'effects';

export const getPresetDefinition = <T extends string>(id: T): PresetDefinition => {
  const preset = presetById.get(id);
  if (preset) return preset;

  const normalized = id.trim().toLowerCase();
  const suggestions = presetRegistry
    .filter(
      (candidate) =>
        candidate.id.includes(normalized) ||
        candidate.displayName.toLowerCase().includes(normalized),
    )
    .slice(0, 4)
    .map((candidate) => candidate.id);
  const suffix = suggestions.length > 0 ? ` 候補: ${suggestions.join(', ')}` : '';
  throw new RangeError(`Unknown remotion-presets id: "${id}".${suffix}`);
};

export const getPresetMetadata = getPresetDefinition;

export const createPreset = <const TId extends PresetId>(
  id: TId,
  options: PresetOptions = {},
): PresetInstance<TId> => {
  getPresetDefinition(id);
  return Object.freeze({ schemaVersion: 1 as const, id, options: Object.freeze({ ...options }) });
};

export const getPresetsByKind = (kind: PresetKind): readonly PresetDefinition[] =>
  presetRegistry.filter((preset) => preset.kind === kind);

export const searchPresets = (query: string): readonly PresetDefinition[] => {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return presetRegistry;

  return presetRegistry.filter((preset) => {
    const haystack = [
      preset.id,
      preset.displayName,
      preset.displayNameJa,
      preset.descriptionJa,
      ...preset.tags,
      ...preset.premiereReferences.flatMap((reference) => [reference.name, reference.category]),
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
};

export const registryStats = Object.freeze({
  total: presetRegistry.length,
  currentPremiereReferences: presetRegistry.reduce(
    (total, preset) =>
      total +
      preset.premiereReferences.filter((reference) => reference.status === 'current').length,
    0,
  ),
  legacyPremiereReferences: presetRegistry.reduce(
    (total, preset) =>
      total + preset.premiereReferences.filter((reference) => reference.status === 'legacy').length,
    0,
  ),
  compound: compoundPresets.length,
});
