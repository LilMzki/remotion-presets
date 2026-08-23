import type { CSSProperties, ReactNode } from 'react';
import type { TransitionPresentationComponentProps } from '@remotion/transitions';
import { AbsoluteFill } from 'remotion';
import { assertSafeCssColor, resolveSafeCssColor } from './core/color';
import { clamp, seededSigned, seededUnit, smoothstep } from './core/math';
import { getPresetDefinition } from './registry';
import type { CategoryCheckedPresetId, TransitionPresetId } from './registry';
import type { PresetDefinition, PresetOptions, PresetTransition } from './types';

type TransitionFamily =
  | 'fade'
  | 'slide'
  | 'wipe'
  | 'radial'
  | 'iris'
  | 'block'
  | 'glitch'
  | 'blur'
  | 'three-d'
  | 'fold'
  | 'zoom'
  | 'split'
  | 'light'
  | 'burn';

type Direction = NonNullable<PresetOptions['direction']>;

type ResolvedTransitionProps = {
  readonly presetId: string;
  readonly engine: string;
  readonly variant: string;
  readonly intensity: number;
  readonly seed: string | number;
  readonly durationInFrames: number;
  readonly color: string;
  readonly secondaryColor: string;
  readonly direction: Direction;
};

type TransitionVisual = {
  readonly root?: CSSProperties;
  readonly content?: CSSProperties;
  readonly overlay?: CSSProperties;
  readonly overlaySecondary?: CSSProperties;
  readonly decoration?: 'blocks' | 'glitch' | 'stripes';
};

type VisualContext = {
  readonly family: TransitionFamily;
  readonly key: string;
  readonly progress: number;
  readonly easedProgress: number;
  readonly visibleProgress: number;
  readonly pulse: number;
  readonly entering: boolean;
  readonly durationInFrames: number;
  readonly props: ResolvedTransitionProps;
};

const fill: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const withAlpha = (color: string, opacity: number): string =>
  `color-mix(in srgb, ${color} ${Math.round(clamp(opacity) * 100)}%, transparent)`;

const includesAny = (value: string, needles: readonly string[]): boolean =>
  needles.some((needle) => value.includes(needle));

const getTransitionKey = (
  definition: Pick<PresetDefinition, 'engine' | 'id' | 'variant'>,
): string => `${definition.engine}:${definition.variant}:${definition.id}`.toLowerCase();

/**
 * Keep this ordered from the most distinctive looks to the most general ones.
 * A definition's engine is part of the key so future engines can opt into the
 * same deterministic DOM implementation without adding another public API.
 */
const classifyTransition = (
  definition: Pick<PresetDefinition, 'engine' | 'id' | 'variant'>,
): TransitionFamily => {
  const key = getTransitionKey(definition);

  if (includesAny(key, ['film-burn', 'burn-alpha', 'burn-chroma'])) {
    return 'burn';
  }

  if (includesAny(key, ['page', 'peel', 'fold'])) {
    return 'fold';
  }

  if (
    includesAny(key, [
      'roll-3d',
      'spin-3d',
      'flip-motion',
      'cube',
      'flip-over',
      'kaleidoscope',
      'mirror-transition',
    ])
  ) {
    return 'three-d';
  }

  if (includesAny(key, ['clock-wipe', 'radial-wipe'])) {
    return 'radial';
  }

  if (includesAny(key, ['iris', 'star-wipe'])) {
    return 'iris';
  }

  if (
    includesAny(key, [
      'random-block',
      'block-motion',
      'block-dissolve',
      'mosaic-transition',
      'checker',
      'louver',
      'panel-wipe',
      'plateau-wipe',
      'stripe',
      'slice',
    ])
  ) {
    return 'block';
  }

  if (
    includesAny(key, ['glitch', 'vhs', 'chaos', 'earthquake', 'flicker', 'tv-power', 'solarize'])
  ) {
    return 'glitch';
  }

  if (includesAny(key, ['zoom', 'mobius'])) {
    return 'zoom';
  }

  if (includesAny(key, ['blur', 'morph', 'glass', 'liquid', 'wave', 'displacement', 'warp'])) {
    return 'blur';
  }

  if (
    includesAny(key, [
      'light-leak',
      'chroma-leak',
      'flare',
      'flash',
      'glow',
      'phosphor',
      'light-sweep',
      'light-ray',
      ':ray:',
    ])
  ) {
    return 'light';
  }

  if (includesAny(key, ['split', 'barn-door', 'frame'])) {
    return 'split';
  }

  if (includesAny(key, ['wipe', 'inset', 'grunge', 'shape-flow'])) {
    return 'wipe';
  }

  if (includesAny(key, ['whip', 'push', 'slide', 'film-roll', ':roll:', 'stretch'])) {
    return 'slide';
  }

  return 'fade';
};

