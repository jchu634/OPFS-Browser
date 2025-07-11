console.log("[Background] Background script loaded.");

browser.runtime.onMessage.addListener(async (message, sender) => {
    console.log(
        "[Background] Received message:",
        message.type,
        "from",
        sender.tab ? `tab ${sender.tab.id}` : "non-tab source"
    );

    if (message.type === "OPFS_DATA_FROM_CONTENT_SCRIPT" && sender.tab) {
        // Relay OPFS list/operation results from content script to DevTools panel
        browser.runtime.sendMessage({
            type: "OPFS_CONTENTS_RESULT_DOM_BRIDGE",
            tabId: sender.tab.id,
            result: message.data,
        });
    } else if (message.type === "OPFS_DOWNLOAD_DATA" && sender.tab) {
        // Handle download request from content script
        const { fileName, fileContentBase64 } = message.data;
        console.log(
            `[Background] Initiating download for ${fileName} (${fileContentBase64.length} chars base64)`
        );

        try {
            // Decode Base64 to Blob
            const byteCharacters = atob(fileContentBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);

            // Use browser.downloads API to download the blob
            await browser.downloads.download({
                url: URL.createObjectURL(blob), // Create a temporary URL for the blob
                filename: fileName,
                saveAs: true, // Prompt user to choose location
            });
            console.log(`[Background] Download initiated for ${fileName}.`);

            // Send confirmation back to DevTools panel
            browser.runtime.sendMessage({
                type: "OPFS_OPERATION_STATUS",
                tabId: sender.tab.id,
                result: {
                    status: "success",
                    message: `File '${fileName}' download initiated.`,
                },
            });
        } catch (error) {
            console.error(
                `[Background] Error initiating download for ${fileName}:`,
                error
            );
            browser.runtime.sendMessage({
                type: "OPFS_OPERATION_STATUS",
                tabId: sender.tab.id,
                result: {
                    status: "error",
                    message: `Failed to initiate download for '${fileName}': ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                },
            });
        }
    }
});
