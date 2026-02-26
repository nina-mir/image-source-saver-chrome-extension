"use strict";


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
    // console.log(blobUrl); // Example: blob:chrome-extension://.../uuid

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

    document.querySelector("#log-count").textContent =
        `Total records: ${records.length} (showing ${last20.length})`

    const ul = document.querySelector('#records')
    ul.innerHTML = ''

    // TO-DO finish adding the list items li to the ul with proper text
    // for (const r of last20) {
    //     const li = document.createElement('li')
    //     li.textContent = `${r.createdAt} - ${r.pageTitle || r.pageUrl} - ${r.ok ? "YES✅" : "NO⚠️"}`
    //     ul.appendChild(li)

    // }
    for (const r of last20) {
        const li = document.createElement("li");

        const status = document.createElement("span");
        status.textContent = r.ok ? "✅" : "⚠️";
        status.style.marginRight = "0.5rem";

        const when = document.createElement("span");
        when.textContent = new Date(r.createdAt).toLocaleString();
        when.style.marginRight = "0.5rem";

        const page = document.createElement("a");
        page.href = r.pageUrl || "#";
        page.textContent = r.pageTitle || r.pageUrl || "(no page url)";
        page.target = "_blank";
        page.rel = "noreferrer";
        page.style.marginRight = "0.5rem";

        const img = document.createElement("a");
        img.href = r.imageUrl || "#";
        img.textContent = "image";
        img.target = "_blank";
        img.rel = "noreferrer";

        li.append(status, when, page, img);
        ul.appendChild(li);
    }

}


// CSV related code

// notes: If later add nested objects (e.g., confidence: {score: 0.8}), CSV will break unless flatten.



function escapeCSV(value) {
  if (value === null || value === undefined) return "";

  let str = String(value);

  // Step 1: Escape internal quotes
  str = str.replace(/"/g, '""');

  // Step 2: If it contains special chars, wrap in quotes
  if (/[",\n]/.test(str)) {
    str = `"${str}"`;
  }

  return str;
}

function recordsToCSV(records) {
    // CSV headers
  const headers = [
    "id",
    "createdAt",
    "ok",
    "reason",
    "pageTitle",
    "pageUrl",
    "imageUrl",
    "alt",
    "title",
    "ariaLabel",
    "downloadId",
    "notes"
  ];

  const headerRow = headers.join(",");

  const rows = records.map(record => {
    return headers
      .map(header => escapeCSV(record[header]))
      .join(",");
  });

  return [headerRow, ...rows].join("\n");
}

async function downloadCSV() {
  const records = await getRecords();
  const csvText = recordsToCSV(records);

  const BOM = "\uFEFF"; // Excel compatability!

  const blob = new Blob([BOM + csvText], { type: "text/csv;charset=utf-8;" });
//   const blob = new Blob([csvText], { type: "text/csv" });
  const blobUrl = URL.createObjectURL(blob);

  chrome.downloads.download(
    {
      url: blobUrl,
      filename: "img-citation-logs.csv",
      saveAs: false,
    },
    () => URL.revokeObjectURL(blobUrl)
  );
}

document.getElementById("export-csv")
  .addEventListener("click", downloadCSV);



document.getElementById("view-last-20").addEventListener("click", renderLast20);

document.addEventListener("DOMContentLoaded", renderLast20);
