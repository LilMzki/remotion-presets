import { describe, expect, it } from 'vitest';
import { createPresetEffect, usePresetEffect } from './create-preset-effect';
import { presetRegistry } from './registry';

type InternalEffectParams = {
  readonly presetId: string;
  readonly engine: string;
  readonly variant: string;
  readonly intensity: number;
  readonly seed: string | number;
  readonly durationInFrames: number;
  readonly color?: string;
  readonly secondaryColor?: string;
  readonly direction: string;
  readonly frame: number;
  readonly fps: number;
};

type RecordedCanvasContext = {
  readonly context: CanvasRenderingContext2D;
  readonly operations: { readonly name: string; readonly args: readonly unknown[] }[];
  readonly writtenPixels: () => Uint8ClampedArray | undefined;
};

const cssPixel = (color: string): Uint8ClampedArray => {
  const normalized = color.toLowerCase();
  if (normalized === '#00ff00') return new Uint8ClampedArray([0, 255, 0, 255]);
  if (normalized === '#ffffff') return new Uint8ClampedArray([255, 255, 255, 255]);
  if (normalized === '#000000') return new Uint8ClampedArray([0, 0, 0, 255]);
  return new Uint8ClampedArray([0, 0, 0, 255]);
};

const makeCanvasContext = (pixels = new Uint8ClampedArray()): RecordedCanvasContext => {
  const operations: { name: string; args: readonly unknown[] }[] = [];
  let writtenPixels: Uint8ClampedArray | undefined;
  const record =
    (name: string) =>
    (...args: readonly unknown[]): void => {
      operations.push({ name, args });
    };
  const gradient = { addColorStop: record('addColorStop') } as unknown as CanvasGradient;
  const context = {
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    imageSmoothingEnabled: true,
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '',
    textBaseline: 'alphabetic',
    setTransform: record('setTransform'),
    save: record('save'),
    restore: record('restore'),
    clearRect: record('clearRect'),
    drawImage: record('drawImage'),
    fillRect: record('fillRect'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    rect: record('rect'),
    arc: record('arc'),
    clip: record('clip'),
    stroke: record('stroke'),
    fill: record('fill'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    translate: record('translate'),
    rotate: record('rotate'),
    scale: record('scale'),
    setLineDash: record('setLineDash'),
    fillText: record('fillText'),
    measureText: (text: string) => ({ width: text.length * 8 }) as TextMetrics,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    getImageData: (_x: number, _y: number, width: number, height: number) =>
      ({
        data:
          width === 1 && height === 1
            ? cssPixel(String(context.fillStyle))
            : new Uint8ClampedArray(pixels),
        width,
        height,
        colorSpace: 'srgb',
      }) as ImageData,
    putImageData: (imageData: ImageData) => {
      writtenPixels = new Uint8ClampedArray(imageData.data);
      record('putImageData')(imageData);
    },
  } as unknown as CanvasRenderingContext2D;

  return { context, operations, writtenPixels: () => writtenPixels };
};

const makeCanvas = (context: CanvasRenderingContext2D): HTMLCanvasElement =>
  ({
    width: 2,
    height: 1,
    getContext: () => context,
  }) as unknown as HTMLCanvasElement;

const applyInFakeCanvas = (
  presetId: string,
  targetContext: CanvasRenderingContext2D,
  workContext: CanvasRenderingContext2D,
  workCanvasOverride?: HTMLCanvasElement,
): void => {
  const descriptor = createPresetEffect(presetId, {
    color: presetId === 'color-key' ? '#00ff00' : '#ffffff',
    intensity: 2,
    durationInFrames: 90,
  }).effects[0];
  if (!descriptor) throw new Error(`Missing effect descriptor for ${presetId}.`);

  const target = makeCanvas(targetContext);
  descriptor.definition.apply({
    source: {} as CanvasImageSource,
    target,
    state: {
      context: targetContext,
      workCanvas: workCanvasOverride ?? makeCanvas(workContext),
      sourceCanvas: makeCanvas(makeCanvasContext().context),
    },
    params: descriptor.params,
    width: 2,
    height: 1,
    gpuDevice: null,
    flipSourceY: false,
  });
};

const temporalPresetIds = [
  'camera-shake',
  'wiggle',
  'noise',
  'vhs',
  'wave-warp',
  'vr-digital-glitch',
  'light-leaks',
  'metadata-timecode-burn-in',
] as const;

describe('createPresetEffect()', () => {
  it('creates one unique Canvas2D descriptor for every effects preset', () => {
    const definitions = presetRegistry.filter((preset) => preset.api === 'effects');
    const descriptors = definitions.map((preset) => createPresetEffect(preset.id).effects[0]);

    expect(definitions).toHaveLength(107);
    expect(descriptors.every(Boolean)).toBe(true);
    expect(new Set(descriptors.map((descriptor) => descriptor?.effectKey)).size).toBe(107);

    for (let index = 0; index < definitions.length; index++) {
      const definition = definitions[index];
      const descriptor = descriptors[index];
      expect(descriptor?.definition.backend, definition?.id).toBe('2d');
      expect(descriptor?.memoized, definition?.id).toBe(false);
      expect(descriptor?.params, definition?.id).toMatchObject({
        presetId: definition?.id,
        engine: definition?.engine,
        variant: definition?.variant,
        frame: 0,
        fps: 30,
      });
    }
  });

  it('includes hidden timing params in memoization keys for temporal presets', () => {
    for (const presetId of temporalPresetIds) {
      const descriptor = createPresetEffect(presetId, { seed: 'temporal-test' }).effects[0];
      expect(descriptor).toBeDefined();
      if (!descriptor) continue;

      const params = descriptor.params as InternalEffectParams;
      const calculateKey = descriptor.definition.calculateKey as (
        value: InternalEffectParams,
      ) => string;
      const frameOneKey = calculateKey({ ...params, frame: 1 });
      const differentFpsKey = calculateKey({ ...params, fps: 60 });

      expect(frameOneKey, presetId).not.toBe(descriptor.effectKey);
      expect(differentFpsKey, presetId).not.toBe(descriptor.effectKey);
      expect(descriptor.definition.schema.frame, presetId).toEqual({ type: 'hidden' });
      expect(descriptor.definition.schema.fps, presetId).toEqual({ type: 'hidden' });
    }
  });

  it('keeps the static factory and frame-aware hook as separate APIs', () => {
    const staticEffect = createPresetEffect('noise', { seed: 'stable' });
    expect(staticEffect.effects[0]?.params).toMatchObject({ frame: 0, fps: 30 });
    expect(usePresetEffect).toBeTypeOf('function');
  });

  it('turns pixels matching a key color transparent', () => {
    const target = makeCanvasContext();
    const work = makeCanvasContext(
      new Uint8ClampedArray([
        0,
        255,
        0,
        255, // keyed green
        255,
        0,
        0,
        255, // retained red
      ]),
    );

    applyInFakeCanvas('color-key', target.context, work.context);

    expect(work.writtenPixels()?.[3]).toBe(0);
    expect(work.writtenPixels()?.[7]).toBe(255);
    expect(target.operations.some(({ name }) => name === 'drawImage')).toBe(true);
  });

  it('resets a tainted keying buffer before it can be reused', () => {
    const target = makeCanvasContext();
    const unreadableWork = makeCanvasContext();
    unreadableWork.context.getImageData = () => {
      throw new DOMException('The canvas has been tainted.', 'SecurityError');
    };

    let width = 2;
    let height = 1;
    let widthAssignments = 0;
    let heightAssignments = 0;
    const trackedWorkCanvas = {
      get width() {
        return width;
      },
      set width(value: number) {
        width = value;
        widthAssignments += 1;
      },
      get height() {
        return height;
      },
      set height(value: number) {
        height = value;
        heightAssignments += 1;
      },
      getContext: () => unreadableWork.context,
    } as unknown as HTMLCanvasElement;

    applyInFakeCanvas('color-key', target.context, unreadableWork.context, trackedWorkCanvas);

    expect(widthAssignments).toBe(1);
    expect(heightAssignments).toBe(1);
    expect(target.operations.some(({ name }) => name === 'fillRect')).toBe(true);
  });

  it('keeps formerly silent variants on dedicated visible drawing paths', () => {
    const clone = makeCanvasContext();
    applyInFakeCanvas('clone', clone.context, makeCanvasContext().context);
    expect(clone.operations.some(({ name }) => name === 'arc')).toBe(true);
    expect(
      clone.operations.some(({ name, args }) => name === 'drawImage' && args.length === 9),
    ).toBe(true);

    const timecode = makeCanvasContext();
    applyInFakeCanvas('metadata-timecode-burn-in', timecode.context, makeCanvasContext().context);
    const label = timecode.operations.find(({ name }) => name === 'fillText')?.args[0];
    expect(label).toBe('TC  00:00:00:00  ·  1/90f');
  });

  it('keeps grow and shrink centered and unscaled at frame zero', () => {
    for (const presetId of ['grow', 'shrink']) {
      const target = makeCanvasContext();
      applyInFakeCanvas(presetId, target.context, makeCanvasContext().context);
      const firstTranslation = target.operations.find(({ name }) => name === 'translate');
      const firstScale = target.operations.find(({ name }) => name === 'scale');

      expect(firstTranslation?.args, presetId).toEqual([1, 0.5]);
      expect(firstScale?.args, presetId).toEqual([1, 1]);
    }
  });
});
