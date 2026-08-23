import type { CSSProperties } from 'react';

import type { PresetDefinition } from '../types';
import { resolveSafeCssColor } from './color';
import {
  clamp,
  easeInOut,
  easeOut,
  hashString,
  progressForFrame,
  pulse,
  seededSigned,
  smoothstep,
  stableHue,
} from './math';

export interface StyleEngineOptions {
  readonly frame: number;
  readonly fps: number;
  readonly durationInFrames: number;
  readonly intensity: number;
  readonly seed: string | number;
  readonly color?: string;
  readonly secondaryColor?: string;
  readonly direction?: 'left' | 'right' | 'top' | 'bottom';
}

export interface ResolvedPresetStyles {
  readonly root: CSSProperties;
  readonly content: CSSProperties;
  readonly overlay: CSSProperties;
  readonly overlaySecondary: CSSProperties;
}

type StylePatch = {
  readonly root?: CSSProperties;
  readonly content?: CSSProperties;
  readonly overlay?: CSSProperties;
  readonly overlaySecondary?: CSSProperties;
};

type Direction = NonNullable<StyleEngineOptions['direction']>;

interface StyleContext {
  readonly preset: PresetDefinition;
  readonly descriptor: string;
  readonly progress: number;
  readonly eased: number;
  readonly time: number;
  readonly frameIndex: number;
  readonly intensity: number;
  readonly seedKey: string;
  readonly hash: number;
  readonly hue: number;
  readonly hueSecondary: number;
  readonly color: string;
  readonly secondaryColor: string;
  readonly hasCustomColor: boolean;
  readonly hasCustomSecondaryColor: boolean;
  readonly direction: Direction;
  readonly x: number;
  readonly y: number;
  readonly jitterX: number;
  readonly jitterY: number;
}

const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

const round = (value: number, precision = 4): number => {
  const safeValue = clamp(finite(value, 0), -1_000_000_000, 1_000_000_000);
  const factor = 10 ** precision;
  return Math.round(safeValue * factor) / factor;
};

const cssNumber = (value: number): string => String(round(value));
const px = (value: number): string => `${cssNumber(value)}px`;
const deg = (value: number): string => `${cssNumber(value)}deg`;
const percent = (value: number): string => `${cssNumber(value)}%`;

const contains = (context: StyleContext, ...needles: readonly string[]): boolean =>
  needles.some((needle) => context.descriptor.includes(needle));

const directionVector = (direction: Direction): readonly [number, number] => {
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

const baseStyles = (): ResolvedPresetStyles => ({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    isolation: 'isolate',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    height: '100%',
    transformOrigin: '50% 50%',
    willChange: 'transform, filter, opacity',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    pointerEvents: 'none',
    opacity: 0,
  },
  overlaySecondary: {
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    pointerEvents: 'none',
    opacity: 0,
  },
});

const mergeStyles = (base: ResolvedPresetStyles, patch: StylePatch): ResolvedPresetStyles => ({
  root: { ...base.root, ...patch.root },
  content: { ...base.content, ...patch.content },
  overlay: { ...base.overlay, ...patch.overlay },
  overlaySecondary: { ...base.overlaySecondary, ...patch.overlaySecondary },
});

const createContext = (preset: PresetDefinition, options: StyleEngineOptions): StyleContext => {
  const frame = clamp(finite(options.frame, 0), -1_000_000_000, 1_000_000_000);
  const fps = clamp(finite(options.fps, 30), 0.001, 1_000);
  const duration = Math.round(clamp(finite(options.durationInFrames, 30), 1, 1_000_000_000));
  const intensity = clamp(finite(options.intensity, 1), 0, 2);
  const frameIndex = Math.round(frame);
  const seed =
    typeof options.seed === 'number' && !Number.isFinite(options.seed)
      ? 'remotion-presets'
      : String(options.seed ?? 'remotion-presets');
  const seedKey = `${preset.engine}:${preset.variant}:${preset.id}:${seed}`;
  const hash = hashString(seedKey);
  const hue = stableHue(seedKey);
  const hueSecondary = stableHue(seedKey, 1 + (hash % 5));
  const color = resolveSafeCssColor(options.color, `hsl(${hue} 88% 58%)`, 'PresetLayer color');
  const secondaryColor = resolveSafeCssColor(
    options.secondaryColor,
    `hsl(${hueSecondary} 86% 54%)`,
    'PresetLayer secondaryColor',
  );
  const hasCustomColor = options.color !== undefined;
  const hasCustomSecondaryColor = options.secondaryColor !== undefined;
  const direction = options.direction ?? 'left';
  const [x, y] = directionVector(direction);

  return {
    preset,
    descriptor: `${preset.engine} ${preset.variant} ${preset.id}`.toLowerCase(),
    progress: progressForFrame(frame, duration),
    eased: easeInOut(progressForFrame(frame, duration)),
    time: frame / fps,
    frameIndex,
    intensity,
    seedKey,
    hash,
    hue,
    hueSecondary,
    color,
    secondaryColor,
    hasCustomColor,
    hasCustomSecondaryColor,
    direction,
    x,
    y,
    jitterX: seededSigned(seedKey, frameIndex * 2 + 1),
    jitterY: seededSigned(seedKey, frameIndex * 2 + 2),
  };
};

const resolveAdjust = (context: StyleContext): StylePatch => {
  const { intensity, hash } = context;
  const polarity = hash % 2 === 0 ? 1 : -1;
  const brightness = contains(context, 'shadow', 'lift', 'lighting')
    ? 1 + intensity * 0.16
    : contains(context, 'dark', 'black')
      ? 1 - intensity * 0.12
      : 1 + polarity * intensity * 0.06;
  const contrast = contains(context, 'level', 'contrast', 'procamp')
    ? 1 + intensity * 0.28
    : 1 + intensity * 0.1;
  const saturation = contains(context, 'extract', 'monochrome')
    ? Math.max(0, 1 - intensity)
    : 1 + intensity * 0.08;

  return {
    content: {
      filter: `brightness(${cssNumber(brightness)}) contrast(${cssNumber(contrast)}) saturate(${cssNumber(saturation)})`,
    },
    overlay: {
      opacity: round(0.04 * intensity),
      background: `linear-gradient(${deg(90 + (hash % 180))}, transparent, ${context.color})`,
      mixBlendMode: brightness >= 1 ? 'soft-light' : 'multiply',
    },
  };
};

