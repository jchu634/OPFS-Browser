import Browser from "webextension-polyfill";
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

                Browser.runtime.sendMessage({
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
