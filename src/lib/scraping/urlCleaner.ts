/**
 * Utility containing cleanUrl and resolveRedirect to canonicalize URLs
 * for Instagram, TikTok, YouTube, Facebook, and Web recipes.
 */

/**
 * Synchronously cleans an URL: normalizes hostname, strips tracking/unnecessary query parameters,
 * and standardizes paths for social media links.
 */
export function cleanUrl(url: string): string {
  try {
    const trimmed = url.trim();
    if (!trimmed) return "";
    
    // Add protocol if missing
    let urlString = trimmed;
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = "https://" + urlString;
    }

    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();
    
    // 1. Instagram
    if (host.includes("instagram.com") || host === "instagr.am") {
      parsed.hostname = "www.instagram.com";
      parsed.search = ""; // Remove all tracking params
      
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      // Look for "reel", "p", or "reels"
      const reelOrPIndex = pathParts.findIndex(p => p === "reel" || p === "p" || p === "reels");
      if (reelOrPIndex !== -1 && pathParts[reelOrPIndex + 1]) {
        let type = pathParts[reelOrPIndex];
        if (type === "reels") type = "reel"; // normalize reels to reel
        const shortcode = pathParts[reelOrPIndex + 1];
        parsed.pathname = `/${type}/${shortcode}`;
      }
    } 
    // 2. TikTok
    else if (host.includes("tiktok.com")) {
      parsed.hostname = "www.tiktok.com";
      parsed.search = ""; // Remove all parameters
      
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      // Canonical format: /@username/video/video_id
      if (pathParts.length >= 3 && pathParts[1] === "video") {
        parsed.pathname = `/${pathParts[0]}/video/${pathParts[2]}`;
      }
    } 
    // 3. YouTube
    else if (host.includes("youtube.com") || host === "youtu.be") {
      if (host === "youtu.be") {
        parsed.hostname = "www.youtube.com";
        const videoId = parsed.pathname.replace(/^\//, "");
        parsed.pathname = "/watch";
        parsed.search = `?v=${videoId}`;
      } else {
        parsed.hostname = "www.youtube.com";
        if (parsed.pathname.includes("/shorts/")) {
          const pathParts = parsed.pathname.split("/").filter(Boolean);
          const videoId = pathParts[pathParts.length - 1];
          parsed.pathname = `/shorts/${videoId}`;
          parsed.search = "";
        } else if (parsed.pathname === "/watch") {
          const videoId = parsed.searchParams.get("v");
          parsed.search = videoId ? `?v=${videoId}` : "";
        } else {
          parsed.search = "";
        }
      }
    } 
    // 4. Facebook
    else if (host.includes("facebook.com") || host === "fb.watch") {
      parsed.hostname = "www.facebook.com";
      // fb.watch links will be resolved on the server side first, but if processed directly:
      if (parsed.pathname === "/watch/" || parsed.pathname === "/watch") {
        const videoId = parsed.searchParams.get("v");
        parsed.search = videoId ? `?v=${videoId}` : "";
      } else {
        parsed.search = "";
      }
    } 
    // 5. Generic Web Recipe URLs
    else {
      // Strip common tracking and analytics parameters
      const trackingParams = [
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", 
        "fbclid", "gclid", "yclid", "ttclid", "igsh"
      ];
      trackingParams.forEach(param => parsed.searchParams.delete(param));
    }

    // Strip trailing slash for absolute uniformity
    let result = parsed.toString();
    if (result.endsWith("/")) {
      result = result.slice(0, -1);
    }
    return result;
  } catch (e) {
    return url;
  }
}

/**
 * Asynchronously follows HTTP redirects for known shortener domains on the server side.
 */
export async function resolveRedirect(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return "";

  let urlString = trimmed;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = "https://" + urlString;
  }

  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();

    // Check if it is a redirect domain
    const isShortUrl = 
      host.includes("vm.tiktok.com") ||
      host.includes("fb.watch") ||
      host.includes("youtu.be") ||
      host.includes("instagr.am") ||
      host.includes("facebook.com/reel"); // Facebook reels redirect significantly sometimes

    if (!isShortUrl) {
      return urlString;
    }

    // Attempt to follow redirect with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      // HEAD is faster and avoids body payload download
      const response = await fetch(urlString, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      clearTimeout(timeoutId);
      return response.url;
    } catch (headErr) {
      // Fallback to GET since HEAD is sometimes blocked
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 4000);
      try {
        const response = await fetch(urlString, {
          method: "GET",
          redirect: "follow",
          signal: getController.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        clearTimeout(getTimeoutId);
        return response.url;
      } catch (getErr) {
        clearTimeout(getTimeoutId);
        console.warn("[urlCleaner] Failed GET fallback to resolve redirect:", urlString, getErr);
      }
    }
  } catch (err) {
    console.error("[urlCleaner] Error resolving redirect:", urlString, err);
  }

  return urlString;
}