const directionFromKey = (key: string, seed: string | number): Direction => {
  if (key.includes('left')) return 'left';
  if (key.includes('right')) return 'right';
  if (key.includes('top')) return 'top';
  if (key.includes('bottom')) return 'bottom';
  if (key.includes('film-roll')) return 'bottom';

  const directions: readonly Direction[] = ['left', 'right', 'top', 'bottom'];
  return directions[Math.floor(seededUnit(seed, 701) * directions.length)] ?? 'left';
};

const directionVector = (direction: Direction): { readonly x: number; readonly y: number } => {
  switch (direction) {
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
  }
};

const directionalClipPath = (visibleProgress: number, direction: Direction): string => {
  const hidden = (1 - clamp(visibleProgress)) * 100;
  switch (direction) {
    case 'left':
      return `inset(0 ${hidden}% 0 0)`;
    case 'right':
      return `inset(0 0 0 ${hidden}%)`;
    case 'top':
      return `inset(0 0 ${hidden}% 0)`;
    case 'bottom':
      return `inset(${hidden}% 0 0 0)`;
  }
};

const gradientAngle = (direction: Direction): number => {
  switch (direction) {
    case 'left':
      return 90;
    case 'right':
      return 270;
    case 'top':
      return 180;
    case 'bottom':
      return 0;
  }
};

const clockClipPath = (visibleProgress: number): string => {
  const progress = clamp(visibleProgress);
  if (progress <= 0) {
    return 'polygon(50% 50%, 50% -110%, 50% -110%)';
  }

  const segments = 32;
  const exactSegments = progress * segments;
  const fullSegments = Math.floor(exactSegments);
  const points = ['50% 50%'];
  const pointFor = (segment: number): string => {
    const angle = -Math.PI / 2 + (segment / segments) * Math.PI * 2;
    const radius = 160;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    return `${x.toFixed(3)}% ${y.toFixed(3)}%`;
  };

  for (let segment = 0; segment <= fullSegments; segment++) {
    points.push(pointFor(segment));
  }
  if (fullSegments < segments) {
    points.push(pointFor(exactSegments));
  }

  return `polygon(${points.join(', ')})`;
};

const starClipPath = (visibleProgress: number): string => {
  const progress = clamp(visibleProgress);
  const outerRadius = progress * 150;
  // At the end, inflate the inner radius too so no corner remains clipped.
  const innerRadius = progress * (50 + progress * 105);
  const points = Array.from({ length: 20 }, (_, index) => {
    const angle = -Math.PI / 2 + (index / 20) * Math.PI * 2;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    return `${(50 + Math.cos(angle) * radius).toFixed(3)}% ${(50 + Math.sin(angle) * radius).toFixed(3)}%`;
  });
  return `polygon(${points.join(', ')})`;
};

const irisClipPath = (key: string, visibleProgress: number): string => {
  const progress = clamp(visibleProgress);
  if (key.includes('star')) {
    return starClipPath(progress);
  }
  if (key.includes('box')) {
    const inset = (1 - progress) * 50;
    return `inset(${inset}% ${inset}%)`;
  }
  if (key.includes('diamond')) {
    const radius = progress * 105;
    return `polygon(50% ${50 - radius}%, ${50 + radius}% 50%, 50% ${50 + radius}%, ${
      50 - radius
    }% 50%)`;
  }
  if (key.includes('cross')) {
    const arm = progress * 50;
    const centerStart = 50 - arm;
    const centerEnd = 50 + arm;
    return `polygon(${centerStart}% 0, ${centerEnd}% 0, ${centerEnd}% ${centerStart}%, 100% ${centerStart}%, 100% ${centerEnd}%, ${centerEnd}% ${centerEnd}%, ${centerEnd}% 100%, ${centerStart}% 100%, ${centerStart}% ${centerEnd}%, 0 ${centerEnd}%, 0 ${centerStart}%, ${centerStart}% ${centerStart}%)`;
  }
  return `circle(${progress * 72}% at 50% 50%)`;
};

