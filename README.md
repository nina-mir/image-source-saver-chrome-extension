# Image Source Saver Chrome Extension

A Chrome Manifest V3 extension for researchers who collect images from the web and want to save the image file **and** keep a citation-style record of where it came from.

When you right-click an image and choose the extension menu item, the extension downloads the image and stores related source metadata locally in Chrome storage. You can then view recent logs and export the collected records as JSON or CSV.

Repository: <https://github.com/nina-mir/image-source-saver-chrome-extension.git>

## What it does

- Adds a right-click context menu item for images: **save/log image/info**
- Downloads the selected image using Chrome's downloads API
- Logs image and page metadata, including:
  - page URL
  - page title
  - canonical URL, when available
  - image URL
  - image `alt` text
  - image `title`
  - image `aria-label`
  - nearby `<figcaption>` text, when available
  - image referrer policy, when available
  - Chrome download ID
  - timestamp
  - success/fallback status
  - notes field for future use
- Stores records locally in `chrome.storage.local`
- Keeps up to 5,000 records
- Avoids accidental duplicate records from the same page/image within 5 seconds
- Provides an options page to:
  - view the most recent 20 logs
  - export logs as JSON
  - export logs as CSV

## Privacy

This extension currently stores citation records locally in `chrome.storage.local`. Nothing is uploaded to a server or cloud database by the current implementation.

The extension only extracts page/image metadata when you use the right-click menu item.

## Project structure

```text
.
├── manifest.json          # Chrome extension manifest, permissions, background worker, options page
├── background.js          # Context menu, image download, metadata logging, local storage
├── content.js             # Extracts page and image metadata from the active webpage
├── options.html           # Options page UI
├── options.js             # View/export local records as JSON or CSV
├── options.css            # Options page styling
├── icons/                 # Extension icons
└── README.md
```

> Note: the current `manifest.json` points to `options/options.html`. If your files are stored at the project root as `options.html`, update the manifest to use `"options_page": "options.html"`, or move the options files into an `options/` folder.

## Installation for local development

1. Clone the repository:

   ```bash
   git clone https://github.com/nina-mir/image-source-saver-chrome-extension.git
   cd image-source-saver-chrome-extension
   ```

2. Open Chrome and go to:

   ```text
   chrome://extensions
   ```

3. Turn on **Developer mode**.

4. Click **Load unpacked**.

5. Select the project folder.

6. Confirm that the extension appears in your extensions list.

## How to use

1. Visit a webpage with images.
2. Right-click an image.
3. Choose **save/log image/info**.
4. The image will be downloaded to your default Chrome downloads location.
5. The extension will save a metadata record locally.
6. Open the extension options page to view recent logs or export all logs.

## Exporting your logs

The options page includes two export buttons:

- **Export JSON** downloads `img-citation-logs.json`
- **Export CSV** downloads `img-citation-logs.csv`

The CSV export includes a UTF-8 byte order mark for better compatibility with spreadsheet software such as Excel.

## Example record

```json
{
  "id": "55b3ff54-2f02-4bcb-abf6-e2a75349cc99",
  "createdAt": "2026-03-18T04:06:34.671Z",
  "ok": true,
  "pageUrl": "https://en.wikipedia.org/wiki/Appellate_Division_Courthouse_of_New_York_State",
  "pageTitle": "Appellate Division Courthouse of New York State - Wikipedia",
  "canonicalUrl": "https://en.wikipedia.org/wiki/Appellate_Division_Courthouse_of_New_York_State",
  "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/example.jpg",
  "alt": "Description of the image",
  "title": "",
  "ariaLabel": "",
  "caption": "",
  "referrerPolicy": "",
  "downloadId": 3097,
  "notes": ""
}
```

## How metadata extraction works

The background service worker handles the context menu click and starts the image download. It then injects or contacts the content script on the active tab and asks it to find the matching image element.

The content script tries to match the clicked image URL against:

- `currentSrc`
- `src`
- common lazy-load attributes such as `data-src`, `data-original`, `data-lazy-src`, `data-url`, `data-image`, `data-img`, `data-source`, and `data-srcset`

If more than one image matches, it prefers the image with the largest visible rendered area.

## Fallback behavior

Some pages may block script injection or prevent the content script from responding. When that happens, the extension still records a fallback citation with available data from the tab and marks the record as unsuccessful:

```json
{
  "ok": false,
  "reason": "no_content_script"
}
```

This helps you keep a partial source trail even when full metadata extraction is unavailable.

## Permissions

The extension uses the following permissions:

- `contextMenus` — create the right-click image menu item
- `downloads` — download the selected image and export logs
- `storage` — save citation records locally
- `tabs` — access the active tab URL and title
- `scripting` — inject `content.js` when needed
- `activeTab` — interact with the current tab after user action
- `<all_urls>` host permission — allow metadata extraction on webpages you use the extension on

## Development notes

### Reloading after changes

After editing extension files:

1. Go to `chrome://extensions`.
2. Find the extension.
3. Click the reload icon.
4. Test again on a webpage.

### Debugging

To inspect the background service worker:

1. Go to `chrome://extensions`.
2. Find the extension.
3. Click **service worker** under the extension details.
4. Check the console logs.

To inspect page-level metadata extraction, open DevTools on the webpage where you are testing and check the console.

## Known limitations

- Metadata quality depends on what the source page provides.
- Some websites may prevent content script injection or return limited metadata.
- Images loaded from CSS background images are not currently supported.
- Captions are currently extracted from the nearest `<figure><figcaption>` pattern only.
- Records are local to the Chrome profile where the extension is installed.
- There is not yet a cloud sync or database backend.

## Future improvements

- Add a search/filter interface for saved records
- Add manual editing for the `notes` field
- Add support for CSS background images
- Add cloud/database sync as an optional feature
- Add richer citation formats, such as MLA, Chicago, or APA
- Add thumbnail previews in the options page
- Add import/backup/restore tools
- Add a clear-all-logs button with confirmation

## License

Add a license file if you plan to publish or share this project publicly. For open-source projects, common choices include MIT, Apache-2.0, and GPL-3.0.
