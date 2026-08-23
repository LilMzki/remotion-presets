import { describe, expect, it } from 'vitest';
import * as animationApi from './animations';
import * as effectApi from './effects';
import * as rootApi from './index';
import * as lookApi from './looks';
import { presetRegistry } from './registry';
import * as textApi from './text';
import * as transitionApi from './transitions';
import type { PresetEffect, PresetTransitionSpec } from './types';

type PublicModule = Readonly<Record<string, unknown>>;

const modulesByKind = {
  animation: animationApi,
  effect: effectApi,
  look: lookApi,
  text: textApi,
  transition: transitionApi,
} satisfies Readonly<Record<string, PublicModule>>;

describe('registry named exports', () => {
  it('publishes every metadata export from both the root and its category subpath', () => {
    for (const preset of presetRegistry) {
      const categoryModule = modulesByKind[preset.kind as keyof typeof modulesByKind];

      expect(categoryModule, `${preset.id} has a public category module`).toBeDefined();
      expect(rootApi, `${preset.exportName} is exported from the root`).toHaveProperty(
        preset.exportName,
      );
      expect(
        categoryModule,
        `${preset.exportName} is exported from the ${preset.kind} subpath`,
      ).toHaveProperty(preset.exportName);
      // Guard the source re-export graph. Published entries are bundled independently;
      // docs/api.md explicitly does not promise referential identity across import paths.
      expect((rootApi as PublicModule)[preset.exportName]).toBe(
        (categoryModule as PublicModule)[preset.exportName],
      );
    }
  });

  it('binds every factory or component to the preset ID declared in metadata', () => {
    for (const preset of presetRegistry) {
      const exported = (rootApi as PublicModule)[preset.exportName];
      expect(typeof exported, preset.exportName).toBe('function');

      if (preset.kind === 'effect') {
        const effect = (exported as (options?: { seed?: string }) => PresetEffect)({
          seed: 'named-export-test',
        });
        expect(effect.presetId, preset.exportName).toBe(preset.id);
        continue;
      }

      if (preset.kind === 'transition') {
        const transition = (
          exported as (options?: { durationInFrames?: number }) => PresetTransitionSpec
        )({ durationInFrames: 12 });
        expect(
          (transition.presentation.props as { presetId?: string } | undefined)?.presetId,
          preset.exportName,
        ).toBe(preset.id);
        continue;
      }

      const component = exported as { displayName?: string };
      expect(component.displayName, preset.exportName).toContain(`(${preset.id})`);
    }
  });
});
