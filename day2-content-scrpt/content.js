
function normalizeUrl(url) {
    try {
        return new URL(url, document.baseURI).href;
    } catch {
        return url;
    }
}

function findBestMatchingImage(requestedUrl) {
    const target = normalizeUrl(requestedUrl);

    // Gather candidates that match by src/currentSrc
    const imgs = Array.from(document.images);
    const matches = imgs.filter((img) => {
        const src = normalizeUrl(img.currentSrc || img.src || "");
        return src === target;
    });

    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // If multiple matches, prefer the one that's "most visible" / largest
    // (Simple heuristic: choose the largest rendered area)
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


chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request?.type != "EXTRACT_IMAGE_METADATA") return

        const imgUrl = request.imageUrl || "";
        const imgEl = findBestMatchingImage(imgUrl)

        const pageUrl = location.href;
        const pageTitle = document.title;

        if (!imgEl) {
            sendResponse({
                ok: false,
                error: "No matching <img> found for imageUrl",
                pageUrl,
                pageTitle,
                imageUrl: normalizeUrl(imgUrl),
            });
            return; // sync response
        }

        const alt = (imgEl.getAttribute("alt") || "").trim();
        const title = (imgEl.getAttribute("title") || "").trim();
        const ariaLabel = (imgEl.getAttribute("aria-label") || "").trim();
        // const figcaption = getFigcaption(imgEl);
        // const nearby = getNearbyTextSnippet(imgEl);

        sendResponse({
            ok: true,
            pageUrl,
            pageTitle,
            imageUrl: normalizeUrl(imgEl.currentSrc || imgEl.src || imgUrl),
            alt,
            title,
            ariaLabel
        });


        // Note: If you want to use async operations (like fetch or storage API calls)
        // before sending a response, you must return `true` from the listener
        // to indicate that you will send the response asynchronously.
        // Example: return true;
        return true; // always safe to include

    }
);