const resolveBlur = (context: StyleContext): StylePatch => {
  const sharpen = contains(context, 'sharpen', 'unsharp');
  const amount = 0.4 + context.intensity * (contains(context, 'gaussian') ? 8 : 5);
  const directional = contains(context, 'direction', 'camera', 'channel');
  const movement = directional
    ? Math.sin(context.time * 4 + context.hash) * context.intensity * 3
    : 0;

  return {
    content: {
      filter: sharpen
        ? `contrast(${cssNumber(1 + context.intensity * 0.24)}) saturate(${cssNumber(1 + context.intensity * 0.08)}) drop-shadow(0 0 ${px(0.45 + context.intensity * 0.35)} rgba(0,0,0,.48))`
        : `blur(${px(amount)})`,
      transform: sharpen
        ? undefined
        : `translate(${px(context.x * movement)}, ${px(context.y * movement)}) scale(${cssNumber(1 + amount / 350)})`,
    },
    overlay: {
      opacity: round(sharpen ? 0 : 0.06 * context.intensity),
      background: `radial-gradient(circle at ${percent(35 + (context.hash % 30))} ${percent(35 + ((context.hash >>> 5) % 30))}, ${context.color}, transparent 58%)`,
      mixBlendMode: 'screen',
      filter: `blur(${px(amount * 1.8)})`,
    },
  };
};

const resolveColor = (context: StyleContext): StylePatch => {
  const monochrome = contains(context, 'black', 'white', 'mono', 'tint');
  const invert = contains(context, 'invert');
  const vignette = contains(context, 'vignette');
  const roundedCrop = contains(context, 'rounded-crop');
  const hueShift = ((context.hash % 91) - 45) * context.intensity;
  const saturation = monochrome ? Math.max(0, 1 - context.intensity) : 1 + context.intensity * 0.42;
  const overlayOpacity = 0.08 + context.intensity * 0.12;

  return {
    content: {
      filter: `${invert ? `invert(${cssNumber(clamp(context.intensity))}) ` : ''}${monochrome ? `grayscale(${cssNumber(clamp(context.intensity))}) ` : ''}hue-rotate(${deg(hueShift)}) saturate(${cssNumber(saturation)}) contrast(${cssNumber(1 + context.intensity * 0.08)})`,
      clipPath: roundedCrop
        ? `inset(${percent(context.intensity)} round ${px(12 + context.intensity * 18)})`
        : undefined,
    },
    overlay: {
      opacity: round(vignette ? 0.38 * context.intensity : overlayOpacity),
      background: vignette
        ? 'radial-gradient(ellipse at center, transparent 34%, rgba(0,0,0,.92) 135%)'
        : `linear-gradient(${deg(context.hash % 360)}, ${context.color}, transparent 48%, ${context.secondaryColor})`,
      mixBlendMode: vignette ? 'multiply' : monochrome ? 'color' : 'soft-light',
    },
  };
};

const resolveDistort = (context: StyleContext): StylePatch => {
  const wave =
    Math.sin(context.time * (2.5 + (context.hash % 4)) + context.hash) * context.intensity;
  const skew = contains(context, 'wave', 'ripple', 'twirl') ? wave * 2.2 : wave * 0.7;
  const lens = contains(context, 'lens', 'spher', 'bulge', 'magnify');
  const mirror = contains(context, 'mirror');
  const twirl = contains(context, 'twirl');
  const mirrorScale = 1 - 2 * clamp(context.intensity);

  return {
    root: {
      perspective: px(700 + (context.hash % 500)),
    },
    content: {
      borderRadius: lens ? percent(2 + context.intensity * 6) : undefined,
      filter: `contrast(${cssNumber(1 + context.intensity * 0.07)}) saturate(${cssNumber(1 + context.intensity * 0.06)})`,
      transform: `${mirror ? `scaleX(${cssNumber(mirrorScale)}) ` : ''}scale(${cssNumber(1 + (lens ? context.intensity * 0.035 : 0.008))}) rotate(${deg(twirl ? wave * 3.5 : 0)}) skew(${deg(skew)}, ${deg(-skew * 0.45)}) translate(${px(context.jitterX * context.intensity)}, ${px(context.jitterY * context.intensity)})`,
    },
    overlay: {
      opacity: round(lens ? 0.12 * context.intensity : 0.055 * context.intensity),
      background: `radial-gradient(circle at ${percent(50 + context.jitterX * 8)} ${percent(50 + context.jitterY * 8)}, transparent 30%, ${context.color} 145%)`,
      mixBlendMode: 'soft-light',
    },
  };
};

const resolveGenerate = (context: StyleContext): StylePatch => {
  const cell = 18 + (context.hash % 34);
  const angle = context.hash % 180;
  const isGrid = contains(context, 'grid', 'checker', 'cell');
  const isLens = contains(context, 'flare', 'lightning', 'beam');
  const isGradient = contains(context, 'gradient', 'ramp');

  return {
    overlay: {
      opacity: round(clamp(0.18 + context.intensity * 0.32)),
      backgroundImage: isLens
        ? `radial-gradient(circle at ${percent(25 + 50 * context.eased)} ${percent(30 + (context.hash % 40))}, white 0, ${context.color} 5%, transparent 28%)`
        : isGradient
          ? `linear-gradient(${deg(angle)}, ${context.color}, hsl(${context.hueSecondary} 75% 68%) 34%, hsl(${(context.hue + 180) % 360} 82% 45%) 67%, ${context.secondaryColor})`
          : isGrid
            ? `linear-gradient(${context.color} 1px, transparent 1px), linear-gradient(90deg, ${context.secondaryColor} 1px, transparent 1px)`
            : `repeating-linear-gradient(${deg(angle)}, transparent 0 ${px(cell / 2)}, ${context.color} ${px(cell / 2)} ${px(cell)})`,
      backgroundSize: isGrid ? `${px(cell)} ${px(cell)}` : undefined,
      backgroundPosition: `${px(context.jitterX * 3)} ${px(context.jitterY * 3)}`,
      mixBlendMode: 'screen',
    },
    overlaySecondary: {
      opacity: round(0.1 * context.intensity),
      background: `linear-gradient(${deg(angle + 90)}, transparent, ${context.secondaryColor}, transparent)`,
      mixBlendMode: 'overlay',
      filter: `blur(${px(8 + context.intensity * 10)})`,
    },
  };
};

