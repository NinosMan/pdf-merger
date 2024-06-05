document.getElementById('mergeBtn').addEventListener('click', async () => {
    const url = document.getElementById('url').value;
    const statusElement = document.getElementById('status');
    const mergeButton = document.getElementById('mergeBtn');

    if (!url) {
        statusElement.textContent = 'Please enter a lecture schedule URL.';
        return;
    }

    const corsProxy = 'https://corsproxy.io/?';
    mergeButton.disabled = true;
    statusElement.textContent = 'Fetching PDFs...';

    try {
        const response = await fetch(corsProxy + encodeURIComponent(url));
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        const links = doc.querySelectorAll('a[href$=".pdf"]');
        const pdfUrls = Array.from(links).map(link => corsProxy + encodeURIComponent(link.href));

        if (pdfUrls.length === 0) {
            statusElement.textContent = 'No PDFs found.';
            mergeButton.disabled = false;
            return;
        }

        const pdfBuffers = await Promise.all(pdfUrls.map(async (pdfUrl) => {
            const res = await fetch(pdfUrl);
            return res.arrayBuffer();
        }));

        const { PDFDocument } = window.PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const buffer of pdfBuffers) {
            const existingPdf = await PDFDocument.load(buffer);
            const copiedPages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `merged_lectures.pdf`;
        link.click();

        statusElement.textContent = 'Merged PDF saved.';
    } catch (error) {
        console.error(error);
        statusElement.textContent = 'Failed to merge PDFs.';
    } finally {
        mergeButton.disabled = false;
    }
});