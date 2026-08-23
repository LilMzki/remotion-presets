import { linearTiming, springTiming } from '@remotion/transitions';
import { Easing } from 'remotion';
import { createPresetTransition } from './create-preset-transition';
import { getPresetDefinition } from './registry';
import type { CategoryCheckedPresetId, TransitionPresetId } from './registry';
import type { PresetOptions, PresetTransitionSpec } from './types';

/**
 * Combines a high-level transition presentation with a matching timing curve.
 */
export const createTransitionSpec = <const TId extends string>(
  presetId: CategoryCheckedPresetId<TId, TransitionPresetId>,
  options: PresetOptions = {},
): PresetTransitionSpec => {
  const preset = getPresetDefinition(presetId);
  const requestedDuration = options.durationInFrames ?? preset.defaultDurationInFrames;
  if (!Number.isFinite(requestedDuration) || requestedDuration < 1) {
    throw new RangeError('durationInFrames must be a finite number greater than or equal to 1.');
  }
  const durationInFrames = Math.round(requestedDuration);
  const motion = options.motion ?? (preset.variant.includes('spring') ? 'bouncy' : 'smooth');
  const timing =
    motion === 'bouncy' || motion === 'snappy'
      ? springTiming({
          durationInFrames,
          config:
            motion === 'bouncy'
              ? { damping: 11, stiffness: 140, mass: 0.8 }
              : { damping: 24, stiffness: 240, mass: 0.7 },
        })
      : linearTiming({
          durationInFrames,
          easing: motion === 'gentle' ? Easing.inOut(Easing.sin) : Easing.inOut(Easing.cubic),
        });

  return { presentation: createPresetTransition(presetId, options), timing };
};