const resolveGlow = (context: StyleContext): StylePatch => {
  const breathe = 0.82 + Math.sin(context.time * 3 + (context.hash % 7)) * 0.18;
  const strength = context.intensity * breathe;
  const rgbSplit = contains(context, 'rgb-split', 'chromatic');
  const lightLeak = contains(context, 'light-leak');
  const rays = contains(context, 'ray', 'glint');

  return {
    content: {
      filter: rgbSplit
        ? `contrast(${cssNumber(1 + strength * 0.12)}) drop-shadow(${px(2.5 * strength)} 0 0 rgba(255,20,75,.85)) drop-shadow(${px(-2.5 * strength)} 0 0 rgba(0,210,255,.85))`
        : `brightness(${cssNumber(1 + strength * 0.09)}) saturate(${cssNumber(1 + strength * 0.18)}) drop-shadow(0 0 ${px(5 + strength * 8)} ${context.color})`,
    },
    overlay: {
      opacity: round(clamp(0.12 * strength)),
      background: lightLeak
        ? `radial-gradient(ellipse at ${percent(10 + context.progress * 80)} ${percent(30 + ((context.hash >>> 4) % 40))}, rgba(255,255,255,.8), ${context.color} 18%, ${context.secondaryColor} 42%, transparent 72%)`
        : rays
          ? `repeating-conic-gradient(from ${deg(context.hash % 360)} at 50% 50%, transparent 0deg 9deg, ${context.color} 10deg 13deg, transparent 14deg 25deg)`
          : `radial-gradient(ellipse at ${percent(40 + (context.hash % 21))} ${percent(38 + ((context.hash >>> 4) % 25))}, ${context.color}, transparent 62%)`,
      filter: `blur(${px(10 + strength * 18)})`,
      mixBlendMode: 'screen',
    },
    overlaySecondary: {
      opacity: round(clamp(0.06 * strength)),
      background: context.secondaryColor,
      mixBlendMode: 'color-dodge',
    },
  };
};

const resolveKeying = (context: StyleContext): StylePatch => {
  const matte = contains(context, 'matte', 'alpha', 'track');
  const threshold = clamp(0.08 + context.intensity * 0.14, 0, 0.5);

  return {
    content: {
      filter: `contrast(${cssNumber(1 + threshold)}) saturate(${cssNumber(matte ? 1 - threshold : 1 + threshold)})`,
    },
    overlay: {
      opacity: round(0.08 * context.intensity),
      background: matte
        ? `linear-gradient(${deg(context.hash % 360)}, black, transparent 45%, white)`
        : `linear-gradient(${deg(context.hash % 360)}, ${context.color}, transparent 55%)`,
      mixBlendMode: matte ? 'multiply' : 'color-burn',
    },
    overlaySecondary: {
      opacity: round(0.04 * context.intensity),
      boxShadow: `inset 0 0 ${px(20 + context.intensity * 30)} ${context.secondaryColor}`,
      mixBlendMode: 'screen',
    },
  };
};

const resolveNoise = (context: StyleContext): StylePatch => {
  const grain = 2 + (context.hash % 5);
  const shiftX = (context.frameIndex * (3 + (context.hash % 9)) + context.hash) % 97;
  const shiftY = (context.frameIndex * (5 + (context.hash % 7)) + (context.hash >>> 3)) % 89;
  const monochrome = contains(context, 'mono', 'grain', 'dust', 'median');

  return {
    content: {
      filter: `contrast(${cssNumber(1 + context.intensity * 0.05)}) saturate(${cssNumber(monochrome ? 1 - context.intensity * 0.12 : 1 + context.intensity * 0.1)})`,
    },
    overlay: {
      opacity: round(clamp(0.08 + context.intensity * 0.16)),
      backgroundImage: `repeating-radial-gradient(circle at ${percent(shiftX)} ${percent(shiftY)}, ${monochrome ? '#fff' : context.color} 0 1px, transparent 1px ${px(grain)}), repeating-linear-gradient(${deg(37 + (context.hash % 83))}, transparent 0 2px, ${monochrome ? '#000' : context.secondaryColor} 2px 3px)`,
      backgroundSize: `${px(grain * 7)} ${px(grain * 5)}, ${px(grain * 11)} ${px(grain * 13)}`,
      backgroundPosition: `${px(shiftX)} ${px(shiftY)}, ${px(-shiftY)} ${px(shiftX)}`,
      mixBlendMode: monochrome ? 'soft-light' : 'overlay',
    },
  };
};

const resolvePerspective = (context: StyleContext): StylePatch => {
  const movement = Math.sin(context.time * 1.7 + context.hash) * context.intensity;
  const baseX = context.y !== 0 ? context.y * 7 : movement * 1.8;
  const baseY = context.x !== 0 ? context.x * -8 : movement * -1.5;
  const corner = 46 + (context.hash % 9);
  const shadow = contains(context, 'shadow');
  const longShadow = contains(context, 'long-shadow');

  return {
    root: {
      perspective: px(650 + (context.hash % 550)),
    },
    content: {
      transform: `rotateX(${deg(baseX + movement)}) rotateY(${deg(baseY - movement)}) scale(${cssNumber(1 + context.intensity * 0.015)})`,
      transformStyle: 'preserve-3d',
      backfaceVisibility: 'hidden',
      filter: shadow
        ? `drop-shadow(${px(context.x * -(longShadow ? 16 : 5) * context.intensity)} ${px((longShadow ? 16 : 6) * context.intensity)} ${px(longShadow ? 1 : 7)} rgba(0,0,0,.58))`
        : undefined,
    },
    overlay: {
      opacity: round(0.13 * context.intensity),
      background: `linear-gradient(${deg(context.hash % 360)}, rgba(255,255,255,.35), transparent ${percent(corner)}, rgba(0,0,0,.42))`,
      mixBlendMode: 'soft-light',
    },
  };
};

