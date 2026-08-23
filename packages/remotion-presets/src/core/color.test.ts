import { describe, expect, it } from 'vitest';

import { assertSafeCssColor, isSafeCssColor, resolveSafeCssColor } from './color';

describe('isSafeCssColor()', () => {
  it.each([
    '#fff',
    '#FfFa',
    '#112233',
    '#11223344',
    ' transparent ',
    'black',
    'WHITE',
    'red',
    'green',
    'blue',
    'rebeccapurple',
    'rgb(255, 0, 127)',
    'rgb(100%, 0%, 49.5%)',
    'rgba(255, 0, 127, 0.5)',
    'rgba(100%, 0%, 50%, 75%)',
    'rgb(255 0 127)',
    'rgb(255 0 127 / 0.5)',
    'rgb(100% 0% 50% / 75%)',
    'rgba(255 0 127 / 50%)',
    'hsl(180, 50%, 40%)',
    'hsla(180, 50%, 40%, .25)',
    'hsl(-180deg 50% 40% / 25%)',
    'hsl(.5turn 50% 40%)',
    'hsla(3.14rad 50% 40% / 1)',
    'hsl(200grad 50% 40%)',
  ])('accepts %s', (color) => {
    expect(isSafeCssColor(color)).toBe(true);
  });

  it.each([
    '',
    '   ',
    '#12',
    '#12345',
    '#ggg',
    'not-a-color',
    'currentColor',
    'url(https://attacker.example/pixel)',
    'var(--attacker-color)',
    'expression(alert(1))',
    'red; background: url(https://attacker.example/pixel)',
    'red, blue',
    'red\nbackground:black',
    'rgb(NaN, 0, 0)',
    'rgb(Infinity, 0, 0)',
    'rgb(1e2, 0, 0)',
    'rgb(calc(1 + 1), 0, 0)',
    'rgb(256, 0, 0)',
    'rgb(-1, 0, 0)',
    'rgb(10%, 20, 30%)',
    'rgb(0, 0)',
    'rgb(0, 0, 0, 0.5)',
    'rgb(0 0 0 / 2)',
    'rgb(0 0 0 / -1)',
    'rgb(0 0 0 / NaN)',
    'rgba(0 0 0)',
    'rgba(0, 0, 0)',
    'rgba(0, 0, 0, 1, 1)',
    'hsl(361, 50%, 40%)',
    'hsl(180, 101%, 40%)',
    'hsl(180, 50, 40%)',
    'hsl(180 50% 40% / Infinity)',
    'hsl(180deg, 50%, 40% / .5)',
    'hsla(180 50% 40%)',
    'rgb(0/*x*/ 0 0)',
    'rgb(0 0 0));color:red',
    'rgb(0 0 0 / .5) url(x)',
    'a'.repeat(129),
    null,
    undefined,
    123,
    {},
  ])('rejects %s', (color) => {
    expect(isSafeCssColor(color)).toBe(false);
  });
});

describe('color assertions', () => {
  it('returns a normalized boundary value and preserves a fallback', () => {
    expect(assertSafeCssColor('  #AbC  ', 'color')).toBe('#AbC');
    expect(resolveSafeCssColor(undefined, '#fff', 'color')).toBe('#fff');
  });

  it('throws TypeError without reflecting the untrusted value', () => {
    const attack = 'url(https://secret.example/token)';
    expect(() => assertSafeCssColor(attack, 'secondaryColor')).toThrowError(TypeError);

    try {
      assertSafeCssColor(attack, 'secondaryColor');
    } catch (error) {
      expect(String(error)).not.toContain('secret.example');
    }
  });
});