const baseOpacity = (visibleProgress: number): number => clamp(visibleProgress * 1.35);

const resolveFade = (context: VisualContext): TransitionVisual => {
  const { key, visibleProgress, pulse, entering, props } = context;
  const isFilm = key.includes('film-dissolve');
  const isAdditive = key.includes('additive');
  const isNonAdditive = key.includes('non-additive');
  const isDip = key.includes('dip-to-');
  const opacity = isFilm ? visibleProgress ** 0.82 : visibleProgress;
  const dipColor = key.includes('white') ? '#fff' : key.includes('black') ? '#000' : props.color;

  return {
    root: {
      opacity,
      mixBlendMode: isAdditive && entering ? 'screen' : undefined,
    },
    content: {
      filter: `brightness(${1 + pulse * props.intensity * (isAdditive ? 0.3 : 0.08)}) contrast(${
        1 + pulse * props.intensity * (isNonAdditive ? 0.22 : 0.04)
      })`,
    },
    overlay: isDip
      ? {
          backgroundColor: dipColor,
          opacity: clamp(pulse * (0.82 + props.intensity * 0.18)),
        }
      : undefined,
  };
};

const resolveSlide = (context: VisualContext): TransitionVisual => {
  const { key, easedProgress, pulse, entering, props } = context;
  const vector = directionVector(props.direction);
  const travel = (entering ? 1 - easedProgress : easedProgress) * 104;
  const sign = entering ? 1 : -1;
  const x = vector.x * travel * sign;
  const y = vector.y * travel * sign;
  const isWhip = key.includes('whip');
  const isRoll = key.includes('roll');
  const isStretch = key.includes('stretch');
  const rotation = isRoll ? (entering ? -1 : 1) * (1 - context.visibleProgress) * 14 : 0;
  const stretchX = isStretch && vector.x !== 0 ? 1 + pulse * props.intensity * 0.28 : 1;
  const stretchY = isStretch && vector.y !== 0 ? 1 + pulse * props.intensity * 0.28 : 1;

  return {
    root: { opacity: baseOpacity(context.visibleProgress) },
    content: {
      filter: `blur(${isWhip ? pulse * props.intensity * 20 : 0}px)`,
      transform: `translate3d(${x}%, ${y}%, 0) rotate(${rotation}deg) scale(${stretchX}, ${stretchY})`,
      transformOrigin: '50% 50%',
    },
    overlay: isWhip
      ? {
          background: `linear-gradient(${gradientAngle(props.direction)}deg, transparent, ${withAlpha(
            props.color,
            1 / 3,
          )}, transparent)`,
          mixBlendMode: 'screen',
          opacity: pulse * clamp(props.intensity) * 0.55,
        }
      : undefined,
  };
};

const resolveWipe = (context: VisualContext): TransitionVisual => {
  const { key, visibleProgress, progress, pulse, props } = context;
  const edge = progress * 100;
  const isNeon = key.includes('neon');
  const isSoft = key.includes('soft');
  const isGradient = key.includes('gradient');
  const edgeWidth = isSoft ? 12 : isGradient ? 7 : 2.5;

  return {
    root: {
      clipPath: directionalClipPath(visibleProgress, props.direction),
      opacity: baseOpacity(visibleProgress),
    },
    content: {
      filter: `blur(${isSoft ? pulse * props.intensity * 8 : 0}px)`,
    },
    overlay:
      isNeon || isSoft || isGradient
        ? {
            background: `linear-gradient(${gradientAngle(props.direction)}deg, transparent ${
              edge - edgeWidth
            }%, ${props.color} ${edge}%, transparent ${edge + edgeWidth}%)`,
            filter: isNeon ? `blur(${2 + props.intensity * 4}px)` : undefined,
            mixBlendMode: isNeon ? 'screen' : 'normal',
            opacity: clamp((0.45 + props.intensity * 0.4) * baseOpacity(visibleProgress)),
          }
        : undefined,
  };
};

