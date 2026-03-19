"use strict";
// add an injection guard inside content.js
// Wrapping the entire whole content.js so it only initializes once per page.
if (window.__IMG_CITATION_TOOL_LOADED__) {
  console.log("content.js already loaded");
} else {
  window.__IMG_CITATION_TOOL_LOADED__ = true;

  function normalizeUrl(url) {
    try {
      return new URL(url, document.baseURI).href;
    } catch {
      return url;
    }
  }

  // comparison helper: ignore query + hash (CDN cache-busters, size params, etc.)
  function normalizeForCompare(url) {
    try {
      const u = new URL(url, document.baseURI);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  // pull possible URLs from an <img> including common lazy-load patterns
  function getCandidateUrls(img) {
    const urls = [];

    // standard sources
    if (img.currentSrc) urls.push(img.currentSrc);
    if (img.src) urls.push(img.src);

    // common lazy-load attributes
    const lazyAttrs = [
      "data-src",
      "data-original",
      "data-lazy-src",
      "data-url",
      "data-image",
      "data-img",
      "data-source",
      "data-srcset",
    ];

    for (const a of lazyAttrs) {
      const v = img.getAttribute(a);
      if (v) urls.push(v);
    }

    // normalize and de-dupe
    const normalized = urls.map(normalizeUrl).filter(Boolean);
    return Array.from(new Set(normalized));
  }

  function findBestMatchingImage(requestedUrl) {
    const targetExact = normalizeUrl(requestedUrl);
    const targetLoose = normalizeForCompare(requestedUrl);

    const imgs = Array.from(document.images);

    const matches = imgs.filter((img) => {
      const candidates = getCandidateUrls(img);

      return candidates.some((c) => {
        if (c === targetExact) return true;
        if (normalizeForCompare(c) === targetLoose) return true;
        return false;
      });
    });

    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // If multiple matches, prefer the one that's "most visible" / largest rendered area
    let best = matches[0];
    let bestArea = 0;

    for (const img of matches) {
      const rect = img.getBoundingClientRect();
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      if (area > bestArea) {
        bestArea = area;
        best = img;
      }
    }

    return best;
  }

  // --- Chunk 3B helpers ---

  function getCanonicalUrl() {
    const link = document.querySelector('link[rel="canonical"]');
    const href = link?.getAttribute("href") || "";
    return href ? normalizeUrl(href) : "";
  }

  function getFigcaption(imgEl) {
    const fig = imgEl.closest("figure");
    if (!fig) return "";
    const cap = fig.querySelector("figcaption");
    return (cap?.innerText || "").trim();
  }

  function getReferrerPolicy(imgEl) {
    // property is usually fine; fallback to attribute
    return (imgEl.referrerPolicy || imgEl.getAttribute("referrerpolicy") || "").trim();
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.type !== "DOWNLOAD_EXTRACT_IMAGE_METADATA") return;

    const imgUrl = request.imageUrl || "";
    const imgEl = findBestMatchingImage(imgUrl);

    const pageUrl = location.href;
    const pageTitle = document.title;

    // 3B fields (page-level)
    const canonicalUrl = getCanonicalUrl();

    if (!imgEl) {
      sendResponse({
        ok: false,
        error: "no_matching_img",
        pageUrl,
        pageTitle,
        canonicalUrl,
        imageUrl: normalizeUrl(imgUrl),
      });
      return; // sync response
    }

    const alt = (imgEl.getAttribute("alt") || "").trim();
    const title = (imgEl.getAttribute("title") || "").trim();
    const ariaLabel = (imgEl.getAttribute("aria-label") || "").trim();

    // 3B fields (image-level)
    const caption = getFigcaption(imgEl);
    const referrerPolicy = getReferrerPolicy(imgEl);

    sendResponse({
      ok: true,
      pageUrl,
      pageTitle,
      canonicalUrl,
      imageUrl: normalizeUrl(imgEl.currentSrc || imgEl.src || imgUrl),
      alt,
      title,
      ariaLabel,
      caption,
      referrerPolicy,
    });

    return true;
  });
}