const resolveStylize = (context: StyleContext): StylePatch => {
  const edges = contains(context, 'edge', 'emboss', 'solar', 'find');
  const mosaic = contains(context, 'mosaic', 'tile', 'block', 'pointill');
  const posterize = contains(context, 'poster', 'threshold', 'cartoon');
  const amount = context.intensity;

  return {
    content: {
      filter: edges
        ? `grayscale(${cssNumber(clamp(amount * 0.35))}) contrast(${cssNumber(1 + amount * 0.75)}) drop-shadow(${px((context.hash % 3) + 1)} ${px((context.hash % 4) + 1)} 0 ${context.color})`
        : posterize
          ? `saturate(${cssNumber(1 + amount * 0.8)}) contrast(${cssNumber(1 + amount * 0.36)})`
          : `contrast(${cssNumber(1 + amount * 0.16)}) saturate(${cssNumber(1 + amount * 0.25)})`,
      imageRendering: mosaic ? 'pixelated' : undefined,
      transform: mosaic ? `scale(${cssNumber(1 + amount * 0.006)})` : undefined,
    },
    overlay: {
      opacity: round((mosaic ? 0.12 : 0.07) * amount),
      backgroundImage: mosaic
        ? `linear-gradient(90deg, ${context.color} 1px, transparent 1px), linear-gradient(${context.secondaryColor} 1px, transparent 1px)`
        : `repeating-linear-gradient(${deg(25 + (context.hash % 120))}, transparent 0 5px, ${context.color} 5px 6px)`,
      backgroundSize: mosaic
        ? `${px(7 + (context.hash % 9))} ${px(7 + (context.hash % 9))}`
        : undefined,
      mixBlendMode: edges ? 'difference' : 'overlay',
    },
  };
};

const resolveTime = (context: StyleContext): StylePatch => {
  const steps = 3 + (context.hash % 7);
  const stepped = Math.floor(context.progress * steps) / steps;
  const echo = contains(context, 'echo', 'trail', 'posterize');
  const displacement = echo ? Math.sin(stepped * Math.PI * 2) * context.intensity * 4 : 0;

  return {
    content: {
      opacity: round(0.92 + 0.08 * Math.cos(stepped * Math.PI * 2)),
      transform: `translate(${px(context.x * displacement)}, ${px(context.y * displacement)}) scale(${cssNumber(1 + pulse(context.progress, 0.5, 0.35) * context.intensity * 0.012)})`,
      filter: `contrast(${cssNumber(1 + context.intensity * 0.08)})`,
    },
    overlay: {
      opacity: round(
        echo
          ? 0.12 * context.intensity * pulse(context.progress, 0.5, 0.5)
          : 0.035 * context.intensity,
      ),
      transform: `translate(${px(-context.x * displacement * 3)}, ${px(-context.y * displacement * 3)})`,
      background: `linear-gradient(${deg(context.hash % 360)}, transparent, ${context.color})`,
      mixBlendMode: 'screen',
    },
  };
};

const resolveTransform = (context: StyleContext): StylePatch => {
  const shake = contains(context, 'shake', 'jitter', 'turbulent');
  const rotate = contains(context, 'rotate', 'spin');
  const grow = contains(context, 'grow', 'zoom', 'scale');
  const shrink = contains(context, 'shrink');
  const move = contains(context, 'move', 'offset', 'auto-reframe', 'motion-camera');
  const flipX = contains(context, 'horizontal-flip');
  const flipY = contains(context, 'vertical-flip');
  const entrance = contains(context, 'entrance', 'slide-in', 'move-in');
  const reveal = entrance ? easeOut(context.progress) : 1;
  const distance = (1 - reveal) * 110 * context.intensity;
  const jitterScale = shake ? 5.5 * context.intensity : 0;
  const rotationDirection = context.hash % 2 === 0 ? -1 : 1;
  const rotation = rotate
    ? context.time * 34 * context.intensity * rotationDirection
    : shake
      ? context.jitterX * context.intensity * 1.2
      : 0;
  const zoomAmount = grow
    ? 0.86 + context.progress * 0.14
    : shrink
      ? 1.14 - context.progress * 0.14
      : 1;
  const travel = move
    ? Math.sin(context.time * (0.65 + (context.hash % 4) * 0.12) + context.hash) *
      context.intensity *
      12
    : 0;
  const scaleX = flipX ? -1 : 1;
  const scaleY = flipY ? -1 : 1;

  return {
    content: {
      opacity: round(entrance ? smoothstep(context.progress * 1.5) : 1),
      transform: `translate(${px(context.x * (distance + travel) + context.jitterX * jitterScale)}, ${px(context.y * (distance + travel) + context.jitterY * jitterScale)}) rotate(${deg(rotation)}) scale(${cssNumber(zoomAmount)}) scaleX(${cssNumber(scaleX)}) scaleY(${cssNumber(scaleY)})`,
    },
    overlay: {
      opacity: round(shake ? 0.05 * context.intensity : 0),
      background: context.color,
      mixBlendMode: 'difference',
    },
  };
};

const resolveUtility = (context: StyleContext): StylePatch => {
  const alpha = contains(context, 'alpha', 'matte', 'opacity');
  const crop = contains(context, 'crop', 'feather');
  const border = 1 + context.intensity * 2 + (context.hash % 2);

  return {
    content: {
      opacity: round(alpha ? 1 - context.intensity * 0.12 : 1),
      clipPath: crop
        ? `inset(${percent(context.intensity * 1.4)} round ${px(2 + context.intensity * 3)})`
        : undefined,
      filter: `contrast(${cssNumber(1 + context.intensity * 0.045)})`,
    },
    overlay: {
      opacity: round(0.08 * context.intensity),
      border: `${px(border)} solid ${context.color}`,
      boxShadow: `inset 0 0 ${px(12 + context.intensity * 20)} ${context.secondaryColor}`,
      mixBlendMode: 'soft-light',
    },
  };
};

