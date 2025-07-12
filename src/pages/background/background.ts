import Browser from "webextension-polyfill";
console.log("[Background] Background script loaded.");

//@ts-expect-error message as any
Browser.runtime.onMessage.addListener(async (message, sender) => {
    console.log(
        "[Background] Received message:",
        message.type,
        "from",
        sender.tab ? `tab ${sender.tab.id}` : "non-tab source"
    );

    if (message.type === "OPFS_DATA_FROM_CONTENT_SCRIPT" && sender.tab) {
        // Relay OPFS list/operation results from content script to DevTools panel
        Browser.runtime.sendMessage({
            type: "OPFS_CONTENTS_RESULT_DOM_BRIDGE",
            tabId: sender.tab.id,
            result: message.data,
        });
    }
});
