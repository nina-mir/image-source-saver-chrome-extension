// resource example
// https://github.com/mv3-examples/example-mv3-contextmenu-executescript

// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled

console.log("✅ Service worker loaded", new Date().toISOString());


chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.create({
        id: "download-image+info",
        title: "save/log image/info",
        type: 'normal',
        contexts: ['image']
    });
});

// Single click handler for menu item

chrome.contextMenus.onClicked.addListener((info, tab) => {
    const timestamp = new Date().toISOString();

    if (!tab?.id) {
        console.warn("No tab ID available");
        return;
    }

    // Download image logic

    function onFailed(error) {
        console.log(`Download failed: ${error}`);
    }

    chrome.downloads.download({
        url: info.srcUrl,
        // filename: 'suggested-filename.png', // Optional: suggests a path relative to the default downloads directory
        conflictAction: 'uniquify', // Optional: renames the file if a conflict exists (e.g., 'file(1).png')
        saveAs: false // Optional: if true, the "Save As" dialog will appear
    }, (downloadId) => {
        console.log(`Download started with ID: ${downloadId}`);
        // Optional: revoke the object URL once the download starts
        // Note: this may cause issues if the download is delayed, handle with care.
        // URL.revokeObjectURL(objectUrl); 
    }).then(null, onFailed);


    // send message to content.js
    chrome.tabs.sendMessage(tab.id, {
        type: "DOWNLOAD_EXTRACT_IMAGE_METADATA",
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
                timestamp: timestamp
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
    if (info.menuItemId === "download-image+info") {
        console.log(`[${ts}] download-image+info clicked`,
            { pageTitle: tab.title, imageSrc: info.srcUrl, pageUrl: tab.url });
    }
});