const resolveVr = (context: StyleContext): StylePatch => {
  const yaw = Math.sin(context.time * 0.8 + context.hash) * context.intensity * 3;
  const horizon = 48 + context.jitterY * 2;

  return {
    root: {
      perspective: px(500 + (context.hash % 350)),
      borderRadius: percent(context.intensity * 2),
    },
    content: {
      transform: `rotateY(${deg(yaw)}) rotateX(${deg(-context.y * context.intensity * 1.5)}) scale(${cssNumber(1 + context.intensity * 0.035)})`,
      filter: `saturate(${cssNumber(1 + context.intensity * 0.13)})`,
    },
    overlay: {
      opacity: round(0.15 * context.intensity),
      background: `radial-gradient(ellipse at 50% ${percent(horizon)}, transparent 38%, ${context.color} 125%)`,
      mixBlendMode: 'soft-light',
    },
    overlaySecondary: {
      opacity: round(0.07 * context.intensity),
      background: `linear-gradient(90deg, ${context.secondaryColor}, transparent 12% 88%, ${context.secondaryColor})`,
      mixBlendMode: 'screen',
    },
  };
};

const resolveTransition = (context: StyleContext): StylePatch => {
  const baseProgress = context.progress;
  const spring = contains(context, 'spring');
  const springProgress = 1 - Math.exp(-baseProgress * 7) * Math.cos(baseProgress * Math.PI * 4.2);
  const p = spring ? clamp(springProgress, 0, 1.12) : smoothstep(baseProgress);
  const isFade = contains(context, 'dissolve', 'fade');
  const isWipe = contains(
    context,
    'wipe',
    'barn',
    'band',
    'louver',
    'slice',
    'split',
    'stripe',
    'panel',
  );
  const isSlide = contains(context, 'slide', 'push', 'pull', 'travel', 'roll');
  const isIris = contains(context, 'iris', 'circle', 'zoom', 'aperture');
  const isSpin = contains(context, 'spin', 'twirl', 'rotate');
  const isWhip = contains(context, 'whip');
  const isPop = contains(context, 'pop-motion');
  const isBurn = contains(context, 'burn-alpha', 'burn-chroma');
  const isMosaic = contains(context, 'mosaic');
  const isGlitch = contains(context, 'glitch', 'chaos', 'vhs-damage');
  const isNeon = contains(context, 'neon');
  const isDip = contains(context, 'dip-to-black', 'dip-to-white', 'dip-to-color');
  const movement = isSlide || isWhip;
  const distance = (1 - clamp(p)) * 102;
  const angle = isSpin ? (1 - p) * (context.hash % 2 === 0 ? -24 : 24) : 0;
  const impact = pulse(baseProgress, 0.5, 0.48);
  const scale = spring
    ? p
    : isPop
      ? 0.68 + p * 0.32 + Math.sin(baseProgress * Math.PI * 3) * (1 - p) * 0.08
      : contains(context, 'zoom')
        ? 0.78 + p * 0.22
        : 0.96 + p * 0.04;
  const glitchX = isGlitch ? context.jitterX * impact * context.intensity * 16 : 0;
  const clipPath = isBurn
    ? `circle(${percent(clamp(p) * 76)} at ${percent(42 + (context.hash % 17))} ${percent(42 + ((context.hash >>> 5) % 17))})`
    : isIris
      ? `circle(${percent(clamp(p) * 74)} at 50% 50%)`
      : isWipe
        ? `inset(${context.y > 0 ? percent(distance) : '0'} ${context.x < 0 ? percent(distance) : '0'} ${context.y < 0 ? percent(distance) : '0'} ${context.x > 0 ? percent(distance) : '0'})`
        : undefined;
  const overlayBackground = isBurn
    ? `radial-gradient(circle at ${percent(42 + (context.hash % 17))} ${percent(42 + ((context.hash >>> 5) % 17))}, transparent ${percent(clamp(p) * 55)}, #fff6b1 ${percent(clamp(p) * 66)}, #ff5015 ${percent(clamp(p) * 72)}, transparent ${percent(clamp(p) * 82)})`
    : isMosaic
      ? `linear-gradient(90deg, ${context.color} 1px, transparent 1px), linear-gradient(${context.secondaryColor} 1px, transparent 1px)`
      : isDip
        ? contains(context, 'white')
          ? '#fff'
          : contains(context, 'black')
            ? '#000'
            : context.color
        : `linear-gradient(${deg(context.direction === 'top' || context.direction === 'bottom' ? 0 : 90)}, transparent, ${context.color}, transparent)`;

  return {
    content: {
      opacity: round(isFade || isDip ? clamp(p) : clamp(p * 1.35)),
      clipPath,
      imageRendering: isMosaic && impact > 0.08 ? 'pixelated' : undefined,
      transform: `translate(${percent(context.x * (movement ? distance : 0) + glitchX)}, ${percent(context.y * (movement ? distance : 0))}) rotate(${deg(angle + (isGlitch ? context.jitterY * impact * 2 : 0))}) scale(${cssNumber(scale)})`,
      filter: `blur(${px((isWhip ? impact * 10 : 1 - clamp(p)) * context.intensity * (isWipe ? 6 : 2))}) contrast(${cssNumber(1 + (isGlitch || isMosaic ? impact * context.intensity * 0.24 : 0))})`,
    },
    overlay: {
      opacity: round(impact * context.intensity * (isBurn || isDip ? 0.82 : isNeon ? 0.58 : 0.25)),
      background: overlayBackground,
      backgroundSize: isMosaic ? `${px(5 + impact * 24)} ${px(5 + impact * 24)}` : undefined,
      transform: `translate(${percent(context.x * (50 - p * 100))}, ${percent(context.y * (50 - p * 100))})`,
      mixBlendMode: isMosaic ? 'overlay' : 'screen',
      filter: `blur(${px(isNeon ? 2 + context.intensity * 2 : 6 + context.intensity * 7)})`,
      boxShadow: isNeon
        ? `0 0 ${px(8)} ${context.color}, 0 0 ${px(20)} ${context.secondaryColor}`
        : undefined,
    },
  };
};

