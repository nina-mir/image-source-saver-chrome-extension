// get records from local storage 
async function getRecords() {
    const { records } = await chrome.storage.local.get({ records: [] })
    return records
};

async function downloadJSON() {

    console.log(await chrome.storage.local.get({ records: [] }))


    // 0 - get the data and turn it into a JSON string 
    const records = await getRecords()
    const jsonTxt = JSON.stringify(records, null, 2)

    // 1 - create blob
    const blob = new Blob([jsonTxt], { type: "application/json" });
    // 2 - create a url for the blob data
    const blobUrl = URL.createObjectURL(blob);
    console.log(blobUrl); // Example: blob:chrome-extension://.../uuid

    // 3 - download data
    chrome.downloads.download({
        url: blobUrl,
        filename: 'img-citation-logs.json', // Set a default filename
        saveAs: false // Set to true to prompt the user for a location
    }, (downloadId) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        } else {
            console.info('Download initiated with ID:', downloadId);
        }

        // 4 - Revoke the URL after the download is initiated [OPTIONAL]
        URL.revokeObjectURL(blobUrl);
    });


}


document.getElementById("export-json").addEventListener('click', () => {
    downloadJSON()
})

async function renderLast20() {
    const records = await getRecords();
    const last20 = records.slice(-20).reverse()

    document.querySelector("#log-count").textContent(
        `Total records: ${records.length} (showing ${last20.length})`)

    const ul = document.querySelector('#records')
    ul.innerHTML = ''

    // TO-DO finish adding the list items li to the ul with proper text
    for (const r of last20) {
        li = document.createElement('li')
        li.textContent = `${r.createdAt} - ${r.pageTitle || r.pageUrl} - ${r.ok ? "YES✅" : "NO⚠️"}`
        ul.appendChild('li')

    }
}

document.getElementById("view-last-20").addEventListener("click", renderLast20);

