import type { CSSProperties } from 'react';
import { createEffect, useCurrentFrame, useVideoConfig } from 'remotion';
import { assertSafeCssColor } from './core/color';
import { getPresetDefinition } from './registry';
import type { CategoryCheckedPresetId, EffectPresetId } from './registry';
import type { PresetDefinition, PresetEffect, PresetEngine, PresetOptions } from './types';

type PresetDirection = NonNullable<PresetOptions['direction']>;

type PresetCanvasEffectParams = {
  readonly presetId: string;
  readonly engine: PresetEngine;
  readonly variant: string;
  readonly intensity: number;
  readonly seed: string | number;
  readonly durationInFrames: number;
  readonly color?: string;
  readonly secondaryColor?: string;
  readonly direction: PresetDirection;
  readonly frame: number;
  readonly fps: number;
};

type PresetCanvasEffectState = {
  readonly context: CanvasRenderingContext2D;
  readonly workCanvas: HTMLCanvasElement;
  readonly sourceCanvas: HTMLCanvasElement;
};

const presetEngines = new Set<PresetEngine>([
  'adjust',
  'blur',
  'color',
  'distort',
  'generate',
  'glow',
  'keying',
  'noise',
  'perspective',
  'stylize',
  'time',
  'transform',
  'utility',
  'vr',
  'transition',
  'text',
  'recipe',
]);

const directions = new Set<PresetDirection>(['left', 'right', 'top', 'bottom']);

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

const formatNumber = (value: number): string => Number(value.toFixed(4)).toString();

const normalizeVariant = (variant: string): string => variant.trim().toLowerCase();

const containsAny = (value: string, needles: readonly string[]): boolean =>
  needles.some((needle) => value.includes(needle));

const hasVariantToken = (variant: string, token: string): boolean =>
  variant.split('-').includes(token);

const smoothstep = (value: number): number => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};

const hashString = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const seededUnit = (seed: string | number, salt: number): number => {
  let value = hashString(`${seed}:${salt}`);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
};

const animatedSignedNoise = (
  seed: string | number,
  channel: number,
  samplePosition: number,
): number => {
  const fromSample = Math.floor(samplePosition);
  const progress = smoothstep(samplePosition - fromSample);
  const from = seededUnit(seed, fromSample * 8 + channel) * 2 - 1;
  const to = seededUnit(seed, (fromSample + 1) * 8 + channel) * 2 - 1;
  return from + (to - from) * progress;
};

const resizeCanvas = (canvas: HTMLCanvasElement, width: number, height: number): void => {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
};

const get2DContext = (
  canvas: HTMLCanvasElement,
  purpose: string,
  willReadFrequently = false,
): CanvasRenderingContext2D => {
  const context = canvas.getContext('2d', { willReadFrequently });

  if (!context) {
    throw new Error(
      `Could not acquire a 2D canvas context for ${purpose}. ` +
        'The canvas may already be using another rendering backend.',
    );
  }

  return context;
};

const resetContext = (context: CanvasRenderingContext2D): void => {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.filter = 'none';
  context.imageSmoothingEnabled = true;
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
};

const resolveFilter = (engine: PresetEngine, variantValue: string, intensity: number): string => {
  const variant = normalizeVariant(variantValue);
  const amount = clamp(intensity, 0, 2);

  if (amount === 0) return 'none';

  if (variant.includes('cineon-converter')) {
    return `sepia(${formatNumber(amount * 0.12)}) contrast(${formatNumber(
      1 + amount * 0.3,
    )}) saturate(${formatNumber(Math.max(0.2, 1 - amount * 0.16))})`;
  }

  if (variant.includes('de-noise')) {
    return `blur(${formatNumber(0.25 + amount * 0.45)}px) contrast(${formatNumber(
      1 + amount * 0.04,
    )})`;
  }

  if (containsAny(variant, ['invert', 'negative'])) {
    return `invert(${formatNumber(clamp(amount))})`;
  }

  if (containsAny(variant, ['black-and-white', 'black-white', 'monochrome', 'noir'])) {
    return `grayscale(1) contrast(${formatNumber(1 + amount * 0.35)})`;
  }

  if (containsAny(variant, ['bleach-bypass', 'bleach bypass'])) {
    return `grayscale(${formatNumber(0.35 * amount)}) contrast(${formatNumber(
      1 + amount * 0.45,
    )}) saturate(${formatNumber(Math.max(0, 1 - amount * 0.35))})`;
  }

  if (containsAny(variant, ['vintage', 'sepia', 'old-film', 'old film'])) {
    return `sepia(${formatNumber(clamp(amount * 0.72))}) saturate(${formatNumber(
      1 + amount * 0.18,
    )}) contrast(${formatNumber(1 + amount * 0.12)})`;
  }

  if (containsAny(variant, ['thermal', 'psychedelic', 'hue', 'color-cycle'])) {
    return `hue-rotate(${formatNumber(58 * amount)}deg) saturate(${formatNumber(
      1 + amount * 0.8,
    )})`;
  }

  if (containsAny(variant, ['posterize', 'threshold', 'extract', 'solarize'])) {
    return `contrast(${formatNumber(1 + amount * 1.35)}) saturate(${formatNumber(
      Math.max(0.1, 1 - amount * 0.3),
    )})`;
  }

  if (containsAny(variant, ['brightness', 'exposure', 'lighting'])) {
    return `brightness(${formatNumber(1 + amount * 0.22)})`;
  }

  if (containsAny(variant, ['contrast', 'levels', 'curves'])) {
    return `contrast(${formatNumber(1 + amount * 0.35)})`;
  }

  if (containsAny(variant, ['saturation', 'vibrance'])) {
    return `saturate(${formatNumber(1 + amount * 0.65)})`;
  }

  if (containsAny(variant, ['sharpen', 'unsharp'])) {
    return `contrast(${formatNumber(1 + amount * 0.16)}) saturate(${formatNumber(
      1 + amount * 0.08,
    )})`;
  }

  if (containsAny(variant, ['blur', 'defocus', 'flicker'])) {
    return `blur(${formatNumber(1 + amount * 5)}px)`;
  }

  if (containsAny(variant, ['glow', 'glint']) || hasVariantToken(variant, 'neon')) {
    return `blur(${formatNumber(2 + amount * 4)}px) brightness(${formatNumber(
      1.08 + amount * 0.25,
    )}) saturate(${formatNumber(1 + amount * 0.3)})`;
  }

  switch (engine) {
    case 'adjust':
      return `brightness(${formatNumber(1 + amount * 0.08)}) contrast(${formatNumber(
        1 + amount * 0.2,
      )})`;
    case 'blur':
      return `blur(${formatNumber(1 + amount * 5)}px)`;
    case 'color':
      return `saturate(${formatNumber(1 + amount * 0.32)}) hue-rotate(${formatNumber(
        amount * 8,
      )}deg)`;
    case 'glow':
      return `blur(${formatNumber(2 + amount * 4)}px) brightness(${formatNumber(
        1.08 + amount * 0.25,
      )}) saturate(${formatNumber(1 + amount * 0.3)})`;
    case 'keying':
      return `saturate(${formatNumber(1 + amount * 0.12)}) contrast(${formatNumber(
        1 + amount * 0.08,
      )})`;
    case 'noise':
      return `contrast(${formatNumber(1 + amount * 0.06)})`;
    case 'stylize':
      return `contrast(${formatNumber(1 + amount * 0.14)}) saturate(${formatNumber(
        1 + amount * 0.12,
      )})`;
    case 'recipe':
      return `contrast(${formatNumber(1 + amount * 0.12)}) saturate(${formatNumber(
        1 + amount * 0.18,
      )})`;
    default:
      return 'none';
  }
};

