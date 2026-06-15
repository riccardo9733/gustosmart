import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanUrl, resolveRedirect } from './urlCleaner';

describe('cleanUrl', () => {
  it('adds https protocol if missing and trims spaces', () => {
    expect(cleanUrl('  example.com/recipe/ ')).toBe('https://example.com/recipe');
  });

  it('normalizes Instagram URLs and strips tracking parameters', () => {
    expect(cleanUrl('https://instagram.com/p/C_abc123/?igsh=abcdef')).toBe('https://www.instagram.com/p/C_abc123');
    expect(cleanUrl('https://www.instagram.com/reels/xyz/?utm_medium=copy')).toBe('https://www.instagram.com/reel/xyz');
    expect(cleanUrl('instagr.am/reel/123')).toBe('https://www.instagram.com/reel/123');
  });

  it('normalizes TikTok URLs and removes parameters', () => {
    expect(cleanUrl('https://tiktok.com/@chef/video/1234567890?is_copy_url=1&sender_device=pc')).toBe('https://www.tiktok.com/@chef/video/1234567890');
  });

  it('normalizes YouTube URLs', () => {
    expect(cleanUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(cleanUrl('https://www.youtube.com/shorts/xyz/?feature=share')).toBe('https://www.youtube.com/shorts/xyz');
    expect(cleanUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('normalizes Facebook watch URLs', () => {
    expect(cleanUrl('https://facebook.com/watch/?v=123&ref=share')).toBe('https://www.facebook.com/watch/?v=123');
    expect(cleanUrl('https://fb.watch/xyz/')).toBe('https://www.facebook.com/xyz');
  });

  it('cleans generic web URLs of common tracking parameters', () => {
    expect(cleanUrl('https://example.com/recipe?utm_source=fb&fbclid=123&gclid=456&keep_this=true')).toBe('https://example.com/recipe?keep_this=true');
  });

  it('returns empty string if input is empty', () => {
    expect(cleanUrl('')).toBe('');
    expect(cleanUrl('   ')).toBe('');
  });
});

describe('resolveRedirect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns immediately for non-short URLs', async () => {
    const url = 'https://www.giallozafferano.it/ricetta/pasta-alla-carbonara';
    const result = await resolveRedirect(url);
    expect(result).toBe(url);
  });

  it('follows redirect using HEAD request first', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      url: 'https://www.tiktok.com/@chef/video/12345'
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await resolveRedirect('https://vm.tiktok.com/xyz123');
    expect(result).toBe('https://www.tiktok.com/@chef/video/12345');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://vm.tiktok.com/xyz123',
      expect.objectContaining({ method: 'HEAD' })
    );
  });

  it('falls back to GET request if HEAD request fails', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('HEAD method not allowed'))
      .mockResolvedValueOnce({
        url: 'https://www.instagram.com/reel/123'
      });
    vi.stubGlobal('fetch', mockFetch);

    const result = await resolveRedirect('https://instagr.am/reel/123');
    expect(result).toBe('https://www.instagram.com/reel/123');
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://instagr.am/reel/123',
      expect.objectContaining({ method: 'HEAD' })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://instagr.am/reel/123',
      expect.objectContaining({ method: 'GET' })
    );
  });
});
