"use strict";
// 1. boot / guard

// add an injection guard inside content.js
// Wrapping the entire whole content.js so it only initializes once per page.
if (window.__IMG_CITATION_TOOL_LOADED__) {
  console.log("content.js already loaded");
} else {
  window.__IMG_CITATION_TOOL_LOADED__ = true;

  // 2. url helpers

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

  // 3. image matching helpers
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

  // 4. page metadata helpers

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

  // 5. semantic extraction helpers

  /* 5.A page-level semantics:
        hostname
        metaDescription
        ogTitle
        ogDescription
  */
  function getHostname() {
    return window.location.hostname || "";
  }

  function getMetaDescription() {
    return document.querySelector("meta[name='description']")?.content || "";
  }

  function getOgTitle() {
    return document.querySelector("meta[property='og:title']")?.content || "";
  }

  function getOgDescription() {
    return document.querySelector("meta[property='og:description']")?.content || "";
  }




  //.... TODO


  // 6. response payload builders
  function buildFailurePayload({ imgUrl, pageUrl, pageTitle, canonicalUrl, error }) {
    return {
      ok: false,
      error,
      pageUrl,
      pageTitle,
      canonicalUrl,
      imageUrl: normalizeUrl(imgUrl),
    };
  }

  function buildSuccessPayload({ imgEl, imgUrl, pageUrl, pageTitle, canonicalUrl }) {
    return {
      ok: true,
      pageUrl,
      pageTitle,
      canonicalUrl,
      imageUrl: normalizeUrl(imgEl.currentSrc || imgEl.src || imgUrl),
      alt: (imgEl.getAttribute("alt") || "").trim(),
      title: (imgEl.getAttribute("title") || "").trim(),
      ariaLabel: (imgEl.getAttribute("aria-label") || "").trim(),
      caption: getFigcaption(imgEl),
      referrerPolicy: getReferrerPolicy(imgEl),
    };
  }


  // 7. message listener

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.type !== "DOWNLOAD_EXTRACT_IMAGE_METADATA") return;

    const imgUrl = request.imageUrl || "";
    const imgEl = findBestMatchingImage(imgUrl);

    const pageUrl = location.href;
    const pageTitle = document.title;

    // page-level
    const canonicalUrl = getCanonicalUrl();

    if (!imgEl) {
      sendResponse(
        buildFailurePayload({
          imgUrl,
          pageUrl,
          pageTitle,
          canonicalUrl,
          error: "no_matching_img",
        })
      );
      return; // sync response
    }

    sendResponse(
      buildSuccessPayload({
        imgEl,
        imgUrl,
        pageUrl,
        pageTitle,
        canonicalUrl,
      })
    );

    return true;
  });



}