const resolveRadial = (context: VisualContext): TransitionVisual => ({
  root: {
    clipPath: clockClipPath(context.visibleProgress),
    opacity: baseOpacity(context.visibleProgress),
  },
  overlay: {
    background: `conic-gradient(from -90deg, ${withAlpha(
      context.props.color,
      0.267,
    )}, transparent ${context.progress * 100}%, transparent)`,
    mixBlendMode: 'screen',
    opacity: context.pulse * clamp(context.props.intensity) * 0.42,
  },
});

const resolveIris = (context: VisualContext): TransitionVisual => ({
  root: {
    clipPath: irisClipPath(context.key, context.visibleProgress),
    opacity: baseOpacity(context.visibleProgress),
  },
  content: {
    filter: context.key.includes('vr-')
      ? `saturate(${1 + context.pulse * context.props.intensity * 0.35})`
      : undefined,
  },
  overlay: {
    background: `radial-gradient(circle at 50% 50%, transparent ${
      context.visibleProgress * 67
    }%, ${withAlpha(context.props.color, 1 / 3)} ${
      context.visibleProgress * 72
    }%, transparent ${context.visibleProgress * 79}%)`,
    mixBlendMode: 'screen',
    opacity: context.pulse * clamp(context.props.intensity) * 0.45,
  },
});

const resolveBlock = (context: VisualContext): TransitionVisual => {
  const stepped = Math.round(context.visibleProgress * 12) / 12;
  return {
    root: {
      clipPath: directionalClipPath(clamp(stepped * 1.08), context.props.direction),
      opacity: baseOpacity(context.visibleProgress),
    },
    content: {
      filter: `contrast(${1 + context.pulse * context.props.intensity * 0.22}) saturate(${
        1 + context.pulse * context.props.intensity * 0.28
      })`,
    },
    decoration: context.key.includes('stripe') ? 'stripes' : 'blocks',
  };
};

const resolveGlitch = (context: VisualContext): TransitionVisual => {
  const phase = Math.floor(context.progress * Math.max(1, context.durationInFrames - 1));
  const jumpX = seededSigned(context.props.seed, phase * 3 + 1) * context.pulse;
  const jumpY = seededSigned(context.props.seed, phase * 3 + 2) * context.pulse;
  const flicker = seededUnit(context.props.seed, phase * 3 + 3);
  const isTvPower = context.key.includes('tv-power');
  const scaleY = isTvPower ? Math.max(0.015, context.visibleProgress ** 2) : 1;

  return {
    root: {
      opacity: clamp(context.visibleProgress * (0.78 + flicker * 0.5)),
    },
    content: {
      filter: `contrast(${1 + context.pulse * context.props.intensity * 0.55}) saturate(${
        1 + context.pulse * context.props.intensity * 1.2
      }) hue-rotate(${jumpX * context.props.intensity * 34}deg)`,
      transform: `translate3d(${jumpX * context.props.intensity * 5}%, ${
        jumpY * context.props.intensity * 2.5
      }%, 0) scaleY(${scaleY})`,
    },
    overlay: isTvPower
      ? {
          background: `linear-gradient(transparent 48%, ${context.props.color} 50%, transparent 52%)`,
          mixBlendMode: 'screen',
          opacity: context.pulse * clamp(context.props.intensity),
        }
      : undefined,
    decoration: 'glitch',
  };
};

const resolveBlur = (context: VisualContext): TransitionVisual => {
  const phase = Math.floor(context.progress * Math.max(1, context.durationInFrames - 1));
  const warp = seededSigned(context.props.seed, phase + 311) * context.pulse;
  const radial = context.key.includes('radial');
  const glass = includesAny(context.key, ['glass', 'liquid', 'wave', 'warp']);
  const blur = context.pulse * context.props.intensity * (radial ? 28 : 20);
  return {
    root: { opacity: baseOpacity(context.visibleProgress) },
    content: {
      filter: `blur(${blur}px) saturate(${1 + context.pulse * context.props.intensity * 0.35})`,
      transform: `translate3d(${glass ? warp * context.props.intensity * 2.5 : 0}%, 0, 0) scale(${
        1 + context.pulse * context.props.intensity * (radial ? 0.16 : 0.055)
      }) skewX(${glass ? warp * context.props.intensity * 3 : 0}deg)`,
    },
    overlay: glass
      ? {
          background: `repeating-linear-gradient(105deg, transparent 0 8%, ${withAlpha(
            context.props.secondaryColor,
            0.133,
          )} 9% 11%, transparent 12% 20%)`,
          mixBlendMode: 'screen',
          opacity: context.pulse * clamp(context.props.intensity) * 0.45,
        }
      : undefined,
  };
};

