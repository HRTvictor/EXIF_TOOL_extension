const fileInput = document.getElementById("imageInput");
const output = document.getElementById("metadataOutput");
const fetchBtn = document.getElementById("fetchMetadataButton");
const recordBtn = document.getElementById("recordMetadataButton");
const removeBtn = document.getElementById("removeMetadataButton");
const list = document.getElementById("recordedList");
const clearBtn = document.getElementById("clearAllRecordsButton");
const downloadBox = document.getElementById("downloadLinkContainer");

let current = null;

// --- Using chrome.storage.local (ASYNC) ---

// Get records from storage
async function getRec() {
    // Await the storage retrieval
    return (await chrome.storage.local.get("exifRecords")).exifRecords || [];
}

// Set records to storage
function setRec(r) {
    chrome.storage.local.set({ exifRecords: r });
}

// Load records and update the UI (now asynchronous)
async function load() {
    const r = await getRec();
    list.innerHTML = r.length
        ? r.map((x,i)=>`<li>${x.filename} 
            <div class="button-group-actions">
                <button class="btn btn-sm" data-v="${i}">View</button>
                <button class="btn btn-sm btn-danger" data-d="${i}">Delete</button>
            </div>
            </li>`).join("")
        : '<li id="noRecordsMessage">No EXIF data has been recorded yet.</li>';
    clearBtn.style.display = r.length ? "block" : "none";
}

function fetchExif() {
    const f = fileInput.files[0];
    if (!f) return output.textContent = "Select image";

    // EXIF.js is synchronous, so this part is fine
    EXIF.getData(f, function() {
        const meta = EXIF.getAllTags(this);
        if (!Object.keys(meta).length)
            return output.textContent = "No EXIF found";

        current = meta;
        recordBtn.disabled = false;
        output.textContent = JSON.stringify(meta, null, 2);
    });
}

// Record EXIF data (now asynchronous)
async function recordExif() {
    if (!current) return output.textContent = "No data";
    const r = await getRec();
    r.push({ filename: fileInput.files[0]?.name || "Unknown", metadata: current });
    setRec(r);
    recordBtn.disabled = true;
    output.textContent = "Saved!";
    load();
}

function removeExif() {
    const f = fileInput.files[0];
    if (!f) return output.textContent = "Select image";

    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.width; c.height = img.height;
            c.getContext("2d").drawImage(img,0,0); 

            // Re-encoding as JPEG strips metadata
            const url = c.toDataURL("image/jpeg",0.98); 
            // Using the base .btn class here
            downloadBox.innerHTML = `<a download="clean_${f.name}" href="${url}" class="btn mt-2">Download Clean Image</a>`;
            output.textContent = "Metadata removed. Ready to download.";
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(f);
}

// Event delegation for view/delete buttons (now asynchronous)
list.onclick = async e => {
    const r = await getRec();
    const v = e.target.dataset.v;
    const d = e.target.dataset.d;
    if (v !== undefined) output.textContent = JSON.stringify(r[v].metadata, null, 2);
    if (d !== undefined) { 
        r.splice(d,1); 
        setRec(r); 
        load(); 
    }
};

fetchBtn.onclick = fetchExif;
recordBtn.onclick = recordExif;
removeBtn.onclick = removeExif;
// Clear all records using chrome.storage.local.clear
clearBtn.onclick = () => { 
    // chrome.storage.local.clear requires a callback function
    chrome.storage.local.clear(() => { 
        load(); 
    }); 
};

load();