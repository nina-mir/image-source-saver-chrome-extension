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
  if (info.menuItemId === "log-image-info") {
    console.log(`[${timestamp}] log-image-info clicked`);
    console.log("info.srcUrl:", info.srcUrl);
    console.log(info)
    console.log("tab.url:", tab?.url);
    console.log("tab.title:", tab?.title);
  } else if (info.menuItemId === "log-page-info") {
    console.log(`[${timestamp}] log-page-info clicked`);
    // info.srcUrl still available because context is "image"
    console.log("pageUrl:", tab?.url);
    console.log("pageTitle:", tab?.title);
    console.log("imageSrc:", info.srcUrl);
  }
});