const blendModeForVariant = (variantValue: string): GlobalCompositeOperation | null => {
  const variant = normalizeVariant(variantValue);

  if (containsAny(variant, ['additive', 'linear-dodge', 'lighten'])) return 'lighter';
  if (containsAny(variant, ['screen'])) return 'screen';
  if (containsAny(variant, ['multiply', 'darken'])) return 'multiply';
  if (containsAny(variant, ['difference'])) return 'difference';
  if (containsAny(variant, ['exclusion'])) return 'exclusion';
  if (containsAny(variant, ['hard-light'])) return 'hard-light';
  if (containsAny(variant, ['soft-light'])) return 'soft-light';
  if (containsAny(variant, ['overlay'])) return 'overlay';

  return null;
};

const directionVector = (direction: PresetDirection): readonly [number, number] => {
  switch (direction) {
    case 'right':
      return [1, 0];
    case 'top':
      return [0, -1];
    case 'bottom':
      return [0, 1];
    case 'left':
    default:
      return [-1, 0];
  }
};

const drawFilteredSource = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  filter: string,
  glowBlend: boolean,
  intensity: number,
): void => {
  if (filter === 'none') return;

  context.save();
  context.filter = filter;

  if (glowBlend) {
    context.globalAlpha = clamp(0.3 + intensity * 0.28, 0, 0.88);
    context.globalCompositeOperation = 'screen';
  }

  context.drawImage(source, 0, 0, width, height);
  context.restore();
};

const drawPixelated = (
  state: PresetCanvasEffectState,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
): void => {
  const blockSize = Math.max(2, Math.round(3 + intensity * 12));
  const sampleWidth = Math.max(1, Math.ceil(width / blockSize));
  const sampleHeight = Math.max(1, Math.ceil(height / blockSize));
  resizeCanvas(state.workCanvas, sampleWidth, sampleHeight);

  const workContext = get2DContext(state.workCanvas, 'the pixelation buffer');
  resetContext(workContext);
  workContext.clearRect(0, 0, sampleWidth, sampleHeight);
  workContext.imageSmoothingEnabled = false;
  workContext.drawImage(source, 0, 0, sampleWidth, sampleHeight);

  state.context.save();
  state.context.imageSmoothingEnabled = false;
  state.context.drawImage(state.workCanvas, 0, 0, sampleWidth, sampleHeight, 0, 0, width, height);
  state.context.restore();
};

const drawTiled = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
): void => {
  const columns = Math.max(2, Math.min(6, Math.round(2 + intensity * 2)));
  const rows = Math.max(2, Math.min(6, Math.round((columns * height) / Math.max(1, width))));
  const tileWidth = width / columns;
  const tileHeight = height / rows;

  context.save();
  context.globalAlpha = clamp(0.55 + intensity * 0.2, 0, 1);

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      context.drawImage(source, column * tileWidth, row * tileHeight, tileWidth, tileHeight);
    }
  }

  context.restore();
};

const drawMirror = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  direction: PresetDirection,
): void => {
  const vertical = direction === 'top' || direction === 'bottom';
  context.save();

  if (vertical) {
    context.beginPath();
    context.rect(0, height / 2, width, height / 2);
    context.clip();
    context.translate(0, height);
    context.scale(1, -1);
  } else {
    context.beginPath();
    context.rect(width / 2, 0, width / 2, height);
    context.clip();
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(source, 0, 0, width, height);
  context.restore();
};

const drawFlipped = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  vertical: boolean,
): void => {
  context.save();

  if (vertical) {
    context.translate(0, height);
    context.scale(1, -1);
  } else {
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(source, 0, 0, width, height);
  context.restore();
};

const drawWave = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  seed: string | number,
  frame: number,
  fps: number,
): void => {
  const strips = Math.max(18, Math.min(64, Math.round(height / 24)));
  const stripHeight = height / strips;
  const phase = seededUnit(seed, 31) * Math.PI * 2 + (frame / fps) * Math.PI * 1.2;
  const displacement = Math.min(width * 0.04, 5 + intensity * 16);

  context.save();
  context.globalAlpha = clamp(0.55 + intensity * 0.2, 0, 1);

  for (let index = 0; index < strips; index++) {
    const sourceY = Math.floor(index * stripHeight);
    const sourceHeight = Math.max(1, Math.ceil(stripHeight));
    const offset = Math.sin(index * 0.72 + phase) * displacement;
    context.drawImage(
      source,
      0,
      sourceY,
      width,
      sourceHeight,
      offset,
      sourceY,
      width,
      sourceHeight,
    );
  }

  context.restore();
};

const drawMagnified = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  seed: string | number,
): void => {
  const centerX = width * (0.42 + seededUnit(seed, 41) * 0.16);
  const centerY = height * (0.42 + seededUnit(seed, 42) * 0.16);
  const radius = Math.min(width, height) * clamp(0.18 + intensity * 0.04, 0.1, 0.38);
  const scale = 1 + intensity * 0.22;

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.translate(-centerX, -centerY);
  context.drawImage(source, 0, 0, width, height);
  context.restore();
};

