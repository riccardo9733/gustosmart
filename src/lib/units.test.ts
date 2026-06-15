import { describe, it, expect } from 'vitest';
import { convertToImperial } from './units';

describe('convertToImperial', () => {
  it('converts grams to ounces correctly', () => {
    // 100g / 28.34952 = 3.527 -> 3.5 oz
    expect(convertToImperial(100, 'g')).toEqual({ quantity: 3.5, unit: 'oz' });
    expect(convertToImperial(50, 'g')).toEqual({ quantity: 1.8, unit: 'oz' });
  });

  it('converts milliliters to fluid ounces correctly', () => {
    // 100ml / 29.57353 = 3.381 -> 3.4 fl oz
    expect(convertToImperial(100, 'ml')).toEqual({ quantity: 3.4, unit: 'fl oz' });
    expect(convertToImperial(250, 'ml')).toEqual({ quantity: 8.5, unit: 'fl oz' });
  });

  it('is case insensitive and handles leading/trailing spaces for units', () => {
    expect(convertToImperial(100, ' G ')).toEqual({ quantity: 3.5, unit: 'oz' });
    expect(convertToImperial(100, 'Ml')).toEqual({ quantity: 3.4, unit: 'fl oz' });
  });

  it('returns original quantity and unit if unit is unknown', () => {
    expect(convertToImperial(5, 'cucchiai')).toEqual({ quantity: 5, unit: 'cucchiai' });
    expect(convertToImperial(2, 'pz')).toEqual({ quantity: 2, unit: 'pz' });
  });
});