const resolveText = (context: StyleContext): StylePatch => {
  const p = easeOut(context.progress);
  const writeOn = contains(context, 'type', 'write', 'reveal');
  const glow = contains(context, 'glow', 'neon', 'shadow');
  const bounce = contains(context, 'bounce', 'pop');
  const bounceScale = bounce
    ? 1 + Math.sin(p * Math.PI * 2.5) * (1 - p) * context.intensity * 0.18
    : 1;

  return {
    content: {
      display: 'inline-block',
      color: context.color,
      opacity: round(clamp(p * 1.4)),
      clipPath: writeOn ? `inset(0 ${percent((1 - p) * 100)} 0 0)` : undefined,
      transform: `translateY(${px((1 - p) * 16 * context.intensity)}) scale(${cssNumber(bounceScale)})`,
      textShadow: glow
        ? `0 0 ${px(4 + context.intensity * 4)} ${context.color}, 0 0 ${px(10 + context.intensity * 8)} ${context.secondaryColor}`
        : `0 ${px(2 + context.intensity)} ${px(4 + context.intensity * 2)} rgba(0,0,0,.35)`,
      letterSpacing: px((context.hash % 3) * 0.25 * context.intensity),
    },
    overlay: {
      opacity: round(writeOn ? pulse(p, 0.88, 0.12) : 0),
      width: px(2 + context.intensity),
      left: percent(p * 100),
      right: 'auto',
      background: context.secondaryColor,
      boxShadow: `0 0 ${px(8)} ${context.secondaryColor}`,
    },
  };
};