const drawTransformEcho = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  direction: PresetDirection,
  variantValue: string,
  seed: string | number,
  frame: number,
  fps: number,
  durationInFrames: number,
  replaceSource: boolean,
): void => {
  const variant = normalizeVariant(variantValue);
  const [directionX, directionY] = directionVector(direction);
  const time = frame / fps;
  const durationProgress = clamp(frame / Math.max(1, durationInFrames - 1));
  const easedDurationProgress = smoothstep(durationProgress);
  const isShake = containsAny(variant, ['camera-shake', 'wiggle']);
  const jitterX = isShake ? animatedSignedNoise(seed, 501, time * 8) : 0;
  const jitterY = isShake ? animatedSignedNoise(seed, 502, time * 8) : 0;
  const baseOffset = Math.min(width, height) * 0.012 * intensity;
  const isDirectionalMotion = containsAny(variant, ['move', 'offset', 'auto-reframe']);
  const motionWave = isDirectionalMotion ? Math.sin(time * Math.PI * 1.4) : 1;
  const directionalOffset = isDirectionalMotion ? baseOffset * motionWave : 0;
  const offsetX = directionX * directionalOffset + jitterX * baseOffset * 1.6;
  const offsetY = directionY * directionalOffset + jitterY * baseOffset * 1.6;
  const rotation = containsAny(variant, ['rotate', 'spin', 'roll'])
    ? time * intensity * 0.4
    : variant === 'basic-3d'
      ? intensity * 0.035
      : variant === 'twirl'
        ? intensity * 0.08
        : variant === 'transform'
          ? intensity * 0.025
          : isShake
            ? (jitterX - jitterY) * intensity * 0.018
            : 0;
  const scale = variant.includes('grow')
    ? 1 + intensity * 0.14 * easedDurationProgress
    : variant.includes('shrink')
      ? Math.max(0.58, 1 - intensity * 0.14 * easedDurationProgress)
      : containsAny(variant, ['zoom', 'magnify', 'auto-reframe', 'warp-stabilizer'])
        ? 1 + intensity * 0.025
        : variant === 'transform'
          ? 1 + intensity * 0.02
          : variant === 'corner-pin'
            ? Math.max(0.9, 1 - intensity * 0.02)
            : replaceSource
              ? 1
              : 1 + intensity * 0.012;

  context.save();
  if (replaceSource) context.clearRect(0, 0, width, height);
  context.globalAlpha = replaceSource ? 1 : clamp(0.18 + intensity * 0.18, 0, 0.55);
  context.translate(width / 2 + offsetX, height / 2 + offsetY);
  context.rotate(rotation);
  context.scale(scale, scale);
  context.translate(-width / 2, -height / 2);
  context.drawImage(source, 0, 0, width, height);
  context.restore();
};

const drawTemporalGlowEcho = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  seed: string | number,
  frame: number,
  fps: number,
): void => {
  const time = frame / fps;
  const seedPhase = seededUnit(seed, 701) * Math.PI * 2;
  const phase = seedPhase + time * Math.PI * 2.4;
  const pulse = 0.5 + Math.sin(phase) * 0.5;
  const radius = (2 + intensity * 8) * (0.45 + pulse * 0.55);

  context.save();
  context.globalCompositeOperation = 'screen';
  context.filter = `blur(${formatNumber(2 + intensity * (3 + pulse * 3))}px)`;

  for (let pass = 1; pass <= 3; pass++) {
    const passPhase = phase - pass * 0.82;
    const distance = (radius * pass) / 3;
    context.globalAlpha = clamp((0.08 + intensity * 0.055) * (1 - pass * 0.12), 0, 0.3);
    context.drawImage(
      source,
      Math.cos(passPhase) * distance,
      Math.sin(passPhase) * distance,
      width,
      height,
    );
  }

  context.restore();
};

const drawStrobe = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  frame: number,
  color: string,
): void => {
  const isFlashFrame = Math.abs(frame) % 2 === 0;

  context.save();
  context.globalCompositeOperation = isFlashFrame ? 'screen' : 'multiply';
  context.globalAlpha = isFlashFrame
    ? clamp(0.16 + intensity * 0.22, 0, 0.62)
    : clamp(0.015 + intensity * 0.025, 0, 0.08);
  context.fillStyle = isFlashFrame ? color : '#000000';
  context.fillRect(0, 0, width, height);
  context.restore();
};

const drawPosterizeTimeApproximation = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  frame: number,
): void => {
  // An EffectDescriptor cannot ask Remotion for an earlier source frame. Keep
  // the current source and quantize a deterministic visual treatment instead.
  const bucket = Math.floor(frame / 2);
  const level = ((bucket % 6) + 6) % 6;
  const normalizedLevel = level / 5;
  const brightness = 0.9 + normalizedLevel * 0.2;
  const contrast = 1 + intensity * (0.08 + normalizedLevel * 0.12);
  const saturation = Math.max(0.25, 1 - intensity * (0.08 + (1 - normalizedLevel) * 0.16));

  context.save();
  context.globalAlpha = clamp(0.2 + intensity * 0.12, 0, 0.48);
  context.filter = `brightness(${formatNumber(brightness)}) contrast(${formatNumber(
    contrast,
  )}) saturate(${formatNumber(saturation)})`;
  context.drawImage(source, 0, 0, width, height);
  context.restore();
};

const tintCanvasSource = (
  state: PresetCanvasEffectState,
  source: CanvasImageSource,
  width: number,
  height: number,
  color: string,
): HTMLCanvasElement => {
  resizeCanvas(state.workCanvas, width, height);
  const workContext = get2DContext(state.workCanvas, 'the color-channel buffer');
  resetContext(workContext);
  workContext.clearRect(0, 0, width, height);
  workContext.drawImage(source, 0, 0, width, height);
  workContext.globalCompositeOperation = 'source-atop';
  workContext.fillStyle = color;
  workContext.fillRect(0, 0, width, height);
  return state.workCanvas;
};

const drawChromaticSplit = (
  state: PresetCanvasEffectState,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  direction: PresetDirection,
  seed: string | number,
  frame: number,
): void => {
  const [directionX, directionY] = directionVector(direction);
  const jitter = 0.7 + seededUnit(seed, frame + 601) * 0.6;
  const offset = Math.max(1, Math.round((2 + intensity * 5) * Math.min(2, intensity) * jitter));

  state.context.save();
  state.context.globalCompositeOperation = 'screen';
  state.context.globalAlpha = clamp(0.12 + intensity * 0.14, 0, 0.4);
  const redChannel = tintCanvasSource(state, source, width, height, '#ff1744');
  state.context.drawImage(redChannel, directionX * offset, directionY * offset, width, height);
  const cyanChannel = tintCanvasSource(state, source, width, height, '#00e5ff');
  state.context.drawImage(cyanChannel, -directionX * offset, -directionY * offset, width, height);
  state.context.restore();
};

const drawVignette = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  color: string,
): void => {
  const centerX = width / 2;
  const centerY = height / 2;
  const innerRadius = Math.min(width, height) * 0.22;
  const outerRadius = Math.hypot(width, height) * 0.55;
  const gradient = context.createRadialGradient(
    centerX,
    centerY,
    innerRadius,
    centerX,
    centerY,
    outerRadius,
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.55, 'transparent');
  gradient.addColorStop(1, color);

  context.save();
  context.globalAlpha = clamp(0.28 + intensity * 0.28, 0, 0.82);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
};

const drawScanlines = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  color: string,
  seed: string | number,
  frame: number,
): void => {
  const spacing = Math.max(3, Math.round(7 - Math.min(2, intensity) * 1.5));
  const thickness = Math.max(1, Math.round(intensity * 0.75));
  const offset = (Math.floor(seededUnit(seed, 51) * spacing) + frame) % spacing;

  context.save();
  context.globalAlpha = clamp(0.07 + intensity * 0.09, 0, 0.3);
  context.fillStyle = color;

  for (let y = -spacing + offset; y < height; y += spacing) {
    context.fillRect(0, y, width, thickness);
  }

  context.restore();
};

