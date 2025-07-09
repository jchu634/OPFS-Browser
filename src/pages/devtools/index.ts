import Browser from "webextension-polyfill";

const CHROMIUM_PANEL_DIR = "src/pages/devtools/panel.html";
const FIREFOX_PANEL_DIR = "panel.html";

let finalPanelContentPath: string;

if (navigator.userAgent.includes("Firefox")) {
    finalPanelContentPath = FIREFOX_PANEL_DIR;
} else if (
    navigator.userAgent.includes("Chrome") ||
    navigator.userAgent.includes("Edg")
) {
    finalPanelContentPath = CHROMIUM_PANEL_DIR;
} else {
    // Fallback for unknown browsers
    console.warn(
        "Unknown browser, defaulting to Chrome-style path for DevTools panel."
    );
    finalPanelContentPath = CHROMIUM_PANEL_DIR;
}

console.log(
    `[DevTools Loader] Creating panel with path: ${finalPanelContentPath}`
);

Browser.devtools.panels
    .create("OPFS Browser", "public/dev-icon-32.png", finalPanelContentPath)
    // .then((panel) => {
    //     console.log("[DevTools Loader] Panel created successfully.");
    //     // Optional: Add listeners for when the panel is shown/hidden
    //     panel.onShown.addListener(() => {
    //       console.log("[DevTools Panel] Panel is now visible!");
    //     });
    // })
    .catch((error) => {
        console.error("[DevTools Loader] Error creating panel:", error);
    });
