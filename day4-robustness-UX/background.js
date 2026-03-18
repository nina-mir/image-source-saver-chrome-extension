// resource example
// https://github.com/mv3-examples/example-mv3-contextmenu-executescript

console.log("✅ Service worker loaded", new Date().toISOString());

const MAX_RECORDS = 5000;

// helper: send message and optionally retry once after delay
function sendMessageWithRetry(tabId, message, retryDelayMs = 350) {
  return new Promise((resolve) => {
    function attempt(retried) {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (!chrome.runtime.lastError) {
          resolve({ response, lastError: null });
          return;
        }

        if (!retried) {
          setTimeout(() => attempt(true), retryDelayMs);
        } else {
          resolve({ response: null, lastError: chrome.runtime.lastError });
        }
      });
    }

    attempt(false);
  });
}

// helper function to query if the content script is injected or not
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    return true;
  } catch (err) {
    console.warn("Failed to inject content.js:", err);
    return false;
  }
}

// helper for USER UX improvement ✅❌
async function flashSuccessBadge() {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: "#2e7d32" });
    await chrome.action.setBadgeText({ text: "✓" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1800);
  } catch (err) {
    console.warn("Success badge failed:", err);
  }
}

async function flashWarningBadge() {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: "#b26a00" });
    await chrome.action.setBadgeText({ text: "!" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1800);
  } catch (err) {
    console.warn("Warning badge failed:", err);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: "download-image+info",
    title: "save/log image/info",
    type: "normal",
    contexts: ["image"],
  });
});

// Single click handler for menu item
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Don't take any action if this context menu option is not clicked!
  if (info.menuItemId !== "download-image+info") return;

  if (!tab?.id) {
    console.warn("No tab ID available");
    return;
  }

  const createdAt = new Date().toISOString();
  const imageUrl = info.srcUrl;

  // # 1 - start downloading
  chrome.downloads.download(
    {
      url: imageUrl,
      conflictAction: "uniquify",
      saveAs: false,
    },
    async (downloadId) => {
      const finalDownloadId = chrome.runtime.lastError ? null : downloadId;

      if (chrome.runtime.lastError) {
        // Catch initialization errors (e.g., malformed URL, permissions)
        console.error("Error starting download:", chrome.runtime.lastError.message);
      }

      // # 2 - Ensure content script exists, then ask for metadata
      await ensureContentScript(tab.id);

      let { response, lastError } = await sendMessageWithRetry(
        tab.id,
        {
          type: "DOWNLOAD_EXTRACT_IMAGE_METADATA",
          imageUrl,
        },
        350
      );

      // If messaging still failed, try one more inject + retry
      if (lastError) {
        const injected = await ensureContentScript(tab.id);

        if (injected) {
          const retryResult = await sendMessageWithRetry(
            tab.id,
            {
              type: "DOWNLOAD_EXTRACT_IMAGE_METADATA",
              imageUrl,
            },
            350
          );

          response = retryResult.response;
          lastError = retryResult.lastError;
        }
      }

      let record;

      // If there was no receiver (even after retry), lastError will be set.
      if (lastError) {
        record = {
          id: crypto.randomUUID(),
          createdAt,
          ok: false,
          reason: "no_content_script",
          pageUrl: tab.url || null,
          pageTitle: tab.title || null,
          imageUrl: imageUrl || null,
          downloadId: finalDownloadId,
          notes: "",
          canonicalUrl: "",
          caption: "",
          referrerPolicy: "",
        };

        console.warn(
          "Content script not available; using fallback citation:",
          lastError.message
        );
        console.log("Fallback citation:", record);
      } else if (!response?.ok) {
        record = {
          id: crypto.randomUUID(),
          createdAt,
          ok: false,
          reason: response?.error || "metadata_extraction_failed",
          pageUrl: response?.pageUrl ?? tab.url ?? null,
          pageTitle: response?.pageTitle ?? tab.title ?? null,
          canonicalUrl: response?.canonicalUrl ?? "",
          imageUrl: response?.imageUrl ?? imageUrl ?? null,
          caption: response?.caption ?? "",
          referrerPolicy: response?.referrerPolicy ?? "",
          downloadId: finalDownloadId,
          notes: "",
        }
      } else {
        record = {
          id: crypto.randomUUID(),
          createdAt,
          ok: true,
          pageUrl: response?.pageUrl ?? tab.url ?? null,
          pageTitle: response?.pageTitle ?? tab.title ?? null,
          canonicalUrl: response?.canonicalUrl ?? "",
          imageUrl: response?.imageUrl ?? imageUrl ?? null,
          alt: response?.alt ?? "",
          title: response?.title ?? "",
          ariaLabel: response?.ariaLabel ?? "",
          caption: response?.caption ?? "",
          referrerPolicy: response?.referrerPolicy ?? "",
          downloadId: finalDownloadId,
          notes: "",
        };
      }

      // flash relevant badge info depending on response.ok status
      if (record.ok) {
        await flashSuccessBadge();
      } else {
        await flashWarningBadge();
      }


      // # 3 -- append to storage
      const { records = [] } = await chrome.storage.local.get({ records: [] });

      // if not duplicate add to the records
      if (!isProbablyDuplicate(records, record)) {
        records.push(record);

        // prune oldest
        if (records.length > MAX_RECORDS) {
          records.splice(0, records.length - MAX_RECORDS);
        }

        await chrome.storage.local.set({ records });
      }

      console.log("Total records:", records.length);
      console.log("✅ Saved citation record:", record);
    }
  );
});

// check to prevent accidental duplicates (same pageUrl+imageUrl within 5 seconds)
function isProbablyDuplicate(records, newRecord) {
  const last = records[records.length - 1];
  if (!last) return false;

  const t1 = new Date(last.createdAt).getTime();
  const t2 = new Date(newRecord.createdAt).getTime();

  return (
    last.pageUrl === newRecord.pageUrl &&
    last.imageUrl === newRecord.imageUrl &&
    Math.abs(t2 - t1) < 5000
  );
}