const drawNoise = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  seed: string | number,
  frame: number,
): void => {
  const count = Math.min(2400, Math.max(0, Math.round((width * height * intensity) / 2600)));
  if (count === 0) return;

  context.save();
  context.globalCompositeOperation = 'overlay';
  context.globalAlpha = clamp(0.06 + intensity * 0.07, 0, 0.24);

  const frameSeed = `${seed}:${frame}`;

  for (let index = 0; index < count; index++) {
    const x = Math.floor(seededUnit(frameSeed, index * 4 + 101) * width);
    const y = Math.floor(seededUnit(frameSeed, index * 4 + 102) * height);
    const size = 1 + Math.floor(seededUnit(frameSeed, index * 4 + 103) * (1 + intensity));
    context.fillStyle = seededUnit(frameSeed, index * 4 + 104) > 0.5 ? '#ffffff' : '#000000';
    context.fillRect(x, y, size, size);
  }

  context.restore();
};

const drawGradientOverlay = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  color: string,
  secondaryColor: string,
  direction: PresetDirection,
  seed: string | number,
  frame: number,
  fps: number,
): void => {
  const [directionX, directionY] = directionVector(direction);
  const startX = directionX > 0 ? 0 : directionX < 0 ? width : width / 2;
  const startY = directionY > 0 ? 0 : directionY < 0 ? height : height / 2;
  const endX = directionX > 0 ? width : directionX < 0 ? 0 : width / 2;
  const endY = directionY > 0 ? height : directionY < 0 ? 0 : height / 2;
  const gradient = context.createLinearGradient(startX, startY, endX, endY);
  const midpoint = clamp(
    0.42 + seededUnit(seed, 61) * 0.16 + Math.sin((frame / fps) * 0.9) * 0.035,
    0.25,
    0.75,
  );
  gradient.addColorStop(0, color);
  gradient.addColorStop(midpoint, 'transparent');
  gradient.addColorStop(1, secondaryColor);

  context.save();
  context.globalAlpha = clamp(0.12 + intensity * 0.14, 0, 0.42);
  context.globalCompositeOperation = 'screen';
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
};

const drawGrid = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  color: string,
  checkerboard: boolean,
): void => {
  const cellSize = Math.max(12, Math.round(42 - Math.min(2, intensity) * 8));

  context.save();
  context.globalAlpha = clamp(0.06 + intensity * 0.08, 0, 0.26);
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, intensity);

  if (checkerboard) {
    for (let y = 0, row = 0; y < height; y += cellSize, row++) {
      for (let x = 0, column = 0; x < width; x += cellSize, column++) {
        if ((row + column) % 2 === 0) context.fillRect(x, y, cellSize, cellSize);
      }
    }
  } else {
    context.beginPath();
    for (let x = 0; x <= width; x += cellSize) {
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
      context.moveTo(0, y);
      context.lineTo(width, y);
    }
    context.stroke();
  }

  context.restore();
};

const drawTint = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  color: string,
  secondaryColor?: string,
): void => {
  context.save();
  context.globalCompositeOperation = 'color';
  context.globalAlpha = clamp(0.08 + intensity * 0.1, 0, 0.32);

  if (secondaryColor) {
    const gradient = context.createLinearGradient(0, height, width, 0);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, secondaryColor);
    context.fillStyle = gradient;
  } else {
    context.fillStyle = color;
  }

  context.fillRect(0, 0, width, height);
  context.restore();
};

const drawBlendPass = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  operation: GlobalCompositeOperation,
): void => {
  context.save();
  context.globalCompositeOperation = operation;
  context.globalAlpha = clamp(0.12 + intensity * 0.2, 0, 0.58);
  context.drawImage(source, 0, 0, width, height);
  context.restore();
};

const drawSphericalProjection = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
): void => {
  const strips = Math.max(32, Math.min(128, Math.round(width / 16)));
  const sourceStripWidth = width / strips;
  const bend = clamp(intensity / 2, 0.12, 1);

  context.save();
  context.globalAlpha = clamp(0.62 + intensity * 0.18, 0, 1);

  for (let index = 0; index < strips; index++) {
    const normalizedX = ((index + 0.5) / strips) * 2 - 1;
    const sphereDepth = Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX));
    const destinationHeight = height * (1 - bend * 0.24 * (1 - sphereDepth));
    const destinationY = (height - destinationHeight) / 2;
    const sourceX = index * sourceStripWidth;
    context.drawImage(
      source,
      sourceX,
      0,
      Math.ceil(sourceStripWidth),
      height,
      sourceX,
      destinationY,
      Math.ceil(sourceStripWidth) + 1,
      destinationHeight,
    );
  }

  context.restore();
};

const drawClone = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  seed: string | number,
  color: string,
): void => {
  const radius = Math.min(width, height) * clamp(0.1 + intensity * 0.035, 0.08, 0.2);
  const sourceX = width * (0.2 + seededUnit(seed, 401) * 0.2);
  const sourceY = height * (0.3 + seededUnit(seed, 402) * 0.4);
  const targetX = width * (0.62 + seededUnit(seed, 403) * 0.18);
  const targetY = height * (0.3 + seededUnit(seed, 404) * 0.4);

  context.save();
  context.beginPath();
  context.arc(targetX, targetY, radius, 0, Math.PI * 2);
  context.clip();
  context.drawImage(
    source,
    sourceX - radius,
    sourceY - radius,
    radius * 2,
    radius * 2,
    targetX - radius,
    targetY - radius,
    radius * 2,
    radius * 2,
  );
  context.restore();

  context.save();
  context.globalAlpha = clamp(0.18 + intensity * 0.08, 0, 0.36);
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, Math.min(width, height) * 0.0025);
  context.beginPath();
  context.arc(targetX, targetY, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

const padTimecodePart = (value: number): string => Math.floor(value).toString().padStart(2, '0');

const frameTimecode = (frame: number, fps: number): string => {
  const nominalFps = Math.max(1, Math.round(fps));
  const safeFrame = Math.max(0, Math.floor(frame));
  const frames = safeFrame % nominalFps;
  const totalSeconds = Math.floor(safeFrame / nominalFps);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return `${padTimecodePart(hours)}:${padTimecodePart(minutes)}:${padTimecodePart(
    seconds,
  )}:${padTimecodePart(frames)}`;
};

const drawMetadataTimecode = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  frame: number,
  fps: number,
  durationInFrames: number,
  color: string,
): void => {
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * (0.025 + intensity * 0.004)));
  const paddingX = Math.round(fontSize * 0.6);
  const paddingY = Math.round(fontSize * 0.42);
  const label = `TC  ${frameTimecode(frame, fps)}  ·  ${frame + 1}/${durationInFrames}f`;

  context.save();
  context.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  context.textBaseline = 'middle';
  const metrics = context.measureText(label);
  const boxWidth = Math.ceil(metrics.width + paddingX * 2);
  const boxHeight = Math.ceil(fontSize + paddingY * 2);
  const x = Math.max(8, Math.round((width - boxWidth) / 2));
  const y = Math.max(8, height - boxHeight - Math.round(height * 0.045));
  context.globalAlpha = clamp(0.72 + intensity * 0.12, 0, 0.96);
  context.fillStyle = 'rgba(0, 0, 0, 0.82)';
  context.fillRect(x, y, boxWidth, boxHeight);
  context.globalAlpha = 1;
  context.fillStyle = color;
  context.fillText(label, x + paddingX, y + boxHeight / 2);
  context.restore();
};