const resolveThreeD = (context: VisualContext): TransitionVisual => {
  const vector = directionVector(context.props.direction);
  const hiddenRotation = 88 * (1 - context.visibleProgress);
  const rotationX = vector.y === 0 ? 0 : hiddenRotation * vector.y * (context.entering ? 1 : -1);
  const rotationY = vector.x === 0 ? hiddenRotation : hiddenRotation * -vector.x;
  const spin = context.key.includes('spin') || context.key.includes('kaleidoscope');

  return {
    root: {
      opacity: baseOpacity(context.visibleProgress),
      perspective: `${900 / Math.max(0.35, context.props.intensity)}px`,
    },
    content: {
      backfaceVisibility: 'hidden',
      filter: `brightness(${0.68 + context.visibleProgress * 0.32})`,
      transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(${
        spin ? (1 - context.visibleProgress) * (context.entering ? -24 : 24) : 0
      }deg) scale(${0.88 + context.visibleProgress * 0.12})`,
      transformOrigin: context.entering ? '50% 50%' : '50% 50%',
      transformStyle: 'preserve-3d',
    },
    overlay: {
      background: `linear-gradient(${gradientAngle(
        context.props.direction,
      )}deg, #0009, transparent 50%, ${withAlpha(context.props.color, 0.2)})`,
      mixBlendMode: 'multiply',
      opacity: (1 - context.visibleProgress) * 0.65,
    },
  };
};

const resolveFold = (context: VisualContext): TransitionVisual => {
  const vector = directionVector(context.props.direction);
  const rotation = (1 - context.visibleProgress) * 92 * (context.entering ? 1 : -1);
  const rotateX = vector.y !== 0 ? rotation * vector.y : 0;
  const rotateY = vector.x !== 0 ? -rotation * vector.x : rotation;
  const origin =
    context.props.direction === 'left'
      ? '0% 50%'
      : context.props.direction === 'right'
        ? '100% 50%'
        : context.props.direction === 'top'
          ? '50% 0%'
          : '50% 100%';

  return {
    root: {
      clipPath: directionalClipPath(clamp(context.visibleProgress * 1.16), context.props.direction),
      opacity: baseOpacity(context.visibleProgress),
      perspective: `${750 / Math.max(0.35, context.props.intensity)}px`,
    },
    content: {
      backfaceVisibility: 'hidden',
      filter: `brightness(${0.62 + context.visibleProgress * 0.38})`,
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transformOrigin: origin,
      transformStyle: 'preserve-3d',
    },
    overlay: {
      background: `linear-gradient(${gradientAngle(context.props.direction)}deg, #000b, transparent 48%, #fff4 52%, transparent)`,
      opacity: (1 - context.visibleProgress) * clamp(0.55 + context.props.intensity * 0.2),
    },
  };
};

const resolveZoom = (context: VisualContext): TransitionVisual => {
  const outward = context.entering ? 1 : -1;
  const distance = 1 - context.visibleProgress;
  const scale = 1 + distance * outward * 0.34 * Math.max(0.2, context.props.intensity);
  const isMobius = context.key.includes('mobius');
  return {
    root: { opacity: baseOpacity(context.visibleProgress) },
    content: {
      filter: `blur(${context.pulse * context.props.intensity * 18}px)`,
      transform: `scale(${Math.max(0.2, scale)}) rotate(${
        isMobius ? distance * (context.entering ? -22 : 22) * context.props.intensity : 0
      }deg)`,
    },
    overlay: {
      background: `radial-gradient(circle, transparent 15%, ${withAlpha(
        context.props.color,
        0.267,
      )} 45%, transparent 72%)`,
      mixBlendMode: 'screen',
      opacity: context.pulse * clamp(context.props.intensity) * 0.55,
      transform: `scale(${0.7 + context.progress * 1.6})`,
    },
  };
};

const resolveSplit = (context: VisualContext): TransitionVisual => {
  const horizontal = context.props.direction === 'left' || context.props.direction === 'right';
  const hidden = (1 - context.visibleProgress) * 50;
  const clipPath = horizontal
    ? `inset(0 ${hidden}% 0 ${hidden}%)`
    : `inset(${hidden}% 0 ${hidden}% 0)`;
  return {
    root: { clipPath, opacity: baseOpacity(context.visibleProgress) },
    content: {
      transform: `scale(${0.94 + context.visibleProgress * 0.06})`,
    },
    overlay: {
      background: horizontal
        ? `linear-gradient(90deg, transparent 48.5%, ${context.props.color} 50%, transparent 51.5%)`
        : `linear-gradient(0deg, transparent 48.5%, ${context.props.color} 50%, transparent 51.5%)`,
      mixBlendMode: 'screen',
      opacity: context.pulse * clamp(context.props.intensity) * 0.5,
    },
  };
};

const resolveLight = (context: VisualContext): TransitionVisual => {
  const sweep = (context.entering ? context.progress : 1 - context.progress) * 140 - 20;
  const flash = context.key.includes('flash');
  const ray = context.key.includes('ray');
  return {
    root: { opacity: baseOpacity(context.visibleProgress) },
    content: {
      filter: `brightness(${1 + context.pulse * context.props.intensity * (flash ? 1.5 : 0.7)}) blur(${
        context.pulse * context.props.intensity * 3
      }px) saturate(${1 + context.pulse * context.props.intensity * 0.45})`,
    },
    overlay: {
      background: ray
        ? `conic-gradient(from 15deg at 50% 50%, transparent 0 8deg, ${withAlpha(
            context.props.color,
            0.6,
          )} 12deg, transparent 18deg 35deg, ${withAlpha(
            context.props.secondaryColor,
            0.467,
          )} 42deg, transparent 52deg 76deg, ${withAlpha(
            context.props.color,
            0.4,
          )} 82deg, transparent 92deg)`
        : `radial-gradient(ellipse at ${sweep}% 50%, ${context.props.color}, ${withAlpha(
            context.props.secondaryColor,
            0.6,
          )} 14%, transparent 45%)`,
      filter: `blur(${4 + context.props.intensity * 10}px)`,
      mixBlendMode: 'screen',
      opacity: context.pulse * clamp(0.35 + context.props.intensity * 0.65),
    },
    overlaySecondary: flash
      ? {
          backgroundColor: context.props.color,
          mixBlendMode: 'screen',
          opacity: context.pulse ** 3 * clamp(context.props.intensity),
        }
      : undefined,
  };
};

const resolveBurn = (context: VisualContext): TransitionVisual => {
  const edge = context.visibleProgress * 100;
  return {
    root: {
      clipPath: directionalClipPath(clamp(context.visibleProgress * 1.08), context.props.direction),
      opacity: baseOpacity(context.visibleProgress),
    },
    content: {
      filter: `brightness(${1 + context.pulse * context.props.intensity * 0.75}) contrast(${
        1 + context.pulse * context.props.intensity * 0.32
      }) saturate(${1 + context.pulse * context.props.intensity * 0.75})`,
    },
    overlay: {
      background: `linear-gradient(${gradientAngle(context.props.direction)}deg, transparent ${
        edge - 16
      }%, ${withAlpha(context.props.secondaryColor, 0.733)} ${edge - 6}%, ${
        context.props.color
      } ${edge}%, #fff ${edge + 2}%, transparent ${edge + 12}%)`,
      filter: `blur(${2 + context.props.intensity * 5}px)`,
      mixBlendMode: 'screen',
      opacity: clamp(context.pulse * (0.55 + context.props.intensity * 0.45)),
    },
  };
};

const resolveVisual = (context: VisualContext): TransitionVisual => {
  switch (context.family) {
    case 'fade':
      return resolveFade(context);
    case 'slide':
      return resolveSlide(context);
    case 'wipe':
      return resolveWipe(context);
    case 'radial':
      return resolveRadial(context);
    case 'iris':
      return resolveIris(context);
    case 'block':
      return resolveBlock(context);
    case 'glitch':
      return resolveGlitch(context);
    case 'blur':
      return resolveBlur(context);
    case 'three-d':
      return resolveThreeD(context);
    case 'fold':
      return resolveFold(context);
    case 'zoom':
      return resolveZoom(context);
    case 'split':
      return resolveSplit(context);
    case 'light':
      return resolveLight(context);
    case 'burn':
      return resolveBurn(context);
  }
};

const resolvePassedProps = (passedProps: Record<string, unknown>): ResolvedTransitionProps => {
  const presetId = stringOr(passedProps.presetId, 'transition');
  const seedValue = passedProps.seed;
  const seed =
    typeof seedValue === 'string' || typeof seedValue === 'number' ? seedValue : presetId;
  const key = `${stringOr(passedProps.engine, 'transition')}:${stringOr(
    passedProps.variant,
    presetId,
  )}:${presetId}`.toLowerCase();
  const directionValue = passedProps.direction;
  const direction =
    directionValue === 'left' ||
    directionValue === 'right' ||
    directionValue === 'top' ||
    directionValue === 'bottom'
      ? directionValue
      : directionFromKey(key, seed);

  return {
    presetId,
    engine: stringOr(passedProps.engine, 'transition'),
    variant: stringOr(passedProps.variant, presetId),
    intensity: clamp(finiteOr(passedProps.intensity, 1), 0, 3),
    seed,
    durationInFrames: Math.max(1, Math.round(finiteOr(passedProps.durationInFrames, 30))),
    color: resolveSafeCssColor(
      passedProps.color,
      key.includes('dip-to-black') ? '#000' : '#ffd166',
      'createPresetTransition() color',
    ),
    secondaryColor: resolveSafeCssColor(
      passedProps.secondaryColor,
      '#ff4d6d',
      'createPresetTransition() secondaryColor',
    ),
    direction,
  };
};

const BlockDecoration = ({
  visibleProgress,
  props,
}: {
  readonly visibleProgress: number;
  readonly props: ResolvedTransitionProps;
}): ReactNode => (
  <AbsoluteFill
    aria-hidden
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
      gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
      overflow: 'hidden',
      pointerEvents: 'none',
    }}
  >
    {Array.from({ length: 24 }, (_, index) => {
      const threshold = seededUnit(props.seed, 1000 + index) * 0.72;
      const cover = 1 - clamp((visibleProgress - threshold) / 0.28);
      const rotate = seededSigned(props.seed, 2000 + index) * 8 * props.intensity;
      return (
        <div
          // A stable positional key is intentional: this grid never reorders.
          key={index}
          style={{
            backgroundColor: index % 3 === 0 ? props.color : props.secondaryColor,
            boxShadow: `inset 0 0 0 1px ${withAlpha(props.color, 0.133)}`,
            opacity: cover * clamp(0.36 + props.intensity * 0.32),
            transform: `scale(${0.82 + cover * 0.2}) rotate(${rotate * cover}deg)`,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

const GlitchDecoration = ({
  progress,
  durationInFrames,
  props,
}: {
  readonly progress: number;
  readonly durationInFrames: number;
  readonly props: ResolvedTransitionProps;
}): ReactNode => {
  const phase = Math.floor(progress * Math.max(1, durationInFrames - 1));
  const strength = (1 - Math.abs(progress * 2 - 1)) * props.intensity;
  return (
    <AbsoluteFill aria-hidden style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 9 }, (_, index) => {
        const top = seededUnit(props.seed, phase * 101 + index) * 94;
        const height = 1 + seededUnit(props.seed, phase * 101 + index + 31) * 8;
        const offset = seededSigned(props.seed, phase * 101 + index + 67) * strength * 16;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: `${top}%`,
              left: `${offset}%`,
              width: '108%',
              height: `${height}%`,
              background:
                index % 2 === 0
                  ? `linear-gradient(90deg, transparent, ${withAlpha(
                      props.color,
                      0.467,
                    )}, transparent)`
                  : `linear-gradient(90deg, ${withAlpha(
                      props.secondaryColor,
                      1 / 3,
                    )}, transparent)`,
              mixBlendMode: index % 2 === 0 ? 'screen' : 'multiply',
              opacity: clamp(strength * (0.14 + seededUnit(props.seed, index + 404) * 0.32)),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const StripeDecoration = ({
  progress,
  props,
}: {
  readonly progress: number;
  readonly props: ResolvedTransitionProps;
}): ReactNode => (
  <AbsoluteFill
    aria-hidden
    style={{
      background: `repeating-linear-gradient(${gradientAngle(
        props.direction,
      )}deg, transparent 0 5%, ${withAlpha(props.color, 0.4)} 5.5% 7%, transparent 7.5% 12%)`,
      mixBlendMode: 'screen',
      opacity: (1 - Math.abs(progress * 2 - 1)) * clamp(props.intensity) * 0.52,
      pointerEvents: 'none',
      transform: `translate3d(${(progress - 0.5) * 24}%, 0, 0)`,
    }}
  />
);

const PresetTransitionPresentation = ({
  children,
  presentationProgress,
  presentationDirection,
  presentationDurationInFrames,
  passedProps,
}: TransitionPresentationComponentProps<Record<string, unknown>>): ReactNode => {
  const props = resolvePassedProps(passedProps);
  const progress = clamp(finiteOr(presentationProgress, 0));
  const easedProgress = smoothstep(progress);
  const entering = presentationDirection === 'entering';
  const visibleProgress = entering ? easedProgress : 1 - easedProgress;
  const pulse = clamp(1 - Math.abs(progress * 2 - 1));
  const durationInFrames = Math.max(
    1,
    Math.round(finiteOr(presentationDurationInFrames, props.durationInFrames)),
  );
  const definitionKey = `${props.engine}:${props.variant}:${props.presetId}`.toLowerCase();
  const family = classifyTransition({
    engine: props.engine as PresetDefinition['engine'],
    id: props.presetId,
    variant: props.variant,
  });
  const visual = resolveVisual({
    family,
    key: definitionKey,
    progress,
    easedProgress,
    visibleProgress,
    pulse,
    entering,
    durationInFrames,
    props,
  });

  return (
    <AbsoluteFill
      data-preset={props.presetId}
      data-transition-family={family}
      style={{
        backfaceVisibility: 'hidden',
        isolation: 'isolate',
        overflow: 'hidden',
        pointerEvents: 'none',
        transformStyle: 'preserve-3d',
        willChange: 'clip-path, filter, opacity, transform',
        zIndex: entering ? 2 : 1,
        ...visual.root,
      }}
    >
      <AbsoluteFill
        style={{
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          willChange: 'filter, transform',
          ...visual.content,
        }}
      >
        {children}
      </AbsoluteFill>
      {visual.overlay ? <div aria-hidden style={{ ...fill, ...visual.overlay }} /> : null}
      {visual.overlaySecondary ? (
        <div aria-hidden style={{ ...fill, ...visual.overlaySecondary }} />
      ) : null}
      {visual.decoration === 'blocks' ? (
        <BlockDecoration props={props} visibleProgress={visibleProgress} />
      ) : null}
      {visual.decoration === 'glitch' ? (
        <GlitchDecoration durationInFrames={durationInFrames} progress={progress} props={props} />
      ) : null}
      {visual.decoration === 'stripes' ? (
        <StripeDecoration progress={progress} props={props} />
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Creates a deterministic TransitionSeries presentation for a registered high-level preset.
 * The transition duration itself is owned by the timing passed to TransitionSeries.Transition.
 */
export const createPresetTransition = <const TId extends string>(
  presetId: CategoryCheckedPresetId<TId, TransitionPresetId>,
  options: PresetOptions = {},
): PresetTransition => {
  const color =
    options.color === undefined
      ? undefined
      : assertSafeCssColor(options.color, 'createPresetTransition() color');
  const secondaryColor =
    options.secondaryColor === undefined
      ? undefined
      : assertSafeCssColor(options.secondaryColor, 'createPresetTransition() secondaryColor');
  const definition = getPresetDefinition(presetId);
  if (definition.kind !== 'transition') {
    throw new TypeError(
      `Preset "${presetId}" is a ${definition.kind} preset and cannot be used as a transition.`,
    );
  }

  const seed = options.seed ?? definition.id;
  const key = getTransitionKey(definition);
  const direction = options.direction ?? directionFromKey(key, seed);
  const durationInFrames = Math.max(
    1,
    Math.round(finiteOr(options.durationInFrames, definition.defaultDurationInFrames)),
  );

  return {
    component: PresetTransitionPresentation,
    props: {
      presetId: definition.id,
      engine: definition.engine,
      variant: definition.variant,
      intensity: clamp(finiteOr(options.intensity, 1), 0, 3),
      seed,
      durationInFrames,
      color:
        color ?? (key.includes('dip-to-white') || key.includes('flash') ? '#ffffff' : '#ffd166'),
      secondaryColor: secondaryColor ?? '#ff4d6d',
      direction,
    },
  };
};
