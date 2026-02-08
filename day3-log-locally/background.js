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

    // Don't take any action if this context menu option is not clicked!
    if (info.menuItemId !== "download-image+info") return;

    if (!tab?.id) {
        console.warn("No tab ID available");
        return;
    }

    const createdAt = new Date().toISOString();
    const imageUrl = info.srcUrl;

    // # 1 - start downloading 
    chrome.downloads.download({
        url: imageUrl,
        // filename: 'suggested-filename.png', // Optional: suggests a path relative to the default downloads directory
        conflictAction: 'uniquify', // Optional: renames the file if a conflict exists (e.g., 'file(1).png')
        saveAs: false // Optional: if true, the "Save As" dialog will appear
    }, (downloadId) => {

        const finalDownloadId = chrome.runtime.lastError ? null : downloadId;
        if (chrome.runtime.lastError) {
            // Catch initialization errors (e.g., malformed URL, permissions)
            console.error("Error starting download:", chrome.runtime.lastError.message);
        }

        // # 2 - Ask content script for metadata
        // send message to content.js
        chrome.tabs.sendMessage(tab.id, {
            type: "DOWNLOAD_EXTRACT_IMAGE_METADATA",
            imageUrl
        }, async (response) => {

            let record;
            // If there was no receiver, chrome.runtime.lastError is set.
            if (chrome.runtime.lastError) {
                // Graceful fallback citation record
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
                };

                // Do whatever you would do with a normal citation record:
                // for now we log it — replace this with chrome.storage or upload as needed.
                console.warn("Content script not available; using fallback citation:", chrome.runtime.lastError.message);
                console.log("Fallback citation:", record);

            } else if (!response?.ok) {
                record = {
                    id: crypto.randomUUID(),
                    createdAt,
                    ok: false,
                    reason: response?.error || "metadata_extraction_failed",
                    pageUrl: response?.pageUrl ?? tab.url ?? null,
                    pageTitle: response?.pageTitle ?? tab.title ?? null,
                    imageUrl: response?.imageUrl ?? imageUrl ?? null,
                    downloadId: finalDownloadId,
                    notes: "",
                };
            
            } else {
                    record = {
                        id: crypto.randomUUID(),
                        createdAt,
                        ok: true,
                        pageUrl: response?.pageUrl ?? tab.url ?? null,
                        pageTitle: response?.pageTitle ?? tab.title ?? null,
                        imageUrl: response?.imageUrl ?? imageUrl ?? null,
                        alt: response?.alt ?? "",
                        title: response?.title ?? "",
                        ariaLabel: response?.ariaLabel ?? "",
                        downloadId: finalDownloadId,
                        notes: "",
                    };
                }

                // # 3 -- append to storage

                const { records = [] } = await chrome.storage.local.get({ records: [] });
                records.push(record);
                await chrome.storage.local.set({ records });
                console.log("Total records:", records.length);
                console.log("✅ Saved citation record:", record);
            });

    })

});