const drawStroke = (
  state: PresetCanvasEffectState,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  color: string,
): void => {
  const tinted = tintCanvasSource(state, source, width, height, color);
  const radius = Math.max(1, Math.round(1 + intensity * 3));

  state.context.save();
  state.context.globalAlpha = clamp(0.5 + intensity * 0.2, 0, 0.92);
  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2;
    state.context.drawImage(
      tinted,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      width,
      height,
    );
  }
  state.context.restore();
  state.context.drawImage(source, 0, 0, width, height);
};

const drawShadow = (
  state: PresetCanvasEffectState,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  direction: PresetDirection,
  color: string,
  long: boolean,
): void => {
  const shadow = tintCanvasSource(state, source, width, height, color);
  const [directionX, directionY] = directionVector(direction);
  const passes = long ? Math.max(8, Math.round(10 + intensity * 10)) : 1;
  const distance = long ? Math.min(width, height) * 0.04 * intensity : 4 + intensity * 8;

  state.context.save();
  state.context.globalAlpha = long ? clamp(0.035 + intensity * 0.025, 0, 0.1) : 0.38;
  state.context.filter = long ? 'none' : `blur(${formatNumber(2 + intensity * 3)}px)`;
  for (let index = 1; index <= passes; index++) {
    const progress = index / passes;
    state.context.drawImage(
      shadow,
      directionX * distance * progress,
      directionY * distance * progress,
      width,
      height,
    );
  }
  state.context.restore();
  state.context.drawImage(source, 0, 0, width, height);
};

const wipeGradientCoordinates = (
  width: number,
  height: number,
  direction: PresetDirection,
): readonly [number, number, number, number] => {
  switch (direction) {
    case 'right':
      return [width, 0, 0, 0];
    case 'top':
      return [0, 0, 0, height];
    case 'bottom':
      return [0, height, 0, 0];
    case 'left':
    default:
      return [0, 0, width, 0];
  }
};

const drawWipeMask = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  direction: PresetDirection,
  frame: number,
  durationInFrames: number,
): void => {
  const [x0, y0, x1, y1] = wipeGradientCoordinates(width, height, direction);
  const progress = clamp(frame / Math.max(1, durationInFrames - 1));

  if (progress <= 0) return;

  if (progress >= 1) {
    context.clearRect(0, 0, width, height);
    return;
  }

  const gradient = context.createLinearGradient(x0, y0, x1, y1);
  const edge = 1 - smoothstep(progress);
  const feather = clamp(0.025 + intensity * 0.025, 0.02, 0.1);
  gradient.addColorStop(0, '#000000');
  gradient.addColorStop(Math.max(0, edge - feather), '#000000');
  gradient.addColorStop(Math.min(1, edge + feather), 'transparent');
  gradient.addColorStop(1, 'transparent');

  context.save();
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
};

const drawBlockDissolveMask = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  seed: string | number,
  frame: number,
  durationInFrames: number,
): void => {
  const progress = smoothstep(clamp(frame / Math.max(1, durationInFrames - 1)));
  if (progress <= 0) return;

  const blockSize = Math.max(4, Math.round(18 - Math.min(2, intensity) * 5));
  const columns = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);

  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.globalAlpha = 1;
  context.fillStyle = '#000000';

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const blockIndex = row * columns + column;
      if (seededUnit(seed, blockIndex + 801) <= progress) {
        context.fillRect(column * blockSize, row * blockSize, blockSize, blockSize);
      }
    }
  }

  context.restore();
};

const roundedRectanglePath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const drawCropMask = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  rounded: boolean,
): void => {
  const inset = rounded ? 0 : Math.round(Math.min(width, height) * (0.02 + intensity * 0.025));
  const cropWidth = Math.max(1, width - inset * 2);
  const cropHeight = Math.max(1, height - inset * 2);
  const radius = rounded
    ? Math.min(width, height) * clamp(0.04 + intensity * 0.035, 0.03, 0.13)
    : 0;

  context.save();
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = '#000000';
  roundedRectanglePath(context, inset, inset, cropWidth, cropHeight, radius);
  context.fill();
  context.restore();
};

const parseCssColor = (
  context: CanvasRenderingContext2D,
  color: string,
): readonly [number, number, number] => {
  context.save();
  resetContext(context);
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#00ff00';
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  context.restore();
  return [pixel[0], pixel[1], pixel[2]];
};

const drawKeyedSource = (
  state: PresetCanvasEffectState,
  source: CanvasImageSource,
  width: number,
  height: number,
  params: PresetCanvasEffectParams,
): boolean => {
  const variant = normalizeVariant(params.variant);
  resizeCanvas(state.workCanvas, width, height);
  const workContext = get2DContext(state.workCanvas, 'the keying buffer', true);
  resetContext(workContext);
  workContext.clearRect(0, 0, width, height);
  workContext.drawImage(source, 0, 0, width, height);

  let imageData: ImageData;
  try {
    imageData = workContext.getImageData(0, 0, width, height);
  } catch {
    // Cross-origin media can make a canvas unreadable in a browser preview.
    // The Remotion renderer uses readable decoded sources, but retain a visible
    // deterministic fallback instead of dropping the frame in other hosts.
    drawTint(state.context, width, height, params.intensity, params.color ?? '#00ff00');
    // Assign even when the dimensions already match: setting either dimension
    // resets the canvas bitmap and origin-clean flag, so a tainted source cannot
    // poison this reusable buffer when a later frame uses a readable source.
    state.workCanvas.width = width;
    state.workCanvas.height = height;
    return true;
  }

  const data = imageData.data;
  const strength = clamp(params.intensity / 2);

  if (variant.includes('alpha-adjust')) {
    const multiplier = 1 - strength * 0.62;
    for (let index = 3; index < data.length; index += 4) {
      data[index] = Math.round(data[index] * multiplier);
    }
  } else if (variant.includes('track-matte')) {
    for (let index = 0; index < data.length; index += 4) {
      const luma =
        (data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722) / 255;
      const matte = 1 - strength + strength * luma;
      data[index + 3] = Math.round(data[index + 3] * matte);
    }
  } else if (variant.includes('luma-key')) {
    const threshold = 22 + strength * 105;
    const feather = 42;
    for (let index = 0; index < data.length; index += 4) {
      const luma = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
      const retained = smoothstep((luma - threshold) / feather);
      data[index + 3] = Math.round(data[index + 3] * retained);
    }
  } else if (variant.includes('edge-feather')) {
    const feather = Math.max(1, Math.min(width, height) * (0.025 + strength * 0.09));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4 + 3;
        const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y);
        data[pixelIndex] = Math.round(data[pixelIndex] * smoothstep(edgeDistance / feather));
      }
    }
  } else {
    const defaultKeyColor = variant.includes('logo-cutout') ? '#ffffff' : '#00ff00';
    const [keyRed, keyGreen, keyBlue] = parseCssColor(workContext, params.color ?? defaultKeyColor);
    const threshold = 18 + strength * 112;
    const feather = 36 + strength * 30;
    const thresholdSquared = threshold * threshold;
    const featherEndSquared = (threshold + feather) * (threshold + feather);

    for (let index = 0; index < data.length; index += 4) {
      const redDistance = data[index] - keyRed;
      const greenDistance = data[index + 1] - keyGreen;
      const blueDistance = data[index + 2] - keyBlue;
      const distanceSquared =
        redDistance * redDistance + greenDistance * greenDistance + blueDistance * blueDistance;
      let retained = 1;
      if (distanceSquared <= thresholdSquared) retained = 0;
      else if (distanceSquared < featherEndSquared) {
        retained = smoothstep((Math.sqrt(distanceSquared) - threshold) / feather);
      }
      data[index + 3] = Math.round(data[index + 3] * retained);
    }
  }

  workContext.putImageData(imageData, 0, 0);
  state.context.save();
  resetContext(state.context);
  state.context.clearRect(0, 0, width, height);
  state.context.drawImage(state.workCanvas, 0, 0, width, height);
  state.context.restore();
  return true;
};