const resolveRecipe = (context: StyleContext): StylePatch => {
  const p = easeOut(context.progress);
  const entranceOpacity = round(clamp(context.progress * 1.8));

  switch (context.preset.id) {
    case 'golden-text': {
      const gold = context.hasCustomColor ? context.color : '#f8d568';
      const deepGold = context.hasCustomSecondaryColor ? context.secondaryColor : '#a96709';
      const shadowGold = context.hasCustomSecondaryColor ? context.secondaryColor : '#8d5705';

      return {
        content: {
          display: 'inline-block',
          color: 'transparent',
          backgroundImage: `linear-gradient(180deg, #fff8b8 0%, ${gold} 19%, ${deepGold} 48%, ${gold} 70%, ${shadowGold} 100%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: `saturate(${cssNumber(1 + context.intensity * 0.2)})`,
          textShadow: `0 ${px(2)} ${px(1)} rgba(255,246,165,.45), 0 ${px(5)} ${px(8)} rgba(72,34,0,.55), 0 0 ${px(5 + context.intensity * 3)} ${shadowGold}`,
        },
        overlay: {
          opacity: round(pulse(context.progress, 0.55, 0.24) * 0.65 * context.intensity),
          background: `linear-gradient(110deg, transparent 38%, rgba(255,255,255,.9) 49%, transparent 60%)`,
          transform: `translateX(${percent(-120 + context.progress * 240)})`,
          mixBlendMode: 'screen',
        },
      };
    }
    case 'neon-text':
      return {
        content: {
          display: 'inline-block',
          color: context.color,
          WebkitTextStroke: `${px(0.5 + context.intensity * 0.35)} rgba(255,255,255,.72)`,
          textShadow: `0 0 ${px(3)} white, 0 0 ${px(7 + context.intensity * 3)} ${context.color}, 0 0 ${px(16 + context.intensity * 9)} ${context.color}, 0 0 ${px(32 + context.intensity * 12)} ${context.secondaryColor}`,
          opacity: round(0.88 + Math.abs(Math.sin(context.time * 13 + context.hash)) * 0.12),
        },
      };
    case 'chrome-text':
      return {
        content: {
          display: 'inline-block',
          color: 'transparent',
          backgroundImage:
            'linear-gradient(180deg, #101820 0%, #f4fbff 17%, #687783 33%, #f7ffff 48%, #26313a 64%, #dbe8ee 82%, #111820 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          WebkitTextStroke: `${px(0.65)} rgba(255,255,255,.55)`,
          filter: `contrast(${cssNumber(1.12 + context.intensity * 0.14)}) drop-shadow(0 ${px(4)} ${px(5)} rgba(0,0,0,.48))`,
        },
      };
    case 'glass-text':
      return {
        content: {
          display: 'inline-block',
          color: 'rgba(245,252,255,.2)',
          WebkitTextStroke: `${px(1 + context.intensity * 0.25)} rgba(230,250,255,.75)`,
          textShadow: `0 ${px(-1)} ${px(1)} rgba(255,255,255,.75), 0 ${px(6)} ${px(14)} rgba(15,50,70,.42), 0 0 ${px(10)} ${context.color}`,
          backdropFilter: `blur(${px(2 + context.intensity * 2)})`,
        },
      };
    case 'kinetic-word-cascade': {
      const step = Math.floor(context.progress * 7);
      const local = clamp(context.progress * 7 - step);
      const travel = (1 - easeOut(local)) * 45 * context.intensity;
      return {
        content: {
          opacity: round(clamp(local * 2)),
          transform: `translate(${px(context.x * travel)}, ${px(context.y * travel + (1 - easeOut(local)) * 24 * context.intensity)}) skewX(${deg((1 - local) * -9 * context.intensity)})`,
          letterSpacing: px((1 - local) * 3 * context.intensity),
        },
      };
    }
    case 'scramble-reveal-text':
      return {
        content: {
          opacity: entranceOpacity,
          transform: `translateX(${px(context.jitterX * (1 - p) * 8 * context.intensity)})`,
          filter: `blur(${px((1 - p) * 1.5)})`,
          letterSpacing: px((1 - p) * 5 * context.intensity),
          textShadow: `${px(context.jitterX * 3)} 0 ${context.color}, ${px(context.jitterY * -3)} 0 ${context.secondaryColor}`,
        },
      };
    case 'offscreen-slide-in': {
      const distance = (1 - p) * 120 * context.intensity;
      const overshoot =
        Math.sin(context.progress * Math.PI * 2.2) * (1 - p) * 8 * context.intensity;
      return {
        content: {
          opacity: entranceOpacity,
          transform: `translate(${percent(context.x * (distance - overshoot))}, ${percent(context.y * (distance - overshoot))})`,
        },
      };
    }
    case 'elastic-pop-in': {
      const elastic =
        1 - Math.exp(-context.progress * 7) * Math.cos(context.progress * 4.5 * Math.PI);
      const intensityAdjustedElastic = p + (elastic - p) * context.intensity;
      return {
        content: {
          opacity: entranceOpacity,
          transform: `scale(${cssNumber(clamp(intensityAdjustedElastic, 0, 1 + 0.18 * context.intensity))})`,
        },
      };
    }
    case 'blur-rise-in':
      return {
        content: {
          opacity: entranceOpacity,
          transform: `translateY(${px((1 - p) * 42 * context.intensity)})`,
          filter: `blur(${px((1 - p) * 13 * context.intensity)})`,
        },
      };
    case 'masked-reveal':
      return {
        content: {
          clipPath: `inset(${context.y > 0 ? percent((1 - p) * 100) : '0'} ${context.x < 0 ? percent((1 - p) * 100) : '0'} ${context.y < 0 ? percent((1 - p) * 100) : '0'} ${context.x > 0 ? percent((1 - p) * 100) : '0'} round ${px(3 + context.intensity * 4)})`,
        },
        overlay: {
          opacity: round(pulse(p, 0.65, 0.25) * 0.6),
          background: context.color,
          transform: `translate(${percent(context.x * (100 - p * 200))}, ${percent(context.y * (100 - p * 200))})`,
          filter: `blur(${px(5)})`,
          mixBlendMode: 'screen',
        },
      };
    case 'cinematic-zoom-in':
      return {
        content: {
          opacity: entranceOpacity,
          transform: `scale(${cssNumber(1.14 - p * 0.14)})`,
          filter: `blur(${px((1 - p) * 6 * context.intensity)}) contrast(${cssNumber(1 + p * 0.08)})`,
        },
        overlay: {
          opacity: round(0.22 * context.intensity),
          boxShadow: `inset 0 0 ${px(60 + context.intensity * 60)} rgba(0,0,0,.75)`,
          mixBlendMode: 'multiply',
        },
      };
    case 'paper-fold-in':
      return {
        root: { perspective: px(900) },
        content: {
          opacity: entranceOpacity,
          transform: `rotate${context.x !== 0 ? 'Y' : 'X'}(${deg(context.x !== 0 ? context.x * (1 - p) * 86 * context.intensity : -context.y * (1 - p) * 86 * context.intensity)}) scale(${cssNumber(1 - (1 - p) * 0.08 * context.intensity)})`,
          transformOrigin:
            context.direction === 'left'
              ? 'left center'
              : context.direction === 'right'
                ? 'right center'
                : context.direction === 'top'
                  ? 'center top'
                  : 'center bottom',
          boxShadow: `${px(context.x * -16 * context.intensity)} ${px(context.y * -16 * context.intensity)} ${px(24 * context.intensity)} rgba(0,0,0,.35)`,
        },
      };
    case 'vintage-film':
      return mergeRecipeLook(context, {
        filter: `sepia(${cssNumber(0.34 * context.intensity)}) saturate(${cssNumber(0.78)}) contrast(${cssNumber(1.08)}) brightness(${cssNumber(0.95 + context.jitterX * 0.025)})`,
        overlay:
          'repeating-linear-gradient(90deg, rgba(255,245,200,.11) 0 1px, transparent 1px 4px)',
        blend: 'overlay',
        opacity: 0.24,
      });
    case 'teal-orange-cinema':
      return mergeRecipeLook(context, {
        filter: `contrast(${cssNumber(1.14)}) saturate(${cssNumber(1.18)}) sepia(${cssNumber(0.08)}) hue-rotate(${deg(-5)})`,
        overlay:
          'linear-gradient(135deg, rgba(0,76,92,.58), transparent 46%, rgba(242,115,38,.56))',
        blend: 'color',
        opacity: 0.26,
      });
    case 'noir':
      return mergeRecipeLook(context, {
        filter: `grayscale(1) contrast(${cssNumber(1.25 + context.intensity * 0.18)}) brightness(.9)`,
        overlay: 'radial-gradient(circle, transparent 35%, rgba(0,0,0,.88) 130%)',
        blend: 'multiply',
        opacity: 0.5,
      });
    case 'bleach-bypass':
      return mergeRecipeLook(context, {
        filter: `saturate(${cssNumber(Math.max(0.35, 0.82 - context.intensity * 0.14))}) contrast(${cssNumber(1.2 + context.intensity * 0.14)}) brightness(.94)`,
        overlay:
          'repeating-radial-gradient(circle, rgba(255,255,255,.18) 0 1px, transparent 1px 4px)',
        blend: 'soft-light',
        opacity: 0.18,
      });
    case 'dream-glow':
      return mergeRecipeLook(context, {
        filter: `brightness(${cssNumber(1.06)}) saturate(${cssNumber(0.92)}) contrast(.9) blur(${px(0.45 * context.intensity)})`,
        overlay: `radial-gradient(circle at 55% 38%, rgba(255,255,255,.78), ${context.color}, transparent 68%)`,
        blend: 'screen',
        opacity: 0.3,
      });
    case 'vhs': {
      const tear = ((context.frameIndex * 17 + context.hash) % 100) - 50;
      return {
        content: {
          filter: `contrast(1.08) saturate(1.22) blur(${px(0.35)})`,
          transform: `translateX(${px(context.jitterX * 1.6 * context.intensity)})`,
          textShadow: `${px(2 * context.intensity)} 0 #00d9ff, ${px(-2 * context.intensity)} 0 #ff174d`,
        },
        overlay: {
          opacity: round(0.22 * context.intensity),
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0 1px, transparent 1px 4px)',
          transform: `translateY(${px(tear)})`,
          mixBlendMode: 'overlay',
        },
        overlaySecondary: {
          opacity: round(0.14 * context.intensity),
          background: `linear-gradient(90deg, rgba(0,210,255,.35), transparent, rgba(255,0,75,.35))`,
          mixBlendMode: 'screen',
        },
      };
    }
    case 'glitch-cut': {
      const impact = pulse(context.progress, 0.5, 0.38) * context.intensity;
      return {
        content: {
          opacity: entranceOpacity,
          transform: `translateX(${px(context.jitterX * impact * 18)}) skewX(${deg(context.jitterY * impact * 4)})`,
          filter: `contrast(${cssNumber(1 + impact * 0.4)}) saturate(${cssNumber(1 + impact)})`,
        },
        overlay: {
          opacity: round(clamp(impact * 0.52)),
          background: `repeating-linear-gradient(0deg, transparent 0 ${px(5 + (context.hash % 8))}, ${context.color} ${px(6 + (context.hash % 8))} ${px(9 + (context.hash % 8))})`,
          transform: `translateX(${px(context.jitterX * impact * 35)})`,
          mixBlendMode: 'difference',
        },
      };
    }
    case 'film-burn-cut':
    case 'light-leak-cut': {
      const flare = pulse(context.progress, 0.5, 0.43) * context.intensity;
      const isBurn = context.preset.id === 'film-burn-cut';
      return {
        content: {
          opacity: round(clamp(context.progress * 1.5)),
          filter: `brightness(${cssNumber(1 + flare * (isBurn ? 1.1 : 0.7))}) contrast(${cssNumber(1 + flare * 0.12)})`,
        },
        overlay: {
          opacity: round(clamp(flare * 0.92)),
          background: `radial-gradient(circle at ${percent(10 + context.progress * 80)} ${percent(30 + (context.hash % 45))}, white 0, ${isBurn ? '#ff8a16' : context.color} 16%, ${isBurn ? '#9b1200' : context.secondaryColor} 42%, transparent 72%)`,
          mixBlendMode: 'screen',
          filter: `blur(${px(5 + context.intensity * 7)})`,
        },
      };
    }
    case 'whip-pan-cut': {
      const center = pulse(context.progress, 0.5, 0.5);
      return {
        content: {
          opacity: entranceOpacity,
          transform: `translate(${percent(context.x * (1 - p) * 115 * context.intensity)}, ${percent(context.y * (1 - p) * 115 * context.intensity)}) scale(${cssNumber(1 + center * 0.04 * context.intensity)})`,
          filter: `blur(${px(center * context.intensity * 11)})`,
        },
        overlay: {
          opacity: round(center * 0.18 * context.intensity),
          background: `repeating-linear-gradient(${deg(context.x === 0 ? 0 : 90)}, transparent 0 8px, ${context.color} 8px 12px)`,
          mixBlendMode: 'screen',
        },
      };
    }
    case 'freeze-frame-punch': {
      const impact = pulse(context.progress, 0.52, 0.18);
      return {
        content: {
          transform: `scale(${cssNumber(1 + impact * 0.12 * context.intensity)}) rotate(${deg(context.jitterX * impact * 1.2)})`,
          filter: `contrast(${cssNumber(1 + impact * 0.65)}) saturate(${cssNumber(1 - impact * 0.38)})`,
        },
        overlay: {
          opacity: round(impact * 0.22 * context.intensity),
          background: context.color,
          mixBlendMode: 'difference',
        },
      };
    }
    case 'split-screen-reveal': {
      const split = 50 * (1 - p);
      return {
        content: {
          clipPath: `polygon(0 ${percent(split)}, 49.5% ${percent(split)}, 49.5% 0, 50.5% 0, 50.5% ${percent(split)}, 100% ${percent(split)}, 100% ${percent(100 - split)}, 50.5% ${percent(100 - split)}, 50.5% 100%, 49.5% 100%, 49.5% ${percent(100 - split)}, 0 ${percent(100 - split)})`,
        },
        overlay: {
          opacity: round(pulse(p, 0.55, 0.25) * 0.55 * context.intensity),
          background: `linear-gradient(90deg, transparent 49.5%, ${context.color} 49.5% 50.5%, transparent 50.5%)`,
          mixBlendMode: 'screen',
        },
      };
    }
    default:
      return resolveTransform(context);
  }
};

