import { describe, it, expect } from 'vitest';
import { identifyPlatform } from './detector';

describe('identifyPlatform', () => {
  it('correctly identifies instagram URLs', () => {
    expect(identifyPlatform('https://www.instagram.com/p/C123456/')).toBe('instagram');
    expect(identifyPlatform('http://instagr.am/reel/AbC/')).toBe('instagram');
    expect(identifyPlatform('  https://instagram.com/reels/xyz   ')).toBe('instagram');
  });

  it('correctly identifies tiktok URLs', () => {
    expect(identifyPlatform('https://www.tiktok.com/@user/video/7123456789')).toBe('tiktok');
    expect(identifyPlatform('https://vm.tiktok.com/xyz123/')).toBe('tiktok');
  });

  it('correctly identifies youtube URLs', () => {
    expect(identifyPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(identifyPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(identifyPlatform('https://www.youtube.com/shorts/abc')).toBe('youtube');
  });

  it('correctly identifies facebook URLs', () => {
    expect(identifyPlatform('https://www.facebook.com/watch/?v=123')).toBe('facebook');
    expect(identifyPlatform('https://fb.watch/xyz/')).toBe('facebook');
  });

  it('correctly identifies other URLs as web', () => {
    expect(identifyPlatform('https://giallozafferano.it/ricetta/pasta-alla-carbonara')).toBe('web');
    expect(identifyPlatform('http://example.com/some/recipe')).toBe('web');
  });

  it('throws an error for empty or invalid URLs', () => {
    expect(() => identifyPlatform('')).toThrow('URL non valido o vuoto');
    // @ts-ignore
    expect(() => identifyPlatform(null)).toThrow('URL non valido o vuoto');
  });
});