const drawAutoAlign = (
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  intensity: number,
  color: string,
): void => {
  const inset = Math.min(width, height) * 0.012 * intensity;
  context.save();
  context.globalAlpha = clamp(0.32 + intensity * 0.12, 0, 0.58);
  context.drawImage(source, inset, inset, width - inset * 2, height - inset * 2);
  context.globalAlpha = clamp(0.12 + intensity * 0.06, 0, 0.24);
  context.strokeStyle = color;
  context.setLineDash([Math.max(4, width * 0.006), Math.max(3, width * 0.004)]);
  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();
  context.restore();
};

const applyVariantDetails = (
  state: PresetCanvasEffectState,
  source: CanvasImageSource,
  width: number,
  height: number,
  params: PresetCanvasEffectParams,
): boolean => {
  const variant = normalizeVariant(params.variant);
  const color = params.color ?? '#ffb347';
  const secondaryColor = params.secondaryColor ?? '#5236ff';
  let didDraw = false;

  if (params.intensity === 0) return false;

  if (params.engine === 'keying') {
    didDraw = drawKeyedSource(state, source, width, height, params);
  }

  if (variant.includes('rounded-crop')) {
    drawCropMask(state.context, width, height, params.intensity, true);
    didDraw = true;
  } else if (variant === 'legacy-crop') {
    drawCropMask(state.context, width, height, params.intensity, false);
    didDraw = true;
  }

  if (variant.includes('wipe')) {
    drawWipeMask(
      state.context,
      width,
      height,
      params.intensity,
      params.direction,
      params.frame,
      params.durationInFrames,
    );
    didDraw = true;
  }

  if (variant === 'clone') {
    drawClone(
      state.context,
      source,
      width,
      height,
      params.intensity,
      params.seed,
      params.color ?? '#ffffff',
    );
    didDraw = true;
  }

  if (variant.includes('metadata-timecode')) {
    drawMetadataTimecode(
      state.context,
      width,
      height,
      params.intensity,
      params.frame,
      params.fps,
      params.durationInFrames,
      params.color ?? '#ffffff',
    );
    didDraw = true;
  }

  if (variant === 'echo-glow') {
    drawTemporalGlowEcho(
      state.context,
      source,
      width,
      height,
      params.intensity,
      params.seed,
      params.frame,
      params.fps,
    );
    didDraw = true;
  }

  if (variant === 'strobe-light') {
    drawStrobe(state.context, width, height, params.intensity, params.frame, color);
    didDraw = true;
  }

  if (variant === 'posterize-time') {
    drawPosterizeTimeApproximation(
      state.context,
      source,
      width,
      height,
      params.intensity,
      params.frame,
    );
    didDraw = true;
  }

  if (variant === 'stroke') {
    drawStroke(state, source, width, height, params.intensity, params.color ?? '#ffffff');
    didDraw = true;
  }

  if (variant === 'auto-align') {
    drawAutoAlign(
      state.context,
      source,
      width,
      height,
      params.intensity,
      params.color ?? '#22d3ee',
    );
    didDraw = true;
  }

  if (containsAny(variant, ['drop-shadow', 'long-shadow'])) {
    drawShadow(
      state,
      source,
      width,
      height,
      params.intensity,
      params.direction,
      params.color ?? '#000000',
      variant.includes('long-shadow'),
    );
    didDraw = true;
  }

  if (variant === 'legacy-block-dissolve') {
    drawBlockDissolveMask(
      state.context,
      width,
      height,
      params.intensity,
      params.seed,
      params.frame,
      params.durationInFrames,
    );
    didDraw = true;
  } else if (containsAny(variant, ['mosaic', 'pixelate'])) {
    drawPixelated(state, source, width, height, params.intensity);
    didDraw = true;
  } else if (containsAny(variant, ['replicate', 'tile']) || variant === 'spacer') {
    drawTiled(state.context, source, width, height, params.intensity);
    didDraw = true;
  } else if (variant.includes('horizontal-flip')) {
    drawFlipped(state.context, source, width, height, false);
    didDraw = true;
  } else if (variant.includes('vertical-flip')) {
    drawFlipped(state.context, source, width, height, true);
    didDraw = true;
  } else if (variant.includes('mirror')) {
    drawMirror(state.context, source, width, height, params.direction);
    didDraw = true;
  } else if (containsAny(variant, ['wave', 'ripple', 'turbulent', 'displace'])) {
    drawWave(
      state.context,
      source,
      width,
      height,
      params.intensity,
      params.seed,
      params.frame,
      params.fps,
    );
    didDraw = true;
  } else if (
    containsAny(variant, ['magnify', 'lens-distortion', 'fisheye', 'spherize']) ||
    containsAny(variant, ['plane-to-sphere', 'vr-projection', 'rotate-sphere'])
  ) {
    if (containsAny(variant, ['plane-to-sphere', 'vr-projection', 'rotate-sphere'])) {
      drawSphericalProjection(state.context, source, width, height, params.intensity);
    } else {
      drawMagnified(state.context, source, width, height, params.intensity, params.seed);
    }
    didDraw = true;
  } else if (
    variant !== 'legacy-crop' &&
    variant !== 'posterize-time' &&
    !containsAny(variant, ['drop-shadow', 'long-shadow']) &&
    (params.engine === 'distort' ||
      params.engine === 'perspective' ||
      params.engine === 'transform' ||
      params.engine === 'time')
  ) {
    drawTransformEcho(
      state.context,
      source,
      width,
      height,
      params.intensity,
      params.direction,
      variant,
      params.seed,
      params.frame,
      params.fps,
      params.durationInFrames,
      params.engine === 'transform' || variant.includes('warp-stabilizer'),
    );
    didDraw = true;
  }

  if (containsAny(variant, ['chromatic', 'rgb-split', 'glitch'])) {
    drawChromaticSplit(
      state,
      source,
      width,
      height,
      params.intensity,
      params.direction,
      params.seed,
      params.frame,
    );
    didDraw = true;
  }

  if (
    params.engine === 'generate' ||
    (!variant.includes('wipe') &&
      (containsAny(variant, ['ramp', 'gradient', 'light-leak', 'film-burn', 'golden']) ||
        hasVariantToken(variant, 'neon')))
  ) {
    drawGradientOverlay(
      state.context,
      width,
      height,
      params.intensity,
      color,
      secondaryColor,
      params.direction,
      params.seed,
      params.frame,
      params.fps,
    );
    didDraw = true;
  }

  if (containsAny(variant, ['checkerboard', 'checker-board', 'grid', 'gridlines'])) {
    drawGrid(
      state.context,
      width,
      height,
      params.intensity,
      params.color ?? '#ffffff',
      containsAny(variant, ['checker']),
    );
    didDraw = true;
  }

  if (
    (params.engine === 'color' && params.color !== undefined) ||
    containsAny(variant, ['tint', 'duotone', 'teal-orange', 'color-balance'])
  ) {
    drawTint(
      state.context,
      width,
      height,
      params.intensity,
      params.color ?? '#2dd4bf',
      params.secondaryColor,
    );
    didDraw = true;
  }

  if (
    !variant.includes('de-noise') &&
    (params.engine === 'noise' ||
      containsAny(variant, ['noise', 'grain', 'speckle', 'vhs', 'old-film', 'vintage-film']))
  ) {
    drawNoise(state.context, width, height, params.intensity, params.seed, params.frame);
    didDraw = true;
  }

  if (containsAny(variant, ['scanline', 'vhs', 'tv-', 'tv-signal', 'crt'])) {
    drawScanlines(
      state.context,
      width,
      height,
      params.intensity,
      params.color ?? '#000000',
      params.seed,
      params.frame,
    );
    didDraw = true;
  }

  if (containsAny(variant, ['vignette', 'noir', 'cinema', 'old-film', 'vintage-film'])) {
    drawVignette(state.context, width, height, params.intensity, params.color ?? '#000000');
    didDraw = true;
  }

  const blendMode = blendModeForVariant(variant);
  if (blendMode) {
    drawBlendPass(state.context, source, width, height, params.intensity, blendMode);
    didDraw = true;
  }

  return didDraw;
};