const mergeRecipeLook = (
  context: StyleContext,
  style: {
    readonly filter: string;
    readonly overlay: string;
    readonly blend: CSSProperties['mixBlendMode'];
    readonly opacity: number;
  },
): StylePatch => ({
  content: {
    filter: style.filter,
  },
  overlay: {
    opacity: round(clamp(style.opacity * context.intensity)),
    background: style.overlay,
    mixBlendMode: style.blend,
  },
  overlaySecondary: {
    opacity: round(0.07 * context.intensity),
    backgroundImage: `repeating-radial-gradient(circle at ${percent((context.hash + context.frameIndex * 13) % 100)} ${percent(((context.hash >>> 8) + context.frameIndex * 7) % 100)}, white 0 1px, transparent 1px 4px)`,
    backgroundSize: `${px(21 + (context.hash % 11))} ${px(17 + (context.hash % 13))}`,
    mixBlendMode: 'soft-light',
  },
});

export const resolvePresetStyles = (
  preset: PresetDefinition,
  options: StyleEngineOptions,
): ResolvedPresetStyles => {
  const context = createContext(preset, options);
  let patch: StylePatch;

  switch (preset.engine) {
    case 'adjust':
      patch = resolveAdjust(context);
      break;
    case 'blur':
      patch = resolveBlur(context);
      break;
    case 'color':
      patch = resolveColor(context);
      break;
    case 'distort':
      patch = resolveDistort(context);
      break;
    case 'generate':
      patch = resolveGenerate(context);
      break;
    case 'glow':
      patch = resolveGlow(context);
      break;
    case 'keying':
      patch = resolveKeying(context);
      break;
    case 'noise':
      patch = resolveNoise(context);
      break;
    case 'perspective':
      patch = resolvePerspective(context);
      break;
    case 'stylize':
      patch = resolveStylize(context);
      break;
    case 'time':
      patch = resolveTime(context);
      break;
    case 'transform':
      patch = resolveTransform(context);
      break;
    case 'utility':
      patch = resolveUtility(context);
      break;
    case 'vr':
      patch = resolveVr(context);
      break;
    case 'transition':
      patch = resolveTransition(context);
      break;
    case 'text':
      patch = resolveText(context);
      break;
    case 'recipe':
      patch = resolveRecipe(context);
      break;
    default:
      patch = resolveUtility(context);
      break;
  }

  return mergeStyles(baseStyles(), patch);
};
