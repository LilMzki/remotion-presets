const NAMED_COLORS = new Set([
  'aqua',
  'black',
  'blue',
  'brown',
  'cyan',
  'fuchsia',
  'gold',
  'gray',
  'green',
  'grey',
  'indigo',
  'lime',
  'magenta',
  'maroon',
  'navy',
  'olive',
  'orange',
  'pink',
  'purple',
  'rebeccapurple',
  'red',
  'silver',
  'teal',
  'transparent',
  'violet',
  'white',
  'yellow',
]);

const MAX_COLOR_LENGTH = 128;
const UNSIGNED_NUMBER = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
const SIGNED_NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

const parseNumber = (value: string, pattern: RegExp): number | null => {
  if (!pattern.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const inRange = (value: number | null, min: number, max: number): boolean =>
  value !== null && value >= min && value <= max;

const hasControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) {
      return true;
    }
  }

  return false;
};

const parsePercentage = (value: string): number | null => {
  if (!value.endsWith('%')) {
    return null;
  }

  const parsed = parseNumber(value.slice(0, -1), UNSIGNED_NUMBER);
  return inRange(parsed, 0, 100) ? parsed : null;
};

const isAlpha = (value: string): boolean => {
  if (value.endsWith('%')) {
    return parsePercentage(value) !== null;
  }

  return inRange(parseNumber(value, UNSIGNED_NUMBER), 0, 1);
};

const isRgbChannels = (channels: readonly string[]): boolean => {
  if (channels.length !== 3) {
    return false;
  }

  const percentageSyntax = channels[0]?.endsWith('%') ?? false;
  if (channels.some((channel) => channel.endsWith('%') !== percentageSyntax)) {
    return false;
  }

  return percentageSyntax
    ? channels.every((channel) => parsePercentage(channel) !== null)
    : channels.every((channel) => inRange(parseNumber(channel, UNSIGNED_NUMBER), 0, 255));
};

const isHue = (value: string): boolean => {
  const match = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(deg|grad|rad|turn)?$/.exec(value);
  if (!match) {
    return false;
  }

  const amount = parseNumber(match[1] ?? '', SIGNED_NUMBER);
  if (amount === null) {
    return false;
  }

  switch (match[2]) {
    case 'turn':
      return amount >= -1 && amount <= 1;
    case 'rad':
      return amount >= -2 * Math.PI && amount <= 2 * Math.PI;
    case 'grad':
      return amount >= -400 && amount <= 400;
    case 'deg':
    case undefined:
      return amount >= -360 && amount <= 360;
    default:
      return false;
  }
};

const splitModernFunction = (
  body: string,
): { readonly channels: readonly string[]; readonly alpha?: string } | null => {
  const slashParts = body.split('/');
  if (slashParts.length > 2) {
    return null;
  }

  const channels = (slashParts[0] ?? '').trim().split(/ +/);
  const alpha = slashParts[1]?.trim();
  if (channels.some((channel) => channel.length === 0) || alpha === '') {
    return null;
  }

  return alpha === undefined ? { channels } : { channels, alpha };
};

const isRgbFunction = (name: 'rgb' | 'rgba', body: string): boolean => {
  if (body.includes(',')) {
    if (body.includes('/')) {
      return false;
    }

    const parts = body.split(',').map((part) => part.trim());
    const expectedLength = name === 'rgba' ? 4 : 3;
    if (parts.length !== expectedLength || parts.some((part) => part.length === 0)) {
      return false;
    }

    return isRgbChannels(parts.slice(0, 3)) && (name === 'rgb' || isAlpha(parts[3] ?? ''));
  }

  const parsed = splitModernFunction(body);
  if (!parsed || !isRgbChannels(parsed.channels)) {
    return false;
  }

  if (name === 'rgba' && parsed.alpha === undefined) {
    return false;
  }

  return parsed.alpha === undefined || isAlpha(parsed.alpha);
};

const isHslChannels = (channels: readonly string[]): boolean =>
  channels.length === 3 &&
  isHue(channels[0] ?? '') &&
  parsePercentage(channels[1] ?? '') !== null &&
  parsePercentage(channels[2] ?? '') !== null;

const isHslFunction = (name: 'hsl' | 'hsla', body: string): boolean => {
  if (body.includes(',')) {
    if (body.includes('/')) {
      return false;
    }

    const parts = body.split(',').map((part) => part.trim());
    const expectedLength = name === 'hsla' ? 4 : 3;
    if (parts.length !== expectedLength || parts.some((part) => part.length === 0)) {
      return false;
    }

    return isHslChannels(parts.slice(0, 3)) && (name === 'hsl' || isAlpha(parts[3] ?? ''));
  }

  const parsed = splitModernFunction(body);
  if (!parsed || !isHslChannels(parsed.channels)) {
    return false;
  }

  if (name === 'hsla' && parsed.alpha === undefined) {
    return false;
  }

  return parsed.alpha === undefined || isAlpha(parsed.alpha);
};

/**
 * Validates the intentionally small, context-free CSS color subset accepted by
 * public preset options. It never touches the DOM, so it is deterministic in
 * Node, SSR and Remotion's renderer.
 */
export const isSafeCssColor = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > MAX_COLOR_LENGTH) {
    return false;
  }

  if (hasControlCharacter(value)) {
    return false;
  }

  const color = value.trim().toLowerCase();
  if (color.length === 0 || color.length > MAX_COLOR_LENGTH) {
    return false;
  }

  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/.test(color)) {
    return true;
  }

  if (NAMED_COLORS.has(color)) {
    return true;
  }

  const functional = /^(rgb|rgba|hsl|hsla)\(([^()]*)\)$/.exec(color);
  if (!functional) {
    return false;
  }

  const name = functional[1];
  const body = functional[2] ?? '';
  if (!/^[\d .,%/+\-a-z]*$/.test(body)) {
    return false;
  }

  return name === 'rgb' || name === 'rgba'
    ? isRgbFunction(name, body)
    : isHslFunction(name as 'hsl' | 'hsla', body);
};

/** Returns a trimmed safe CSS color or throws without reflecting untrusted input. */
export const assertSafeCssColor = (value: unknown, optionName = 'color'): string => {
  if (!isSafeCssColor(value)) {
    throw new TypeError(
      `${optionName} must be a safe CSS color: hex, a supported named color, rgb()/rgba(), or hsl()/hsla().`,
    );
  }

  return value.trim();
};

/** Validates an optional public color option while preserving an internal fallback. */
export const resolveSafeCssColor = (
  value: unknown,
  fallback: string,
  optionName = 'color',
): string => (value === undefined ? fallback : assertSafeCssColor(value, optionName));