const validateParams = (params: PresetCanvasEffectParams): void => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new TypeError('createPresetEffect() params must be an object.');
  }

  if (typeof params.presetId !== 'string' || params.presetId.trim().length === 0) {
    throw new TypeError('createPresetEffect() requires a non-empty presetId.');
  }

  if (!presetEngines.has(params.engine)) {
    throw new TypeError(`Invalid preset engine: ${String(params.engine)}.`);
  }

  if (typeof params.variant !== 'string' || params.variant.trim().length === 0) {
    throw new TypeError('createPresetEffect() requires a non-empty preset variant.');
  }

  if (!Number.isFinite(params.intensity) || params.intensity < 0 || params.intensity > 2) {
    throw new RangeError('createPresetEffect() intensity must be a finite number from 0 to 2.');
  }

  if (
    (typeof params.seed !== 'string' && typeof params.seed !== 'number') ||
    (typeof params.seed === 'number' && !Number.isFinite(params.seed))
  ) {
    throw new TypeError('createPresetEffect() seed must be a string or a finite number.');
  }

  if (!Number.isInteger(params.durationInFrames) || params.durationInFrames < 1) {
    throw new RangeError('createPresetEffect() durationInFrames must be a positive integer.');
  }

  if (!Number.isInteger(params.frame)) {
    throw new RangeError('createPresetEffect() frame must be a finite integer.');
  }

  if (!Number.isFinite(params.fps) || params.fps <= 0) {
    throw new RangeError('createPresetEffect() fps must be a positive finite number.');
  }

  if (params.color !== undefined) {
    assertSafeCssColor(params.color, 'createPresetEffect() color');
  }

  if (params.secondaryColor !== undefined) {
    assertSafeCssColor(params.secondaryColor, 'createPresetEffect() secondaryColor');
  }

  if (!directions.has(params.direction)) {
    throw new TypeError(`Invalid preset direction: ${String(params.direction)}.`);
  }
};

const presetCanvasEffect = createEffect<PresetCanvasEffectParams, PresetCanvasEffectState>({
  type: 'io.github.lilmzki.remotion-presets.preset',
  label: 'createPresetEffect()',
  documentationLink: 'https://github.com/LilMzki/remotion-presets#effects',
  backend: '2d',
  calculateKey: (params) =>
    JSON.stringify([
      params.presetId,
      params.engine,
      params.variant,
      params.intensity,
      params.seed,
      params.durationInFrames,
      params.color ?? null,
      params.secondaryColor ?? null,
      params.direction,
      params.frame,
      params.fps,
    ]),
  setup: (target) => ({
    context: get2DContext(target, 'createPresetEffect()'),
    workCanvas: target.ownerDocument.createElement('canvas'),
    sourceCanvas: target.ownerDocument.createElement('canvas'),
  }),
  apply: ({ source, target, state, params, width, height }) => {
    const renderWidth = Math.max(1, Math.round(width));
    const renderHeight = Math.max(1, Math.round(height));
    let preservedSource: CanvasImageSource = source;

    if (source === target) {
      resizeCanvas(state.sourceCanvas, renderWidth, renderHeight);
      const sourceContext = get2DContext(state.sourceCanvas, 'the source-preservation buffer');
      resetContext(sourceContext);
      sourceContext.clearRect(0, 0, renderWidth, renderHeight);
      sourceContext.drawImage(source, 0, 0, renderWidth, renderHeight);
      preservedSource = state.sourceCanvas;
    }

    state.context.save();

    try {
      resetContext(state.context);
      state.context.clearRect(0, 0, renderWidth, renderHeight);

      // Every preset starts with an unmodified source pass. This guarantees a
      // useful frame even when a high-level approximation has no special branch.
      state.context.drawImage(preservedSource, 0, 0, renderWidth, renderHeight);

      const filter = resolveFilter(params.engine, params.variant, params.intensity);
      const normalizedVariant = normalizeVariant(params.variant);
      drawFilteredSource(
        state.context,
        preservedSource,
        renderWidth,
        renderHeight,
        filter,
        params.engine === 'glow' ||
          normalizedVariant.includes('glow') ||
          normalizedVariant.includes('glint') ||
          hasVariantToken(normalizedVariant, 'neon'),
        params.intensity,
      );
      const drewVariant = applyVariantDetails(
        state,
        preservedSource,
        renderWidth,
        renderHeight,
        params,
      );

      if (params.intensity > 0 && filter === 'none' && !drewVariant) {
        drawTransformEcho(
          state.context,
          preservedSource,
          renderWidth,
          renderHeight,
          params.intensity,
          params.direction,
          params.variant,
          params.seed,
          params.frame,
          params.fps,
          params.durationInFrames,
          false,
        );
      }
    } finally {
      state.context.restore();
    }
  },
  cleanup: (state) => {
    resetContext(state.context);
    state.workCanvas.width = 0;
    state.workCanvas.height = 0;
    state.sourceCanvas.width = 0;
    state.sourceCanvas.height = 0;
  },
  schema: {
    presetId: { type: 'hidden' },
    engine: { type: 'hidden' },
    variant: { type: 'hidden' },
    intensity: {
      type: 'number',
      min: 0,
      max: 2,
      step: 0.05,
      default: 1,
      description: 'Intensity',
      hiddenFromList: false,
    },
    seed: { type: 'hidden' },
    durationInFrames: {
      type: 'number',
      min: 1,
      step: 1,
      default: 30,
      description: 'Duration in frames',
      hiddenFromList: true,
    },
    color: {
      type: 'color',
      default: undefined,
      description: 'Primary color',
    },
    secondaryColor: {
      type: 'color',
      default: undefined,
      description: 'Secondary color',
    },
    direction: {
      type: 'enum',
      default: 'left',
      description: 'Direction',
      variants: {
        left: {},
        right: {},
        top: {},
        bottom: {},
      },
    },
    frame: { type: 'hidden' },
    fps: { type: 'hidden' },
  },
  validateParams,
});

