import { Easing } from 'remotion';

export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const seededUnit = (seed: string | number, salt = 0): number => {
  const hash = hashString(`${seed}:${salt}`);
  return hash / 0xffffffff;
};

export const seededSigned = (seed: string | number, salt = 0): number =>
  seededUnit(seed, salt) * 2 - 1;

export const progressForFrame = (frame: number, durationInFrames: number): number => {
  const safeDuration = Math.max(1, Math.round(durationInFrames));
  return clamp(frame / Math.max(1, safeDuration - 1));
};

export const smoothstep = (value: number): number => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};

export const easeOut = (value: number): number => Easing.out(Easing.cubic)(clamp(value));

export const easeInOut = (value: number): number => Easing.inOut(Easing.cubic)(clamp(value));

export const lerp = (from: number, to: number, progress: number): number =>
  from + (to - from) * clamp(progress);

export const pulse = (progress: number, center = 0.5, width = 0.25): number => {
  const distance = Math.abs(progress - center);
  return clamp(1 - distance / Math.max(0.0001, width));
};

export const stableHue = (id: string, offset = 0): number =>
  Math.round((hashString(id) + offset * 137.508) % 360);
