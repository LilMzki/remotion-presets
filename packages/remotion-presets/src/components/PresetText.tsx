import type { ReactElement } from 'react';
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { progressForFrame, seededUnit } from '../core/math';
import { getPresetDefinition } from '../registry';
import type { CategoryCheckedPresetId, TextPresetId } from '../registry';
import type { PresetTextProps } from '../types';
import { PresetTextLayer } from './PresetLayer';

const segmentText = (text: string): string[] => {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }

  return Array.from(text);
};

const scrambleAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-?';

const scrambleCharacter = (seed: string | number, index: number, frame: number): string => {
  const unit = seededUnit(`${seed}:${frame}`, index);
  return scrambleAlphabet[Math.floor(unit * scrambleAlphabet.length)] ?? '•';
};

export const PresetText = <const TId extends string>({
  preset,
  text,
  durationInFrames,
  intensity = 1,
  seed = preset,
  className,
  style,
  ...layerOptions
}: PresetTextProps & {
  readonly preset: CategoryCheckedPresetId<TId, TextPresetId>;
}): ReactElement => {
  const definition = getPresetDefinition(preset);
  if (definition.kind !== 'text') {
    throw new RangeError(
      `Preset "${definition.id}" is a ${definition.kind} preset and cannot be used as text.`,
    );
  }
  const frame = useCurrentFrame();
  const { durationInFrames: compositionDuration } = useVideoConfig();
  const requestedDuration =
    durationInFrames ?? Math.min(compositionDuration, definition.defaultDurationInFrames);
  if (!Number.isFinite(requestedDuration) || requestedDuration < 1) {
    throw new RangeError('PresetText durationInFrames must be a finite number greater than 0.');
  }
  const duration = Math.round(requestedDuration);
  const progress = progressForFrame(frame, duration);
  const graphemes = segmentText(text);
  const visibleCount = Math.min(graphemes.length, Math.floor(progress * (graphemes.length + 1)));
  const isTypewriter = definition.variant.includes('typewriter');
  const isScramble = definition.variant.includes('scramble');
  const isKinetic = definition.variant.includes('kinetic');

  const visibleText = graphemes
    .map((character, index) => {
      if (index < visibleCount) return character;
      if (isScramble && index < visibleCount + Math.max(1, Math.round(5 * intensity))) {
        return scrambleCharacter(seed, index, frame);
      }
      return isTypewriter || isScramble ? '' : character;
    })
    .join('');

  if (isKinetic) {
    const words = text.split(/(\s+)/);
    return (
      <PresetTextLayer
        {...layerOptions}
        preset={preset}
        durationInFrames={duration}
        intensity={intensity}
        seed={seed}
      >
        {(contentStyle) => (
          <span
            className={className}
            style={{ ...contentStyle, display: 'inline-flex', flexWrap: 'wrap', ...style }}
          >
            {words.map((word, index) => {
              const wordProgress = Math.max(0, Math.min(1, progress * words.length - index));
              return (
                <span
                  key={`${word}-${index}`}
                  style={{
                    display: 'inline-block',
                    opacity: word.trim() ? wordProgress : 1,
                    transform: `translateY(${(1 - wordProgress) * 0.8}em) rotate(${(1 - wordProgress) * 3}deg)`,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </span>
        )}
      </PresetTextLayer>
    );
  }

  return (
    <PresetTextLayer
      {...layerOptions}
      preset={preset}
      durationInFrames={duration}
      intensity={intensity}
      seed={seed}
    >
      {(contentStyle) => (
        <span className={className} style={{ ...contentStyle, ...style }}>
          {visibleText}
          {isTypewriter && frame % 16 < 10 ? (
            <span aria-hidden style={{ opacity: 0.85 }}>
              ▍
            </span>
          ) : null}
        </span>
      )}
    </PresetTextLayer>
  );
};
