import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type * as RemotionModule from 'remotion';
import { describe, expect, it, vi } from 'vitest';

import { PresetText } from './PresetText';

vi.mock('remotion', async (importOriginal) => {
  const actual = await importOriginal<typeof RemotionModule>();

  return {
    ...actual,
    useCurrentFrame: () => 42,
    useVideoConfig: () => ({
      durationInFrames: 90,
      fps: 30,
      height: 1080,
      width: 1920,
      id: 'preset-text-test',
    }),
  };
});

const renderedGlyphStyle = (preset: 'golden-text' | 'chrome-text'): string => {
  const markup = renderToStaticMarkup(
    <PresetText
      preset={preset}
      text="GOLD"
      durationInFrames={72}
      className="actual-glyphs"
      style={{ fontSize: 72 }}
    />,
  );
  const match = markup.match(/<span class="actual-glyphs" style="([^"]+)">GOLD<\/span>/);

  expect(match, markup).not.toBeNull();
  return match?.[1] ?? '';
};

describe('PresetText visual style boundary', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'rejects an invalid durationInFrames value of %s',
    (durationInFrames) => {
      expect(() =>
        renderToStaticMarkup(
          <PresetText preset="typewriter" text="INVALID" durationInFrames={durationInFrames} />,
        ),
      ).toThrow(RangeError);
    },
  );

  it.each(['golden-text', 'chrome-text'] as const)(
    'applies the %s gradient and transparent fill to the glyph node',
    (preset) => {
      const style = renderedGlyphStyle(preset);

      expect(style).toContain('background-image:linear-gradient');
      expect(style).toContain('background-clip:text');
      expect(style).toContain('-webkit-background-clip:text');
      expect(style).toContain('-webkit-text-fill-color:transparent');
      expect(style).toContain('font-size:72px');
    },
  );

  it('keeps every preset root absolutely stacked when multiple text presets coexist', () => {
    const markup = renderToStaticMarkup(
      <div>
        <PresetText preset="typewriter" text="LAYER ONE" durationInFrames={72} />
        <PresetText preset="golden-text" text="LAYER TWO" durationInFrames={72} />
      </div>,
    );
    const rootTags = Array.from(
      markup.matchAll(/<div(?=[^>]*data-preset="(?:typewriter|golden-text)")[^>]*>/g),
      ([tag]) => tag,
    );

    expect(rootTags).toHaveLength(2);
    for (const rootTag of rootTags) {
      expect(rootTag).toContain('position:absolute');
      expect(rootTag).toContain('inset:0');
      expect(rootTag).not.toContain('position:relative');
    }
  });
});
