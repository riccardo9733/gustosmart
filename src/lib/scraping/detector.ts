/**
 * Identifica la piattaforma di provenienza di un dato URL.
 */
export function identifyPlatform(url: string): 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'web' {
  if (!url) {
    throw new Error("URL non valido o vuoto");
  }
  
  const cleanUrl = url.trim().toLowerCase();
  
  if (cleanUrl.includes('instagram.com') || cleanUrl.includes('instagr.am')) {
    return 'instagram';
  }
  
  if (cleanUrl.includes('tiktok.com')) {
    return 'tiktok';
  }
  
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    return 'youtube';
  }

  if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
    return 'facebook';
  }
  
  return 'web';
}
