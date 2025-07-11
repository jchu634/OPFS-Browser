console.log("[Content Script] OPFS DOM Bridge content script loaded.");

// --- General OPFS Data Event Listener (for listing and operation status) ---
window.addEventListener(
    "OPFSDebugDataReady",
    (event) => {
        console.log(
            "[Content Script] Received OPFSDebugDataReady event from page."
        );
        try {
            const dataElement = document.getElementById("opfs-debug-data");
            if (dataElement) {
                const rawData = dataElement.textContent;
                const opfsData = JSON.parse(rawData);
                console.log(
                    "[Content Script] Parsed OPFS data from DOM element:",
                    opfsData.status
                );

                browser.runtime.sendMessage({
                    type: "OPFS_DATA_FROM_CONTENT_SCRIPT",
                    data: opfsData,
                });

                dataElement.remove(); // Clean up
            } else {
                console.error(
                    "[Content Script] OPFS debug data element not found!"
                );
            }
        } catch (e) {
            console.error(
                "[Content Script] Error processing OPFS data from DOM:",
                e
            );
        }
    },
    false
);

// --- File Download Event Listener ---
window.addEventListener(
    "OPFSDebugDownloadReady",
    async (event) => {
        console.log(
            "[Content Script] Received OPFSDebugDownloadReady event from page."
        );
        try {
            const downloadElement = document.getElementById(
                "opfs-debug-download-data"
            );
            if (downloadElement) {
                const { fileName, fileContentBase64 } = JSON.parse(
                    downloadElement.textContent
                );
                console.log(
                    `[Content Script] Preparing to send download data for: ${fileName}`
                );

                browser.runtime.sendMessage({
                    type: "OPFS_DOWNLOAD_DATA",
                    data: { fileName, fileContentBase64 },
                });

                downloadElement.remove(); // Clean up
            } else {
                console.error(
                    "[Content Script] OPFS debug download data element not found!"
                );
            }
        } catch (e) {
            console.error(
                "[Content Script] Error processing download data from DOM:",
                e
            );
        }
    },
    false
);
