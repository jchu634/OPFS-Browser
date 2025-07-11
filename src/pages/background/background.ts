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
    }
});
