document.getElementById('mergeBtn').addEventListener('click', async () => {
    const url = document.getElementById('url').value;
    if (!url) {
        document.getElementById('status').textContent = 'Please enter a lecture schedule URL.';
        return;
    }

    const corsProxy = 'https://corsproxy.io/?';

    try {
        document.getElementById('status').textContent = 'Fetching PDFs...';
        const response = await fetch(corsProxy + encodeURIComponent(url));
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        const links = doc.querySelectorAll('a[href$=".pdf"]');
        const pdfUrls = Array.from(links).map(link => corsProxy + encodeURIComponent(link.href));

        if (pdfUrls.length === 0) {
            document.getElementById('status').textContent = 'No PDFs found.';
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

        document.getElementById('status').textContent = 'Merged PDF saved.';
    } catch (error) {
        console.error(error);
        document.getElementById('status').textContent = 'Failed to merge PDFs.';
    }
});