const cssBlendModeForVariant = (variant: string): CSSProperties['mixBlendMode'] | undefined => {
  const operation = blendModeForVariant(variant);
  if (!operation) return undefined;

  switch (operation) {
    case 'lighter':
      return 'plus-lighter';
    case 'screen':
    case 'multiply':
    case 'difference':
    case 'exclusion':
    case 'hard-light':
    case 'soft-light':
    case 'overlay':
      return operation;
    default:
      return undefined;
  }
};

const fallbackForDefinition = (
  definition: PresetDefinition,
  params: PresetCanvasEffectParams,
): CSSProperties => {
  const variant = normalizeVariant(definition.variant);
  const filter = resolveFilter(definition.engine, variant, params.intensity);
  const blendMode = cssBlendModeForVariant(variant);
  const fallback: CSSProperties = {
    isolation: 'isolate',
    willChange: 'filter, transform',
    ...(filter === 'none' ? {} : { filter }),
    ...(blendMode && params.intensity > 0 ? { mixBlendMode: blendMode } : {}),
  };

  if (params.intensity === 0) return fallback;

  if (
    definition.engine === 'glow' ||
    containsAny(variant, ['glow', 'golden']) ||
    hasVariantToken(variant, 'neon')
  ) {
    const glowColor = params.color ?? '#ffd166';
    const radius = Math.round(6 + params.intensity * 12);
    fallback.textShadow = `0 0 ${radius}px ${glowColor}`;
    fallback.boxShadow = `0 0 ${radius}px ${glowColor}`;
  }

  if (containsAny(variant, ['vignette', 'noir', 'cinema', 'old-film', 'vintage-film'])) {
    const radius = Math.round(50 + params.intensity * 45);
    fallback.boxShadow = `inset 0 0 ${radius}px ${Math.round(radius * 0.35)}px ${
      params.color ?? 'rgba(0, 0, 0, 0.72)'
    }`;
  }

  if (
    definition.engine === 'noise' ||
    containsAny(variant, ['scanline', 'vhs', 'tv-', 'tv-signal', 'crt'])
  ) {
    const lineColor = params.color ?? 'rgba(0, 0, 0, 0.16)';
    const spacing = Math.max(3, Math.round(7 - params.intensity * 1.5));
    fallback.backgroundImage = `repeating-linear-gradient(0deg, transparent 0, transparent ${
      spacing - 1
    }px, ${lineColor} ${spacing}px)`;
  } else if (
    definition.engine === 'generate' ||
    containsAny(variant, ['gradient', 'ramp', 'light-leak', 'film-burn'])
  ) {
    fallback.backgroundImage = `linear-gradient(135deg, ${
      params.color ?? 'rgba(255, 179, 71, 0.26)'
    }, transparent 48%, ${params.secondaryColor ?? 'rgba(82, 54, 255, 0.22)'})`;
  }

  if (
    definition.engine === 'distort' ||
    definition.engine === 'perspective' ||
    definition.engine === 'transform'
  ) {
    const [x, y] = directionVector(params.direction);
    const distance = Math.round(params.intensity * 3);
    fallback.transform = `translate(${x * distance}px, ${y * distance}px) scale(${formatNumber(
      1 + params.intensity * 0.006,
    )})`;
    fallback.transformOrigin = 'center';
  }

  return fallback;
};

type PresetEffectRuntime = {
  readonly frame: number;
  readonly fps: number;
};

const createPresetEffectAtFrame = (
  presetId: string,
  options: PresetOptions,
  runtime: PresetEffectRuntime,
): PresetEffect => {
  const color =
    options.color === undefined
      ? undefined
      : assertSafeCssColor(options.color, 'createPresetEffect() color');
  const secondaryColor =
    options.secondaryColor === undefined
      ? undefined
      : assertSafeCssColor(options.secondaryColor, 'createPresetEffect() secondaryColor');
  const definition = getPresetDefinition(presetId);

  if (definition.api !== 'effects') {
    throw new RangeError(
      `Preset "${definition.id}" uses the ${definition.api} API and cannot be used as an effect.`,
    );
  }

  const params: PresetCanvasEffectParams = {
    presetId: definition.id,
    engine: definition.engine,
    variant: definition.variant,
    intensity: options.intensity ?? 1,
    seed: options.seed ?? definition.id,
    durationInFrames: options.durationInFrames ?? definition.defaultDurationInFrames,
    color,
    secondaryColor,
    direction: options.direction ?? 'left',
    frame: runtime.frame,
    fps: runtime.fps,
  };

  const descriptor = presetCanvasEffect(params);

  return {
    presetId: definition.id,
    effects: [descriptor],
    fallbackStyle: fallbackForDefinition(definition, params),
  };
};

/**
 * Creates a static effect descriptor. Time-aware presets use frame 0; use
 * `usePresetEffect()` inside a Remotion component for animated variants.
 */
export const createPresetEffect = <const TId extends string>(
  presetId: CategoryCheckedPresetId<TId, EffectPresetId>,
  options: PresetOptions = {},
): PresetEffect => createPresetEffectAtFrame(presetId, options, { frame: 0, fps: 30 });

/** Creates a frame-aware descriptor using the surrounding Remotion composition. */
export const usePresetEffect = <const TId extends string>(
  presetId: CategoryCheckedPresetId<TId, EffectPresetId>,
  options: PresetOptions = {},
): PresetEffect => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return createPresetEffectAtFrame(presetId, options, { frame, fps });
};
