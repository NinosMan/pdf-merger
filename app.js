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

        // Clear previous checkboxes
        pdfCheckboxes.innerHTML = '';

        // Create checkboxes for each PDF
        pdfUrls.forEach((pdfUrl, index) => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.id = `pdf${index}`;
            checkbox.value = pdfUrl;
            checkbox.checked = true;

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `pdf${index}`;
            label.textContent = pdfUrl.split('/').pop(); // Display only the filename

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            pdfCheckboxes.appendChild(checkboxDiv);
        });

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
    const selectedPdfUrls = Array.from(checkboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);
    const statusElement = document.getElementById('status');
    statusElement.style.display = 'none';

    if (selectedPdfUrls.length === 0) {
        statusElement.textContent = 'No PDFs selected for merging.';
        statusElement.className = 'alert alert-warning';
        statusElement.style.display = 'block';
        return;
    }

    const corsProxy = 'https://corsproxy.io/?';
    const failedUrls = [];

    try {
        statusElement.textContent = 'Merging PDFs...';
        statusElement.className = 'alert alert-info';
        statusElement.style.display = 'block';

        const pdfBuffers = await Promise.all(selectedPdfUrls.map(async (pdfUrl) => {
            try {
                const res = await fetch(corsProxy + encodeURIComponent(pdfUrl));
                if (!res.ok) {
                    throw new Error(`Failed to fetch ${pdfUrl}, status: ${res.status}`);
                }
                return res.arrayBuffer();
            } catch (error) {
                console.error(`Error fetching PDF: ${error.message}`);
                failedUrls.push(pdfUrl);
                return null;
            }
        }));

        const { PDFDocument } = window.PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const buffer of pdfBuffers) {
            if (buffer) {
                try {
                    const existingPdf = await PDFDocument.load(buffer);
                    const copiedPages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
                    copiedPages.forEach((page) => {
                        mergedPdf.addPage(page);
                    });
                } catch (error) {
                    console.error(`Error parsing PDF: ${error.message}`);
                    // Skip this PDF if parsing fails
                    continue;
                }
            }
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `merged_lectures.pdf`;
        link.click();

        let alertMessage = 'Merged PDF saved.';
        let alertClass = 'alert alert-success';
        if (failedUrls.length > 0) {
            alertMessage += ` However, the following PDFs could not be merged: \n${failedUrls.join('\n')}`;
            alertClass = 'alert alert-warning';
        }
        statusElement.textContent = alertMessage;
        statusElement.className = alertClass;
    } catch (error) {
        console.error(error);
        statusElement.textContent = 'Failed to merge PDFs.';
        statusElement.className = 'alert alert-danger';
    }
    statusElement.style.display = 'block';
});
