// resource example
// https://github.com/mv3-examples/example-mv3-contextmenu-executescript

// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled

console.log("✅ Service worker loaded", new Date().toISOString());


chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: "log-image-info",
    title: "log image info",
    type: 'normal',
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: "log-page-info",
    title: "log page info",
    type: 'normal',
    contexts: ['image']
  });
});

// Single click handler for both menu items

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const timestamp = new Date().toISOString();

  if (!tab?.id) {
    console.warn("No tab ID available");
    return;
  }


  // send message to content.js
  chrome.tabs.sendMessage(tab.id, {
    type: "EXTRACT_IMAGE_METADATA",
    imageUrl: info.srcUrl
  }, (response) => {
    // If there was no receiver, chrome.runtime.lastError is set.
    if (chrome.runtime.lastError) {
      // Graceful fallback citation record
      const fallback = {
        ok: false,
        reason: "no_content_script",
        pageUrl: tab.url || null,
        pageTitle: tab.title || null,
        imageUrl: info.srcUrl || null,
        timestamp: new Date().toISOString()
      };

      // Do whatever you would do with a normal citation record:
      // for now we log it — replace this with chrome.storage or upload as needed.
      console.warn("Content script not available; using fallback citation:", chrome.runtime.lastError.message);
      console.log("Fallback citation:", fallback);
      return; // IMPORTANT — stop here
    }

    // Success: content script replied with a full record
    console.log("Citation record:", response);
  });

  // Extra logs per menu item
  const ts = new Date().toISOString();
  if (info.menuItemId === "log-image-info") {
    console.log(`[${ts}] log-image-info clicked`, { imageSrc: info.srcUrl, pageUrl: tab.url });
  } else if (info.menuItemId === "log-page-info") {
    console.log(`[${ts}] log-page-info clicked`, { pageTitle: tab.title, pageUrl: tab.url });
  }
});
