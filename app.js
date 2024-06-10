const { PDFDocument } = PDFLib;

let fetchedPdfBuffers = [];
let uploadedPdfBuffers = [];
let fetchedPdfNames = [];
let uploadedPdfNames = [];

document.getElementById('fetchBtn').addEventListener('click', async () => {
    const url = document.getElementById('url').value;
    const statusElement = document.getElementById('status');
    const pdfListElement = document.getElementById('pdfList');
    const pdfCheckboxes = document.getElementById('pdfCheckboxes');
    const selectAllCheckbox = document.getElementById('selectAll');
    const mergeBtn = document.getElementById('mergeBtn');
    statusElement.style.display = 'none';
    pdfListElement.style.display = 'none';
    mergeBtn.style.display = 'none';

    if (!url) {
        statusElement.textContent = 'Please enter a lecture schedule URL.';
        statusElement.className = 'alert alert-danger';
        statusElement.style.display = 'block';
        return;
    }

    const corsProxy = 'https://corsproxy.io/?';

    try {
        statusElement.textContent = 'Fetching PDFs...';
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';

        const response = await fetch(corsProxy + encodeURIComponent(url));
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const links = doc.querySelectorAll('a[href$=".pdf"]');
        const pdfUrls = Array.from(links).map(link => link.href);

        if (pdfUrls.length === 0) {
            statusElement.textContent = 'No PDFs found.';
            statusElement.className = 'alert alert-warning';
            return;
        }

        // Clear previous fetched PDF buffers and names
        fetchedPdfBuffers = [];
        fetchedPdfNames = [];

        // Fetch PDFs and update checkboxes
        await Promise.all(pdfUrls.map(async (pdfUrl, index) => {
            try {
                const res = await fetch(corsProxy + encodeURIComponent(pdfUrl));
                if (!res.ok) {
                    throw new Error(`Failed to fetch ${pdfUrl}, status: ${res.status}`);
                }
                const buffer = await res.arrayBuffer();
                fetchedPdfBuffers.push(buffer);
                fetchedPdfNames.push(decodeURIComponent(pdfUrl.split('/').pop())); // Store the filename
            } catch (error) {
                console.error(`Error fetching PDF: ${error.message}`);
            }
        }));

        updateCheckboxes();
        selectAllCheckbox.checked = true;
        pdfListElement.style.display = 'block';
        statusElement.style.display = 'none';
        mergeBtn.style.display = 'inline-block'; // Show the merge button

        // Add event listener for select all functionality
        selectAllCheckbox.addEventListener('change', () => {
            const checkboxes = document.querySelectorAll('#pdfCheckboxes .form-check-input');
            checkboxes.forEach(checkbox => checkbox.checked = selectAllCheckbox.checked);
        });
    } catch (error) {
        console.error(error);
        statusElement.textContent = 'Failed to fetch PDFs.';
        statusElement.className = 'alert alert-danger';
        statusElement.style.display = 'block';
    }
});

document.getElementById('mergeBtn').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('#pdfCheckboxes .form-check-input');
    const selectedIndexes = Array.from(checkboxes).filter(checkbox => checkbox.checked).map(checkbox => parseInt(checkbox.value));
    const statusElement = document.getElementById('status');
    statusElement.style.display = 'none';

    if (selectedIndexes.length === 0) {
        statusElement.textContent = 'No PDFs selected for merging.';
        statusElement.className = 'alert alert-warning';
        statusElement.style.display = 'block';
        return;
    }

    try {
        statusElement.textContent = 'Merging PDFs...';
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';

        mergedPdf = await PDFDocument.create();

        // Add fetched PDFs
        for (const index of selectedIndexes) {
            if (index < fetchedPdfBuffers.length) {
                const buffer = fetchedPdfBuffers[index];
                if (buffer) {
                    const existingPdf = await PDFDocument.load(buffer);
                    const copiedPages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
                    copiedPages.forEach((page) => {
                        mergedPdf.addPage(page);
                    });
                }
            } else {
                const uploadedIndex = index - fetchedPdfBuffers.length;
                const buffer = uploadedPdfBuffers[uploadedIndex];
                const existingPdf = await PDFDocument.load(buffer);
                const copiedPages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
                copiedPages.forEach((page) => {
                    mergedPdf.addPage(page);
                });
            }
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `merged_pdfs.pdf`;
        link.click();

        statusElement.textContent = 'Merged PDF saved.';
        statusElement.className = 'alert alert-success';
    } catch (error) {
        console.error(error);
        statusElement.textContent = 'Failed to merge PDFs.';
        statusElement.className = 'alert alert-danger';
    }
    statusElement.style.display = 'block';
});

document.getElementById('upload-icon').addEventListener('click', () => {
    document.getElementById('fileElem').click();
});

document.getElementById('fileElem').addEventListener('change', (e) => {
    const files = e.target.files;
    handleFiles(files);
});

function handleFiles(files) {
    [...files].forEach(uploadFile);
}

async function uploadFile(file) {
    const statusElement = document.getElementById('status');
    const pdfListElement = document.getElementById('pdfList');
    const pdfCheckboxes = document.getElementById('pdfCheckboxes');
    const selectAllCheckbox = document.getElementById('selectAll');
    const mergeBtn = document.getElementById('mergeBtn');

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = async () => {
        const arrayBuffer = reader.result;
        uploadedPdfBuffers.push(arrayBuffer); // Store the buffer
        uploadedPdfNames.push(file.name); // Store the filename

        updateCheckboxes();
        selectAllCheckbox.checked = true;
        pdfListElement.style.display = 'block';
        mergeBtn.style.display = 'inline-block';
    };
}

function updateCheckboxes() {
    const pdfCheckboxes = document.getElementById('pdfCheckboxes');
    pdfCheckboxes.innerHTML = '';

    fetchedPdfBuffers.forEach((buffer, index) => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        checkbox.id = `fetchedPdf${index}`;
        checkbox.value = index; // Store index in fetchedPdfBuffers array
        checkbox.checked = true;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `fetchedPdf${index}`;
        label.textContent = fetchedPdfNames[index]; // Use the filename

        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        pdfCheckboxes.appendChild(checkboxDiv);
    });

    uploadedPdfBuffers.forEach((buffer, index) => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        checkbox.id = `uploadedPdf${index}`;
        checkbox.value = fetchedPdfBuffers.length + index; // Ensure unique value
        checkbox.checked = true;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `uploadedPdf${index}`;
        label.textContent = uploadedPdfNames[index]; // Use the filename

        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        pdfCheckboxes.appendChild(checkboxDiv);
    });
}

// Handle drag and drop overlay
const dropOverlay = document.getElementById('drop-overlay');

['dragenter', 'dragover'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        preventDefaults(e);
        dropOverlay.style.display = 'flex';
    }, false);
});

document.body.addEventListener('dragleave', (e) => {
    preventDefaults(e);
    if (e.relatedTarget === null) {
        dropOverlay.style.display = 'none';
    }
}, false);

document.body.addEventListener('drop', (e) => {
    preventDefaults(e);
    dropOverlay.style.display = 'none';
}, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

dropOverlay.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files);
}
